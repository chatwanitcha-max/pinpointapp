const { toText } = require("./analytics");

const THAI_RE = /[\u0E00-\u0E7F]/u;
const URGENT_PATTERNS = [
  /urgent/i,
  /asap/i,
  /immediately/i,
  /within\s+\d+\s*(day|days|hour|hours|week|weeks)/i,
  /ด่วน/u,
  /เร่ง/u,
  /ทันที/u,
  /วันนี้/u,
  /พรุ่งนี้/u,
];

function detectLanguage(lead = {}) {
  const pageUrl = toText(lead.pageUrl);
  if (pageUrl.includes("lang=en")) return "en";
  if (pageUrl.includes("lang=th")) return "th";

  const combined = [
    lead.fullName,
    lead.businessName,
    lead.notes,
    lead.serviceNeed,
  ]
    .map(toText)
    .join(" ");

  return THAI_RE.test(combined) ? "th" : "en";
}

function detectUrgency(lead = {}) {
  const combined = [
    lead.notes,
    lead.serviceNeed,
    lead.pageUrl,
  ]
    .map(toText)
    .join(" ");

  if (URGENT_PATTERNS.some((pattern) => pattern.test(combined))) {
    return "high";
  }

  if (/visa|permit|license|close|dissolution|work permit/i.test(combined)) {
    return "medium";
  }

  return "normal";
}

function mapServiceBucket(serviceNeed = "") {
  const value = toText(serviceNeed).toLowerCase();
  if (!value) return "general";
  if (value.includes("account") || value.includes("tax")) return "accounting-tax";
  if (value.includes("registration") || value.includes("dbd")) return "corporate-dbd";
  if (value.includes("visa") || value.includes("permit") || value.includes("license")) {
    return "visa-license";
  }
  if (value.includes("close") || value.includes("dissolution")) return "company-dissolution";
  return "general";
}

function scoreLead(lead = {}) {
  let score = 0;

  if (toText(lead.fullName)) score += 10;
  if (toText(lead.phone)) score += 20;
  if (toText(lead.email)) score += 10;
  if (toText(lead.businessName)) score += 10;
  if (toText(lead.serviceNeed)) score += 15;
  if (toText(lead.revenueRange)) score += 5;
  if (toText(lead.preferredContact)) score += 5;
  if (toText(lead.utmCampaign)) score += 5;
  if (toText(lead.notes).length >= 25) score += 10;
  if (detectUrgency(lead) === "high") score += 10;

  return Math.min(score, 100);
}

function priorityFromScore(score, urgency) {
  if (urgency === "high" || score >= 75) return "hot";
  if (urgency === "medium" || score >= 45) return "warm";
  return "cold";
}

function buildRouting(lead = {}) {
  const language = detectLanguage(lead);
  const urgency = detectUrgency(lead);
  const leadScore = scoreLead(lead);
  const priority = priorityFromScore(leadScore, urgency);
  const serviceBucket = mapServiceBucket(lead.serviceNeed);

  return {
    language,
    urgency,
    leadScore,
    priority,
    serviceBucket,
  };
}

function buildLeadPayload({ source, lead, clientMeta, routing, lineEvent }) {
  return {
    type: source === "line_oa" ? "line_inbound" : "website_lead",
    source,
    receivedAt: new Date().toISOString(),
    routing,
    lead: lead || null,
    lineEvent: lineEvent || null,
    clientMeta: clientMeta || {},
  };
}

async function postJson(url, payload, headers = {}) {
  if (!url) {
    return { sent: false, reason: "missing_url" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  return { sent: response.ok, status: response.status };
}

async function sendCrmWebhook(payload) {
  const url = process.env.CRM_WEBHOOK_URL;
  const token = process.env.CRM_WEBHOOK_TOKEN;
  return postJson(
    url,
    payload,
    token ? { Authorization: `Bearer ${token}` } : {}
  );
}

async function sendOpenClawWebhook(payload) {
  const url = process.env.OPENCLAW_WEBHOOK_URL;
  const token = process.env.OPENCLAW_WEBHOOK_TOKEN;
  return postJson(
    url,
    payload,
    token ? { "X-OpenClaw-Token": token } : {}
  );
}

async function sendAirtableLead(payload) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !table) {
    return { sent: false, reason: "missing_airtable_env" };
  }

  const lead = payload.lead || {};
  const routing = payload.routing || {};
  const response = await fetch(
    `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              "Lead ID": toText(lead.leadId),
              Name: toText(lead.fullName),
              Phone: toText(lead.phone),
              Email: toText(lead.email),
              Business: toText(lead.businessName),
              Service: toText(lead.serviceNeed),
              Revenue: toText(lead.revenueRange),
              "Preferred Contact": toText(lead.preferredContact),
              Language: toText(routing.language),
              Urgency: toText(routing.urgency),
              Priority: toText(routing.priority),
              "Lead Score": Number(routing.leadScore || 0),
              Source: toText(payload.source),
              Notes: toText(lead.notes || payload.lineEvent?.text),
              "Page URL": toText(lead.pageUrl),
            },
          },
        ],
      }),
    }
  );

  return { sent: response.ok, status: response.status };
}

module.exports = {
  detectLanguage,
  detectUrgency,
  buildRouting,
  buildLeadPayload,
  sendCrmWebhook,
  sendOpenClawWebhook,
  sendAirtableLead,
};
