import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildLineReply, detectLineIntent } = require("../api/_lib/line-intelligence.js");
const { buildNeuralBrain } = require("../api/_lib/neural-brain.js");
const { buildAnswerAudit } = require("../api/_lib/answer-audit.js");
const { evaluateHumanHandoff } = require("../api/_lib/handoff-rules.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildMemorySummary(overrides = {}) {
  return {
    turns: 0,
    language: "th",
    lastServiceBucket: "general",
    serviceBuckets: [],
    lastIntentKey: "general",
    recentUserMessages: [],
    recentAssistantReplies: [],
    knownFacts: {},
    summaryText: "",
    ...overrides,
  };
}

function runScenario({ label, eventText, memorySummary, expectedLabelTh }) {
  const intent = detectLineIntent(eventText);
  const preliminaryBrain = buildNeuralBrain({
    text: eventText,
    memorySummary,
    intent,
    serviceBucket: "visa-license",
    intentDetail: null,
    handoff: null,
  });

  const handoff = evaluateHumanHandoff({
    text: eventText,
    serviceBucket: "visa-license",
    memorySummary,
    unsupportedNationality: preliminaryBrain?.slots?.unsupportedNationality || "",
  });

  const brain = buildNeuralBrain({
    text: eventText,
    memorySummary,
    intent,
    serviceBucket: "visa-license",
    intentDetail: null,
    handoff,
  });

  const audit = buildAnswerAudit({
    eventText,
    intent,
    brain,
    playbook: null,
    knowledgeContext: { matches: [] },
    memorySummary,
  });

  const reply = buildLineReply({
    language: "th",
    intent,
    knowledgeContext: { matches: [], intentDetail: null },
    memorySummary,
    eventText,
    serviceBucket: "visa-license",
    handoff: { required: false },
  });

  assert(brain.responseMode === "unsupported-nationality", `${label}: expected unsupported-nationality mode`);
  assert(handoff.required === false, `${label}: unsupported nationality should not trigger human handoff`);
  assert(audit.shouldClarify === false, `${label}: unsupported nationality should not clarify`);
  assert(reply.includes("ไม่ได้รับเคสวีซ่าและ Work Permit"), `${label}: reply should politely decline`);
  assert(reply.includes(expectedLabelTh), `${label}: reply should name ${expectedLabelTh}`);

  console.log(`PASS: ${label}`);
  console.log(reply);
}

runScenario({
  label: "direct mention declines politely",
  eventText: "รับทำ work permit คนพม่าไหม",
  memorySummary: buildMemorySummary(),
  expectedLabelTh: "พม่า",
});

runScenario({
  label: "memory carries unsupported nationality into follow-up",
  eventText: "ต่ออายุได้ไหม",
  memorySummary: buildMemorySummary({
    turns: 2,
    lastServiceBucket: "visa-license",
    serviceBuckets: ["visa-license"],
    lastIntentKey: "visa-license",
    recentUserMessages: ["เป็นเคส work permit คนพม่า"],
    knownFacts: {
      nationality: "Myanmar",
      unsupportedNationality: "myanmar",
      mentionsUrgent: false,
      mentionsVat: false,
      mentionsPayroll: false,
      businessType: "",
      companyStatus: "existing",
      foreignShareholder: false,
    },
    summaryText: "มีสัญชาติที่อยู่นอกขอบเขตงานวีซ่าและ Work Permit ของทีมแล้ว",
  }),
  expectedLabelTh: "พม่า",
});
