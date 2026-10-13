# FixDesk Demo — Verification report

ตรวจวันที่ 13 ตุลาคม 2026 (Asia/Bangkok) บน Windows, Node.js 24.18.0, npm 11.16.0 ใช้ Cloudflare workerd และ Local D1 จริง

| Check | Result |
|---|---|
| `npm install` | ผ่าน, dependency audit 0 vulnerabilities ในรอบติดตั้ง |
| `npm run dev` | UI และ `/api/health` HTTP 200 ที่ localhost:5173 |
| `npm run typecheck` | ผ่านทั้ง React และ Worker |
| `npm test` | 3 files, 11 tests passed |
| `npm run test:e2e` | 9 API tests + 4 Chromium browser tests passed |
| `npm run build` | ผ่าน, ได้ client และ Worker bundles |
| Seed ซ้ำ 2 รอบ | จำนวนเดิม: Tropica 12 assets/20 tickets, Blue 6 assets/8 tickets |
| Test fixture cleanup | ลบเฉพาะงาน/อุปกรณ์ที่ test สร้าง; counter ไม่ถอยหลัง |

## Acceptance checklist

- [x] ติดตั้งและเปิด local dev server ได้
- [x] Login ทั้ง 6 บัญชี
- [x] Admin A/B เห็นข้อมูล tenant ของตน
- [x] Requester เห็นงานตนเองและแก้สถานะ/assignee ไม่ได้
- [x] สร้างงานแล้วปรากฏในรายการและ Dashboard
- [x] มอบหมาย/เปลี่ยนสถานะมี audit และ resolved timestamp
- [x] เพิ่ม/แก้ไขอุปกรณ์และแสดง QR SVG จริง
- [x] เปิดฟอร์ม QR กลับจาก Login พร้อมเลือกอุปกรณ์และสถานที่
- [x] QR ต่าง tenant ไม่เปิดข้อมูลหรือฟอร์มส่งงาน
- [x] Cross-tenant GET/PATCH งานและอุปกรณ์ถูกปฏิเสธทั้ง A→B และ B→A
- [x] Foreign asset/assignee และ client tenant injection ถูกปฏิเสธ
- [x] Refresh ยังใช้ session ได้; หมดอายุและ Logout ถูกปฏิเสธโดย API จริง
- [x] CSRF/validation/filters/pagination/search
- [x] สร้างพร้อมกัน 5 คำขอได้เลขงานไม่ซ้ำ
- [x] แก้ไขพร้อมกันด้วย version เดียว สำเร็จหนึ่งคำขอ อีกคำขอ 409; audit เกิดหนึ่งครั้ง
- [x] Composite SQLite FK บล็อก cross-tenant references โดย database
- [x] Chromium desktop/mobile 390px, ไม่มี document overflow ในหน้าที่ตรวจ
- [x] Typecheck, tests และ production build
- [x] README มีคำสั่งรัน/migrate/seed/test/preview และขอบเขต Demo

การยืนยัน QR ใน browser ตรวจการแสดง QR SVG, ลิงก์ `/report?asset=...`, Login return, prefill และ authorization ไม่ได้ทดสอบกล้องโทรศัพท์จริงหรือการเข้าถึงผ่าน LAN Preview ของ production bundle ไม่ได้เป็นส่วนหนึ่งของ browser test suite; suite ทดสอบ dev server ที่รัน Worker runtime จริง

ทีมงานเป็นรายชื่อแบบอ่านอย่างเดียว ไม่มีการเพิ่ม/ลบสมาชิก ไม่มีระบบภายนอกตามขอบเขต Demo; งานและอุปกรณ์ไม่มี hard delete บัญชี Demo ไม่ได้ deploy ออนไลน์ และระบบยังไม่พร้อม Production
