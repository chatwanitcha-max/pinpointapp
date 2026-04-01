const { toText } = require("./analytics");
const { extractContextSlots } = require("./context-slots");

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    table: process.env.SUPABASE_TABLE_NAME || "leads",
    schema: process.env.SUPABASE_SCHEMA || "public",
  };
}

function buildEmptySummary(language = "th", serviceBucket = "general") {
  return {
    turns: 0,
    language,
    lastServiceBucket: serviceBucket || "general",
    serviceBuckets: serviceBucket && serviceBucket !== "general" ? [serviceBucket] : [],
    lastIntentKey: "general",
    recentUserMessages: [],
    recentAssistantReplies: [],
    knownFacts: {
      companyStatus: "",
      nationality: "",
      unsupportedNationality: "",
      businessType: "",
      foreignShareholder: false,
      mentionsVat: false,
      mentionsPayroll: false,
      mentionsUrgent: false,
    },
    summaryText: "",
  };
}

function inferUrgency(text) {
  return /ด่วน|ภายใน|วันนี้|พรุ่งนี้|urgent|asap|today|tomorrow|deadline|expire|expires/i.test(
    toText(text)
  );
}

function buildMemorySeed(facts, language = "th", serviceBucket = "general") {
  return {
    turns: 0,
    language,
    lastServiceBucket: serviceBucket,
    serviceBuckets: serviceBucket && serviceBucket !== "general" ? [serviceBucket] : [],
    lastIntentKey: "general",
    recentUserMessages: [],
    recentAssistantReplies: [],
    knownFacts: facts,
    summaryText: "",
  };
}

function collectKnownFacts(rows, fallbackLanguage = "th", fallbackServiceBucket = "general") {
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

  for (const row of rows) {
    const text = toText(row.userText);
    if (!text) continue;

    const nextServiceBucket = toText(row.serviceBucket) || fallbackServiceBucket;
    const slots = extractContextSlots({
      text,
      memorySummary: buildMemorySeed(facts, fallbackLanguage, nextServiceBucket),
      serviceBucket: nextServiceBucket,
      intentKey: toText(row.intentKey) || "general",
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
    facts.mentionsUrgent = facts.mentionsUrgent || inferUrgency(text);
  }

  return facts;
}

function buildSummaryText(facts, language = "th") {
  const parts = [];

  if (facts.businessType) {
    parts.push(
      language === "en"
        ? `Business type seen from earlier context: ${facts.businessType}`
        : `ประเภทธุรกิจที่เห็นจากบทสนทนาก่อนหน้า: ${facts.businessType}`
    );
  }

  if (facts.companyStatus === "new") {
    parts.push(
      language === "en"
        ? "The case still looks like a new company or not-yet-registered business"
        : "ดูเป็นเคสบริษัทใหม่หรือยังไม่ได้จดทะเบียน"
    );
  }

  if (facts.companyStatus === "existing") {
    parts.push(
      language === "en"
        ? "The case looks like an existing registered company"
        : "ดูเป็นเคสของบริษัทที่จดทะเบียนแล้ว"
    );
  }

  if (facts.nationality) {
    parts.push(
      language === "en"
        ? `The case involves ${facts.nationality}`
        : `มีผู้เกี่ยวข้องสัญชาติ ${facts.nationality}`
    );
  }

  if (facts.unsupportedNationality) {
    parts.push(
      language === "en"
        ? "The conversation already mentions a visa or work-permit nationality outside the team's scope"
        : "มีสัญชาติที่อยู่นอกขอบเขตงานวีซ่าและ Work Permit ของทีมแล้ว"
    );
  }

  if (facts.foreignShareholder) {
    parts.push(
      language === "en"
        ? "Foreign shareholders are involved"
        : "มีผู้ถือหุ้นต่างชาติเกี่ยวข้อง"
    );
  }

  if (facts.mentionsVat) {
    parts.push(language === "en" ? "VAT is already part of the case" : "มีประเด็น VAT อยู่ในเคสนี้");
  }

  if (facts.mentionsPayroll) {
    parts.push(
      language === "en"
        ? "Payroll or social security is also involved"
        : "มีประเด็นเงินเดือนหรือประกันสังคมอยู่ด้วย"
    );
  }

  if (facts.mentionsUrgent) {
    parts.push(
      language === "en"
        ? "The case appears to be time-sensitive"
        : "เคสดูมีความเร่งด่วนด้านเวลา"
    );
  }

  return language === "en" ? parts.join(". ") : parts.join(" ");
}

function summariseConversation(rows, fallbackLanguage, fallbackServiceBucket) {
  const userRows = rows.filter((row) => row.userText);
  const lastRow = rows[rows.length - 1] || null;
  const serviceBuckets = [...new Set(rows.map((row) => toText(row.serviceBucket)).filter(Boolean))];
  const language = toText(lastRow?.language) || fallbackLanguage || "th";
  const lastServiceBucket =
    toText(lastRow?.serviceBucket) ||
    fallbackServiceBucket ||
    serviceBuckets[serviceBuckets.length - 1] ||
    "general";
  const facts = collectKnownFacts(rows, language, lastServiceBucket);

  return {
    turns: rows.length,
    language,
    lastServiceBucket,
    serviceBuckets,
    lastIntentKey: toText(lastRow?.intentKey) || "general",
    recentUserMessages: userRows.slice(-3).map((row) => row.userText),
    recentAssistantReplies: rows
      .slice(-3)
      .map((row) => toText(row.assistantReply))
      .filter(Boolean),
    knownFacts: facts,
    summaryText: buildSummaryText(facts, language),
  };
}

function mapLeadRow(row) {
  const rawPayload = row.raw_payload || {};
  return {
    leadId: toText(row.lead_id),
    receivedAt: toText(row.received_at),
    language: toText(row.language) || toText(row.routing?.language),
    serviceBucket: toText(row.routing?.serviceBucket),
    intentKey:
      toText(row.raw_payload?.lineIntentKey) ||
      toText(row.line_event?.detectedIntent) ||
      "general",
    userText: toText(row.notes) || toText(row.line_event?.text),
    assistantReply:
      toText(rawPayload.lineReplyText) ||
      toText(rawPayload.replyDraftText) ||
      "",
  };
}

async function getLineConversationMemory({
  userId,
  language = "th",
  serviceBucket = "general",
  limit = 12,
}) {
  const value = toText(userId);
  if (!value) {
    return {
      available: false,
      rows: [],
      summary: buildEmptySummary(language, serviceBucket),
    };
  }

  const config = getSupabaseConfig();
  if (!config.url || !config.key || !config.table) {
    return {
      available: false,
      rows: [],
      summary: buildEmptySummary(language, serviceBucket),
    };
  }

  const endpoint =
    `${String(config.url).replace(/\/+$/, "")}/rest/v1/${encodeURIComponent(config.table)}` +
    "?select=lead_id,received_at,language,routing,line_event,notes,raw_payload,source" +
    "&source=eq.line_oa" +
    "&order=received_at.desc" +
    "&limit=50";

  const response = await fetch(endpoint, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      "Content-Profile": config.schema,
    },
  });

  if (!response.ok) {
    return {
      available: false,
      rows: [],
      summary: buildEmptySummary(language, serviceBucket),
      status: response.status,
    };
  }

  const body = await response.json();
  const rows = (Array.isArray(body) ? body : [])
    .filter((row) => toText(row.line_event?.userId) === value)
    .slice(0, limit)
    .reverse()
    .map(mapLeadRow);

  return {
    available: true,
    rows,
    summary: summariseConversation(rows, language, serviceBucket),
  };
}

module.exports = {
  buildEmptySummary,
  getLineConversationMemory,
};
