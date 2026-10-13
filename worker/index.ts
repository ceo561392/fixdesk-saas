import { auth } from "./auth";
import { ApiError, checkOrigin, data, fail, identity } from "./lib";
import type { Env } from "./lib";
import { tickets } from "./tickets";
import { assets } from "./assets";
import { dashboard } from "./dashboard";
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await handle(request, env);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  },
};
async function handle(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/api/health") return data({ status: "ok" });
    checkOrigin(request, env);
    const response = await auth(request, env, path);
    if (response) return response;
    const user = await identity(request, env);
    const result =
      (await tickets(request, env, user, url)) ??
      (await assets(request, env, user, url)) ??
      (await dashboard(request, env, user, url));
    if (result) return result;
    return fail(404, "NOT_FOUND", "ไม่พบข้อมูล");
  } catch (error) {
    const known = error instanceof ApiError;
    return Response.json(
      {
        error: {
          code: known ? error.code : "INTERNAL_ERROR",
          message: known ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
        },
      },
      { status: known ? error.status : 500 },
    );
  } finally {
    // Drain rejected request bodies so local workerd keep-alive connections remain reusable.
    if (request.body && !request.bodyUsed) await request.arrayBuffer();
  }
}
