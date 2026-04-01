const BASE_URL = "https://pinpointaccountingservice.com";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
  };
}

async function main() {
  const publicConfig = await fetchJson(`${BASE_URL}/api/public-config`);
  const conversionProbe = await fetchJson(`${BASE_URL}/api/conversion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName: "generate_lead",
      eventId: `paidcheck_${Date.now()}`,
      email: "audit@example.com",
      phone: "0999999999",
      pageUrl: `${BASE_URL}/monthly-accounting?utm_source=google&utm_medium=cpc&utm_campaign=paid-readiness`,
      userAgent: "Codex readiness probe",
    }),
  });

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    publicConfigStatus: publicConfig.status,
    publicConfig: publicConfig.json?.config || null,
    conversionStatus: conversionProbe.status,
    conversion: conversionProbe.json || null,
    readiness: {
      ga4BrowserReady: Boolean(publicConfig.json?.config?.ga4MeasurementId),
      googleAdsBrowserReady: Boolean(publicConfig.json?.config?.googleAdsId),
      metaBrowserReady: Boolean(publicConfig.json?.config?.metaPixelId),
      ga4ServerReady: publicConfig.ok && conversionProbe.json?.ga4?.sent === true,
      metaServerReady: publicConfig.ok && conversionProbe.json?.meta?.sent === true,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
