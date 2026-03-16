const crypto = require("crypto");

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toJsonBody(input) {
  if (!input) return {};
  if (typeof input === "object") return input;
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  return {};
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function sha256(value) {
  const normalized = toText(value).toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function buildClientMeta(req, body) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : toText(forwardedFor).split(",")[0].trim();

  return {
    clientId: toText(body.gaClientId),
    fbp: toText(body.fbp),
    fbc: toText(body.fbc),
    pageUrl: toText(body.pageUrl),
    userAgent: toText(body.userAgent) || toText(req.headers["user-agent"]),
    ip
  };
}

async function sendGa4Event({ name, params, clientId }) {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) {
    return { sent: false, reason: "missing_ga4_env" };
  }

  const payload = {
    client_id: clientId || `server.${Date.now()}`,
    events: [{ name, params }]
  };

  const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    measurementId
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return { sent: response.ok, status: response.status };
}

async function sendMetaEvent({
  eventName,
  eventId,
  pageUrl,
  userAgent,
  ip,
  fbp,
  fbc,
  email,
  phone,
  customData
}) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    return { sent: false, reason: "missing_meta_env" };
  }

  const userData = {
    em: email ? [sha256(email)] : undefined,
    ph: phone ? [sha256(phone)] : undefined,
    client_user_agent: userAgent || undefined,
    client_ip_address: ip || undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined
  };

  const cleanedUserData = Object.fromEntries(
    Object.entries(userData).filter(([, value]) => value !== undefined)
  );

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: eventId,
        event_source_url: pageUrl || undefined,
        user_data: cleanedUserData,
        custom_data: customData || undefined
      }
    ]
  };

  const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    pixelId
  )}/events?access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return { sent: response.ok, status: response.status };
}

module.exports = {
  toText,
  toJsonBody,
  json,
  sha256,
  buildClientMeta,
  sendGa4Event,
  sendMetaEvent
};
