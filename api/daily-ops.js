const { json, toText } = require("./_lib/analytics");
const { buildDailyOpsReport, notifyDailyOpsReport } = require("./_lib/daily-ops");

function isDailyOpsEnabled() {
  const raw = String(process.env.DAILY_OPS_ENABLED || "").trim().toLowerCase();
  return ["1", "true", "yes", "on", "enabled"].includes(raw);
}

function isAuthorized(req) {
  const authHeader = toText(req.headers.authorization);
  const userAgent = toText(req.headers["user-agent"]);
  const cronSecret = toText(process.env.CRON_SECRET);

  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  return /vercel-cron\/1\.0/i.test(userAgent);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { ok: false, error: "unauthorized" });
  }

  const report = buildDailyOpsReport();

  // Safety kill-switch: do not send anything unless explicitly enabled.
  if (!isDailyOpsEnabled()) {
    return json(res, 200, {
      ok: true,
      disabled: true,
      reason: "daily_ops_disabled",
      report,
      deliveries: {
        email: { sent: false, reason: "daily_ops_disabled" },
        line: { sent: false, reason: "daily_ops_disabled" },
        crm: { sent: false, reason: "daily_ops_disabled" },
      },
    });
  }

  const deliveries = await notifyDailyOpsReport(report);

  return json(res, 200, {
    ok: true,
    report,
    deliveries,
  });
};
