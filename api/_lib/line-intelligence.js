const { toText } = require("./analytics");

const THAI_RE = /[\u0E00-\u0E7F]/u;
const ENGLISH_RE = /[A-Za-z]/;

const OFFICIAL_LINKS = {
  dbd: "https://www.dbd.go.th",
  dbdBizRegist: "https://edbr.dbd.go.th/",
  dbdEService: "https://ebiz.dbd.go.th/eservice-web/",
  revenue: "https://www.rd.go.th",
  rdEFiling: "https://efiling.rd.go.th",
  sso: "https://www.sso.go.th",
  doe: "https://www.doe.go.th",
  eworkpermit: "https://eworkpermit.doe.go.th/",
  bizportal: "https://bizportal.go.th",
};

const INTENTS = [
  {
    key: "pricing",
    serviceBucket: "pricing",
    patterns: [
      /ราคา/u,
      /ค่าบริการ/u,
      /แพ็กเกจ/u,
      /quote/i,
      /quotation/i,
      /price/i,
      /pricing/i,
      /fee/i,
      /cost/i,
    ],
  },
  {
    key: "documents",
    serviceBucket: "general",
    patterns: [
      /เอกสาร/u,
      /ต้องเตรียม/u,
      /checklist/i,
      /document/i,
      /prepare/i,
    ],
  },
  {
    key: "service-area",
    serviceBucket: "general",
    patterns: [
      /พื้นที่/u,
      /เขต/u,
      /จังหวัด/u,
      /พื้นที่บริการ/u,
      /area/i,
      /location/i,
      /bangkok/i,
    ],
  },
  {
    key: "official-reference",
    serviceBucket: "general",
    patterns: [
      /อ้างอิง/u,
      /ลิงก์/u,
      /link/i,
      /official/i,
      /source/i,
      /government/i,
      /หน่วยงาน/u,
    ],
  },
  {
    key: "accounting-tax",
    serviceBucket: "accounting-tax",
    patterns: [
      /บัญชี/u,
      /ภาษี/u,
      /ภ\.\s?พ\.\s?30/u,
      /ภ\.\s?ง\.\s?ด/u,
      /vat/i,
      /bookkeeping/i,
      /accounting/i,
      /tax/i,
      /payroll/i,
      /social security/i,
      /สรรพากร/u,
      /ตรวจสอบภาษี/u,
      /ภาษีย้อนหลัง/u,
      /tax audit/i,
      /revenue department/i,
      /back tax/i,
      /penalt/i,
      /fine/i,
    ],
  },
  {
    key: "corporate-dbd",
    serviceBucket: "corporate-dbd",
    patterns: [
      /จดบริษัท/u,
      /เปิดบริษัท/u,
      /จดทะเบียน/u,
      /จัดตั้งบริษัท/u,
      /เริ่มบริษัท/u,
      /เปลี่ยนแปลง/u,
      /กรรมการ/u,
      /อำนาจลงนาม/u,
      /ที่อยู่บริษัท/u,
      /หนังสือรับรอง/u,
      /บอจ/u,
      /ผู้ถือหุ้น/u,
      /dbd/i,
      /company registration/i,
      /register company/i,
      /incorporat/i,
      /change director/i,
      /change address/i,
    ],
  },
  {
    key: "visa-license",
    serviceBucket: "visa-license",
    patterns: [
      /วีซ่า/u,
      /work permit/i,
      /ใบอนุญาต/u,
      /license/i,
      /permit/i,
      /e-workpermit/i,
      /biz portal/i,
      /foreign employee/i,
      /boi/i,
    ],
  },
  {
    key: "company-dissolution",
    serviceBucket: "company-dissolution",
    patterns: [
      /ปิดบริษัท/u,
      /เลิกบริษัท/u,
      /ชำระบัญชี/u,
      /dissolution/i,
      /liquidat/i,
      /close company/i,
    ],
  },
];

const CORE_SERVICE_INTENT_KEYS = new Set([
  "accounting-tax",
  "corporate-dbd",
  "visa-license",
  "company-dissolution",
]);

function normaliseText(text) {
  return toText(text).toLowerCase();
}

function containsAny(value, patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function detectLineLanguage(text) {
  const value = toText(text);
  if (!value) return "th";
  if (THAI_RE.test(value)) return "th";
  if (ENGLISH_RE.test(value)) return "en";
  return "th";
}

function detectLineIntent(text) {
  const value = toText(text);
  for (const intent of INTENTS) {
    if (containsAny(value, intent.patterns)) {
      return {
        key: intent.key,
        serviceBucket: intent.serviceBucket,
      };
    }
  }

  return {
    key: "general",
    serviceBucket: "general",
  };
}

function detectSpecificServiceBucket(text) {
  const value = toText(text);
  for (const intent of INTENTS) {
    if (!CORE_SERVICE_INTENT_KEYS.has(intent.key)) continue;
    if (containsAny(value, intent.patterns)) return intent.serviceBucket;
  }
  return "";
}

function resolveServiceBucket(intent, memorySummary, explicitServiceBucket = "", text = "") {
  const explicit = toText(explicitServiceBucket);
  if (explicit && explicit !== "general" && explicit !== "pricing") return explicit;

  const fromText = detectSpecificServiceBucket(text);
  if (fromText) return fromText;

  const fromMemory = toText(memorySummary?.lastServiceBucket);
  if (fromMemory && fromMemory !== "general") return fromMemory;

  const fromIntent = toText(intent?.serviceBucket);
  if (fromIntent && fromIntent !== "pricing") return fromIntent;
  return "general";
}

function detectAccountingIntentDetail(text, serviceBucket = "general", intentKey = "general") {
  const value = normaliseText(text);
  if (!value) return null;

  if (serviceBucket === "corporate-dbd") {
    if (/จดทะเบียนบริษัทใหม่|จดบริษัทใหม่|เปิดบริษัทใหม่|จัดตั้งบริษัทใหม่|เปิดบริษัท|จดบริษัท|company registration|register company|new company|start company|incorporat/i.test(value)) {
      return {
        id: "new-registration",
        subIntentKey: "new-registration",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.dbdBizRegist],
      };
    }
    if (/กรรมการ|change director|director change|อำนาจลงนาม/i.test(value)) {
      return {
        id: "director-change",
        subIntentKey: "director-change",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.dbdEService],
      };
    }
    if (/ที่อยู่|change address|address change/i.test(value)) {
      return {
        id: "address-change",
        subIntentKey: "address-change",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.dbdEService],
      };
    }
  }

  if (serviceBucket === "accounting-tax") {
    if (/สรรพากร|หนังสือ|ตรวจสอบภาษี|ภาษีย้อนหลัง|tax audit|revenue department|official notice|back tax|penalt|fine/i.test(value)) {
      return {
        id: "tax-notice",
        subIntentKey: "tax-notice",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.revenue],
      };
    }
    if (/ภ\.\s?พ\.\s?30|pp\.?30|vat return/i.test(value)) {
      return {
        id: "pp30",
        subIntentKey: "vat-filing",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.revenue, OFFICIAL_LINKS.rdEFiling],
      };
    }
    if (/ภ\.\s?ง\.\s?ด\.?1|pnd\.?1|ภ\.\s?ง\.\s?ด\.?3|pnd\.?3|ภ\.\s?ง\.\s?ด\.?53|pnd\.?53/i.test(value)) {
      return {
        id: "withholding-tax",
        subIntentKey: "withholding-tax",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.revenue, OFFICIAL_LINKS.rdEFiling],
      };
    }
    if (/ภ\.\s?ง\.\s?ด\.?50|pnd\.?50|ภ\.\s?ง\.\s?ด\.?51|pnd\.?51/i.test(value)) {
      return {
        id: "annual-income-tax",
        subIntentKey: "annual-income-tax",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.revenue, OFFICIAL_LINKS.rdEFiling],
      };
    }
    if (/ประกันสังคม|social security|sso|เงินเดือน|payroll/i.test(value)) {
      return {
        id: "payroll-social-security",
        subIntentKey: "payroll-social-security",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.sso],
      };
    }
  }

  if (serviceBucket === "visa-license") {
    if (/ร้านอาหาร|restaurant|cafe|café|food shop|food business/i.test(value)) {
      return {
        id: "restaurant-license",
        subIntentKey: "restaurant-license",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.bizportal],
      };
    }
    if (/ต่ออายุ|renew|renewal|หมดอายุ|expiry|expires/i.test(value)) {
      return {
        id: "work-permit-renewal",
        subIntentKey: "work-permit-renewal",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.eworkpermit, OFFICIAL_LINKS.doe],
      };
    }
    if (/license|ใบอนุญาต|biz portal/i.test(value)) {
      return {
        id: "business-license",
        subIntentKey: "business-license",
        serviceBucket,
        intentKey,
        faqIds: [],
        officialSourceUrls: [OFFICIAL_LINKS.bizportal],
      };
    }
  }

  return null;
}

function detectCaseFlavor(text, serviceBucket) {
  const value = normaliseText(text);

  if (serviceBucket === "accounting-tax") {
    if (/สรรพากร|หนังสือ|ตรวจสอบภาษี|ภาษีย้อนหลัง|tax audit|revenue department|official notice|back tax|penalt|fine/i.test(value)) return "tax-notice";
    if (/ภ\.\s?พ\.\s?30|pp\.?30|vat return|vat/i.test(value)) return "vat";
    if (/ภ\.\s?ง\.\s?ด\.?1|pnd\.?1|ภ\.\s?ง\.\s?ด\.?3|pnd\.?3|ภ\.\s?ง\.\s?ด\.?53|pnd\.?53/i.test(value)) return "withholding-tax";
    if (/เงินเดือน|payroll|ประกันสังคม|social security/i.test(value)) return "payroll";
  }

  if (serviceBucket === "corporate-dbd") {
    if (/จดทะเบียนบริษัทใหม่|จดบริษัทใหม่|เปิดบริษัทใหม่|จัดตั้งบริษัทใหม่|เปิดบริษัท|จดบริษัท|company registration|register company|new company|start company|incorporat/i.test(value)) return "new-registration";
    if (/กรรมการ|change director|director change|อำนาจลงนาม/i.test(value)) return "director-change";
    if (/ที่อยู่|change address|address change/i.test(value)) return "address-change";
  }

  if (serviceBucket === "visa-license") {
    if (/ร้านอาหาร|restaurant|cafe|café|food shop|food business/i.test(value)) return "restaurant-license";
    if (/ต่ออายุ|renew|renewal|หมดอายุ|expiry|expires/i.test(value)) return "renewal";
    if (/license|ใบอนุญาต|biz portal/i.test(value)) return "business-license";
    return "visa-permit";
  }

  if (serviceBucket === "company-dissolution") {
    return "dissolution";
  }

  return "general";
}

function detectUnsupportedNationality(text, memorySummary) {
  const value = `${toText(text)} ${toText(memorySummary?.summaryText)}`;

  if (/กัมพูชา|เขมร|cambodia|cambodian/i.test(value)) {
    return {
      key: "cambodia",
      labelTh: "กัมพูชา/เขมร",
      labelEn: "Cambodian",
    };
  }

  if (/ลาว|\blao\b|laos/i.test(value)) {
    return {
      key: "laos",
      labelTh: "ลาว",
      labelEn: "Lao",
    };
  }

  if (/พม่า|เมียนมา|myanmar|burmese/i.test(value)) {
    return {
      key: "myanmar",
      labelTh: "พม่า/เมียนมา",
      labelEn: "Myanmar",
    };
  }

  return null;
}

function isAmbiguousFollowUp(text) {
  const value = toText(text).trim();
  if (!value) return false;

  return (
    value.length <= 70 &&
    /ตรงนี้|แบบนี้|กรณีนี้|ยังไง|ช่วยดู|ช่วยหน่อย|ต้องทำยังไง|ต้องทำอย่างไร|ต่อยังไง|หมายถึงอะไร|what do you mean|what should i do|how do i do this|help me with this/i.test(value)
  );
}

function buildOfficialReferenceReply(language, text, serviceBucket, knowledgeContext) {
  const value = normaliseText(text);
  const officialSource = toText(
    knowledgeContext?.officialReference?.official_links?.[0]?.url ||
      knowledgeContext?.officialReference?.source_url
  );

  let label = "";
  let url = officialSource;

  if (/dbd|จดทะเบียน|บอจ|หนังสือรับรอง|บริษัท/i.test(value) || serviceBucket === "corporate-dbd") {
    label = language === "en" ? "Official DBD links" : "ลิงก์ทางการของ DBD";
    url = url || OFFICIAL_LINKS.dbdBizRegist;
  } else if (/ภาษี|vat|ภ\.\s?พ\.\s?30|ภ\.\s?ง\.\s?ด|สรรพากร|revenue/i.test(value) || serviceBucket === "accounting-tax") {
    label = language === "en" ? "Official Revenue Department links" : "ลิงก์ทางการของกรมสรรพากร";
    url = url || OFFICIAL_LINKS.revenue;
  } else if (/ประกันสังคม|social security|sso/i.test(value)) {
    label = language === "en" ? "Official Social Security Office link" : "ลิงก์ทางการของประกันสังคม";
    url = url || OFFICIAL_LINKS.sso;
  } else if (/work permit|วีซ่า|แรงงาน|doe|e-workpermit/i.test(value) || serviceBucket === "visa-license") {
    label = language === "en" ? "Official work-permit links" : "ลิงก์ทางการเรื่อง Work Permit";
    url = url || OFFICIAL_LINKS.eworkpermit;
  } else if (/ใบอนุญาต|license|biz portal/i.test(value)) {
    label = language === "en" ? "Official Biz Portal link" : "ลิงก์ทางการของ Biz Portal";
    url = url || OFFICIAL_LINKS.bizportal;
  }

  if (language === "en") {
    return url
      ? `${label || "Official reference"}: ${url}`
      : "Please tell us which official source you need, such as DBD, Revenue Department, work permit, or licensing.";
  }

  return url
    ? `${label || "ลิงก์อ้างอิงทางการ"}: ${url}`
    : "รบกวนแจ้งได้เลยค่ะว่าต้องการลิงก์ทางการของเรื่องใด เช่น DBD กรมสรรพากร Work Permit หรือใบอนุญาตธุรกิจ";
}

function buildClarifyQuestion(language, serviceBucket) {
  if (language === "en") {
    if (serviceBucket === "accounting-tax") {
      return "Let us confirm the scope first. Do you want help with tax planning, VAT document flow, monthly accounting, or a filing deadline?";
    }
    if (serviceBucket === "corporate-dbd") {
      return "Let us confirm the scope first. Is this about a new company registration, a DBD amendment, or company documents?";
    }
    if (serviceBucket === "visa-license") {
      return "Let us confirm the scope first. Is this about a visa, work permit, renewal, or a business license?";
    }
    if (serviceBucket === "company-dissolution") {
      return "Let us confirm the scope first. Is this about closure planning, tax cleanup, or the dissolution filing?";
    }
    return "Let us confirm the scope first. What would you like the team to help with most right now?";
  }

  if (serviceBucket === "accounting-tax") {
    return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยวางแผนภาษี จัดรอบเอกสาร VAT บัญชีรายเดือน หรือเช็กกำหนดยื่นเรื่องใดเป็นหลักคะ";
  }
  if (serviceBucket === "corporate-dbd") {
    return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยจดบริษัทใหม่ เปลี่ยนแปลงข้อมูลบริษัท หรือขอเอกสารบริษัทเรื่องใดคะ";
  }
  if (serviceBucket === "visa-license") {
    return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยเรื่องวีซ่า Work Permit การต่ออายุ หรือใบอนุญาตธุรกิจเรื่องใดคะ";
  }
  if (serviceBucket === "company-dissolution") {
    return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยวางแผนปิดบริษัท เคลียร์ภาษีค้าง หรือยื่นเลิกบริษัทเรื่องใดคะ";
  }
  return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยเรื่องใดเป็นหลักคะ";
}

function buildPricingReply(language, text, serviceBucket, memorySummary) {
  const businessType = toText(memorySummary?.knownFacts?.businessType);
  if (language === "en") {
    const memoryHint = businessType ? ` We currently understand the business as ${businessType}.` : "";
    return `We can estimate the scope properly once we know the business type, whether VAT is active, and the approximate monthly document volume.${memoryHint}`.trim();
  }

  const memoryHint = businessType ? ` ตอนนี้เข้าใจเบื้องต้นว่าเป็นธุรกิจ${businessType}` : "";
  return `ทีมช่วยประเมินค่าบริการให้ตรงได้เมื่อทราบประเภทธุรกิจ มี VAT แล้วหรือยัง และปริมาณเอกสารต่อเดือนคร่าว ๆ ค่ะ${memoryHint}`.trim();
}

function buildAccountingReply(language, text, caseFlavor, detail) {
  if (language === "en") {
    if (caseFlavor === "tax-notice") {
      return "Please share the issue stated in the letter, the deadline, and the documents already on hand so we can map the reply properly.";
    }
    if (detail?.id === "pp30") {
      return "PP.30 is normally filed by the 15th of the following month. To confirm the deadline correctly, please tell us which tax month you are referring to and whether VAT is already registered.";
    }
    if (detail?.id === "withholding-tax") {
      return "Please tell us which payment month the withholding tax relates to and whether filing is online or paper so we can confirm the deadline correctly.";
    }
    if (detail?.id === "annual-income-tax") {
      return "Please share the accounting period end date so we can confirm the filing deadline correctly.";
    }
    if (detail?.id === "payroll-social-security") {
      return "Please tell us whether you need help with payroll setup, filing, or Social Security reporting, and how many employees are involved.";
    }
    return "Please tell us whether you want help with monthly accounting, VAT, tax planning, or a filing deadline so we can guide the next step clearly.";
  }

  if (caseFlavor === "tax-notice") {
    return "รบกวนส่งสาระสำคัญในหนังสือ วันครบกำหนด และเอกสารที่มีอยู่ตอนนี้มาได้เลยค่ะ ทีมจะช่วยจัดลำดับการตอบกลับให้ตรงประเด็น";
  }
  if (detail?.id === "pp30") {
    return "ภ.พ.30 ต้องยื่นภายในวันที่ 15 ของเดือนถัดไปค่ะ หากต้องการให้ทีมช่วยเช็กให้ตรง รบกวนแจ้งเดือนภาษีที่ถามและตอนนี้จด VAT แล้วหรือยังคะ";
  }
  if (detail?.id === "withholding-tax") {
    return "รบกวนแจ้งเดือนที่จ่ายเงิน และจะยื่นผ่านออนไลน์หรือกระดาษด้วยค่ะ ทีมจะช่วยเช็กกำหนดยื่นให้ตรง";
  }
  if (detail?.id === "annual-income-tax") {
    return "รบกวนแจ้งวันสิ้นรอบบัญชีของบริษัทด้วยค่ะ ทีมจะช่วยเช็กกำหนดยื่นให้ตรง";
  }
  if (detail?.id === "payroll-social-security") {
    return "รบกวนแจ้งได้เลยค่ะว่าต้องการให้ทีมช่วยวางระบบเงินเดือน ยื่นประกันสังคม หรือจัดทำ payroll สำหรับพนักงานกี่คน";
  }
  return "รบกวนแจ้งได้เลยค่ะว่าตอนนี้ต้องการให้ทีมช่วยเรื่องบัญชีรายเดือน ภาษี หรือการวางแผนภาษีส่วนไหนเป็นหลักคะ";
}

function buildCorporateReply(language, text, caseFlavor) {
  if (language === "en") {
    if (caseFlavor === "new-registration") {
      return "If you would like to register a new company, please tell us what business activity the company will operate in. The initial documents are: 1) copies of the ID card and house registration of at least two shareholders, and 2) a copy of the house registration of the company address. Once the documents are ready, our staff will contact you right away. Please share your phone number as well.";
    }
    if (caseFlavor === "director-change") {
      return "Please tell us whether this is a resignation, a new appointment, or both, and whether the signing authority also changes.";
    }
    if (caseFlavor === "address-change") {
      return "Please share the current address, the new address, and whether the company is already fully registered.";
    }
    return "Please tell us whether this is a new company registration, a DBD amendment, or a company-document request so we can guide the next step correctly.";
  }

  if (caseFlavor === "new-registration") {
    return "หากต้องการจดทะเบียนบริษัทใหม่ รบกวนแจ้งก่อนนะคะว่าต้องการจดทะเบียนบริษัทเพื่อประกอบกิจการเกี่ยวกับอะไรบ้าง เอกสารเบื้องต้นที่ใช้คือ 1. สำเนาบัตรประชาชนและสำเนาทะเบียนบ้านของหุ้นส่วนตั้งแต่ 2 คนขึ้นไป 2. สำเนาทะเบียนบ้านที่ตั้งของบริษัท เมื่อเตรียมเอกสารเรียบร้อยแล้ว ทางเจ้าหน้าที่ของเราจะติดต่อกลับหาคุณทันทีค่ะ รบกวนขอเบอร์โทรติดต่อไว้ได้เลยนะคะ";
  }
  if (caseFlavor === "director-change") {
    return "รบกวนแจ้งได้ไหมคะว่าเป็นการลาออก แต่งตั้งใหม่ หรือมีทั้งสองส่วน และอำนาจลงนามมีการเปลี่ยนด้วยหรือไม่คะ";
  }
  if (caseFlavor === "address-change") {
    return "รบกวนส่งที่อยู่เดิม ที่อยู่ใหม่ และแจ้งได้เลยค่ะว่าบริษัทจดทะเบียนเรียบร้อยแล้วหรือยัง";
  }
  return "รบกวนแจ้งได้เลยค่ะว่าตอนนี้ต้องการให้ทีมช่วยจดบริษัทใหม่ เปลี่ยนแปลงข้อมูลบริษัท หรือขอเอกสารบริษัทเรื่องใดคะ";
}

function buildVisaReply(language, text, caseFlavor, memorySummary) {
  const unsupported = detectUnsupportedNationality(text, memorySummary);
  if (unsupported) {
    if (language === "en") {
      return `We should let you know clearly that the team does not currently take visa or work-permit cases for ${unsupported.labelEn}. If this is a separate accounting, tax, company-registration, or DBD matter, we can still help review that scope.`;
    }
    return `ขอแจ้งให้ทราบตรง ๆ นะคะ ตอนนี้ทีมไม่ได้รับเคสวีซ่าและ Work Permit สำหรับสัญชาติ${unsupported.labelTh}แล้วค่ะ หากเป็นงานบัญชี ภาษี จดทะเบียนบริษัท หรือ DBD แยกอีกเคส ทีมยังช่วยดูขอบเขตส่วนนั้นได้ค่ะ`;
  }

  if (language === "en") {
    if (caseFlavor === "restaurant-license") {
      return "We can help review a restaurant-license case. Please tell us whether the company is already registered, where the shop is located, what type of restaurant or cafe it is, and whether alcohol will be served. Once we have those details, the team can confirm which licenses and documents are required.";
    }
    if (caseFlavor === "renewal") {
      return "Please share the expiry date, nationality, and whether the applicant is a director or employee so we can review the renewal scope correctly.";
    }
    if (caseFlavor === "business-license") {
      return "Please tell us what type of business license you need and whether the company is already fully registered.";
    }
    return "Please tell us the nationality involved, whether the applicant is a director or employee, and whether this is a new case, a renewal, or an amendment.";
  }

  if (caseFlavor === "restaurant-license") {
    return "ได้เลยค่ะ หากต้องการขอใบอนุญาตประกอบกิจการประเภทร้านอาหาร รบกวนแจ้งก่อนนะคะว่า 1. ตอนนี้บริษัทหรือกิจการจดทะเบียนเรียบร้อยแล้วหรือยัง 2. ร้านตั้งอยู่เขตหรือจังหวัดใด 3. เป็นร้านอาหารทั่วไป คาเฟ่ หรือมีการจำหน่ายแอลกอฮอล์ด้วยหรือไม่ เมื่อทราบรายละเอียดเบื้องต้นแล้ว ทีมจะช่วยเช็กใบอนุญาตที่เกี่ยวข้องและเอกสารที่ต้องใช้ให้ค่ะ";
  }
  if (caseFlavor === "renewal") {
    return "รบกวนแจ้งวันหมดอายุ สัญชาติ และว่าผู้ยื่นเป็นกรรมการหรือพนักงานได้เลยค่ะ ทีมจะช่วยดูขอบเขตการต่ออายุให้ตรง";
  }
  if (caseFlavor === "business-license") {
    return "รบกวนแจ้งประเภทใบอนุญาตที่ต้องการ และตอนนี้บริษัทจดทะเบียนเรียบร้อยแล้วหรือยังคะ";
  }
  return "รบกวนแจ้งสัญชาติ ผู้ยื่นเป็นกรรมการหรือพนักงาน และเป็นเคสใหม่ ต่ออายุ หรือแก้ไขข้อมูลได้เลยค่ะ";
}

function buildDissolutionReply(language) {
  if (language === "en") {
    return "Please tell us whether the company has already stopped operating and whether there are any open accounting or tax items. We will then map the next step clearly.";
  }
  return "รบกวนแจ้งได้เลยค่ะว่าบริษัทหยุดดำเนินการแล้วหรือยัง และตอนนี้มีบัญชีหรือภาษีค้างส่วนใดอยู่บ้าง ทีมจะช่วยแยกขั้นตอนให้ชัดเจน";
}

function buildServiceAreaReply(language) {
  if (language === "en") {
    return "The team supports clients across Bangkok and nearby areas. If you tell us your district and the service needed, we can confirm the scope right away.";
  }
  return "ทีมดูแลลูกค้าได้ทั้งกรุงเทพและพื้นที่ใกล้เคียงค่ะ หากแจ้งเขตและบริการที่ต้องการมาได้เลย ทีมจะช่วยเช็กขอบเขตงานให้ทันที";
}

function buildGeneralReply(language) {
  if (language === "en") {
    return "Our team will get back to you as soon as possible. Thank you.";
  }
  return "ทีมงานของเราจะติดต่อกลับหาคุณโดยเร็วที่สุดค่ะ ขอบคุณค่ะ";
}

function buildLineReply({
  language = "th",
  intent,
  knowledgeContext,
  memorySummary,
  eventText,
  serviceBucket = "general",
}) {
  const text = toText(eventText);
  const detail = detectAccountingIntentDetail(text, serviceBucket, toText(intent?.key) || "general");
  const caseFlavor = detectCaseFlavor(text, serviceBucket);

  if (isAmbiguousFollowUp(text)) {
    return buildClarifyQuestion(language, serviceBucket);
  }

  if (toText(intent?.key) === "official-reference") {
    return buildOfficialReferenceReply(language, text, serviceBucket, knowledgeContext);
  }

  if (toText(intent?.key) === "service-area") {
    return buildServiceAreaReply(language);
  }

  if (toText(intent?.key) === "pricing") {
    return buildPricingReply(language, text, serviceBucket, memorySummary);
  }

  if (serviceBucket === "corporate-dbd") {
    return buildCorporateReply(language, text, caseFlavor);
  }

  if (serviceBucket === "accounting-tax") {
    return buildAccountingReply(language, text, caseFlavor, detail);
  }

  if (serviceBucket === "visa-license") {
    return buildVisaReply(language, text, caseFlavor, memorySummary);
  }

  if (serviceBucket === "company-dissolution") {
    return buildDissolutionReply(language);
  }

  return buildGeneralReply(language);
}

async function requestOpenClawLineReply(payload) {
  const url = process.env.OPENCLAW_WEBHOOK_URL;
  const token = process.env.OPENCLAW_WEBHOOK_TOKEN;

  if (!url) {
    return { sent: false, reason: "missing_openclaw_url" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-OpenClaw-Token": token } : {}),
    },
    body: JSON.stringify({
      mode: "line_auto_reply",
      payload,
    }),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    sent: response.ok,
    status: response.status,
    replyText: toText(body?.replyText),
    confidence: toText(body?.confidence),
    shouldClarify: Boolean(body?.shouldClarify),
    evidenceUsed: Array.isArray(body?.evidenceUsed) ? body.evidenceUsed : [],
  };
}

module.exports = {
  detectLineLanguage,
  detectLineIntent,
  detectAccountingIntentDetail,
  resolveServiceBucket,
  buildLineReply,
  requestOpenClawLineReply,
  detectSpecificServiceBucket,
  detectCaseFlavor,
};
