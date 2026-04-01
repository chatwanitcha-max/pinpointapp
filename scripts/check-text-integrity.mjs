import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const textExtensions = new Set([
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".xml",
  ".txt",
]);

const ignoredDirs = new Set([
  ".git",
  ".vercel",
  "node_modules",
  "releases",
]);

function isSuspiciousText(text) {
  const findings = [];

  if (/\?{4,}/.test(text)) {
    findings.push("found-4plus-question-marks");
  }

  if (text.includes("\uFFFD")) {
    findings.push("found-replacement-character");
  }

  const mojibakeThaiCount = (text.match(/เธ/g) || []).length;
  if (mojibakeThaiCount >= 5) {
    findings.push(`found-thai-mojibake-pattern:${mojibakeThaiCount}`);
  }

  if (text.includes("\u0E40\u0E19\u20AC")) {
    findings.push("found-euro-mojibake-pattern");
  }

  if (text.includes("\u0E42\u20AC")) {
    findings.push("found-quote-mojibake-pattern");
  }

  const latinMojibakeCount =
    (text.match(/ร/g) || []).length +
    (text.match(/ร/g) || []).length +
    (text.match(/รขโฌ/g) || []).length;
  if (latinMojibakeCount >= 4) {
    findings.push(`found-latin-mojibake-pattern:${latinMojibakeCount}`);
  }

  return findings;
}

function walk(dir, collector) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(ext)) continue;

    const text = fs.readFileSync(fullPath, "utf8");
    const findings = isSuspiciousText(text);
    if (findings.length > 0) {
      collector.push({
        file: path.relative(repoRoot, fullPath).replace(/\\/g, "/"),
        findings,
      });
    }
  }
}

const collector = [];
walk(repoRoot, collector);

if (collector.length > 0) {
  console.error("Text integrity check failed.");
  for (const item of collector) {
    console.error(`- ${item.file}: ${item.findings.join(", ")}`);
  }
  process.exit(1);
}

console.log("Text integrity check passed.");

