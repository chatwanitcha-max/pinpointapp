const crypto = require("crypto");

const { toText, toJsonBody, json, buildClientMeta } = require("./_lib/analytics");
const {
  buildRouting,
  buildLeadPayload,
  sendCrmWebhook,
  sendOpenClawWebhook,
  sendAirtableLead,
} = require("./_lib/lead-routing");

function verifyLineSignature(rawBody, channelSecret, signature) {
  if (!channelSecret || !signature || !rawBody) return false;
  const digest = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function normalizeLineEvent(event = {}) {
  const source = event.source || {};
  const message = event.message || {};

  return {
    eventType: toText(event.type),
    replyToken: toText(event.replyToken),
    messageType: toText(message.type),
    text: toText(message.text),
    sourceType: toText(source.type),
    userId: toText(source.userId),
    groupId: toText(source.groupId),
    roomId: toText(source.roomId),
    timestamp:
      typeof event.timestamp === "number"
        ? new Date(event.timestamp).toISOString()
        : new Date().toISOString(),
  };
}

async function sendLineReply(replyToken, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken || !text) {
    return { sent: false, reason: "missing_line_reply_env" };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  return { sent: response.ok, status: response.status };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const rawBody =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const body = toJsonBody(req.body);
  const signature = toText(req.headers["x-line-signature"]);
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (channelSecret && signature && !verifyLineSignature(rawBody, channelSecret, signature)) {
    return json(res, 401, { ok: false, error: "invalid_line_signature" });
  }

  const events = Array.isArray(body.events) ? body.events : [];
  const normalizedEvents = events.map(normalizeLineEvent).filter((event) => event.eventType);
  const primaryEvent = normalizedEvents[0] || null;
  const lead = primaryEvent
    ? {
        leadId: `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        fullName: primaryEvent.userId || "LINE user",
        businessName: "",
        phone: "",
        email: "",
        serviceNeed: "line_oa_inquiry",
        revenueRange: "",
        preferredContact: "line",
        notes: primaryEvent.text,
        pageUrl: "line://oa/inbound",
      }
    : null;

  const clientMeta = buildClientMeta(req, {
    pageUrl: "line://oa/inbound",
    userAgent: req.headers["user-agent"] || "",
  });
  const routing = buildRouting(lead || {});
  const intakePayload = buildLeadPayload({
    source: "line_oa",
    lead,
    clientMeta,
    routing,
    lineEvent: primaryEvent,
  });

  const [crmResult, airtableResult, openClawResult, autoReplyResult] = await Promise.all([
    sendCrmWebhook(intakePayload),
    sendAirtableLead(intakePayload),
    sendOpenClawWebhook(intakePayload),
    sendLineReply(
      primaryEvent?.replyToken,
      toText(process.env.LINE_AUTO_REPLY_TEXT) ||
        "ขอบคุณที่ติดต่อ Pinpoint ทีมงานได้รับข้อความแล้ว และจะตอบกลับโดยเร็วที่สุด"
    ),
  ]);

  return json(res, 200, {
    ok: true,
    receivedEvents: normalizedEvents.length,
    routing,
    channels: {
      crmWebhook: crmResult,
      airtable: airtableResult,
      openclaw: openClawResult,
      lineReply: autoReplyResult,
    },
  });
};
