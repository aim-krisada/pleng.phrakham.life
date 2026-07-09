# DA import — ไม้ต่อ (handoff) สำหรับ DA session ใหม่

**อ่านคู่กัน:** `docs/reports/da-import.md` (รายงานเต็ม ทุก step) · `docs/pm/import-arrangement-spec.md` (ground truth การจัดข้อ) · memory `pleng-da-import-parser`

## 1. เสร็จแล้ว (ขึ้นฐานจริงแล้ว ✅)
120 เพลงชุดอนุชน import เข้า Supabase สำเร็จ (verify แล้ว 120 เพลง เลข 1-120 · verified=false ทุกเพลง):
- **field-split:** `title_th` สะอาด (ตัดวงเล็บ) + `theme` (8 ธีม) + `book_refs jsonb` + `scripture` + `category='anuchon'` + key `(category, number)`
- **review_flags jsonb** (41 เพลง): `repeat`(16) · `lint`(6) · `words`(28) — แอปโชว์ ⚠️ + filter
- **99/100** = repeat+volta hand-build (spell-out) · **6 SIMPLE repeat** = auto-expand
- **4 SQL ที่ P'Aim run** (ตามลำดับ): `tools/backup-songs.sql` → `tools/import-all-120.sql` → `tools/set-review-flags.sql` → `tools/repeat-6-simple.sql`
  ⚠️ **repeat-6-simple.sql อาจยังไม่ได้ run** — เช็กกับ P'Aim (query `review_flags` เพลง 2/36/66/69/74/117)
- **cleanup ค้าง:** มีแถวเก่า 1 แถว number=NULL "เอ๊า แห่งใดๆ" (id `7333b9c1-a0e0-40f6-be65-99868acdcbeb`) กลายเป็น anuchon → P'Aim ลบ

## 2. กำลังทำ (ค้าง · งานหลักของ session ใหม่) — dedup ทาง A
**ปัญหา (SongSheet dev เจอ · เพลง 77):** ท่อนที่ทำนองซ้ำหลายรอบถูกอัดเป็น stanza ก้อนเดียวที่มีโน้ตซ้ำ → หน้าแผ่นเพลงโชว์โน้ตซ้ำ
**ทาง A (P'Aim เคาะ):** ท่อนซ้ำ = **1 stanza (ทำนอง) + arrangement หลาย row** (แต่ละ row = เนื้อ 1 ชุด) → B059 dedup โชว์โน้ตครั้งเดียว

⚠️ **ยังไม่แตะ data — รอ PM เคลียร์ก่อน** (ถามไปแล้ว): เพลง 77 = **3 บรรทัดทำนองเหมือนกัน · เนื้อต่อเนื่องไล่ลง (para 16/19/22)** = **เคส "AABA ต่อเนื่อง" ที่ dev เตือนว่าอย่ารวม** ไม่ใช่ "stacked lyric rows" (แบบ 99/100) · 2 ทางแก้:
- (A) import-side: รวมบรรทัด **ทำนอง identical ติดกัน** → 1 line + arrangement rows (B0 ต่างจาก B1/B2 แค่ pickup `0` ต้อง normalize)
- (B) SongSheet-side: B059 print dedup บรรทัด identical (ไม่แตะ data)
→ **รอ PM ตอบว่าใครทำ (data หรือ SongSheet) + ยืนยันกฎ "identical melody เท่านั้น"** ก่อนลงมือ · **ประสาน SongSheet dev (เขาทำ B062 เส้นโค้ง · อย่าชน)**

**สัญญาณแยกเคส:** reuse (รวมได้) = **เนื้อ 2+ แถว stacked ใต้ทำนองเดียว** (99/100 line1) · ต่อเนื่องไล่ลง (อย่ารวม) = แต่ละบรรทัด 1 เนื้อ อ่านบนลงล่าง (เว้นแต่ทำนอง identical เป๊ะ → อาจรวมได้ ถ้า PM เคาะ)

**งานชัดที่ทำได้เลยถ้า PM ไฟเขียว:** เคส stacked จริง (99/100 + 6 SIMPLE) ที่ตอนนี้ spell-out โน้ตซ้ำ → เปลี่ยนเป็น 1 stanza + หลาย row

## 3. 10 COMPLEX repeat (ยังไม่ทำ)
20,25,40,53,61,72,73,80,85,88 = repeat ซ้อน/หลายอันในท่อน · คง flag `repeat` · geometry เต็ม (อ่าน `‖::‖`/volta จากภาพ) = งานต่อยอด ถ้า P'Aim อยากได้

## 4. Key files + วิธี run
- **parser:** `tools/parse_song.py` (build_song = ตัวหลัก · verse/refrain block model + dedup + field-split) · `docx_structure()` = แยก stave/extra · `notation` helpers
- **repeat:** `tools/build_repeat_songs.py` (99/100 + 6 SIMPLE + REPEAT_16 · SIMPLE set) · **ทาง A จะแก้ตรงนี้ + parse_song**
- **batch:** `tools/batch_all.py` (gen 120 → `tools/import-all-120.sql` + risk.json · substitute 99/100 · inject repeat flag) · lint = `git show studio-shell-redesign:src/lib/notationLint.js` (อยู่บน base ไม่ใช่ branch นี้) รันผ่าน node
- **verify:** node import `src/lib/songModel.js resolveContent` + `notation.js beatCount/syllableSlots` (ตัวจริงแอป)
- **render ภาพเช็กตา:** `pdfplumber.open(f).pages[0].to_image(resolution=150).save(png)` แล้ว Read png (Read tool PDF-render ใช้ไม่ได้ · pdftoppm ไม่มี)
- **source:** OneDrive `4 Personal/pleng.phrakham.life/song-data/OneDrive_2_7-9-2026/` (PDF+DOCX ต่อเพลง) · output 120 JSON + risk.json ที่ `song-data/da-import-output/`

## 5. สภาพแวดล้อม
- **branch `da-import`** (ฐาน `studio-shell-redesign` · **ห้าม merge/deploy main**) · worktree นี้
- **Python 3.14-64** (`C:\Users\aimkr\AppData\Local\Python\pythoncore-3.14-64\python.exe`) — มี pdfplumber + python-docx + pythainlp (default `py` = 3.13-arm64 ไม่มี)
- pythainlp ตัดพยางค์: `subword_tokenize(s, engine='dict')`
- **DA เขียน DB ไม่ได้** (publishable key = read) → P'Aim run SQL เอง · Supabase project `vlpuvaofbzdawgjjpgfu` · env `OneDrive/4 Personal/claude/.env` (`SUPABASE_URL_PLENG` / `SUPABASE_PUBLISHABLE_KEY_PLENG`)

## 6. Next step ชัด ๆ
1. รอ PM ตอบ 77 (data A หรือ SongSheet B) + ประสาน SongSheet dev
2. ถ้า A: แก้ dedup — ท่อน stacked/identical-melody → 1 stanza + arrangement rows · เริ่ม 77 → verify SongSheet songbook mode โชว์โน้ตครั้งเดียว
3. ไล่เพลงที่มี stacked-lyric ท่อนซ้ำ (18 เพลง stacked: 2,20,25,36,40,53,61,66,69,72,73,74,80,85,88,99,100,117) → gen SQL update → P'Aim run
4. รายงานกลับ session-agnostic: อัปเดต `docs/reports/da-import.md` + board §📥 inbox + ping PM ปัจจุบัน (ดู `docs/pm/board.md` §🎯)
