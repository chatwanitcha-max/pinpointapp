const { json, toText } = require("./_lib/analytics");
const {
  buildResearchDigest,
  fetchRecentResearchRows,
  saveResearchDigestRuntime,
} = require("./_lib/research-backlog");
const {
  buildResearchExpansionArtifacts,
  saveResearchExpansionRuntime,
} = require("./_lib/research-expansion");

function isAuthorized(req) {
  const authHeader = toText(req.headers.authorization);
  const userAgent = toText(req.headers["user-agent"]);
  const cronSecret = toText(process.env.CRON_SECRET);

  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  return /vercel-cron\/1\.0/i.test(userAgent);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { ok: false, error: "unauthorized" });
  }

  const rowsResult = await fetchRecentResearchRows({
    days: Number(process.env.RESEARCH_DIGEST_DAYS || 30),
    limit: Number(process.env.RESEARCH_DIGEST_LIMIT || 500),
  });

  const report = buildResearchDigest(rowsResult.rows || []);
  const runtimePath = saveResearchDigestRuntime(report);
  const expansion = buildResearchExpansionArtifacts(report);
  const expansionPaths = saveResearchExpansionRuntime(expansion);

  return json(res, 200, {
    ok: true,
    sourceAvailable: rowsResult.available,
    sourceReason: rowsResult.reason || "",
    sourceStatus: rowsResult.status || 200,
    runtimePath,
    expansionPaths,
    report,
    expansionSummary: expansion.summary,
    recommendedActions: expansion.recommendedActions,
  });
};
