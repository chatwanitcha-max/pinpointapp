#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const cwd = process.cwd();
const envFiles = [join(cwd, ".env.local"), join(cwd, ".env.local.txt")];
let token = "";

for (const file of envFiles) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const key of ["2ndVERCELTOKEN", "VERCEL_TOKEN"]) {
    const match = lines.find((line) => line.startsWith(`${key}=`));
    if (match) {
      token = match.split("=", 2)[1].trim();
      break;
    }
  }
  if (token) break;
}

if (!token) {
  console.error("Missing 2ndVERCELTOKEN or VERCEL_TOKEN in .env.local or .env.local.txt");
  process.exit(1);
}

const vercelCmd =
  process.platform === "win32"
    ? join(process.env.APPDATA || "", "npm", "vercel.cmd")
    : "vercel";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

await run(vercelCmd, ["deploy", "--prod", "--yes", "--token", token]);
await run(process.execPath, [join(cwd, "skills", "pinpoint-web-ops", "scripts", "verify-live.mjs")]);
