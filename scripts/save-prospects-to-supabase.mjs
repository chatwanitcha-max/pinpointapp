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

const envFile = findEnvFile();
const env = envFile ? parseEnvFile(envFile) : {};
const supabaseUrl = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const prospectsPath = path.join(repoRoot, "operations", "prospects-sample.json");
const prospects = JSON.parse(fs.readFileSync(prospectsPath, "utf8"));

const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/prospects`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
    "Content-Profile": env.SUPABASE_SCHEMA || "public",
  },
  body: JSON.stringify(prospects),
});

const body = await response.text();
console.log(JSON.stringify({ status: response.status, ok: response.ok, body: body.slice(0, 1200) }, null, 2));
