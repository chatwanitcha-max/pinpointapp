import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const envCandidates = [".env.local.txt", ".env.local"];
const configPath = path.join(repoRoot, "operations", "agent-os.config.json");

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

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
    if (fs.existsSync(absolutePath)) return absolutePath;
  }
  return null;
}

function isSet(value) {
  return Boolean(String(value || "").trim());
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

const envFile = findEnvFile();
const env = envFile ? parseEnvFile(envFile) : {};
const config = loadConfig();

const readiness = {
  company: config.company.name,
  domain: config.company.domain,
  envFile,
  agents: {
    growthStrategist: {
      ready: isSet(env.GA4_MEASUREMENT_ID) && isSet(env.GA4_API_SECRET),
      missing: ["GA4_MEASUREMENT_ID", "GA4_API_SECRET"].filter((key) => !isSet(env[key])),
    },
    leadIntake: {
      ready:
        (
          isSet(env.CRM_WEBHOOK_URL) ||
          (isSet(env.AIRTABLE_API_KEY) && isSet(env.AIRTABLE_BASE_ID) && isSet(env.AIRTABLE_TABLE_NAME)) ||
          (isSet(env.SUPABASE_URL) && isSet(env.SUPABASE_SERVICE_ROLE_KEY) && isSet(env.SUPABASE_TABLE_NAME))
        ) &&
        (isSet(env.RESEND_API_KEY) || isSet(env.LINE_CHANNEL_ACCESS_TOKEN) || isSet(env.OPENCLAW_WEBHOOK_URL)),
      missing: [
        ...(!isSet(env.CRM_WEBHOOK_URL) &&
        !(isSet(env.AIRTABLE_API_KEY) && isSet(env.AIRTABLE_BASE_ID) && isSet(env.AIRTABLE_TABLE_NAME)) &&
        !(isSet(env.SUPABASE_URL) && isSet(env.SUPABASE_SERVICE_ROLE_KEY) && isSet(env.SUPABASE_TABLE_NAME))
          ? ["CRM_WEBHOOK_URL or AIRTABLE_* or SUPABASE_*"]
          : []),
        ...(!isSet(env.RESEND_API_KEY) && !isSet(env.LINE_CHANNEL_ACCESS_TOKEN) && !isSet(env.OPENCLAW_WEBHOOK_URL)
          ? ["RESEND_API_KEY or LINE_CHANNEL_ACCESS_TOKEN or OPENCLAW_WEBHOOK_URL"]
          : []),
      ],
    },
    salesFollowUp: {
      ready:
        isSet(env.CRM_WEBHOOK_URL) ||
        (isSet(env.AIRTABLE_API_KEY) && isSet(env.AIRTABLE_BASE_ID) && isSet(env.AIRTABLE_TABLE_NAME)) ||
        (isSet(env.SUPABASE_URL) && isSet(env.SUPABASE_SERVICE_ROLE_KEY) && isSet(env.SUPABASE_TABLE_NAME)),
      missing: ["CRM_WEBHOOK_URL or AIRTABLE_* or SUPABASE_*"].filter(
        () =>
          !isSet(env.CRM_WEBHOOK_URL) &&
          !(isSet(env.AIRTABLE_API_KEY) && isSet(env.AIRTABLE_BASE_ID) && isSet(env.AIRTABLE_TABLE_NAME)) &&
          !(isSet(env.SUPABASE_URL) && isSet(env.SUPABASE_SERVICE_ROLE_KEY) && isSet(env.SUPABASE_TABLE_NAME))
      ),
    },
    clientSuccess: {
      ready: isSet(env.LINE_CHANNEL_ACCESS_TOKEN) || isSet(env.RESEND_API_KEY),
      missing: ["LINE_CHANNEL_ACCESS_TOKEN or RESEND_API_KEY"].filter(
        () => !isSet(env.LINE_CHANNEL_ACCESS_TOKEN) && !isSet(env.RESEND_API_KEY)
      ),
    },
    complianceReviewer: {
      ready: true,
      missing: [],
    },
    releaseOperator: {
      ready: isSet(env["2ndVERCELTOKEN"]) || isSet(env.VERCEL_TOKEN),
      missing: ["2ndVERCELTOKEN or VERCEL_TOKEN"].filter(
        () => !isSet(env["2ndVERCELTOKEN"]) && !isSet(env.VERCEL_TOKEN)
      ),
    },
  },
};

readiness.allReady = Object.values(readiness.agents).every((agent) => agent.ready);
console.log(JSON.stringify(readiness, null, 2));
