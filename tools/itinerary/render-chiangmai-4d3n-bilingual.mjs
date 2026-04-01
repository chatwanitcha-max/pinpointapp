import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.resolve(repoRoot, "resources", "chiangmai-4d3n-bilingual-2026");
const htmlPath = path.resolve(outDir, "itinerary.html");
const archivedPdf = path.resolve(outDir, "ChiangMai_4D3N_11-14Oct2026_Bilingual.pdf");
const rootPdf = path.resolve(repoRoot, "ChiangMai_4D3N_11-14Oct2026_Bilingual.pdf");
const fileUrl = new URL(`file:///${htmlPath.replace(/\\/g, "/")}`);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1240, height: 1754 },
  deviceScaleFactor: 1,
});

try {
  await page.goto(fileUrl.toString(), { waitUntil: "load" });
  await page.waitForTimeout(700);
  await page.pdf({
    path: archivedPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  fs.copyFileSync(archivedPdf, rootPdf);
} finally {
  await browser.close();
}

console.log(`Wrote:\n- ${archivedPdf}\n- ${rootPdf}`);
