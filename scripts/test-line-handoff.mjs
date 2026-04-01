import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { detectLineLanguage, detectLineIntent, resolveServiceBucket, buildLineReply } = require("../api/_lib/line-intelligence.js");
const { searchKnowledgeBase } = require("../api/_lib/knowledge-base.js");
const { evaluateHumanHandoff } = require("../api/_lib/handoff-rules.js");

const scenarios = [
  {
    label: "TH urgent tax audit",
    text: "โดนหนังสือจากสรรพากรและต้องชี้แจงภายในพรุ่งนี้ ช่วยดูให้หน่อย",
    memorySummary: {
      turns: 1,
      lastServiceBucket: "accounting-tax",
      summaryText: "เป็นบริษัทที่จดทะเบียนแล้วและมีประเด็น VAT",
      knownFacts: {
        companyStatus: "existing",
        mentionsVat: true,
      },
    },
  },
  {
    label: "EN work permit renewal",
    text: "Our work permit expires next week and we need help with renewal",
    memorySummary: {
      turns: 0,
      lastServiceBucket: "general",
      summaryText: "",
      knownFacts: {},
    },
  },
];

for (const scenario of scenarios) {
  const language = detectLineLanguage(scenario.text);
  const intent = detectLineIntent(scenario.text);
  const serviceBucket = resolveServiceBucket(intent, scenario.memorySummary, "", scenario.text);
  const handoff = evaluateHumanHandoff({
    text: scenario.text,
    serviceBucket,
    memorySummary: scenario.memorySummary,
  });
  const knowledgeContext = searchKnowledgeBase({
    query: scenario.text,
    language,
    serviceBucket,
    intentKey: intent.key,
    memorySummary: scenario.memorySummary,
    limit: 4,
  });

  const reply = buildLineReply({
    language,
    intent,
    knowledgeContext,
    memorySummary: scenario.memorySummary,
    eventText: scenario.text,
    serviceBucket,
    handoff,
  });

  console.log(`\n=== ${scenario.label} ===`);
  console.log(JSON.stringify({
    language,
    intent: intent.key,
    serviceBucket,
    handoff,
    knowledgeIds: knowledgeContext.matches.map((item) => item.id),
  }, null, 2));
  console.log(reply);
}
