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

### R2 — ขนาดปุ่มปรับอัตโนมัติตามขนาด dock (ไม่มีให้ผู้ใช้เลือก) · 🔴 REVISED 18 ก.ค. (P'Aim ลองจริง: 24px เล็กเกินใช้ไม่ได้)
- ปุ่มสเกลตามขนาดกล่อง **แต่ต้องกดได้สบาย+เห็นชัดทุกขนาด — ห้ามจิ๋ว**
- 🔴 **floor = ~44px (comfortable/tappable · เกิน WCAG 24 อยู่แล้ว) ไม่ใช่ 24px** · clamp `[44px, 56px]`
- **ย่อแคบจนปุ่มไม่พอดีที่ 44px → ปุ่ม WRAP ขึ้นแถวใหม่ (ไม่หดต่ำกว่า 44)** · แคบกว่านั้นอีกจน wrap ไม่พอ → R3 min+warn (ลดปุ่ม)
- **เกณฑ์ตัดสิน = functional: ทุกขนาดที่ลากได้ ปุ่มยังกดสบาย เห็นชัด** (ไม่ใช่แค่ ≥24px ผ่านเทสต์)

### R3 — min dock size + แจ้งเตือน
- ขนาดต่ำสุดของกล่อง = จุดที่ N ปุ่มปัจจุบันยัง wrap ลงได้ที่ floor **~44px (กดสบาย · ไม่ใช่ 24)** พอดี
- ลากเล็กกว่านั้น → **หยุดที่ min (ไม่ยอมเล็กลง) + แสดงคำเตือน** — reuse `message`/`.dk-msg` (มี `role="status"` แล้ว) หรือกลไก status เดิม · ข้อความ: "แถบเล็กสุดแล้ว — ลดจำนวนปุ่มใน ⚙ ก่อน ถึงจะเล็กลงได้อีก" · aria-live

### R4 — จัดตำแหน่ง + ลดจำนวนปุ่ม ผ่าน ⚙ setting เดิม (ต่อยอด) · 🔴 REVISED 18 ก.ค. (P'Aim: ใช้พินแดงเดิม ห้ามทำเกิน)
- 🔴 **ใช้ 📌 pin แดงเดิม (`.dk-pin` + `togglePin`) ตามเดิมเป๊ะ · ห้ามเปลี่ยนหน้าตา/เพิ่มปุ่มใหม่** — dev รอบก่อนเพิ่ม ✕/＋/toggle ใหม่ = **ทำเกิน P'Aim ปฏิเสธ**
- **ลดจำนวน (on/off bar) = พินแดงตัวเดียว:** 📌 แดง on = อยู่บนแถบ · กดอีกที off = ลงจากแถบ (ทุกปุ่ม · grip/gear/slot/keys ยังกันถอน) · ถอน = ย่อ dock ได้อีก (เชื่อม R3)
- **จัดตำแหน่ง**: ต่อยอด ▲▼ (`.dk-mv`/`movePin` เดิม) → จัดลำดับทุกปุ่มบนแถบ
- ⛔ ไม่มี ✕ / ＋ / control "ขนาดปุ่ม" ใหม่ (ขนาด = อัตโนมัติจาก R2 · on/off = พินเดิม)

### R5 — จำค่า (persist)
- localStorage (namespace `storeKey` เหมือน `pins` เดิม): ขนาด dock (W,H) + การจัดปุ่ม (pins/order)

## 🔴 กลับมาแก้ รอบ 2 (18 ก.ค. · P'Aim ลองจริงบน Surface — usability ไม่ผ่าน · gate เดิมจับไม่เจอเพราะเทสแค่กลไก)
**3 gap ต้องแก้:**
1. 🔴 **ปุ่มจิ๋วใช้ไม่ได้:** floor 24px → **~44px (กดสบาย) · ย่อแคบ = WRAP ไม่ใช่หด** (ดู R2 revised)
2. 🔴 **ลากมุมขวา-ล่างไม่ได้จริง:** tester synthetic "ผ่าน" แต่ P'Aim ลากจริงไม่ได้ → **แก้ให้ลากมุมได้จริง + verify ด้วยการลากจริง (ไม่ใช่ synthetic อย่างเดียว)**
3. 🟡 **ปุ่มควบคุม (⚙/เล่น/นำทาง) ต้องอยู่ครบ+เข้าถึงได้ทุกขนาด** (ในรูป P'Aim เหมือนหาย — ยืนยัน+แก้)

## ✅ FUNCTIONAL ACCEPTANCE (tester gate ที่ "ทำได้จริง" ไม่ใช่กลไก · PM sanity ก่อน gate)
หลังลากขนาดใดๆ ผู้ใช้ต้อง **ทำสิ่งเหล่านี้ได้จริง**:
- [ ] ลากขอบ **ขวา / ล่าง / มุมขวา-ล่าง** ได้จริง (ลากจริง ทุกทิศ)
- [ ] **ปุ่มทุกปุ่มกดได้สบาย + เห็นชัด** (ไม่จิ๋ว) ที่ทุกขนาด
- [ ] **⚙ ตั้งค่า · ปุ่มเล่น · ปุ่มนำทาง เข้าถึงได้ครบ** ที่ทุกขนาด
- [ ] แป้นตัวเลข/สัญลักษณ์ กดใส่โน้ตได้จริง
- [ ] ⚙ ถอน/เรียงปุ่ม ได้จริง · ถอนแล้วย่อได้อีก
- [ ] ย่อสุด → หยุด + เตือน (อ่านออก)
- [ ] reload → ขนาด+การจัดยังอยู่
- [ ] **mobile ≤760px = เหมือนรอบ 30 เป๊ะ**

## Definition of Done
- Desktop: ลากขอบ 3 ทิศ**ได้จริง (ลากจริง)** + ปุ่มสเกล/reflow/**floor ~44px กดสบาย (wrap ไม่หด)** + min-size+warn + ⚙ ถอน/จัดลำดับทุกปุ่ม + persist + **ผ่าน §FUNCTIONAL ACCEPTANCE ทุกข้อ**
- **Mobile ≤760px: diff = 0 จากรอบ 30** (พิสูจน์: เปิด ≤760px แล้วเหมือนเดิมทุกอย่าง)
- unit tests เขียว · build ✓ · เขียน test ครอบ R2 floor + R3 min/warn
- self-verify device-matrix (กว้างหลายค่า desktop + จำลอง pointer) + เขียน `docs/reports/<branch>.md`
- ⛔ **ไม่ relay P'Aim เอง · ไม่ merge · ไม่แตะ live** → รายงาน PM `pm28`
- **กระบวนการ gate (PM ไม่ทดสอบเอง):** dev เขียน **unit test** + self-smoke → **tester ตรวจ unit + integration + device-matrix** (รวม profile Surface `hover:none/pointer:coarse` ต้องลากได้จริง · mobile ≤760px diff=0) → **PM gate จากหลักฐาน tester** → PM ส่ง P'Aim ครั้งเดียว
