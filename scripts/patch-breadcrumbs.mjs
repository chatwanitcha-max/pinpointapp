import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const baseUrl = "https://pinpointaccountingservice.com";

function htmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function titleFromHtml(html) {
  const dataTitleEn = html.match(/data-title-en="([^"]+)"/i);
  const titleTag = html.match(/<title>(.*?)<\/title>/i);
  const raw = (dataTitleEn && dataTitleEn[1]) || (titleTag && titleTag[1]) || "";
  const cleaned = raw.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return cleaned.split("|")[0].trim() || "Page";
}

function canonicalFromHtml(html) {
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return canonical ? canonical[1].trim() : "";
}

function buildBreadcrumbJsonLd({ canonicalUrl, title }) {
  const canonical = canonicalUrl || `${baseUrl}/`;
  const pathname = canonical.replace(baseUrl, "") || "/";
  const name = title || "Page";

  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` }
  ];

  // Keep breadcrumbs simple: Home -> current page.
  // Blog posts often already have breadcrumbs; we skip those.
  if (pathname !== "/") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name,
      item: canonical
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };
}

function shouldSkip(filePath, html) {
  const rel = filePath.replace(projectRoot, "").replace(/\\/g, "/");
  if (rel.startsWith("/.vercel")) return true;
  if (rel.startsWith("/releases")) return true;
  if (rel.startsWith("/node_modules")) return true;
  if (rel.includes("/.git/")) return true;
  if (html.includes("BreadcrumbList")) return true;
  // /thank-you is intentionally noindex; breadcrumbs are not needed.
  if (rel === "/thank-you.html") return true;
  return false;
}

function patchFile(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const rel = filePath.replace(projectRoot, "").replace(/\\/g, "/");
  if (rel.startsWith("/.vercel") || rel.startsWith("/releases") || rel.startsWith("/node_modules") || rel.includes("/.git/")) {
    return { changed: false };
  }

  // /thank-you is intentionally noindex; breadcrumbs are not needed.
  if (rel === "/thank-you.html") return { changed: false };

  const canonicalUrl = canonicalFromHtml(html);
  if (!canonicalUrl.startsWith(baseUrl)) return { changed: false };

  const title = titleFromHtml(html);
  const breadcrumb = buildBreadcrumbJsonLd({ canonicalUrl, title });
  const breadcrumbScript = `\n    <script type="application/ld+json">\n${JSON.stringify(
        breadcrumb,
        null,
        2
      )
        .split("\n")
        .map((line) => `      ${line}`)
        .join("\n")}\n    </script>\n`;

  // If a broken (HTML-escaped) BreadcrumbList was inserted previously, replace it.
  const brokenBreadcrumbRegex =
    /<script\s+type="application\/ld\+json">\s*[\s\S]*?&quot;@type&quot;\s*:\s*&quot;BreadcrumbList&quot;[\s\S]*?<\/script>\s*/i;
  if (brokenBreadcrumbRegex.test(html)) {
    const next = html.replace(brokenBreadcrumbRegex, breadcrumbScript);
    fs.writeFileSync(filePath, next);
    return { changed: true };
  }

  // Insert before </head> so it is static and discoverable.
  if (html.includes("BreadcrumbList")) return { changed: false };

  const idx = html.lastIndexOf("</head>");
  if (idx === -1) return { changed: false };

  const next = html.slice(0, idx) + breadcrumbScript + html.slice(idx);
  fs.writeFileSync(filePath, next);
  return { changed: true };
}

function listHtmlFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".vercel" || entry.name === "node_modules" || entry.name === ".git") continue;
        stack.push(p);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        out.push(p);
      }
    }
  }
  return out;
}

function main() {
  const files = listHtmlFiles(projectRoot);
  let changed = 0;
  for (const filePath of files) {
    const result = patchFile(filePath);
    if (result.changed) changed += 1;
  }
  console.log(`Patched breadcrumbs in ${changed} HTML files.`);
}

main();
