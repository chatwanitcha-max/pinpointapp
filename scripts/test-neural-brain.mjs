import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildNeuralBrain } = require("../api/_lib/neural-brain.js");

const scenarios = [
  {
    label: "Tax notice suppresses irrelevant business type memory",
    text: "\u0e42\u0e14\u0e19\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e08\u0e32\u0e01\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23 \u0e15\u0e49\u0e2d\u0e07\u0e15\u0e2d\u0e1a\u0e20\u0e32\u0e22\u0e43\u0e19\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49",
    intent: { key: "accounting-tax" },
    serviceBucket: "accounting-tax",
    memorySummary: {
      turns: 2,
      knownFacts: {
        businessType: "service business",
        companyStatus: "existing",
        mentionsVat: true,
      },
    },
    assert(brain) {
      if (brain.shouldEchoMemory) {
        throw new Error("tax notice should not echo prior memory in opener");
      }
      if (brain.responseMode !== "official-notice") {
        throw new Error(`expected official-notice mode, got ${brain.responseMode}`);
      }
    },
  },
  {
    label: "Pricing keeps business context",
    text: "\u0e02\u0e2d\u0e17\u0e23\u0e32\u0e1a\u0e04\u0e48\u0e32\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e17\u0e33\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e04\u0e48\u0e30",
    intent: { key: "pricing" },
    serviceBucket: "accounting-tax",
    memorySummary: {
      turns: 2,
      knownFacts: {
        businessType: "service business",
        companyStatus: "existing",
        mentionsVat: true,
      },
    },
    assert(brain) {
      if (!brain.shouldEchoMemory) {
        throw new Error("pricing mode should retain useful context");
      }
    },
  },
];

for (const scenario of scenarios) {
  const brain = buildNeuralBrain(scenario);
  scenario.assert(brain);
  console.log(`PASS: ${scenario.label}`);
  console.log(JSON.stringify(brain, null, 2));
}
