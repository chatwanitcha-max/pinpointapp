const { toText } = require("./analytics");
const UNSUPPORTED_VISA_NATIONALITY_RE = /cambodia|cambodian|laos|\blao\b|myanmar|burmese/i;

const RULES = [
  {
    id: "tax-audit-or-official-notice",
    severity: "hot",
    agent: "complianceReviewer",
    patterns: [
      /ตรวจสอบภาษี/u,
      /สรรพากร/u,
      /หนังสือ/u,
      /เบี้ยปรับ/u,
      /ภาษีย้อนหลัง/u,
      /audit/i,
      /revenue department/i,
      /official notice/i,
      /penalt/i,
      /fine/i,
      /back tax/i,
    ],
    reason_th:
      "เคสดูมีประเด็นตรวจสอบภาษี หนังสือจากหน่วยงาน หรือเบี้ยปรับที่ควรให้ทีมงานดูต่อโดยตรง",
    reason_en:
      "The case appears to involve a tax review, official notice, or penalties and should be reviewed by the team directly.",
  },
  {
    id: "urgent-deadline",
    severity: "hot",
    agent: "salesFollowUp",
    patterns: [
      /ด่วน/u,
      /ภายใน/u,
      /วันนี้/u,
      /พรุ่งนี้/u,
      /หมดเขต/u,
      /urgent/i,
      /asap/i,
      /today/i,
      /tomorrow/i,
      /deadline/i,
      /expire/i,
      /expires/i,
      /within\s+\d+/i,
    ],
    reason_th:
      "เคสดูมี deadline หรือความเร่งด่วนที่ควรให้ทีมงานรับช่วงเร็วขึ้น",
    reason_en:
      "The case appears to have a deadline or urgency that should be handled by the team more quickly.",
  },
  {
    id: "foreign-structure-or-cross-border",
    severity: "warm",
    agent: "complianceReviewer",
    patterns: [
      /ผู้ถือหุ้นต่างชาติ/u,
      /กรรมการต่างชาติ/u,
      /ต่างชาติ/u,
      /foreign shareholder/i,
      /foreign director/i,
      /cross-border/i,
      /boi/i,
    ],
    reason_th:
      "เคสดูมีองค์ประกอบต่างชาติหรือโครงสร้างที่ควรให้ทีมงานตรวจรายละเอียดต่อ",
    reason_en:
      "The case appears to involve foreign parties or structure details that should be checked by the team.",
  },
  {
    id: "work-permit-or-license-sensitive",
    severity: "warm",
    agent: "complianceReviewer",
    patterns: [
      /work permit/i,
      /ใบอนุญาต/u,
      /permit/i,
      /ต่ออายุ/u,
      /renew/i,
      /visa/i,
      /วีซ่า/u,
    ],
    serviceBuckets: ["visa-license"],
    reason_th:
      "เคสวีซ่า ใบอนุญาต หรือ Work Permit ควรให้ทีมงานดูรายละเอียดต่อเพื่อความถูกต้อง",
    reason_en:
      "Visa, permit, and work-permit cases should be reviewed by the team for accuracy.",
  },
  {
    id: "dissolution-with-open-items",
    severity: "warm",
    agent: "complianceReviewer",
    patterns: [
      /ปิดบริษัท/u,
      /เลิกบริษัท/u,
      /ชำระบัญชี/u,
      /ภาษีค้าง/u,
      /งบค้าง/u,
      /dissolution/i,
      /liquidation/i,
      /close company/i,
      /outstanding/i,
    ],
    serviceBuckets: ["company-dissolution"],
    reason_th:
      "เคสปิดบริษัทที่มีรายการค้างควรให้ทีมงานไล่รายละเอียดต่อโดยตรง",
    reason_en:
      "A dissolution case with open items should be reviewed directly by the team.",
  },
];

function severityRank(value) {
  if (value === "hot") return 3;
  if (value === "warm") return 2;
  return 1;
}

function evaluateHumanHandoff({ text, serviceBucket, memorySummary, unsupportedNationality = "" }) {
  const combined = [
    text,
    memorySummary?.summaryText,
    ...(memorySummary?.recentUserMessages || []),
  ]
    .filter(Boolean)
    .join(" ");

  if (
    serviceBucket === "visa-license" &&
    (
      toText(unsupportedNationality) ||
      toText(memorySummary?.knownFacts?.unsupportedNationality) ||
      UNSUPPORTED_VISA_NATIONALITY_RE.test(combined)
    )
  ) {
    return {
      required: false,
      severity: "normal",
      reason_th: "",
      reason_en: "",
      agent: "",
      matchedRuleIds: [],
    };
  }

  const matches = RULES.filter((rule) => {
    if (rule.serviceBuckets && !rule.serviceBuckets.includes(serviceBucket)) {
      return false;
    }
    return rule.patterns.some((pattern) => pattern.test(combined));
  }).sort((left, right) => severityRank(right.severity) - severityRank(left.severity));

  const top = matches[0];
  if (!top) {
    return {
      required: false,
      severity: "normal",
      reason_th: "",
      reason_en: "",
      agent: "",
      matchedRuleIds: [],
    };
  }

  return {
    required: true,
    severity: top.severity,
    reason_th: top.reason_th,
    reason_en: top.reason_en,
    agent: top.agent,
    matchedRuleIds: matches.map((rule) => rule.id),
  };
}

function mergeRoutingWithHandoff(routing, handoff, language) {
  if (!handoff?.required) return routing;
  return {
    ...routing,
    humanApprovalRequired: true,
    priority: routing.priority === "hot" ? "hot" : handoff.severity === "hot" ? "hot" : "warm",
    primaryAgent: handoff.agent || routing.primaryAgent,
    nextAction:
      language === "en"
        ? "Human review is recommended before sending the next case-specific instruction"
        : "แนะนำให้ทีมงานตรวจรายละเอียดต่อก่อนส่งคำแนะนำเชิงเคสถัดไป",
    handoffReason: language === "en" ? handoff.reason_en : handoff.reason_th,
  };
}

function buildHandoffReplyLine(language, handoff) {
  if (!handoff?.required) return "";

  if (language === "en") {
    if (handoff.severity === "hot") {
      return "This case looks time-sensitive or needs closer review, so a human team member should take the next step directly.";
    }
    return "This case has details that should be reviewed by a human team member before giving a case-specific instruction.";
  }

  if (handoff.severity === "hot") {
    return "เคสนี้มีความเร่งด่วนหรือมีรายละเอียดที่ควรให้ทีมงานดูต่อโดยตรงค่ะ เพื่อให้คำแนะนำรอบถัดไปแม่นขึ้น";
  }
  return "เคสนี้มีรายละเอียดที่ควรให้ทีมงานดูต่อโดยตรงก่อนค่ะ เพื่อให้คำแนะนำเฉพาะเคสได้แม่นขึ้น";
}

module.exports = {
  evaluateHumanHandoff,
  mergeRoutingWithHandoff,
  buildHandoffReplyLine,
};
