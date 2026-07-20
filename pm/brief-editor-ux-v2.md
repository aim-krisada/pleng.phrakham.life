# brief — Editor UX v2 (เจ้าของ EditorMode.vue ทั้งหมด) · ให้พี่เปาแก้เพลงคล่อง

**สาย:** dev · worktree ใหม่จากฐาน `studio-shell-redesign` · 1 worktree = 1 branch = 1 port
**ที่มา:** พี่เปา (ผ่าน P'Aim) 9 ก.ค. ค่ำ · **สายนี้ = เจ้าของ `EditorMode.vue` คนเดียว**
**⚠️ กันชน (P'Aim เร่ง 9 ก.ค. — แยกตามไฟล์ ให้ขนานได้):** **สายนี้เป็นเจ้าของ `EditorMode.vue` ทั้งหมด** · **สาย catalog = `SongList.vue` เท่านั้น** (ย้ายปุ่ม "ตรวจแล้ว" มาสายนี้) → ขนานกันได้ ไม่ชน · ไม่แตะ SongSheet/SongViewer (B059) · songSearch (B058) · NoteRow (read-only)

## รวมงานในสายนี้ (6)
1. **B061** preview jianpu สด inline · 2. **B060** ตั้งค่าเพลง inline · 3. **delete-line-mobile** (ปุ่มลบบรรทัดโผล่แท็บเล็ต) · 4. **B063** ย้ายห้องข้ามบรรทัด · 5. **ปุ่ม "✓ ตรวจแล้ว"** (verified=true · RLS team write · ย้ายจาก catalog มาที่นี่) · 6. **rename "ห้องยก"** เป็นคำที่ง่ายกว่า (default **"ห้องต่อกัน"** · tooltip "จังหวะไม่เต็ม แต่นับรวมกับห้องที่ต่อกัน เช่น เริ่มกลางห้อง" · ปรับตาม P'Aim) — ทุกที่ที่ขึ้น "ห้องยก" (chip `↻` + checkbox)

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

## + B(delete-line-mobile) — ปุ่มลบทั้งบรรทัดโผล่บนแท็บเล็ต
**ที่มา:** พี่เปา 9 ก.ค. ("เพิ่มปุ่มลบทั้งบรรทัด") · **ของมีอยู่แล้ว** = ปุ่ม 🗑 (`qDeleteLine` · title "ลบบรรทัดที่กำลังแก้" · EditorMode.vue ~1573) **แต่อยู่ใน `<span class="ed-quick desk-only">` = ซ่อนบนแท็บเล็ต/มือถือ** → พี่เปา (tablet) ไม่เห็น
**แก้:** เอาปุ่มด่วน (ท่อนฮุก/เล่นซ้ำ/คัดลอก/ลบบรรทัด) ให้เข้าถึงได้บนแท็บเล็ต/มือถือ (ไม่ desk-only) · อย่างน้อยปุ่มลบบรรทัด

## + B063 — ย้ายห้องข้ามบรรทัด
**ที่มา:** P'Aim 9 ก.ค. (img `backlog-assets/B063-move-bar-cross-line.jpg`) · เมนู ⋯ มี ◀ซ้าย/ขวา▶ (`moveBar` ~625) ย้ายห้อง**ในบรรทัดเดียว** — สุดขอบบรรทัดแล้ว `return` (ย้ายข้ามไม่ได้)
**แก้:** ให้ moveBar **ข้ามบรรทัด** — ห้องท้ายบรรทัดย้ายขวา → ไปต้นบรรทัดถัดไป · ห้องแรกย้ายซ้าย → ไปท้ายบรรทัดก่อน (ต้องเข้าถึง lines รอบข้าง · ระวัง arrangement/beat ต่อบรรทัด)

## ขอบเขต (กันชน)
- แตะ `EditorMode.vue` (+ อาจ store/supabase สำหรับ save meta) · ⛔ ห้ามแตะ SongSheet/SongViewer (B059) · SongList (catalog) · songSearch (B058) · NoteRow ระวัง (read-only reuse · ห้ามเปลี่ยนพฤติกรรม sing/sheet)
- **รวม 4 งาน editor UX ในสายเดียว:** B061 preview สด · B060 ตั้งค่า inline · delete-line-mobile · B063 ย้ายห้องข้ามบรรทัด
- **หน้าฝึกร้อง/แผ่นเพลง ต้องไม่กระทบ**

## Verify
- เบราว์เซอร์ (`--host` + Network URL): พิมพ์โน้ต → เห็น jianpu สดต่อบรรทัด (ไม่ต้องกดปุ่ม) · แก้ตั้งค่า (คีย์ dropdown ฯลฯ) inline ได้ ไม่ต้องแตะเมนู "เพลง" · save แล้วค่าคงอยู่ · unit + build เขียว · sing/sheet ไม่พัง

## รายงานกลับ (session-agnostic)
`docs/reports/wt-editor-ux.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy · เช็ก branch ก่อน commit
