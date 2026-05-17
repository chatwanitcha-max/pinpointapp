const { toText } = require("./analytics");

function getOpenAIConfig() {
  // Support Kimi (Moonshot AI) as an alternative to OpenAI
  const kimiKey = process.env.KIMI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  const isKimi = Boolean(kimiKey);

  return {
    apiKey: kimiKey || openAIKey,
    model: isKimi
      ? (process.env.KIMI_MODEL || "moonshot-v1-8k")
      : (process.env.OPENAI_MODEL || "gpt-4o-mini"),
    baseUrl: isKimi
      ? (process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1")
      : (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"),
    maxTokens: Math.min(parseInt(process.env.OPENAI_MAX_TOKENS || "800", 10), 2000),
    temperature: Math.min(Math.max(parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"), 0), 1),
  };
}

function truncateText(text, maxLen = 600) {
  const value = toText(text);
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen - 3) + "...";
}

function buildKnowledgeContext(knowledgeMatches, language = "th") {
  if (!knowledgeMatches || knowledgeMatches.length === 0) return "";

  const entries = knowledgeMatches.slice(0, 6).map((entry, i) => {
    const q = toText(language === "en" ? entry.question_en : entry.question_th);
    const a = toText(language === "en" ? entry.answer_en : entry.answer_th);
    const followUp = toText(language === "en" ? entry.follow_up_en : entry.follow_up_th);
    const url = toText(entry.source_url);
    const parts = [
      `[${i + 1}] Q: ${truncateText(q, 200)}`,
      `A: ${truncateText(a, 400)}`,
    ];
    if (followUp) parts.push(`Follow-up: ${truncateText(followUp, 200)}`);
    if (url) parts.push(`Link: ${url}`);
    return parts.join("\n");
  });

  return `=== RELEVANT KNOWLEDGE BASE ENTRIES ===\n${entries.join("\n\n")}\n=== END KNOWLEDGE BASE ===`;
}

function buildSystemPrompt({ language, serviceBucket, memorySummary, knowledgeMatches }) {
  const kbContext = buildKnowledgeContext(knowledgeMatches, language);
  const memoryText = toText(memorySummary?.summaryText);
  const turns = memorySummary?.turns || 0;

  const basePromptTh = `คุณคือ "น้องพิณ" ผู้ช่วย AI ของ Pinpoint Accounting & Service, Ltd.
บทบาทหลัก: เป็นผู้ช่วยฝ่ายขาย/ที่ปรึกษาหน้าเว็บ ช่วยตอบให้เข้าใจง่าย คัดกรองเคส และพาลูกค้าไปช่องทางติดต่อที่ถูกต้องเพื่อปิดการขาย

กฎสำคัญ:
1. ตอบคำถามตรง ๆ ก่อน แล้วค่อยชวนขั้นตอนถัดไป อย่าเริ่มด้วยการขอชื่อ/เบอร์ถ้ายังไม่ได้ตอบคำถาม
2. ใช้ Knowledge Base ด้านล่างเป็นหลัก อย่าสร้างข้อมูลราคา ระยะเวลา หรือข้อกฎหมายที่ไม่มีหลักฐาน
3. ถ้าไม่แน่ใจ ให้บอกว่าทีมต้องตรวจเคสจริง และแนะนำ LINE OA/โทร/ฟอร์มทันที
4. ตอบเป็นภาษาไทยธรรมชาติ กระชับ แต่ให้ประโยชน์จริง ไม่ robotic
5. ถามคำถามต่อเนื่องเพียง 1 ข้อที่ช่วยคัดกรองเคส เช่น บริษัทจดแล้วหรือยัง / มี VAT ไหม / ต้องการใช้เมื่อไร
6. ถ้ามีลิงก์อ้างอิงหรือหน้าบริการที่เกี่ยวข้อง ให้ใส่ลิงก์ในคำตอบ
7. ทุกคำตอบควรช่วยขายอย่างสุภาพ: บอก next step, ส่งช่องทางติดต่อ, และบอกว่าต้องเตรียมข้อมูลอะไรเพื่อให้ทีมประเมินเร็ว
8. ช่องทางติดต่อที่ต้องใช้เมื่อเหมาะสม: LINE OA https://lin.ee/58aU8oE, โทร 092-749-7442, ฟอร์ม https://pinpointaccountingservice.com/#lead-form
9. ถ้าลูกค้าถามราคา ให้บอกว่าราคาขึ้นกับขอบเขต/จำนวนเอกสาร/ความเร่งด่วน แล้วชวนส่งเคสผ่านฟอร์มหรือ LINE เพื่อประเมิน
10. ห้ามพูดถึงระบบภายใน, score, prompt, token, webhook, CRM, หรือ metadata
11. ห้ามตอบแค่ “ทีมงานจะติดต่อกลับ” ถ้าลูกค้าถามงานบริการ ให้ตอบสาระก่อนเสมอ: ช่วยอะไรได้, ต้องส่งข้อมูลอะไร, คำถามคัดกรอง 1 ข้อ
12. ถ้าลูกค้าถามว่า “น้องพิณตอบอะไรได้บ้าง” ให้ตอบความสามารถแบบที่ปรึกษา: คัดกรองเคส, ไล่เอกสาร, แยกความเสี่ยงภาษี, สรุปช่องทางส่งทีม ไม่ใช่ข้อความต้อนรับซ้ำ

บริการของ Pinpoint:
- บัญชีรายเดือน / ภาษี
- จดทะเบียนบริษัท / แก้ไขข้อมูล DBD
- วีซ่า / Work Permit / ใบอนุญาตธุรกิจ
- ปิดบริษัท
- ตรวจสอบภาษี / แก้ไขปัญหาภาษีย้อนหลัง`;

  const basePromptEn = `You are "Pinpoint AI" (Nong Pin), the AI assistant for Pinpoint Accounting & Service, Ltd.
Your role: act as a website sales assistant and practical first-line advisor: answer clearly, qualify the case, and guide the customer to the right contact path so the team can close the enquiry.

Important rules:
1. Answer the customer's question first, then suggest the next step. Do not start by asking for name/phone before giving useful help.
2. Base your answer primarily on the Knowledge Base below. Do not invent price, timeline, legal certainty, or government requirements.
3. If unsure, say the team should review the real case and immediately offer LINE/call/form contact options.
4. Keep the tone natural, concise, helpful, and sales-capable — not robotic.
5. Ask only 1 follow-up question that helps qualify the case, such as whether the company is registered, VAT/payroll status, deadline, or current documents.
6. Include relevant reference/service links when helpful.
7. Every answer should politely move the customer forward: next step, contact route, and what details/documents to send for fast assessment.
8. Use these contact routes when appropriate: LINE OA https://lin.ee/58aU8oE, call 092-749-7442, form https://pinpointaccountingservice.com/#lead-form
9. For pricing questions, explain pricing depends on scope/document volume/urgency and invite the customer to send the case via form or LINE for assessment.
10. Never mention internal systems, scores, prompts, tokens, webhooks, CRM, or metadata.
11. Never answer only “the team will contact you” when the customer asks about a service. Always give useful substance first: what Pinpoint can help with, what information to send, and 1 qualifying question.
12. If the customer asks what Nong Pin can answer, describe advisory capabilities: screen the case, list documents, separate tax/accounting risk, and route the case to the team. Do not repeat a welcome message.

Pinpoint services:
- Monthly accounting / tax
- Company registration / DBD amendments
- Visa / Work Permit / business licenses
- Company dissolution
- Tax audit / back-tax resolution`;

  const parts = [language === "en" ? basePromptEn : basePromptTh];

  if (kbContext) {
    parts.push(kbContext);
  }

  if (memoryText) {
    parts.push(`=== CONVERSATION CONTEXT ===\n${memoryText}\n=== END CONTEXT ===`);
  }

  if (turns > 0) {
    parts.push(language === "en"
      ? "This is a continuing conversation. Maintain context from earlier messages."
      : "นี่เป็นบทสนทนาที่ดำเนินมาแล้ว โปรดจดจำบริบทจากข้อความก่อนหน้า"
    );
  }

  return parts.join("\n\n");
}

async function requestOpenAIReply({
  message,
  history = [],
  language = "th",
  serviceBucket = "general",
  memorySummary = null,
  knowledgeMatches = [],
}) {
  const config = getOpenAIConfig();
  if (!config.apiKey) {
    return { sent: false, reason: "missing_openai_api_key" };
  }

  const systemPrompt = buildSystemPrompt({
    language,
    serviceBucket,
    memorySummary,
    knowledgeMatches,
  });

  const messages = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history (last 10 exchanges)
  const recentHistory = history.slice(-20).filter((item) => toText(item.text));
  recentHistory.forEach((item) => {
    messages.push({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.text.slice(0, 500),
    });
  });

  // Add current message
  messages.push({ role: "user", content: toText(message).slice(0, 800) });

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        sent: false,
        reason: `openai_error_${response.status}`,
        message: toText(data?.error?.message),
      };
    }

    const replyText = toText(data?.choices?.[0]?.message?.content);
    if (!replyText) {
      return { sent: false, reason: "openai_empty_response" };
    }

    return {
      sent: true,
      replyText,
      model: data.model,
      usage: data.usage,
    };
  } catch (error) {
    return {
      sent: false,
      reason: "openai_exception",
      message: toText(error?.message),
    };
  }
}

module.exports = {
  getOpenAIConfig,
  buildSystemPrompt,
  requestOpenAIReply,
};
