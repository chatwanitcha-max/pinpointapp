const { toText } = require("./analytics");
const { postJson } = require("./outbound");

const THAI_RE = /[\u0E00-\u0E7F]/u;
const URGENT_PATTERNS = [
  /urgent/i,
  /asap/i,
  /immediately/i,
  /within\s+\d+\s*(day|days|hour|hours|week|weeks)/i,
  /\u0e14\u0e48\u0e27\u0e19/u,
  /\u0e40\u0e23\u0e48\u0e07/u,
  /\u0e17\u0e31\u0e19\u0e17\u0e35/u,
  /\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49/u,
  /\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49/u,
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

  if (
    value.includes("account") ||
    value.includes("tax") ||
    value.includes("\u0e1a\u0e31\u0e0d\u0e0a\u0e35") ||
    value.includes("\u0e20\u0e32\u0e29\u0e35") ||
    value.includes("vat") ||
    value.includes("payroll")
  ) {
    return "accounting-tax";
  }

  if (
    value.includes("registration") ||
    value.includes("dbd") ||
    value.includes("\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19") ||
    value.includes("\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17") ||
    value.includes("\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e41\u0e1b\u0e25\u0e07")
  ) {
    return "corporate-dbd";
  }

  if (
    value.includes("visa") ||
    value.includes("permit") ||
    value.includes("license") ||
    value.includes("\u0e27\u0e35\u0e0b\u0e48\u0e32") ||
    value.includes("\u0e43\u0e1a\u0e2d\u0e19\u0e38\u0e0d\u0e32\u0e15")
  ) {
    return "visa-license";
  }

  if (
    value.includes("close") ||
    value.includes("dissolution") ||
    value.includes("\u0e1b\u0e34\u0e14\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17") ||
    value.includes("\u0e40\u0e25\u0e34\u0e01\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17") ||
    value.includes("\u0e0a\u0e33\u0e23\u0e30\u0e1a\u0e31\u0e0d\u0e0a\u0e35")
  ) {
    return "company-dissolution";
  }

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

function needsHumanApproval(serviceBucket, urgency) {
  return (
    urgency === "high" ||
    serviceBucket === "visa-license" ||
    serviceBucket === "company-dissolution"
  );
}

function suggestPrimaryAgent(priority, serviceBucket) {
  if (priority === "hot") return "salesFollowUp";
  if (serviceBucket === "accounting-tax" || serviceBucket === "corporate-dbd") {
    return "leadIntake";
  }
  if (serviceBucket === "visa-license" || serviceBucket === "company-dissolution") {
    return "complianceReviewer";
  }
  return "leadIntake";
}

function suggestSecondaryAgent(serviceBucket) {
  if (serviceBucket === "accounting-tax") return "clientSuccess";
  if (serviceBucket === "corporate-dbd") return "salesFollowUp";
  if (serviceBucket === "visa-license") return "clientSuccess";
  if (serviceBucket === "company-dissolution") return "complianceReviewer";
  return "growthStrategist";
}

function suggestNextAction(priority, serviceBucket, language) {
  if (priority === "hot") {
    return language === "th"
      ? "โทรกลับหรือส่งข้อความตอบกลับโดยทีมงานโดยเร็ว"
      : "Human callback or human-reviewed reply as soon as possible";
  }

  if (serviceBucket === "accounting-tax") {
    return language === "th"
      ? "ส่ง checklist เอกสารบัญชีและสอบถามรอบเดือนเริ่มต้น"
      : "Send the accounting checklist and confirm the starting month";
  }

  if (serviceBucket === "corporate-dbd") {
    return language === "th"
      ? "ขอข้อมูลประเภทนิติบุคคลและรายการเปลี่ยนแปลงที่ต้องการ"
      : "Ask for the entity type and the DBD change needed";
  }

  if (serviceBucket === "visa-license" || serviceBucket === "company-dissolution") {
    return language === "th"
      ? "ส่งต่อให้ทีมงานตรวจข้อเท็จจริงก่อนตอบรายละเอียด"
      : "Escalate to a human reviewer before giving detailed guidance";
  }

  return language === "th"
    ? "ขอข้อมูลธุรกิจและบริการที่ต้องการเพิ่มเติม"
    : "Ask for the business details and the exact service needed";
}

function responseWindow(priority) {
  if (priority === "hot") return "15m";
  if (priority === "warm") return "4h";
  return "1d";
}

function buildRouting(lead = {}) {
  const language = detectLanguage(lead);
  const urgency = detectUrgency(lead);
  const leadScore = scoreLead(lead);
  const priority = priorityFromScore(leadScore, urgency);
  const serviceBucket = mapServiceBucket(lead.serviceNeed);
  const humanApprovalRequired = needsHumanApproval(serviceBucket, urgency);
  const primaryAgent = suggestPrimaryAgent(priority, serviceBucket);
  const secondaryAgent = suggestSecondaryAgent(serviceBucket);
  const nextAction = suggestNextAction(priority, serviceBucket, language);
  const sla = responseWindow(priority);

  return {
    language,
    urgency,
    leadScore,
    priority,
    serviceBucket,
    humanApprovalRequired,
    primaryAgent,
    secondaryAgent,
    nextAction,
    sla,
  };
}

function buildLeadPayload({ source, lead, clientMeta, routing, lineEvent }) {
  return {
    type: source === "line_oa" ? "line_inbound" : "website_lead",
    source,
    receivedAt: new Date().toISOString(),
    routing,
    operations: {
      queue: routing?.priority || "cold",
      assignTo: routing?.primaryAgent || "leadIntake",
      reviewBy: routing?.secondaryAgent || null,
      humanApprovalRequired: Boolean(routing?.humanApprovalRequired),
      nextAction: routing?.nextAction || "",
      sla: routing?.sla || "1d",
    },
    lead: lead || null,
    lineEvent: lineEvent || null,
    clientMeta: clientMeta || {},
  };
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

async function sendSupabaseLead(payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_TABLE_NAME || "leads";
  const schema = process.env.SUPABASE_SCHEMA || "public";

  if (!supabaseUrl || !serviceRoleKey || !table) {
    return { sent: false, reason: "missing_supabase_env" };
  }

  const lead = payload.lead || {};
  const routing = payload.routing || {};
  const endpoint = `${String(supabaseUrl).replace(/\/+$/, "")}/rest/v1/${encodeURIComponent(table)}`;
  const record = {
    lead_id: toText(lead.leadId),
    full_name: toText(lead.fullName),
    phone: toText(lead.phone),
    email: toText(lead.email),
    business: toText(lead.businessName),
    service: toText(lead.serviceNeed),
    revenue: toText(lead.revenueRange),
    preferred_contact: toText(lead.preferredContact),
    language: toText(routing.language),
    urgency: toText(routing.urgency),
    priority: toText(routing.priority),
    lead_score: Number(routing.leadScore || 0),
    source: toText(payload.source),
    notes: toText(lead.notes || payload.lineEvent?.text),
    page_url: toText(lead.pageUrl),
    received_at: toText(payload.receivedAt) || new Date().toISOString(),
    routing: routing,
    client_meta: payload.clientMeta || {},
    line_event: payload.lineEvent || null,
    raw_payload: payload,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      "Content-Profile": schema,
    },
    body: JSON.stringify(record),
  });

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
  sendSupabaseLead,
};
