const { json, toText } = require("./_lib/analytics");
const { buildDailyOpsReport, notifyDailyOpsReport } = require("./_lib/daily-ops");

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
  const deliveries = await notifyDailyOpsReport(report);

  return json(res, 200, {
    ok: true,
    report,
    deliveries,
  });
};
