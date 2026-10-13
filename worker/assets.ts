import { z } from "zod";
import { body, data, fail, guard } from "./lib";
import type { Env, Identity } from "./lib";
import { scope, ticketSelect } from "./tickets";
const assetSchema = z
  .object({
    asset_code: z.string().trim().min(2).max(40),
    name: z.string().trim().min(2).max(160),
    category: z.string().trim().min(1).max(80),
    location: z.string().trim().min(1).max(200),
    status: z.enum(["active", "maintenance", "retired"]),
  })
  .strict();
export async function assets(
  request: Request,
  env: Env,
  user: Identity,
  url: URL,
): Promise<Response | null> {
  const path = url.pathname;
  if (path === "/api/assets" && request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT * FROM assets WHERE tenant_id=? ORDER BY asset_code LIMIT 200",
    )
      .bind(user.tenant_id)
      .all();
    return data(result.results);
  }
  if (path === "/api/assets" && request.method === "POST") {
    guard(user, ["admin"]);
    const input = await body(request, assetSchema);
    const id = crypto.randomUUID();
    if (
      await env.DB.prepare(
        "SELECT id FROM assets WHERE tenant_id=? AND asset_code=?",
      )
        .bind(user.tenant_id, input.asset_code)
        .first()
    )
      fail(409, "DUPLICATE", "รหัสทรัพย์สินนี้มีอยู่แล้ว");
    try {
      await env.DB.prepare(
        "INSERT INTO assets(id,tenant_id,asset_code,name,category,location,status,created_at) VALUES(?,?,?,?,?,?,?,?)",
      )
        .bind(
          id,
          user.tenant_id,
          input.asset_code,
          input.name,
          input.category,
          input.location,
          input.status,
          new Date().toISOString(),
        )
        .run();
    } catch (error) {
      if (String(error).includes("UNIQUE constraint"))
        fail(409, "DUPLICATE", "รหัสทรัพย์สินนี้มีอยู่แล้ว");
      throw error;
    }
    return data(
      await env.DB.prepare("SELECT * FROM assets WHERE tenant_id=? AND id=?")
        .bind(user.tenant_id, id)
        .first(),
      201,
    );
  }
  const match = path.match(/^\/api\/assets\/([a-f0-9-]+)(\/tickets)?$/);
  if (!match) return null;
  const asset = await env.DB.prepare(
    "SELECT * FROM assets WHERE tenant_id=? AND id=?",
  )
    .bind(user.tenant_id, match[1])
    .first();
  if (!asset) fail(404, "NOT_FOUND", "ไม่พบอุปกรณ์ หรือคุณไม่มีสิทธิ์เข้าถึง");
  if (request.method === "GET" && match[2]) {
    const s = scope(user);
    const result = await env.DB.prepare(
      `${ticketSelect} WHERE ${s.sql} AND t.asset_id=? ORDER BY t.created_at DESC LIMIT 100`,
    )
      .bind(...s.params, match[1])
      .all();
    return data(result.results);
  }
  if (request.method === "GET") return data(asset);
  if (request.method === "PATCH" && !match[2]) {
    guard(user, ["admin"]);
    const input = await body(request, assetSchema);
    try {
      await env.DB.prepare(
        "UPDATE assets SET asset_code=?,name=?,category=?,location=?,status=? WHERE tenant_id=? AND id=?",
      )
        .bind(
          input.asset_code,
          input.name,
          input.category,
          input.location,
          input.status,
          user.tenant_id,
          match[1],
        )
        .run();
    } catch (error) {
      if (String(error).includes("UNIQUE constraint"))
        fail(409, "DUPLICATE", "รหัสทรัพย์สินนี้มีอยู่แล้ว");
      throw error;
    }
    return data(
      await env.DB.prepare("SELECT * FROM assets WHERE tenant_id=? AND id=?")
        .bind(user.tenant_id, match[1])
        .first(),
    );
  }
  return null;
}
