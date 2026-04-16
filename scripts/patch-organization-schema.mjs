import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const BASE_URL = "https://pinpointaccountingservice.com";
const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Pinpoint Accounting & Service, Ltd.",
  url: BASE_URL,
  logo: `${BASE_URL}/assets/logo-original-large.jpg`,
  telephone: "+66-92-749-7442",
  address: {
    "@type": "PostalAddress",
    streetAddress: "294 Soi Yoo Charoen 29, Ratchadaphisek 18 Rd., Sam Sen Nok, Huai Khwang",
    addressLocality: "Bangkok",
    postalCode: "10310",
    addressCountry: "TH",
  },
  sameAs: ["https://lin.ee/58aU8oE"],
};

function listHtmlFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".vercel" || entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith(".vercel.bak")) {
          continue;
        }
        stack.push(p);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        out.push(p);
      }
    }
  }
  return out;
}

function patchFile(filePath) {
  const rel = filePath.replace(projectRoot, "").replace(/\\/g, "/");
  if (rel.startsWith("/.vercel") || rel.startsWith("/releases") || rel.startsWith("/node_modules")) {
    return { changed: false };
  }

  const html = fs.readFileSync(filePath, "utf8");
  if (/"@type"\s*:\s*"Organization"/i.test(html)) {
    return { changed: false };
  }

  const idx = html.lastIndexOf("</head>");
  if (idx === -1) return { changed: false };

  const script = `\n    <script type="application/ld+json">\n${JSON.stringify(ORG_JSON_LD, null, 2)
    .split("\n")
    .map((line) => `      ${line}`)
    .join("\n")}\n    </script>\n`;

  const next = html.slice(0, idx) + script + html.slice(idx);
  fs.writeFileSync(filePath, next, "utf8");
  return { changed: true };
}

function main() {
  const files = listHtmlFiles(projectRoot);
  let changed = 0;
  for (const filePath of files) {
    const result = patchFile(filePath);
    if (result.changed) changed += 1;
  }
  console.log(`Patched Organization JSON-LD in ${changed} HTML files.`);
}

main();

