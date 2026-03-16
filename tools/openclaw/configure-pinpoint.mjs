import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const home = os.homedir();
const repoRoot = path.resolve(process.cwd());
const openClawRoot = path.join(home, ".openclaw");
const configPath = path.join(openClawRoot, "openclaw.json");
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

function toBool(value) {
  return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

if (!fs.existsSync(configPath)) {
  throw new Error(`OpenClaw config not found at ${configPath}. Run OpenClaw onboarding first.`);
}

const envFile = findEnvFile();
const env = envFile ? parseEnvFile(envFile) : {};
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

config.agents = config.agents || {};
config.agents.defaults = config.agents.defaults || {};
config.agents.defaults.workspace = path.join(openClawRoot, "workspace");

config.plugins = config.plugins || {};
config.plugins.allow = Array.from(new Set([...(config.plugins.allow || []), "line"]));
config.plugins.entries = config.plugins.entries || {};

config.channels = config.channels || {};
config.channels.line = config.channels.line || {};

const lineToken = env.LINE_CHANNEL_ACCESS_TOKEN || "";
const lineSecret = env.LINE_CHANNEL_SECRET || "";
const lineAllowFrom = String(env.OPENCLAW_LINE_ALLOW_FROM || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

if (lineToken) config.channels.line.channelAccessToken = lineToken;
if (lineSecret) config.channels.line.channelSecret = lineSecret;
if (lineAllowFrom.length) config.channels.line.allowFrom = lineAllowFrom;

config.channels.line.dmPolicy = env.OPENCLAW_LINE_DM_POLICY || config.channels.line.dmPolicy || "allowlist";
config.channels.line.groupPolicy =
  env.OPENCLAW_LINE_GROUP_POLICY || config.channels.line.groupPolicy || "allowlist";
config.channels.line.textChunkLimit = Number(env.OPENCLAW_LINE_TEXT_CHUNK_LIMIT || 4200);

const lineReady = Boolean(lineToken && lineSecret);
const enableLine = toBool(env.OPENCLAW_ENABLE_LINE) && lineReady;

config.plugins.entries.line = {
  ...(config.plugins.entries.line || {}),
  enabled: enableLine,
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

console.log(`Configured OpenClaw at ${configPath}`);
console.log(`Environment source: ${envFile || "none found"}`);
console.log(`LINE credentials present: ${lineReady ? "yes" : "no"}`);
console.log(`LINE plugin enabled: ${enableLine ? "yes" : "no"}`);
