const { toText } = require("./analytics");

const RESET_RE =
  /\u0e40\u0e23\u0e34\u0e48\u0e21\u0e43\u0e2b\u0e21\u0e48|\u0e02\u0e2d\u0e40\u0e23\u0e34\u0e48\u0e21\u0e43\u0e2b\u0e21\u0e48|\u0e40\u0e23\u0e34\u0e48\u0e21\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48|\u0e16\u0e32\u0e21\u0e43\u0e2b\u0e21\u0e48|\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07|\u0e2d\u0e35\u0e01\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07|start over|reset|new topic|new case|ignore previous|another topic/i;

function buildEmptyConversationSummary(language = "th", serviceBucket = "general") {
  return {
    turns: 0,
    language,
    lastServiceBucket: serviceBucket || "general",
    serviceBuckets: serviceBucket && serviceBucket !== "general" ? [serviceBucket] : [],
    lastIntentKey: "general",
    recentUserMessages: [],
    recentAssistantReplies: [],
    knownFacts: {
      companyStatus: "",
      nationality: "",
      unsupportedNationality: "",
      businessType: "",
      foreignShareholder: false,
      mentionsVat: false,
      mentionsPayroll: false,
      mentionsUrgent: false,
    },
    summaryText: "",
  };
}

function detectConversationReset(text) {
  return RESET_RE.test(toText(text));
}

function detectTopicSwitch({ text, memorySummary, resolvedServiceBucket }) {
  const resetRequested = detectConversationReset(text);
  if (resetRequested) return true;

  const previousBucket = toText(memorySummary?.lastServiceBucket);
  const nextBucket = toText(resolvedServiceBucket);
  if (
    previousBucket &&
    previousBucket !== "general" &&
    nextBucket &&
    nextBucket !== "general" &&
    previousBucket !== nextBucket
  ) {
    return true;
  }

  return false;
}

function buildConversationScope({ text, language, resolvedServiceBucket, memorySummary }) {
  const resetRequested = detectConversationReset(text);
  const topicSwitched = detectTopicSwitch({
    text,
    memorySummary,
    resolvedServiceBucket,
  });

  if (resetRequested || topicSwitched) {
    return {
      resetRequested,
      topicSwitched,
      summary: buildEmptyConversationSummary(language, resolvedServiceBucket),
    };
  }

  return {
    resetRequested: false,
    topicSwitched: false,
    summary: memorySummary || buildEmptyConversationSummary(language, resolvedServiceBucket),
  };
}

function isResetOnlyMessage(text, resolvedServiceBucket = "general") {
  const value = toText(text);
  if (!value) return false;
  return detectConversationReset(value) && (!resolvedServiceBucket || resolvedServiceBucket === "general");
}

module.exports = {
  buildEmptyConversationSummary,
  detectConversationReset,
  detectTopicSwitch,
  buildConversationScope,
  isResetOnlyMessage,
};
