const fs = require("node:fs");
const path = require("node:path");

const { isEmailDeliveryEnabled, sendEmailViaResend, sendLinePushText } = require("./outbound");
const { sendCrmWebhook } = require("./lead-routing");

const repoRoot = path.resolve(process.cwd());
const configPath = path.join(repoRoot, "operations", "agent-os.config.json");
const queuePath = path.join(repoRoot, "operations", "campaign-queue.json");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isSet(value) {
  return Boolean(String(value || "").trim());
}

function buildReadiness() {
  return {
    email:
      isEmailDeliveryEnabled() &&
      isSet(process.env.RESEND_API_KEY) &&
      isSet(process.env.LEAD_FROM_EMAIL) &&
      isSet(process.env.LEAD_TO_EMAIL),
    lineOa: isSet(process.env.LINE_CHANNEL_ACCESS_TOKEN) && isSet(process.env.LINE_CHANNEL_SECRET),
    crmWebhook: isSet(process.env.CRM_WEBHOOK_URL),
    airtable:
      isSet(process.env.AIRTABLE_API_KEY) &&
      isSet(process.env.AIRTABLE_BASE_ID) &&
      isSet(process.env.AIRTABLE_TABLE_NAME),
    supabase:
      isSet(process.env.SUPABASE_URL) &&
      isSet(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      isSet(process.env.SUPABASE_TABLE_NAME),
    analytics:
      isSet(process.env.GA4_MEASUREMENT_ID) &&
      isSet(process.env.GA4_API_SECRET) &&
      isSet(process.env.META_PIXEL_ID) &&
      isSet(process.env.META_ACCESS_TOKEN),
  };
}

function buildDailyOpsReport() {
  const config = loadJson(configPath);
  const queue = loadJson(queuePath);
  const readiness = buildReadiness();
  const openPages = queue.pages.filter((item) => item.status !== "done").slice(0, 3);
  const openArticles = queue.blog.filter((item) => item.status !== "done").slice(0, 3);
  const openAutomations = queue.automation.filter((item) => item.status !== "done").slice(0, 3);

  return {
    type: "daily_ops_report",
    generatedAt: new Date().toISOString(),
    company: config.company,
    focus: {
      market: config.markets.primary,
      services: config.services.priority,
      promise: config.positioning.mainPromise,
    },
    readiness,
    queue: {
      pages: openPages,
      blog: openArticles,
      automation: openAutomations,
    },
  };
}

function buildTextDigest(report) {
  return [
    `Pinpoint Daily Ops`,
    `Time: ${report.generatedAt}`,
    `Market: ${report.focus.market}`,
    `Top services: ${report.focus.services.join(", ")}`,
    `Readiness: email=${report.readiness.email ? "yes" : "no"}, line=${report.readiness.lineOa ? "yes" : "no"}, crm=${report.readiness.crmWebhook ? "yes" : "no"}, analytics=${report.readiness.analytics ? "yes" : "no"}`,
    `Next pages: ${report.queue.pages.map((item) => item.title).join(" | ") || "-"}`,
    `Next articles: ${report.queue.blog.map((item) => item.title).join(" | ") || "-"}`,
    `Next automations: ${report.queue.automation.map((item) => item.title).join(" | ") || "-"}`,
  ].join("\n");
}

async function notifyDailyOpsReport(report) {
  const dailyOpsEnabled = String(process.env.DAILY_OPS_ENABLED || "").trim().toLowerCase();
  const allowDeliveries = ["1", "true", "yes", "on", "enabled"].includes(dailyOpsEnabled);
  if (!allowDeliveries) {
    return {
      email: { sent: false, reason: "daily_ops_disabled" },
      line: { sent: false, reason: "daily_ops_disabled" },
      crm: { sent: false, reason: "daily_ops_disabled" },
    };
  }

  const textDigest = buildTextDigest(report);
  const htmlDigest = `<pre>${textDigest}</pre>`;

  const [email, line, crm] = await Promise.all([
    sendEmailViaResend({
      subject: "[Pinpoint Daily Ops] Daily automation brief",
      textBody: textDigest,
      htmlBody: htmlDigest,
    }),
    sendLinePushText(textDigest.slice(0, 4500)),
    sendCrmWebhook(report),
  ]);

  return {
    email,
    line,
    crm,
  };
}

module.exports = {
  buildDailyOpsReport,
  notifyDailyOpsReport,
};
