import fs from "node:fs";
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.resolve(repoRoot, "resources", "if-14-10-plan-2026");
const htmlPath = path.resolve(outDir, "plan-th.html");
const outPdf = path.resolve(outDir, "IF_14-10_Weight_Loss_Plan_TH.pdf");
const rootPdf = path.resolve(repoRoot, "IF_14-10_Weight_Loss_Plan_TH.pdf");
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
  fs.copyFileSync(outPdf, rootPdf);
} finally {
  await browser.close();
}

console.log(`Wrote:\n- ${outPdf}\n- ${rootPdf}`);
