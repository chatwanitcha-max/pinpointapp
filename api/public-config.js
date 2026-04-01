const { json } = require("./_lib/analytics");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  return json(res, 200, {
    ok: true,
    config: {
      lineOaUrl: "https://lin.ee/58aU8oE",
      ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || "",
      googleAdsId: process.env.GOOGLE_ADS_ID || "",
      googleAdsLeadLabel: process.env.GOOGLE_ADS_LEAD_LABEL || "",
      metaPixelId: process.env.META_PIXEL_ID || "",
      emailLeadEnabled: Boolean(process.env.RESEND_API_KEY && process.env.LEAD_FROM_EMAIL && process.env.LEAD_TO_EMAIL),
    },
  });
};
