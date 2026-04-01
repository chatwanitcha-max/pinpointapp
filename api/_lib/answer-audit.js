const { toText } = require("./analytics");

const VAGUE_FOLLOW_UP_RE =
  /\u0e15\u0e23\u0e07\u0e19\u0e35\u0e49|\u0e41\u0e1a\u0e1a\u0e19\u0e35\u0e49|\u0e01\u0e23\u0e13\u0e35\u0e19\u0e35\u0e49|\u0e22\u0e31\u0e07\u0e44\u0e07|\u0e0a\u0e48\u0e27\u0e22\u0e14\u0e39|\u0e0a\u0e48\u0e27\u0e22\u0e2b\u0e19\u0e48\u0e2d\u0e22|\u0e15\u0e49\u0e2d\u0e07\u0e17\u0e33\u0e22\u0e31\u0e07\u0e44\u0e07|\u0e15\u0e49\u0e2d\u0e07\u0e17\u0e33\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e44\u0e23|\u0e15\u0e48\u0e2d\u0e22\u0e31\u0e07\u0e44\u0e07|\u0e2b\u0e21\u0e32\u0e22\u0e16\u0e36\u0e07\u0e2d\u0e30\u0e44\u0e23|what do you mean|what should i do|how do i do this|help me with this/i;

function buildAnswerAudit({
  eventText,
  intent,
  brain,
  playbook,
  knowledgeContext,
  memorySummary,
}) {
  const text = toText(eventText);
  const lowerText = text.toLowerCase();
  const matches = Array.isArray(knowledgeContext?.matches) ? knowledgeContext.matches : [];
  const topMatch = matches[0] || null;
  const secondMatch = matches[1] || null;
  const topScore = Number(topMatch?.score || 0);
  const secondScore = Number(secondMatch?.score || 0);
  const scoreGap = topScore - secondScore;
  const hasConversation = Number(memorySummary?.turns || 0) > 0;
  const asksReference = Boolean(brain?.signals?.asksReference || intent?.key === "official-reference");
  const asksPricing = Boolean(brain?.signals?.asksPricing || intent?.key === "pricing");
  const hasOfficialReference = Boolean(knowledgeContext?.officialReference);
  const playbookBacked = Boolean(playbook);
  const knowledgeBacked = Boolean(topMatch && (topMatch.type === "manual_faq" || topMatch.type === "official_reference"));
  const vagueFollowUp = VAGUE_FOLLOW_UP_RE.test(lowerText);
  const shortMessage = lowerText.length <= 70;
  const lowConfidence = topScore < 68 || (topScore > 0 && scoreGap < 12);
  const responseMode = toText(brain?.responseMode);
  const asksDeadline = Boolean(brain?.signals?.asksDueDate);
  const hasOfficialNotice = Boolean(brain?.signals?.hasOfficialNotice);

  if (responseMode === "unsupported-nationality") {
    return {
      confidence: "high",
      shouldClarify: false,
      lowConfidence: false,
      allowMemoryEcho: false,
      shouldIncludeReference: false,
      verifiedBy: ["policy:unsupported-nationality"],
      topMatchId: toText(topMatch?.id),
      topScore,
      scoreGap,
    };
  }

  const shouldClarify =
    (asksReference && !hasOfficialReference) ||
    (!playbookBacked && !knowledgeBacked) ||
    (hasOfficialNotice && !playbookBacked && !knowledgeBacked) ||
    (vagueFollowUp && shortMessage) ||
    ((vagueFollowUp || shortMessage) && hasConversation && lowConfidence) ||
    ((asksPricing || asksDeadline) && !playbookBacked && lowConfidence);

  const confidence = shouldClarify
    ? "low"
    : playbookBacked || topScore >= 90
      ? "high"
      : "medium";

  const verifiedBy = [];
  if (playbookBacked) verifiedBy.push(`playbook:${playbook.id}`);
  if (knowledgeBacked && topMatch?.id) verifiedBy.push(`knowledge:${topMatch.id}`);
  if (hasOfficialReference && knowledgeContext?.officialReference?.id) {
    verifiedBy.push(`official:${knowledgeContext.officialReference.id}`);
  }

  return {
    confidence,
    shouldClarify,
    lowConfidence,
    allowMemoryEcho: !shouldClarify && !["official-reference", "official-notice", "deadline"].includes(responseMode),
    shouldIncludeReference: asksReference && hasOfficialReference,
    verifiedBy,
    topMatchId: toText(topMatch?.id),
    topScore,
    scoreGap,
  };
}

module.exports = {
  buildAnswerAudit,
};
