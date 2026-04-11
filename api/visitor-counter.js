const { json, toJsonBody, toText } = require("./_lib/analytics");
const {
  isVisitorCounterEnabled,
  incrementVisitorCount,
  normalizePath,
  readVisitorCount,
} = require("./_lib/visitor-counter");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const pagePath = normalizePath(toText(req.query?.path));
    const result = await readVisitorCount({ pagePath });

    return json(res, result.status || 200, {
      ok: Boolean(result.ok),
      enabled: isVisitorCounterEnabled(),
      reason: result.reason || "",
      pagePath,
      totals: result.totals || {
        siteViews: 0,
        siteUniqueVisitors: 0,
        pageViews: 0,
        pageUniqueVisitors: 0,
      },
    });
  }

  if (req.method === "POST") {
    const body = toJsonBody(req.body);
    const result = await incrementVisitorCount({
      pagePath: toText(body.pagePath),
      visitorId: toText(body.visitorId),
    });

    return json(res, result.status || 200, {
      ok: Boolean(result.ok),
      enabled: isVisitorCounterEnabled(),
      reason: result.reason || "",
      pagePath: result.pagePath || normalizePath(toText(body.pagePath)),
      totals: result.totals || {
        siteViews: 0,
        siteUniqueVisitors: 0,
        pageViews: 0,
        pageUniqueVisitors: 0,
      },
    });
  }

  return json(res, 405, { ok: false, error: "method_not_allowed" });
};
