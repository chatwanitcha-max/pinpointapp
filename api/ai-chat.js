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
const { postJson, sendLinePushText } = require("./_lib/outbound");

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

function stripReplyFiller(text) {
  let value = toText(text).trim();
  if (!value) return "";

  const fillerPatterns = [
    /^สวัสดีค่ะ\s*ขอบคุณที่ติดต่อ\s*Pinpoint\s*นะคะ\s*/i,
    /^สวัสดีค่ะ\s*/i,
    /^Hello,?\s*thank you for contacting Pinpoint\.?\s*/i,
    /^Hello!?\s*/i,
  ];
  fillerPatterns.forEach((pattern) => {
    value = value.replace(pattern, "").trim();
  });

  const callbackFillers = [
    /\n{0,2}\s*ทีมงานของเราจะติดต่อกลับคุณลูกค้าโดยด่วนที่สุดค่ะ\s*ขอบคุณค่ะ\s*$/i,
    /\n{0,2}\s*ทีมงานจะติดต่อกลับ(?:โดยเร็ว|ภายใน 1 วันทำการ)?[^\n]*$/i,
    /\n{0,2}\s*Our team will contact you as soon as possible\.?(?:\s*Thank you\.)?\s*$/i,
  ];
  callbackFillers.forEach((pattern) => {
    value = value.replace(pattern, "").trim();
  });

  return value;
}

function isUsableReplyText(text, latestMessage = "") {
  const value = toText(text);
  if (!value || value.length > 1200 || value.includes("\uFFFD")) return false;

  const normalized = stripReplyFiller(value).replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  const callbackOnly = /^(ทีมงานของเราจะติดต่อกลับคุณลูกค้าโดยด่วนที่สุดค่ะ ขอบคุณค่ะ)$/i.test(normalized)
    || /^(Our team will contact you as soon as possible\. Thank you\.)$/i.test(normalized);
  if (callbackOnly) return false;

  const latest = toText(latestMessage);
  if (/ทำบัญชี|บริษัท.*บัญชี|ประเมิน|ส่ง.*รายละเอียด|ช่องทางไหน/i.test(latest)
    && /ทีมงานของเราจะติดต่อกลับคุณลูกค้าโดยด่วนที่สุดค่ะ ขอบคุณค่ะ/i.test(value.replace(/\s+/g, " "))
    && normalized.length < 180) {
    return false;
  }

  return true;
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
      "Fastest next step:",
      `- Send the case via LINE ${PINPOINT_CONTACT.lineUrl}, form ${PINPOINT_CONTACT.formUrl}, or call ${PINPOINT_CONTACT.phoneDisplay}`,
    ];
    if (!wantsPriceOrDocs && !hasContact) lines.push(`- Include: ${buildDocumentNudge(language, serviceBucket)}`);
    if (serviceBucket !== "general") lines.push(`- Related page: ${serviceUrl}`);
    if (!hasContact) lines.push("If you leave a phone or LINE ID here, the team will see it immediately.");
    return lines.join("\n");
  }
  const lines = [
    "ขั้นตอนเร็วสุด:",
    `- ส่งเคสทาง LINE ${PINPOINT_CONTACT.lineUrl}, ฟอร์ม ${PINPOINT_CONTACT.formUrl} หรือโทร ${PINPOINT_CONTACT.phoneDisplay}`,
  ];
  if (!wantsPriceOrDocs && !hasContact) lines.push(`- แนบข้อมูลหลัก: ${buildDocumentNudge(language, serviceBucket)}`);
  if (serviceBucket !== "general") lines.push(`- หน้าที่เกี่ยวข้อง: ${serviceUrl}`);
  if (!hasContact) lines.push("ถ้าฝากเบอร์หรือ LINE ID ในแชตนี้ ทีมจะเห็นทันทีและติดต่อกลับได้ค่ะ");
  return lines.join("\n");
}

function hasSalesContactPath(text) {
  const value = toText(text);
  return /https:\/\/lin\.ee\/58aU8oE|092-?749-?7442|#lead-form|pinpointaccountingservice\.com\/#lead-form|tel:0927497442/i.test(value);
}

function alreadyGivesNextStep(text) {
  return /ช่องทางเร็วสุด|Fastest route|ส่งข้อมูล 6 อย่าง|ทีมควรรู้ก่อนว่า|For monthly accounting, the team usually needs/i.test(toText(text));
}

function composeSalesReply({ language, baseReply, handoff, websiteReference, serviceBucket, detectedIntent, contact, pageUrl, resetOnly }) {
  const reply = composeReply(language, baseReply, handoff, websiteReference);
  if (resetOnly) return reply;
  if (hasSalesContactPath(reply) || alreadyGivesNextStep(reply)) return reply;
  const closer = buildSalesCloser({ language, serviceBucket, detectedIntent, contact, pageUrl });
  return [reply, closer].map(toText).filter(Boolean).join("\n\n");
}

function isAssessmentRoutingQuestion(message) {
  const value = toText(message);
  return /ประเมิน|ส่ง.*รายละเอียด|รายละเอียด.*ส่ง|ช่องทางไหน|เร็วที่สุด|ส่ง.*ช่องทาง|ทีม.*ประเมิน|quote|quotation|assess|assessment|fastest channel/i.test(value);
}

function isAccountingCompanyQuestion(message, serviceBucket) {
  const value = toText(message);
  return serviceBucket === "accounting-tax" && /ทำบัญชี|บริษัท.*บัญชี|บัญชีรายเดือน|สำนักงานบัญชี|ต้องการบริษัท|จ้าง.*บัญชี|bookkeeping|accounting firm/i.test(value);
}

function buildConsultantFirstReply({ language, message, serviceBucket, detectedIntent }) {
  const pricing = toText(detectedIntent?.key) === "pricing";
  const assessment = isAssessmentRoutingQuestion(message);
  const accountingCompany = isAccountingCompanyQuestion(message, serviceBucket);

  if (!pricing && !assessment && !accountingCompany) return "";

  if (language === "en") {
    if (accountingCompany) {
      return [
        "If you need a company to handle monthly accounting, Nong Pin can help screen the case first — not just pass you to sales.",
        "For monthly accounting, the team usually needs: business type, whether the company is already registered, VAT status, payroll/social security status, monthly document or transaction volume, current accounting backlog, and when you want service to start.",
        "Pinpoint can help with monthly bookkeeping, tax filing coordination, VAT/withholding-tax document flow, payroll-related checks, and cleanup of accounting/tax issues before handing the exact scope to the team.",
        "One key question: is the company already registered and operating, or are you about to register it?",
      ].join("\n\n");
    }
    if (pricing) {
      return "A useful estimate needs scope, monthly document volume, VAT/payroll status, backlog, and urgency. Send those details first; the team can then judge whether this is simple monthly accounting, cleanup, or a tax-risk case. One key question: when do you need service to start?";
    }
    return "For fast assessment, send: business type, what service you need, whether the company already exists, VAT/payroll status if relevant, document volume or urgency, and any deadline/problem. Fastest route is LINE or the form because the team receives structured details. One key question: is this for an existing company or a new registration?";
  }

  if (accountingCompany) {
    return [
      "ถ้าต้องการบริษัทมาทำบัญชี น้องพิณช่วยคัดกรองเคสเบื้องต้นให้ได้ค่ะ ไม่ใช่แค่ส่งต่อทีมขายเฉย ๆ",
      "สำหรับบัญชีรายเดือน ทีมควรรู้ก่อนว่า: ธุรกิจทำอะไร, บริษัทจดแล้วหรือยัง, จด VAT ไหม, มีเงินเดือน/ประกันสังคมหรือไม่, เอกสารหรือรายการต่อเดือนประมาณกี่ชุด, มีบัญชีย้อนหลัง/ภาษีค้างไหม และอยากให้เริ่มเดือนไหน",
      "Pinpoint ช่วยดูได้ทั้งบัญชีรายเดือน, ภาษีรายเดือน/รายปี, VAT/หัก ณ ที่จ่าย, เอกสารเงินเดือน และเคลียร์งานบัญชี/ภาษีที่ค้างก่อนรับดูแลต่อเนื่อง",
      "ถามเพิ่ม 1 ข้อค่ะ: บริษัทจดทะเบียนและเปิดดำเนินการแล้ว หรือกำลังจะจดใหม่คะ",
    ].join("\n\n");
  }

  if (pricing) {
    return "ประเมินราคาได้ค่ะ แต่ต้องดูขอบเขตงานก่อน: ประเภทธุรกิจ, จำนวนเอกสาร/รายการต่อเดือน, มี VAT ไหม, มีเงินเดือน/ประกันสังคมไหม, มีงานย้อนหลังหรือภาษีค้างหรือไม่ และความเร่งด่วนของเคส\n\nถามเพิ่ม 1 ข้อค่ะ: ต้องการให้เริ่มดูแลตั้งแต่เดือนไหนคะ";
  }

  return "ถ้าต้องการให้ทีมประเมินเร็ว ให้ส่งข้อมูล 6 อย่างนี้ค่ะ: 1) ประเภทธุรกิจ 2) ต้องการบริการอะไร 3) บริษัทจดแล้วหรือยัง 4) มี VAT/เงินเดือน/ประกันสังคมหรือไม่ 5) จำนวนเอกสารหรือปัญหาที่ค้างอยู่ 6) deadline หรือเดือนที่อยากเริ่ม\n\nช่องทางเร็วสุดคือ LINE หรือฟอร์ม เพราะทีมจะเห็นรายละเอียดเป็นชุดเดียวและประเมินต่อได้ทันที\n\nถามเพิ่ม 1 ข้อค่ะ: เคสนี้เป็นบริษัทที่เปิดดำเนินการแล้ว หรือกำลังจะเริ่มจดใหม่คะ";
}

function shouldUseSalesFallback(message, detectedIntent) {
  const value = toText(message);
  return ["pricing", "documents"].includes(toText(detectedIntent?.key)) || /ติดต่อ|ส่ง.*ทีม|ประเมิน|ขอใบเสนอ|ช่องทาง|เอกสาร|line|ไลน์|โทร|form|ฟอร์ม|quote|quotation|contact|document|checklist/i.test(value);
}

function buildSalesFallbackReply({ language, message, serviceBucket, detectedIntent, memorySummary }) {
  if (!shouldUseSalesFallback(message, detectedIntent)) return "";
  const consultantReply = buildConsultantFirstReply({ language, message, serviceBucket, detectedIntent });
  if (consultantReply) return consultantReply;
  const docs = buildDocumentNudge(language, serviceBucket);
  if (language === "en") {
    return `I can help narrow the case first. Send: ${docs}\n\nOne useful detail: what result do you need from the team first — estimate, document checklist, or urgent filing help?`;
  }
  return `น้องพิณช่วยคัดกรองเคสให้ก่อนค่ะ เบื้องต้นส่งข้อมูลนี้มาก่อน: ${docs}\n\nถามเพิ่ม 1 ข้อค่ะ ต้องการให้ทีมช่วยเรื่องแรกคือประเมินราคา เช็กลิสต์เอกสาร หรือแก้เคสด่วนคะ`;
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
  const text = buildWebsiteChatContactLineText(payload);
  const webhookPayload = {
    type: "website_ai_chat_contact",
    lead: payload.lead,
    contact: payload.contact,
    routing: payload.routing,
    message: payload.message,
    replyText: payload.replyText,
    sessionId: payload.sessionId,
    visitorId: payload.visitorId,
    clientMeta: payload.clientMeta,
    text,
  };
  const [webhook, push] = await Promise.all([
    postJson(process.env.LINE_OA_WEBHOOK_URL, webhookPayload),
    sendLinePushText(text),
  ]);
  return {
    sent: Boolean(webhook?.sent || push?.sent),
    webhook,
    push,
  };
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
  const consultantFirstReply = buildConsultantFirstReply({
    language,
    message,
    serviceBucket,
    detectedIntent,
  });
  const salesFallbackReply = consultantFirstReply || buildSalesFallbackReply({
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
  }
  const contact = extractContact(message);
  const pageUrl = toText(body.pageUrl) || "https://pinpointaccountingservice.com";
  const baseReply = isUsableReplyText(smartReply?.replyText, message)
    ? stripReplyFiller(smartReply.replyText) || localReply
    : localReply;
  const humanEscalation = evaluateAiHumanEscalation({
    text: message,
    detectedIntent,
    handoff,
    answerAudit,
    knowledgeContext,
    memorySummary: activeMemorySummary,
    baseReply,
    smartReply,
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
