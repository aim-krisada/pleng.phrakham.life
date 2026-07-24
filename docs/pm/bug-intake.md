# Bug Intake — pleng.phrakham.life

ด่านรับ+กรอง bug (P'Aim → intake channel → PM). Append-only ทีละตัว `BI-NNN`.
รูปประกอบ: `docs/pm/bug-intake-assets/BI-NNN-*.png`.

**เส้นแบ่ง:** intake กรอง+triage · **จ่ายงานแก้ = PM เท่านั้น**.
**จังหวะแจ้ง PM:** รวบเป็นชุด ping ทีเดียว · S1 (prod พัง) = ping ทันที.
**severity:** S1 = prod พัง/ใช้ไม่ได้ · S2 = ใช้งานเสียบางกรณี · S3 = cosmetic/minor.

---

## BI-001 — ปุ่ม share ทับซ้อนชื่อเพลง ตอนย่อความกว้างจอ
- **วันที่รับ:** 2026-07-24
- **หน้า/คอมโพเนนต์:** header หน้าดูเพลง (SongView) / top toolbar
- **อาการ:** ย่อความกว้างหน้าจอลง → ปุ่ม share + กลุ่มปุ่ม (back `<` / เมนู ⋮ / "สร้างเพลงใหม่" / badge "1") **ทับซ้อนกับชื่อเพลง** ไม่ wrap เป็นแถวใหม่ ไม่ยุบ
- **repro:** เปิดหน้าดูเพลง → ค่อยๆ ลดความกว้าง viewport → ปุ่มเริ่มเบียด/ทับ title
- **รูป:** `bug-intake-assets/BI-001-1.png` (back/branch/⋮ เบียดกัน) · `BI-001-2.png` (share/⋮/"สร้างเพลงใหม่" ทับ "กับเรา")
- **triage:** valid · **S2** (ไม่พัง prod แต่ใช้งานเสียตอนแคบ) · น่าจะเป็น header ไม่ responsive (ปุ่ม+title แชร์บรรทัดเดียว) · fix แนว: wrap / ยุบปุ่มเป็นไอคอน / title ellipsis
- **สถานะ:** จ่ายแล้ว round-2 (SB1 top-bar cleanup — share/⋮ ซ้ำ + responsive) · **ไม่ใช่ของใหม่** · จะ verify หลัง round-2 ปิด
