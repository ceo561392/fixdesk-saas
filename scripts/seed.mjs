import { pbkdf2Sync, randomBytes, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Stable UUIDs make INSERT OR IGNORE safe to rerun, without overwriting demo work.
const id = (name) => {
  const h = createHash("sha256").update(name).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const quote = (v) =>
  v == null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`;
const sql = [];
const insert = (table, obj) =>
  sql.push(
    `INSERT OR IGNORE INTO ${table} (${Object.keys(obj).join(",")}) VALUES (${Object.values(obj).map(quote).join(",")});`,
  );
const password = "Demo@12345";
const now = new Date();
const problems = [
  "เครื่องพิมพ์ออฟไลน์",
  "Wi-Fi หลุดบ่อย",
  "คอมพิวเตอร์เปิดไม่ติด",
  "Excel ค้างขณะใช้งาน",
  "CCTV ไม่มีภาพ",
  "LAN ใช้งานไม่ได้",
];
const categories = ["คอมพิวเตอร์", "เครื่องพิมพ์", "เครือข่าย", "กล้องวงจรปิด"];
const states = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
];
for (const [slug, name, assetCount, ticketCount] of [
  ["tropica", "Tropica Demo", 12, 20],
  ["blue", "Blue Factory Demo", 6, 8],
]) {
  const tenant = id(slug);
  insert("tenants", { id: tenant, name, slug, created_at: now.toISOString() });
  for (const role of ["admin", "technician", "requester"]) {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(password, salt, 100000, 32, "sha256").toString(
      "hex",
    );
    insert("users", {
      id: id(`${slug}-${role}`),
      name:
        { admin: "ผู้ดูแล", technician: "ช่างไอที", requester: "พนักงาน" }[
          role
        ] + ` ${name}`,
      email: `${role}@${slug}.test`,
      password_hash: `pbkdf2$100000$${salt}$${hash}`,
      created_at: now.toISOString(),
    });
    insert("memberships", {
      tenant_id: tenant,
      user_id: id(`${slug}-${role}`),
      role,
      created_at: now.toISOString(),
    });
  }
  for (let i = 1; i <= assetCount; i++)
    insert("assets", {
      id: id(`${slug}-asset-${i}`),
      tenant_id: tenant,
      asset_code: `${slug === "tropica" ? "TR" : "BF"}-${String(i).padStart(3, "0")}`,
      name: `${categories[(i - 1) % 4]} ${String(i).padStart(2, "0")}`,
      category: categories[(i - 1) % 4],
      location: `ชั้น ${(i % 3) + 1} · แผนก ${i % 2 ? "สำนักงาน" : "คลังสินค้า"}`,
      status: i % 5 === 0 ? "maintenance" : "active",
      created_at: now.toISOString(),
    });
  for (let i = 1; i <= ticketCount; i++) {
    const date = new Date(
      now.getTime() - (ticketCount - i) * 86400000,
    ).toISOString();
    const status = states[(i - 1) % 6];
    const ticket = id(`${slug}-ticket-${i}`);
    insert("tickets", {
      id: ticket,
      tenant_id: tenant,
      ticket_no: `IT-${String(i).padStart(5, "0")}`,
      asset_id: id(`${slug}-asset-${((i - 1) % assetCount) + 1}`),
      requester_id: id(`${slug}-${i % 3 === 0 ? "admin" : "requester"}`),
      assignee_id: status === "open" ? null : id(`${slug}-technician`),
      title: problems[(i - 1) % 6],
      description:
        "ข้อมูลสมมติสำหรับสาธิต: พบปัญหาระหว่างใช้งาน กรุณาตรวจสอบและแก้ไข",
      priority: ["normal", "high", "low", "urgent"][i % 4],
      status,
      location: `ชั้น ${(i % 3) + 1}`,
      created_at: date,
      updated_at: date,
      resolved_at: ["resolved", "closed"].includes(status) ? date : null,
    });
    insert("ticket_events", {
      id: id(`${slug}-event-${i}`),
      tenant_id: tenant,
      ticket_id: ticket,
      actor_id: id(`${slug}-${i % 3 === 0 ? "admin" : "requester"}`),
      event_type: "created",
      new_value: status,
      created_at: date,
    });
  }
  insert("ticket_counters", { tenant_id: tenant, value: ticketCount });
  sql.push(
    `UPDATE ticket_counters SET value=MAX(value,${ticketCount}) WHERE tenant_id=${quote(tenant)};`,
  );
}
mkdirSync(".local", { recursive: true });
writeFileSync(".local/seed.sql", sql.join("\n"));
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "fixdesk-local",
    "--local",
    "--file=.local/seed.sql",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
