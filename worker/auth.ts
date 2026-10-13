import { z } from "zod";
import {
  body,
  cookie,
  data,
  fail,
  hex,
  identity,
  sessionToken,
  tokenHash,
  verifyPassword,
} from "./lib";
import type { Env } from "./lib";
export async function auth(
  request: Request,
  env: Env,
  path: string,
): Promise<Response | null> {
  if (path === "/api/auth/login" && request.method === "POST") {
    const input = await body(
      request,
      z
        .object({
          email: z
            .string()
            .email()
            .max(254)
            .transform((v) => v.toLowerCase()),
          password: z.string().min(1).max(128),
        })
        .strict(),
    );
    const user = await env.DB.prepare(
      "SELECT id,password_hash FROM users WHERE email=?",
    )
      .bind(input.email)
      .first<{ id: string; password_hash: string }>();
    if (!user || !(await verifyPassword(input.password, user.password_hash)))
      fail(401, "INVALID_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    const member = await env.DB.prepare(
      `SELECT m.tenant_id FROM memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.user_id=? AND t.status='active' ORDER BY m.tenant_id LIMIT 2`,
    )
      .bind(user.id)
      .all<{ tenant_id: string }>();
    if (member.results.length !== 1)
      fail(403, "MEMBERSHIP", "บัญชีต้องมีสมาชิกบริษัทที่ใช้งานได้หนึ่งแห่ง");
    const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
    const now = new Date();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(
        now.toISOString(),
      ),
      env.DB.prepare(
        "INSERT INTO sessions(id,user_id,tenant_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        user.id,
        member.results[0].tenant_id,
        await tokenHash(token),
        new Date(now.getTime() + 8 * 3600000).toISOString(),
        now.toISOString(),
      ),
    ]);
    return data({ ok: true }, 200, {
      "Set-Cookie": cookie(request, token, 8 * 3600),
    });
  }
  if (path === "/api/auth/logout" && request.method === "POST") {
    const token = sessionToken(request);
    if (token)
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await tokenHash(token))
        .run();
    return data({ ok: true }, 200, { "Set-Cookie": cookie(request, "", 0) });
  }
  if (path === "/api/auth/me" && request.method === "GET")
    return data(await identity(request, env));
  if (path === "/api/demo/accounts" && request.method === "GET") {
    if (env.DEMO_MODE !== "true") fail(404, "NOT_FOUND", "ไม่พบข้อมูล");
    const users = await env.DB.prepare(
      `SELECT u.email,m.role,t.name tenant_name FROM users u JOIN memberships m ON m.user_id=u.id JOIN tenants t ON t.id=m.tenant_id WHERE u.email LIKE '%.test' ORDER BY t.name,m.role`,
    ).all();
    return data(users.results);
  }
  return null;
}
