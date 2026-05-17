const {
  toText,
  toJsonBody,
  json,
  buildClientMeta,
  sendGa4Event,
  sendMetaEvent
} = require('./_lib/analytics');
const {
  buildRouting,
  buildLeadPayload,
  sendCrmWebhook,
  sendOpenClawWebhook,
  sendAirtableLead,
  sendSupabaseLead,
} = require('./_lib/lead-routing');
const {
  sendLeadNotificationEmailViaResend,
  sendCustomerAcknowledgementEmail,
  sendLinePushText,
} = require('./_lib/outbound');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function localizeServiceNeed(serviceNeed = '', language = 'th') {
  const value = String(serviceNeed || '').trim().toLowerCase();
  const thaiMap = {
    'monthly-accounting': 'บัญชีรายเดือน',
    'company-registration': 'จดทะเบียนจัดตั้งบริษัท',
    'dbd-amendment': 'เปลี่ยนแปลงข้อมูลบริษัท / งาน DBD',
    'visa-work-permit': 'วีซ่าและ Work Permit',
    'business-license': 'ใบอนุญาตธุรกิจ',
    'business-licenses': 'ใบอนุญาตธุรกิจ',
    'corporate-tax-planning': 'วางแผนบัญชีและภาษี',
    'payroll-social-security': 'เงินเดือนและประกันสังคม',
    'company-dissolution': 'ปิดบริษัท',
    'foreign-business-support': 'ดูแลธุรกิจต่างชาติ',
    'audit-preparation': 'เตรียมเอกสารสำหรับงานตรวจสอบบัญชี',
  };
  const englishMap = {
    'monthly-accounting': 'Monthly accounting',
    'company-registration': 'Company registration',
    'dbd-amendment': 'DBD amendments',
    'visa-work-permit': 'Visa and work permit',
    'business-license': 'Business licenses',
    'business-licenses': 'Business licenses',
    'corporate-tax-planning': 'Accounting and tax planning',
    'payroll-social-security': 'Payroll and social security',
    'company-dissolution': 'Company dissolution',
    'foreign-business-support': 'Foreign business support',
    'audit-preparation': 'Audit preparation',
  };

  if (language === 'en') {
    return englishMap[value] || serviceNeed || '-';
  }

  return thaiMap[value] || serviceNeed || '-';
}

function localizePreferredContact(value = '', language = 'th') {
  const normalized = String(value || '').trim().toLowerCase();
  if (language === 'en') {
    if (normalized === 'phone') return 'Phone';
    if (normalized === 'email') return 'Email';
    if (normalized === 'line') return 'LINE';
    return value || '-';
  }

  if (normalized === 'phone') return 'โทรศัพท์';
  if (normalized === 'email') return 'อีเมล';
  if (normalized === 'line') return 'LINE';
  return value || '-';
}

function localizeUrgency(value = '', language = 'th') {
  const normalized = String(value || '').trim().toLowerCase();
  if (language === 'en') {
    if (normalized === 'high') return 'Urgent';
    if (normalized === 'medium') return 'Moderate';
    if (normalized === 'normal') return 'Normal';
    return value || '-';
  }

  if (normalized === 'high') return 'เร่งด่วน';
  if (normalized === 'medium') return 'ปานกลาง';
  if (normalized === 'normal') return 'ปกติ';
  return value || '-';
}

function localizePriority(value = '', language = 'th') {
  const normalized = String(value || '').trim().toLowerCase();
  if (language === 'en') {
    if (normalized === 'hot') return 'Hot';
    if (normalized === 'warm') return 'Warm';
    if (normalized === 'cold') return 'Cold';
    return value || '-';
  }

  if (normalized === 'hot') return 'ด่วน';
  if (normalized === 'warm') return 'อุ่น';
  if (normalized === 'cold') return 'ทั่วไป';
  return value || '-';
}

function localizeRevenueRange(value = '', language = 'th') {
  const normalized = String(value || '').trim().toLowerCase();
  const thaiMap = {
    'under-18m': 'ต่ำกว่า 18 ล้านบาทต่อปี',
    '18m-50m': '18-50 ล้านบาทต่อปี',
    '50m-100m': '50-100 ล้านบาทต่อปี',
    '100m-plus': 'มากกว่า 100 ล้านบาทต่อปี',
  };
  const englishMap = {
    'under-18m': 'Under THB 18M per year',
    '18m-50m': 'THB 18M-50M per year',
    '50m-100m': 'THB 50M-100M per year',
    '100m-plus': 'Above THB 100M per year',
  };

  if (language === 'en') {
    return englishMap[normalized] || value || '-';
  }

  return thaiMap[normalized] || value || '-';
}

function formatLeadLanguage(language = '') {
  const normalized = String(language || '').trim().toLowerCase();
  if (normalized === 'en') return 'English';
  if (normalized === 'th') return 'ภาษาไทย';
  return language || '-';
}

function buildLeadHeader(language = 'th') {
  if (language === 'en') {
    return {
      eyebrow: 'English Lead',
      headlineFallback: 'New inquiry',
      description: 'A customer contacted us in English. Please review and follow up in English if appropriate.',
      summaryTitle: 'Lead Summary',
      messageTitle: 'Customer Message',
      detailsTitle: 'Additional Details',
      pageLabel: 'Source Page',
      scoreLabel: 'Lead Score',
      priorityLabel: 'Priority',
      languageLabel: 'Language',
      serviceLabel: 'Interested Service',
      contactLabel: 'Preferred Contact',
      urgencyLabel: 'Urgency',
      revenueLabel: 'Monthly Revenue',
      businessLabel: 'Business Name',
      phoneLabel: 'Phone',
      emailLabel: 'Email',
      phoneCta: 'Call back',
      emailCta: 'Send email',
      pageCta: 'Open source page',
      footer: 'Website lead notification',
    };
  }

  return {
    eyebrow: 'ลีดใหม่จากเว็บไซต์',
    headlineFallback: 'ลูกค้าใหม่',
    description: 'มีลูกค้าส่งข้อมูลเข้ามาจากหน้าเว็บไซต์แล้ว ทีมสามารถเปิดรายละเอียดและติดต่อกลับได้ทันที',
    summaryTitle: 'สรุปข้อมูลหลัก',
    messageTitle: 'ข้อความจากลูกค้า',
    detailsTitle: 'รายละเอียดเพิ่มเติม',
    pageLabel: 'หน้าที่ลูกค้าเข้ามา',
    scoreLabel: 'คะแนนลีด',
    priorityLabel: 'ระดับความสำคัญ',
    languageLabel: 'ภาษา',
    serviceLabel: 'บริการที่สนใจ',
    contactLabel: 'ช่องทางที่สะดวก',
    urgencyLabel: 'ระดับความเร่งด่วน',
    revenueLabel: 'รายได้ต่อเดือน',
    businessLabel: 'ชื่อธุรกิจ',
    phoneLabel: 'เบอร์โทร',
    emailLabel: 'อีเมล',
    phoneCta: 'โทรกลับ',
    emailCta: 'ส่งอีเมล',
    pageCta: 'เปิดหน้าที่ลูกค้ามา',
    footer: 'ระบบแจ้งเตือนลีดจากเว็บไซต์',
  };
}

function buildLeadMessage(lead, routing) {
  const language = routing.language || 'th';
  const header = buildLeadHeader(language);

  return [
    language === 'en' ? 'New English Lead - Pinpoint Accounting' : 'ลีดใหม่ - Pinpoint Accounting',
    `Lead ID: ${lead.leadId}`,
    `${language === 'en' ? 'Name' : 'ชื่อลูกค้า'}: ${lead.fullName}`,
    `${header.businessLabel}: ${lead.businessName || '-'}`,
    `${header.phoneLabel}: ${lead.phone}`,
    `${header.emailLabel}: ${lead.email || '-'}`,
    `${header.serviceLabel}: ${localizeServiceNeed(lead.serviceNeed, language)}`,
    `${header.revenueLabel}: ${localizeRevenueRange(lead.revenueRange, language)}`,
    `${header.contactLabel}: ${localizePreferredContact(lead.preferredContact, language)}`,
    `${header.languageLabel}: ${formatLeadLanguage(routing.language)}`,
    `${header.urgencyLabel}: ${localizeUrgency(routing.urgency, language)}`,
    `${header.priorityLabel}: ${localizePriority(routing.priority, language)}`,
    `${header.scoreLabel}: ${routing.leadScore ?? '-'}`,
    `${language === 'en' ? 'Customer Message' : 'ข้อความจากลูกค้า'}: ${lead.notes || '-'}`,
    `UTM Source: ${lead.utmSource || '-'}`,
    `UTM Medium: ${lead.utmMedium || '-'}`,
    `UTM Campaign: ${lead.utmCampaign || '-'}`,
    `${header.pageLabel}: ${lead.pageUrl || '-'}`,
  ].join('\n');
}

function buildFieldRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;width:180px;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value || '-')}</td>
    </tr>
  `;
}

function buildLeadEmailHtml(lead, routing) {
  const language = routing.language || 'th';
  const ui = buildLeadHeader(language);
  const pageUrl = lead.pageUrl || 'https://pinpointaccountingservice.com';
  const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\s+/g, '')}` : '';
  const emailHref = lead.email ? `mailto:${lead.email}` : '';
  const noteText = lead.notes || '-';
  const displayLanguage = formatLeadLanguage(routing.language);
  const displayService = localizeServiceNeed(lead.serviceNeed, language);
  const displayContact = localizePreferredContact(lead.preferredContact, language);
  const displayUrgency = localizeUrgency(routing.urgency, language);
  const displayPriority = localizePriority(routing.priority, language);
  const displayRevenue = localizeRevenueRange(lead.revenueRange, language);

  return `
  <div style="margin:0;padding:24px;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <div style="padding:28px 32px;background:linear-gradient(135deg,#0f2d63 0%,#173d82 100%);color:#ffffff;">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.8;">${escapeHtml(ui.eyebrow)}</div>
        <h1 style="margin:10px 0 8px;font-size:28px;line-height:1.2;">${escapeHtml(lead.fullName || ui.headlineFallback)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;opacity:.92;">${escapeHtml(ui.description)}</p>
      </div>

      <div style="padding:24px 32px 8px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
          ${phoneHref ? `<a href="${escapeHtml(phoneHref)}" style="display:inline-block;background:#0f2d63;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">${escapeHtml(ui.phoneCta)} ${escapeHtml(lead.phone)}</a>` : ''}
          ${emailHref ? `<a href="${escapeHtml(emailHref)}" style="display:inline-block;background:#ffffff;color:#0f2d63;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;border:1px solid #cbd5e1;">${escapeHtml(ui.emailCta)} ${escapeHtml(lead.email)}</a>` : ''}
          <a href="${escapeHtml(pageUrl)}" style="display:inline-block;background:#ffffff;color:#0f2d63;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;border:1px solid #cbd5e1;">${escapeHtml(ui.pageCta)}</a>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;margin-bottom:18px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">${escapeHtml(ui.summaryTitle)}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${buildFieldRow('Lead ID', lead.leadId)}
            ${buildFieldRow(ui.serviceLabel, displayService)}
            ${buildFieldRow(ui.phoneLabel, lead.phone || '-')}
            ${buildFieldRow(ui.emailLabel, lead.email || '-')}
            ${buildFieldRow(ui.contactLabel, displayContact)}
            ${buildFieldRow(ui.urgencyLabel, displayUrgency)}
            ${buildFieldRow(ui.priorityLabel, displayPriority)}
            ${buildFieldRow(ui.scoreLabel, routing.leadScore ?? '-')}
          </table>
        </div>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px 20px;margin-bottom:18px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a3412;margin-bottom:10px;">${escapeHtml(ui.messageTitle)}</div>
          <div style="font-size:15px;line-height:1.7;color:#431407;white-space:pre-wrap;">${escapeHtml(noteText)}</div>
        </div>

        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:18px 20px;margin-bottom:24px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">${escapeHtml(ui.detailsTitle)}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${buildFieldRow(ui.businessLabel, lead.businessName || '-')}
            ${buildFieldRow(ui.revenueLabel, displayRevenue)}
            ${buildFieldRow(ui.languageLabel, displayLanguage)}
            ${buildFieldRow('UTM Source', lead.utmSource || '-')}
            ${buildFieldRow('UTM Medium', lead.utmMedium || '-')}
            ${buildFieldRow('UTM Campaign', lead.utmCampaign || '-')}
            ${buildFieldRow(ui.pageLabel, pageUrl)}
          </table>
        </div>
      </div>

      <div style="padding:0 32px 28px;color:#64748b;font-size:12px;line-height:1.7;">
        <div>Pinpoint Accounting &amp; Service</div>
        <div>${escapeHtml(ui.footer)}: <a href="https://pinpointaccountingservice.com" style="color:#0f2d63;">pinpointaccountingservice.com</a></div>
      </div>
    </div>
  </div>
  `;
}

function withTimeout(promise, label, timeoutMs = 3500) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(
      () => resolve({ sent: false, reason: `${label}_timeout`, timeoutMs }),
      timeoutMs
    );
  });

  return Promise.race([
    Promise.resolve(promise).catch((error) => ({
      sent: false,
      reason: `${label}_error`,
      error: error?.message || String(error),
    })),
    timeout,
  ]).finally(() => clearTimeout(timeoutId));
}

async function sendLineWebhook(payload) {
  const webhookUrl = process.env.LINE_OA_WEBHOOK_URL;
  if (!webhookUrl) return { sent: false, reason: 'missing_line_webhook' };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return { sent: response.ok, status: response.status };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const body = toJsonBody(req.body);

  if (toText(body.website)) {
    return json(res, 200, { ok: true, ignored: true });
  }

  const fullName = toText(body.fullName);
  const phone = toText(body.phone);
  const email = toText(body.email);

  if (!fullName || !phone) {
    return json(res, 400, { ok: false, error: 'missing_required_fields' });
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
    source: 'website_form',
    lead,
    clientMeta,
    routing,
  });

  const notificationSubject = `[Pinpoint Lead | ${formatLeadLanguage(routing.language)}] ${lead.fullName} | ${localizeServiceNeed(lead.serviceNeed, routing.language)} | ${lead.phone}`;
  const linePayload = {
    type: 'new_lead',
    lead,
    routing,
    operations: intakePayload.operations,
    clientMeta,
    summary: leadMessage,
  };

  const [
    emailResult,
    customerEmailResult,
    lineWebhookResult,
    linePushResult,
    crmResult,
    supabaseResult,
    airtableResult,
    openClawResult,
    ga4Result,
    metaResult,
  ] = await Promise.all([
    withTimeout(sendLeadNotificationEmailViaResend({
      subject: notificationSubject,
      textBody: leadMessage,
      htmlBody: buildLeadEmailHtml(lead, routing)
    }), 'lead_email', 3500),
    withTimeout(sendCustomerAcknowledgementEmail({ lead, routing }), 'customer_email', 2500),
    withTimeout(sendLineWebhook(linePayload), 'line_webhook', 2500),
    withTimeout(sendLinePushText(leadMessage.slice(0, 4500)), 'line_push', 2500),
    withTimeout(sendCrmWebhook(intakePayload), 'crm_webhook', 2500),
    withTimeout(sendSupabaseLead(intakePayload), 'supabase', 2500),
    withTimeout(sendAirtableLead(intakePayload), 'airtable', 2500),
    withTimeout(sendOpenClawWebhook(intakePayload), 'openclaw', 2500),
    withTimeout(sendGa4Event({
      name: 'generate_lead',
      clientId: clientMeta.clientId,
      params: {
        lead_id: leadId,
        contact_method: lead.preferredContact || 'unknown',
        service_need: lead.serviceNeed || 'not_set',
        currency: 'THB',
        value: 1
      }
    }), 'ga4', 1200),
    withTimeout(sendMetaEvent({
      eventName: 'Lead',
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
    }), 'meta', 1200),
  ]);

  return json(res, 200, {
    ok: true,
    leadId,
    channels: {
      email: emailResult,
      customerEmail: customerEmailResult,
      lineWebhook: lineWebhookResult,
      linePush: linePushResult,
      crmWebhook: crmResult,
      supabase: supabaseResult,
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
