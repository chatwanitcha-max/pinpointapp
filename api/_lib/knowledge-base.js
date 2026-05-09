const fs = require("node:fs");
const path = require("node:path");

const { toText } = require("./analytics");

let cachedKnowledgeBase = null;
let cachedMtime = 0;

const THAI_TOKEN_RE = /[\u0E00-\u0E7F]{2,}|[a-z0-9][a-z0-9-]{1,}/gu;
const TOKEN_STOP_WORDS = new Set([
  "what",
  "when",
  "which",
  "with",
  "from",
  "that",
  "this",
  "your",
  "have",
  "there",
  "must",
  "need",
  "after",
  "before",
  "please",
  "would",
  "about",
  "where",
  "how",
  "tell",
  "team",
  "and",
  "the",
  "for",
  "you",
  "are",
  "is",
  "to",
  "of",
  "or",
  "if",
]);

function loadKnowledgeBase() {
  const filePath = path.join(process.cwd(), "content", "smart-faq-kb.json");
  const stat = fs.statSync(filePath);
  if (!cachedKnowledgeBase || stat.mtimeMs !== cachedMtime) {
    cachedKnowledgeBase = JSON.parse(fs.readFileSync(filePath, "utf8"));
    cachedMtime = stat.mtimeMs;
  }
  return cachedKnowledgeBase;
}

function tokenise(text) {
  const value = toText(text).toLowerCase();
  return [...new Set((value.match(THAI_TOKEN_RE) || []).filter((token) => !TOKEN_STOP_WORDS.has(token)))];
}

function shouldIncludeOfficialReference(text) {
  return /\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07|\u0e25\u0e34\u0e07\u0e01\u0e4c|link|official|government|source|\u0e40\u0e27\u0e47\u0e1a\u0e44\u0e0b\u0e15\u0e4c\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23/i.test(
    toText(text)
  );
}

function shouldIncludeWebsiteLink(text) {
  return /\u0e2d\u0e48\u0e32\u0e19\u0e40\u0e1e\u0e34\u0e48\u0e21|details?|detail|read more|\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14|website|\u0e40\u0e27\u0e47\u0e1a/i.test(
    toText(text)
  );
}

function detectQuerySignals(text) {
  const value = toText(text);
  return {
    pricing: /\u0e23\u0e32\u0e04\u0e32|\u0e04\u0e48\u0e32\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23|\u0e41\u0e1e\u0e47\u0e01\u0e40\u0e01\u0e08|quote|quotation|price|pricing|fee|cost/i.test(value),
    reference: /\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07|\u0e25\u0e34\u0e07\u0e01\u0e4c|link|official|government|source|\u0e40\u0e27\u0e47\u0e1a\u0e44\u0e0b\u0e15\u0e4c\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23/i.test(value),
    renewal: /\u0e15\u0e48\u0e2d\u0e2d\u0e32\u0e22\u0e38|renew|renewal|expires|expiry|\u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38/i.test(value),
    taxNotice: /\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23|\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e08\u0e32\u0e01\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23|\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e20\u0e32\u0e29\u0e35|\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e20\u0e32\u0e29\u0e35|\u0e20\u0e32\u0e29\u0e35\u0e22\u0e49\u0e2d\u0e19\u0e2b\u0e25\u0e31\u0e07|tax audit|revenue department|official notice|back tax|penalt|fine/i.test(value),
    restaurantLicense: /\u0e23\u0e49\u0e32\u0e19\u0e2d\u0e32\u0e2b\u0e32\u0e23|\u0e04\u0e32\u0e40\u0e1f\u0e48|\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e41\u0e25\u0e30\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e14\u0e37\u0e48\u0e21|restaurant|cafe|caf\u00e9|food business/i.test(value),
    socialSecurity: /\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21|\u0e2a\u0e1b\u0e2a\.?|social security|sso/i.test(value),
    englishCertificate: /\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07.*\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29|\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29.*\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07|english certificate|english company name|encert/i.test(value),
    directorChange: /\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32\u0e23|change director/i.test(value),
    addressChange: /\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48|address/i.test(value),
    deadline: /\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23|\u0e01\u0e33\u0e2b\u0e19\u0e14|\u0e20\u0e32\u0e22\u0e43\u0e19\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48|deadline|due date|when/i.test(value),
    pp30: /\u0e20\.\u0e1e\.?30|pp\.?30|vat return/i.test(value),
    pnd1: /\u0e20\.\u0e07\.\u0e14\.?1|pnd\.?1/i.test(value),
    pnd3: /\u0e20\.\u0e07\.\u0e14\.?3|pnd\.?3/i.test(value),
    pnd53: /\u0e20\.\u0e07\.\u0e14\.?53|pnd\.?53/i.test(value),
    pnd50: /\u0e20\.\u0e07\.\u0e14\.?50|pnd\.?50/i.test(value),
    pnd51: /\u0e20\.\u0e07\.\u0e14\.?51|pnd\.?51/i.test(value),
    boj5: /\u0e1a\u0e2d\u0e08\.?5|boj\.?5/i.test(value),
  };
}

function buildRelevantMemoryText(memorySummary, serviceBucket, intentKey, querySignals) {
  const facts = memorySummary?.knownFacts || {};
  const parts = [];

  if (querySignals.taxNotice) {
    if (facts.companyStatus === "existing") parts.push("existing company");
    if (facts.companyStatus === "new") parts.push("new company");
    return parts.join(" ");
  }

  if (querySignals.reference) {
    return "";
  }

  if (querySignals.renewal || serviceBucket === "visa-license") {
    if (facts.nationality) parts.push(String(facts.nationality));
    if (facts.companyStatus === "existing") parts.push("existing company");
    if (facts.companyStatus === "new") parts.push("new company");
    return parts.join(" ");
  }

  if (querySignals.pricing || intentKey === "pricing") {
    if (facts.businessType) parts.push(String(facts.businessType));
    if (facts.mentionsVat) parts.push("vat");
    if (facts.companyStatus === "existing") parts.push("existing company");
    if (facts.companyStatus === "new") parts.push("new company");
    return parts.join(" ");
  }

  if (serviceBucket === "accounting-tax") {
    if (facts.businessType) parts.push(String(facts.businessType));
    if (facts.mentionsVat) parts.push("vat");
    if (facts.mentionsPayroll) parts.push("payroll");
    return parts.join(" ");
  }

  if (serviceBucket === "corporate-dbd" || serviceBucket === "company-dissolution") {
    if (facts.companyStatus === "existing") parts.push("existing company");
    if (facts.companyStatus === "new") parts.push("new company");
    return parts.join(" ");
  }

  return "";
}

function scoreEntry(entry, context) {
  let score = Number(entry.priority || 0);
  const queryTerms = context.queryTerms || [];
  const memoryTerms = context.memoryTerms || [];
  const entryTerms = new Set(entry.search_terms || []);
  const rawSearchText = `${entry.search_text_th || ""} ${entry.search_text_en || ""}`.toLowerCase();
  const querySignals = context.querySignals || {};
  const preferredIds = new Set(context.preferredIds || []);
  let matchedQueryTerms = 0;

  if (context.serviceBucket && entry.serviceBucket === context.serviceBucket) score += 40;
  if (context.intentKey && entry.serviceBucket === context.intentKey) score += 10;
  if (context.intentKey === "pricing" && entry.category === "pricing") score += 28;
  if (context.intentKey === "official-reference" && entry.category === "reference") score += 24;
  if (context.memoryServiceBucket && entry.serviceBucket === context.memoryServiceBucket) score += 15;

  for (const term of queryTerms) {
    if (entryTerms.has(term)) {
      score += 18;
      matchedQueryTerms += 1;
    } else if (rawSearchText.includes(term)) {
      score += 10;
      matchedQueryTerms += 1;
    }
  }

  score += matchedQueryTerms * 8;

  for (const term of memoryTerms) {
    if (entryTerms.has(term)) {
      score += 4;
    } else if (rawSearchText.includes(term)) {
      score += 2;
    }
  }

  if (entry.type === "manual_faq") score += 25;
  if (entry.type === "official_reference" && context.wantsReference) score += 25;
  if (entry.source_url && context.wantsWebsiteLink && /^https:\/\/pinpointaccountingservice\.com\//.test(entry.source_url)) {
    score += 12;
  }
  if (preferredIds.has(entry.id)) score += 140;

  if (querySignals.pricing) {
    if (entry.category === "pricing" || entry.serviceBucket === "pricing") {
      score += 95;
    } else {
      score -= 30;
    }
  }

  if (querySignals.reference) {
    if (entry.type === "official_reference" || entry.category === "reference" || entry.category === "references") {
      score += 110;
    } else {
      score -= 36;
    }
  }

  if (querySignals.renewal) {
    if (/renewal|renew|expiry|expires|\u0e15\u0e48\u0e2d\u0e2d\u0e32\u0e22\u0e38|\u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38/i.test(rawSearchText)) {
      score += 48;
      if (entry.type === "manual_faq") score += 26;
    } else if (entry.type === "service_page") {
      score -= 30;
    }
  }

  if (querySignals.taxNotice) {
    if (/\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23|\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e08\u0e32\u0e01\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23|\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e20\u0e32\u0e29\u0e35|\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e20\u0e32\u0e29\u0e35|\u0e20\u0e32\u0e29\u0e35\u0e22\u0e49\u0e2d\u0e19\u0e2b\u0e25\u0e31\u0e07|tax audit|revenue department|official notice|back tax|penalt|fine/i.test(rawSearchText)) {
      score += 52;
    } else {
      score -= 34;
    }

    if (/tax-notice|back-tax/i.test(entry.id || "")) score += 90;
    if (/research-vat-|accounting-monthly-scope/i.test(entry.id || "")) score -= 55;
  }

  if (querySignals.deadline && querySignals.pp30) {
    if (/\u0e20\.\u0e1e\.?30|monthly filing|วันที่ 15|เดือนถัดไป|vat return/i.test(rawSearchText)) {
      score += 110;
    }
    if (/registration-threshold|1\.8|จด vat/i.test(rawSearchText)) {
      score -= 70;
    }
  }

  if (querySignals.deadline && (querySignals.pnd1 || querySignals.pnd3 || querySignals.pnd53)) {
    if (/\u0e20\.\u0e07\.\u0e14\.?1|\u0e20\.\u0e07\.\u0e14\.?3|\u0e20\.\u0e07\.\u0e14\.?53|withholding/i.test(rawSearchText)) {
      score += 95;
    }
  }

  if (querySignals.deadline && (querySignals.pnd50 || querySignals.pnd51 || querySignals.boj5)) {
    if (/\u0e20\.\u0e07\.\u0e14\.?50|\u0e20\.\u0e07\.\u0e14\.?51|\u0e1a\u0e2d\u0e08\.?5|year-end|financial statements/i.test(rawSearchText)) {
      score += 95;
    }
  }

  if (querySignals.directorChange && /\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32\u0e23|change director/i.test(rawSearchText)) {
    score += 38;
  }

  if (querySignals.addressChange && /\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48|address/i.test(rawSearchText)) {
    score += 38;
  }

  if (querySignals.socialSecurity) {
    if (/\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21|\u0e2a\u0e1b\u0e2a\.?|social security|sso|payroll/i.test(rawSearchText)) {
      score += 80;
    } else if (entry.serviceBucket === "accounting-tax") {
      score -= 35;
    }
  }

  if (querySignals.restaurantLicense) {
    if (/\u0e23\u0e49\u0e32\u0e19\u0e2d\u0e32\u0e2b\u0e32\u0e23|\u0e04\u0e32\u0e40\u0e1f\u0e48|\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e41\u0e25\u0e30\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e14\u0e37\u0e48\u0e21|restaurant|cafe|caf\u00e9|food business/i.test(rawSearchText)) {
      score += 85;
    } else if (/work permit|e-workpermit|\u0e43\u0e1a\u0e2d\u0e19\u0e38\u0e0d\u0e32\u0e15\u0e17\u0e33\u0e07\u0e32\u0e19/i.test(rawSearchText)) {
      score -= 60;
    }
  }

  if (querySignals.englishCertificate) {
    if (/\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07.*\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29|\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29.*\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07|english certificate|english juristic|english company name|encert/i.test(rawSearchText)) {
      score += 95;
    } else if (entry.serviceBucket === "corporate-dbd") {
      score -= 35;
    }
  }

  return score;
}

function searchKnowledgeBase({
  query,
  language = "th",
  serviceBucket = "general",
  intentKey = "general",
  memorySummary = null,
  preferredIds = [],
  limit = 4,
}) {
  const kb = loadKnowledgeBase();
  const queryTerms = tokenise(query);
  const wantsReference = shouldIncludeOfficialReference(query);
  const wantsWebsiteLink = shouldIncludeWebsiteLink(query);
  const querySignals = detectQuerySignals(query);
  const memoryTerms = tokenise(
    buildRelevantMemoryText(memorySummary, serviceBucket, intentKey, querySignals)
  );

  const scored = kb.entries
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, {
        queryTerms,
        memoryTerms,
        serviceBucket,
        intentKey,
        memoryServiceBucket: memorySummary?.lastServiceBucket || "",
        wantsReference,
        wantsWebsiteLink,
        querySignals,
        preferredIds,
      }),
    }))
    .filter((entry) => entry.score >= 40)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  const officialReference = wantsReference
    ? kb.entries
        .filter((entry) => entry.type === "official_reference")
        .map((entry) => ({
          ...entry,
          score: scoreEntry(entry, {
            queryTerms,
            memoryTerms,
            serviceBucket,
            intentKey,
            memoryServiceBucket: memorySummary?.lastServiceBucket || "",
            wantsReference: true,
            wantsWebsiteLink,
            querySignals,
            preferredIds,
          }),
        }))
        .sort((left, right) => right.score - left.score)[0] || null
    : null;

  const websiteReference = wantsWebsiteLink
    ? scored.find(
        (entry) =>
          entry.source_url &&
          /^https:\/\/pinpointaccountingservice\.com\//.test(entry.source_url)
      )
    : null;

  return {
    language,
    matches: scored,
    officialReference,
    websiteReference,
  };
}

function getAnswerText(entry, language) {
  if (!entry) return "";
  return language === "en"
    ? toText(entry.answer_en) || toText(entry.answer_th)
    : toText(entry.answer_th) || toText(entry.answer_en);
}

function getFollowUpText(entry, language) {
  if (!entry) return "";
  return language === "en"
    ? toText(entry.follow_up_en) || toText(entry.follow_up_th)
    : toText(entry.follow_up_th) || toText(entry.follow_up_en);
}

module.exports = {
  loadKnowledgeBase,
  searchKnowledgeBase,
  getAnswerText,
  getFollowUpText,
  shouldIncludeOfficialReference,
  shouldIncludeWebsiteLink,
};
