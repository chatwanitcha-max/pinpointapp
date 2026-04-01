import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const envCandidates = [".env.local.txt", ".env.local"];

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function findEnvFile() {
  for (const candidate of envCandidates) {
    const absolutePath = path.join(repoRoot, candidate);
    if (fs.existsSync(absolutePath)) return absolutePath;
  }
  return null;
}

function normalizeQuestionText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/[!?.,;:()[\]{}<>\"'`~@#$%^&*_+=\\/|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const envFile = findEnvFile();
const env = envFile ? parseEnvFile(envFile) : {};
const supabaseUrl = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const table = env.SUPABASE_TABLE_NAME || "leads";
const schema = env.SUPABASE_SCHEMA || "public";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const endpoint =
  `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/${encodeURIComponent(table)}` +
  "?select=lead_id,received_at,source,notes,raw_payload,routing,line_event" +
  "&source=eq.line_oa&order=received_at.desc&limit=1000";

const response = await fetch(endpoint, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    "Content-Profile": schema,
  },
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Supabase request failed: ${response.status} ${body.slice(0, 800)}`);
  process.exit(1);
}

const rows = await response.json();
const dataset = (Array.isArray(rows) ? rows : [])
  .map((row) => {
    const research = row?.raw_payload?.research || {};
    const question = String(research.questionText || row?.notes || "").trim();
    if (!question) return null;

    return {
      leadId: String(row?.lead_id || ""),
      receivedAt: String(row?.received_at || ""),
      language: String(research.language || row?.routing?.language || "th"),
      serviceBucket: String(research.serviceBucket || row?.routing?.serviceBucket || "general"),
      intentKey: String(research.intentKey || row?.raw_payload?.lineIntentKey || "general"),
      shouldReview: Boolean(research.shouldReview),
      confidence: String(research.confidence || row?.raw_payload?.replyAnalysis?.confidence || ""),
      topMatchId: String(research.topMatchId || ""),
      normalizedQuestion: String(research.normalizedQuestion || normalizeQuestionText(question)),
      question,
      currentReply: String(row?.raw_payload?.lineReplyText || ""),
    };
  })
  .filter(Boolean);

const runtimeDir = path.join(repoRoot, "operations", "runtime");
fs.mkdirSync(runtimeDir, { recursive: true });
const outputPath = path.join(runtimeDir, "line-faq-research-dataset.jsonl");
fs.writeFileSync(
  outputPath,
  dataset.map((item) => JSON.stringify(item)).join("\n") + (dataset.length ? "\n" : ""),
  "utf8"
);

console.log(JSON.stringify({ exported: dataset.length, outputPath }, null, 2));
