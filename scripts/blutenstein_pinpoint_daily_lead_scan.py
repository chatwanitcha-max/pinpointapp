#!/usr/bin/env python3
"""Blutenstein/Pinpoint daily public lead scan -> Pinpoint /api/lead -> LINE OA.

Public-only, no private scraping. Prefer real search APIs when keys are configured:
SerpAPI, Brave Search, Tavily, or Google Custom Search. Falls back to DuckDuckGo
HTML only when no API provider is available. Verifies production API reports
channels.lineWebhook.sent == true. No secrets are printed.
"""
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ENDPOINT = "https://pinpointaccountingservice.com/api/lead"
CAMPAIGN = "daily_0730_th"
USER_AGENT = "Mozilla/5.0 (compatible; BlutensteinLeadScan/2.0; public-source)"
MAX_RESULTS_PER_QUERY = int(os.getenv("BLUTENSTEIN_SCAN_RESULTS_PER_QUERY", "5") or "5")
MAX_LEADS_PER_RUN = int(os.getenv("BLUTENSTEIN_SCAN_MAX_LEADS", "5") or "5")

DOTENV_PATHS = [
    Path("/root/.hermes/blutenstein_lead_scan.env"),
    Path("/mnt/d/Pinpoint/.env.local.txt"),
]

QUERIES = [
    {
        "businessUnit": "Pinpoint",
        "query": '"หาคนทำบัญชี" บริษัท โทร LINE',
        "serviceNeed": "monthly-accounting",
        "score": 86,
        "reason": "explicit accounting-service intent keyword",
    },
    {
        "businessUnit": "Pinpoint",
        "query": '"ต้องการสำนักงานบัญชี" OR "หาสำนักงานบัญชี" บริษัท',
        "serviceNeed": "monthly-accounting",
        "score": 84,
        "reason": "explicit outsourced-accounting buying intent",
    },
    {
        "businessUnit": "Pinpoint",
        "query": '"ปิดงบ" "บริษัท" "ติดต่อ"',
        "serviceNeed": "corporate-tax-planning",
        "score": 80,
        "reason": "closing-books/company tax intent keyword",
    },
    {
        "businessUnit": "Pinpoint",
        "query": '"จดทะเบียนบริษัท" "ต้องการ" "โทร"',
        "serviceNeed": "company-registration",
        "score": 78,
        "reason": "company-registration service intent keyword",
    },
    {
        "businessUnit": "Blutenstein/SuccessCasting",
        "query": '"หา supplier" "เชื่อถือได้" Thailand SME',
        "serviceNeed": "foreign-business-support",
        "score": 70,
        "reason": "SME trust/supplier verification candidate",
    },
    {
        "businessUnit": "Blutenstein/SuccessCasting",
        "query": '"โดนโกง" supplier บริษัท หาเจ้าใหม่',
        "serviceNeed": "foreign-business-support",
        "score": 68,
        "reason": "supplier trust pain signal candidate",
    },
]

BAD_DOMAINS = (
    "duckduckgo.com",
    "google.com/search",
    "bing.com/search",
    "facebook.com/login",
    "accounts.google.com",
)

PHONE_RE = re.compile(r"(?:\+66|0)[\d\s\-()]{8,15}")
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)


def load_dotenv_files():
    """Load optional env files without printing values; existing process env wins."""
    for path in DOTENV_PATHS:
        if not path.exists():
            continue
        try:
            for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
                line = raw.strip().lstrip("\ufeff")
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value and key not in os.environ:
                    os.environ[key] = value
        except Exception as exc:
            print(f"WARN dotenv load skipped for {path}: {type(exc).__name__}")


class DDGParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results = []
        self.in_link = False
        self.current_href = ""
        self.current_text = []
        self.in_snippet = False
        self.current_snippet = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        cls = attrs.get("class", "")
        if tag == "a" and "result__a" in cls:
            self.in_link = True
            self.current_href = attrs.get("href", "")
            self.current_text = []
        elif tag in {"a", "div"} and "result__snippet" in cls:
            self.in_snippet = True
            self.current_snippet = []

    def handle_data(self, data):
        if self.in_link:
            self.current_text.append(data)
        if self.in_snippet:
            self.current_snippet.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self.in_link:
            title = html.unescape(" ".join(self.current_text)).strip()
            href = normalize_ddg_url(self.current_href)
            if title and href:
                self.results.append({"title": title, "url": href, "snippet": "", "provider": "duckduckgo_html"})
            self.in_link = False
        if tag in {"a", "div"} and self.in_snippet:
            snippet = html.unescape(" ".join(self.current_snippet)).strip()
            if snippet and self.results and not self.results[-1].get("snippet"):
                self.results[-1]["snippet"] = re.sub(r"\s+", " ", snippet)
            self.in_snippet = False


def normalize_ddg_url(href):
    if not href:
        return ""
    href = html.unescape(href)
    if href.startswith("//"):
        href = "https:" + href
    parsed = urlparse(href)
    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        target = parse_qs(parsed.query).get("uddg", [""])[0]
        return unquote(target)
    if href.startswith("http"):
        return href
    return ""


def request_json(url, *, method="GET", headers=None, payload=None, timeout=25):
    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"User-Agent": USER_AGENT, **(headers or {})},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
    return json.loads(body)


def clean_results(items, limit):
    out, seen = [], set()
    for item in items:
        title = re.sub(r"\s+", " ", str(item.get("title") or "")).strip()
        url = str(item.get("url") or "").strip()
        snippet = re.sub(r"\s+", " ", str(item.get("snippet") or "")).strip()
        provider = str(item.get("provider") or "unknown")
        if not title or not url.startswith("http"):
            continue
        key = url.split("#", 1)[0]
        low = key.lower()
        if key in seen or any(domain in low for domain in BAD_DOMAINS):
            continue
        seen.add(key)
        out.append({"title": title, "url": key, "snippet": snippet, "provider": provider})
        if len(out) >= limit:
            break
    return out


def fetch_serpapi(query, limit):
    key = os.getenv("SERPAPI_API_KEY") or os.getenv("SERP_API_KEY")
    if not key:
        return []
    params = {
        "engine": "google",
        "q": query,
        "hl": "th",
        "gl": "th",
        "location": "Thailand",
        "num": str(limit),
        "api_key": key,
    }
    data = request_json("https://serpapi.com/search.json?" + urllib.parse.urlencode(params))
    return clean_results(
        [
            {
                "title": x.get("title"),
                "url": x.get("link"),
                "snippet": x.get("snippet") or x.get("rich_snippet", {}).get("top", {}).get("detected_extensions", {}),
                "provider": "serpapi_google",
            }
            for x in data.get("organic_results", [])
        ],
        limit,
    )


def fetch_brave(query, limit):
    key = os.getenv("BRAVE_SEARCH_API_KEY")
    if not key:
        return []
    params = {"q": query, "country": "TH", "search_lang": "th", "count": str(limit)}
    data = request_json(
        "https://api.search.brave.com/res/v1/web/search?" + urllib.parse.urlencode(params),
        headers={"Accept": "application/json", "X-Subscription-Token": key},
    )
    return clean_results(
        [
            {
                "title": x.get("title"),
                "url": x.get("url"),
                "snippet": x.get("description"),
                "provider": "brave_search",
            }
            for x in data.get("web", {}).get("results", [])
        ],
        limit,
    )


def fetch_tavily(query, limit):
    key = os.getenv("TAVILY_API_KEY")
    if not key:
        return []
    data = request_json(
        "https://api.tavily.com/search",
        method="POST",
        headers={"Content-Type": "application/json"},
        payload={
            "api_key": key,
            "query": query,
            "search_depth": "basic",
            "max_results": limit,
            "include_answer": False,
            "include_raw_content": False,
        },
    )
    return clean_results(
        [
            {
                "title": x.get("title"),
                "url": x.get("url"),
                "snippet": x.get("content"),
                "provider": "tavily_search",
            }
            for x in data.get("results", [])
        ],
        limit,
    )


def fetch_google_cse(query, limit):
    key = os.getenv("GOOGLE_CSE_API_KEY") or os.getenv("GOOGLE_SEARCH_API_KEY")
    cx = os.getenv("GOOGLE_CSE_ID") or os.getenv("GOOGLE_SEARCH_ENGINE_ID")
    if not key or not cx:
        return []
    params = {"key": key, "cx": cx, "q": query, "num": str(min(limit, 10)), "hl": "th", "gl": "th"}
    data = request_json("https://www.googleapis.com/customsearch/v1?" + urllib.parse.urlencode(params))
    return clean_results(
        [
            {
                "title": x.get("title"),
                "url": x.get("link"),
                "snippet": x.get("snippet"),
                "provider": "google_cse",
            }
            for x in data.get("items", [])
        ],
        limit,
    )


def fetch_ddg(query, limit):
    url = "https://duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=25) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    parser = DDGParser()
    parser.feed(text)
    return clean_results(parser.results, limit)


def configured_provider_names():
    names = []
    if os.getenv("SERPAPI_API_KEY") or os.getenv("SERP_API_KEY"):
        names.append("serpapi")
    if os.getenv("BRAVE_SEARCH_API_KEY"):
        names.append("brave")
    if os.getenv("TAVILY_API_KEY"):
        names.append("tavily")
    if (os.getenv("GOOGLE_CSE_API_KEY") or os.getenv("GOOGLE_SEARCH_API_KEY")) and (
        os.getenv("GOOGLE_CSE_ID") or os.getenv("GOOGLE_SEARCH_ENGINE_ID")
    ):
        names.append("google_cse")
    return names


def fetch_search(query, limit=MAX_RESULTS_PER_QUERY):
    providers = [
        ("serpapi", fetch_serpapi),
        ("brave", fetch_brave),
        ("tavily", fetch_tavily),
        ("google_cse", fetch_google_cse),
    ]
    errors = []
    for name, fn in providers:
        try:
            results = fn(query, limit)
            if results:
                return results, name, errors
        except Exception as exc:
            errors.append(f"{name}:{type(exc).__name__}")
    try:
        return fetch_ddg(query, limit), "duckduckgo_html", errors
    except Exception as exc:
        errors.append(f"duckduckgo_html:{type(exc).__name__}")
        return [], "none", errors


def extract_contact(text):
    phone = ""
    email = ""
    phone_match = PHONE_RE.search(text or "")
    email_match = EMAIL_RE.search(text or "")
    if phone_match:
        phone = re.sub(r"\s+", " ", phone_match.group(0)).strip()
    if email_match:
        email = email_match.group(0).strip()
    return phone, email


def score_item(base_score, provider, title, snippet):
    text = f"{title} {snippet}".lower()
    score = base_score
    if provider != "duckduckgo_html":
        score += 4
    if any(k in text for k in ["ต้องการ", "หา", "รับสมัคร", "ติดต่อ", "โทร", "line"]):
        score += 3
    if any(k in text for k in ["ปิดงบ", "ทำบัญชี", "สำนักงานบัญชี", "จดทะเบียนบริษัท", "supplier", "เชื่อถือ"]):
        score += 3
    return min(score, 95)


def pick_leads():
    leads = []
    seen = set()
    provider_counts = {}
    provider_errors = []
    for q in QUERIES:
        results, provider, errors = fetch_search(q["query"], limit=MAX_RESULTS_PER_QUERY)
        provider_counts[provider] = provider_counts.get(provider, 0) + len(results)
        provider_errors.extend(errors)
        if not results:
            print(f"WARN no search results for {q['businessUnit']} via {provider}")
            continue
        for item in results:
            key = item["url"].split("#", 1)[0]
            if key in seen:
                continue
            seen.add(key)
            title = item["title"][:140]
            snippet = item.get("snippet", "")[:420]
            provider_name = item.get("provider") or provider
            phone, email = extract_contact(f"{title} {snippet}")
            score = score_item(q["score"], provider_name, title, snippet)
            notes = (
                f"[BLUTENSTEIN DAILY SCAN] business_unit={q['businessUnit']} | "
                f"score={score} | provider={provider_name} | reason={q['reason']} | query={q['query']} | "
                f"source_title={title} | excerpt={snippet or 'public search result'} | "
                "recommended_action=ทีมตรวจ source/contact ก่อน outreach; ส่ง LINE/โทรเฉพาะเมื่อข้อมูลสาธารณะชัดเจน | "
                "compliance=public-source only; no login/private scraping; soft outreach unless explicit buying intent"
            )
            leads.append({
                "fullName": title or f"{q['businessUnit']} public lead candidate",
                "phone": phone or "contact in source only",
                "email": email,
                "businessName": q["businessUnit"],
                "serviceNeed": q["serviceNeed"],
                "notes": notes,
                "pageUrl": key,
                "score": score,
                "businessUnit": q["businessUnit"],
                "provider": provider_name,
            })
    return sorted(leads, key=lambda x: x["score"], reverse=True)[:MAX_LEADS_PER_RUN], provider_counts, provider_errors


def post_lead(lead):
    payload = {
        "fullName": lead["fullName"][:100],
        "phone": lead["phone"],
        "email": lead["email"],
        "businessName": lead["businessName"],
        "serviceNeed": lead["serviceNeed"],
        "revenueRange": "",
        "preferredContact": "line",
        "notes": lead["notes"][:1800],
        "utmSource": "blutenstein_daily_scan",
        "utmMedium": "agent_search_api_scan",
        "utmCampaign": CAMPAIGN,
        "pageUrl": lead["pageUrl"],
        "language": "th",
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        return resp.status, json.loads(body)


def main():
    load_dotenv_files()
    bkk = timezone(timedelta(hours=7))
    now = datetime.now(bkk).strftime("%Y-%m-%d %H:%M:%S %z")
    configured = configured_provider_names()
    leads, provider_counts, provider_errors = pick_leads()
    if not leads:
        reason = (
            "configured search API returned no trustworthy candidate"
            if configured
            else "no search API key configured; zero-key public search returned no trustworthy candidate or was blocked/challenged"
        )
        leads = [{
            "fullName": "Blutenstein Daily Scan - no qualified public candidate found",
            "phone": "no public phone",
            "email": "",
            "businessName": "Blutenstein scan status",
            "serviceNeed": "corporate-tax-planning",
            "notes": f"[BLUTENSTEIN DAILY SCAN STATUS] scan_ran=true | qualified_candidates=0 | configured_search_api={','.join(configured) or 'none'} | provider_errors={','.join(provider_errors) or 'none'} | reason={reason} | action=do not outreach; add SERPAPI_API_KEY/BRAVE_SEARCH_API_KEY/TAVILY_API_KEY/GOOGLE_CSE_API_KEY for higher-quality automated discovery | compliance=no lead invented",
            "pageUrl": "https://pinpointaccountingservice.com/",
            "score": 0,
            "businessUnit": "Blutenstein Ops",
            "provider": "status",
        }]

    results, failures, sent = [], [], 0
    for lead in leads:
        try:
            status, result = post_lead(lead)
            line = result.get("channels", {}).get("lineWebhook", {})
            ok = bool(result.get("ok") and result.get("leadId") and line.get("sent") is True and int(line.get("status") or 0) == 200)
            if ok:
                sent += 1
            else:
                failures.append({"lead": lead["fullName"], "status": status, "lineWebhook": line, "ok": result.get("ok")})
            results.append({
                "businessUnit": lead["businessUnit"],
                "lead": lead["fullName"],
                "provider": lead.get("provider"),
                "source": lead["pageUrl"],
                "leadId": result.get("leadId"),
                "http": status,
                "ok": result.get("ok"),
                "lineWebhook": line,
                "linePush": result.get("channels", {}).get("linePush", {}),
            })
            time.sleep(0.5)
        except Exception as exc:
            failures.append({"lead": lead["fullName"], "error": f"{type(exc).__name__}: {exc}"})

    header = {
        "time_th": now,
        "configured_search_api": configured or ["none"],
        "provider_counts": provider_counts,
        "provider_errors": provider_errors,
        "scanned": len(leads),
        "line_sent": sent,
    }
    if failures:
        print("🚨 Blutenstein daily lead scan delivery FAILED")
        print(json.dumps({"summary": header, "failures": failures, "results": results}, ensure_ascii=False, indent=2)[:4500])
        sys.exit(1)

    print("✅ Blutenstein daily public lead scan delivered to LINE OA")
    print(json.dumps(header, ensure_ascii=False))
    for r in results:
        print(f"- {r['businessUnit']} | provider={r.get('provider')} | {r['lead'][:80]} | leadId={r['leadId']} | lineWebhook={r['lineWebhook']} | linePush={r['linePush']} | source={r['source']}")


if __name__ == "__main__":
    main()
