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
const { requestOpenAIReply } = require("./_lib/openai-assist");
const { sendLinePushText } = require("./_lib/outbound");

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
  const businessTypeLabel = (() => {
    const value = String(facts.businessType || "");
    if (!value) return "";
    if (language === "en") return value;
    return (
      {
        restaurant: "ร้านอาหาร",
        clinic: "คลินิก",
        "e-commerce": "ขายออนไลน์",
        manufacturing: "โรงงาน/การผลิต",
        "service business": "ธุรกิจบริการ",
      }[value] || value
    );
  })();
  if (facts.businessType) {
    parts.push(
      language === "en"
        ? `Earlier context suggests the business type is ${businessTypeLabel}`
        : `บริบทก่อนหน้าดูเป็นประเภทธุรกิจ ${businessTypeLabel}`
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

function inferHistoryServiceBucket(history) {
  const userMessages = history.filter((item) => item.role === "user").map((item) => item.text).reverse();
  for (const text of userMessages) {
    const explicit = detectSpecificServiceBucket(text);
    if (explicit) return explicit;
    const intent = detectLineIntent(text);
    const bucket = toText(intent?.serviceBucket);
    if (bucket && bucket !== "general" && bucket !== "pricing") return bucket;
  }
  return "";
}

function buildWebsiteMemory(history, language, serviceBucket) {
  const effectiveServiceBucket = serviceBucket && serviceBucket !== "general"
    ? serviceBucket
    : inferHistoryServiceBucket(history) || serviceBucket;
  const summary = buildEmptyConversationSummary(language, effectiveServiceBucket);
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
  const nameMatch = raw.match(/(?:ชื่อ|name)\s*[:=]?\s*([^\n,|]{2,60})/i)?.[1] || "";
  const name = nameMatch
    .replace(/\s*(?:เบอร์|โทร|มือถือ|phone|tel|line|ไลน์|email|อีเมล).*$/i, "")
    .trim();
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


const PINPOINT_CONTACT = {
  phoneDisplay: "092-749-7442",
  phoneHref: "tel:0927497442",
  lineUrl: "https://lin.ee/58aU8oE",
  formUrl: "https://pinpointaccountingservice.com/#lead-form",
};

function servicePageUrl(serviceBucket) {
  const map = {
    "accounting-tax": "https://pinpointaccountingservice.com/monthly-accounting",
    "corporate-dbd": "https://pinpointaccountingservice.com/company-registration",
    "visa-license": "https://pinpointaccountingservice.com/visa-work-permit",
    "company-dissolution": "https://pinpointaccountingservice.com/company-dissolution",
  };
  return map[serviceBucket] || "https://pinpointaccountingservice.com/services";
}

function buildDocumentNudge(language, serviceBucket) {
  const th = {
    "accounting-tax": "เอกสารที่ช่วยให้ประเมินเร็ว: ประเภทธุรกิจ, รายได้/จำนวนรายการต่อเดือน, มี VAT/เงินเดือนหรือไม่ และปัญหาที่ต้องแก้ด่วน",
    "corporate-dbd": "เอกสาร/ข้อมูลที่ช่วยให้เริ่มได้เร็ว: ชื่อบริษัทที่ต้องการ, ผู้ถือหุ้น/กรรมการ, ที่อยู่บริษัท และวัตถุประสงค์ธุรกิจ",
    "visa-license": "เอกสารที่ควรเล่าให้ทีมทราบก่อน: สัญชาติ, ประเภทวีซ่าปัจจุบัน, ตำแหน่งงาน, บริษัทจดแล้วหรือยัง และวันหมดอายุถ้ามี",
    "company-dissolution": "ข้อมูลที่ช่วยให้ประเมินเร็ว: บริษัทมีภาษี/ประกันสังคม/หนี้ค้างไหม, งบล่าสุดถึงปีไหน และมีบัญชีธนาคาร/สัญญาที่ยังเปิดอยู่หรือไม่",
  };
  const en = {
    "accounting-tax": "Useful details for assessment: business type, monthly transaction volume/revenue, VAT/payroll status, and any urgent tax issue.",
    "corporate-dbd": "Useful details to start: preferred company name, shareholders/directors, registered address, and business objective.",
    "visa-license": "Useful details for the team: nationality, current visa type, job position, whether the company is registered, and expiry date if any.",
    "company-dissolution": "Useful details for assessment: pending tax/social security/debts, latest closed accounts, and any open bank accounts or contracts.",
  };
  const table = language === "en" ? en : th;
  return table[serviceBucket] || (language === "en"
    ? "Useful details: business type, what you need done, timeline, and the documents you already have."
    : "ข้อมูลที่ช่วยให้ทีมประเมินเร็ว: ประเภทธุรกิจ สิ่งที่ต้องการทำ ระยะเวลาที่ต้องการ และเอกสารที่มีอยู่แล้ว");
}

function buildSalesCloser({ language, serviceBucket, detectedIntent, contact, pageUrl }) {
  const hasContact = Boolean(contact?.phone || contact?.email || contact?.lineId);
  const serviceUrl = servicePageUrl(serviceBucket);
  const wantsPriceOrDocs = ["pricing", "documents"].includes(toText(detectedIntent?.key));
  if (language === "en") {
    const lines = [
      "Next step:",
      `- Fastest contact: LINE OA ${PINPOINT_CONTACT.lineUrl} or call ${PINPOINT_CONTACT.phoneDisplay}`,
      `- Send your case here: ${PINPOINT_CONTACT.formUrl}`,
      `- Service details: ${serviceUrl}`,
    ];
    if (!wantsPriceOrDocs && !hasContact) lines.push(`- To assess quickly: ${buildDocumentNudge(language, serviceBucket)}`);
    if (!hasContact) lines.push("If you share your phone or LINE ID here, the team can follow up with the right checklist.");
    return lines.join("\n");
  }
  const lines = [
    "ขั้นตอนถัดไปที่น้องพิณแนะนำ:",
    `- ถ้าต้องการให้ทีมตอบเร็วที่สุด ทัก LINE OA: ${PINPOINT_CONTACT.lineUrl} หรือโทร ${PINPOINT_CONTACT.phoneDisplay}`,
    `- ส่งรายละเอียดเคสผ่านฟอร์ม: ${PINPOINT_CONTACT.formUrl}`,
    `- อ่านหน้าบริการที่เกี่ยวข้อง: ${serviceUrl}`,
  ];
  if (!wantsPriceOrDocs && !hasContact) lines.push(`- เพื่อให้ทีมประเมินได้เร็ว: ${buildDocumentNudge(language, serviceBucket)}`);
  if (!hasContact) lines.push("ถ้าสะดวก ฝากเบอร์หรือ LINE ID ไว้ในแชตนี้ได้เลยค่ะ ทีมจะติดต่อกลับพร้อมเช็กลิสต์ที่ตรงเคส");
  return lines.join("\n");
}

function hasSalesContactPath(text) {
  const value = toText(text);
  return /https:\/\/lin\.ee\/58aU8oE|092-?749-?7442|#lead-form|pinpointaccountingservice\.com\/#lead-form|tel:0927497442/i.test(value);
}

function composeSalesReply({ language, baseReply, handoff, websiteReference, serviceBucket, detectedIntent, contact, pageUrl, resetOnly }) {
  const reply = composeReply(language, baseReply, handoff, websiteReference);
  if (resetOnly) return reply;
  const closer = buildSalesCloser({ language, serviceBucket, detectedIntent, contact, pageUrl });
  if (hasSalesContactPath(reply)) return reply;
  return [reply, closer].map(toText).filter(Boolean).join("\n\n");
}

function shouldUseSalesFallback(message, detectedIntent) {
  const value = toText(message);
  return ["pricing", "documents"].includes(toText(detectedIntent?.key)) || /ติดต่อ|ส่ง.*ทีม|ประเมิน|ขอใบเสนอ|ช่องทาง|เอกสาร|line|ไลน์|โทร|form|ฟอร์ม|quote|quotation|contact|document|checklist/i.test(value);
}

function buildSalesFallbackReply({ language, message, serviceBucket, detectedIntent, memorySummary }) {
  if (!shouldUseSalesFallback(message, detectedIntent)) return "";
  const docs = buildDocumentNudge(language, serviceBucket);
  if (language === "en") {
    if (toText(detectedIntent?.key) === "pricing") {
      return `A price estimate depends on scope, document volume, VAT/payroll status, and urgency. For a fast assessment, send: ${docs}\n\nOne helpful detail: when do you need the work to start?`;
    }
    return `For the team to assess your case quickly, send these details first: ${docs}\n\nOne helpful detail: is the company already registered, or are you starting a new one?`;
  }
  if (toText(detectedIntent?.key) === "pricing") {
    return `ประเมินราคาได้ค่ะ แต่ราคาจะขึ้นกับขอบเขตงาน จำนวนเอกสารต่อเดือน สถานะ VAT/เงินเดือน และความเร่งด่วนของเคส เบื้องต้นให้ส่งข้อมูลนี้มาก่อน: ${docs}\n\nถามเพิ่ม 1 ข้อค่ะ ต้องการให้เริ่มดูแลตั้งแต่เดือนไหนคะ`;
  }
  return `ส่งให้ทีมประเมินได้เลยค่ะ เพื่อให้ตอบเร็วและตรงเคส ให้ส่งข้อมูลนี้มาก่อน: ${docs}\n\nถามเพิ่ม 1 ข้อค่ะ บริษัทจดทะเบียนแล้ว หรือกำลังจะเริ่มจดใหม่คะ`;
}

async function safeChannel(name, promise) {
  try {
    return await promise;
  } catch (error) {
    return { sent: false, reason: `${name}_failed`, message: toText(error?.message) };
  }
}

function truncateLineText(text, limit = 900) {
  const value = toText(text).replace(/\s+$/g, "");
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function hasDirectContact(contact) {
  return Boolean(contact?.phone || contact?.email || contact?.lineId);
}

function buildWebsiteChatContactLineText({ lead, contact, routing, message, replyText, sessionId, visitorId, clientMeta }) {
  const contactLines = [
    contact?.name || lead?.fullName ? `ชื่อ: ${toText(contact?.name || lead?.fullName)}` : "ชื่อ: -",
    contact?.phone ? `เบอร์: ${contact.phone}` : "เบอร์: -",
    contact?.lineId ? `LINE ID: ${contact.lineId}` : "LINE ID: -",
    contact?.email ? `Email: ${contact.email}` : "Email: -",
  ];

  return [
    "[WEBSITE AI CHAT LEAD] ลูกค้าฝากช่องทางติดต่อในแชต",
    `เวลา: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`,
    "",
    `Lead ID: ${toText(lead?.leadId) || "-"}`,
    `Session: ${toText(sessionId) || "-"}`,
    `Visitor: ${toText(visitorId) || "-"}`,
    `บริการ: ${toText(lead?.serviceNeed) || "-"}`,
    `Priority: ${toText(routing?.priority) || "-"}`,
    `Preferred contact: ${toText(lead?.preferredContact) || "-"}`,
    ...contactLines,
    `Page: ${toText(lead?.pageUrl || clientMeta?.pageUrl) || "-"}`,
    "",
    "ข้อความลูกค้า:",
    truncateLineText(message || lead?.notes, 1000),
    "",
    "AI reply ล่าสุด:",
    truncateLineText(replyText, 900),
    "",
    "CTA สำหรับทีม:",
    contact?.phone ? `- โทรกลับ: tel:${contact.phone}` : "- โทรกลับ: ยังไม่มีเบอร์",
    contact?.lineId ? `- ทัก LINE ID: ${contact.lineId}` : "- ทัก LINE: ใช้ LINE OA/รอลูกค้าทักเพิ่มหากยังไม่มี ID",
    `- เปิดฟอร์ม/หน้าเว็บ: ${toText(lead?.pageUrl || clientMeta?.pageUrl) || "https://pinpointaccountingservice.com/#lead-form"}`,
  ].join("\n").slice(0, 4500);
}

async function sendWebsiteChatContactLineAlert(payload) {
  if (!hasDirectContact(payload?.contact)) {
    return { sent: false, reason: "contact_not_provided" };
  }
  return sendLinePushText(buildWebsiteChatContactLineText(payload));
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
  const salesFallbackReply = buildSalesFallbackReply({
    language,
    message,
    serviceBucket,
    detectedIntent,
    memorySummary: activeMemorySummary,
  });
  const localReply = resetOnly
    ? language === "en"
      ? "Sure, we can start fresh. What would you like the team to help with first?"
      : "ได้เลยค่ะ เริ่มเคสใหม่ให้แล้ว ตอนนี้อยากให้ทีมช่วยเรื่องไหนเป็นหลักคะ"
    : salesFallbackReply || buildLineReply({
        language,
        intent: detectedIntent,
        knowledgeContext,
        memorySummary: activeMemorySummary,
        eventText: message,
        serviceBucket,
      });

  const replyMode = toText(process.env.PINPOINT_CHAT_REPLY_MODE || "smart").toLowerCase();
  let smartReply = { sent: false, reason: "local_reply_mode" };

  if (replyMode !== "local") {
    // Try OpenAI first if API key is available
    try {
      const openAIReply = await requestOpenAIReply({
        message,
        history,
        language,
        serviceBucket,
        memorySummary: activeMemorySummary,
        knowledgeMatches: knowledgeContext.matches || [],
      });
      if (openAIReply.sent) {
        smartReply = openAIReply;
      }
    } catch (error) {
      smartReply = {
        sent: false,
        reason: "openai_reply_failed",
        message: toText(error?.message),
      };
    }

    // Fall back to OpenClaw webhook if OpenAI is not available
    if (!smartReply.sent) {
      try {
        smartReply = await requestOpenClawLineReply({
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
        smartReply = {
          sent: false,
          reason: "smart_reply_failed",
          message: toText(error?.message),
        };
      }
    }
  }
  const contact = extractContact(message);
  const pageUrl = toText(body.pageUrl) || "https://pinpointaccountingservice.com";
  const baseReply = isUsableReplyText(smartReply?.replyText)
    ? smartReply.replyText
    : localReply;
  const humanEscalation = evaluateAiHumanEscalation({
    text: message,
    detectedIntent,
    handoff,
    answerAudit,
    knowledgeContext,
    memorySummary: activeMemorySummary,
    baseReply,
    openClawReply: smartReply,
    resetOnly,
  });
  const replyText = humanEscalation.replaceReply
    ? buildHumanEscalationReply(language)
    : composeSalesReply({
        language,
        baseReply,
        handoff,
        websiteReference: knowledgeContext.websiteReference,
        serviceBucket,
        detectedIntent,
        contact,
        pageUrl,
        resetOnly,
      });
  const lead = {
    leadId: randomId("chatlead"),
    fullName: contact.name || `Website chat ${visitorId}`,
    businessName: "",
    phone: contact.phone,
    email: contact.email,
    lineId: contact.lineId,
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
        safeChannel("website_chat_contact_line", sendWebsiteChatContactLineAlert({
          lead,
          contact,
          routing,
          message,
          replyText,
          sessionId,
          visitorId,
          clientMeta,
        })),
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
      websiteChatContactLine: channels[3],
      humanEscalationLine: channels[4],
      smartReply: smartReply,
    },
    knowledgeMatchIds: intakePayload.websiteChat.knowledgeMatchIds,
  });
};
