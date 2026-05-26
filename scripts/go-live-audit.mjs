import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = (process.env.PINPOINT_BASE_URL || "https://pinpointaccountingservice.com").replace(/\/+$/, "");
const corePaths = [
  "/",
  "/services",
  "/about",
  "/resources",
  "/faq",
  "/blog",
  "/privacy",
  "/terms",
  "/sitemap.xml",
  "/robots.txt",
  "/feed.xml",
  "/llms.txt",
];

function extract(text, pattern) {
  const match = text.match(pattern);
  return match?.[1] || "";
}

function uniqueCount(values) {
  return new Set(values).size;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Pinpoint-GoLive-Audit/1.0",
    },
  });

  return {
    url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get("content-type") || "",
    text: await response.text(),
  };
}

function auditHtmlPage(payload) {
  const html = payload.text;
  const title = extract(html, /<title>([^<]+)<\/title>/i);
  const description = extract(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const canonical = extract(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const hasOgTitle = /<meta\s+property="og:title"/i.test(html);
  const hasOgDescription = /<meta\s+property="og:description"/i.test(html);
  const hasHreflang = /hreflang="th"/i.test(html) && /hreflang="en"/i.test(html);
  const hasStructuredData =
    /"@type":\s*"Organization"/i.test(html) ||
    /"@type":\s*\[\s*"LocalBusiness"/i.test(html) ||
    /"@type":\s*"FAQPage"/i.test(html) ||
    /"@type":\s*"Blog"/i.test(html) ||
    /"@type":\s*"ProfessionalService"/i.test(html) ||
    /"@type":\s*"AboutPage"/i.test(html) ||
    /"@type":\s*"CollectionPage"/i.test(html) ||
    /"@type":\s*"ItemList"/i.test(html) ||
    /"@type":\s*"WebPage"/i.test(html);

  return {
    title,
    descriptionLength: description.length,
    canonical,
    hasOgTitle,
    hasOgDescription,
    hasHreflang,
    hasStructuredData,
  };
}

function auditSitemap(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const duplicateUrls = urls.filter((url, index) => urls.indexOf(url) !== index);

  return {
    urlCount: urls.length,
    uniqueUrlCount: uniqueCount(urls),
    duplicateUrls: [...new Set(duplicateUrls)],
    hasTerms: urls.includes(`${baseUrl}/terms`),
    hasBlog: urls.includes(`${baseUrl}/blog`),
    hasHome: urls.includes(`${baseUrl}/`),
  };
}

function auditRobots(text) {
  return {
    hasUserAgent: /User-agent:\s*\*/i.test(text),
    hasSitemap: new RegExp(`Sitemap:\\s*${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml`, "i").test(text),
    blocksAll: /Disallow:\s*\/\s*$/im.test(text),
  };
}

const responses = [];
for (const pagePath of corePaths) {
  responses.push(await fetchText(`${baseUrl}${pagePath}`));
}

const pageAudits = responses
  .filter((entry) => /text\/html|application\/xhtml\+xml/i.test(entry.contentType))
  .map((entry) => ({
    url: entry.url,
    status: entry.status,
    ...auditHtmlPage(entry),
  }));

const sitemapPayload = responses.find((entry) => entry.url.endsWith("/sitemap.xml"));
const robotsPayload = responses.find((entry) => entry.url.endsWith("/robots.txt"));
const llmsPayload = responses.find((entry) => entry.url.endsWith("/llms.txt"));

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  urls: responses.map((entry) => ({
    url: entry.url,
    status: entry.status,
    ok: entry.ok,
    contentType: entry.contentType,
  })),
  pages: pageAudits,
  sitemap: sitemapPayload ? auditSitemap(sitemapPayload.text) : null,
  robots: robotsPayload ? auditRobots(robotsPayload.text) : null,
  llms: llmsPayload
    ? {
        present: true,
        hasCorePages: /## Core pages/i.test(llmsPayload.text),
        hasServiceFocus: /## Service focus/i.test(llmsPayload.text),
      }
    : { present: false },
};

const runtimePath = path.join(process.cwd(), "operations", "runtime", "go-live-audit.json");
mkdirSync(path.dirname(runtimePath), { recursive: true });
writeFileSync(runtimePath, JSON.stringify(report, null, 2) + "\n", "utf8");

console.log(JSON.stringify(report, null, 2));
