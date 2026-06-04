const { json } = require("./_lib/analytics");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  return json(res, 200, {
    ok: true,
    service: "pinpoint-public-api",
    status: "available",
    time: new Date().toISOString(),
    canonical: "https://pinpointaccountingservice.com",
    documentation: "https://pinpointaccountingservice.com/.well-known/api-docs.md",
    catalog: "https://pinpointaccountingservice.com/.well-known/api-catalog",
  });
};
