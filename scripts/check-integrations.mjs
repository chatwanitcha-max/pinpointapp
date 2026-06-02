import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const envCandidates = [".env.local.txt", ".env.local"];

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    return env;
  }

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function findEnvFile() {
  for (const candidate of envCandidates) {
    const absolutePath = path.join(repoRoot, candidate);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }
  return null;
}

function isSet(value) {
  return Boolean(String(value || "").trim());
}

const envFile = findEnvFile();
const env = envFile ? parseEnvFile(envFile) : {};

const status = {
  envFile: envFile || null,
  email: {
    ready: isSet(env.RESEND_API_KEY) && isSet(env.LEAD_FROM_EMAIL) && isSet(env.LEAD_TO_EMAIL),
    missing: ["RESEND_API_KEY", "LEAD_FROM_EMAIL", "LEAD_TO_EMAIL"].filter((key) => !isSet(env[key])),
  },
  lineOa: {
    ready: isSet(env.LINE_CHANNEL_ACCESS_TOKEN) && isSet(env.LINE_CHANNEL_SECRET),
    missing: ["LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_SECRET"].filter((key) => !isSet(env[key])),
  },
  crmWebhook: {
    ready: isSet(env.CRM_WEBHOOK_URL),
    missing: ["CRM_WEBHOOK_URL"].filter((key) => !isSet(env[key])),
  },
  airtable: {
    ready:
      isSet(env.AIRTABLE_API_KEY) &&
      isSet(env.AIRTABLE_BASE_ID) &&
      isSet(env.AIRTABLE_TABLE_NAME),
    missing: ["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID", "AIRTABLE_TABLE_NAME"].filter(
      (key) => !isSet(env[key])
    ),
  },
  supabase: {
    ready:
      isSet(env.SUPABASE_URL) &&
      isSet(env.SUPABASE_SERVICE_ROLE_KEY) &&
      isSet(env.SUPABASE_TABLE_NAME),
    missing: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_TABLE_NAME"].filter(
      (key) => !isSet(env[key])
    ),
  },
  analytics: {
    ready:
      isSet(env.GA4_MEASUREMENT_ID) &&
      isSet(env.GA4_API_SECRET) &&
      isSet(env.META_PIXEL_ID) &&
      isSet(env.META_ACCESS_TOKEN),
    missing: ["GA4_MEASUREMENT_ID", "GA4_API_SECRET", "META_PIXEL_ID", "META_ACCESS_TOKEN"].filter(
      (key) => !isSet(env[key])
    ),
  },
};

status.overallReady = Object.entries(status)
  .filter(([key]) => key !== "envFile" && key !== "overallReady")
  .every(([, value]) => value.ready);

console.log(JSON.stringify(status, null, 2));
