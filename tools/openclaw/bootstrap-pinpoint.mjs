import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const home = os.homedir();
const repoRoot = path.resolve(process.cwd());
const openClawRoot = path.join(home, ".openclaw");
const configPath = path.join(openClawRoot, "openclaw.json");
const workspaceDir = path.join(openClawRoot, "workspace");
const skillsDir = path.join(workspaceDir, "skills");
const sourceSkillDir = path.join(repoRoot, "skills", "pinpoint-web-ops");
const targetSkillDir = path.join(skillsDir, "pinpoint-web-ops");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

if (!fs.existsSync(configPath)) {
  throw new Error(`OpenClaw config not found at ${configPath}. Run 'openclaw onboard' first.`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
config.agents = config.agents || {};
config.agents.defaults = config.agents.defaults || {};
config.agents.defaults.workspace = workspaceDir;

config.plugins = config.plugins || {};
config.plugins.allow = Array.from(new Set([...(config.plugins.allow || []), "line"]));
config.plugins.entries = config.plugins.entries || {};
config.plugins.entries.line = {
  ...(config.plugins.entries.line || {}),
  enabled: false,
};

ensureDir(skillsDir);
copyDir(sourceSkillDir, targetSkillDir);
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

console.log(`Skill synced to ${targetSkillDir}`);
console.log(`OpenClaw config updated at ${configPath}`);
console.log("LINE plugin left disabled by default until credentials are ready.");
