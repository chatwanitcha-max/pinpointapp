import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.resolve(repoRoot, "resources", "chiangmai-pai-bilingual-2026");
const htmlPath = path.resolve(outDir, "guide.html");
const outPdf = path.resolve(outDir, "ChiangMai_to_Pai_Travel_Guide_Bilingual_Mar2026.pdf");
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
    path: outPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
} finally {
  await browser.close();
}

console.log(`Wrote:\n- ${outPdf}`);
