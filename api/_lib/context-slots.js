const { toText } = require("./analytics");

const PRICE_RE =
  /\u0e23\u0e32\u0e04\u0e32|\u0e04\u0e48\u0e32\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23|\u0e41\u0e1e\u0e47\u0e01\u0e40\u0e01\u0e08|quote|quotation|price|pricing|fee|cost/i;
const REFERENCE_RE =
  /\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07|\u0e25\u0e34\u0e07\u0e01\u0e4c|link|official|source|government|\u0e40\u0e27\u0e47\u0e1a\u0e44\u0e0b\u0e15\u0e4c\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23/i;
const DEADLINE_RE =
  /\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23|\u0e01\u0e35\u0e48\u0e27\u0e31\u0e19|\u0e01\u0e33\u0e2b\u0e19\u0e14|deadline|due|when/i;
const DOCUMENT_RE =
  /\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23|documents?|checklist|prepare|\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e2d\u0e30\u0e44\u0e23/i;
const NOTICE_RE =
  /\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23|\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d|\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e20\u0e32\u0e29\u0e35|tax audit|revenue department|penalt|fine|back tax/i;
const RENEWAL_RE =
  /\u0e15\u0e48\u0e2d\u0e2d\u0e32\u0e22\u0e38|renew|renewal|expires|expiry|\u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38/i;
const VAT_RE =
  /vat|\u0e20\.?\u0e1e\.?\s?30|\u0e20\u0e1e\s?30|\u0e20\u0e32\u0e29\u0e35\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e40\u0e1e\u0e34\u0e48\u0e21/i;
const PAYROLL_RE =
  /payroll|\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19|\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21|social security/i;
const FOREIGN_SHAREHOLDER_RE =
  /\u0e1c\u0e39\u0e49\u0e16\u0e37\u0e2d\u0e2b\u0e38\u0e49\u0e19\u0e15\u0e48\u0e32\u0e07\u0e0a\u0e32\u0e15\u0e34|foreign shareholder|foreign owner|foreign partner/i;
const UNSUPPORTED_NATIONALITIES = [
  {
    key: "cambodian",
    labelEn: "Cambodian",
    labelTh: "กัมพูชา",
    re: /\u0e40\u0e02\u0e21\u0e23|\u0e01\u0e31\u0e21\u0e1e\u0e39\u0e0a\u0e32|cambodia|cambodian/i,
  },
  {
    key: "lao",
    labelEn: "Lao",
    labelTh: "ลาว",
    re: /\u0e25\u0e32\u0e27|laos|\blao\b/i,
  },
  {
    key: "myanmar",
    labelEn: "Myanmar",
    labelTh: "พม่า",
    re: /\u0e1e\u0e21\u0e48\u0e32|myanmar|burmese/i,
  },
];

function normalise(text) {
  return toText(text).toLowerCase();
}

function detectCompanyStatus(value, fallback = "") {
  if (
    /\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e08\u0e14|not yet registered|new company|start a company|\u0e01\u0e33\u0e25\u0e31\u0e07\u0e08\u0e30\u0e08\u0e14/i.test(
      value
    )
  ) {
    return "new";
  }
  if (
    /\u0e08\u0e14\u0e41\u0e25\u0e49\u0e27|registered already|existing company|\u0e21\u0e35\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e41\u0e25\u0e49\u0e27/i.test(
      value
    )
  ) {
    return "existing";
  }
  return fallback || "";
}

function detectNationality(value, fallback = "") {
  for (const item of UNSUPPORTED_NATIONALITIES) {
    if (item.re.test(value)) return item.labelEn;
  }
  if (/\u0e0d\u0e35\u0e48\u0e1b\u0e38\u0e48\u0e19|japan|japanese/i.test(value)) return "Japanese";
  if (/\u0e08\u0e35\u0e19|china|chinese/i.test(value)) return "Chinese";
  if (/\u0e2d\u0e40\u0e21\u0e23\u0e34\u0e01\u0e32|usa|american/i.test(value)) return "American";
  if (/\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29|british|uk/i.test(value)) return "British";
  if (/\u0e15\u0e48\u0e32\u0e07\u0e0a\u0e32\u0e15\u0e34|foreigner|foreign/i.test(value)) return "Foreign national";
  return fallback || "";
}

function detectUnsupportedNationality(value, fallback = "") {
  for (const item of UNSUPPORTED_NATIONALITIES) {
    if (item.re.test(value)) {
      return {
        key: item.key,
        labelEn: item.labelEn,
        labelTh: item.labelTh,
      };
    }
  }

  if (fallback) {
    const normalizedFallback = toText(fallback).toLowerCase();
    const matchedFallback = UNSUPPORTED_NATIONALITIES.find(
      (item) =>
        item.key === normalizedFallback ||
        item.labelEn.toLowerCase() === normalizedFallback ||
        item.labelTh === fallback
    );

    if (matchedFallback) {
      return {
        key: matchedFallback.key,
        labelEn: matchedFallback.labelEn,
        labelTh: matchedFallback.labelTh,
      };
    }
  }

  return null;
}

function detectBusinessType(value, fallback = "") {
  if (/\u0e23\u0e49\u0e32\u0e19\u0e2d\u0e32\u0e2b\u0e32\u0e23|restaurant/i.test(value)) return "restaurant";
  if (/\u0e04\u0e25\u0e34\u0e19\u0e34\u0e01|clinic/i.test(value)) return "clinic";
  if (/e-?commerce|\u0e2d\u0e2d\u0e19\u0e44\u0e25\u0e19\u0e4c|online store|shopee|lazada/i.test(value)) return "e-commerce";
  if (/\u0e42\u0e23\u0e07\u0e07\u0e32\u0e19|factory|manufactur/i.test(value)) return "manufacturing";
  if (/\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23|service company|agency/i.test(value)) return "service business";
  return fallback || "";
}

function detectDueWindow(value) {
  if (/today|\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49/i.test(value)) return "today";
  if (/tomorrow|\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49/i.test(value)) return "tomorrow";
  if (/this week|\u0e20\u0e32\u0e22\u0e43\u0e19\u0e2a\u0e31\u0e1b\u0e14\u0e32\u0e2b\u0e4c|\u0e2d\u0e32\u0e17\u0e34\u0e15\u0e22\u0e4c\u0e19\u0e35\u0e49/i.test(value)) {
    return "this-week";
  }
  if (/urgent|asap|\u0e14\u0e48\u0e27\u0e19/i.test(value)) return "urgent";
  return "";
}

function detectDocumentState(value) {
  if (
    /attach|attached|have document|have docs|\u0e21\u0e35\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23|\u0e21\u0e35\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d|\u0e41\u0e19\u0e1a/i.test(
      value
    )
  ) {
    return "has-documents";
  }
  if (/no document|no docs|\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23/i.test(value)) {
    return "missing-documents";
  }
  return "";
}

function detectApplicantRole(value) {
  if (/director|\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32\u0e23/i.test(value)) return "director";
  if (/employee|\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19/i.test(value)) return "employee";
  return "";
}

function detectRequestedChange(value) {
  if (/director|\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32\u0e23/i.test(value)) return "director-change";
  if (/address|\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48/i.test(value)) return "address-change";
  if (/capital|\u0e17\u0e38\u0e19/i.test(value)) return "capital-change";
  if (/objective|\u0e27\u0e31\u0e15\u0e16\u0e38\u0e1b\u0e23\u0e30\u0e2a\u0e07\u0e04\u0e4c/i.test(value)) return "objective-change";
  return "";
}

function detectWorkStage(value) {
  if (RENEWAL_RE.test(value)) return "renewal";
  if (/amend|change|\u0e41\u0e01\u0e49\u0e44\u0e02/i.test(value)) return "amendment";
  if (/new|first time|\u0e43\u0e2b\u0e21\u0e48/i.test(value)) return "new";
  return "";
}

function detectFormCode(value) {
  if (/p\.?p\.?30|pp30|\u0e20\.?\u0e1e\.?\s?30|\u0e20\u0e1e\s?30/i.test(value)) return "pp30";
  if (/p\.?n\.?d\.?\s?53|pnd\s?53|\u0e20\.?\u0e07\.?\u0e14\.?\s?53|\u0e20\u0e07\u0e14\s?53/i.test(value)) return "pnd53";
  if (/p\.?n\.?d\.?\s?3|pnd\s?3|\u0e20\.?\u0e07\.?\u0e14\.?\s?3|\u0e20\u0e07\u0e14\s?3/i.test(value)) return "pnd3";
  if (/p\.?n\.?d\.?\s?1|pnd\s?1|\u0e20\.?\u0e07\.?\u0e14\.?\s?1|\u0e20\u0e07\u0e14\s?1/i.test(value)) return "pnd1";
  if (/p\.?n\.?d\.?\s?50|pnd\s?50|\u0e20\.?\u0e07\.?\u0e14\.?\s?50|\u0e20\u0e07\u0e14\s?50/i.test(value)) return "pnd50";
  if (/p\.?n\.?d\.?\s?51|pnd\s?51|\u0e20\.?\u0e07\.?\u0e14\.?\s?51|\u0e20\u0e07\u0e14\s?51/i.test(value)) return "pnd51";
  if (/boj\s?5|\u0e1a\u0e2d\u0e08\s?5/i.test(value)) return "boj5";
  return "";
}

function extractContextSlots({
  text,
  memorySummary = null,
  serviceBucket = "",
  intentKey = "",
}) {
  const value = normalise(text);
  const facts = memorySummary?.knownFacts || {};

  const companyStatus = detectCompanyStatus(value, facts.companyStatus);
  const nationality = detectNationality(value, facts.nationality);
  const unsupportedNationality = detectUnsupportedNationality(value, facts.unsupportedNationality);
  const businessType = detectBusinessType(value, facts.businessType);
  const mentionsVat = Boolean(facts.mentionsVat) || VAT_RE.test(value);
  const mentionsPayroll = Boolean(facts.mentionsPayroll) || PAYROLL_RE.test(value);
  const foreignShareholder =
    Boolean(facts.foreignShareholder) || FOREIGN_SHAREHOLDER_RE.test(value);
  const hasOfficialNotice = NOTICE_RE.test(value);
  const asksPricing = PRICE_RE.test(value);
  const asksReference = REFERENCE_RE.test(value);
  const asksDeadline = DEADLINE_RE.test(value);
  const asksDocuments = DOCUMENT_RE.test(value);
  const asksRenewal = RENEWAL_RE.test(value);

  return {
    companyStatus,
    nationality,
    unsupportedNationality: unsupportedNationality?.key || "",
    unsupportedNationalityLabelEn: unsupportedNationality?.labelEn || "",
    unsupportedNationalityLabelTh: unsupportedNationality?.labelTh || "",
    businessType,
    mentionsVat,
    mentionsPayroll,
    foreignShareholder,
    hasOfficialNotice,
    asksPricing,
    asksReference,
    asksDeadline,
    asksDocuments,
    asksRenewal,
    dueWindow: detectDueWindow(value),
    documentState: detectDocumentState(value),
    applicantRole: detectApplicantRole(value),
    requestedChange: detectRequestedChange(value),
    workStage: detectWorkStage(value),
    formCode: detectFormCode(value),
    serviceBucket,
    intentKey,
  };
}

module.exports = {
  extractContextSlots,
  PRICE_RE,
  REFERENCE_RE,
  DEADLINE_RE,
  DOCUMENT_RE,
  NOTICE_RE,
  RENEWAL_RE,
  VAT_RE,
  PAYROLL_RE,
  FOREIGN_SHAREHOLDER_RE,
};
