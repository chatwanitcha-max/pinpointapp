const {
  toText,
  toJsonBody,
  json,
  buildClientMeta,
  sendGa4Event,
  sendMetaEvent
} = require("./_lib/analytics");
const {
  buildRouting,
  buildLeadPayload,
  sendCrmWebhook,
  sendOpenClawWebhook,
  sendAirtableLead,
} = require("./_lib/lead-routing");

function buildLeadMessage(lead, routing) {
  return [
    "New Lead - Pinpoint Accounting",
    `Lead ID: ${lead.leadId}`,
    `Name: ${lead.fullName}`,
    `Business: ${lead.businessName || "-"}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email || "-"}`,
    `Service: ${lead.serviceNeed || "-"}`,
    `Monthly Revenue: ${lead.revenueRange || "-"}`,
    `Preferred Contact: ${lead.preferredContact || "-"}`,
    `Language: ${routing.language || "-"}`,
    `Urgency: ${routing.urgency || "-"}`,
    `Priority: ${routing.priority || "-"}`,
    `Lead Score: ${routing.leadScore ?? "-"}`,
    `Notes: ${lead.notes || "-"}`,
    `UTM Source: ${lead.utmSource || "-"}`,
    `UTM Medium: ${lead.utmMedium || "-"}`,
    `UTM Campaign: ${lead.utmCampaign || "-"}`,
    `Page URL: ${lead.pageUrl || "-"}`
  ].join("\n");
}

async function sendEmailViaResend({ subject, htmlBody, textBody }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LEAD_FROM_EMAIL;
  const toEmail = process.env.LEAD_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    return { sent: false, reason: "missing_email_env" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html: htmlBody,
      text: textBody
    })
  });

  return { sent: response.ok, status: response.status };
}

async function sendLineWebhook(payload) {
  const webhookUrl = process.env.LINE_OA_WEBHOOK_URL;
  if (!webhookUrl) return { sent: false, reason: "missing_line_webhook" };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return { sent: response.ok, status: response.status };
}

async function sendLinePush(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_TARGET_ID;

  if (!token || !targetId) {
    return { sent: false, reason: "missing_line_push_env" };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: targetId,
      messages: [{ type: "text", text }]
    })
  });

  return { sent: response.ok, status: response.status };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = toJsonBody(req.body);

  if (toText(body.website)) {
    return json(res, 200, { ok: true, ignored: true });
  }

  const fullName = toText(body.fullName);
  const phone = toText(body.phone);
  const email = toText(body.email);

  if (!fullName || !phone) {
    return json(res, 400, { ok: false, error: "missing_required_fields" });
  }

  const leadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const lead = {
    leadId,
    fullName,
    phone,
    email,
    businessName: toText(body.businessName),
    serviceNeed: toText(body.serviceNeed),
    revenueRange: toText(body.revenueRange),
    preferredContact: toText(body.preferredContact),
    notes: toText(body.notes),
    utmSource: toText(body.utmSource),
    utmMedium: toText(body.utmMedium),
    utmCampaign: toText(body.utmCampaign),
    pageUrl: toText(body.pageUrl)
  };

  const clientMeta = buildClientMeta(req, body);
  const routing = buildRouting(lead);
  const leadMessage = buildLeadMessage(lead, routing);
  const intakePayload = buildLeadPayload({
    source: "website_form",
    lead,
    clientMeta,
    routing,
  });

  const emailResult = await sendEmailViaResend({
    subject: `[Pinpoint Lead] ${lead.fullName} (${lead.phone})`,
    textBody: leadMessage,
    htmlBody: `<pre>${leadMessage}</pre>`
  });

  const [
    lineWebhookResult,
    linePushResult,
    crmResult,
    airtableResult,
    openClawResult,
  ] = await Promise.all([
    sendLineWebhook({ type: "new_lead", lead }),
    sendLinePush(leadMessage.slice(0, 4500)),
    sendCrmWebhook(intakePayload),
    sendAirtableLead(intakePayload),
    sendOpenClawWebhook(intakePayload),
  ]);

  const ga4Result = await sendGa4Event({
    name: "generate_lead",
    clientId: clientMeta.clientId,
    params: {
      lead_id: leadId,
      contact_method: lead.preferredContact || "unknown",
      service_need: lead.serviceNeed || "not_set",
      currency: "THB",
      value: 1
    }
  });

  const metaResult = await sendMetaEvent({
    eventName: "Lead",
    eventId: leadId,
    pageUrl: clientMeta.pageUrl,
    userAgent: clientMeta.userAgent,
    ip: clientMeta.ip,
    fbp: clientMeta.fbp,
    fbc: clientMeta.fbc,
    email: lead.email,
    phone: lead.phone,
    customData: {
      service_need: lead.serviceNeed || undefined
    }
  });

  return json(res, 200, {
    ok: true,
    leadId,
    channels: {
      email: emailResult,
      lineWebhook: lineWebhookResult,
      linePush: linePushResult,
      crmWebhook: crmResult,
      airtable: airtableResult,
      openclaw: openClawResult,
    },
    conversions: {
      ga4: ga4Result,
      meta: metaResult
    },
    routing,
  });
};
