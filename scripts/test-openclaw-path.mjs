import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/openclaw-line-assist.js");

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value) {
      this.body = value;
    },
  };
}

async function runScenario(label, payload) {
  const req = {
    method: "POST",
    headers: {
      "x-openclaw-token": process.env.OPENCLAW_WEBHOOK_TOKEN || "",
    },
    body: {
      mode: "line_auto_reply",
      payload,
    },
  };
  const res = createRes();
  await handler(req, res);
  const body = JSON.parse(res.body || "{}");
  if (!body?.ok) {
    throw new Error(`Scenario "${label}" did not return ok`);
  }
  if (label === "clarify mode keeps it human and short") {
    if ((body.replyText || "").length > 140) {
      throw new Error(`Scenario "${label}" returned a clarify reply that is still too long`);
    }
    if ((body.replyText || "").includes("ขอบคุณที่ทักหา")) {
      throw new Error(`Scenario "${label}" should not prepend a greeting`);
    }
  }
  if (label === "new registration keeps the full document checklist") {
    for (const expected of [
      "ประกอบกิจการเกี่ยวกับอะไร",
      "สำเนาบัตรประชาชน",
      "สำเนาทะเบียนบ้านที่ตั้งของบริษัท",
      "เบอร์โทร",
    ]) {
      if (!(body.replyText || "").includes(expected)) {
        throw new Error(`Scenario "${label}" missing expected text: ${expected}`);
      }
    }
    if ((body.replyText || "").includes("...")) {
      throw new Error(`Scenario "${label}" should not truncate the reply`);
    }
  }
  console.log(`PASS: ${label}`);
  console.log(JSON.stringify(body, null, 2));
}

await runScenario("clarify mode keeps it human and short", {
  lineEvent: { detectedLanguage: "th" },
  routing: { language: "th", serviceBucket: "accounting-tax" },
  effectiveServiceBucket: "accounting-tax",
  conversationSummary: { turns: 1 },
  handoff: { required: false },
  replyAnalysis: {
    confidence: "low",
    shouldClarify: true,
    verifiedBy: ["knowledge:research-vat-monthly-filing-deadline"],
  },
  replyDraftText:
    "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยเรื่องบัญชีรายเดือน VAT การวางแผนภาษี หรือกำหนดยื่นภาษีคะ",
});

await runScenario("high-confidence mode keeps grounded answer and friendly closer", {
  lineEvent: { detectedLanguage: "th" },
  routing: { language: "th", serviceBucket: "accounting-tax" },
  effectiveServiceBucket: "accounting-tax",
  conversationSummary: { turns: 0 },
  handoff: { required: false },
  replyAnalysis: {
    confidence: "high",
    shouldClarify: false,
    verifiedBy: ["playbook:vat-filing-deadline", "knowledge:research-vat-monthly-filing-deadline"],
  },
  replyDraftText:
    "ตามคู่มือ VAT ของกรมสรรพากร ผู้ประกอบการจดทะเบียนต้องยื่นแบบ ภ.พ.30 เป็นรายเดือนภายในวันที่ 15 ของเดือนถัดไป ไม่ว่าจะมีภาษีต้องชำระหรือไม่ก็ตาม และการยื่นผ่านระบบอินเทอร์เน็ตตามสิทธิที่กรมสรรพากรกำหนดมักได้รับการขยายเวลาเพิ่มอีก 8 วัน จึงควรตรวจปฏิทินภาษีอากรล่าสุดทุกครั้ง\n\nเพื่อเช็กกำหนด ภ.พ.30 ให้ตรง รบกวนแจ้งเดือนภาษีที่กำลังถาม และตอนนี้จด VAT แล้วหรือยัง",
});

await runScenario("new registration keeps the full document checklist", {
  lineEvent: { detectedLanguage: "th" },
  routing: { language: "th", serviceBucket: "corporate-dbd" },
  effectiveServiceBucket: "corporate-dbd",
  conversationSummary: { turns: 0 },
  handoff: { required: false },
  replyAnalysis: {
    confidence: "high",
    shouldClarify: false,
    caseFlavor: "new-registration",
    verifiedBy: ["playbook:company-registration", "knowledge:faq-company-registration-checklist"],
  },
  replyDraftText:
    "สวัสดีค่ะ ขอบคุณที่ทักหา Pinpoint นะคะ\n\nหากต้องการจดทะเบียนบริษัทใหม่ รบกวนแจ้งก่อนนะคะว่าต้องการจดทะเบียนบริษัทเพื่อประกอบกิจการเกี่ยวกับอะไรบ้าง เอกสารเบื้องต้นที่ใช้คือ 1. สำเนาบัตรประชาชนและสำเนาทะเบียนบ้านของหุ้นส่วนตั้งแต่ 2 คนขึ้นไป 2. สำเนาทะเบียนบ้านที่ตั้งของบริษัท เมื่อเตรียมเอกสารเรียบร้อยแล้ว ทางเจ้าหน้าที่ของเราจะติดต่อกลับหาคุณทันทีค่ะ รบกวนขอเบอร์โทรติดต่อไว้ได้เลยนะคะ",
});

