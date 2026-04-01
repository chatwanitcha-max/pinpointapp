import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { detectLineLanguage, detectLineIntent, buildLineReply } = require("../api/_lib/line-intelligence.js");
const { searchKnowledgeBase } = require("../api/_lib/knowledge-base.js");

const scenarios = [
  {
    label: "Official notice uses notice answer",
    text: "\u0e42\u0e14\u0e19\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e08\u0e32\u0e01\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23 \u0e15\u0e49\u0e2d\u0e07\u0e15\u0e2d\u0e1a\u0e20\u0e32\u0e22\u0e43\u0e19\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49",
    serviceBucket: "accounting-tax",
    expectedIncludes: [
      "\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d",
      "\u0e27\u0e31\u0e19\u0e04\u0e23\u0e1a\u0e01\u0e33\u0e2b\u0e19\u0e14",
    ],
    expectedExcludes: ["service business"],
  },
  {
    label: "Follow-up suppresses repeated FAQ block",
    text: "\u0e17\u0e35\u0e48\u0e19\u0e35\u0e49\u0e15\u0e49\u0e2d\u0e07\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e30\u0e44\u0e23\u0e1a\u0e49\u0e32\u0e07",
    serviceBucket: "accounting-tax",
    previousReply:
      "\u0e15\u0e32\u0e21\u0e04\u0e39\u0e48\u0e21\u0e37\u0e2d VAT \u0e02\u0e2d\u0e07\u0e01\u0e23\u0e21\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23 \u0e1c\u0e39\u0e49\u0e1b\u0e23\u0e30\u0e01\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e15\u0e49\u0e2d\u0e07\u0e22\u0e37\u0e48\u0e19\u0e41\u0e1a\u0e1a \u0e20.\u0e1e.30 \u0e40\u0e1b\u0e47\u0e19\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e20\u0e32\u0e22\u0e43\u0e19\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 15 \u0e02\u0e2d\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b",
    expectedIncludes: ["VAT", "\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e20\u0e32\u0e29\u0e35"],
    expectedExcludes: [
      "\u0e15\u0e32\u0e21\u0e04\u0e39\u0e48\u0e21\u0e37\u0e2d VAT \u0e02\u0e2d\u0e07\u0e01\u0e23\u0e21\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23",
    ],
  },
  {
    label: "Ambiguous follow-up asks for clarification instead of assuming",
    text: "\u0e41\u0e25\u0e49\u0e27\u0e01\u0e23\u0e13\u0e35\u0e19\u0e35\u0e49\u0e15\u0e49\u0e2d\u0e07\u0e17\u0e33\u0e22\u0e31\u0e07\u0e44\u0e07",
    serviceBucket: "accounting-tax",
    previousReply:
      "\u0e15\u0e32\u0e21\u0e04\u0e39\u0e48\u0e21\u0e37\u0e2d VAT \u0e02\u0e2d\u0e07\u0e01\u0e23\u0e21\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23 \u0e1c\u0e39\u0e49\u0e1b\u0e23\u0e30\u0e01\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e15\u0e49\u0e2d\u0e07\u0e22\u0e37\u0e48\u0e19\u0e41\u0e1a\u0e1a \u0e20.\u0e1e.30 \u0e40\u0e1b\u0e47\u0e19\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e20\u0e32\u0e22\u0e43\u0e19\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 15 \u0e02\u0e2d\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b",
    expectedIncludes: [
      "\u0e02\u0e2d\u0e40\u0e0a\u0e47\u0e01\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e01\u0e48\u0e2d\u0e19\u0e19\u0e30\u0e04\u0e30",
      "VAT",
      "\u0e27\u0e32\u0e07\u0e41\u0e1c\u0e19\u0e20\u0e32\u0e29\u0e35",
    ],
    expectedExcludes: [
      "\u0e15\u0e32\u0e21\u0e04\u0e39\u0e48\u0e21\u0e37\u0e2d VAT \u0e02\u0e2d\u0e07\u0e01\u0e23\u0e21\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23",
    ],
  },
  {
    label: "VAT filing asks for filing period",
    text: "\u0e20.\u0e1e.30 \u0e15\u0e49\u0e2d\u0e07\u0e22\u0e37\u0e48\u0e19\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23",
    serviceBucket: "accounting-tax",
    expectedIncludes: [
      "\u0e20.\u0e1e.30",
      "\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e20\u0e32\u0e29\u0e35",
    ],
    expectedExcludes: [],
  },
  {
    label: "New company registration asks for business activity, documents, and phone",
    text: "\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e43\u0e2b\u0e21\u0e48",
    serviceBucket: "corporate-dbd",
    expectedIncludes: [
      "\u0e1b\u0e23\u0e30\u0e01\u0e2d\u0e1a\u0e01\u0e34\u0e08\u0e01\u0e32\u0e23\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a\u0e2d\u0e30\u0e44\u0e23",
      "\u0e2a\u0e33\u0e40\u0e19\u0e32\u0e1a\u0e31\u0e15\u0e23\u0e1b\u0e23\u0e30\u0e0a\u0e32\u0e0a\u0e19",
      "\u0e2a\u0e33\u0e40\u0e19\u0e32\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e1a\u0e49\u0e32\u0e19\u0e17\u0e35\u0e48\u0e15\u0e31\u0e49\u0e07\u0e02\u0e2d\u0e07\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17",
      "\u0e40\u0e1a\u0e2d\u0e23\u0e4c\u0e42\u0e17\u0e23",
    ],
    expectedExcludes: [
      "\u0e01\u0e32\u0e23\u0e25\u0e32\u0e2d\u0e2d\u0e01",
      "\u0e41\u0e15\u0e48\u0e07\u0e15\u0e31\u0e49\u0e07\u0e43\u0e2b\u0e21\u0e48",
      "\u0e2d\u0e33\u0e19\u0e32\u0e08\u0e25\u0e07\u0e19\u0e32\u0e21",
    ],
  },
  {
    label: "Open company document question stays on new registration flow",
    text: "\u0e09\u0e31\u0e19\u0e01\u0e33\u0e25\u0e31\u0e07\u0e08\u0e30\u0e40\u0e1b\u0e34\u0e14\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17 \u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e30\u0e44\u0e23\u0e1a\u0e49\u0e32\u0e07",
    serviceBucket: "corporate-dbd",
    expectedIncludes: [
      "\u0e1b\u0e23\u0e30\u0e01\u0e2d\u0e1a\u0e01\u0e34\u0e08\u0e01\u0e32\u0e23\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a\u0e2d\u0e30\u0e44\u0e23",
      "\u0e2a\u0e33\u0e40\u0e19\u0e32\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e1a\u0e49\u0e32\u0e19",
      "\u0e40\u0e08\u0e49\u0e32\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48\u0e02\u0e2d\u0e07\u0e40\u0e23\u0e32\u0e08\u0e30\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d\u0e01\u0e25\u0e31\u0e1a",
    ],
    expectedExcludes: [
      "\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32\u0e23",
      "\u0e01\u0e32\u0e23\u0e25\u0e32\u0e2d\u0e2d\u0e01",
      "\u0e2d\u0e33\u0e19\u0e32\u0e08\u0e25\u0e07\u0e19\u0e32\u0e21",
    ],
  },
];

for (const scenario of scenarios) {
  const memorySummary = {
    turns: 2,
    lastServiceBucket: scenario.serviceBucket,
    knownFacts: {
      businessType: "service business",
      companyStatus: "existing",
      mentionsVat: true,
    },
    recentAssistantReplies: scenario.previousReply ? [scenario.previousReply] : [],
  };
  const language = detectLineLanguage(scenario.text);
  const intent = detectLineIntent(scenario.text);
  const knowledgeContext = searchKnowledgeBase({
    query: scenario.text,
    language,
    serviceBucket: scenario.serviceBucket,
    intentKey: intent.key,
    memorySummary,
    limit: 8,
  });
  const reply = buildLineReply({
    language,
    intent,
    knowledgeContext,
    memorySummary,
    eventText: scenario.text,
    serviceBucket: scenario.serviceBucket,
    handoff: null,
  });

  for (const expected of scenario.expectedIncludes) {
    if (!reply.includes(expected)) {
      throw new Error(`Scenario "${scenario.label}" missing expected text: ${expected}`);
    }
  }

  for (const blocked of scenario.expectedExcludes) {
    if (reply.includes(blocked)) {
      throw new Error(`Scenario "${scenario.label}" should not include: ${blocked}`);
    }
  }

  console.log(`PASS: ${scenario.label}`);
  console.log(reply);
}
