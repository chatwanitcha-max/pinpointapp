import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildConversationScope,
  isResetOnlyMessage,
} = require("../api/_lib/conversation-control.js");

const memorySummary = {
  turns: 3,
  language: "th",
  lastServiceBucket: "accounting-tax",
  serviceBuckets: ["accounting-tax"],
  lastIntentKey: "general",
  recentUserMessages: ["ภ.พ.30 ต้องยื่นเมื่อไร"],
  recentAssistantReplies: ["เพื่อเช็กกำหนด ภ.พ.30 ให้ตรง รบกวนแจ้งเดือนภาษีที่กำลังถาม"],
  knownFacts: {
    companyStatus: "existing",
    nationality: "",
    businessType: "service business",
    mentionsVat: true,
    mentionsPayroll: false,
    mentionsUrgent: false,
  },
  summaryText: "มีประเด็น VAT อยู่ในเคสนี้",
};

const resetScope = buildConversationScope({
  text: "ขอเริ่มใหม่",
  language: "th",
  resolvedServiceBucket: "general",
  memorySummary,
});

if (!resetScope.resetRequested || resetScope.summary.turns !== 0) {
  throw new Error("Reset scope should clear previous memory");
}

const topicSwitchScope = buildConversationScope({
  text: "อีกเรื่อง อยากถาม work permit",
  language: "th",
  resolvedServiceBucket: "visa-license",
  memorySummary,
});

if (!topicSwitchScope.topicSwitched || topicSwitchScope.summary.lastServiceBucket !== "visa-license") {
  throw new Error("Topic switch should move to new service bucket and suppress old memory");
}

if (!isResetOnlyMessage("ขอเริ่มใหม่", "general")) {
  throw new Error("Reset-only phrase should be detected");
}

if (isResetOnlyMessage("อีกเรื่อง อยากถาม work permit", "visa-license")) {
  throw new Error("Topic switch with explicit service should not be treated as reset-only");
}

console.log("PASS: reset clears previous memory");
console.log("PASS: topic switch suppresses old bucket memory");
console.log("PASS: reset-only detection works");
