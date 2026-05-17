const { toText, toJsonBody, json, buildClientMeta } = require('./_lib/analytics');
const { postJson, sendLinePushText } = require('./_lib/outbound');

const ALLOWED_STATUSES = new Set([
  'new',
  'verified',
  'contacted',
  'interested',
  'proposal_sent',
  'won',
  'lost',
  'not_fit',
  'duplicate',
]);

function normalizeStatus(value) {
  const status = toText(value).toLowerCase().replace(/\s+/g, '_');
  return ALLOWED_STATUSES.has(status) ? status : '';
}

function buildFeedbackText(feedback) {
  return [
    'Blutenstein Growth OS feedback',
    `Lead ID: ${feedback.leadId}`,
    `Business unit: ${feedback.businessUnit || '-'}`,
    `Status: ${feedback.status}`,
    `Outcome: ${feedback.outcome || '-'}`,
    `Estimated value: ${feedback.estimatedValue || '-'}`,
    `Actual value: ${feedback.actualValue || '-'}`,
    `Competitor mentioned: ${feedback.competitorMentioned || '-'}`,
    `Reason lost: ${feedback.reasonLost || '-'}`,
    `Trust gap: ${feedback.trustGap || '-'}`,
    `Next follow-up: ${feedback.nextFollowUpAt || '-'}`,
    `Operator: ${feedback.operator || '-'}`,
    `Notes: ${feedback.notes || '-'}`,
    `Source page: ${feedback.pageUrl || '-'}`,
  ].join('\n');
}

async function withTimeout(promise, label, timeoutMs = 2500) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve({ sent: false, reason: `${label}_timeout`, timeoutMs }), timeoutMs);
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const body = toJsonBody(req.body);

  if (toText(body.website)) {
    return json(res, 200, { ok: true, ignored: true });
  }

  const configuredToken = toText(process.env.GROWTH_FEEDBACK_TOKEN);
  if (configuredToken) {
    const suppliedToken = toText(req.headers['x-growth-feedback-token']) || toText(body.token);
    if (suppliedToken !== configuredToken) {
      return json(res, 401, { ok: false, error: 'unauthorized' });
    }
  }

  const leadId = toText(body.leadId);
  const status = normalizeStatus(body.status);

  if (!leadId || !status) {
    return json(res, 400, {
      ok: false,
      error: 'missing_required_fields',
      required: ['leadId', 'status'],
      allowedStatuses: Array.from(ALLOWED_STATUSES),
    });
  }

  const clientMeta = buildClientMeta(req, body);
  const feedback = {
    type: 'growth_feedback',
    feedbackId: `growthfb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    leadId,
    status,
    businessUnit: toText(body.businessUnit),
    outcome: toText(body.outcome),
    estimatedValue: toText(body.estimatedValue),
    actualValue: toText(body.actualValue),
    competitorMentioned: toText(body.competitorMentioned),
    reasonLost: toText(body.reasonLost),
    trustGap: toText(body.trustGap),
    nextFollowUpAt: toText(body.nextFollowUpAt),
    operator: toText(body.operator),
    notes: toText(body.notes),
    pageUrl: toText(body.pageUrl),
    clientMeta,
  };

  const lineWebhookUrl = process.env.LINE_OA_WEBHOOK_URL;
  const text = buildFeedbackText(feedback);
  const [lineWebhookResult, linePushResult] = await Promise.all([
    withTimeout(postJson(lineWebhookUrl, feedback), 'line_webhook', 2500),
    withTimeout(sendLinePushText(text.slice(0, 4500)), 'line_push', 2500),
  ]);

  return json(res, 200, {
    ok: true,
    feedbackId: feedback.feedbackId,
    leadId,
    status,
    channels: {
      lineWebhook: lineWebhookResult,
      linePush: linePushResult,
    },
  });
};
