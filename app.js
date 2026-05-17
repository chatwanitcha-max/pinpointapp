const TEXT = {
  th: {
    leadSending: "กำลังส่งข้อมูลเพื่อรับแผนงานจากทีม...",
    leadSuccess: "ได้รับข้อมูลแล้ว ทีมงานจะติดต่อกลับภายใน 1 วันทำการตามช่องทางที่คุณเลือก",
    leadError: "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือโทร 092-749-7442",
    leadBlocked: "ระบบตรวจพบการกรอกอัตโนมัติบางช่อง ฟอร์มจึงยังไม่ถูกส่ง กรุณากรอกใหม่แล้วลองอีกครั้ง",
    scoreLabel: "คะแนนความพร้อมใช้งาน",
    seoTitle: "หัวข้อ SEO",
    seoMeta: "คำอธิบาย Meta",
    seoKeywords: "กลุ่มคำค้นหา",
    seoAds: "ข้อความโฆษณา",
    seoToneProfessional: "ภาพลักษณ์มืออาชีพและน่าเชื่อถือ",
    seoToneFriendly: "ภาษาชัดเจน คุยง่าย และเข้าถึงง่าย",
    seoTonePremium: "ภาพลักษณ์พรีเมียม สุภาพ และเป็นทางการ",
    visitorLoading: "ค่าการเข้าถึง: กำลังอัปเดต...",
    visitorStats: "ค่าการเข้าถึง (รวม/ไม่ซ้ำ): {siteViews} / {siteUnique}",
    visitorPageStats: "หน้านี้ (รวม/ไม่ซ้ำ): {pageViews} / {pageUnique}"
  },
  en: {
    leadSending: "Submitting your details for a custom action plan...",
    leadSuccess: "Your details have been received. Our team will contact you within 1 business day via your preferred channel.",
    leadError: "Submission failed. Please try again or call 092-749-7442.",
    leadBlocked: "We detected automated autofill in a protected field, so the form was not sent. Please try again.",
    scoreLabel: "readiness score",
    seoTitle: "SEO Title",
    seoMeta: "Meta Description",
    seoKeywords: "Keyword Cluster",
    seoAds: "Ad Copy",
    seoToneProfessional: "professional and trusted",
    seoToneFriendly: "clear, friendly, and approachable",
    seoTonePremium: "premium, executive-level, and credible",
    visitorLoading: "Access count: updating...",
    visitorStats: "Access count (total/unique): {siteViews} / {siteUnique}",
    visitorPageStats: "This page (total/unique): {pageViews} / {pageUnique}"
  }
};

const appState = {
  lang: "th",
  visitorStats: null
};

function getText(lang, key) {
  return TEXT[lang]?.[key] || TEXT.th[key] || "";
}

function truncate(text, limit) {
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function resolveLang() {
  const queryLang = new URLSearchParams(window.location.search).get("lang");
  if (queryLang === "th" || queryLang === "en") return queryLang;

  const savedLang = window.localStorage.getItem("pinpoint_lang");
  return savedLang === "en" ? "en" : "th";
}

function setTextNodes(lang) {
  document.querySelectorAll("[data-th][data-en]").forEach((node) => {
    const value = lang === "th" ? node.dataset.th : node.dataset.en;
    if (typeof value === "string") {
      node.textContent = value;
    }
  });
}

function setPlaceholders(lang) {
  document.querySelectorAll("[data-placeholder-th][data-placeholder-en]").forEach((node) => {
    const value = lang === "th" ? node.dataset.placeholderTh : node.dataset.placeholderEn;
    if (typeof value === "string") {
      node.setAttribute("placeholder", value);
    }
  });
}

function setMeta(lang) {
  const body = document.body;
  const pageTitle = lang === "th" ? body.dataset.titleTh : body.dataset.titleEn;
  if (pageTitle) {
    document.title = pageTitle;
  }

  document.querySelectorAll("meta[data-th][data-en]").forEach((node) => {
    const value = lang === "th" ? node.dataset.th : node.dataset.en;
    if (typeof value === "string") {
      node.setAttribute("content", value);
    }
  });
}

function setToggleLabels(lang) {
  document.querySelectorAll("[data-lang-toggle]").forEach((node) => {
    node.textContent = lang === "th" ? "EN" : "TH";
  });
}

function setLangPanels(lang) {
  document.querySelectorAll("[data-lang-panel]").forEach((node) => {
    const matches = node.dataset.langPanel === lang;
    node.classList.toggle("is-active", matches);
  });
}

function syncUrl(lang) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.history.replaceState({}, "", url.toString());
}

function applyLanguage(lang) {
  appState.lang = lang;
  document.documentElement.lang = lang;
  document.body.dataset.lang = lang;
  setTextNodes(lang);
  setPlaceholders(lang);
  setMeta(lang);
  setToggleLabels(lang);
  setLangPanels(lang);
  window.localStorage.setItem("pinpoint_lang", lang);
  syncUrl(lang);
  updateAiChatLanguage(lang);
  renderVisitorCounter();
}

function toneLabel(lang, tone) {
  if (tone === "friendly") return getText(lang, "seoToneFriendly");
  if (tone === "premium") return getText(lang, "seoTonePremium");
  return getText(lang, "seoToneProfessional");
}

function buildSeoPack({ lang, service, audience, location, tone }) {
  const toneValue = toneLabel(lang, tone);

  if (lang === "en") {
    const title = truncate(
      `${service}${location ? ` in ${location}` : ""} | Pinpoint Accounting & Service`,
      60
    );
    const meta = truncate(
      `${service}${location ? ` in ${location}` : ""} for ${
        audience || "business owners"
      }. ${toneValue} support by Pinpoint Accounting & Service, Ltd.`,
      155
    );
    const keywords = [
      service,
      `${service} Thailand`,
      `${service} ${location || "Bangkok"}`,
      `${service} for ${audience || "SMEs"}`,
      "accounting and corporate services thailand"
    ].join(", ");
    const ads = [
      `Need ${service}?`,
      `Pinpoint offers ${toneValue} support with clear scope and bilingual communication.`,
      location ? `Serving ${location} and Thailand-based operations.` : "Serving companies operating in Thailand."
    ].join("\n");

    return { title, meta, keywords, ads };
  }

  const title = truncate(
    `${service}${location ? ` ${location}` : ""} | Pinpoint Accounting & Service`,
    60
  );
  const meta = truncate(
    `${service}${location ? ` ใน${location}` : ""} สำหรับ${
      audience || "ผู้ประกอบการ"
    } โดยทีม${toneValue}ของ Pinpoint Accounting & Service, Ltd.`,
    155
  );
  const keywords = [
    service,
    `${service} ประเทศไทย`,
    `${service} ${location || "กรุงเทพ"}`,
    `${service} สำหรับ ${audience || "ธุรกิจ SME"}`,
    "สำนักงานบัญชีและที่ปรึกษาธุรกิจ"
  ].join(", ");
  const ads = [
    `${service} โดยทีมงานมืออาชีพ`,
    `Pinpoint ให้บริการแบบ${toneValue} พร้อมอธิบายขอบเขตงานและเอกสารที่ต้องใช้`,
    location ? `รองรับลูกค้าใน${location}และธุรกิจที่ดำเนินงานในประเทศไทย` : "รองรับธุรกิจที่ดำเนินงานในประเทศไทย"
  ].join("\n");

  return { title, meta, keywords, ads };
}

function calcScore(pack, location, audience) {
  let score = 0;
  if (pack.title.length >= 35 && pack.title.length <= 60) score += 35;
  if (pack.meta.length >= 100 && pack.meta.length <= 155) score += 35;
  if (location) score += 15;
  if (audience) score += 15;
  return Math.min(score, 100);
}

function populateUtmFields() {
  const params = new URLSearchParams(window.location.search);
  const fields = [
    ["utmSource", "utm_source"],
    ["utmMedium", "utm_medium"],
    ["utmCampaign", "utm_campaign"]
  ];

  fields.forEach(([fieldId, queryName]) => {
    const node = document.getElementById(fieldId);
    if (node) {
      node.value = params.get(queryName) || "";
    }
  });
}

function applyLineLinks() {
  const lineUrl =
    (window.PINPOINT_CONFIG && window.PINPOINT_CONFIG.lineOaUrl) ||
    "https://lin.ee/58aU8oE";

  document.querySelectorAll(".line-chat").forEach((node) => {
    node.setAttribute("href", lineUrl);
  });
}

function applyLeadChannelAvailability() {
  const emailLeadEnabled = Boolean(
    window.PINPOINT_CONFIG && window.PINPOINT_CONFIG.emailLeadEnabled
  );
  const preferredSelect = document.getElementById("leadPreferred");
  const emailOption = preferredSelect?.querySelector('[data-contact-option="email"]');

  if (emailOption) {
    emailOption.hidden = !emailLeadEnabled;
    emailOption.disabled = !emailLeadEnabled;
  }

  if (preferredSelect && preferredSelect.value === "email" && !emailLeadEnabled) {
    preferredSelect.value = "phone";
  }
}

const AI_CHAT_HISTORY_KEY = "pinpoint_ai_chat_history";
const AI_CHAT_SESSION_KEY = "pinpoint_ai_chat_session";
const AI_CHAT_VISITOR_KEY = "pinpoint_ai_chat_visitor";

function getAiChatCopy(lang) {
  if (lang === "en") {
    return {
      title: "I’m Pinpoint AI. How can I help today?",
      subtitle: "",
      toggle: "Ask AI",
      close: "Close",
      welcome:
        "Hello, I am Pinpoint AI. Tell me what you need help with today, and I will guide the next step.",
      placeholder: "Type your question or case details...",
      send: "Send",
      typing: "Checking the Pinpoint knowledge base...",
      error: "The chat could not reply right now. Please call 092-749-7442 or continue via LINE OA.",
      phone: "Call",
      line: "LINE",
      form: "Form",
      note: "",
      suggestions: [
        {
          label: "Work Permit",
          prompt: "What should I prepare for a Thai work permit case?"
        },
        {
          label: "Monthly accounting",
          prompt: "What information do you need to estimate monthly accounting service?"
        },
        {
          label: "Company setup",
          prompt: "I want to register a company in Thailand. What is the first step?"
        }
      ]
    };
  }

  return {
    title: "น้องคือ Pinpoint Ai วันนี้ให้น้องพิณช่วยอะไรดีคะ",
    subtitle: "",
    toggle: "ถาม AI",
    close: "ปิด",
    welcome:
      "สวัสดีค่ะ ฉันคือผู้ช่วย AI ของ Pinpoint เล่าเรื่องที่ต้องการได้เลยค่ะ",
    placeholder: "พิมพ์คำถามหรือรายละเอียดเคสของคุณ...",
    send: "ส่ง",
    typing: "กำลังเช็กฐานความรู้ของ Pinpoint...",
    error: "แชตตอบกลับไม่สำเร็จชั่วคราว กรุณาโทร 092-749-7442 หรือทัก LINE OA ได้เลยค่ะ",
    phone: "โทร",
    line: "LINE",
    form: "ฟอร์ม",
    note: "",
    suggestions: [
      {
        label: "Work Permit",
        prompt: "ต้องการทำ Work Permit ต้องเตรียมอะไรบ้าง"
      },
      {
        label: "บัญชีรายเดือน",
        prompt: "อยากประเมินค่าบริการบัญชีรายเดือน ต้องส่งข้อมูลอะไรให้ทีมบ้าง"
      },
      {
        label: "จดบริษัท",
        prompt: "อยากจดบริษัทในไทย ต้องเริ่มจากขั้นตอนไหน"
      }
    ]
  };
}

function getAiChatLineUrl() {
  return (
    (window.PINPOINT_CONFIG && window.PINPOINT_CONFIG.lineOaUrl) ||
    "https://lin.ee/58aU8oE"
  );
}

function getAiChatVisitorId() {
  try {
    const existing = window.localStorage.getItem(AI_CHAT_VISITOR_KEY);
    if (existing) return existing;
    const next = `visitor_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(AI_CHAT_VISITOR_KEY, next);
    return next;
  } catch {
    return `visitor_${Date.now()}`;
  }
}

function getAiChatSessionId() {
  try {
    const existing = window.localStorage.getItem(AI_CHAT_SESSION_KEY);
    if (existing) return existing;
    const next = `chat_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(AI_CHAT_SESSION_KEY, next);
    return next;
  } catch {
    return `chat_${Date.now()}`;
  }
}

function saveAiChatSessionId(sessionId) {
  if (!sessionId) return;
  try {
    window.localStorage.setItem(AI_CHAT_SESSION_KEY, sessionId);
  } catch {
    // Browser storage can be unavailable in private mode.
  }
}

function readAiChatHistory() {
  try {
    const raw = window.localStorage.getItem(AI_CHAT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && typeof item.text === "string")
          .map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            text: item.text.slice(0, 900)
          }))
          .slice(-16)
      : [];
  } catch {
    return [];
  }
}

function writeAiChatHistory(history) {
  try {
    window.localStorage.setItem(AI_CHAT_HISTORY_KEY, JSON.stringify(history.slice(-16)));
  } catch {
    // Non-critical: the chat still works without local history.
  }
}

function rememberAiChatMessage(role, text) {
  const value = String(text || "").trim();
  if (!value) return;
  const history = readAiChatHistory();
  history.push({ role: role === "assistant" ? "assistant" : "user", text: value });
  writeAiChatHistory(history);
}

function addAiChatMessage(root, role, text) {
  const list = root.querySelector("[data-ai-messages]");
  if (!list) return null;
  const item = document.createElement("div");
  item.className = `ai-chat-message ai-chat-message--${role === "user" ? "user" : "assistant"}`;
  const bubble = document.createElement("p");
  bubble.textContent = text;
  item.appendChild(bubble);
  list.appendChild(item);
  list.scrollTop = list.scrollHeight;
  return item;
}

function setAiChatBusy(root, busy) {
  root.classList.toggle("is-busy", busy);
  root.querySelectorAll("button, textarea").forEach((node) => {
    if (node.dataset.aiClose !== "true" && node.dataset.aiToggle !== "true") {
      node.disabled = busy;
    }
  });
}

function setAiChatOpen(root, open) {
  root.classList.toggle("is-open", open);
  if (!open) root.classList.remove("is-centered");
  const toggle = root.querySelector("[data-ai-toggle]");
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    const input = root.querySelector("[data-ai-input]");
    window.setTimeout(() => input?.focus(), 80);
  }
}

function updateAiChatLanguage(lang) {
  const root = document.getElementById("pinpointAiChat");
  if (!root) return;
  const copy = getAiChatCopy(lang);
  const setters = {
    "[data-ai-title]": copy.title,
    "[data-ai-subtitle]": copy.subtitle,
    "[data-ai-toggle-label]": copy.toggle,
    "[data-ai-note]": copy.note,
    "[data-ai-send]": copy.send,
    "[data-ai-phone]": copy.phone,
    "[data-ai-line]": copy.line,
    "[data-ai-form]": copy.form,
  };
  Object.entries(setters).forEach(([selector, value]) => {
    const node = root.querySelector(selector);
    if (node) node.textContent = value;
  });
  const close = root.querySelector("[data-ai-close]");
  if (close) close.setAttribute("aria-label", copy.close);
  const input = root.querySelector("[data-ai-input]");
  if (input) input.setAttribute("placeholder", copy.placeholder);
  root.querySelectorAll("[data-ai-prompt-index]").forEach((node) => {
    const prompt = copy.suggestions[Number(node.dataset.aiPromptIndex)] || copy.suggestions[0];
    node.textContent = prompt.label;
    node.dataset.prompt = prompt.prompt;
  });
}

async function sendAiChatMessage(root, text) {
  const message = String(text || "").trim();
  if (!message) return;

  const input = root.querySelector("[data-ai-input]");
  const historyBeforeSend = readAiChatHistory();
  addAiChatMessage(root, "user", message);
  rememberAiChatMessage("user", message);
  if (input) input.value = "";

  const copy = getAiChatCopy(appState.lang || resolveLang());
  setAiChatBusy(root, true);
  const typing = addAiChatMessage(root, "assistant", copy.typing);

  try {
    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getAiChatSessionId(),
        visitorId: getAiChatVisitorId(),
        language: appState.lang || resolveLang(),
        message,
        history: historyBeforeSend,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent
      })
    });
    const data = await response.json().catch(() => ({}));
    typing?.remove();
    if (!response.ok || !data.replyText) {
      throw new Error(data.error || `chat_${response.status}`);
    }
    saveAiChatSessionId(data.sessionId);
    addAiChatMessage(root, "assistant", data.replyText);
    rememberAiChatMessage("assistant", data.replyText);
  } catch {
    typing?.remove();
    addAiChatMessage(root, "assistant", copy.error);
  } finally {
    setAiChatBusy(root, false);
    input?.focus();
  }
}

function initAiChat() {
  if (document.getElementById("pinpointAiChat")) return;

  const root = document.createElement("section");
  root.id = "pinpointAiChat";
  root.className = "ai-chat-widget";
  root.innerHTML = `
    <button class="ai-chat-toggle" type="button" data-ai-toggle="true" aria-expanded="true">
      <span class="ai-chat-toggle__dot" aria-hidden="true"></span>
      <span data-ai-toggle-label></span>
    </button>
    <button class="ai-chat-backdrop" type="button" data-ai-backdrop="true" aria-label="Close AI chat"></button>
    <div class="ai-chat-panel" role="dialog" aria-label="Pinpoint AI chat" data-ai-panel="true">
      <div class="ai-chat-head">
        <div>
          <strong data-ai-title></strong>
          <span data-ai-subtitle></span>
        </div>
        <button class="ai-chat-close" type="button" data-ai-close="true">x</button>
      </div>
      <div class="ai-chat-prompts">
        <button type="button" data-ai-prompt-index="0"></button>
        <button type="button" data-ai-prompt-index="1"></button>
        <button type="button" data-ai-prompt-index="2"></button>
      </div>
      <div class="ai-chat-messages" data-ai-messages></div>
      <form class="ai-chat-form" data-ai-form-shell>
        <textarea data-ai-input rows="2"></textarea>
        <button type="submit" data-ai-send></button>
      </form>
      <div class="ai-chat-actions">
        <a href="tel:0927497442" data-ai-phone></a>
        <a class="line-chat" href="${getAiChatLineUrl()}" target="_blank" rel="noreferrer" data-ai-line></a>
        <a href="/#lead-form" data-ai-form></a>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  updateAiChatLanguage(appState.lang || resolveLang());

  const messages = root.querySelector("[data-ai-messages]");
  const history = readAiChatHistory();
  if (history.length) {
    history.forEach((item) => addAiChatMessage(root, item.role, item.text));
  } else {
    addAiChatMessage(root, "assistant", getAiChatCopy(appState.lang || resolveLang()).welcome);
  }
  if (messages) messages.scrollTop = messages.scrollHeight;

  root.querySelector("[data-ai-toggle]")?.addEventListener("click", () => {
    root.classList.remove("is-centered");
    setAiChatOpen(root, !root.classList.contains("is-open"));
  });
  root.querySelector("[data-ai-backdrop]")?.addEventListener("click", () => {
    setAiChatOpen(root, false);
  });
  root.querySelector("[data-ai-close]")?.addEventListener("click", () => {
    setAiChatOpen(root, false);
  });
  root.querySelector("[data-ai-form-shell]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendAiChatMessage(root, root.querySelector("[data-ai-input]")?.value || "");
  });
  root.querySelector("[data-ai-input]")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendAiChatMessage(root, event.currentTarget.value);
    }
  });
  root.querySelectorAll("[data-ai-prompt-index]").forEach((node) => {
    node.addEventListener("click", () => {
      sendAiChatMessage(root, node.dataset.prompt || node.textContent);
    });
  });
}

function bindRuntimeConfigSync() {
  window.addEventListener("pinpoint:config-updated", () => {
    applyLineLinks();
    applyLeadChannelAvailability();
    updateAiChatLanguage(appState.lang || resolveLang());
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getVisitorId() {
  try {
    const storageKey = "pinpoint_visitor_id";
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;

    const generated = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return "";
  }
}

function ensureVisitorCounterNode() {
  let node = document.getElementById("visitorCounter");
  if (node) return node;

  const host = document.querySelector(".footer .footer-meta");
  if (!host) return null;

  node = document.createElement("p");
  node.id = "visitorCounter";
  node.className = "visitor-counter";
  host.appendChild(node);
  return node;
}

function renderVisitorCounter() {
  const node = ensureVisitorCounterNode();
  if (!node) return;

  const lang = appState.lang || "th";
  const stats = appState.visitorStats;

  if (!stats) {
    node.textContent = getText(lang, "visitorLoading");
    return;
  }

  const siteLine = getText(lang, "visitorStats")
    .replace("{siteViews}", formatNumber(stats.siteViews))
    .replace("{siteUnique}", formatNumber(stats.siteUniqueVisitors));
  const pageLine = getText(lang, "visitorPageStats")
    .replace("{pageViews}", formatNumber(stats.pageViews))
    .replace("{pageUnique}", formatNumber(stats.pageUniqueVisitors));

  node.textContent = `${siteLine} | ${pageLine}`;
}

async function trackVisitorCounter() {
  const visitorId = getVisitorId();
  if (!visitorId) return;

  renderVisitorCounter();

  try {
    const response = await fetch("/api/visitor-counter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        pagePath: window.location.pathname || "/",
      }),
    });

    if (!response.ok) return;

    const payload = await response.json();
    if (!payload.ok || !payload.totals) return;

    appState.visitorStats = payload.totals;
    renderVisitorCounter();
  } catch {
    // intentionally ignored to keep UX non-blocking
  }
}

async function handleLeadSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const lang = appState.lang;
  const statusNode = document.getElementById("leadStatus");
  const submitButton = document.getElementById("leadSubmitBtn");

  if (!statusNode || !submitButton) return;

  statusNode.textContent = getText(lang, "leadSending");
  statusNode.classList.remove("error");
  submitButton.disabled = true;

  const payload = {
    fullName: document.getElementById("leadName")?.value.trim() || "",
    phone: document.getElementById("leadPhone")?.value.trim() || "",
    email: document.getElementById("leadEmail")?.value.trim() || "",
    businessName: document.getElementById("leadBusiness")?.value.trim() || "",
    serviceNeed: document.getElementById("leadService")?.value || "",
    revenueRange: document.getElementById("leadRevenue")?.value || "",
    preferredContact:
      document.getElementById("leadPreferred")?.value ||
      ((window.PINPOINT_CONFIG && window.PINPOINT_CONFIG.emailLeadEnabled) ? "email" : "phone"),
    notes: document.getElementById("leadNotes")?.value.trim() || "",
    website: document.getElementById("trapField")?.value || "",
    utmSource: document.getElementById("utmSource")?.value || "",
    utmMedium: document.getElementById("utmMedium")?.value || "",
    utmCampaign: document.getElementById("utmCampaign")?.value || "",
    pageUrl: window.location.href
  };

  if (window.PinpointTracking && window.PinpointTracking.collectTrackingPayload) {
    Object.assign(payload, window.PinpointTracking.collectTrackingPayload());
  }

  try {
    const response = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("lead_submit_failed");
    }

    const result = await response.json();
    if (result.ignored) {
      throw new Error("lead_honeypot_triggered");
    }

    const leadId = result.leadId || `lead_${Date.now()}`;

    if (window.PinpointTracking && window.PinpointTracking.trackLeadSubmission) {
      window.PinpointTracking.trackLeadSubmission({
        eventId: leadId,
        email: payload.email,
        phone: payload.phone
      });
    }

    form.reset();
    populateUtmFields();
    statusNode.textContent = getText(lang, "leadSuccess");
    window.location.href = `/thank-you?leadId=${encodeURIComponent(leadId)}&lang=${encodeURIComponent(lang)}`;
  } catch (error) {
    if (error?.message === "lead_honeypot_triggered") {
      statusNode.textContent = getText(lang, "leadBlocked");
    } else {
      statusNode.textContent = getText(lang, "leadError");
    }
    statusNode.classList.add("error");
  } finally {
    submitButton.disabled = false;
  }
}

function bindSeoForm() {
  const form = document.getElementById("seoForm");
  if (!form) return;

  const outputs = {
    title: document.getElementById("outTitle"),
    meta: document.getElementById("outMeta"),
    keywords: document.getElementById("outKeywords"),
    ads: document.getElementById("outAds"),
    score: document.getElementById("outScore")
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const service = document.getElementById("serviceInput")?.value.trim() || "";
    const audience = document.getElementById("audienceInput")?.value.trim() || "";
    const location = document.getElementById("locationInput")?.value.trim() || "";
    const tone = document.getElementById("toneInput")?.value || "professional";

    if (!service) return;

    const pack = buildSeoPack({
      lang: appState.lang,
      service,
      audience,
      location,
      tone
    });

    const score = calcScore(pack, location, audience);
    outputs.title.textContent = pack.title;
    outputs.meta.textContent = pack.meta;
    outputs.keywords.textContent = pack.keywords;
    outputs.ads.textContent = pack.ads;
    outputs.score.textContent = `${score}/100 ${getText(appState.lang, "scoreLabel")}`;
  });
}

function bindEvents() {
  document.querySelectorAll("[data-lang-toggle]").forEach((node) => {
    node.addEventListener("click", () => {
      applyLanguage(appState.lang === "th" ? "en" : "th");
    });
  });

  const leadForm = document.getElementById("leadForm");
  if (leadForm) {
    leadForm.addEventListener("submit", handleLeadSubmit);
  }

  bindSeoForm();
}

function initMobileTopbar() {
  const topbar = document.querySelector(".topbar");
  const nav = topbar?.querySelector(".nav");
  const navActions = topbar?.querySelector(".nav-actions");

  if (!topbar || !nav || !navActions || topbar.dataset.mobileTopbarReady === "true") {
    return;
  }

  topbar.dataset.mobileTopbarReady = "true";

  const mobileQuery = window.matchMedia("(max-width: 1024px), (hover: none) and (pointer: coarse)");
  const toggle = document.createElement("button");
  const navId = nav.id || "site-navigation";
  let isMenuOpen = false;
  let lastScrollY = window.scrollY;
  let isTicking = false;

  nav.id = navId;

  toggle.type = "button";
  toggle.className = "mobile-nav-toggle";
  toggle.setAttribute("aria-controls", navId);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Toggle navigation");
  toggle.innerHTML = [
    '<span class="mobile-nav-toggle__label" data-th="เมนู" data-en="Menu">เมนู</span>',
    '<span class="mobile-nav-toggle__icon" aria-hidden="true"><span></span><span></span><span></span></span>'
  ].join("");

  topbar.insertBefore(toggle, nav);

  function syncAria() {
    if (!mobileQuery.matches) {
      nav.removeAttribute("aria-hidden");
      navActions.removeAttribute("aria-hidden");
      return;
    }

    nav.setAttribute("aria-hidden", String(!isMenuOpen));
    navActions.setAttribute("aria-hidden", String(!isMenuOpen));
  }

  function setMenuState(nextOpen) {
    isMenuOpen = nextOpen;
    topbar.classList.toggle("is-mobile-menu-open", nextOpen);
    toggle.classList.toggle("is-open", nextOpen);
    toggle.setAttribute("aria-expanded", String(nextOpen));

    if (nextOpen) {
      topbar.classList.remove("is-hidden");
    }

    syncAria();
  }

  function updateTopbarVisibility() {
    topbar.classList.toggle("is-mobile-ui", mobileQuery.matches);

    if (!mobileQuery.matches) {
      topbar.classList.remove("is-mobile-ui", "is-mobile-menu-ready", "is-mobile-menu-open", "is-hidden", "is-compact");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      isMenuOpen = false;
      lastScrollY = window.scrollY;
      syncAria();
      return;
    }

    topbar.classList.add("is-mobile-menu-ready");

    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;
    const nearTop = currentScrollY < 24;
    const scrollingDown = delta > 6;
    const scrollingUp = delta < -8;

    topbar.classList.toggle("is-compact", currentScrollY > 28);

    if (isMenuOpen || nearTop || scrollingUp) {
      topbar.classList.remove("is-hidden");
    } else if (scrollingDown && currentScrollY > 64) {
      topbar.classList.add("is-hidden");
    }

    lastScrollY = currentScrollY;
  }

  function queueVisibilityUpdate() {
    if (isTicking) return;

    isTicking = true;
    window.requestAnimationFrame(() => {
      updateTopbarVisibility();
      isTicking = false;
    });
  }

  toggle.addEventListener("click", () => {
    setMenuState(!isMenuOpen);
    lastScrollY = window.scrollY;
  });

  topbar.querySelectorAll(".nav a, .nav-actions a").forEach((node) => {
    node.addEventListener("click", () => {
      if (!mobileQuery.matches) return;
      setMenuState(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (!mobileQuery.matches || !isMenuOpen) return;
    if (topbar.contains(event.target)) return;
    setMenuState(false);
  });

  document.addEventListener(
    "touchstart",
    (event) => {
      if (!mobileQuery.matches) return;
      const touch = event.touches?.[0];
      if (!touch || touch.clientY > 84) return;
      topbar.classList.remove("is-hidden");
    },
    { passive: true }
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isMenuOpen) return;
    setMenuState(false);
  });

  topbar.addEventListener("focusin", () => {
    if (!mobileQuery.matches) return;
    topbar.classList.remove("is-hidden");
  });

  window.addEventListener("scroll", queueVisibilityUpdate, { passive: true });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", updateTopbarVisibility);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(updateTopbarVisibility);
  }

  updateTopbarVisibility();
}

function bindMobileTopbarAutoHide() {
  const topbar = document.querySelector(".topbar");
  if (!topbar || topbar.dataset.mobileTopbarAutoHideReady === "true") return;

  topbar.dataset.mobileTopbarAutoHideReady = "true";

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  let lastScrollY = window.scrollY;
  let isTicking = false;

  function applyVisibility() {
    const currentScrollY = window.scrollY;

    if (!mobileQuery.matches) {
      topbar.classList.remove("is-scroll-hidden");
      lastScrollY = currentScrollY;
      return;
    }

    const delta = currentScrollY - lastScrollY;
    const nearTop = currentScrollY < 20;
    const scrollingDown = delta > 6;
    const scrollingUp = delta < -8;

    if (nearTop || scrollingUp) {
      topbar.classList.remove("is-scroll-hidden");
    } else if (scrollingDown && currentScrollY > 72) {
      topbar.classList.add("is-scroll-hidden");
    }

    lastScrollY = currentScrollY;
  }

  function queueVisibilityUpdate() {
    if (isTicking) return;
    isTicking = true;
    window.requestAnimationFrame(() => {
      applyVisibility();
      isTicking = false;
    });
  }

  document.addEventListener(
    "touchstart",
    (event) => {
      if (!mobileQuery.matches) return;
      const touch = event.touches?.[0];
      if (!touch || touch.clientY > 84) return;
      topbar.classList.remove("is-scroll-hidden");
    },
    { passive: true }
  );

  window.addEventListener("scroll", queueVisibilityUpdate, { passive: true });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", applyVisibility);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(applyVisibility);
  }

  applyVisibility();
}

function bindBusinessSlider() {
  const sliderRoot = document.querySelector("[data-biz-slider]");
  if (!sliderRoot) return;

  const track = sliderRoot.querySelector("[data-biz-track]");
  const slides = track ? Array.from(track.querySelectorAll(".biz-slide")) : [];
  const dotsRoot = document.querySelector("[data-biz-dots]");
  const prevButton = sliderRoot.querySelector("[data-biz-prev]");
  const nextButton = sliderRoot.querySelector("[data-biz-next]");

  if (!track || slides.length === 0) return;

  let currentIndex = 0;
  let timerId = null;
  const dots = [];

  function updateDots() {
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
    });
  }

  function goTo(index) {
    currentIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateDots();
  }

  function stopAutoplay() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    timerId = window.setInterval(() => {
      goTo(currentIndex + 1);
    }, 5200);
  }

  if (dotsRoot) {
    slides.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "biz-dot";
      dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
      dot.addEventListener("click", () => {
        goTo(index);
      });
      dotsRoot.appendChild(dot);
      dots.push(dot);
    });
  }

  prevButton?.addEventListener("click", () => goTo(currentIndex - 1));
  nextButton?.addEventListener("click", () => goTo(currentIndex + 1));

  sliderRoot.addEventListener("mouseenter", stopAutoplay);
  sliderRoot.addEventListener("mouseleave", startAutoplay);
  sliderRoot.addEventListener("focusin", stopAutoplay);
  sliderRoot.addEventListener("focusout", () => {
    if (!sliderRoot.contains(document.activeElement)) {
      startAutoplay();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplay();
      return;
    }
    startAutoplay();
  });

  goTo(0);
  startAutoplay();
}

function bindRevealElements() {
  const revealSelectors = [
    ".page-hero .hero-copy",
    ".page-hero .hero-aside",
    ".section .section-header",
    ".service-column",
    ".service-cta-card",
    ".timeline .step",
    ".panel",
    ".stat-card",
    ".trusted-card",
    ".faq-card",
    ".article-card",
    ".resource-card",
    ".authority-card",
    ".cta-band"
  ];

  const revealSet = new Set();
  revealSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (!node.dataset.reveal) {
        node.dataset.reveal = "fade";
      }
      revealSet.add(node);
    });
  });

  const revealNodes = Array.from(revealSet);
  if (revealNodes.length === 0) return;

  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  document.body.classList.add("motion-ready");

  if (!("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealNodes.forEach((node, index) => {
    node.style.setProperty("--reveal-delay", `${(index % 5) * 45}ms`);
    observer.observe(node);
  });
}

function initYear() {
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

function init() {
  initYear();
  populateUtmFields();
  bindRuntimeConfigSync();
  applyLineLinks();
  applyLeadChannelAvailability();
  initMobileTopbar();
  bindMobileTopbarAutoHide();
  bindEvents();
  bindBusinessSlider();
  bindRevealElements();
  applyLanguage(resolveLang());
  initAiChat();
  trackVisitorCounter();
}

init();
