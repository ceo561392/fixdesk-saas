import { test, expect } from "@playwright/test";
import type { APIRequestContext, Playwright } from "@playwright/test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const origin = "http://localhost:5173";
async function login(
  playwright: Playwright,
  role = "admin",
  tenant = "tropica",
) {
  const api = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { origin },
  });
  expect(
    (
      await api.post("/api/auth/login", {
        data: { email: `${role}@${tenant}.test`, password: "Demo@12345" },
      })
    ).status(),
  ).toBe(200);
  return api;
}
async function value(api: APIRequestContext, path: string) {
  const r = await api.get(path);
  expect(r.status()).toBe(200);
  return (await r.json()).data;
}
test("six accounts authenticate, session persists, logout revokes it", async ({
  playwright,
}) => {
  for (const tenant of ["tropica", "blue"])
    for (const role of ["admin", "technician", "requester"]) {
      const api = await login(playwright, role, tenant);
      const me = await value(api, "/api/auth/me");
      expect(me.role).toBe(role);
      expect(me.tenant_name).toBe(
        tenant === "blue" ? "Blue Factory Demo" : "Tropica Demo",
      );
      expect((await value(api, "/api/auth/me")).id).toBe(me.id);
      const state = await api.storageState();
      const stale = await playwright.request.newContext({
        baseURL: origin,
        storageState: state,
      });
      expect((await api.post("/api/auth/logout")).status()).toBe(200);
      expect((await stale.get("/api/auth/me")).status()).toBe(401);
      await stale.dispose();
      await api.dispose();
    }
});
test("anonymous, CSRF, validation and strict payload guards", async ({
  playwright,
}) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get("/api/tickets")).status()).toBe(401);
  expect(
    (
      await anon.post("/api/auth/login", {
        data: { email: "admin@tropica.test", password: "Demo@12345" },
      })
    ).status(),
  ).toBe(403);
  const api = await login(playwright);
  expect(
    (
      await api.post("/api/tickets", {
        headers: { origin: "https://evil.test" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (await api.post("/api/tickets", { data: { title: "x" } })).status(),
  ).toBe(400);
  expect(
    (
      await api.post("/api/tickets", {
        data: {
          title: "tenant injection attempt",
          description: "must reject unknown fields",
          priority: "normal",
          location: "test",
          tenant_id: "forged",
        },
      })
    ).status(),
  ).toBe(400);
  expect((await api.get("/api/tickets?page=-1")).status()).toBe(400);
  expect((await api.get("/api/tickets?status=invalid")).status()).toBe(400);
  await api.dispose();
  await anon.dispose();
});
test("tenant isolation across reads, writes, QR and foreign references", async ({
  playwright,
}) => {
  const a = await login(playwright);
  const b = await login(playwright, "admin", "blue");
  const meA = await value(a, "/api/auth/me");
  const meB = await value(b, "/api/auth/me");
  const assetsA = await value(a, "/api/assets");
  const assetsB = await value(b, "/api/assets");
  expect(
    assetsA.every((v: { tenant_id: string }) => v.tenant_id === meA.tenant_id),
  ).toBe(true);
  expect(
    assetsB.every((v: { tenant_id: string }) => v.tenant_id === meB.tenant_id),
  ).toBe(true);
  const ticketsA = await value(a, "/api/tickets");
  const ticketsB = await value(b, "/api/tickets");
  expect(ticketsA.items.length).toBeLessThanOrEqual(10);
  const page2 = await value(a, "/api/tickets?page=2");
  expect(
    page2.items.every(
      (t: { id: string }) =>
        !ticketsA.items.some((v: { id: string }) => v.id === t.id),
    ),
  ).toBe(true);
  expect(
    ticketsA.items.every(
      (v: { tenant_id: string }) => v.tenant_id === meA.tenant_id,
    ),
  ).toBe(true);
  const foreign = ticketsB.items[0];
  for (const [current, other, asset] of [
    [a, foreign, assetsB[0]],
    [b, ticketsA.items[0], assetsA[0]],
  ] as const) {
    expect((await current.get(`/api/tickets/${other.id}`)).status()).toBe(404);
    expect(
      (
        await current.patch(`/api/tickets/${other.id}`, {
          data: { version: other.version, title: "attempt cross tenant" },
        })
      ).status(),
    ).toBe(404);
    expect((await current.get(`/api/assets/${asset.id}`)).status()).toBe(404);
    expect(
      (await current.get(`/api/assets/${asset.id}/tickets`)).status(),
    ).toBe(404);
    expect(
      (
        await current.patch(`/api/assets/${asset.id}`, { data: asset })
      ).status(),
    ).toBe(404);
    expect(
      (
        await current.post("/api/tickets", {
          data: {
            title: "foreign asset attempt",
            description: "must reject",
            priority: "normal",
            location: "test",
            asset_id: asset.id,
          },
        })
      ).status(),
    ).toBe(404);
  }
  await a.dispose();
  await b.dispose();
});
test("requester sees own work, cannot assign/change status/add assets/see other requester tickets", async ({
  playwright,
}) => {
  const api = await login(playwright, "requester");
  const admin = await login(playwright);
  const me = await value(api, "/api/auth/me");
  const own = await value(api, "/api/tickets");
  expect(
    own.items.every((t: { requester_id: string }) => t.requester_id === me.id),
  ).toBe(true);
  const all = await value(admin, "/api/tickets");
  const other = all.items.find(
    (t: { requester_id: string }) => t.requester_id !== me.id,
  );
  expect((await api.get(`/api/tickets/${other.id}`)).status()).toBe(404);
  for (const fields of [{ status: "cancelled" }, { assignee_id: null }])
    expect(
      (
        await api.patch(`/api/tickets/${own.items[0].id}`, {
          data: { version: own.items[0].version, ...fields },
        })
      ).status(),
    ).toBe(403);
  expect((await api.post("/api/assets", { data: {} })).status()).toBe(403);
  expect((await api.get("/api/members")).status()).toBe(403);
  const dashboard = await value(api, "/api/dashboard");
  expect(
    dashboard.recent.every(
      (t: { requester_id: string }) => t.requester_id === me.id,
    ),
  ).toBe(true);
  const asset = (await value(api, "/api/assets"))[0];
  const history = await value(api, `/api/assets/${asset.id}/tickets`);
  expect(
    history.every((t: { requester_id: string }) => t.requester_id === me.id),
  ).toBe(true);
  await api.dispose();
  await admin.dispose();
});
test("create, assign, technician workflow, audit, timestamps and optimistic conflict", async ({
  playwright,
}) => {
  const admin = await login(playwright);
  const tech = await login(playwright, "technician");
  const req = await login(playwright, "requester");
  const technicians = await value(admin, "/api/members/technicians");
  const foreign = await login(playwright, "technician", "blue");
  const foreignMe = await value(foreign, "/api/auth/me");
  const title = `E2E workflow ${Date.now()}`;
  const create = await req.post("/api/tickets", {
    data: {
      title,
      description: "ปัญหาสมมติสำหรับทดสอบ",
      priority: "urgent",
      location: "ห้องทดสอบ",
    },
  });
  expect(create.status()).toBe(201);
  let ticket = (await create.json()).data;
  expect(ticket.ticket_no).toMatch(/^IT-\d{5,}$/);
  expect(
    (await value(req, `/api/tickets?q=${encodeURIComponent(title)}`)).total,
  ).toBe(1);
  expect(
    (await value(req, "/api/dashboard")).recent.some(
      (t: { id: string }) => t.id === ticket.id,
    ),
  ).toBe(true);
  expect(
    (
      await tech.patch(`/api/tickets/${ticket.id}`, {
        data: { version: ticket.version, status: "cancelled" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await admin.patch(`/api/tickets/${ticket.id}`, {
        data: { version: ticket.version, assignee_id: foreignMe.id },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await admin.patch(`/api/tickets/${ticket.id}`, {
        data: { version: ticket.version, status: "closed" },
      })
    ).status(),
  ).toBe(409);
  const assign = await admin.patch(`/api/tickets/${ticket.id}`, {
    data: { version: ticket.version, assignee_id: technicians[0].id },
  });
  expect(assign.status()).toBe(200);
  ticket = (await assign.json()).data;
  expect(ticket.status).toBe("assigned");
  expect(
    (
      await admin.patch(`/api/tickets/${ticket.id}`, {
        data: { version: 1, title: "stale update" },
      })
    ).status(),
  ).toBe(409);
  for (const status of ["in_progress", "resolved", "closed"]) {
    const r = await tech.patch(`/api/tickets/${ticket.id}`, {
      data: { version: ticket.version, status },
    });
    expect(r.status()).toBe(200);
    ticket = (await r.json()).data;
  }
  expect(ticket.resolved_at).toBeTruthy();
  const detail = await value(admin, `/api/tickets/${ticket.id}`);
  expect(
    detail.events.map((e: { event_type: string }) => e.event_type),
  ).toContain("assignee_id");
  expect(
    detail.events.filter(
      (e: { event_type: string }) => e.event_type === "status",
    ),
  ).toHaveLength(4);
  await Promise.all([
    admin.dispose(),
    tech.dispose(),
    req.dispose(),
    foreign.dispose(),
  ]);
});
test("concurrent ticket creation generates unique numbers and counts", async ({
  playwright,
}) => {
  const api = await login(playwright);
  const before = (await value(api, "/api/tickets")).total;
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      api.post("/api/tickets", {
        data: {
          title: `E2E Concurrency ${Date.now()} ${i}`,
          description: "ทดสอบหลายคำขอ",
          priority: "low",
          location: "test",
        },
      }),
    ),
  );
  const created = [];
  for (const r of results) {
    expect(r.status()).toBe(201);
    created.push((await r.json()).data);
  }
  expect(new Set(created.map((t) => t.ticket_no)).size).toBe(5);
  expect((await value(api, "/api/tickets")).total).toBe(before + 5);
  await api.dispose();
});
test("assets can be created and edited, duplicate code rejected", async ({
  playwright,
}) => {
  const api = await login(playwright);
  const input = {
    asset_code: `E2E-QA-${Date.now()}`,
    name: "เครื่องทดสอบ",
    category: "คอมพิวเตอร์",
    location: "ห้องทดสอบ",
    status: "active",
  };
  const create = await api.post("/api/assets", { data: input });
  expect(create.status()).toBe(201);
  const asset = (await create.json()).data;
  expect((await api.post("/api/assets", { data: input })).status()).toBe(409);
  expect(
    (
      await api.patch(`/api/assets/${asset.id}`, {
        data: { ...input, status: "maintenance" },
      })
    ).status(),
  ).toBe(200);
  expect((await value(api, `/api/assets/${asset.id}`)).status).toBe(
    "maintenance",
  );
  await api.dispose();
});
test("expired sessions are rejected by the real Worker and D1", async ({
  playwright,
}) => {
  const api = await login(playwright);
  const state = await api.storageState();
  const token = state.cookies.find((c) => c.name === "fixdesk_session")!.value;
  const hash = createHash("sha256").update(token).digest("hex");
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "fixdesk-local",
      "--local",
      "--command",
      `UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE token_hash='${hash}'`,
    ],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(0);
  expect((await api.get("/api/auth/me")).status()).toBe(401);
  expect((await api.get("/api/tickets")).status()).toBe(401);
  await api.dispose();
});
test("a concurrent stale edit creates exactly one audit event", async ({
  playwright,
}) => {
  const api = await login(playwright);
  const r = await api.post("/api/tickets", {
    data: {
      title: `E2E optimistic ${Date.now()}`,
      description: "ทดสอบ audit กับ concurrency",
      priority: "normal",
      location: "test",
    },
  });
  expect(r.status()).toBe(201);
  const ticket = (await r.json()).data;
  const responses = await Promise.all(
    ["one", "two"].map((v) =>
      api.patch(`/api/tickets/${ticket.id}`, {
        data: { version: ticket.version, description: `update ${v}` },
      }),
    ),
  );
  expect(responses.map((v) => v.status()).sort()).toEqual([200, 409]);
  const after = await value(api, `/api/tickets/${ticket.id}`);
  expect(
    after.events.filter(
      (e: { event_type: string }) => e.event_type === "description",
    ),
  ).toHaveLength(1);
  await api.dispose();
});
