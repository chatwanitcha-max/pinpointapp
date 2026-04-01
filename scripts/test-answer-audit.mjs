import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildNeuralBrain } = require("../api/_lib/neural-brain.js");
const { buildAnswerAudit } = require("../api/_lib/answer-audit.js");
const { resolveCasePlaybook } = require("../api/_lib/case-playbooks.js");

const baseMemory = {
  turns: 2,
  lastServiceBucket: "accounting-tax",
  knownFacts: {
    mentionsVat: true,
    businessType: "service business",
    companyStatus: "existing",
  },
};

const scenarios = [
  {
    label: "Official notice is grounded by playbook and should answer",
    eventText: "\u0e42\u0e14\u0e19\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e08\u0e32\u0e01\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23 \u0e15\u0e49\u0e2d\u0e07\u0e15\u0e2d\u0e1a\u0e20\u0e32\u0e22\u0e43\u0e19\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49",
    intent: { key: "accounting-tax" },
    serviceBucket: "accounting-tax",
    knowledgeContext: {
      matches: [
        { id: "accounting-tax-notice-response", type: "manual_faq", score: 170 },
        { id: "research-vat-monthly-filing-deadline", type: "researched_faq", score: 40 },
      ],
      officialReference: null,
      intentDetail: null,
    },
    expectedClarify: false,
    expectedConfidence: "high",
  },
  {
    label: "Generic vague follow-up should clarify",
    eventText: "\u0e41\u0e25\u0e49\u0e27\u0e01\u0e23\u0e13\u0e35\u0e19\u0e35\u0e49\u0e15\u0e49\u0e2d\u0e07\u0e17\u0e33\u0e22\u0e31\u0e07\u0e44\u0e07",
    intent: { key: "general" },
    serviceBucket: "accounting-tax",
    knowledgeContext: {
      matches: [
        { id: "research-vat-monthly-filing-deadline", type: "researched_faq", score: 66 },
        { id: "pricing-what-affects-fee", type: "manual_faq", score: 61 },
      ],
      officialReference: null,
      intentDetail: null,
    },
    expectedClarify: true,
    expectedConfidence: "low",
  },
  {
    label: "Official-reference request without source should clarify",
    eventText: "official DBD link please",
    intent: { key: "official-reference" },
    serviceBucket: "corporate-dbd",
    knowledgeContext: {
      matches: [
        { id: "corporate-director-address-doc-flow", type: "manual_faq", score: 75 },
      ],
      officialReference: null,
      intentDetail: null,
    },
    expectedClarify: true,
    expectedConfidence: "low",
  },
];

for (const scenario of scenarios) {
  const brain = buildNeuralBrain({
    text: scenario.eventText,
    memorySummary: baseMemory,
    intent: scenario.intent,
    serviceBucket: scenario.serviceBucket,
    intentDetail: scenario.knowledgeContext.intentDetail,
    handoff: null,
  });
  const playbook = resolveCasePlaybook({
    serviceBucket: scenario.serviceBucket,
    responseMode: brain.responseMode,
    caseFlavor: "",
    intentDetailId: "",
    knowledgeMatches: scenario.knowledgeContext.matches,
  });
  const audit = buildAnswerAudit({
    eventText: scenario.eventText,
    intent: scenario.intent,
    brain,
    playbook,
    knowledgeContext: scenario.knowledgeContext,
    memorySummary: baseMemory,
  });

  if (audit.shouldClarify !== scenario.expectedClarify) {
    throw new Error(`${scenario.label}: expected shouldClarify=${scenario.expectedClarify} but got ${audit.shouldClarify}`);
  }

  if (audit.confidence !== scenario.expectedConfidence) {
    throw new Error(`${scenario.label}: expected confidence=${scenario.expectedConfidence} but got ${audit.confidence}`);
  }

  console.log(`PASS: ${scenario.label}`);
}
