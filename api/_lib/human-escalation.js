const { toText } = require("./analytics");
const { sendLinePushText } = require("./outbound");

const GENERIC_REPLY_RE =
  /ทีมงานของเราจะติดต่อกลับหาคุณโดยเร็วที่สุด|our team will get back to you as soon as possible/i;

const LOW_VALUE_MESSAGE_RE =
  /^(สวัสดี|หวัดดี|ดีค่ะ|ดีครับ|hello|hi|hey|ขอบคุณ|thanks|thank you|ok|okay|โอเค|รับทราบ|test|ทดสอบ)$/i;

function isEnabled() {
  const value = toText(process.env.HUMAN_ESCALATION_LINE_ENABLED).toLowerCase();
  if (!value) return true;
  return !["0", "false", "no", "off", "disabled"].includes(value);
}

function isLowValueMessage(text) {
  const value = toText(text).trim();
  return value.length <= 24 && LOW_VALUE_MESSAGE_RE.test(value);
}

function topMatch(knowledgeContext) {
  return Array.isArray(knowledgeContext?.matches) ? knowledgeContext.matches[0] || null : null;
}

function hasStrongKnowledge(answerAudit, knowledgeContext) {
  const verifiedBy = Array.isArray(answerAudit?.verifiedBy) ? answerAudit.verifiedBy : [];
  const top = topMatch(knowledgeContext);
  const topScore = Number(answerAudit?.topScore || top?.score || 0);
  return (
    verifiedBy.some((item) => /^knowledge:|^playbook:|^official:/i.test(toText(item))) ||
    topScore >= 190
  );
}

function evaluateAiHumanEscalation({
  text,
  detectedIntent,
  handoff,
  answerAudit,
  knowledgeContext,
  baseReply,
  openClawReply,
  resetOnly = false,
}) {
  if (resetOnly || isLowValueMessage(text)) {
    return {
      required: false,
      replaceReply: false,
      severity: "normal",
      reason: "not_required",
      reasonTh: "",
      reasonEn: "",
    };
  }

  const intentKey = toText(detectedIntent?.key);
  const top = topMatch(knowledgeContext);
  const topScore = Number(answerAudit?.topScore || top?.score || 0);
  const smartLowConfidence =
    toText(openClawReply?.confidence).toLowerCase() === "low" ||
    Boolean(openClawReply?.shouldClarify);
  const genericReply = GENERIC_REPLY_RE.test(toText(baseReply));
  const weakKnowledge = !hasStrongKnowledge(answerAudit, knowledgeContext);
  const shouldClarify = Boolean(answerAudit?.shouldClarify);

  if (handoff?.required) {
    return {
      required: true,
      replaceReply: false,
      severity: handoff.severity || "warm",
      reason: "handoff_required",
      reasonTh: handoff.reason_th || "เคสนี้ควรให้ทีมงานตรวจรายละเอียดต่อ",
      reasonEn: handoff.reason_en || "This case should be reviewed by the human team.",
      topScore,
    };
  }

  if (smartLowConfidence) {
    return {
      required: true,
      replaceReply: true,
      severity: "warm",
      reason: "smart_reply_low_confidence",
      reasonTh: "AI ไม่มั่นใจคำตอบจาก smart reply และควรให้ทีมงานตอบแทน",
      reasonEn: "The smart reply is low-confidence and should be answered by the team.",
      topScore,
    };
  }

  if (shouldClarify || genericReply || (weakKnowledge && intentKey !== "service-area")) {
    return {
      required: true,
      replaceReply: true,
      severity: "warm",
      reason: shouldClarify ? "needs_clarification" : genericReply ? "generic_reply" : "weak_knowledge_match",
      reasonTh: shouldClarify
        ? "AI ต้องการข้อมูลเพิ่มและไม่ควรสรุปคำตอบเอง"
        : genericReply
          ? "AI ตอบได้เพียงข้อความทั่วไป จึงควรให้ทีมงานรับช่วง"
          : "AI ยังไม่มีฐานความรู้ที่มั่นใจพอสำหรับคำถามนี้",
      reasonEn: shouldClarify
        ? "The AI needs more context and should not finalize the answer."
        : genericReply
          ? "The AI only produced a generic reply, so the team should take over."
          : "The AI does not have a confident knowledge match for this question.",
      topScore,
    };
  }

  return {
    required: false,
    replaceReply: false,
    severity: "normal",
    reason: "not_required",
    reasonTh: "",
    reasonEn: "",
    topScore,
  };
}

function buildHumanEscalationReply(language = "th") {
  if (language === "en") {
    return [
      "Thank you. This question needs a human team member to review the details before answering accurately.",
      "I have sent the case to the team. If convenient, please leave your phone, LINE ID, or email here so the team can follow up faster.",
    ].join("\n\n");
  }

  return [
    "ขอบคุณค่ะ คำถามนี้ควรให้ทีมงานตรวจรายละเอียดก่อนตอบ เพื่อให้คำตอบแม่นและไม่พลาดข้อมูลสำคัญ",
    "ระบบส่งเรื่องให้ทีมงานแล้วค่ะ ถ้าสะดวก รบกวนฝากเบอร์โทร LINE ID หรืออีเมลไว้ในช่องนี้ ทีมจะติดต่อกลับได้เร็วขึ้นค่ะ",
  ].join("\n\n");
}

function serviceLabel(value) {
  const bucket = toText(value);
  const labels = {
    "accounting-tax": "บัญชีและภาษี",
    "corporate-dbd": "จดบริษัท / DBD",
    "visa-license": "Visa / Work Permit / ใบอนุญาต",
    "company-dissolution": "ปิดบริษัท",
    pricing: "สอบถามราคา",
    documents: "เอกสารที่ต้องเตรียม",
    general: "ทั่วไป",
  };
  return labels[bucket] || bucket || "-";
}

function truncate(value, max = 900) {
  const text = toText(value).trim();
  if (text.length <= max) return text || "-";
  return `${text.slice(0, max - 3)}...`;
}

function formatKnowledgeMatches(matches = []) {
  return matches
    .slice(0, 3)
    .map((entry) => `- ${toText(entry.id) || "-"} (${Math.round(Number(entry.score || 0))})`)
    .join("\n") || "-";
}

function buildHumanEscalationLineText({
  source = "website_ai_chat",
  lead,
  routing,
  escalation,
  answerAudit,
  knowledgeContext,
  message,
  replyText,
  sessionId,
  visitorId,
  clientMeta,
  lineEvent,
}) {
  const matches = Array.isArray(knowledgeContext?.matches) ? knowledgeContext.matches : [];
  const contact = [
    lead?.phone ? `โทร: ${lead.phone}` : "",
    lead?.email ? `อีเมล: ${lead.email}` : "",
    lead?.preferredContact ? `ช่องทาง: ${lead.preferredContact}` : "",
  ].filter(Boolean).join(" | ") || "ยังไม่มีข้อมูลติดต่อ";

  return [
    "[AI HANDOFF] ต้องให้คนตอบแทน",
    `เหตุผล: ${toText(escalation?.reasonTh || escalation?.reason) || "-"}`,
    `ระดับ: ${toText(escalation?.severity) || "warm"}`,
    `แหล่งที่มา: ${source}`,
    `เวลา: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`,
    "",
    `Lead ID: ${toText(lead?.leadId) || "-"}`,
    `Session: ${toText(sessionId || lineEvent?.userId) || "-"}`,
    `Visitor: ${toText(visitorId || lineEvent?.sourceType) || "-"}`,
    `บริการ: ${serviceLabel(routing?.serviceBucket || lead?.serviceNeed)}`,
    `Priority: ${toText(routing?.priority) || "-"}`,
    `ติดต่อ: ${contact}`,
    `Page: ${toText(lead?.pageUrl || clientMeta?.pageUrl) || "-"}`,
    "",
    "ข้อความลูกค้า:",
    truncate(message || lead?.notes, 900),
    "",
    "คำตอบที่ระบบแจ้งลูกค้า:",
    truncate(replyText, 700),
    "",
    "AI confidence:",
    `confidence=${toText(answerAudit?.confidence) || "-"} low=${Boolean(answerAudit?.lowConfidence)} clarify=${Boolean(answerAudit?.shouldClarify)} topScore=${Math.round(Number(answerAudit?.topScore || escalation?.topScore || 0))}`,
    "",
    "Knowledge matches:",
    formatKnowledgeMatches(matches),
  ].join("\n").slice(0, 4500);
}

async function sendHumanEscalationLineAlert(payload) {
  if (!payload?.escalation?.required) {
    return { sent: false, reason: "human_escalation_not_required" };
  }
  if (!isEnabled()) {
    return { sent: false, reason: "human_escalation_disabled" };
  }
  return sendLinePushText(buildHumanEscalationLineText(payload));
}

module.exports = {
  evaluateAiHumanEscalation,
  buildHumanEscalationReply,
  buildHumanEscalationLineText,
  sendHumanEscalationLineAlert,
};
