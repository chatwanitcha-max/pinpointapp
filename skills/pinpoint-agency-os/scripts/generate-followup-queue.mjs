import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const inboxPath = path.join(repoRoot, "operations", "lead-inbox.json");
const samplePath = path.join(repoRoot, "operations", "lead-inbox.sample.json");
const playbookPath = path.join(repoRoot, "operations", "follow-up-playbook.json");
const outputPath = path.join(repoRoot, "operations", "runtime", "follow-up-queue.json");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertNoCorruption(value, label) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/\?{4,}/.test(text) || text.includes("\uFFFD") || (text.match(/เธ/g) || []).length >= 4) {
    throw new Error(`${label} contains suspicious text-encoding artifacts`);
  }
}

function pickMessages(playbook, language, priority) {
  const langKey = language === "th" ? "Thai" : "English";
  const priorityKey = priority === "hot" ? "hotLead" : priority === "warm" ? "warmLead" : "coldLead";
  return playbook[`${priorityKey}${langKey}`] || [];
}

const inputPath = fs.existsSync(inboxPath) ? inboxPath : samplePath;
const inbox = loadJson(inputPath);
const playbook = loadJson(playbookPath);
assertNoCorruption(playbook, "follow-up playbook");
const queue = (Array.isArray(inbox.leads) ? inbox.leads : []).map((lead) => ({
  leadId: lead.leadId,
  name: lead.fullName,
  serviceNeed: lead.serviceNeed,
  priority: lead.priority || "cold",
  language: lead.language || "th",
  nextAction: lead.nextAction || "",
  primaryAgent: lead.primaryAgent || "salesFollowUp",
  humanApprovalRequired: Boolean(lead.humanApprovalRequired),
  draftReplies: pickMessages(playbook, lead.language || "th", lead.priority || "cold"),
}));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      source: path.basename(inputPath),
      generatedAt: new Date().toISOString(),
      items: queue,
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Wrote ${outputPath}`);
