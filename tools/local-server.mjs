import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const rootDir = resolve(__dirname, "..");
const portArg = process.argv.find((value) => /^\d+$/.test(value));
const port = Number(portArg || process.env.PORT || 5500);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".zip": "application/zip"
};

function resolveFilePath(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const normalizedPath = normalize(cleanPath).replace(/^(\.\.[/\\])+/, "");
  let targetPath = resolve(rootDir, `.${normalizedPath}`);

  if (!targetPath.startsWith(rootDir)) {
    return null;
  }

  if (extname(targetPath) === "") {
    targetPath = join(targetPath, "index.html");
  }

  return targetPath;
}

const server = createServer(async (req, res) => {
  const filePath = resolveFilePath(req.url || "/");

  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const type = mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(port, () => {
  console.log(`Pinpoint local server running at http://localhost:${port}/`);
});
