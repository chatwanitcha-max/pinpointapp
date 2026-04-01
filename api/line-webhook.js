const crypto = require("crypto");

const { toText, toJsonBody, json, buildClientMeta } = require("./_lib/analytics");
const {
  detectLineLanguage,
  detectLineIntent,
  detectAccountingIntentDetail,
  resolveServiceBucket,
  detectSpecificServiceBucket,
  detectCaseFlavor,
  buildLineReply,
  requestOpenClawLineReply,
} = require("./_lib/line-intelligence");
const { searchKnowledgeBase } = require("./_lib/knowledge-base");
const { getLineConversationMemory } = require("./_lib/conversation-memory");
const { buildNeuralBrain } = require("./_lib/neural-brain");
const { resolveCasePlaybook } = require("./_lib/case-playbooks");
const { buildAnswerAudit } = require("./_lib/answer-audit");
const {
  buildConversationScope,
  detectConversationReset,
  isResetOnlyMessage,
} = require("./_lib/conversation-control");
const {
  buildGreeterOnlyReply,
  buildResearchCapture,
  getLineReplyMode,
  shouldSendGreeterReply,
} = require("./_lib/research-backlog");
const {
  buildRouting,
  buildLeadPayload,
  sendCrmWebhook,
  sendOpenClawWebhook,
  sendAirtableLead,
  sendSupabaseLead,
} = require("./_lib/lead-routing");
const {
  evaluateHumanHandoff,
  mergeRoutingWithHandoff,
} = require("./_lib/handoff-rules");

function verifyLineSignature(rawBody, channelSecret, signature) {
  if (!channelSecret || !signature || !rawBody) return false;
  const digest = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function normalizeLineEvent(event = {}) {
  const source = event.source || {};
  const message = event.message || {};

  return {
    eventType: toText(event.type),
    replyToken: toText(event.replyToken),
    messageType: toText(message.type),
    text: toText(message.text),
    sourceType: toText(source.type),
    userId: toText(source.userId),
    groupId: toText(source.groupId),
    roomId: toText(source.roomId),
    timestamp:
      typeof event.timestamp === "number"
        ? new Date(event.timestamp).toISOString()
        : new Date().toISOString(),
  };
}

function getConfiguredLineAutoReply() {
  const configured = toText(process.env.LINE_AUTO_REPLY_TEXT);
  const normalized = configured.replace(/\s+/g, "");
  if (normalized && !/^\?+$/.test(normalized)) {
    return configured;
  }
  return "";
}

function isUsableReplyText(text) {
  const value = toText(text).trim();
  if (!value) return false;
  if (value.includes("\uFFFD")) return false;
  if ((value.match(/\?/g) || []).length >= 5) return false;
  if (value.length > 1200) return false;
  return true;
}

function serviceNeedFromBucket(bucket, intentKey) {
  if (bucket === "accounting-tax") return "accounting and tax support";
  if (bucket === "corporate-dbd") return "company registration and DBD support";
  if (bucket === "visa-license") return "visa, work permit, and business license support";
  if (bucket === "company-dissolution") return "company dissolution support";
  if (intentKey === "pricing") return "pricing inquiry";
  if (intentKey === "official-reference") return "official reference request";
  if (intentKey === "documents") return "document preparation question";
  return "general consultation";
}

async function sendLineReply(replyToken, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken || !text) {
    return { sent: false, reason: "missing_line_reply_env" };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  return { sent: response.ok, status: response.status };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const rawBody =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const body = toJsonBody(req.body);
  const signature = toText(req.headers["x-line-signature"]);
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  const signatureVerified =
    channelSecret && signature
      ? verifyLineSignature(rawBody, channelSecret, signature)
      : false;

  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) {
    return json(res, 200, {
      ok: true,
      receivedEvents: 0,
      mode: "verification",
    });
  }

  const normalizedEvents = events.map(normalizeLineEvent).filter((event) => event.eventType);
  const primaryEvent = normalizedEvents[0] || null;
  if (!primaryEvent) {
    return json(res, 200, {
      ok: true,
      receivedEvents: normalizedEvents.length,
      mode: "no_primary_event",
    });
  }

  const detectedLanguage = detectLineLanguage(primaryEvent.text);
  const memory = await getLineConversationMemory({
    userId: primaryEvent.userId,
    language: detectedLanguage,
    serviceBucket: "general",
  });

  const detectedIntent = detectLineIntent(primaryEvent.text);
  const explicitServiceBucket =
    detectSpecificServiceBucket(primaryEvent.text) ||
    (toText(detectedIntent?.serviceBucket) !== "general" &&
    toText(detectedIntent?.serviceBucket) !== "pricing"
      ? toText(detectedIntent?.serviceBucket)
      : "");
  const resetRequested = detectConversationReset(primaryEvent.text);
  const roughServiceBucket =
    resetRequested && !explicitServiceBucket
      ? "general"
      : resolveServiceBucket(
          detectedIntent,
          memory.summary,
          explicitServiceBucket,
          primaryEvent.text
        );
  const conversationScope = buildConversationScope({
    text: primaryEvent.text,
    language: detectedLanguage,
    resolvedServiceBucket: roughServiceBucket,
    memorySummary: memory.summary,
  });
  const activeMemorySummary = conversationScope.summary;
  const effectiveServiceBucket = resolveServiceBucket(
    detectedIntent,
    activeMemorySummary,
    "",
    primaryEvent.text
  );
  const intentDetail = detectAccountingIntentDetail(
    primaryEvent.text,
    effectiveServiceBucket,
    detectedIntent.key
  );
  const finalServiceBucket = toText(intentDetail?.serviceBucket) || effectiveServiceBucket;
  const knowledgeContext = searchKnowledgeBase({
    query: primaryEvent.text,
    language: detectedLanguage,
    serviceBucket: finalServiceBucket,
    intentKey: detectedIntent.key,
    memorySummary: activeMemorySummary,
    preferredIds: intentDetail?.faqIds || [],
    limit: 8,
  });
  knowledgeContext.intentDetail = intentDetail || null;
  const caseFlavor = detectCaseFlavor(primaryEvent.text, finalServiceBucket);
  const preliminaryBrain = buildNeuralBrain({
    text: primaryEvent.text,
    memorySummary: activeMemorySummary,
    intent: detectedIntent,
    serviceBucket: finalServiceBucket,
    intentDetail: intentDetail || null,
    handoff: null,
  });
  const handoff = evaluateHumanHandoff({
    text: primaryEvent.text,
    serviceBucket: finalServiceBucket,
    memorySummary: activeMemorySummary,
    unsupportedNationality: preliminaryBrain?.slots?.unsupportedNationality || "",
  });
  const brain = buildNeuralBrain({
    text: primaryEvent.text,
    memorySummary: activeMemorySummary,
    intent: detectedIntent,
    serviceBucket: finalServiceBucket,
    intentDetail: intentDetail || null,
    handoff,
  });
  const playbook = ["pricing", "official-reference"].includes(detectedIntent.key)
    ? null
    : resolveCasePlaybook({
        serviceBucket: finalServiceBucket,
        responseMode: brain?.responseMode || "",
        caseFlavor,
        intentDetailId: toText(intentDetail?.id),
        knowledgeMatches: knowledgeContext.matches || [],
      });
  const answerAudit = buildAnswerAudit({
    eventText: primaryEvent.text,
    intent: detectedIntent,
    brain,
    playbook,
    knowledgeContext,
    memorySummary: activeMemorySummary,
  });

  const resetOnly = isResetOnlyMessage(primaryEvent.text, explicitServiceBucket || "general");
  const localReplyText =
    (resetOnly
      ? detectedLanguage === "en"
        ? "Sure, we can start fresh. What would you like the team to help with first?"
        : "ได้เลยค่ะ เริ่มเคสใหม่ให้แล้ว ตอนนี้อยากให้ทีมช่วยเรื่องไหนเป็นหลักคะ"
      : buildLineReply({
          language: detectedLanguage,
          intent: detectedIntent,
          knowledgeContext,
          memorySummary: activeMemorySummary,
          eventText: primaryEvent.text,
          serviceBucket: finalServiceBucket,
          handoff,
        })) || getConfiguredLineAutoReply();

  const lead = {
    leadId: `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fullName: primaryEvent.userId || "LINE user",
    businessName: "",
    phone: "",
    email: "",
    serviceNeed: serviceNeedFromBucket(finalServiceBucket, detectedIntent.key),
    revenueRange: "",
    preferredContact: "line",
    notes: primaryEvent.text,
    pageUrl: `line://oa/inbound?lang=${detectedLanguage}`,
  };

  const clientMeta = buildClientMeta(req, {
    pageUrl: "line://oa/inbound",
    userAgent: req.headers["user-agent"] || "",
  });

  const routing = mergeRoutingWithHandoff(
    buildRouting(lead || {}),
    handoff,
    detectedLanguage
  );

  const intakePayload = buildLeadPayload({
    source: "line_oa",
    lead,
    clientMeta,
    routing,
    lineEvent: {
      ...primaryEvent,
      detectedLanguage,
      detectedIntent: detectedIntent.key,
      effectiveServiceBucket: finalServiceBucket,
    },
  });

  intakePayload.lineIntentKey = detectedIntent.key;
  intakePayload.lineIntentDetailId = toText(intentDetail?.id);
  intakePayload.intentDetail = intentDetail || null;
  intakePayload.effectiveServiceBucket = finalServiceBucket;
  intakePayload.conversationSummary = activeMemorySummary;
  intakePayload.conversationControl = {
    resetRequested: Boolean(conversationScope.resetRequested),
    topicSwitched: Boolean(conversationScope.topicSwitched),
    resetOnly: Boolean(resetOnly),
    previousServiceBucket: toText(memory.summary?.lastServiceBucket),
    activeServiceBucket: finalServiceBucket,
  };
  intakePayload.handoff = handoff;
  intakePayload.replyAnalysis = {
    confidence: toText(answerAudit?.confidence),
    shouldClarify: Boolean(answerAudit?.shouldClarify),
    lowConfidence: Boolean(answerAudit?.lowConfidence),
    shouldIncludeReference: Boolean(answerAudit?.shouldIncludeReference),
    verifiedBy: Array.isArray(answerAudit?.verifiedBy) ? answerAudit.verifiedBy : [],
    topMatchId: toText(answerAudit?.topMatchId),
    topScore: Number(answerAudit?.topScore || 0),
    scoreGap: Number(answerAudit?.scoreGap || 0),
    responseMode: toText(brain?.responseMode),
    caseFlavor: toText(caseFlavor),
    playbookId: toText(playbook?.id),
    memorySuppressed: Boolean(conversationScope.resetRequested || conversationScope.topicSwitched),
  };
  intakePayload.responseMode = localReplyText ? "local" : "fallback";
  intakePayload.knowledgeMatches = (knowledgeContext.matches || []).map((entry) => ({
    id: entry.id,
    type: entry.type,
    category: entry.category,
    question_th: entry.question_th,
    question_en: entry.question_en,
    source_url: entry.source_url,
    score: entry.score,
  }));
  intakePayload.referenceContext = {
    official: knowledgeContext?.officialReference
      ? {
          id: toText(knowledgeContext.officialReference.id),
          labelTh: toText(knowledgeContext.officialReference.question_th),
          labelEn: toText(knowledgeContext.officialReference.question_en),
          sourceUrl: toText(
            knowledgeContext.officialReference.official_links?.[0]?.url ||
              knowledgeContext.officialReference.source_url
          ),
        }
      : null,
    website: knowledgeContext?.websiteReference
      ? {
          id: toText(knowledgeContext.websiteReference.id),
          sourceUrl: toText(knowledgeContext.websiteReference.source_url),
        }
      : null,
  };
  intakePayload.replyDraftText = localReplyText;
  intakePayload.research = buildResearchCapture({
    eventText: primaryEvent.text,
    language: detectedLanguage,
    serviceBucket: finalServiceBucket,
    intentKey: detectedIntent.key,
    analysis: intakePayload.replyAnalysis,
    userId: primaryEvent.userId,
    leadId: lead.leadId,
    knowledgeMatchIds: intakePayload.knowledgeMatches.map((entry) => entry.id),
  });

  const replyMode = getLineReplyMode();
  intakePayload.lineReplyMode = replyMode;

  const openclawReply =
    replyMode === "smart"
      ? await requestOpenClawLineReply(intakePayload)
      : { sent: false, reason: "reply_mode_greeter_only" };

  const smartReplyText = isUsableReplyText(openclawReply?.replyText)
    ? toText(openclawReply?.replyText)
    : localReplyText || getConfiguredLineAutoReply();
  const replyText =
    replyMode === "greeter_only"
      ? shouldSendGreeterReply({
          turns: Number(memory.summary?.turns || 0),
        })
        ? buildGreeterOnlyReply(detectedLanguage)
        : ""
      : smartReplyText;
  intakePayload.lineReplyText = replyText;

  const [crmResult, supabaseResult, airtableResult, openClawResult] = await Promise.all([
    sendCrmWebhook(intakePayload),
    sendSupabaseLead(intakePayload),
    sendAirtableLead(intakePayload),
    sendOpenClawWebhook(intakePayload),
  ]);
  const autoReplyResult = replyText
    ? await sendLineReply(primaryEvent.replyToken, replyText)
    : { sent: false, reason: "reply_suppressed" };

  return json(res, 200, {
    ok: true,
    receivedEvents: normalizedEvents.length,
    signatureVerified,
    routing,
    handoff,
    intentDetail,
    conversationSummary: activeMemorySummary,
    conversationControl: intakePayload.conversationControl,
    knowledgeMatchIds: intakePayload.knowledgeMatches.map((entry) => entry.id),
    channels: {
      crmWebhook: crmResult,
      supabase: supabaseResult,
      airtable: airtableResult,
      openclaw: openClawResult,
      openclawReply,
      lineReply: autoReplyResult,
    },
    replyPreview: replyText,
  });
};


