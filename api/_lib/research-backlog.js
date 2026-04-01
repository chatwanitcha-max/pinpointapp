const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { json, sha256, toText } = require("./analytics");

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    table: process.env.SUPABASE_TABLE_NAME || "leads",
    schema: process.env.SUPABASE_SCHEMA || "public",
  };
}

function getLineReplyMode() {
  const configured = toText(process.env.LINE_REPLY_MODE).toLowerCase();
  if (!configured) return "smart";
  return configured === "greeter_only" ? "smart" : configured;
}

function buildGreeterOnlyReply(language = "th") {
  if (language === "en") {
    return "Hello, thank you for contacting Pinpoint Accounting & Service. Our team will get back to you as soon as possible. Thank you.";
  }

  return "สวัสดีค่ะ ขอบคุณที่ติดต่อ Pinpoint Accounting & Service นะคะ ทีมงานของเราจะติดต่อกลับหาคุณโดยเร็วที่สุดค่ะ ขอบคุณค่ะ";
}

function shouldSendGreeterReply({ turns = 0 }) {
  return Number(turns || 0) === 0;
}

function normalizeQuestionText(text) {
  return toText(text)
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/[!?.,;:()[\]{}<>\"'`~@#$%^&*_+=\\/|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildResearchCapture({
  eventText,
  language,
  serviceBucket,
  intentKey,
  analysis,
  userId,
  leadId,
  knowledgeMatchIds = [],
}) {
  const questionText = toText(eventText);
  const normalizedQuestion = normalizeQuestionText(questionText);
  const topMatchId = toText(analysis?.topMatchId);
  const shouldReview =
    Boolean(analysis?.shouldClarify) ||
    Boolean(analysis?.lowConfidence) ||
    !topMatchId;

  return {
    capturedAt: new Date().toISOString(),
    leadId: toText(leadId),
    userId: toText(userId),
    language: toText(language) || "th",
    serviceBucket: toText(serviceBucket) || "general",
    intentKey: toText(intentKey) || "general",
    questionText,
    normalizedQuestion,
    questionHash: normalizedQuestion ? sha256(normalizedQuestion) : "",
    shouldReview,
    confidence: toText(analysis?.confidence) || "unknown",
    topMatchId,
    knowledgeMatchIds: Array.isArray(knowledgeMatchIds) ? knowledgeMatchIds : [],
  };
}

async function fetchRecentResearchRows({ days = 30, limit = 500 } = {}) {
  const config = getSupabaseConfig();
  if (!config.url || !config.key || !config.table) {
    return { available: false, rows: [], reason: "missing_supabase_env" };
  }

  const since = new Date(Date.now() - Number(days || 30) * 24 * 60 * 60 * 1000).toISOString();
  const endpoint =
    `${String(config.url).replace(/\/+$/, "")}/rest/v1/${encodeURIComponent(config.table)}` +
    `?select=lead_id,received_at,source,notes,raw_payload,routing,line_event` +
    `&source=eq.line_oa&received_at=gte.${encodeURIComponent(since)}` +
    `&order=received_at.desc&limit=${Math.max(1, Math.min(Number(limit || 500), 1000))}`;

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
      reason: "supabase_error",
      status: response.status,
    };
  }

  const body = await response.json();
  return {
    available: true,
    rows: Array.isArray(body) ? body : [],
  };
}

function buildResearchDigest(rows = []) {
  const grouped = new Map();

  for (const row of rows) {
    const research = row?.raw_payload?.research || {};
    const questionText = toText(research.questionText) || toText(row?.notes);
    const normalizedQuestion = toText(research.normalizedQuestion) || normalizeQuestionText(questionText);
    if (!normalizedQuestion) continue;

    const language = toText(research.language) || toText(row?.routing?.language) || "th";
    const serviceBucket =
      toText(research.serviceBucket) || toText(row?.routing?.serviceBucket) || "general";
    const intentKey =
      toText(research.intentKey) || toText(row?.raw_payload?.lineIntentKey) || "general";
    const key = `${language}::${serviceBucket}::${normalizedQuestion}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        language,
        serviceBucket,
        intentKey,
        normalizedQuestion,
        exampleQuestion: questionText,
        askCount: 0,
        needsReviewCount: 0,
        latestAt: "",
        latestLeadId: "",
        topMatchIds: new Set(),
      });
    }

    const entry = grouped.get(key);
    entry.askCount += 1;
    if (research.shouldReview) entry.needsReviewCount += 1;
    if (toText(row?.received_at) > toText(entry.latestAt)) {
      entry.latestAt = toText(row?.received_at);
      entry.latestLeadId = toText(row?.lead_id);
      entry.exampleQuestion = questionText || entry.exampleQuestion;
    }
    if (toText(research.topMatchId)) entry.topMatchIds.add(toText(research.topMatchId));
  }

  const questions = [...grouped.values()]
    .map((entry) => ({
      ...entry,
      topMatchIds: [...entry.topMatchIds],
    }))
    .sort((left, right) => {
      if (right.needsReviewCount !== left.needsReviewCount) {
        return right.needsReviewCount - left.needsReviewCount;
      }
      return right.askCount - left.askCount;
    });

  const byServiceBucket = questions.reduce((acc, entry) => {
    acc[entry.serviceBucket] = (acc[entry.serviceBucket] || 0) + entry.askCount;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    totalMessages: rows.length,
    uniqueQuestions: questions.length,
    reviewCandidates: questions.filter((entry) => entry.needsReviewCount > 0).length,
    byServiceBucket,
    topQuestions: questions.slice(0, 50),
  };
}

function saveResearchDigestRuntime(report) {
  const runtimeCandidates = [
    path.join(process.cwd(), "operations", "runtime"),
    path.join(os.tmpdir(), "pinpoint-runtime"),
  ];

  for (const runtimeDir of runtimeCandidates) {
    try {
      fs.mkdirSync(runtimeDir, { recursive: true });
      const filePath = path.join(runtimeDir, "research-digest.json");
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + "\n", "utf8");
      return filePath;
    } catch {
      continue;
    }
  }

  return "";
}

module.exports = {
  buildGreeterOnlyReply,
  buildResearchCapture,
  buildResearchDigest,
  fetchRecentResearchRows,
  getLineReplyMode,
  normalizeQuestionText,
  saveResearchDigestRuntime,
  shouldSendGreeterReply,
};
