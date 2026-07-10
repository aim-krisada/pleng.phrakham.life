# Brief — undo (Ctrl+Z) ย้อนผิดตัว (ไม่ใช่การแก้ล่าสุด) · B075

**สั่งโดย:** pm4 · **ฐาน:** `studio-shell-redesign` · **branch:** `fix-beat-count-continued` (bundle ต่อจาก B073 · EditorMode เดียวกัน) หรือ branch ใหม่หลัง B073 merge
**⚠️ ชน B073 (EditorMode.vue) → ทำในสายเดียวกับ B073 (ต่อท้าย) หรือคิวหลัง B073 merge**
**หลักฐาน:** พี่เปา 10 ก.ค. — หน้าแก้ไข กด Ctrl+Z แล้ว "ย้อนไปแก้ตัวที่ไม่ใช่ล่าสุดที่แก้ไข"

## อาการ
undo (Ctrl+Z) มีอยู่แล้ว (`EditorMode.vue:1125` `undo()` + keydown 1139-1154) แต่ **ย้อนผิดขั้น** — ข้ามการแก้ล่าสุด ไปย้อนการแก้ก่อนหน้า

## สมมุติฐานต้นเหตุ (dev trace ยืนยัน)
- ประวัติใช้ **debounced snapshot watcher** (~647 · "debounced snapshot watcher, so no explicit history call") → การพิมพ์/แก้ล่าสุด **ยังไม่ถูก push เข้า `history`** ตอนกด Ctrl+Z เร็วๆ → `undo()` เลย `applyState(history[--histPos])` = ข้ามสถานะปัจจุบันที่ยังไม่ commit ไปย้อน snapshot ก่อนหน้า (ดู `pushHistory`/`histPos` ~1096-1136)
- ตรวจ: histPos off-by-one · debounce delay · การ push snapshot ก่อน undo

## เป้าหมายแก้
- กด Ctrl+Z **ครั้งแรก = ย้อนการแก้ล่าสุดจริง** (ไม่ข้าม) · กดต่อ = ย้อนถอยทีละขั้นถูกลำดับ · redo กลับได้ตรง
- แนวทาง: ก่อน `undo()` ให้ **flush snapshot ที่ค้าง debounce** (commit สถานะปัจจุบันเข้า history ก่อน) แล้วค่อยถอย · หรือปรับ watcher ให้ snapshot ทันเวลา · อย่าให้ redo tail เพี้ยน (บรรทัด 1097 splice)
- เพิ่ม unit test: แก้ A → แก้ B → Ctrl+Z ควรได้ A (ไม่ใช่ก่อน A)

## รั้ว
- **แตะแค่** `EditorMode.vue` (+ test) · ⛔ ไฟล์อื่นตามรั้ว B073

## DoD + รายงาน
- vitest ผ่าน (`--exclude '**/.claude/**' --exclude '**/node_modules/**'`) + build · dev `--host` + Network URL
- verify เบราว์เซอร์: แก้ 2-3 ครั้งติด → Ctrl+Z ย้อนล่าสุดก่อนทีละขั้น · redo กลับตรง · พี่เปา repro เดิมหาย
- รายงานกลับ: report + board §📥 inbox + ping **pm4** · ⛔ ห้าม merge/deploy
