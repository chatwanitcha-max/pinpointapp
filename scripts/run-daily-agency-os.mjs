import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["skills/pinpoint-agency-os/scripts/run-daily-ops.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
});

process.exitCode = result.status || 0;
