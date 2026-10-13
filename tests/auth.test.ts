import { describe, it, expect } from "vitest";
import { pbkdf2Sync } from "node:crypto";
import {
  checkOrigin,
  cookie,
  guard,
  sessionToken,
  tokenHash,
  verifyPassword,
} from "../worker/lib";
import type { Env, Identity } from "../worker/lib";
const user = { id: "1", role: "requester" } as Identity;
describe("authorization and session security", () => {
  it("rejects requester administration", () =>
    expect(() => guard(user, ["admin", "technician"])).toThrow());
  it("permits admin", () =>
    expect(() => guard({ ...user, role: "admin" }, ["admin"])).not.toThrow());
  it("rejects missing and foreign Origin", () => {
    for (const origin of ["", "https://evil.test"])
      expect(() =>
        checkOrigin(
          new Request("http://localhost:5173/api/tickets", {
            method: "POST",
            headers: { origin },
          }),
          { APP_ORIGIN: "http://localhost:5173" } as Env,
        ),
      ).toThrow();
  });
  it("permits configured Origin", () =>
    expect(() =>
      checkOrigin(
        new Request("http://localhost:5173/api/auth/login", {
          method: "POST",
          headers: { origin: "http://localhost:5173" },
        }),
        { APP_ORIGIN: "http://localhost:5173" } as Env,
      ),
    ).not.toThrow());
  it("sets HTTPS cookie flags and parses cookie", () => {
    expect(cookie(new Request("https://demo.test"), "abc", 3600)).toContain(
      "HttpOnly; SameSite=Lax; Max-Age=3600; Secure",
    );
    expect(
      sessionToken(
        new Request("http://localhost", {
          headers: { cookie: "other=a; fixdesk_session=abc" },
        }),
      ),
    ).toBe("abc");
  });
  it("hashes tokens", async () => {
    expect(await tokenHash("abc")).toHaveLength(64);
    expect(await tokenHash("abc")).not.toBe("abc");
  });
  it("verifies PBKDF2 and rejects wrong passwords", async () => {
    const hash = pbkdf2Sync(
      "Demo@12345",
      "salt",
      100000,
      32,
      "sha256",
    ).toString("hex");
    expect(
      await verifyPassword("Demo@12345", `pbkdf2$100000$salt$${hash}`),
    ).toBe(true);
    expect(await verifyPassword("wrong", `pbkdf2$100000$salt$${hash}`)).toBe(
      false,
    );
  });
});
