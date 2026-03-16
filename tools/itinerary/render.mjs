import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");

const variant = (process.argv[2] || "th").toLowerCase();
const isJa = variant === "ja" || variant === "jp" || variant === "japanese";
const outDir = path.resolve(repoRoot, "resources", "japan-trip-may-2026");

const htmlPath = path.resolve(outDir, isJa ? "itinerary-ja.html" : "itinerary.html");
const outPdf = path.resolve(outDir, isJa ? "Japan_Trip_Osaka_Tokyo_11-16May2026_JP.pdf" : "Japan_Trip_Osaka_Tokyo_11-16May2026.pdf");
const outJpgCover = path.resolve(outDir, isJa ? "Japan_Trip_Osaka_Tokyo_Cover_JP.jpg" : "Japan_Trip_Osaka_Tokyo_Cover.jpg");
const outJpgPage2 = path.resolve(outDir, isJa ? "Japan_Trip_Osaka_Tokyo_Page2_Itinerary_JP.jpg" : "Japan_Trip_Osaka_Tokyo_Page2_Itinerary.jpg");
const outJpgPage3 = path.resolve(outDir, isJa ? "Japan_Trip_Osaka_Tokyo_Page3_Links_Hotels_JP.jpg" : "Japan_Trip_Osaka_Tokyo_Page3_Links_Hotels.jpg");

const fileUrl = new URL(`file:///${htmlPath.replace(/\\/g, "/")}`);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1240, height: 1754 }, // ~A4 @ 150dpi-ish for cover screenshot readability
});

try {
  await page.goto(fileUrl.toString(), { waitUntil: "networkidle" });

  // Render full PDF (all pages).
  await page.pdf({
    path: outPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  // Render cover preview.
  const pages = page.locator(".page");
  await pages.nth(0).screenshot({ path: outJpgCover, type: "jpeg", quality: 92 });
  await pages.nth(1).screenshot({ path: outJpgPage2, type: "jpeg", quality: 92 });
  await pages.nth(2).screenshot({ path: outJpgPage3, type: "jpeg", quality: 92 });
} finally {
  await browser.close();
}

console.log(`Wrote:\n- ${outPdf}\n- ${outJpgCover}\n- ${outJpgPage2}\n- ${outJpgPage3}`);
