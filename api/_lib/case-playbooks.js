const fs = require("node:fs");
const path = require("node:path");

const { toText } = require("./analytics");

let cachedPlaybooks = null;
let cachedMtime = 0;

function loadCasePlaybooks() {
  const filePath = path.join(process.cwd(), "content", "case-playbooks.json");
  const stat = fs.statSync(filePath);
  if (!cachedPlaybooks || stat.mtimeMs !== cachedMtime) {
    cachedPlaybooks = JSON.parse(fs.readFileSync(filePath, "utf8"));
    cachedMtime = stat.mtimeMs;
  }
  return Array.isArray(cachedPlaybooks?.entries) ? cachedPlaybooks.entries : [];
}

function includesAny(source, values) {
  if (!values?.length) return false;
  return values.includes(source);
}

function resolveCasePlaybook({
  serviceBucket = "",
  responseMode = "",
  caseFlavor = "",
  intentDetailId = "",
  knowledgeMatches = [],
}) {
  const rankedKnowledgeIds = knowledgeMatches.map((entry) => toText(entry?.id)).filter(Boolean);

  const scored = loadCasePlaybooks()
    .map((entry) => {
      let score = 0;

      if (entry.serviceBucket && entry.serviceBucket === serviceBucket) score += 40;
      if (includesAny(responseMode, entry.responseModes || [])) score += 35;
      if (includesAny(caseFlavor, entry.caseFlavors || [])) score += 35;
      if (includesAny(intentDetailId, entry.intentDetailIds || [])) score += 50;

      if (
        caseFlavor &&
        Array.isArray(entry.caseFlavors) &&
        entry.caseFlavors.length &&
        !includesAny(caseFlavor, entry.caseFlavors)
      ) {
        score -= 120;
      }

      if (Array.isArray(entry.preferredKnowledgeIds) && entry.preferredKnowledgeIds.length) {
        score += entry.preferredKnowledgeIds.reduce((total, id) => {
          const rank = rankedKnowledgeIds.indexOf(id);
          if (rank === -1) return total;
          if (rank === 0) return total + 55;
          if (rank === 1) return total + 40;
          if (rank === 2) return total + 26;
          return total + 8;
        }, 0);
      }

      return { ...entry, score };
    })
    .filter((entry) => entry.score >= 40)
    .sort((left, right) => right.score - left.score);

  return scored[0] || null;
}

function findPlaybookKnowledgeMatch(playbook, knowledgeMatches = []) {
  if (!playbook || !Array.isArray(playbook.preferredKnowledgeIds) || !playbook.preferredKnowledgeIds.length) {
    return null;
  }

  return (
    knowledgeMatches.find((entry) => playbook.preferredKnowledgeIds.includes(toText(entry?.id))) ||
    null
  );
}

function getPlaybookText(playbook, field, language = "th") {
  if (!playbook || !playbook[field]) return "";
  const languageKey = language === "en" ? "en" : "th";
  return toText(playbook[field][languageKey]);
}

module.exports = {
  loadCasePlaybooks,
  resolveCasePlaybook,
  findPlaybookKnowledgeMatch,
  getPlaybookText,
};
