const { toText } = require("./analytics");

const SITE_SCOPE = "site::all";
const PATH_FALLBACK = "/";

function getConfig() {
  return {
    supabaseUrl: toText(process.env.SUPABASE_URL).replace(/\/+$/, ""),
    serviceRoleKey: toText(process.env.SUPABASE_SERVICE_ROLE_KEY),
    schema: toText(process.env.SUPABASE_SCHEMA) || "public",
    statsTable: toText(process.env.VISITOR_COUNTER_TABLE) || "visitor_stats",
    sessionsTable: toText(process.env.VISITOR_COUNTER_SESSIONS_TABLE) || "visitor_sessions",
  };
}

function isEnabled() {
  const cfg = getConfig();
  return Boolean(cfg.supabaseUrl && cfg.serviceRoleKey);
}

function normalizePath(input) {
  const raw = toText(input) || PATH_FALLBACK;
  if (!raw.startsWith("/")) return PATH_FALLBACK;
  return raw.slice(0, 300);
}

function normalizeVisitorId(input) {
  const raw = toText(input);
  if (!raw) return "";
  return raw.slice(0, 120);
}

function buildBaseHeaders(cfg) {
  return {
    apikey: cfg.serviceRoleKey,
    Authorization: `Bearer ${cfg.serviceRoleKey}`,
    "Content-Type": "application/json",
    "Content-Profile": cfg.schema,
  };
}

async function fetchSupabaseJson(url, options) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}

async function getSessionExists(cfg, scope, visitorId) {
  const endpoint = `${cfg.supabaseUrl}/rest/v1/${encodeURIComponent(cfg.sessionsTable)}?scope=eq.${encodeURIComponent(
    scope
  )}&visitor_id=eq.${encodeURIComponent(visitorId)}&select=visitor_id&limit=1`;
  const result = await fetchSupabaseJson(endpoint, {
    method: "GET",
    headers: {
      ...buildBaseHeaders(cfg),
      Accept: "application/json",
    },
  });
  if (!result.ok) return { ok: false, exists: false, status: result.status };
  return { ok: true, exists: Array.isArray(result.data) && result.data.length > 0, status: result.status };
}

async function upsertSession(cfg, scope, visitorId) {
  const nowIso = new Date().toISOString();
  const endpoint = `${cfg.supabaseUrl}/rest/v1/${encodeURIComponent(cfg.sessionsTable)}?on_conflict=scope,visitor_id`;
  const payload = {
    scope,
    visitor_id: visitorId,
    first_seen_at: nowIso,
    last_seen_at: nowIso,
  };

  const result = await fetchSupabaseJson(endpoint, {
    method: "POST",
    headers: {
      ...buildBaseHeaders(cfg),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });

  return { ok: result.ok, status: result.status };
}

async function getStats(cfg, scope) {
  const endpoint = `${cfg.supabaseUrl}/rest/v1/${encodeURIComponent(cfg.statsTable)}?scope=eq.${encodeURIComponent(
    scope
  )}&select=scope,total_views,unique_visitors&limit=1`;
  const result = await fetchSupabaseJson(endpoint, {
    method: "GET",
    headers: {
      ...buildBaseHeaders(cfg),
      Accept: "application/json",
    },
  });

  if (!result.ok) return { ok: false, status: result.status, row: null };
  const row = Array.isArray(result.data) ? result.data[0] : null;
  return { ok: true, status: result.status, row: row || null };
}

async function upsertStats(cfg, scope, totalViews, uniqueVisitors) {
  const endpoint = `${cfg.supabaseUrl}/rest/v1/${encodeURIComponent(cfg.statsTable)}?on_conflict=scope`;
  const payload = {
    scope,
    total_views: totalViews,
    unique_visitors: uniqueVisitors,
    updated_at: new Date().toISOString(),
  };
  const result = await fetchSupabaseJson(endpoint, {
    method: "POST",
    headers: {
      ...buildBaseHeaders(cfg),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });
  return { ok: result.ok, status: result.status };
}

async function incrementScope(cfg, scope, visitorId) {
  const sessionState = await getSessionExists(cfg, scope, visitorId);
  if (!sessionState.ok) {
    return { ok: false, status: sessionState.status, totalViews: 0, uniqueVisitors: 0 };
  }

  const statsState = await getStats(cfg, scope);
  if (!statsState.ok) {
    return { ok: false, status: statsState.status, totalViews: 0, uniqueVisitors: 0 };
  }

  const currentViews = Number(statsState.row?.total_views || 0);
  const currentUnique = Number(statsState.row?.unique_visitors || 0);
  const nextViews = currentViews + 1;
  const nextUnique = currentUnique + (sessionState.exists ? 0 : 1);

  const sessionWrite = await upsertSession(cfg, scope, visitorId);
  if (!sessionWrite.ok) {
    return { ok: false, status: sessionWrite.status, totalViews: 0, uniqueVisitors: 0 };
  }

  const statsWrite = await upsertStats(cfg, scope, nextViews, nextUnique);
  if (!statsWrite.ok) {
    return { ok: false, status: statsWrite.status, totalViews: 0, uniqueVisitors: 0 };
  }

  return {
    ok: true,
    status: 200,
    totalViews: nextViews,
    uniqueVisitors: nextUnique,
  };
}

async function readScope(cfg, scope) {
  const statsState = await getStats(cfg, scope);
  if (!statsState.ok) {
    return { ok: false, status: statsState.status, totalViews: 0, uniqueVisitors: 0 };
  }
  return {
    ok: true,
    status: 200,
    totalViews: Number(statsState.row?.total_views || 0),
    uniqueVisitors: Number(statsState.row?.unique_visitors || 0),
  };
}

async function incrementVisitorCount({ pagePath, visitorId }) {
  const cfg = getConfig();
  if (!isEnabled()) {
    return { ok: false, reason: "visitor_counter_env_missing", status: 503 };
  }

  const safePath = normalizePath(pagePath);
  const safeVisitorId = normalizeVisitorId(visitorId);
  if (!safeVisitorId) {
    return { ok: false, reason: "missing_visitor_id", status: 400 };
  }

  const [site, page] = await Promise.all([
    incrementScope(cfg, SITE_SCOPE, safeVisitorId),
    incrementScope(cfg, `page::${safePath}`, safeVisitorId),
  ]);

  if (!site.ok || !page.ok) {
    return {
      ok: false,
      reason: "supabase_write_failed",
      status: Math.max(site.status || 500, page.status || 500),
    };
  }

  return {
    ok: true,
    status: 200,
    pagePath: safePath,
    totals: {
      siteViews: site.totalViews,
      siteUniqueVisitors: site.uniqueVisitors,
      pageViews: page.totalViews,
      pageUniqueVisitors: page.uniqueVisitors,
    },
  };
}

async function readVisitorCount({ pagePath }) {
  const cfg = getConfig();
  if (!isEnabled()) {
    return { ok: false, reason: "visitor_counter_env_missing", status: 503 };
  }

  const safePath = normalizePath(pagePath);
  const [site, page] = await Promise.all([readScope(cfg, SITE_SCOPE), readScope(cfg, `page::${safePath}`)]);

  if (!site.ok || !page.ok) {
    return {
      ok: false,
      reason: "supabase_read_failed",
      status: Math.max(site.status || 500, page.status || 500),
    };
  }

  return {
    ok: true,
    status: 200,
    pagePath: safePath,
    totals: {
      siteViews: site.totalViews,
      siteUniqueVisitors: site.uniqueVisitors,
      pageViews: page.totalViews,
      pageUniqueVisitors: page.uniqueVisitors,
    },
  };
}

module.exports = {
  isVisitorCounterEnabled: isEnabled,
  normalizePath,
  incrementVisitorCount,
  readVisitorCount,
};
