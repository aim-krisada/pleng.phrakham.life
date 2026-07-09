# brief — Editor UX v2 (B060 ตั้งค่า inline + B061 preview jianpu สด) · ให้พี่เปาแก้เพลงคล่อง

**สาย:** dev · worktree ใหม่จากฐาน `studio-shell-redesign` · 1 worktree = 1 branch = 1 port
**ที่มา:** พี่เปา (ผ่าน P'Aim) 9 ก.ค. ค่ำ · แตะ `EditorMode.vue` เป็นหลัก
**⚠️ กันชน:** **จ่ายหลังสาย catalog (wt-catalog) merge เท่านั้น** (ทั้งคู่แตะ EditorMode.vue · อย่าขนาน — บทเรียน c) · ไม่ชน B059 (SongSheet) / songSearch

## B061 — preview jianpu สด (real-time inline) [หัวใจ]
**ปัญหา:** ปุ่ม "ดูผลทั้งเพลง" ต้องกดถึงเห็น = ไม่ตอบโจทย์พี่เปา
**ต้องการ (P'Aim เคาะ):**
- **เห็นทั้งเพลง render สดตลอด** ขณะพิมพ์ (ไม่ต้องกดปุ่ม)
- **ภาพ jianpu ที่ render แล้ว โผล่บนแต่ละบรรทัดที่พิมพ์ (inline)** — เหนือ/คู่กับช่องพิมพ์ดิบของบรรทัดนั้น · อัปเดตทันทีที่พิมพ์
- = เหมือน preview ของ v1 (เห็นสัญลักษณ์จริง จุด/ขีด/ออกเทฟ ขณะพิมพ์)
**จุดในโค้ด:** EditorMode มี `previewContent` reactive อยู่แล้ว (ปุ่มใช้ render ผ่าน SongSheet/NoteRow) → ทำให้ render **สด inline ต่อบรรทัด** แทนซ่อนหลังปุ่ม · reuse NoteRow/SongSheet render (read-only · ห้ามแก้ NoteRow ให้กระทบ sing/sheet) · perf: อัปเดต reactive ต่อบรรทัด (debounce ถ้าจำเป็น)

## B060 — ตั้งค่าเพลง inline
**ปัญหา:** ตั้งค่าเพลงอยู่ในแผง "เพลง ▾" → พี่เปา**ไม่กล้ากด** (กลัวเปลี่ยนหน้า/โหมด เหมือนปุ่ม ฝึกร้อง/แผ่นเพลง/แก้ไข)
**ต้องการ:** ยก field ตั้งค่าออกมา **inline ในหน้าแก้ไข** (ในแผ่นที่กำลังแก้) แต่ละ field ชนิดเหมาะ:
| field | ชนิด |
|---|---|
| ชื่อเพลง (ไทย/อังกฤษ) | ช่องพิมพ์ |
| คีย์ · จังหวะ (time sig) | dropdown |
| ความเร็ว (BPM) · เลขเพลง | ช่องตัวเลข |
| ธีม/หมวด | dropdown (8 ธีม · map `docs/pm/book-codes.md`) |
**จุดในโค้ด:** `meta` (number/title_th/title_en) + `opts` (key/timeSignature/bpm) ใน EditorMode (~บรรทัด 139-140) bind อยู่แล้ว → แค่วาง UI fields ในหน้า (ไม่ต้องเข้าเมนู "เพลง") · ธีม/หมวด = field ใหม่ (จาก DB category/theme)

## ขอบเขต (กันชน)
- แตะ `EditorMode.vue` (+ อาจ store/supabase สำหรับ save meta) · ⛔ ห้ามแตะ SongSheet/SongViewer (B059) · SongList (catalog) · songSearch (B058) · NoteRow ระวัง (read-only reuse · ห้ามเปลี่ยนพฤติกรรม sing/sheet)
- **หน้าฝึกร้อง/แผ่นเพลง ต้องไม่กระทบ**

## Verify
- เบราว์เซอร์ (`--host` + Network URL): พิมพ์โน้ต → เห็น jianpu สดต่อบรรทัด (ไม่ต้องกดปุ่ม) · แก้ตั้งค่า (คีย์ dropdown ฯลฯ) inline ได้ ไม่ต้องแตะเมนู "เพลง" · save แล้วค่าคงอยู่ · unit + build เขียว · sing/sheet ไม่พัง

## รายงานกลับ (session-agnostic)
`docs/reports/wt-editor-ux.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy · เช็ก branch ก่อน commit
