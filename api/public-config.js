const { json } = require("./_lib/analytics");
const { isLeadNotificationEmailEnabled } = require("./_lib/outbound");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  return json(res, 200, {
    ok: true,
    config: {
      lineOaUrl: "https://lin.ee/58aU8oE",
      ga4MeasurementId: String(process.env.GA4_MEASUREMENT_ID || "").trim(),
      googleAdsId: String(process.env.GOOGLE_ADS_ID || "").trim(),
      googleAdsLeadLabel: String(process.env.GOOGLE_ADS_LEAD_LABEL || "").trim(),
      metaPixelId: String(process.env.META_PIXEL_ID || "").trim(),
      emailLeadEnabled: Boolean(
        isLeadNotificationEmailEnabled() &&
          process.env.RESEND_API_KEY &&
          process.env.LEAD_FROM_EMAIL &&
          process.env.LEAD_TO_EMAIL
      ),
    },
  });
};
