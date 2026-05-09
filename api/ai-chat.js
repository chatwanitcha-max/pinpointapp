const { toText, toJsonBody, json, buildClientMeta } = require("./_lib/analytics");
const { extractContextSlots } = require("./_lib/context-slots");
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
const { buildNeuralBrain } = require("./_lib/neural-brain");
const { resolveCasePlaybook } = require("./_lib/case-playbooks");
const { buildAnswerAudit } = require("./_lib/answer-audit");
const {
  buildEmptyConversationSummary,
  buildConversationScope,
  isResetOnlyMessage,
} = require("./_lib/conversation-control");
const {
  buildRouting,
  buildLeadPayload,
  sendCrmWebhook,
  sendAirtableLead,
  sendSupabaseLead,
} = require("./_lib/lead-routing");
const {
  evaluateHumanHandoff,
  mergeRoutingWithHandoff,
  buildHandoffReplyLine,
} = require("./_lib/handoff-rules");
const {
  evaluateAiHumanEscalation,
  buildHumanEscalationReply,
  sendHumanEscalationLineAlert,
} = require("./_lib/human-escalation");

function randomId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .map((item) => ({
      role: toText(item?.role) === "assistant" ? "assistant" : "user",
      text: toText(item?.text).slice(0, 420),
    }))
    .filter((item) => item.text)
    .slice(-16);
}

function collectKnownFacts(history, language, serviceBucket) {
  const facts = {
    companyStatus: "",
    nationality: "",
    unsupportedNationality: "",
    businessType: "",
    foreignShareholder: false,
    mentionsVat: false,
    mentionsPayroll: false,
    mentionsUrgent: false,
  };

  history
    .filter((item) => item.role === "user")
    .forEach((item) => {
      const slots = extractContextSlots({
        text: item.text,
        memorySummary: { knownFacts: facts },
        serviceBucket,
        intentKey: "general",
      });

      if (!facts.companyStatus && slots.companyStatus) facts.companyStatus = slots.companyStatus;
      if (!facts.nationality && slots.nationality) facts.nationality = slots.nationality;
      if (!facts.unsupportedNationality && slots.unsupportedNationality) {
        facts.unsupportedNationality = slots.unsupportedNationality;
      }
      if (!facts.businessType && slots.businessType) facts.businessType = slots.businessType;

      facts.foreignShareholder = facts.foreignShareholder || Boolean(slots.foreignShareholder);
      facts.mentionsVat = facts.mentionsVat || Boolean(slots.mentionsVat);
      facts.mentionsPayroll = facts.mentionsPayroll || Boolean(slots.mentionsPayroll);
      facts.mentionsUrgent = facts.mentionsUrgent || /ด่วน|urgent|asap|today|tomorrow|deadline|expire|expires/i.test(item.text);
    });

  return facts;
}

function buildWebsiteSummaryText(facts, history, language) {
  const parts = [];
  if (facts.businessType) {
    parts.push(
      language === "en"
        ? `Earlier context suggests the business type is ${facts.businessType}`
        : `บริบทก่อนหน้าดูเป็นประเภทธุรกิจ ${facts.businessType}`
    );
  }
  if (facts.companyStatus === "new") {
    parts.push(language === "en" ? "It looks like a new or not-yet-registered company" : "ดูเป็นเคสบริษัทใหม่หรือยังไม่ได้จดทะเบียน");
  }
  if (facts.companyStatus === "existing") {
    parts.push(language === "en" ? "It looks like an already registered company" : "ดูเป็นเคสของบริษัทที่จดทะเบียนแล้ว");
  }
  if (facts.nationality) {
    parts.push(language === "en" ? `Nationality mentioned earlier: ${facts.nationality}` : `มีการพูดถึงสัญชาติ ${facts.nationality}`);
  }
  if (facts.unsupportedNationality) {
    parts.push(
      language === "en"
        ? "Earlier context mentions a visa/work-permit nationality outside the team's scope"
        : "บริบทก่อนหน้ามีสัญชาติที่อยู่นอกขอบเขตงานวีซ่าและ Work Permit ของทีม"
    );
  }
  if (facts.foreignShareholder) {
    parts.push(language === "en" ? "Foreign shareholders are involved" : "มีผู้ถือหุ้นต่างชาติเกี่ยวข้อง");
  }
  if (facts.mentionsVat) {
    parts.push(language === "en" ? "VAT is part of the conversation" : "มีประเด็น VAT อยู่ในบทสนทนา");
  }
  if (facts.mentionsPayroll) {
    parts.push(language === "en" ? "Payroll or social security is involved too" : "มีประเด็นเงินเดือนหรือประกันสังคมอยู่ด้วย");
  }
  if (facts.mentionsUrgent) {
    parts.push(language === "en" ? "The case seems time-sensitive" : "เคสดูมีความเร่งด่วนด้านเวลา");
  }

  const recent = history
    .filter((item) => item.role === "user")
    .slice(-4)
    .map((item) => item.text)
    .filter(Boolean);

  if (!parts.length && !recent.length) return "";

  const recentText = recent.length
    ? language === "en"
      ? `Recent questions: ${recent.join(" | ")}`
      : `คำถามล่าสุด: ${recent.join(" | ")}`
    : "";

  return [parts.join(language === "en" ? ". " : " "), recentText].filter(Boolean).join(language === "en" ? ". " : "\n");
}

function buildWebsiteMemory(history, language, serviceBucket) {
  const summary = buildEmptyConversationSummary(language, serviceBucket);
  const userHistory = history.filter((item) => item.role === "user");
  summary.turns = userHistory.length;
  summary.recentUserMessages = userHistory
    .filter((item) => item.role === "user")
    .map((item) => item.text)
    .slice(-6);
  summary.recentAssistantReplies = history
    .filter((item) => item.role === "assistant")
    .map((item) => item.text)
    .slice(-6);
  summary.knownFacts = collectKnownFacts(history, language, serviceBucket);
  summary.summaryText = buildWebsiteSummaryText(summary.knownFacts, history, language);
  return summary;
}

function serviceNeedFromBucket(bucket, intentKey, language) {
  const labels = {
    th: {
      "accounting-tax": "บัญชีและภาษี",
      "corporate-dbd": "จดทะเบียนบริษัทและงาน DBD",
      "visa-license": "วีซ่า Work Permit และใบอนุญาตธุรกิจ",
      "company-dissolution": "ปิดบริษัท",
      pricing: "สอบถามราคา",
      documents: "สอบถามเอกสารที่ต้องเตรียม",
      general: "ปรึกษาบริการทั่วไป",
    },
    en: {
      "accounting-tax": "Accounting and tax support",
      "corporate-dbd": "Company registration and DBD support",
      "visa-license": "Visa, work permit, and business license support",
      "company-dissolution": "Company dissolution support",
      pricing: "Pricing inquiry",
      documents: "Document preparation question",
      general: "General consultation",
    },
  };
  const set = language === "en" ? labels.en : labels.th;
  return set[bucket] || set[intentKey] || set.general;
}

function extractContact(text) {
  const raw = toText(text);
  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phoneRaw = raw.match(/0[689]\d[\d\s-]{6,12}/)?.[0] || "";
  const phone = phoneRaw.replace(/[^\d]/g, "");
  const lineId = raw.match(/(?:line|ไลน์)\s*[:=]?\s*@?([A-Za-z0-9._-]{3,40})/i)?.[1] || "";
  const name = raw.match(/(?:ชื่อ|name)\s*[:=]?\s*([^\n,|]{2,60})/i)?.[1] || "";
  return {
    name: name.trim(),
    phone,
    email: email.toLowerCase(),
    lineId: lineId ? `@${lineId.replace(/^@/, "")}` : "",
  };
}

function isUsableReplyText(text) {
  const value = toText(text);
  return Boolean(value) && value.length <= 1200 && !value.includes("\uFFFD");
}

function composeReply(language, baseReply, handoff, websiteReference) {
  const parts = [baseReply, buildHandoffReplyLine(language, handoff)];
  const url = toText(websiteReference?.source_url);
  if (url) {
    parts.push(language === "en" ? `Read more: ${url}` : `อ่านรายละเอียดเพิ่ม: ${url}`);
  }
  return [...new Set(parts.map(toText).filter(Boolean))].join("\n\n");
}

async function safeChannel(name, promise) {
  try {
    return await promise;
  } catch (error) {
    return { sent: false, reason: `${name}_failed`, message: toText(error?.message) };
  }
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = toJsonBody(req.body);
  const message = toText(body.message).slice(0, 1200);
  if (!message) {
    return json(res, 400, { ok: false, error: "message_required" });
  }

  const sessionId = toText(body.sessionId).slice(0, 80) || randomId("chat");
  const visitorId = toText(body.visitorId).slice(0, 80) || randomId("visitor");
  const language = ["th", "en"].includes(toText(body.language))
    ? toText(body.language)
    : detectLineLanguage(message);
  const history = normaliseHistory(body.history);
  const detectedIntent = detectLineIntent(message);
  const explicitServiceBucket =
    detectSpecificServiceBucket(message) ||
    (toText(detectedIntent.serviceBucket) !== "general" &&
    toText(detectedIntent.serviceBucket) !== "pricing"
      ? toText(detectedIntent.serviceBucket)
      : "");
  const roughServiceBucket = resolveServiceBucket(
    detectedIntent,
    buildWebsiteMemory(history, language, explicitServiceBucket || "general"),
    explicitServiceBucket,
    message
  );
  const memory = buildWebsiteMemory(history, language, roughServiceBucket);
  const conversationScope = buildConversationScope({
    text: message,
    language,
    resolvedServiceBucket: roughServiceBucket,
    memorySummary: memory,
  });
  const activeMemorySummary = conversationScope.summary;
  const finalServiceBucket = resolveServiceBucket(
    detectedIntent,
    activeMemorySummary,
    explicitServiceBucket,
    message
  );
  const intentDetail = detectAccountingIntentDetail(
    message,
    finalServiceBucket,
    detectedIntent.key
  );
  const serviceBucket = toText(intentDetail?.serviceBucket) || finalServiceBucket;
  const knowledgeContext = searchKnowledgeBase({
    query: message,
    language,
    serviceBucket,
    intentKey: detectedIntent.key,
    memorySummary: activeMemorySummary,
    preferredIds: intentDetail?.faqIds || [],
    limit: 6,
  });
  const caseFlavor = detectCaseFlavor(message, serviceBucket);
  const preliminaryBrain = buildNeuralBrain({
    text: message,
    memorySummary: activeMemorySummary,
    intent: detectedIntent,
    serviceBucket,
    intentDetail: intentDetail || null,
    handoff: null,
  });
  const handoff = evaluateHumanHandoff({
    text: message,
    serviceBucket,
    memorySummary: activeMemorySummary,
    unsupportedNationality: preliminaryBrain?.slots?.unsupportedNationality || "",
  });
  const brain = buildNeuralBrain({
    text: message,
    memorySummary: activeMemorySummary,
    intent: detectedIntent,
    serviceBucket,
    intentDetail: intentDetail || null,
    handoff,
  });
  const playbook = ["pricing", "official-reference"].includes(detectedIntent.key)
    ? null
    : resolveCasePlaybook({
        serviceBucket,
        responseMode: brain?.responseMode || "",
        caseFlavor,
        intentDetailId: toText(intentDetail?.id),
        knowledgeMatches: knowledgeContext.matches || [],
      });
  const answerAudit = buildAnswerAudit({
    eventText: message,
    intent: detectedIntent,
    brain,
    playbook,
    knowledgeContext,
    memorySummary: activeMemorySummary,
  });

  const resetOnly = isResetOnlyMessage(message, explicitServiceBucket || "general");
  const localReply = resetOnly
    ? language === "en"
      ? "Sure, we can start fresh. What would you like the team to help with first?"
      : "ได้เลยค่ะ เริ่มเคสใหม่ให้แล้ว ตอนนี้อยากให้ทีมช่วยเรื่องไหนเป็นหลักคะ"
    : buildLineReply({
        language,
        intent: detectedIntent,
        knowledgeContext,
        memorySummary: activeMemorySummary,
        eventText: message,
        serviceBucket,
      });

  const replyMode = toText(process.env.PINPOINT_CHAT_REPLY_MODE).toLowerCase();
  let openClawReply = { sent: false, reason: "local_reply_mode" };
  if (replyMode === "smart") {
    try {
      openClawReply = await requestOpenClawLineReply({
        source: "website_ai_chat",
        sessionId,
        visitorId,
        message,
        language,
        effectiveServiceBucket: serviceBucket,
        conversationSummary: activeMemorySummary,
        handoff,
        replyAnalysis: answerAudit,
        knowledgeMatches: knowledgeContext.matches || [],
        replyDraftText: localReply,
      });
    } catch (error) {
      openClawReply = {
        sent: false,
        reason: "smart_reply_failed",
        message: toText(error?.message),
      };
    }
  }
  const baseReply = isUsableReplyText(openClawReply?.replyText)
    ? openClawReply.replyText
    : localReply;
  const humanEscalation = evaluateAiHumanEscalation({
    text: message,
    detectedIntent,
    handoff,
    answerAudit,
    knowledgeContext,
    baseReply,
    openClawReply,
    resetOnly,
  });
  const replyText = humanEscalation.replaceReply
    ? buildHumanEscalationReply(language)
    : composeReply(language, baseReply, handoff, knowledgeContext.websiteReference);

  const contact = extractContact(message);
  const pageUrl = toText(body.pageUrl) || "https://pinpointaccountingservice.com";
  const lead = {
    leadId: randomId("chatlead"),
    fullName: contact.name || `Website chat ${visitorId}`,
    businessName: "",
    phone: contact.phone,
    email: contact.email,
    serviceNeed: serviceNeedFromBucket(serviceBucket, detectedIntent.key, language),
    revenueRange: "",
    preferredContact: contact.lineId ? "line" : contact.email ? "email" : contact.phone ? "phone" : "line",
    notes: message,
    pageUrl,
  };
  const clientMeta = buildClientMeta(req, {
    pageUrl,
    userAgent: body.userAgent,
    gaClientId: body.gaClientId,
    fbp: body.fbp,
    fbc: body.fbc,
  });
  const routing = mergeRoutingWithHandoff(buildRouting(lead), handoff, language);
  const intakePayload = buildLeadPayload({
    source: "website_ai_chat",
    lead,
    clientMeta,
    routing,
    lineEvent: null,
  });
  intakePayload.websiteChat = {
    sessionId,
    visitorId,
    language,
    intentKey: detectedIntent.key,
    intentDetailId: toText(intentDetail?.id),
    serviceBucket,
    conversationControl: {
      resetRequested: Boolean(conversationScope.resetRequested),
      topicSwitched: Boolean(conversationScope.topicSwitched),
    },
    replyText,
    handoff,
    humanEscalation,
    answerAudit,
    knowledgeMatchIds: (knowledgeContext.matches || []).map((entry) => entry.id),
  };

  const shouldCaptureLead = toText(process.env.PINPOINT_CHAT_LEAD_CAPTURE).toLowerCase() !== "false";
  const channels = shouldCaptureLead
    ? await Promise.all([
        safeChannel("crm_webhook", sendCrmWebhook(intakePayload)),
        safeChannel("supabase", sendSupabaseLead(intakePayload)),
        safeChannel("airtable", sendAirtableLead(intakePayload)),
        safeChannel(
          "human_escalation_line",
          sendHumanEscalationLineAlert({
            source: "website_ai_chat",
            lead,
            routing,
            escalation: humanEscalation,
            answerAudit,
            knowledgeContext,
            message,
            replyText,
            sessionId,
            visitorId,
            clientMeta,
          })
        ),
      ])
    : [
        { sent: false, reason: "chat_lead_capture_disabled" },
        { sent: false, reason: "chat_lead_capture_disabled" },
        { sent: false, reason: "chat_lead_capture_disabled" },
        { sent: false, reason: "chat_lead_capture_disabled" },
      ];

  return json(res, 200, {
    ok: true,
    sessionId,
    replyText,
    language,
    intentKey: detectedIntent.key,
    serviceBucket,
    handoff,
    humanEscalation,
    lead: {
      leadId: lead.leadId,
      captured: channels.some((channel) => channel.sent),
    },
    channels: {
      crmWebhook: channels[0],
      supabase: channels[1],
      airtable: channels[2],
      humanEscalationLine: channels[3],
      smartReply: openClawReply,
    },
    knowledgeMatchIds: intakePayload.websiteChat.knowledgeMatchIds,
  });
};
