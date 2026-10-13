import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function signIn(page: Page, email = "admin@tropica.test") {
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("Demo@12345");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "ทุกงานซ่อม อยู่ในสายตาคุณ" }),
  ).toBeVisible();
}
test("browser login error, demo selector, dashboard and refresh", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill("admin@tropica.test");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  );
  await page
    .locator(".demo-company")
    .filter({ hasText: "Tropica Demo" })
    .getByRole("button", { name: "ผู้ดูแลระบบ" })
    .click();
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".kpi-card")).toHaveCount(4);
  await expect(page.locator(".ticket-table tbody tr")).toHaveCount(5);
  await page.getByLabel("ช่วงเวลา").selectOption("7");
  await expect(page.locator(".kpi-card").first()).toContainText(
    "งานแจ้งซ่อมทั้งหมด",
  );
  await page.reload();
  await expect(page.locator(".tenant-heading")).toContainText("Tropica Demo");
  await expect(page.locator(".kpi-card")).toHaveCount(4);
  await page.screenshot({
    path: ".local/dashboard-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("browser creates ticket, edits, assigns, completes repair and searches", async ({
  page,
}) => {
  await signIn(page);
  await page
    .getByRole("link", { name: "แจ้งซ่อม", exact: true })
    .first()
    .click();
  const title = `E2E UI repair ${Date.now()}`;
  await page.getByLabel("หัวข้อปัญหา").fill(title);
  await page
    .getByLabel("รายละเอียดปัญหา")
    .fill("รายละเอียดสมมติสำหรับ browser test");
  await page.getByLabel("สถานที่").fill("ห้องทดสอบ UI");
  await page.getByRole("button", { name: "ส่งงานแจ้งซ่อม" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("สร้างงานแจ้งซ่อม");
  await page.getByRole("button", { name: "แก้ไขรายละเอียด" }).click();
  await page.getByLabel("รายละเอียดปัญหา").fill("แก้ไขรายละเอียดสมมติแล้ว");
  await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
  await expect(page.locator(".description-text")).toContainText(
    "แก้ไขรายละเอียดสมมติแล้ว",
  );
  const techs = (
    await (await page.request.get("/api/members/technicians")).json()
  ).data;
  await page
    .getByRole("combobox", { name: "มอบหมายช่าง" })
    .selectOption(techs[0].id);
  await page.getByRole("button", { name: "บันทึกผู้รับผิดชอบ" }).click();
  await expect(page.locator(".page-heading .badge")).toHaveText("มอบหมายแล้ว");
  for (const [status, label] of [
    ["in_progress", "กำลังดำเนินการ"],
    ["resolved", "แก้ไขแล้ว"],
    ["closed", "ปิดงาน"],
  ]) {
    await page
      .getByRole("combobox", { name: "เปลี่ยนสถานะ" })
      .selectOption(status);
    await page.getByRole("button", { name: "บันทึกสถานะ" }).click();
    await expect(page.locator(".page-heading .badge")).toHaveText(label);
  }
  await expect(page.locator(".timeline")).toContainText("มอบหมายช่าง");
  await expect(page.locator(".resolved-note")).toBeVisible();
  await page.getByRole("link", { name: "กลับสู่งานแจ้งซ่อม" }).click();
  await page.getByRole("textbox", { name: "ค้นหางาน" }).fill(title);
  await expect(page.locator(".ticket-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".ticket-title")).toContainText(title);
  await page
    .getByRole("combobox", { name: "กรองสถานะ", exact: true })
    .selectOption("open");
  await expect(page.getByText("ยังไม่มีรายการ", { exact: true })).toBeVisible();
});
test("asset QR form preserves return URL, prefills and blocks a foreign company", async ({
  page,
  playwright,
}) => {
  await signIn(page);
  await page.goto("/assets/new");
  const code = `E2E-UI-QR-${Date.now()}`;
  await page.getByLabel("รหัสทรัพย์สิน").fill(code);
  await page.getByLabel("ชื่ออุปกรณ์").fill("เครื่องพิมพ์ทดสอบ QR");
  await page.getByLabel("ประเภท").fill("เครื่องพิมพ์");
  await page.getByLabel("สถานที่").fill("ชั้น 2 ห้องบัญชี");
  await page.getByRole("button", { name: "บันทึกอุปกรณ์" }).click();
  await expect(page.getByTestId("asset-qr").locator("svg")).toBeVisible();
  const id = page.url().split("/").pop();
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await page.goto(`/report?asset=${id}`);
  await expect(page).toHaveURL(/\/login\?next=/);
  await page
    .getByLabel("อีเมล", { exact: true })
    .fill("requester@tropica.test");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("Demo@12345");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/report\\?asset=${id}`));
  await expect(page.getByLabel("อุปกรณ์", { exact: true })).toHaveValue(id!);
  await expect(page.getByLabel("สถานที่")).toHaveValue("ชั้น 2 ห้องบัญชี");
  await page.getByLabel("หัวข้อปัญหา").fill(`E2E UI QR repair ${Date.now()}`);
  await page
    .getByLabel("รายละเอียดปัญหา")
    .fill("เครื่องพิมพ์ออฟไลน์จากการทดสอบ QR");
  await page.getByRole("button", { name: "ส่งงานแจ้งซ่อม" }).click();
  await expect(page.getByRole("status")).toContainText("สร้างงานแจ้งซ่อม");
  const b = await playwright.request.newContext({
    baseURL: "http://localhost:5173",
    extraHTTPHeaders: { origin: "http://localhost:5173" },
  });
  await b.post("/api/auth/login", {
    data: { email: "admin@blue.test", password: "Demo@12345" },
  });
  const foreign = (await (await b.get("/api/assets")).json()).data[0];
  await page.goto(`/report?asset=${foreign.id}`);
  await expect(page.getByRole("alert")).toContainText("ไม่พบอุปกรณ์");
  await expect(
    page.getByRole("button", { name: "ส่งงานแจ้งซ่อม" }),
  ).toHaveCount(0);
  await b.dispose();
});
test("mobile navigation, cards, no overflow and requester controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "requester@blue.test");
  await expect(page.locator(".tenant-heading")).toContainText(
    "Blue Factory Demo",
  );
  await page.screenshot({
    path: ".local/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  await page.locator("nav").getByRole("link", { name: "งานแจ้งซ่อม" }).click();
  await expect(page.locator(".ticket-title").first()).toBeVisible();
  await page.locator(".ticket-title").first().click();
  await expect(
    page.getByRole("combobox", { name: "เปลี่ยนสถานะ" }),
  ).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "มอบหมายช่าง" })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get("/api/tickets")).status()).toBe(401);
});
