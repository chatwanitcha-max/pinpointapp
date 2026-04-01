import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(process.cwd());
const runtimeDir = path.join(repoRoot, "operations", "runtime");
const summaryPath = path.join(runtimeDir, "daily-ops-summary.json");

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return {
    script: scriptPath,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

const tasks = [
  "scripts/check-integrations.mjs",
  "skills/pinpoint-agency-os/scripts/check-readiness.mjs",
  "skills/pinpoint-agency-os/scripts/generate-daily-brief.mjs",
  "skills/pinpoint-agency-os/scripts/generate-followup-queue.mjs",
];

const results = tasks.map(runNodeScript);
const ok = results.every((task) => task.status === 0);

fs.mkdirSync(runtimeDir, { recursive: true });
fs.writeFileSync(
  summaryPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      ok,
      tasks: results,
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Wrote ${summaryPath}`);
for (const task of results) {
  console.log(`${task.status === 0 ? "OK" : "FAIL"} ${task.script}`);
}

if (!ok) {
  process.exitCode = 1;
}
