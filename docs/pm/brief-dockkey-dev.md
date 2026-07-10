# Brief — DockKey core engine + หน้าฝึกร้อง (dev)

**สั่งโดย:** pm4 · **ฐาน:** `studio-shell-redesign` (HEAD `83c0b4f`) · **branch ใหม่:** `git switch -c dockkey-dev studio-shell-redesign`
**เป้าหมาย (P'Aim 10 ก.ค.):** dock = **ของกลางเจ้าของเดียว = DockKey core** · library กลาง 1 ตัว ทุกหน้าส่งแค่ "รายการปุ่ม (descriptor)" · เริ่มหน้าฝึกร้องเป็น reference ตัวแรก

## อ่านก่อน (SSOT design — อยู่ในฐานแล้ว)
1. `docs/ds/dockkey-library.md` — DS หลัก (descriptor schema + กติกา engine + รายการปุ่มหน้าฝึกร้อง + layout 2 แถว)
2. `docs/design/dockkey-sing-prototype.html` — prototype กดได้จริง แยก **core** (`itemHtml`/`buildRows`/`render`/drag/`transitionInPlace`/gear-panel) จาก **data** (`ITEMS_SING`) — เอาโครงนี้มาแปลงเป็น Vue
3. `docs/ds/dock-consistency.md` + `docs/ds/dock-consistency-pseudocode.md` — pseudocode engine
4. `docs/design/ข้อกำหนด dockey.docx` (ถ้าเปิดได้) = ข้อกำหนดต้นทางจาก P'Aim

## ขอบเขตรอบนี้ = core engine + หน้าฝึกร้องเท่านั้น
ต่อยอด `StudioDock.vue` เดิมให้เป็น **core engine** ตาม DS:
- ระบบพิกัด **row (ล่าง→บน) / col (ซ้าย→ขวา)** + **cap เติมเต็มความกว้าง** ที่ปุ่ม 44px (จอ 320=6 / 392≈7 / desktop≈14 — ไม่ล็อกตายที่ 6)
- แถวล่าง (row1) กระจายเต็มกว้าง: grip ซ้ายสุด · ⚙ ขวาสุด (space-between) · ปุ่มที่ปักไม่แทรก row1
- collapse-in-place (แตะ grip = ย่อเป็น FAB ที่ตำแหน่งเดิม · ลากค้าง = ย้าย dock) · เปิดได้ทีละ 1 popover · Esc/แตะนอก = ปิด
- หน้า Setting (⚙): ทุก item `default:inSetting` หรือ `pinnable` → ไอคอน·ชื่อ·ตัวปรับ·▲▼·📌
- **popover/แผงทุกตัว CLAMP ไม่ล้นขอบ (+8px)** · แผงลิสต์ (เลือกท่อน) สูงตามเนื้อหา scroll เฉพาะเกินจอ (max-height ~52vh ห้ามล็อกเตี้ย)
- Descriptor schema ตาม DS §2 (id/name/icon/kind/place{anchor,row,col,span}/default/pinnable/permanent/showWhen/control)
- **หน้าฝึกร้อง** = ป้อน `ITEMS_SING` เข้า core (แทนที่โครง `SingTransport.vue` เดิม) · layout default 2 แถว:
  - Row2: `[ไทม์ไลน์ col1-3][คีย์ col4][เลือกท่อน col5-6]`
  - Row1: `[Grip][Back][Play][Fwd][Aa][⚙]`
  - Setting: repeat · คอร์ด · ความเร็ว · แสดงผล · โปร่งใส
  - ไทม์ไลน์: แตะจุด=วิ่งไปทันที · เส้นท่อน (เลือก=น้ำตาลทึบ/ไม่เลือก=เทา/หัวอยู่=หนา) · snap ขอบท่อนเงียบๆ · แสดงเวลารวมอย่างเดียว · หัวสไลเดอร์วงกลมเดียว
  - เลือกท่อน default = ติ๊กทุกท่อน (เล่นทั้งเพลง 1 รอบ) · เชื่อมไทม์ไลน์
  - Aa = permanent (บนแถบแสดง "Aa" · % + ↺100% อยู่ใน popover — กันปุ่มกว้างดันหลุดขอบ)

## รั้ว (สำคัญ — กันชนสายอื่นที่รันขนาน)
- **แตะได้:** `src/components/StudioDock.vue` (→ core engine) · `src/components/SingTransport.vue` (→ ITEMS_SING) · sing mount ใน `src/components/SongViewer.vue` เท่าที่จำเป็นต่อการต่อ dock
- **⛔ ห้ามแตะ:** `ShellBar.vue` · `styles.css` · `App.vue` · footer (สาย bug ถืออยู่) · `NoteRow.vue` (ACC) · `EditorMode.vue`/`Studio.vue` dock ของหน้าแก้ไข/พิมพ์ (= phase 2 รอ SA เขียน ITEMS_PRINT/EDIT ก่อน)
- print/edit dock = **รอบถัดไป** ใช้ core นี้ + descriptor ที่ SA กำลังเขียน — รอบนี้แค่ทำ core ให้ generic พอที่หน้าอื่นเสียบได้

## DoD + รายงาน
- unit เทสต์ผ่าน (`npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` · ฐานปัจจุบัน 264 · notationLint fail=ของเดิม ไม่เกี่ยว) + `npm run build` ผ่าน
- เปิด dev server **`--host`** → ใส่ **Network URL `http://<IP>:<port>`** ในรายงาน (พี่เอม/พี่เปาเทสต์มือถือจริง)
- verify เบราว์เซอร์: dock ฝึกร้อง 2 แถว · cap เติมเต็ม · collapse-in-place jump=0 · popover clamp ไม่ล้น · ไทม์ไลน์แตะวิ่ง · เลือกท่อนเชื่อมไทม์ไลน์ · console 0 error
- **รายงานกลับ (session-agnostic):** (1) เขียน `docs/reports/dockkey-dev.md` (2) เพิ่มบรรทัดใน `docs/pm/board.md` §📥 PM inbox (3) ping **PM session ปัจจุบัน = `pm4`** (ดู board §🎯)
- **⛔ ห้าม merge/deploy เอง** — PM ตรวจ DoD แล้ว merge
