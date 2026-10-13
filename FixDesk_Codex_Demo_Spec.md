# FixDesk SaaS — Codex Demo Build Specification

> เป้าหมาย: ให้ Codex ใน VS Code สร้าง **Demo ที่รันได้จริงบนเครื่อง** สำหรับระบบแจ้งซ่อม IT แบบ Multi-Tenant SaaS ภาษาไทย โดยยังไม่ต้องเชื่อมระบบชำระเงินหรือ LINE และไม่ใช้ข้อมูลลูกค้าจริง

## 1. บทบาทของ Codex

คุณเป็น Senior Full-Stack Engineer และ UX Designer ให้สร้างโปรเจกต์ที่รันได้จริง ไม่ใช่เพียง mockup หรือไฟล์ HTML หน้าเดียว อ่านเอกสารนี้ให้ครบก่อนลงมือ และดำเนินงานเป็นขั้นตอน โดยรักษาความปลอดภัยของข้อมูลระหว่างบริษัทเป็นหลัก

**Definition of Done:** เปิดเว็บในเครื่องได้, ใช้บัญชี Demo เข้าระบบได้, ดู Dashboard, เพิ่ม/แก้ไขงานแจ้งซ่อม, มอบหมายช่าง, เปลี่ยนสถานะ, ดูทะเบียนอุปกรณ์, เปิดฟอร์มจาก QR Code และสลับบัญชีสองบริษัทเพื่อยืนยันว่าไม่เห็นข้อมูลข้ามบริษัทได้ พร้อม README วิธีรันและทดสอบ

## 2. ข้อจำกัด

- งบ 0–1,000 บาท: เน้น Free tier, รัน Local ก่อน, ไม่ซื้อโดเมน
- ภาษา UI เป็นภาษาไทย, Responsive รองรับมือถือและคอมพิวเตอร์
- ห้ามใช้ข้อมูลจริง, ห้ามใส่ secret ลง Git, ห้ามอ้างว่า Demo พร้อมใช้ Production
- ไม่ต้องมี LINE Bot, Payment Gateway, AI, ระบบอีเมลจริง หรือระบบสมัครแบบเปิดสาธารณะใน Demo
- อย่าติดตั้งบริการเสียเงินโดยไม่ได้รับอนุญาต
- ใช้ npm และคำสั่งที่ทำงานบน Windows PowerShell ได้

## 3. Technology Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Cloudflare Workers (TypeScript) REST API
- Database: Cloudflare D1 / SQLite ใช้ Local D1 ผ่าน Wrangler
- Routing: React Router (ถ้าจำเป็น)
- Validation: Zod
- UI: ดีไซน์ Dashboard แบบ SaaS ที่เรียบง่าย ใช้ Lucide icons
- QR: ไลบรารีสร้าง QR Code ที่เหมาะสม
- Demo images: ใช้ placeholder/local assets; ไม่ต้องใช้ R2 ในรุ่น Demo แรก
- Testing: Vitest สำหรับ utility/authorization และ integration test เท่าที่สภาพแวดล้อมรองรับ

หาก API หรือวิธีตั้งค่า Cloudflare เปลี่ยนไป ให้ยึดเอกสารทางการล่าสุดและปรับคำสั่งให้เข้ากับเวอร์ชันแพ็กเกจจริง ห้ามเดาชื่อไฟล์หรือคำสั่งโดยไม่ตรวจสอบ

## 4. Architecture

```text
Browser (React)
   |
   | fetch /api/* + HttpOnly session cookie
   v
Cloudflare Worker
   |-- Auth / RBAC / tenant resolution
   |-- Tickets API
   |-- Assets API
   |-- Dashboard API
   v
Cloudflare D1 (SQLite)
```

ใช้ **shared database, shared schema** โดยทุกข้อมูลของบริษัทต้องมี `tenant_id` และทุก query ต้องกรองด้วย tenant จาก session ฝั่ง Server ไม่ใช่รับ tenant_id จาก Client เพื่อใช้ตัดสินสิทธิ์

## 5. Roles

| Role | สิทธิ์ |
|---|---|
| admin | จัดการงานทั้งหมด อุปกรณ์ สมาชิกในบริษัท และ Dashboard |
| technician | ดูงานในบริษัทที่ได้รับสิทธิ์, รับ/อัปเดตงาน, ดูอุปกรณ์ |
| requester | สร้างงานและดูงานที่ตนเองแจ้งเท่านั้น |

ใน Demo ให้ Admin เป็นผู้มอบหมายงานแก่ช่าง และ Requester ไม่สามารถแก้ status หรือ assignee ได้

## 6. Data Model

สร้าง migrations SQL พร้อม foreign keys และ indexes โดยอย่างน้อยมีตาราง:

1. `tenants`: id, name, slug, plan, status, created_at
2. `users`: id, name, email(unique), password_hash, created_at
3. `memberships`: tenant_id, user_id, role, created_at; PK(tenant_id,user_id)
4. `assets`: id, tenant_id, asset_code, name, category, location, status, created_at; UNIQUE(tenant_id,id), UNIQUE(tenant_id,asset_code)
5. `tickets`: id, tenant_id, ticket_no, asset_id nullable, requester_id, assignee_id nullable, title, description, priority, status, location, created_at, updated_at, resolved_at nullable; UNIQUE(tenant_id,id), UNIQUE(tenant_id,ticket_no)
6. `ticket_events`: id, tenant_id, ticket_id, actor_id, event_type, old_value nullable, new_value nullable, created_at
7. `sessions`: id, user_id, token_hash unique, expires_at, created_at

กำหนด composite foreign keys `(tenant_id, asset_id)` และ `(tenant_id, user_id)` ในตารางที่เกี่ยวข้อง เพื่อป้องกันการอ้างข้อมูลข้ามบริษัท รวมถึง index บน `(tenant_id,status,created_at)` ของ tickets

Status: `open`, `assigned`, `in_progress`, `resolved`, `closed`, `cancelled`

Priority: `low`, `normal`, `high`, `urgent`

ใช้ UUID หรือ crypto.randomUUID() สำหรับ ID และสร้าง ticket_no ที่อ่านง่ายต่อบริษัท เช่น `IT-00001` โดยจัดการ concurrency ให้เหมาะสม

## 7. Authentication & Security

- สำหรับ Demo ให้ seed บัญชีทดสอบไว้ ไม่เปิด public registration
- Hash รหัสผ่านด้วยอัลกอริทึมที่ปลอดภัยและรองรับ Cloudflare Workers (เช่น Web Crypto PBKDF2 พร้อม salt, iterations ที่เหมาะสม); ห้ามเก็บ plaintext
- สร้าง random session token ที่คาดเดาไม่ได้ เก็บเฉพาะ hash ใน DB และส่ง Cookie แบบ HttpOnly, SameSite=Lax, Secure เมื่อเป็น HTTPS
- มี endpoint login/logout/me และตรวจสอบอายุ session
- ป้องกัน CSRF สำหรับ state-changing requests ที่ใช้ cookie (ตรวจ Origin/CSRF token ตามรูปแบบที่เลือก)
- Validate ทุก request ฝั่ง Server; จำกัดความยาวข้อความและจำนวนรายการที่คืน
- ไม่ log password, token หรือข้อมูลลับ
- การเลือก tenant ต้องมาจาก membership ที่พิสูจน์แล้วใน session เท่านั้น; หากรองรับหลาย membership ต้องมี server-validated active tenant selection
- การทดสอบต้องมีกรณี IDOR/cross-tenant ทั้งการอ่านและแก้ไขข้อมูล

## 8. Screens & UX

ใช้ธีม Light สีขาว/เทา/น้ำเงินเข้ม เน้นความอ่านง่าย หน้าตาเหมือน SaaS ที่ขายได้จริง ไม่ใช่ admin template ที่มีข้อมูลแน่นเกินไป

### A. Login `/login`
- โลโก้ข้อความ FixDesk, ช่องอีเมลและรหัสผ่าน
- ปุ่มเข้าสู่ระบบ, validation และ error state
- กล่อง Demo Accounts ให้กดเลือกบัญชีทดสอบ (เฉพาะ dev/demo mode)

### B. Dashboard `/dashboard`
- Sidebar: Dashboard, งานแจ้งซ่อม, อุปกรณ์, ทีมงาน (ถ้าทำทัน)
- KPI: งานทั้งหมด, รอดำเนินการ, กำลังดำเนินการ, ปิดงานแล้ว
- กราฟจำนวนงานตามสถานะหรือ priority
- ตารางงานล่าสุดและตัวกรองช่วงเวลาอย่างง่าย

### C. Tickets `/tickets`
- ตาราง/การ์ดบนมือถือ: เลขงาน, หัวข้อ, อุปกรณ์, ผู้แจ้ง, ผู้รับผิดชอบ, ความสำคัญ, สถานะ, วันที่
- Search, filter status/priority, pagination
- ปุ่ม `+ แจ้งซ่อม` และฟอร์มสร้างงาน
- หน้ารายละเอียด `/tickets/:id` มี Timeline, มอบหมายช่าง, เปลี่ยนสถานะตามสิทธิ์

### D. Assets `/assets`
- รายการอุปกรณ์และเพิ่มอุปกรณ์ (admin)
- ฟิลด์: รหัสทรัพย์สิน, ชื่อ, ประเภท, สถานที่, สถานะ
- หน้า `/assets/:id` แสดงประวัติแจ้งซ่อมและ QR Code ที่ชี้ไป `/report?asset=<id>`

### E. Quick Report `/report?asset=<id>`
- ถ้าล็อกอินแล้วและมีสิทธิ์ ให้เติมอุปกรณ์อัตโนมัติและเปิดฟอร์มแจ้งซ่อม
- ถ้ายังไม่ล็อกอิน ให้ไป Login แล้วกลับมายังหน้ารายงาน
- ห้ามให้ QR Code เป็นวิธีข้ามสิทธิ์ หรือเปิดข้อมูลอุปกรณ์ข้าม tenant

## 9. API Endpoints

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/dashboard
GET    /api/tickets?status=&priority=&q=&page=
POST   /api/tickets
GET    /api/tickets/:id
PATCH  /api/tickets/:id
GET    /api/assets
POST   /api/assets
GET    /api/assets/:id
GET    /api/assets/:id/tickets
GET    /api/members/technicians
```

ใช้ JSON response ที่สม่ำเสมอ เช่น `{ "data": ... }` และ error `{ "error": { "code": "...", "message": "..." } }`; HTTP status ต้องเหมาะสม (400/401/403/404/409/500)

## 10. Seed Demo Data

สร้าง seed script ที่รันซ้ำได้อย่างปลอดภัย และมีข้อมูลสมมติอย่างน้อย:

- บริษัท A: `Tropica Demo` (ชื่อสมมติ), อุปกรณ์ 12 ชิ้น, Tickets 20 รายการ
- บริษัท B: `Blue Factory Demo`, อุปกรณ์ 6 ชิ้น, Tickets 8 รายการ
- บัญชีแต่ละบริษัท: admin, technician, requester
- ตัวอย่างปัญหา: เครื่องพิมพ์ออฟไลน์, Wi-Fi หลุด, คอมพิวเตอร์เปิดไม่ติด, Excel ค้าง, CCTV ไม่มีภาพ, LAN ใช้งานไม่ได้
- ใช้อีเมล `.test` และรหัสผ่าน Demo ที่ระบุใน README; ห้ามนำ credential Demo ไป Deploy Production
- แสดงชื่อบริษัทปัจจุบันบน Header อย่างชัดเจน

## 11. Folder Structure (ปรับตาม template ที่สร้างจริง)

```text
fixdesk-saas/
  src/
    components/
    pages/
    hooks/
    lib/
    types/
  worker/
    index.ts
    routes/
    middleware/
    services/
  migrations/
  scripts/
  tests/
  README.md
  .env.example
  .gitignore
  package.json
  wrangler.jsonc
```

## 12. Development Plan for Codex

ทำทีละ Phase และตรวจสอบผลก่อนข้าม Phase:

### Phase 1 — Scaffold
- ตรวจสอบ Node.js/npm/Git ที่มีในเครื่อง
- สร้าง Cloudflare React + TypeScript project ด้วยเครื่องมือทางการ
- ติดตั้ง Tailwind, Router, Zod และไลบรารีจำเป็น
- ตั้งค่า Worker API และหน้า React เริ่มต้น
- รัน `npm run dev` และยืนยันว่า UI/API ตอบสนอง

### Phase 2 — Database
- สร้าง D1 binding สำหรับ Local Development
- เขียน SQL migrations + indexes + constraints
- เขียน seed demo แบบ idempotent
- ตรวจสอบว่า query ข้อมูลสองบริษัทได้โดยไม่ปะปน

### Phase 3 — Auth / RBAC
- Login, Logout, Me, Session, Cookie, Auth Middleware
- Permission guards สำหรับ Admin/Technician/Requester
- Tests สำหรับ unauthorized, forbidden และ cross-tenant IDOR

### Phase 4 — Ticket Workflow
- Tickets CRUD เท่าที่จำเป็น, filters, pagination
- Assignment, status transitions, ticket_events audit trail
- ตรวจสอบ transition ที่อนุญาตและ timestamp

### Phase 5 — Assets & QR
- Asset CRUD ขั้นต่ำ, รายการและรายละเอียด
- QR link ไปฟอร์มแจ้งซ่อมแบบ prefilled
- ตรวจสอบว่า QR ไม่เปิดเผยข้อมูลต่างบริษัท

### Phase 6 — UI Polish & Testing
- Dashboard, loading/empty/error states, responsive
- Seed data แสดงจริง, ไม่มีปุ่มหลอก
- Run typecheck, tests, build และแก้ errors
- README พร้อมคำสั่ง Local Dev, migrate, seed, demo login และข้อจำกัด

## 13. Acceptance Tests

- [ ] `npm install` และ `npm run dev` ใช้งานได้
- [ ] Login ทั้ง 6 บัญชี Demo ได้
- [ ] Admin A เห็นเฉพาะข้อมูลบริษัท A
- [ ] Admin B เห็นเฉพาะข้อมูลบริษัท B
- [ ] Requester เห็นเฉพาะ Tickets ของตน
- [ ] Requester ไม่สามารถมอบหมายช่างหรือเปลี่ยนสถานะ
- [ ] สร้าง Ticket แล้วปรากฏในรายการและ Dashboard
- [ ] มอบหมายช่าง/เปลี่ยนสถานะแล้วมี Audit Trail
- [ ] เพิ่มอุปกรณ์และสร้าง QR Code ได้
- [ ] QR เปิดฟอร์มแจ้งซ่อมพร้อมเลือกอุปกรณ์ได้เมื่อมีสิทธิ์
- [ ] ส่ง ID ของบริษัท B ผ่าน API ขณะ Login บริษัท A แล้วเข้าถึงไม่ได้
- [ ] Refresh หน้าเว็บแล้ว Session ยังทำงาน
- [ ] Logout แล้วเรียก API ที่ต้อง Login ไม่ได้
- [ ] Typecheck, tests และ production build ผ่าน
- [ ] README อธิบายวิธีรันครบถ้วน

## 14. คำสั่งเริ่มงานสำหรับ Codex

> อ่านไฟล์ `FixDesk_Codex_Demo_Spec.md` นี้ทั้งหมด แล้วสร้าง Demo FixDesk SaaS ตามข้อกำหนดใน workspace ปัจจุบัน เริ่ม Phase 1 ก่อน ตรวจสอบเครื่องมือและสร้างโปรเจกต์จริงด้วย Cloudflare React + TypeScript template จากนั้นดำเนิน Phase 2–6 ตามลำดับโดยไม่ข้ามการทดสอบ ใช้ Local D1 และข้อมูลสมมติเท่านั้น ทำ UI ภาษาไทยที่ดูเป็น SaaS พร้อมขาย ห้ามทำเพียงภาพ mockup ทุกปุ่มหลักต้องทำงานได้ เมื่อเสร็จให้รัน typecheck/tests/build รายงานผล สิ่งที่ทำได้ สิ่งที่ยังไม่ทำ และคำสั่งเปิด Demo ใน VS Code หากมีขั้นตอนที่ต้อง Login Cloudflare หรือขอสิทธิ์จากผู้ใช้ ให้หยุดเฉพาะขั้นนั้นและอธิบายอย่างชัดเจน

## 15. ข้อควรระวังก่อนนำไปขาย

Demo นี้ยังไม่ใช่ Production SaaS ก่อนรับลูกค้าจริงต้องเพิ่มระบบสำรอง/กู้คืน, Monitoring, Rate limiting, Session hardening, Password reset, Tenant provisioning, การควบคุมไฟล์แนบ, PDPA/Privacy Policy, แผนรับเหตุข้อมูลรั่วไหล และทดสอบ Security เพิ่มเติม
