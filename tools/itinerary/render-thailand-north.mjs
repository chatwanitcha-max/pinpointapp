import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const variant = (process.argv[2] || "full").toLowerCase();
const isLite = variant === "lite";
const outDir = path.resolve(repoRoot, "resources", "thailand-north-oct-2026");
const sourceHtmlPath = path.resolve(outDir, "itinerary.html");
const liteHtmlPath = path.resolve(outDir, "itinerary-lite.generated.html");
const htmlPath = isLite ? liteHtmlPath : sourceHtmlPath;
const outPdf = path.resolve(
  outDir,
  isLite
    ? "Thailand_North_Trip_ChiangMai_Nan_1-7Oct2026_Lite.pdf"
    : "Thailand_North_Trip_ChiangMai_Nan_1-7Oct2026.pdf",
);

if (isLite) {
  const html = await fs.readFile(sourceHtmlPath, "utf8");
  await fs.writeFile(liteHtmlPath, html.replaceAll("./assets/", "./assets-lite/"), "utf8");
}

const fileUrl = new URL(`file:///${htmlPath.replace(/\\/g, "/")}`);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1240, height: 1754 },
  deviceScaleFactor: 1,
});

try {
  await page.goto(fileUrl.toString(), { waitUntil: "load" });
  await page.waitForTimeout(2500);

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
