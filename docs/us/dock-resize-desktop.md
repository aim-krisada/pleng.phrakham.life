# US — DockKey: desktop free-resize + auto-fit buttons + ⚙ layout (base = รอบ 30)

**P'Aim อนุมัติสเปกนี้เต็ม (18 ก.ค. ค่ำ · หลัง rollback).** โจทย์เดียว จบในตัว. ห้าม scope creep.

## Base / ขอบเขต
- **Branch จาก `2f4177e` (deploy รอบ 30 · = live ปัจจุบัน)** — ⛔ ห้าม branch จาก `studio-shell-redesign`/`64ec8ef` (มีของ dock-space ที่ P'Aim สั่งทิ้ง)
- ไฟล์หลัก: `src/components/DockKey.vue` (เวอร์ชันรอบ 30 · ~629 บรรทัด · ไม่มี resize/auto-hide เดิม)
- **Desktop เท่านั้น** = `!mobile` (โค้ดมี `mobile` = `matchMedia('(max-width: 760px)')` แล้ว)
- **Mobile (≤760px) ห้ามแตะเลย** — เหมือนรอบ 30 เป๊ะ (แถบติดขอบล่างเต็มกว้าง) · diff บน mobile path ต้อง = 0
- ⛔ ไม่เพิ่ม auto-hide / แถบลอย / contextual toolbox / resize-handle แบบมี grip

## Requirements (desktop)

### R1 — ลากขอบปรับขนาดกล่อง dock (free 2 แกน)
- ลากขอบ **ขวา**=กว้าง · **ล่าง**=สูง · **มุมขวา-ล่าง**=ทั้งคู่ (อย่างน้อย 3 นี้)
- ใช้ **Pointer Events** (`pointerdown/move/up`+`setPointerCapture` · เลียนแบบ `gripDown/Move/Up` ที่มีอยู่) → ทำงานทุก input
- 🔴 **ห้าม gate ด้วย `@media(hover)` / pointer-type ใดๆ** — เครื่อง P'Aim (Surface touch) รายงาน `hover:none · pointer:coarse · any-hover:false · any-pointer:fine:false` แม้ต่อเมาส์ → อะไรที่ gate = `display:none` หายหมด (บทเรียนที่ทำพังมาแล้ว)
- โซนลากที่ขอบ = **โปร่งใส** (ไม่มี handle/เส้น/grip ให้เห็น) · cursor เปลี่ยน `ew-/ns-/nwse-resize` ตอนอยู่บนขอบ · `touch-action:none`
- ขนาดที่ตั้งเก็บใน state (เช่น `--dk-w`/`--dk-h`) · ไม่ชนกับ `pos` transform (grip drag-move)

### R2 — ขนาดปุ่มปรับอัตโนมัติตามขนาด dock (ไม่มีให้ผู้ใช้เลือก)
- ปุ่มทุกตัว **สเกลตามขนาดกล่อง** (dock ใหญ่→ปุ่มใหญ่ · เล็ก→เล็กลง) + **reflow** จัดเรียง/ตัดแถวใหม่ให้พอดี WxH · icon สเกลตามปุ่ม
- 🔴 **floor = 24×24px (WCAG 2.2 AA · SC 2.5.8 Target Size Minimum) — ห้ามเล็กกว่านี้เด็ดขาด**
- แนวทาง: หา button-size ใหญ่สุดที่ทำให้ N ปุ่ม (+gap/padding) พอดีใน WxH ปัจจุบัน · clamp `[24px, ~56px]` · layout เป็น grid `cols = floor(W/(s+gap))`

### R3 — min dock size + แจ้งเตือน
- ขนาดต่ำสุดของกล่อง = จุดที่ N ปุ่มปัจจุบันเล็กแตะ 24px พอดี (ยังจัดลงได้)
- ลากเล็กกว่านั้น → **หยุดที่ min (ไม่ยอมเล็กลง) + แสดงคำเตือน** — reuse `message`/`.dk-msg` (มี `role="status"` แล้ว) หรือกลไก status เดิม · ข้อความ: "แถบเล็กสุดแล้ว — ลดจำนวนปุ่มใน ⚙ ก่อน ถึงจะเล็กลงได้อีก" · aria-live

### R4 — จัดตำแหน่ง + ลดจำนวนปุ่ม ผ่าน ⚙ setting เดิม (ต่อยอด)
- **ลดจำนวน**: ⚙ เดิมมี ปัก/ถอน 📌 (`togglePin`) → ให้ถอนปุ่มออกจากแถบได้ (ลดจำนวน = ย่อ dock ได้อีก · เชื่อมกับ R3)
- **จัดตำแหน่ง**: ต่อยอด ▲▼ (`movePin` · ตอนนี้เฉพาะ pinned) → จัดลำดับได้ทุกปุ่มบนแถบ
- ⛔ ไม่มี control "ขนาดปุ่ม" (ขนาด = อัตโนมัติจาก R2)

### R5 — จำค่า (persist)
- localStorage (namespace `storeKey` เหมือน `pins` เดิม): ขนาด dock (W,H) + การจัดปุ่ม (pins/order)

## Definition of Done
- Desktop: ลากขอบ 3 ทิศได้จริง + ปุ่มสเกล/reflow/floor 24px + min-size+warn + ⚙ ถอน/จัดลำดับทุกปุ่ม + persist
- **Mobile ≤760px: diff = 0 จากรอบ 30** (พิสูจน์: เปิด ≤760px แล้วเหมือนเดิมทุกอย่าง)
- unit tests เขียว · build ✓ · เขียน test ครอบ R2 floor + R3 min/warn
- self-verify device-matrix (กว้างหลายค่า desktop + จำลอง pointer) + เขียน `docs/reports/<branch>.md`
- ⛔ **ไม่ relay P'Aim เอง · ไม่ merge · ไม่แตะ live** → รายงาน PM `pm28`
- **กระบวนการ gate (PM ไม่ทดสอบเอง):** dev เขียน **unit test** + self-smoke → **tester ตรวจ unit + integration + device-matrix** (รวม profile Surface `hover:none/pointer:coarse` ต้องลากได้จริง · mobile ≤760px diff=0) → **PM gate จากหลักฐาน tester** → PM ส่ง P'Aim ครั้งเดียว
