import { z } from "zod";
export interface Env {
  DB: D1Database;
  DEMO_MODE: string;
  APP_ORIGIN: string;
}
export interface Identity {
  id: string;
  name: string;
  email: string;
  tenant_id: string;
  tenant_name: string;
  role: "admin" | "technician" | "requester";
}
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function fail(status: number, code: string, message: string): never {
  throw new ApiError(status, code, message);
}
export function guard(user: Identity, roles: Identity["role"][]) {
  if (!roles.includes(user.role))
    fail(403, "FORBIDDEN", "คุณไม่มีสิทธิ์ดำเนินการนี้");
}
export async function body<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    fail(400, "INVALID_BODY", "ต้องส่งข้อมูล JSON");
  const raw = await request.text();
  if (raw.length > 16384) fail(400, "BODY_TOO_LARGE", "ข้อมูลมีขนาดใหญ่เกินไป");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail(400, "INVALID_JSON", "รูปแบบ JSON ไม่ถูกต้อง");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) fail(400, "VALIDATION", "กรุณาตรวจสอบข้อมูลที่กรอก");
  return result.data;
}
export function checkOrigin(request: Request, env: Env) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  if (request.headers.get("origin") !== env.APP_ORIGIN)
    fail(403, "CSRF", "แหล่งที่มาของคำขอไม่ถูกต้อง");
}
export const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function tokenHash(token: string) {
  return hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
}
export async function verifyPassword(password: string, stored: string) {
  const [kind, iterations, salt, expected] = stored.split("$");
  if (kind !== "pbkdf2" || !salt || !expected) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const actual = hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: Number(iterations),
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++)
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
export function cookie(request: Request, token: string, maxAge: number) {
  return `fixdesk_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function sessionToken(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("fixdesk_session="))
    ?.slice(16);
}
export async function identity(request: Request, env: Env): Promise<Identity> {
  const token = sessionToken(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    fail(401, "UNAUTHORIZED", "กรุณาเข้าสู่ระบบ");
  const user = await env.DB.prepare(
    `SELECT u.id,u.name,u.email,s.tenant_id,t.name tenant_name,m.role
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=s.user_id AND m.tenant_id=s.tenant_id
    JOIN tenants t ON t.id=s.tenant_id WHERE s.token_hash=? AND s.expires_at>? AND t.status='active'`,
  )
    .bind(await tokenHash(token), new Date().toISOString())
    .first<Identity>();
  if (!user) fail(401, "UNAUTHORIZED", "เซสชันหมดอายุ กรุณาเข้าสู่ระบบ");
  return user;
}
export function data(value: unknown, status = 200, headers?: HeadersInit) {
  return Response.json({ data: value }, { status, headers });
}
