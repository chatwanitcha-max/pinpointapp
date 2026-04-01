import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const configPath = path.join(repoRoot, "operations", "agent-os.config.json");
const queuePath = path.join(repoRoot, "operations", "campaign-queue.json");
const outputPath = path.join(repoRoot, "operations", "daily-growth-brief.md");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function formatList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

const config = loadJson(configPath);
const queue = loadJson(queuePath);

const today = new Date().toISOString().slice(0, 10);
const nextPages = queue.pages.filter((item) => item.status !== "done").slice(0, 3);
const nextArticles = queue.blog.filter((item) => item.status !== "done").slice(0, 3);
const nextAutomations = queue.automation.filter((item) => item.status !== "done").slice(0, 3);

const markdown = `# Pinpoint Daily Growth Brief

Date: ${today}
Domain: ${config.company.domain}
Primary market: ${config.markets.primary}

## Today's Revenue Focus

- Core services to push: ${config.services.priority.join(", ")}
- Ideal customers to target: ${config.icp.primary.join(", ")}
- Main growth promise: ${config.positioning.mainPromise}

## Growth Strategist

Priority pages:
${formatList(nextPages.map((item) => `${item.title} (${item.goal})`))}

Priority articles:
${formatList(nextArticles.map((item) => `${item.title} -> CTA to ${item.supports}`))}

## Sales Follow-up

- Reply to every hot lead within ${config.responseTargets.hotLeadMinutes} minutes during business hours.
- For warm leads, send a checklist or clarifying question within ${config.responseTargets.warmLeadHours} hours.
- Use short, human replies focused on the exact service need.

## Client Success

- Check missing-document reminders for accounting, DBD, visa, and permit cases.
- Confirm whether any active client needs a Thai or English update today.
- Escalate any case involving interpretation, deadlines, or government filing judgment.

## Automation Build Queue

${formatList(nextAutomations.map((item) => `${item.title} (${item.goal})`))}

## Compliance Check

- Review one service claim before publishing.
- Verify one official government link group if a related page or article is being edited.
- Do not let AI quote fees, promise approvals, or give case-specific tax/legal positions without human review.

## Operator Notes

- Keep Thai-first wording natural and service-focused.
- Sell the service, not the website.
- Prefer practical trust signals: location, responsiveness, process clarity, and official references.
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, markdown, "utf8");

console.log(`Wrote ${outputPath}`);
