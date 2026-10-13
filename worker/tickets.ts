import { z } from "zod";
import { body, data, fail, guard } from "./lib";
import type { Env, Identity } from "./lib";
import { canTransition } from "./workflow";
export const statuses = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
] as const;
export const priorities = ["low", "normal", "high", "urgent"] as const;
const fields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(4000),
  priority: z.enum(priorities),
  location: z.string().trim().min(1).max(200),
};
const createSchema = z
  .object({ ...fields, asset_id: z.string().uuid().nullable().optional() })
  .strict();
const patchSchema = z
  .object({
    ...Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, v.optional()]),
    ),
    status: z.enum(statuses).optional(),
    assignee_id: z.string().uuid().nullable().optional(),
    version: z.number().int().positive(),
  })
  .strict();
export interface Ticket {
  id: string;
  tenant_id: string;
  requester_id: string;
  assignee_id: string | null;
  status: string;
  resolved_at: string | null;
  version: number;
  [key: string]: unknown;
}
export const ticketSelect = `SELECT t.*,a.name asset_name,a.asset_code,u.name requester_name,s.name assignee_name FROM tickets t
 LEFT JOIN assets a ON a.id=t.asset_id AND a.tenant_id=t.tenant_id
 JOIN users u ON u.id=t.requester_id LEFT JOIN users s ON s.id=t.assignee_id`;
export function scope(user: Identity, alias = "t") {
  return {
    sql: `${alias}.tenant_id=?${user.role === "requester" ? ` AND ${alias}.requester_id=?` : ""}`,
    params:
      user.role === "requester" ? [user.tenant_id, user.id] : [user.tenant_id],
  };
}
export async function findTicket(env: Env, user: Identity, id: string) {
  const s = scope(user);
  const ticket = await env.DB.prepare(
    `${ticketSelect} WHERE ${s.sql} AND t.id=?`,
  )
    .bind(...s.params, id)
    .first<Ticket>();
  if (!ticket) fail(404, "NOT_FOUND", "ไม่พบงานแจ้งซ่อม");
  return ticket;
}
export async function tickets(
  request: Request,
  env: Env,
  user: Identity,
  url: URL,
): Promise<Response | null> {
  const path = url.pathname;
  if (path === "/api/tickets" && request.method === "GET") {
    const filter = z
      .object({
        status: z.enum(statuses).optional(),
        priority: z.enum(priorities).optional(),
        q: z.string().max(160).optional(),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      })
      .safeParse(Object.fromEntries(url.searchParams));
    if (!filter.success) fail(400, "VALIDATION", "ตัวกรองไม่ถูกต้อง");
    const { status, priority, q, page } = filter.data;
    const s = scope(user);
    const clauses = [s.sql];
    const params: unknown[] = [...s.params];
    if (status) {
      clauses.push("t.status=?");
      params.push(status);
    }
    if (priority) {
      clauses.push("t.priority=?");
      params.push(priority);
    }
    if (q) {
      clauses.push(
        "(t.title LIKE ? ESCAPE '\\' OR t.ticket_no LIKE ? ESCAPE '\\')",
      );
      const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      params.push(like, like);
    }
    const where = clauses.join(" AND ");
    const result = await env.DB.batch([
      env.DB.prepare(
        `${ticketSelect} WHERE ${where} ORDER BY t.created_at DESC,t.id LIMIT 10 OFFSET ?`,
      ).bind(...params, (page - 1) * 10),
      env.DB.prepare(
        `SELECT count(*) total FROM tickets t WHERE ${where}`,
      ).bind(...params),
    ]);
    return data({
      items: result[0].results,
      total: (result[1].results[0] as { total: number }).total,
      page,
      pageSize: 10,
    });
  }
  if (path === "/api/tickets" && request.method === "POST") {
    const input = await body(request, createSchema);
    if (
      input.asset_id &&
      !(await env.DB.prepare("SELECT id FROM assets WHERE tenant_id=? AND id=?")
        .bind(user.tenant_id, input.asset_id)
        .first())
    )
      fail(404, "NOT_FOUND", "ไม่พบอุปกรณ์");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE ticket_counters SET value=value+1 WHERE tenant_id=?",
      ).bind(user.tenant_id),
      env.DB.prepare(
        `INSERT INTO tickets(id,tenant_id,ticket_no,asset_id,requester_id,title,description,priority,status,location,created_at,updated_at)
    SELECT ?,tenant_id,printf('IT-%05d',value),?,?,?,?,?,'open',?,?,? FROM ticket_counters WHERE tenant_id=?`,
      ).bind(
        id,
        input.asset_id ?? null,
        user.id,
        input.title,
        input.description,
        input.priority,
        input.location,
        now,
        now,
        user.tenant_id,
      ),
      env.DB.prepare(
        "INSERT INTO ticket_events(id,tenant_id,ticket_id,actor_id,event_type,new_value,created_at) VALUES(?,?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        user.tenant_id,
        id,
        user.id,
        "created",
        "open",
        now,
      ),
    ]);
    return data(await findTicket(env, user, id), 201);
  }
  const match = path.match(/^\/api\/tickets\/([a-f0-9-]+)$/);
  if (!match) return null;
  const ticket = await findTicket(env, user, match[1]);
  if (request.method === "GET") {
    const events = await env.DB.prepare(
      "SELECT e.*,u.name actor_name FROM ticket_events e JOIN users u ON u.id=e.actor_id WHERE e.tenant_id=? AND e.ticket_id=? ORDER BY e.created_at,e.id LIMIT 200",
    )
      .bind(user.tenant_id, ticket.id)
      .all();
    return data({ ...ticket, events: events.results });
  }
  if (request.method === "PATCH") {
    const input = (await body(request, patchSchema)) as {
      version: number;
      status?: string;
      assignee_id?: string | null;
      title?: string;
      description?: string;
      priority?: string;
      location?: string;
    };
    if (input.version !== ticket.version)
      fail(409, "CONFLICT", "งานมีการอัปเดตแล้ว กรุณาโหลดใหม่");
    const assigning = Object.hasOwn(input, "assignee_id");
    if (assigning) guard(user, ["admin"]);
    if (input.status !== undefined) {
      guard(user, ["admin", "technician"]);
      if (user.role === "technician" && ticket.assignee_id !== user.id)
        fail(403, "FORBIDDEN", "อัปเดตได้เฉพาะงานที่ได้รับมอบหมาย");
    }
    if (user.role === "technician" && ticket.assignee_id !== user.id)
      fail(403, "FORBIDDEN", "อัปเดตได้เฉพาะงานที่ได้รับมอบหมาย");
    if (
      user.role === "requester" &&
      ["resolved", "closed", "cancelled"].includes(ticket.status)
    )
      fail(403, "FORBIDDEN", "งานสิ้นสุดแล้ว ไม่สามารถแก้ไขได้");
    if (assigning && input.assignee_id) {
      const tech = await env.DB.prepare(
        "SELECT user_id FROM memberships WHERE tenant_id=? AND user_id=? AND role='technician'",
      )
        .bind(user.tenant_id, input.assignee_id)
        .first();
      if (!tech) fail(400, "INVALID_ASSIGNEE", "ช่างต้องเป็นสมาชิกบริษัทนี้");
    }
    let next = input.status ?? ticket.status;
    const assignee = assigning ? input.assignee_id : ticket.assignee_id;
    if (assigning && input.status === undefined) {
      if (next === "open" && assignee) next = "assigned";
      else if (next === "assigned" && !assignee) next = "open";
    }
    if (!canTransition(ticket.status, next))
      fail(409, "INVALID_TRANSITION", "ไม่สามารถเปลี่ยนเป็นสถานะนี้ได้");
    if (["assigned", "in_progress", "resolved"].includes(next) && !assignee)
      fail(400, "ASSIGNEE_REQUIRED", "กรุณามอบหมายช่างก่อน");
    const changes = Object.entries(input).filter(
      ([key, value]) =>
        key !== "version" && key !== "status" && value !== ticket[key],
    );
    if (next !== ticket.status) changes.push(["status", next]);
    if (!changes.length) return data(ticket);
    const now = new Date().toISOString();
    const resolved = ["resolved", "closed"].includes(next)
      ? (ticket.resolved_at ?? now)
      : null;
    // Compare version and insert all audit events using changes() in the same D1 transaction.
    const update = env.DB.prepare(
      `UPDATE tickets SET ${changes.map(([key]) => `${key}=?`).join(",")},resolved_at=?,updated_at=?,version=version+1 WHERE tenant_id=? AND id=? AND version=?`,
    ).bind(
      ...changes.map(([, v]) => v),
      resolved,
      now,
      user.tenant_id,
      ticket.id,
      ticket.version,
    );
    const rows = changes
      .map(
        () =>
          "SELECT ? id,? tenant_id,? ticket_id,? actor_id,? event_type,? old_value,? new_value,? created_at",
      )
      .join(" UNION ALL ");
    const values = changes.flatMap(([key, v]) => [
      crypto.randomUUID(),
      user.tenant_id,
      ticket.id,
      user.id,
      key,
      ticket[key] === null ? null : String(ticket[key]),
      v === null ? null : String(v),
      now,
    ]);
    const result = await env.DB.batch([
      update,
      env.DB.prepare(
        `INSERT INTO ticket_events(id,tenant_id,ticket_id,actor_id,event_type,old_value,new_value,created_at) SELECT * FROM (${rows}) WHERE changes()=1`,
      ).bind(...values),
    ]);
    if (result[0].meta.changes !== 1)
      fail(409, "CONFLICT", "งานมีการอัปเดตแล้ว กรุณาโหลดใหม่");
    return data(await findTicket(env, user, ticket.id));
  }
  return null;
}
