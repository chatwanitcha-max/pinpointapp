const { toText } = require("./analytics");
const { extractContextSlots } = require("./context-slots");

function buildRelevantMemorySummary(memorySummary, slots, serviceBucket, intentKey) {
  const partsTh = [];
  const partsEn = [];

  const shouldMentionCompanyStatus =
    serviceBucket === "corporate-dbd" ||
    serviceBucket === "company-dissolution" ||
    slots.hasOfficialNotice ||
    slots.asksDeadline ||
    slots.formCode;

  const shouldMentionBusinessType =
    intentKey === "pricing" ||
    slots.asksPricing ||
    (serviceBucket === "accounting-tax" && slots.mentionsVat && !slots.hasOfficialNotice);

  const shouldMentionNationality =
    serviceBucket === "visa-license" ||
    slots.asksRenewal;

  const shouldMentionVat =
    serviceBucket === "accounting-tax" &&
    (slots.mentionsVat || intentKey === "pricing") &&
    !slots.hasOfficialNotice;

  if (shouldMentionCompanyStatus && slots.companyStatus === "new") {
    partsTh.push(
      "\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e22\u0e31\u0e07\u0e14\u0e39\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e04\u0e2a\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e43\u0e2b\u0e21\u0e48\u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19"
    );
    partsEn.push("this still looks like a new-company or not-yet-registered case");
  }

  if (shouldMentionCompanyStatus && slots.companyStatus === "existing") {
    partsTh.push(
      "\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e14\u0e39\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e04\u0e2a\u0e02\u0e2d\u0e07\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e17\u0e35\u0e48\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e41\u0e25\u0e49\u0e27"
    );
    partsEn.push("this looks like an existing registered company");
  }

  if (shouldMentionBusinessType && slots.businessType) {
    partsTh.push(
      `\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e18\u0e38\u0e23\u0e01\u0e34\u0e08\u0e17\u0e35\u0e48\u0e1e\u0e2d\u0e40\u0e2b\u0e47\u0e19\u0e08\u0e32\u0e01\u0e1a\u0e17\u0e2a\u0e19\u0e17\u0e19\u0e32: ${slots.businessType}`
    );
    partsEn.push(`the business type seen from earlier context appears to be ${slots.businessType}`);
  }

  if (serviceBucket === "corporate-dbd" && slots.foreignShareholder) {
    partsTh.push(
      "\u0e40\u0e04\u0e2a\u0e19\u0e35\u0e49\u0e21\u0e35\u0e1c\u0e39\u0e49\u0e16\u0e37\u0e2d\u0e2b\u0e38\u0e49\u0e19\u0e15\u0e48\u0e32\u0e07\u0e0a\u0e32\u0e15\u0e34\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e02\u0e49\u0e2d\u0e07"
    );
    partsEn.push("the case involves foreign shareholders");
  }

  if (shouldMentionNationality && slots.nationality) {
    partsTh.push(`\u0e40\u0e04\u0e2a\u0e19\u0e35\u0e49\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e02\u0e49\u0e2d\u0e07\u0e01\u0e31\u0e1a\u0e2a\u0e31\u0e0d\u0e0a\u0e32\u0e15\u0e34 ${slots.nationality}`);
    partsEn.push(`the case involves ${slots.nationality}`);
  }

  if (shouldMentionVat && slots.mentionsVat) {
    partsTh.push("\u0e21\u0e35\u0e1b\u0e23\u0e30\u0e40\u0e14\u0e47\u0e19 VAT \u0e2d\u0e22\u0e39\u0e48\u0e43\u0e19\u0e40\u0e04\u0e2a\u0e19\u0e35\u0e49");
    partsEn.push("VAT is already part of this case");
  }

  if (serviceBucket === "accounting-tax" && slots.mentionsPayroll) {
    partsTh.push(
      "\u0e21\u0e35\u0e1b\u0e23\u0e30\u0e40\u0e14\u0e47\u0e19\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e2b\u0e23\u0e37\u0e2d\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21\u0e2d\u0e22\u0e39\u0e48\u0e14\u0e49\u0e27\u0e22"
    );
    partsEn.push("payroll or social security is also involved");
  }

  return {
    th: partsTh.join(" "),
    en: partsEn.join(". "),
    relevantCount: Math.max(partsTh.length, partsEn.length),
  };
}

function determineResponseMode(serviceBucket, intentKey, slots) {
  if (
    slots.unsupportedNationality &&
    (serviceBucket === "visa-license" || slots.asksRenewal)
  ) {
    return "unsupported-nationality";
  }
  if (slots.asksReference) return "official-reference";
  if (slots.hasOfficialNotice) return "official-notice";
  if (slots.asksRenewal) return "renewal";
  if (slots.asksPricing || intentKey === "pricing") return "pricing";
  if (slots.asksDeadline || slots.formCode) return "deadline";
  if (slots.asksDocuments) return "documents";
  if (slots.mentionsPayroll) return "payroll";
  if (serviceBucket === "accounting-tax") return "accounting";
  if (serviceBucket === "corporate-dbd") return "corporate-dbd";
  if (serviceBucket === "visa-license") return "visa-license";
  if (serviceBucket === "company-dissolution") return "company-dissolution";
  return "general";
}

function buildNextQuestionOverride(language, serviceBucket, responseMode, slots) {
  if (responseMode === "unsupported-nationality") {
    if (language === "en") {
      return `We should let you know clearly that the team does not currently take visa or work-permit cases for ${slots.unsupportedNationalityLabelEn || "this nationality"}. If this is a separate accounting, tax, company-registration, or DBD matter, we can still help review that scope.`;
    }
    return `ขอแจ้งให้ทราบตรงไปตรงมานะคะ ตอนนี้ทีมไม่ได้รับเคสวีซ่าและ Work Permit สำหรับสัญชาติ${slots.unsupportedNationalityLabelTh || "นี้"}แล้วค่ะ หากเป็นงานบัญชี ภาษี จดทะเบียนบริษัท หรือ DBD แยกอีกเคส ทีมยังช่วยดูขอบเขตส่วนนั้นได้ค่ะ`;
  }

  if (responseMode === "official-reference") {
    return language === "en"
      ? "Please tell us which official source you want, such as DBD, Revenue Department, work permit, or licensing."
      : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e1a\u0e2d\u0e01\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30\u0e27\u0e48\u0e32\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e25\u0e34\u0e07\u0e01\u0e4c\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23\u0e02\u0e2d\u0e07\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e43\u0e14 \u0e40\u0e0a\u0e48\u0e19 DBD \u0e01\u0e23\u0e21\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23 Work Permit \u0e2b\u0e23\u0e37\u0e2d\u0e43\u0e1a\u0e2d\u0e19\u0e38\u0e0d\u0e32\u0e15\u0e18\u0e38\u0e23\u0e01\u0e34\u0e08";
  }

  if (responseMode === "official-notice") {
    return language === "en"
      ? "Please send the issue stated in the letter, the deadline, and the document set you already have so we can map the reply properly."
      : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e2a\u0e23\u0e38\u0e1b\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30\u0e27\u0e48\u0e32\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e23\u0e30\u0e1a\u0e38\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e2d\u0e30\u0e44\u0e23 \u0e27\u0e31\u0e19\u0e04\u0e23\u0e1a\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23 \u0e41\u0e25\u0e30\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e21\u0e35\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e0a\u0e38\u0e14\u0e43\u0e14\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27\u0e1a\u0e49\u0e32\u0e07";
  }

  if (responseMode === "renewal") {
    return language === "en"
      ? "Please share the expiry date, nationality, and whether the applicant is a director or employee."
      : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e27\u0e31\u0e19\u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38 \u0e2a\u0e31\u0e0d\u0e0a\u0e32\u0e15\u0e34 \u0e41\u0e25\u0e30\u0e27\u0e48\u0e32\u0e40\u0e1b\u0e47\u0e19\u0e1c\u0e39\u0e49\u0e22\u0e37\u0e48\u0e19\u0e43\u0e19\u0e10\u0e32\u0e19\u0e30\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32\u0e23\u0e2b\u0e23\u0e37\u0e2d\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30";
  }

  if (responseMode === "deadline") {
    if (slots.formCode === "pp30") {
      return language === "en"
        ? "To confirm the deadline correctly, please tell us which tax month you are referring to and whether VAT is already registered."
        : "\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e0a\u0e47\u0e01\u0e01\u0e33\u0e2b\u0e19\u0e14 \u0e20.\u0e1e.30 \u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07 \u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e20\u0e32\u0e29\u0e35\u0e17\u0e35\u0e48\u0e01\u0e33\u0e25\u0e31\u0e07\u0e16\u0e32\u0e21 \u0e41\u0e25\u0e30\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e08\u0e14 VAT \u0e41\u0e25\u0e49\u0e27\u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e31\u0e07";
    }
    if (slots.formCode === "pnd53" || slots.formCode === "pnd3" || slots.formCode === "pnd1") {
      return language === "en"
        ? "Please tell us which payment month the withholding tax relates to and whether filing is online or paper."
        : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e08\u0e48\u0e32\u0e22\u0e40\u0e07\u0e34\u0e19 \u0e41\u0e25\u0e30\u0e27\u0e48\u0e32\u0e08\u0e30\u0e22\u0e37\u0e48\u0e19\u0e1c\u0e48\u0e32\u0e19\u0e2d\u0e2d\u0e19\u0e44\u0e25\u0e19\u0e4c\u0e2b\u0e23\u0e37\u0e2d\u0e01\u0e23\u0e30\u0e14\u0e32\u0e29 \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e17\u0e35\u0e21\u0e08\u0e30\u0e0a\u0e48\u0e27\u0e22\u0e19\u0e31\u0e1a deadline \u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07";
    }
    if (slots.formCode === "pnd50" || slots.formCode === "pnd51") {
      return language === "en"
        ? "Please share the accounting period end date so we can map the filing deadline correctly."
        : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e27\u0e31\u0e19\u0e2a\u0e34\u0e49\u0e19\u0e23\u0e2d\u0e1a\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e02\u0e2d\u0e07\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e14\u0e49\u0e27\u0e22\u0e04\u0e48\u0e30 \u0e17\u0e35\u0e21\u0e08\u0e30\u0e0a\u0e48\u0e27\u0e22\u0e19\u0e31\u0e1a\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e22\u0e37\u0e48\u0e19\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07";
    }
    if (slots.formCode === "boj5") {
      return language === "en"
        ? "Please share the accounting period end date and whether the financial statements have already been prepared."
        : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e27\u0e31\u0e19\u0e2a\u0e34\u0e49\u0e19\u0e23\u0e2d\u0e1a\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u0e41\u0e25\u0e30\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e08\u0e31\u0e14\u0e17\u0e33\u0e07\u0e1a\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19\u0e44\u0e1b\u0e16\u0e36\u0e07\u0e44\u0e2b\u0e19\u0e41\u0e25\u0e49\u0e27 \u0e17\u0e35\u0e21\u0e08\u0e30\u0e0a\u0e48\u0e27\u0e22\u0e44\u0e25\u0e48 timeline \u0e43\u0e2b\u0e49\u0e15\u0e48\u0e2d\u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07";
    }
  }

  if (responseMode === "documents") {
    if (serviceBucket === "accounting-tax" && slots.mentionsVat) {
      return language === "en"
        ? "Please tell us what VAT documents you already have, such as tax invoices, purchase records, sales records, or the latest filing set."
        : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30\u0e27\u0e48\u0e32\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e21\u0e35\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23 VAT \u0e0a\u0e38\u0e14\u0e43\u0e14\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27\u0e1a\u0e49\u0e32\u0e07 \u0e40\u0e0a\u0e48\u0e19 \u0e43\u0e1a\u0e01\u0e33\u0e01\u0e31\u0e1a\u0e20\u0e32\u0e29\u0e35 \u0e23\u0e32\u0e22\u0e07\u0e32\u0e19\u0e20\u0e32\u0e29\u0e35\u0e0b\u0e37\u0e49\u0e2d-\u0e02\u0e32\u0e22 \u0e2b\u0e23\u0e37\u0e2d\u0e0a\u0e38\u0e14\u0e22\u0e37\u0e48\u0e19\u0e20\u0e32\u0e29\u0e35\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14";
    }
    if (serviceBucket === "corporate-dbd") {
      return language === "en"
        ? "Please tell us which documents are already prepared, such as shareholder list, director IDs, company affidavit, or office address proof."
        : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30\u0e27\u0e48\u0e32\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e21\u0e35\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e0a\u0e38\u0e14\u0e43\u0e14\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e44\u0e27\u0e49\u0e41\u0e25\u0e49\u0e27\u0e1a\u0e49\u0e32\u0e07 \u0e40\u0e0a\u0e48\u0e19 \u0e23\u0e32\u0e22\u0e0a\u0e37\u0e48\u0e2d\u0e1c\u0e39\u0e49\u0e16\u0e37\u0e2d\u0e2b\u0e38\u0e49\u0e19 \u0e1a\u0e31\u0e15\u0e23\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32\u0e23 \u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07 \u0e2b\u0e23\u0e37\u0e2d\u0e2b\u0e25\u0e31\u0e01\u0e10\u0e32\u0e19\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19";
    }
  }

  if (responseMode === "pricing" && serviceBucket === "accounting-tax") {
    return language === "en"
      ? "Please tell us your business type, whether VAT is active, and the approximate monthly document volume so we can estimate the scope properly."
      : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e18\u0e38\u0e23\u0e01\u0e34\u0e08 \u0e21\u0e35 VAT \u0e41\u0e25\u0e49\u0e27\u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e31\u0e07 \u0e41\u0e25\u0e30\u0e1b\u0e23\u0e34\u0e21\u0e32\u0e13\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e15\u0e48\u0e2d\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e04\u0e23\u0e48\u0e32\u0e27 \u0e46 \u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30 \u0e17\u0e35\u0e21\u0e08\u0e30\u0e0a\u0e48\u0e27\u0e22\u0e1b\u0e23\u0e30\u0e40\u0e21\u0e34\u0e19 scope \u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e02\u0e36\u0e49\u0e19";
  }

  if (serviceBucket === "corporate-dbd" && slots.requestedChange === "director-change") {
    return language === "en"
      ? "Please tell us whether this is a resignation, appointment, or both, and whether signing authority also changes."
      : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30\u0e27\u0e48\u0e32\u0e40\u0e1b\u0e47\u0e19\u0e01\u0e23\u0e13\u0e35\u0e25\u0e32\u0e2d\u0e2d\u0e01 \u0e41\u0e15\u0e48\u0e07\u0e15\u0e31\u0e49\u0e07\u0e43\u0e2b\u0e21\u0e48 \u0e2b\u0e23\u0e37\u0e2d\u0e21\u0e35\u0e17\u0e31\u0e49\u0e07\u0e2a\u0e2d\u0e07\u0e2a\u0e48\u0e27\u0e19 \u0e41\u0e25\u0e30\u0e2d\u0e33\u0e19\u0e32\u0e08\u0e25\u0e07\u0e19\u0e32\u0e21\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e14\u0e49\u0e27\u0e22\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48";
  }

  if (serviceBucket === "corporate-dbd" && slots.requestedChange === "address-change") {
    return language === "en"
      ? "Please share the current address, the new address, and whether the company is already fully registered."
      : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e2a\u0e48\u0e07\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e40\u0e14\u0e34\u0e21 \u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e43\u0e2b\u0e21\u0e48 \u0e41\u0e25\u0e30\u0e41\u0e08\u0e49\u0e07\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30\u0e27\u0e48\u0e32\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27\u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e31\u0e07";
  }

  if (serviceBucket === "visa-license" && responseMode === "visa-license") {
    return language === "en"
      ? "Please tell us the nationality involved, whether the applicant is a director or employee, and whether this is a new, renewal, or amendment case."
      : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e41\u0e08\u0e49\u0e07\u0e2a\u0e31\u0e0d\u0e0a\u0e32\u0e15\u0e34 \u0e1c\u0e39\u0e49\u0e22\u0e37\u0e48\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32\u0e23\u0e2b\u0e23\u0e37\u0e2d\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19 \u0e41\u0e25\u0e30\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e04\u0e2a\u0e43\u0e2b\u0e21\u0e48 \u0e15\u0e48\u0e2d\u0e2d\u0e32\u0e22\u0e38 \u0e2b\u0e23\u0e37\u0e2d\u0e41\u0e01\u0e49\u0e44\u0e02\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25";
  }

  if (serviceBucket === "company-dissolution") {
    return language === "en"
      ? "Please tell us whether the company has already stopped operating and whether there are any open accounting or tax items."
      : "\u0e23\u0e1a\u0e01\u0e27\u0e19\u0e1a\u0e2d\u0e01\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30\u0e27\u0e48\u0e32\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e2b\u0e22\u0e38\u0e14\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27\u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e31\u0e07 \u0e41\u0e25\u0e30\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e2b\u0e23\u0e37\u0e2d\u0e20\u0e32\u0e29\u0e35\u0e04\u0e49\u0e32\u0e07\u0e2d\u0e22\u0e39\u0e48\u0e1a\u0e49\u0e32\u0e07\u0e44\u0e2b\u0e21";
  }

  return null;
}

function buildNeuralBrain({
  text,
  memorySummary,
  intent,
  serviceBucket,
  intentDetail,
  handoff,
}) {
  const slots = extractContextSlots({
    text,
    memorySummary,
    serviceBucket,
    intentKey: intent?.key || "",
  });
  const relevantSummary = buildRelevantMemorySummary(
    memorySummary,
    slots,
    serviceBucket,
    intent?.key || ""
  );
  const responseMode = determineResponseMode(serviceBucket, intent?.key || "", slots);
  const shouldEchoMemory =
    Number(memorySummary?.turns || 0) > 0 &&
    relevantSummary.relevantCount > 0 &&
    !["official-reference", "official-notice", "deadline"].includes(responseMode);

  return {
    slots,
    signals: {
      hasUnsupportedNationality: Boolean(slots.unsupportedNationality),
      asksPricing: slots.asksPricing,
      asksReference: slots.asksReference,
      asksDueDate: slots.asksDeadline,
      asksDocuments: slots.asksDocuments,
      hasOfficialNotice: slots.hasOfficialNotice,
      asksRenewal: slots.asksRenewal,
      asksPayroll: slots.mentionsPayroll,
      mentionsVat: slots.mentionsVat,
      foreignShareholder: slots.foreignShareholder,
      asksDBDFiling: slots.formCode === "boj5",
    },
    responseMode,
    shouldEchoMemory,
    relevantSummary,
    nextQuestionOverride: buildNextQuestionOverride("th", serviceBucket, responseMode, slots),
    nextQuestionOverrideEn: buildNextQuestionOverride("en", serviceBucket, responseMode, slots),
    intentDetailId: toText(intentDetail?.id),
    handoffRequired: Boolean(handoff?.required),
  };
}

module.exports = {
  buildNeuralBrain,
};
