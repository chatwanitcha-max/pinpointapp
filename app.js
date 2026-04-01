const TEXT = {
  th: {
    leadSending: "กำลังส่งข้อมูลเพื่อรับแผนงานจากทีม...",
    leadSuccess: "ได้รับข้อมูลแล้ว ทีมงานจะติดต่อกลับภายใน 1 วันทำการตามช่องทางที่คุณเลือก",
    leadError: "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือโทร 092-749-7442",
    scoreLabel: "คะแนนความพร้อมใช้งาน",
    seoTitle: "หัวข้อ SEO",
    seoMeta: "คำอธิบาย Meta",
    seoKeywords: "กลุ่มคำค้นหา",
    seoAds: "ข้อความโฆษณา",
    seoToneProfessional: "ภาพลักษณ์มืออาชีพและน่าเชื่อถือ",
    seoToneFriendly: "ภาษาชัดเจน คุยง่าย และเข้าถึงง่าย",
    seoTonePremium: "ภาพลักษณ์พรีเมียม สุภาพ และเป็นทางการ"
  },
  en: {
    leadSending: "Submitting your details for a custom action plan...",
    leadSuccess: "Your details have been received. Our team will contact you within 1 business day via your preferred channel.",
    leadError: "Submission failed. Please try again or call 092-749-7442.",
    scoreLabel: "readiness score",
    seoTitle: "SEO Title",
    seoMeta: "Meta Description",
    seoKeywords: "Keyword Cluster",
    seoAds: "Ad Copy",
    seoToneProfessional: "professional and trusted",
    seoToneFriendly: "clear, friendly, and approachable",
    seoTonePremium: "premium, executive-level, and credible"
  }
};

const appState = {
  lang: "th"
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
    statusNode.textContent = getText(lang, "leadError");
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
  applyLineLinks();
  applyLeadChannelAvailability();
  initMobileTopbar();
  bindMobileTopbarAutoHide();
  bindEvents();
  bindBusinessSlider();
  bindRevealElements();
  applyLanguage(resolveLang());
}

init();
