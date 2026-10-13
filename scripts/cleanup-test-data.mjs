import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
mkdirSync(".local", { recursive: true });
writeFileSync(
  ".local/test-cleanup.sql",
  `DELETE FROM ticket_events WHERE ticket_id IN (SELECT id FROM tickets WHERE title LIKE 'E2E %');
DELETE FROM tickets WHERE title LIKE 'E2E %';
DELETE FROM assets WHERE asset_code LIKE 'E2E-%';`,
);
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "fixdesk-local",
    "--local",
    "--file=.local/test-cleanup.sql",
  ],
  { encoding: "utf8" },
);
if (result.status !== 0) {
  console.error(
    "Test fixture cleanup failed. Run node scripts/cleanup-test-data.mjs.",
  );
  process.exit(1);
}
console.log("Removed E2E demo fixtures; existing demo work was preserved.");
