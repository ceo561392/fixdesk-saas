# FixDesk SaaS Demo

ระบบแจ้งซ่อมไอทีภาษาไทยที่รันจริงบน localhost ด้วย React + TypeScript + Vite + Tailwind CSS, Cloudflare Worker REST API และ Local D1 (SQLite) ใช้ข้อมูลสมมติสองบริษัท แยก tenant และสิทธิ์จาก session ฝั่ง server

## เปิดใช้งานบน Windows PowerShell

ต้องมี Node.js 22.12+ หรือ 24 และ npm (ทดสอบบน Node 24.18.0 / npm 11.16.0)

```powershell
cd D:\fixdesk-saas
npm install
npm run setup
npm run dev
```

เปิด **http://localhost:5173** โดยใช้ `localhost` ตามนี้ เพราะระบบตรวจ Origin สำหรับ CSRF พอร์ตถูกกำหนดแบบ strict เพื่อไม่เปลี่ยนพอร์ตเอง หากมี process ใช้งานพอร์ตอยู่ ให้ใช้ server เดิมหรือหยุด process นั้นก่อน

ไม่ต้องมีบัญชี Cloudflare ไม่ต้อง `wrangler login` และไม่มีบริการเสียเงิน ใช้ฐานข้อมูลใน `.wrangler/state/v3/d1` เท่านั้น ค่า database ID ใน config เป็น placeholder สำหรับ local ไม่ใช่ฐานข้อมูลออนไลน์

ถ้าเคยติดตั้งและ setup แล้ว ใช้เพียง `npm run dev` หยุด server ได้ด้วย `Ctrl+C` ใน terminal ที่เปิดไว้

## บัญชี Demo

รหัสผ่านทุกบัญชี: **`Demo@12345`** หน้า Login มีปุ่มเลือกบัญชีเพื่อเติมข้อมูล (ควบคุมด้วย `DEMO_MODE` ฝั่ง Worker)

| บริษัท            | Admin                | Technician                | Requester                |
| ----------------- | -------------------- | ------------------------- | ------------------------ |
| Tropica Demo      | `admin@tropica.test` | `technician@tropica.test` | `requester@tropica.test` |
| Blue Factory Demo | `admin@blue.test`    | `technician@blue.test`    | `requester@blue.test`    |

ข้อมูลตั้งต้น: Tropica 12 อุปกรณ์/20 งาน; Blue Factory 6 อุปกรณ์/8 งาน บัญชีแต่ละคนเป็นสมาชิกบริษัทเดียวโดย design บัญชีที่มีหลาย membership จะถูกปฏิเสธจนกว่าจะมีระบบเลือก active tenant ที่ตรวจสอบฝั่ง server

## ทดลองใช้งาน

1. เข้าด้วย Admin Tropica ดูชื่อบริษัทบน Header, Dashboard และงานซ่อม
2. เพิ่มงานจาก **แจ้งซ่อม** เลือกอุปกรณ์หรือแจ้งปัญหาทั่วไป กรอกรายละเอียดและสถานที่
3. เปิดรายละเอียดงาน มอบหมายช่าง Tropica แล้วเปลี่ยนสถานะ `assigned → in_progress → resolved → closed` ทุกการเปลี่ยนแปลงมี Timeline
4. ออกจากระบบ เข้า Technician Tropica และอัปเดตได้เฉพาะงานที่ได้รับมอบหมาย Admin เป็นผู้มอบหมายช่าง
5. เข้า Requester เพื่อสร้างและดูเฉพาะงานของตน แก้รายละเอียดได้ก่อนงานสิ้นสุด แต่เปลี่ยนสถานะและมอบหมายช่างไม่ได้
6. Admin เพิ่มอุปกรณ์ เปิดรายละเอียด ดูประวัติ และพิมพ์ QR; QR ชี้ `/report?asset=<uuid>` ต้อง Login ก่อน และจะเลือกอุปกรณ์/สถานที่ให้อัตโนมัติ
7. สลับไปบัญชี Blue Factory จะเห็นข้อมูลบริษัท Blue เท่านั้น การเปิด URL งานหรือ QR ของ Tropica ถูกปฏิเสธ

การสแกน QR จากโทรศัพท์จริงต้องให้โทรศัพท์เข้าถึง host ที่รัน server ได้; `localhost` บนโทรศัพท์หมายถึงโทรศัพท์เครื่องนั้น Demo นี้เปิดเฉพาะ loopback ตามขอบเขตงาน หากทดลองผ่าน LAN ต้องเปลี่ยน host และ `APP_ORIGIN` ให้ตรงกับ URL จริงก่อน ไม่ได้เปิด LAN ไว้โดยอัตโนมัติ

## Database และ seed

```powershell
npm run db:migrate
npm run db:seed
npx wrangler d1 execute fixdesk-local --local --command "SELECT name,slug FROM tenants"
```

Seed ใช้ UUID คงที่และ `INSERT OR IGNORE` รันซ้ำได้โดยไม่ลบงานเดิม ไม่แก้ข้อมูลที่ผู้ใช้สร้าง และไม่รีเซ็ตรหัสผ่านเดิม SQL ที่สร้างอยู่ `.local/seed.sql` ซึ่งไม่เข้า Git ทุกคำสั่ง DB ของ Demo มี `--local`; อย่าเติม `--remote`

Schema มี foreign keys แบบ `(tenant_id, asset_id)` และ `(tenant_id, user_id)`, unique asset/ticket numbers ต่อ tenant, indexes และ counter ต่อบริษัท การสร้างเลขงานและงานใหม่ใช้ D1 batch transaction เพื่อไม่ชนกัน การแก้ไขใช้ `version` ป้องกันงานถูกเขียนทับจากหน้าจอเก่า (409) และ audit จะเพิ่มเฉพาะการแก้ไขที่สำเร็จ

## ทดสอบและ build

```powershell
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm run test:e2e` เปิด dev server อัตโนมัติหากยังไม่มี ใช้พอร์ต 5173 และ Local D1 จริง ทดสอบ API และ Chromium ทั้ง desktop/mobile แล้วลบ fixtures ที่ขึ้นต้นชื่อ `E2E ` และรหัสอุปกรณ์ `E2E-` โดยคงข้อมูล Demo เดิมและไม่ลด counter เลขงาน ไม่ควรใช้ prefix เหล่านี้ตั้งชื่องานของคุณ Test runner cleanup ทั้งกรณีผ่านและไม่ผ่าน ถ้าหยุด process กลางทางใช้ `node scripts/cleanup-test-data.mjs` ภายหลังได้

- Vitest: password hash, token/cookie, Origin/CSRF, role guards, transitions, SQLite constraints ป้องกัน cross-tenant references
- API integration: 6 บัญชี, anonymous/forbidden, session หมดอายุ/logout, IDOR อ่าน/แก้ไขสองทิศทาง, Requester scope, foreign asset/assignee, validation, pagination/search, concurrent numbers, optimistic edit และ audit
- Browser: login error/demo selector, Dashboard/refresh/filter, สร้าง/แก้ไข/มอบหมาย/ปิดงาน, QR Login return/prefill/foreign tenant, เมนูและการ์ดมือถือ

ภาพที่ browser tests บันทึก: `.local/dashboard-desktop.png`, `.local/dashboard-mobile.png` ผลการทดสอบและ trace อยู่ `test-results/` (ไม่เข้า Git)

Production build อยู่ `dist/client` และ `dist/fixdesk_demo` สำหรับตรวจ bundle บนเครื่อง ให้หยุด dev server แล้วรัน:

```powershell
npm run preview
```

Preview ใช้ http://localhost:5173 เช่นกันเพื่อให้ Origin ตรงกัน Build สำเร็จไม่ได้หมายความว่า Demo พร้อมให้ลูกค้าจริงใช้งาน

## API และ security

API ใช้ `{ "data": ... }` หรือ `{ "error": { "code": "...", "message": "..." } }` และ status 400/401/403/404/409/500; response ไม่ cache

| Endpoint                                                              | การใช้งาน                                      |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`   | Login, Logout, Session                         |
| `GET /api/dashboard?days=all\|7\|30`                                  | KPI, สถานะ, งานล่าสุด                          |
| `GET /api/tickets?status=&priority=&q=&page=`                         | ค้นหา/กรอง/แบ่งหน้า 10 งาน                     |
| `POST /api/tickets`, `GET /api/tickets/:id`, `PATCH /api/tickets/:id` | สร้าง/รายละเอียด/แก้ไข + version               |
| `GET /api/assets`, `POST /api/assets`                                 | อุปกรณ์ (สูงสุด 200 รายการใน Demo)             |
| `GET /api/assets/:id`, `PATCH /api/assets/:id`                        | ข้อมูล/แก้ไขอุปกรณ์โดย Admin                   |
| `GET /api/assets/:id/tickets`                                         | ประวัติ (สูงสุด 100 งาน, Requester เฉพาะของตน) |
| `GET /api/members/technicians`, `GET /api/members`                    | ช่าง/สมาชิกบริษัท                              |
| `GET /api/health`, `GET /api/demo/accounts`                           | Health / บัญชี Demo เมื่อเปิด DEMO_MODE        |

ใช้ PBKDF2-SHA256 100,000 iterations พร้อม salt แยกบัญชีผ่าน Web Crypto; session token สุ่ม 256 bits เก็บ SHA-256 hash ใน DB, อายุ 8 ชั่วโมง, cookie HttpOnly + SameSite=Lax และ Secure เมื่อ HTTPS ตรวจ Origin ตรงกับ `APP_ORIGIN` ทุก write request รวม Login/Logout จึงต้องส่ง Origin หากทดสอบ API โดยตรง ไม่มี CORS สำหรับเว็บอื่น

Tenant มาจาก session/membership ที่ server ตรวจแล้วเท่านั้น Client ไม่สามารถส่ง tenant_id เพื่อตัดสินสิทธิ์ Payload ไม่รู้จักถูกปฏิเสธด้วย Zod strict validation, จำกัดความยาวข้อความและผลลัพธ์, query ใช้ prepared statements ข้อมูลรายละเอียดงานแสดงเป็นข้อความ ไม่มีการ render HTML จากผู้ใช้

## โครงสร้างและ Phase

- `src/components`, `src/pages`, `src/hooks`, `src/lib`, `src/types`: React UI
- `worker/auth.ts`, `lib.ts`: auth/session/guards/validation
- `worker/tickets.ts`, `workflow.ts`, `assets.ts`, `dashboard.ts`: REST API
- `migrations/0001_schema.sql`: Schema/constraints/indexes
- `scripts/seed.mjs`: idempotent seed; `scripts/test-e2e.mjs`: integration runner/cleanup
- `tests/`: Vitest และ Playwright tests

Phase 1: scaffold จาก official `create-cloudflare` React TypeScript template, UI/API health ผ่าน localhost (C3 บน Windows มี native assertion ตอนปิด process หลังสร้างไฟล์เสร็จ จึงยืนยันต่อด้วย dev server/typecheck/build)

Phase 2: Local D1 migrations และ seed, ตรวจจำนวนแยกสองบริษัทและรัน seed ซ้ำ

Phase 3: auth/RBAC/session/CSRF, เข้าระบบ 6 บัญชีและทดสอบสิทธิ์/IDOR

Phase 4: งานซ่อม/filters/pagination/assignment/transitions/timestamps/audit/concurrency

Phase 5: เพิ่ม/แก้ไข/ดูอุปกรณ์, ประวัติ, QR และ login return พร้อม tenant guards

Phase 6: Dashboard จริง, responsive, loading/empty/error states, browser QA, typecheck/tests/build และคู่มือ

## ขอบเขต Demo

ทีมงานแสดงสมาชิกและ role แบบอ่านอย่างเดียว ใช้บัญชี seed ไม่มี public registration, เพิ่ม/ลบสมาชิก, ลบงาน/อุปกรณ์, ไฟล์แนบ, LINE, Payment, AI หรืออีเมลจริง ฟีเจอร์เหล่านี้ไม่ได้อยู่ใน flow หลักของ Demo และไม่มีปุ่มที่แสร้งว่าทำได้

ก่อน Production ต้องออกแบบ backup/restore, monitoring, rate limiting, session hardening, password reset, tenant provisioning, file controls, PDPA/Privacy Policy และ incident response พร้อม security tests เพิ่มเติม **ห้าม deploy บัญชีและ credential Demo ไป Production** ค่า `DEMO_MODE=false` ซ่อนรายการบัญชีอย่างเดียว ไม่ได้ลบบัญชี seed

อ้างอิงวิธี setup จาก [Cloudflare React + Vite](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/), [Vite plugin](https://developers.cloudflare.com/workers/local-development/vite-plugin/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) ใช้เวอร์ชันที่ล็อกไว้ใน `package-lock.json`
