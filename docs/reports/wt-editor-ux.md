# Report — wt-editor-ux (Editor UX v2 · เจ้าของ EditorMode.vue)

**Branch:** `wt-editor-ux` (ฐาน `studio-shell-redesign` @ `ef871ed`) · **พอร์ต:** `--host` 5390
**LAN (พี่เปา/P'Aim ทดสอบมือถือจริง):** `http://192.168.1.124:5390/#/studio` (PC ต้องเปิด server + WiFi เดียวกัน)
**ขอบเขต:** แตะ `EditorMode.vue` เท่านั้น (+ เทสต์ใน `EditorMode.beats.test.js` · เพิ่ม `EditorMode.verify.test.js`) — ไม่แตะ SongList / SongSheet / SongViewer / songSearch / NoteRow

## สรุป — 6 งาน เสร็จครบ · verify เบราว์เซอร์ + unit + build เขียว

| # | งาน | สถานะ | หลักฐาน |
|---|---|---|---|
| 1 | **B061** preview jianpu สด inline ต่อบรรทัด | ✅ | พิมพ์ "1 2 3 5" → `.ed-line-live` โผล่ทันที (ไม่กดปุ่ม) เห็น note-row จริง · toggle "ตัวอย่างสด" (ON default) ปิด/เปิดได้ |
| 2 | **B060** ตั้งค่าเพลง inline | ✅ | การ์ด "⚙ ตั้งค่าเพลง" ที่หัวหน้าแก้ · 8 ฟิลด์: เลข·ชื่อไทย·ชื่ออังกฤษ·คีย์·จังหวะ·BPM·ธีม·หมวด |
| 3 | delete-line บนแท็บเล็ต | ✅ | ถอด `desk-only` จากแถบด่วน → ที่ 700px ปุ่มลบบรรทัด `display:flex visible` (เดิมซ่อน) |
| 4 | **B063** ย้ายห้องข้ามบรรทัด | ✅ | ขวาสุด→ต้นบรรทัดถัดไป (2→1 / 1→2) · ซ้ายสุด→ท้ายบรรทัดก่อน · ห้องแรกสุด (0-0) ◀ disabled |
| 5 | **✓ ตรวจแล้ว** verified | ✅ | ปุ่มโชว์เมื่อ login · คลิก→`songs.verified` toggle (เขียว) · ยังไม่บันทึกเพลง=กันไว้ · unit 3/3 |
| 6 | rename "ห้องยก"→"ห้องต่อกัน" | ✅ | ชิป `↻ ห้องต่อกัน` + checkbox + สถานะจังหวะ · tooltip ใหม่ · DOM ไม่เหลือ "ห้องยก" (คงไว้เฉพาะ comment โค้ด) |

## รายละเอียด + จุดในโค้ด

- **B061** — เพิ่ม `lineContent(li)` (reuse `serializeLine` + เติมคำจาก lens verse แบบเดียวกับ `barContent`) + `lineHasNotes(li)` (ข้ามบรรทัดว่าง) · เรนเดอร์ `<SongSheet>` read-only เหนือ `.ed-strip` ทุกบรรทัด · reactive อัปเดตขณะพิมพ์ · toggle `livePreview` (ชิป "ตัวอย่างสด" ในหัว) เผื่อจอเล็กปิดได้
- **B060** — เพิ่ม `meta.category` / `meta.theme` · การ์ด `#pk-settings` (collapsible เปิด default) bind `meta`/`opts` เดิม · ธีม = 8 ค่าจริงจากคอลัมน์ `songs.theme` · หมวด = `anuchon` (ไทยอนุชน 120) allow-custom
- **delete-line** — ถอด `desk-only` จาก `<span class="ed-quick">` + ลบ CSS rule ที่ไม่ใช้แล้ว · header wrap เพิ่มแถวบนจอแคบ
- **B063** — `moveBar(li, bi, dir)` (เดิมรับ `line`) จัดการ hop ข้ามบรรทัด: ปลายขอบ→`unshift`/`push` บรรทัดข้าง · บรรทัดที่ว่างได้ห้องเปล่าใหม่ (คง invariant ≥1 ห้อง) · ปิดเมนู ⋯ (คีย์ li-bi เปลี่ยน) · ปุ่ม disabled = สุดขอบ**และ**สุดบรรทัดจริง
- **verified** — `markVerified()` → `supabase.from('songs').update({verified})` · state `verified` โหลดจาก `applyRow` (`data.verified`) · ต้องมี `editingId` (บันทึกเพลงก่อน)
- **rename** — เปลี่ยนสตริง UI ทุกจุด (`↻ ห้องต่อกัน`) · tooltip "จังหวะไม่เต็ม แต่นับรวมกับห้องที่ต่อกัน เช่น เริ่มกลางห้อง" · `pickup` field name เดิม (ไม่แตะโมเดล/JSON)

## Verify
- **เบราว์เซอร์ (preview MCP บน worktree · พอร์ต 5391):** ครบ 6 งาน (ตาราง) · **ไม่มี console error**
- **unit:** `vitest --exclude '**/.claude/**'` = **204 passed** (เดิม 201 + verify 3) · แก้ 2 assertion ใน `beats.test.js` ให้ตรง rename (ห้องยก→ห้องต่อกัน) · `notationLint.test.mjs` fail = ของเดิมบนฐาน (process.exit · 0 test fail)
- **build:** `npm run build` ✅ (115 modules)
- **sing/sheet ไม่พัง:** ไม่แตะ SongSheet/SongViewer/NoteRow · เทสต์ที่เกี่ยว (edhead B035/B050/B051 render จริง) เขียว

## ⚠️ ธง (ให้ PM/P'Aim ทราบ)
1. **ธีม/หมวด บันทึกเฉพาะตอน "เผยแพร่" (songs table).** ตาราง `song_drafts` ไม่มีคอลัมน์ category/theme → งานร่างไม่ round-trip ค่าธีม (ตั้งใจ กัน DB error) · ถ้าต้องการให้ editor draft เก็บธีมด้วย = เพิ่มคอลัมน์ song_drafts (งาน DB ภายหลัง)
2. **verified เขียนได้เฉพาะทีมที่ RLS อนุญาต update songs.** ปัจจุบัน policy = **approver เท่านั้น** (ผู้ใช้ทีมตอนนี้ backfill เป็น approver หมด → ใช้ได้) · ถ้าจะให้ editor (non-approver) กดตรวจแล้วด้วย = เพิ่ม RPC/policy ทีหลัง
3. **B061 live preview เคยถูกถอดใน US-D05** (เหตุ: ดันกล่องแก้หลุดจอ) · รอบนี้ P'Aim สั่งกลับมา (เหมือน v1) → ทำเป็นแถบ compact + toggle ปิดได้ · ขอ P'Aim/พี่เปาลองบนแท็บเล็ตจริงว่าความสูงโอเคไหม

## ต่อไป
- ไม่ merge/deploy — รอ PM + P'Aim accept ผ่าน LAN
