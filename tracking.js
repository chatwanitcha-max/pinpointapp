(function () {
  const baseConfig = window.PINPOINT_CONFIG || {};
  const state = {
    ga4MeasurementId: String(baseConfig.ga4MeasurementId || "").trim(),
    googleAdsId: String(baseConfig.googleAdsId || "").trim(),
    googleAdsLeadLabel: String(baseConfig.googleAdsLeadLabel || "").trim(),
    metaPixelId: String(baseConfig.metaPixelId || "").trim(),
    initialized: false,
    scheduled: false
  };

  function getCookie(name) {
    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    return value ? decodeURIComponent(value.split("=")[1]) : "";
  }

  function setCookie(name, value, days) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  function fromQuery(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function ensureFbc() {
    const existing = getCookie("_fbc");
    if (existing) return existing;
    const fbclid = fromQuery("fbclid");
    if (!fbclid) return "";
    const value = `fb.1.${Date.now()}.${fbclid}`;
    setCookie("_fbc", value, 90);
    return value;
  }

  function parseGaClientId() {
    const gaCookie = getCookie("_ga");
    const match = gaCookie.match(/GA\d\.\d\.(.+)/);
    return match ? match[1] : "";
  }

  function loadScript(src) {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  async function loadRemoteConfig() {
    try {
      const response = await fetch("/api/public-config", {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!response.ok) return;
      const payload = await response.json();
      const remote = payload && payload.config ? payload.config : {};
      state.ga4MeasurementId = String(remote.ga4MeasurementId || state.ga4MeasurementId).trim();
      state.googleAdsId = String(remote.googleAdsId || state.googleAdsId).trim();
      state.googleAdsLeadLabel = String(remote.googleAdsLeadLabel || state.googleAdsLeadLabel).trim();
      state.metaPixelId = String(remote.metaPixelId || state.metaPixelId).trim();
      window.PINPOINT_CONFIG = {
        ...baseConfig,
        ...remote
      };
      window.dispatchEvent(
        new CustomEvent("pinpoint:config-updated", {
          detail: window.PINPOINT_CONFIG
        })
      );
    } catch {
      // keep existing static config when runtime config is unavailable
    }
  }

  function setupGtag() {
    const ids = [state.ga4MeasurementId, state.googleAdsId].filter(Boolean);
    if (!ids.length) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };

    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`);
    window.gtag("js", new Date());
    ids.forEach((id) => window.gtag("config", id));
  }

  function setupMetaPixel() {
    if (!state.metaPixelId) return;

    /* eslint-disable */
    !(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq("init", state.metaPixelId);
    window.fbq("track", "PageView");
  }

  function track(eventName, params) {
    if (window.gtag) {
      window.gtag("event", eventName, params || {});
    }
    if (window.fbq) {
      window.fbq("trackCustom", eventName, params || {});
    }
  }

  async function sendServerConversion(payload) {
    try {
      await fetch("/api/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      // intentionally ignored
    }
  }

  function collectTrackingPayload(extra) {
    const fbp = getCookie("_fbp");
    const fbc = ensureFbc() || getCookie("_fbc");
    return {
      gaClientId: parseGaClientId(),
      fbp,
      fbc,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      ...extra
    };
  }

  function trackLeadSubmission(extra) {
    const eventId = extra && extra.eventId ? extra.eventId : `lead_${Date.now()}`;
    track("generate_lead", { event_id: eventId, value: 1, currency: "THB" });

    if (window.fbq) {
      window.fbq("track", "Lead", { eventID: eventId });
    }

    if (window.gtag && state.googleAdsId && state.googleAdsLeadLabel) {
      window.gtag("event", "conversion", {
        send_to: `${state.googleAdsId}/${state.googleAdsLeadLabel}`,
        value: 1.0,
        currency: "THB",
        transaction_id: eventId
      });
    }

    return sendServerConversion(
      collectTrackingPayload({
        eventName: "Lead",
        eventId,
        value: 1,
        currency: "THB",
        email: extra?.email || "",
        phone: extra?.phone || ""
      })
    );
  }

  function trackClick(eventName) {
    track(eventName, { page_path: window.location.pathname });
    return sendServerConversion(
      collectTrackingPayload({
        eventName,
        eventId: `${eventName}_${Date.now()}`,
        value: 1,
        currency: "THB"
      })
    );
  }

  function bindClickTracking() {
    document.querySelectorAll('a[href^="tel:"]').forEach((el) => {
      el.addEventListener("click", () => trackClick("call_click"));
    });

    document.querySelectorAll(".line-chat").forEach((el) => {
      el.addEventListener("click", () => trackClick("line_chat_click"));
    });
  }

  async function initTracking() {
    if (state.initialized) return;
    await loadRemoteConfig();
    setupGtag();
    setupMetaPixel();
    bindClickTracking();
    state.initialized = true;
  }

  function runWhenIdle(callback, timeout = 2000) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout });
      return;
    }

    window.setTimeout(callback, Math.min(timeout, 500));
  }

  function scheduleTracking() {
    if (state.scheduled) return;
    state.scheduled = true;

    const interactionEvents = ["pointerdown", "keydown", "scroll", "touchstart"];

    function cleanup() {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, startFromInteraction);
      });
    }

    function startTracking() {
      cleanup();
      runWhenIdle(initTracking, 2000);
    }

    function startFromInteraction() {
      startTracking();
    }

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, startFromInteraction, { once: true, passive: true });
    });

    const startAfterLoad = () => {
      window.setTimeout(startTracking, 6500);
    };

    if (document.readyState === "complete") {
      startAfterLoad();
    } else {
      window.addEventListener("load", startAfterLoad, { once: true });
    }
  }

  scheduleTracking();

  window.PinpointTracking = {
    collectTrackingPayload,
    track,
    trackLeadSubmission,
    trackClick,
    initTracking
  };
})();
