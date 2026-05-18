function getOutboundTimeoutMs(defaultMs = 2500) {
  const value = Number(process.env.OUTBOUND_TIMEOUT_MS || 0);
  if (!Number.isFinite(value) || value <= 0) return defaultMs;
  return Math.max(500, Math.min(value, 8000));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = getOutboundTimeoutMs()) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    return await fetch(url, {
      ...options,
      signal: controller ? controller.signal : options.signal,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function postJson(url, payload, headers = {}, timeoutMs = getOutboundTimeoutMs()) {
  if (!url) {
    return { sent: false, reason: "missing_url" };
  }

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  }, timeoutMs);

  return { sent: response.ok, status: response.status };
}

function isEmailDeliveryEnabled() {
  const value = String(process.env.EMAIL_DELIVERY_ENABLED || "").trim().toLowerCase();
  return ["1", "true", "yes", "on", "enabled"].includes(value);
}

function isLeadNotificationEmailEnabled() {
  const raw = String(process.env.LEAD_NOTIFICATION_EMAIL_ENABLED || "").trim().toLowerCase();
  if (!raw) return true;
  if (["0", "false", "no", "off", "disabled"].includes(raw)) return false;
  return ["1", "true", "yes", "on", "enabled"].includes(raw);
}

function isCustomerAutoReplyEmailEnabled() {
  const value = String(process.env.CUSTOMER_AUTO_REPLY_EMAIL_ENABLED || "").trim().toLowerCase();
  return ["1", "true", "yes", "on", "enabled"].includes(value);
}

async function sendViaResend({ subject, htmlBody, textBody, to }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LEAD_FROM_EMAIL;
  const toEmail = to || process.env.LEAD_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    return { sent: false, reason: "missing_email_env" };
  }

  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html: htmlBody,
      text: textBody,
    }),
  }, getOutboundTimeoutMs(2500));

  return { sent: response.ok, status: response.status };
}

async function sendEmailViaResend({ subject, htmlBody, textBody, to }) {
  if (!isEmailDeliveryEnabled()) {
    return { sent: false, reason: "email_delivery_disabled" };
  }
  return sendViaResend({ subject, htmlBody, textBody, to });
}

async function sendLeadNotificationEmailViaResend({ subject, htmlBody, textBody, to }) {
  if (!isLeadNotificationEmailEnabled()) {
    return { sent: false, reason: "lead_notification_email_disabled" };
  }
  return sendViaResend({ subject, htmlBody, textBody, to });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PINPOINT_LINE_OA_URL = "https://lin.ee/58aU8oE";
const PINPOINT_PHONE_URL = "tel:0927497442";

function buildActionButtonHtml({ label, href, background, color = "#ffffff" }) {
  return `
    <a
      href="${href}"
      style="
        display: inline-block;
        padding: 12px 20px;
        border-radius: 999px;
        background: ${background};
        color: ${color};
        text-decoration: none;
        font-weight: 700;
        font-size: 15px;
        margin: 0 10px 10px 0;
      "
      target="_blank"
      rel="noreferrer"
    >${escapeHtml(label)}</a>
  `.trim();
}

function buildLineButtonHtml(label) {
  return buildActionButtonHtml({
    label,
    href: PINPOINT_LINE_OA_URL,
    background: "#06c755",
  });
}

function buildPhoneButtonHtml(label) {
  return buildActionButtonHtml({
    label,
    href: PINPOINT_PHONE_URL,
    background: "#17305d",
  });
}

function wrapParagraph(text) {
  return `
    <p style="margin:0 0 14px; font-size:15px; line-height:1.8; color:#1e2b45;">
      ${text}
    </p>
  `.trim();
}

function buildServiceHighlight(text) {
  return `
    <div style="margin:0 0 18px; padding:16px 18px; border-radius:18px; background:#f8f7f4; border:1px solid #ece7dc;">
      <p style="margin:0; font-size:15px; line-height:1.8; color:#1e2b45;">
        ${text}
      </p>
    </div>
  `.trim();
}

function buildCustomerEmailLayout({
  heroText,
  greetingHtml,
  introHtml,
  serviceHtml,
  callbackHtml,
  urgentHtml,
  buttonsHtml,
}) {
  return `
    <div style="margin:0; padding:24px; background:#f5f1e8; font-family:Arial,'Sarabun',sans-serif; color:#1e2b45;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #eadfca;">
        <div style="padding:28px 28px 18px; background:linear-gradient(135deg, #f7efe1 0%, #ffffff 100%); border-bottom:1px solid #efe5d4;">
          <div style="display:inline-block; padding:8px 14px; border-radius:999px; background:#f6ead3; color:#8b6a2a; font-size:12px; font-weight:700; letter-spacing:0.04em;">
            REQUEST RECEIVED
          </div>
          <h2 style="margin:18px 0 10px; font-size:28px; line-height:1.25; color:#17305d;">Pinpoint Accounting &amp; Service</h2>
          <p style="margin:0; font-size:15px; line-height:1.7; color:#51617f;">
            ${heroText}
          </p>
        </div>
        <div style="padding:28px;">
          ${greetingHtml}
          ${introHtml}
          ${serviceHtml}
          ${callbackHtml}
          ${urgentHtml}
          <div style="margin:22px 0 6px;">${buttonsHtml}</div>
          <div style="margin-top:24px; padding-top:18px; border-top:1px solid #efe5d4; color:#6b7280; font-size:14px; line-height:1.8;">
            <strong style="color:#17305d;">Pinpoint Accounting &amp; Service</strong><br />
            โทร 092-749-7442<br />
            <a href="https://pinpointaccountingservice.com" style="color:#1f5fd1; text-decoration:none;">pinpointaccountingservice.com</a>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

async function sendCustomerAcknowledgementEmail({ lead, routing }) {
  if (!isCustomerAutoReplyEmailEnabled()) {
    return { sent: false, reason: "customer_auto_reply_disabled" };
  }

  const customerEmail = lead?.email;
  if (!customerEmail) {
    return { sent: false, reason: "missing_customer_email" };
  }

  const fromEmail = process.env.LEAD_FROM_EMAIL || "";
  if (fromEmail.includes("resend.dev")) {
    return { sent: false, reason: "sandbox_sender_disabled_for_customer_email" };
  }

  const name = lead?.fullName || "ลูกค้า";
  const serviceNeed = lead?.serviceNeed || "บริการที่คุณสอบถาม";
  const isEnglish = routing?.language === "en";

  if (isEnglish) {
    return sendEmailViaResend({
      to: customerEmail,
      subject: "Pinpoint received your inquiry",
      textBody: [
        `Hello ${name},`,
        "",
        "Thank you for contacting Pinpoint Accounting & Service.",
        `We have received your inquiry about: ${serviceNeed}.`,
        "Our team will review the details and get back to you as soon as possible.",
        "",
        "If your matter is urgent, you can call us or continue via LINE OA:",
        "Call: 092-749-7442",
        PINPOINT_LINE_OA_URL,
        "",
        "Pinpoint Accounting & Service",
        "https://pinpointaccountingservice.com",
      ].join("\n"),
      htmlBody: buildCustomerEmailLayout({
        heroText: "We have received your inquiry and our team is preparing to contact you as soon as possible.",
        greetingHtml: wrapParagraph(`Hello ${escapeHtml(name)},`),
        introHtml: wrapParagraph("Thank you for contacting Pinpoint Accounting &amp; Service."),
        serviceHtml: buildServiceHighlight(`We have received your inquiry about <strong>${escapeHtml(serviceNeed)}</strong>.`),
        callbackHtml: wrapParagraph("Our team will review the details and get back to you as soon as possible."),
        urgentHtml: wrapParagraph("If your matter is urgent, you can call us or continue via LINE OA right away."),
        buttonsHtml: [buildPhoneButtonHtml("Call 092-749-7442"), buildLineButtonHtml("Open LINE OA")].join(""),
      }),
    });
  }

  return sendEmailViaResend({
    to: customerEmail,
    subject: "Pinpoint ได้รับข้อมูลของคุณแล้ว",
    textBody: [
      `สวัสดีค่ะ คุณ${name}`,
      "",
      "ทีมงานได้รับข้อมูลของคุณเรียบร้อยแล้วค่ะ",
      `รายละเอียดที่คุณติดต่อเข้ามาเกี่ยวกับ: ${serviceNeed}`,
      "ทีมงานของเราจะติดต่อกลับคุณลูกค้าโดยด่วนที่สุดค่ะ ขอบคุณค่ะ",
      "",
      "หากเรื่องค่อนข้างเร่งด่วน สามารถโทรหรือคุยต่อผ่าน LINE OA ได้เลยค่ะ",
      "โทร: 092-749-7442",
      `LINE OA: ${PINPOINT_LINE_OA_URL}`,
      "",
      "Pinpoint Accounting & Service",
      "https://pinpointaccountingservice.com",
    ].join("\n"),
    htmlBody: buildCustomerEmailLayout({
      heroText: "ทีมงานได้รับข้อมูลของคุณแล้ว และกำลังเตรียมติดต่อกลับตามรายละเอียดที่คุณส่งเข้ามา",
      greetingHtml: wrapParagraph(`สวัสดีค่ะ คุณ${escapeHtml(name)}`),
      introHtml: wrapParagraph("ทีมงานได้รับข้อมูลของคุณเรียบร้อยแล้วค่ะ"),
      serviceHtml: buildServiceHighlight(`รายละเอียดที่คุณติดต่อเข้ามาเกี่ยวกับ <strong>${escapeHtml(serviceNeed)}</strong>`),
      callbackHtml: wrapParagraph("ทีมงานของเราจะติดต่อกลับคุณลูกค้าโดยด่วนที่สุดค่ะ ขอบคุณค่ะ"),
      urgentHtml: wrapParagraph("หากเรื่องค่อนข้างเร่งด่วน สามารถโทรหรือคุยต่อผ่าน LINE OA ได้เลยค่ะ"),
      buttonsHtml: [buildPhoneButtonHtml("โทร 092-749-7442"), buildLineButtonHtml("คุยผ่าน LINE OA")].join(""),
    }),
  });
}

function getLineTargetIds() {
  const raw = [process.env.LINE_TARGET_IDS, process.env.LINE_TARGET_ID]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(",");

  return [...new Set(raw
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean))];
}

async function sendLinePushText(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetIds = getLineTargetIds();

  if (!token || targetIds.length === 0) {
    return { sent: false, reason: "missing_line_push_env" };
  }

  const results = await Promise.allSettled(targetIds.map(async (targetId) => {
    const response = await fetchWithTimeout("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{ type: "text", text }],
      }),
    }, getOutboundTimeoutMs(2500));

    return { sent: response.ok, status: response.status };
  }));

  const deliveries = results.map((result) => (
    result.status === "fulfilled"
      ? result.value
      : { sent: false, reason: "line_push_error", error: result.reason?.message || String(result.reason) }
  ));

  return {
    sent: deliveries.some((entry) => entry.sent),
    targetCount: targetIds.length,
    deliveries,
  };
}

module.exports = {
  postJson,
  fetchWithTimeout,
  isEmailDeliveryEnabled,
  isLeadNotificationEmailEnabled,
  isCustomerAutoReplyEmailEnabled,
  sendEmailViaResend,
  sendLeadNotificationEmailViaResend,
  sendCustomerAcknowledgementEmail,
  sendLinePushText,
};

