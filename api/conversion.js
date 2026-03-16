const {
  toText,
  toJsonBody,
  json,
  buildClientMeta,
  sendGa4Event,
  sendMetaEvent
} = require("./_lib/analytics");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = toJsonBody(req.body);
  const eventName = toText(body.eventName) || "custom_conversion";
  const eventId = toText(body.eventId) || `evt_${Date.now()}`;
  const valueRaw = Number(body.value);
  const value = Number.isFinite(valueRaw) ? valueRaw : 1;
  const currency = toText(body.currency) || "THB";
  const email = toText(body.email);
  const phone = toText(body.phone);

  const clientMeta = buildClientMeta(req, body);

  const ga4 = await sendGa4Event({
    name: eventName,
    clientId: clientMeta.clientId,
    params: {
      event_id: eventId,
      value,
      currency
    }
  });

  const meta = await sendMetaEvent({
    eventName,
    eventId,
    pageUrl: clientMeta.pageUrl,
    userAgent: clientMeta.userAgent,
    ip: clientMeta.ip,
    fbp: clientMeta.fbp,
    fbc: clientMeta.fbc,
    email,
    phone,
    customData: {
      value,
      currency
    }
  });

  return json(res, 200, { ok: true, ga4, meta });
};
