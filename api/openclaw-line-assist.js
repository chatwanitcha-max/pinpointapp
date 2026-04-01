const { json, toJsonBody, toText } = require("./_lib/analytics");

function isAuthorized(req) {
  const configured = toText(process.env.OPENCLAW_WEBHOOK_TOKEN);
  if (!configured) return true;
  const incoming = toText(req.headers["x-openclaw-token"]);
  return Boolean(incoming) && incoming === configured;
}

function splitParagraphs(text) {
  return toText(text)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeText(text) {
  return toText(text)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function dedupeParagraphs(parts) {
  const seen = new Set();
  return parts.filter((part) => {
    const value = normalizeText(part);
    if (!value) return false;
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function looksLikeQuestion(text) {
  return /\?|ไหม|หรือ|คะ|ครับ|please|could you|would you|tell us|share|send/i.test(toText(text));
}

function buildFallbackClarify(language, serviceBucket) {
  if (language === "en") {
    if (serviceBucket === "accounting-tax") {
      return "Let us confirm the scope first. Do you want help with tax planning, VAT document flow, monthly accounting, or a filing deadline?";
    }
    if (serviceBucket === "corporate-dbd") {
      return "Let us confirm the scope first. Is this about a new company registration, a DBD amendment, or company documents?";
    }
    if (serviceBucket === "visa-license") {
      return "Let us confirm the scope first. Is this about a visa, work permit, renewal, or a business license?";
    }
    if (serviceBucket === "company-dissolution") {
      return "Let us confirm the scope first. Is this about closure planning, tax cleanup, or the dissolution filing?";
    }
    return "Let us confirm the scope first. What would you like the team to help with most right now?";
  }

  if (serviceBucket === "accounting-tax") {
    return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยวางแผนภาษี จัดรอบเอกสาร VAT บัญชีรายเดือน หรือเช็กกำหนดยื่นเรื่องใดเป็นหลักคะ";
  }
  if (serviceBucket === "corporate-dbd") {
    return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยจดบริษัทใหม่ เปลี่ยนแปลงข้อมูลบริษัท หรือขอเอกสารบริษัทเรื่องใดคะ";
  }
  if (serviceBucket === "visa-license") {
    return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยเรื่องวีซ่า Work Permit การต่ออายุ หรือใบอนุญาตธุรกิจเรื่องใดคะ";
  }
  if (serviceBucket === "company-dissolution") {
    return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยวางแผนปิดบริษัท เคลียร์ภาษีค้าง หรือยื่นเลิกบริษัทเรื่องใดคะ";
  }
  return "ขอเช็กให้ตรงก่อนนะคะ ตอนนี้ต้องการให้ทีมช่วยเรื่องใดเป็นหลักคะ";
}

function buildFriendlyOpener(language, turns, topicSwitched) {
  if (language === "en") {
    if (topicSwitched) return "Understood. Let us treat this as a new case.";
    return turns > 0 ? "" : "Hello, thank you for contacting Pinpoint.";
  }

  if (topicSwitched) return "รับทราบค่ะ ขอแยกเป็นอีกเคสให้เลยนะคะ";
  return turns > 0 ? "" : "สวัสดีค่ะ ขอบคุณที่ติดต่อ Pinpoint นะคะ";
}

function buildHandoffLine(language, handoff) {
  if (!handoff?.required) return "";

  if (language === "en") {
    return handoff.severity === "hot"
      ? "This case looks time-sensitive, so a human team member should take the next step directly."
      : "This case has details that should be reviewed by a human team member before the next case-specific instruction.";
  }

  return handoff.severity === "hot"
    ? "เคสนี้ค่อนข้างเร่งด่วนค่ะ ทีมงานจะรับช่วงต่อเพื่อดูรายละเอียดให้ตรงที่สุด"
    : "เคสนี้มีรายละเอียดที่ควรให้ทีมงานช่วยตรวจต่อก่อนค่ะ เพื่อให้คำแนะนำตรงกับสถานการณ์มากที่สุด";
}

function buildReferenceLine(language, payload) {
  const analysis = payload?.replyAnalysis || {};
  const officialUrl = toText(payload?.referenceContext?.official?.sourceUrl);
  if (!analysis.shouldIncludeReference || !officialUrl) return "";

  return language === "en"
    ? `Official reference: ${officialUrl}`
    : `ลิงก์อ้างอิงทางการ: ${officialUrl}`;
}

function shouldUseCallbackOnlyReply(payload) {
  const detailId = toText(payload?.intentDetail?.id);
  const subIntentKey = toText(payload?.intentDetail?.subIntentKey);
  const caseFlavor = toText(payload?.replyAnalysis?.caseFlavor);
  const serviceBucket = toText(payload?.effectiveServiceBucket || payload?.routing?.serviceBucket);

  if (detailId === "new-registration" || subIntentKey === "new-registration" || caseFlavor === "new-registration") {
    return false;
  }

  if (serviceBucket === "corporate-dbd" && /new-registration/i.test(toText(payload?.replyDraftText))) {
    return false;
  }

  return true;
}

function buildCallbackOnlyReply(language, opener) {
  const callbackLine =
    language === "en"
      ? "Our team will contact you as soon as possible. Thank you."
      : "ทีมงานของเราจะติดต่อกลับคุณลูกค้าโดยด่วนที่สุดค่ะ ขอบคุณค่ะ";

  return dedupeParagraphs([opener, callbackLine]).join("\n\n");
}

function stripBottyLines(paragraphs, language) {
  return paragraphs.filter((part) => {
    if (language === "en") {
      return !/^hello, thank you for contacting pinpoint\.?$/i.test(part);
    }
    return !/^สวัสดีค่ะ ขอบคุณที่ติดต่อ Pinpoint นะคะ$/i.test(part);
  });
}

function buildReplyText(payload) {
  const language =
    toText(payload?.lineEvent?.detectedLanguage) ||
    toText(payload?.routing?.language) ||
    "th";
  const serviceBucket =
    toText(payload?.effectiveServiceBucket) ||
    toText(payload?.routing?.serviceBucket) ||
    "general";
  const analysis = payload?.replyAnalysis || {};
  const handoff = payload?.handoff || null;
  const control = payload?.conversationControl || {};
  const turns = Number(payload?.conversationSummary?.turns || 0);
  const draft = toText(payload?.replyDraftText);

  if (control.resetOnly) {
    return {
      replyText:
        language === "en"
          ? "Sure, we can start fresh. What would you like the team to help with first?"
          : "ได้เลยค่ะ เริ่มเคสใหม่ให้แล้ว ตอนนี้อยากให้ทีมช่วยเรื่องไหนเป็นหลักคะ",
      confidence: "high",
      shouldClarify: true,
      evidenceUsed: [],
    };
  }

  const opener = buildFriendlyOpener(language, turns, Boolean(control.topicSwitched));

  if (shouldUseCallbackOnlyReply(payload)) {
    return {
      replyText: buildCallbackOnlyReply(language, opener),
      confidence: "high",
      shouldClarify: false,
      evidenceUsed: Array.isArray(analysis.verifiedBy) ? analysis.verifiedBy : [],
    };
  }

  const paragraphs = stripBottyLines(
    dedupeParagraphs(splitParagraphs(draft).map(normalizeText)),
    language
  );

  if (analysis.shouldClarify) {
    const question =
      paragraphs.find((part) => looksLikeQuestion(part)) ||
      buildFallbackClarify(language, serviceBucket);

    return {
      replyText: dedupeParagraphs([opener, question, buildHandoffLine(language, handoff)]).join("\n\n"),
      confidence: toText(analysis.confidence) || "medium",
      shouldClarify: true,
      evidenceUsed: Array.isArray(analysis.verifiedBy) ? analysis.verifiedBy : [],
    };
  }

  const responseParts = dedupeParagraphs([
    opener,
    ...paragraphs,
    buildReferenceLine(language, payload),
    buildHandoffLine(language, handoff),
  ]);

  const fallback =
    responseParts.join("\n\n") ||
    (language === "en"
      ? "Thank you for your message. Please tell us what you would like the team to help with most."
      : "ขอบคุณสำหรับข้อความค่ะ รบกวนแจ้งได้เลยว่าตอนนี้ต้องการให้ทีมช่วยเรื่องใดเป็นหลัก");

  return {
    replyText: fallback,
    confidence: toText(analysis.confidence) || "medium",
    shouldClarify: false,
    evidenceUsed: Array.isArray(analysis.verifiedBy) ? analysis.verifiedBy : [],
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { ok: false, error: "invalid_openclaw_token" });
  }

  const body = toJsonBody(req.body);
  const mode = toText(body.mode);
  const payload = mode === "line_auto_reply" ? body.payload || {} : body;

  if (mode === "line_auto_reply") {
    const reply = buildReplyText(payload);
    return json(res, 200, {
      ok: true,
      mode,
      replyText: reply.replyText,
      handoffRequired: Boolean(payload?.handoff?.required),
      confidence: reply.confidence,
      shouldClarify: reply.shouldClarify,
      evidenceUsed: reply.evidenceUsed,
    });
  }

  return json(res, 200, {
    ok: true,
    mode: mode || "event_intake",
    accepted: true,
    source: toText(payload?.source),
    type: toText(payload?.type),
  });
};
