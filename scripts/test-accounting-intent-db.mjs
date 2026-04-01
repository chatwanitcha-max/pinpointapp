import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  detectLineLanguage,
  detectLineIntent,
  detectAccountingIntentDetail,
  resolveServiceBucket,
} = require("../api/_lib/line-intelligence.js");
const { searchKnowledgeBase } = require("../api/_lib/knowledge-base.js");

const scenarios = [
  {
    text: "\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49\u0e40\u0e01\u0e34\u0e19 1.8 \u0e25\u0e49\u0e32\u0e19\u0e1a\u0e32\u0e17 \u0e15\u0e49\u0e2d\u0e07\u0e08\u0e14 VAT \u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23",
    expectedIntentDetail: "intent-vat-registration-threshold",
  },
  {
    text: "\u0e20.\u0e1e.30 \u0e15\u0e49\u0e2d\u0e07\u0e22\u0e37\u0e48\u0e19\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23",
    expectedIntentDetail: "intent-vat-filing-deadline",
  },
  {
    text: "\u0e20\u0e07\u0e14 53 \u0e15\u0e49\u0e2d\u0e07\u0e22\u0e37\u0e48\u0e19\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23",
    expectedIntentDetail: "intent-withholding-tax-deadline",
  },
  {
    text: "\u0e1a\u0e2d\u0e08 5 \u0e22\u0e37\u0e48\u0e19\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23",
    expectedIntentDetail: "intent-boj5-deadline",
  },
  {
    text: "\u0e20.\u0e1e.36 \u0e43\u0e0a\u0e49\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e44\u0e23",
    expectedIntentDetail: "intent-vat36-foreign-service",
  },
  {
    text: "\u0e02\u0e2d\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e2d\u0e2d\u0e19\u0e44\u0e25\u0e19\u0e4c\u0e44\u0e14\u0e49\u0e44\u0e2b\u0e21",
    expectedIntentDetail: "intent-dbd-eservice-certificate-copy",
  },
  {
    text: "\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48 \u0e15\u0e49\u0e2d\u0e07\u0e02\u0e36\u0e49\u0e19\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21\u0e20\u0e32\u0e22\u0e43\u0e19\u0e01\u0e35\u0e48\u0e27\u0e31\u0e19",
    expectedIntentDetail: "intent-social-security-insured-registration",
  },
  {
    text: "How do I register e-workpermit for the first time",
    expectedIntentDetail: "intent-eworkpermit-first-registration",
  },
];

for (const scenario of scenarios) {
  const language = detectLineLanguage(scenario.text);
  const intent = detectLineIntent(scenario.text);
  const serviceBucket = resolveServiceBucket(intent, null, "", scenario.text);
  const intentDetail = detectAccountingIntentDetail(scenario.text, serviceBucket, intent.key);
  const knowledgeContext = searchKnowledgeBase({
    query: scenario.text,
    language,
    serviceBucket: intentDetail?.serviceBucket || serviceBucket,
    intentKey: intentDetail?.intentKey || intent.key,
    preferredIds: intentDetail?.faqIds || [],
    limit: 4,
  });

  if (intentDetail?.id !== scenario.expectedIntentDetail) {
    throw new Error(
      `Expected ${scenario.expectedIntentDetail} but got ${intentDetail?.id || "null"}`
    );
  }

  console.log(`PASS: ${scenario.text}`);
  console.log(
    JSON.stringify(
      {
        language,
        intent: intent.key,
        serviceBucket,
        intentDetail,
        knowledgeIds: knowledgeContext.matches.map((item) => item.id),
      },
      null,
      2
    )
  );
}
