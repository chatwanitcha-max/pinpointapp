import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildResearchDigest, buildResearchCapture } = require("../api/_lib/research-backlog.js");
const { buildResearchExpansionArtifacts } = require("../api/_lib/research-expansion.js");

const rows = [
  {
    lead_id: "line_1",
    received_at: "2026-03-29T01:00:00.000Z",
    notes: "ภ.พ.36 ใช้เมื่อไร",
    routing: { language: "th", serviceBucket: "accounting-tax" },
    raw_payload: {
      research: buildResearchCapture({
        eventText: "ภ.พ.36 ใช้เมื่อไร",
        language: "th",
        serviceBucket: "accounting-tax",
        intentKey: "accounting-tax",
        analysis: { shouldClarify: false, lowConfidence: false, confidence: "high", topMatchId: "research-vat36-foreign-service" },
        userId: "u1",
        leadId: "line_1",
        knowledgeMatchIds: ["research-vat36-foreign-service"],
      }),
    },
  },
  {
    lead_id: "line_2",
    received_at: "2026-03-29T02:00:00.000Z",
    notes: "ภ.พ.36 ใช้เมื่อไร",
    routing: { language: "th", serviceBucket: "accounting-tax" },
    raw_payload: {
      research: buildResearchCapture({
        eventText: "ภ.พ.36 ใช้เมื่อไร",
        language: "th",
        serviceBucket: "accounting-tax",
        intentKey: "accounting-tax",
        analysis: { shouldClarify: true, lowConfidence: true, confidence: "low", topMatchId: "" },
        userId: "u2",
        leadId: "line_2",
        knowledgeMatchIds: [],
      }),
    },
  },
];

const report = buildResearchDigest(rows);
const expansion = buildResearchExpansionArtifacts(report);

if (report.totalMessages !== 2) {
  throw new Error(`Expected totalMessages=2, got ${report.totalMessages}`);
}

if (report.uniqueQuestions !== 1) {
  throw new Error(`Expected uniqueQuestions=1, got ${report.uniqueQuestions}`);
}

if (!report.topQuestions[0] || report.topQuestions[0].askCount !== 2) {
  throw new Error("Expected the grouped question count to be 2");
}

if (!Array.isArray(expansion.faqCandidates) || expansion.faqCandidates.length === 0) {
  throw new Error("Expected at least one FAQ expansion candidate");
}

console.log(
  JSON.stringify(
    {
      report,
      expansionSummary: expansion.summary,
    },
    null,
    2
  )
);
