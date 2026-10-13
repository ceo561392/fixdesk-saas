import { spawnSync } from "node:child_process";
const tests = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
const cleanup = spawnSync(process.execPath, ["scripts/cleanup-test-data.mjs"], {
  stdio: "inherit",
});
process.exit(tests.status || cleanup.status || 0);
