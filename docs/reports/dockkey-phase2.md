# รายงาน — DockKey phase 2: แผ่นเพลง + แก้ไข + MP3 (dev)

**สาย:** `dockkey-dev` (ต่อจาก phase 1) · **commit:** `5c71c16` (code) · **ฐาน:** sync `studio-shell-redesign` ล่าสุดแล้ว (merge `bd39df3`)
**ใบสั่ง:** `docs/pm/brief-dockkey-phase2.md` (pm4) · **spec:** `docs/ds/dockkey-print-edit.md`

## ทำอะไรไป (F60+)
ทำให้ **3 หน้าใช้ DockKey engine ตัวเดียวกัน** ต่างแค่ "รายการปุ่ม" (descriptor) — ฝึกร้อง (phase 1) + **แผ่นเพลง (ITEMS_PRINT)** + **แก้ไข (ITEMS_EDIT)** · เสียบ **MP3 เข้าเมนู export กลาง (PDF/JSON/MP3)** ของ dock · **ปลด StudioDock เดิม** (ไม่มีใคร mount แล้ว)

## step 0 — sync ฐาน
merge `studio-shell-redesign` (ขยับ 33 commit: audioExport MP3 lib · B073 beat · B075 undo · preview-final · note-search ฯลฯ) → conflict เฉพาะ `board.md` (เอาของ pm4) · SongViewer/SingTransport merge สะอาด · **vitest 291 เขียวก่อนเริ่มของใหม่**

## ไฟล์
- **`DockKey.vue`** — ต่อ schema (DS §4):
  - **E1 `kind:'keys'`** — band แป้นโน้ตเต็มกว้าง (หลายแถว) เหนือทุกแถว · ยกเว้น cap/overflow · ซ่อนตอนย่อ · แต่ละคีย์ `@mousedown` → `onInsert(sym)`
  - **E2 `prime`** (ปุ่มหลักสีแบรนด์) + ปุ่มมี `label` (ขยายเป็น pill icon+ข้อความ) + `disabled` + `danger`
  - `message` prop = แถบสถานะลอยเหนือ dock (แทน `sd-msg` เดิมของ StudioDock — ใช้โชว์ผลบันทึกหน้าแก้ไข)
  - cellFlex: เฉพาะ timeline/sel ยืดเต็มแถว · Aa/export = กว้างธรรมชาติ (dock ยัง hug ปุ่ม)
- **`ExportTool.vue` (ใหม่)** — ปุ่ม "ดาวน์โหลด" + เมนู **PDF / JSON / MP3** (+ estimate/progress/ETA) · MP3 เรียก `audioExport.songToMp3Blob` (import แบบ lazy · code-split) · mount ใน slot `#cell-export` ของ dock พิมพ์+แก้ไข (ใช้ open/toggle/close ของ engine = เปิดทีละ 1 + clamp)
- **`Studio.vue`** — แผ่นเพลง mount DockKey ป้อน **ITEMS_PRINT**: row1 `[grip · พิมพ์(prime) · export · Aa · ⚙]` · ⚙ = แสดงผล/แบบแผ่น/คอร์ด/คีย์/ดาวน์โหลด (ปักได้) · SongSheet เลิกล็อกตาย → รับ `mode/chord-system/show-*/display-key/songbook` จาก state (default = เท่าเดิม: ครบ·สมุดเพลง·ตัวอักษร·คีย์เดิม) · **ถอด `<StudioDock>` + editDock/activeDock ออกหมด**
- **`EditorMode.vue`** — mount DockKey ของตัวเอง ป้อน **ITEMS_EDIT**: band แป้นโน้ต 2 แถว (21 สัญลักษณ์) · row1 `[grip · ย้อน · ทำซ้ำ · ฟังท่อน↔หยุด · ⚙]` · row2 `[บันทึก(prime) · ฟังทั้งเพลง · export]` · ⚙ = บันทึกร่าง/ดูผลทั้งเพลง (ปักได้) · เลิก `emit('dock')` · **ปุ่มโครงสร้างต่อห้อง/บรรทัด คงไว้ inline ในตาราง** (contextual · ไม่ขึ้น dock ตาม DS §2)

## รั้ว — ยืนยัน
แตะเฉพาะ DockKey/SingTransport/SongViewer/Studio/EditorMode + ใหม่ ExportTool · **ไม่แตะ** styles.css · ShellBar · App · songSearch · NoteRow · StudioDock (แค่เลิกใช้ · ไฟล์+เทสต์ยังอยู่ = retired ไม่ลบ กันกระทบ base test)

## DoD
- ✅ **vitest 295 passed** (ฐาน merge 291 + DockKey E1/E2 +4 · notationLint fail=ของเดิม) · `npm run build` ผ่าน (audioExport code-split 171kB แยก chunk)
- ✅ dev `--host` **Network URL `http://10.215.141.98:5315`** (พี่เอม/พี่เปาเทสต์มือถือจริง · ยังรัน)
- ✅ **verify เบราว์เซอร์ 3 หน้า** (DOM/interaction · viewport headless 0×0 วัดพิกัดไม่ได้ตามเดิม):
  - **1 dock โผล่ทีละหน้า** (docksVisible=1 ทั้ง sheet+edit · อีก 2 โดน v-show ซ่อน) ✓
  - แผ่นเพลง: row1 `[grip · พิมพ์(prime✓) · export✓ · Aa · ⚙]` ✓
  - แก้ไข: **band แป้นโน้ต 21 สัญลักษณ์** `[1 2 3 4 5 6 7 0 - ~ …]` ✓ · row1 `[grip · undo · redo · play · ⚙]` · row2 `[playAll · export]` (บันทึก/ร่าง ซ่อนเพราะ guest = ถูกต้อง · โผล่เมื่อล็อกอิน) ✓
  - **note-insert ไม่ regress:** โฟกัสช่องโน้ต `.5.` → แตะคีย์ `6` → `.5.6` ✓
  - **เมนู export = PDF / JSON / MP3** (เปิดได้จริง) ✓
  - console **0 error** ✓
  - dock hug ปุ่ม (fit-content): rule เดียวกับ phase 1 (วัดสด 383px แล้ว) · แก้ไข dock กว้างตาม band แป้นโน้ต (แถวกว้างสุด) · **ฝากยืนยันบนมือถือจริง**
- ⚠️ **ยังไม่ได้ทดสอบเชิงลึก (ฝาก P'Aim gate LAN):** MP3 encode จริงจนได้ไฟล์ (ช้า ~วินาที) · undo/redo/beat-check พฤติกรรม (โค้ดเดิมไม่แตะ) · ปุ่มบันทึกตอนล็อกอิน

## จุดที่ตัดสินใจ/ค้าง (ตอบ DS §6 + ใบสั่ง)
1. **Aa หน้าแก้ไข (DS Q2):** **ถอดออก** — หน้าแก้ไขเป็นฟอร์ม row1 เหลือ `[grip·ย้อน·ทำซ้ำ·ฟัง·⚙]` (เลือกตามตัวเลือกที่ DS เปิดไว้) · หน้าฝึกร้อง+แผ่นเพลงมี Aa
2. **"ดูผลทั้งเพลง" (DS Q3):** เพิ่ม toggle ใน ⚙ หน้าแก้ไข (wired กับ `sheetWinOpen` เดิม) · **คงปุ่มเดิมที่หัวไว้ด้วย** = ไม่ regress · ถ้าพี่เอมอยากให้เหลือที่เดียวบอกได้
3. **แบบแผ่น/แสดงผล/คีย์ หน้าพิมพ์ (DS Q1/Q4):** ใส่ครบใน ⚙ (default = พฤติกรรมเดิม) · ผู้ใช้ปรับได้ · export menu มี PDF ซ้ำกับปุ่มพิมพ์ prime (พิมพ์=ด่วน · export=เมนูรวม) — ตั้งใจ
4. **StudioDock.vue** = retired (ไม่ mount) แต่ไม่ลบไฟล์/เทสต์ กันกระทบ base 275 · ลบจริงเป็น cleanup รอบหลังได้

## ⛔ ห้าม merge/deploy เอง — รอ PM ตรวจ DoD + P'Aim gate LAN 3 หน้า (โดยเฉพาะหน้าแก้ไข)
