const { toText } = require("./analytics");

function getOpenAIConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
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
บทบาทหลัก: ช่วยลูกค้าคิด ตอบคำถาม และแนะนำขั้นตอนถัดไปจากข้อมูลในเว็บไซต์ของบริษัท

กฎสำคัญ:
1. ตอบจากข้อมูลใน Knowledge Base ด้านล่างเป็นหลัก อย่าสร้างข้อมูลเอง
2. ถ้าไม่แน่ใจ ให้บอกว่าขอให้ทีมงานติดต่อกลับ และแนะนำให้โทร 092-749-7442 หรือทัก LINE OA
3. ตอบสั้น กระชับ เป็นกันเอง ไม่เกิน 3-4 ประโยค ยกเว้นถ้าลูกค้าขอรายละเอียด
4. ถามคำถามต่อเนื่อง 1 ข้อ เพื่อให้ลูกค้าเล่าต่อ
5. ถ้ามีลิงก์อ้างอิงใน Knowledge Base ให้ใส่ลิงก์ในคำตอบ
6. จดจำบริบทบทสนทนาก่อนหน้า ตอบให้สอดคล้องกับที่คุยมา
7. อย่าตอบแบบหุ่นยนต์ ใช้ภาษาพูดธรรมชาติ
8. ถ้าลูกค้าถามราคา ให้บอกว่าต้องดูรายละเอียดเคสก่อน และชวนส่งข้อมูลให้ทีมประเมิน

บริการของ Pinpoint:
- บัญชีรายเดือน / ภาษี
- จดทะเบียนบริษัท / แก้ไขข้อมูล DBD
- วีซ่า / Work Permit / ใบอนุญาตธุรกิจ
- ปิดบริษัท
- ตรวจสอบภาษี / แก้ไขปัญหาภาษีย้อนหลัง`;

  const basePromptEn = `You are "Pinpoint AI" (Nong Pin), the AI assistant for Pinpoint Accounting & Service, Ltd.
Your role: help customers think, answer questions, and suggest next steps using information from the company's website.

Important rules:
1. Base your answers primarily on the Knowledge Base below. Do not make up information.
2. If unsure, say you will have the team follow up, and recommend calling 092-749-7442 or LINE OA.
3. Keep answers concise and friendly, 3-4 sentences max unless the user asks for details.
4. Ask 1 follow-up question to keep the conversation flowing.
5. If there is a reference link in the Knowledge Base, include it in your answer.
6. Remember conversation context and answer consistently with previous messages.
7. Use natural, conversational language — not robotic.
8. If asked about pricing, explain that it depends on case details and invite them to submit info for assessment.

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
