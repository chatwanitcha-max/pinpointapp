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

function isEmailDeliveryEnabled() {
  // Hard shutdown: disable ALL outbound email sends from this project.
  // This prevents daily automation briefs, lead notifications, and any customer emails
  // from consuming credits or accidentally emailing customers.
  //
  // To re-enable later, remove this block and rely on EMAIL_DELIVERY_ENABLED env gating.
  return false;
}

async function sendEmailViaResend({ subject, htmlBody, textBody, to }) {
  if (!isEmailDeliveryEnabled()) {
    return { sent: false, reason: "email_delivery_disabled" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LEAD_FROM_EMAIL;
  const toEmail = to || process.env.LEAD_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    return { sent: false, reason: "missing_email_env" };
  }

  const response = await fetch("https://api.resend.com/emails", {
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
  });

  return { sent: response.ok, status: response.status };
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

async function sendLinePushText(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_TARGET_ID;

  if (!token || !targetId) {
    return { sent: false, reason: "missing_line_push_env" };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: targetId,
      messages: [{ type: "text", text }],
    }),
  });

  return { sent: response.ok, status: response.status };
}

module.exports = {
  postJson,
  isEmailDeliveryEnabled,
  sendEmailViaResend,
  sendCustomerAcknowledgementEmail,
  sendLinePushText,
};

