import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  detectLineLanguage,
  detectLineIntent,
  resolveServiceBucket,
  buildLineReply,
} = require("../api/_lib/line-intelligence.js");
const { searchKnowledgeBase } = require("../api/_lib/knowledge-base.js");

const scenarios = [
  {
    label: "TH pricing after accounting context",
    text: "ขอทราบค่าบริการค่ะ",
    memorySummary: {
      turns: 2,
      lastServiceBucket: "accounting-tax",
      summaryText: "ดูเหมือนเป็นเคสของบริษัทที่จดทะเบียนแล้ว และมีประเด็น VAT",
      knownFacts: {
        companyStatus: "existing",
        businessType: "e-commerce",
        mentionsVat: true,
      },
    },
  },
  {
    label: "EN registration case",
    text: "I need help with company registration for a new business",
    memorySummary: {
      turns: 0,
      lastServiceBucket: "general",
      summaryText: "",
      knownFacts: {},
    },
  },
  {
    label: "TH official reference request",
    text: "มีลิงก์ DBD ทางการไหม",
    memorySummary: {
      turns: 1,
      lastServiceBucket: "corporate-dbd",
      summaryText: "ดูเหมือนเป็นเคสของบริษัทที่จดทะเบียนแล้ว",
      knownFacts: {
        companyStatus: "existing",
      },
    },
  },
];

for (const scenario of scenarios) {
  const language = detectLineLanguage(scenario.text);
  const intent = detectLineIntent(scenario.text);
  const serviceBucket = resolveServiceBucket(intent, scenario.memorySummary, "", scenario.text);
  const knowledgeContext = searchKnowledgeBase({
    query: scenario.text,
    language,
    serviceBucket,
    intentKey: intent.key,
    memorySummary: scenario.memorySummary,
  });

  const reply = buildLineReply({
    language,
    intent,
    knowledgeContext,
    memorySummary: scenario.memorySummary,
    eventText: scenario.text,
    serviceBucket,
  });

  console.log(`\n=== ${scenario.label} ===`);
  console.log(JSON.stringify({ language, intent: intent.key, serviceBucket, knowledgeIds: knowledgeContext.matches.map((item) => item.id) }, null, 2));
  console.log(reply);
}
