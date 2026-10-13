import { z } from "zod";
import { data, fail, guard } from "./lib";
import type { Env, Identity } from "./lib";
import { scope, ticketSelect } from "./tickets";
export async function dashboard(
  request: Request,
  env: Env,
  user: Identity,
  url: URL,
): Promise<Response | null> {
  if (request.method !== "GET") return null;
  if (url.pathname === "/api/dashboard") {
    const days = z
      .enum(["all", "7", "30"])
      .safeParse(url.searchParams.get("days") ?? "all");
    if (!days.success) fail(400, "VALIDATION", "ช่วงเวลาไม่ถูกต้อง");
    const s = scope(user);
    let where = s.sql;
    const params: string[] = [...s.params];
    if (days.data !== "all") {
      where += " AND t.created_at>=?";
      params.push(
        new Date(Date.now() - Number(days.data) * 86400000).toISOString(),
      );
    }
    const results = await env.DB.batch([
      env.DB.prepare(
        `SELECT t.status,count(*) count FROM tickets t WHERE ${where} GROUP BY t.status`,
      ).bind(...params),
      env.DB.prepare(
        `${ticketSelect} WHERE ${where} ORDER BY t.created_at DESC,t.id LIMIT 5`,
      ).bind(...params),
      env.DB.prepare(
        "SELECT count(*) count FROM assets WHERE tenant_id=?",
      ).bind(user.tenant_id),
    ]);
    return data({
      byStatus: results[0].results,
      recent: results[1].results,
      assetCount: (results[2].results[0] as { count: number }).count,
    });
  }
  if (
    url.pathname === "/api/members/technicians" ||
    url.pathname === "/api/members"
  ) {
    if (url.pathname === "/api/members") guard(user, ["admin"]);
    else guard(user, ["admin", "technician"]);
    const result = await env.DB.prepare(
      `SELECT u.id,u.name,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=? ${url.pathname.endsWith("technicians") ? "AND m.role='technician'" : ""} ORDER BY m.role,u.name LIMIT 100`,
    )
      .bind(user.tenant_id)
      .all();
    return data(result.results);
  }
  return null;
}
