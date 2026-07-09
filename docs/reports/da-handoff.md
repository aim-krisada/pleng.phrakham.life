# DA import — ไม้ต่อ (handoff) สำหรับ DA session ใหม่

**สถานะ: ✅ งาน DA import ครบแล้ว** (120 เพลงขึ้นฐานจริง) · **dedup ท่อนซ้ำ = ทำที่ SongSheet display (ทาง B) ไม่ใช่ data** (PM เคาะ) → DA ไม่ต้องแก้ data เพิ่ม
**อ่านคู่กัน:** `docs/reports/da-import.md` (รายงานเต็ม ทุก step) · `docs/pm/import-arrangement-spec.md` (ground truth การจัดข้อ) · memory `pleng-da-import-parser`

## 1. เสร็จแล้ว (ขึ้นฐานจริงแล้ว ✅)
120 เพลงชุดอนุชน import เข้า Supabase สำเร็จ (verify แล้ว 120 เพลง เลข 1-120 · verified=false ทุกเพลง):
- **field-split:** `title_th` สะอาด (ตัดวงเล็บ) + `theme` (8 ธีม) + `book_refs jsonb` + `scripture` + `category='anuchon'` + key `(category, number)`
- **review_flags jsonb** (41 เพลง): `repeat`(16) · `lint`(6) · `words`(28) — แอปโชว์ ⚠️ + filter
- **99/100** = repeat+volta hand-build (spell-out) · **6 SIMPLE repeat** = auto-expand
- **4 SQL ที่ P'Aim run** (ตามลำดับ): `tools/backup-songs.sql` → `tools/import-all-120.sql` → `tools/set-review-flags.sql` → `tools/repeat-6-simple.sql`
  ⚠️ **repeat-6-simple.sql อาจยังไม่ได้ run** — เช็กกับ P'Aim (query `review_flags` เพลง 2/36/66/69/74/117)
- **cleanup ค้าง:** มีแถวเก่า 1 แถว number=NULL "เอ๊า แห่งใดๆ" (id `7333b9c1-a0e0-40f6-be65-99868acdcbeb`) กลายเป็น anuchon → P'Aim ลบ

## 2. dedup ท่อนซ้ำ (เพลง 77) — ✅ ปิดแล้ว: ทำที่ SongSheet ไม่ใช่ data
**ปัญหา (SongSheet dev เจอ · เพลง 77):** ท่อนรับทำนองซ้ำ 3 บรรทัด (B1=B2 เป๊ะ · B0 ต่างแค่ pickup) → หน้าแผ่นเพลงโชว์โน้ตซ้ำ
**PM เคาะ (ทาง B):** เพลง 77 = **"ทำนองซ้ำ · เนื้อต่อเนื่องไล่ลง" (ไม่ใช่ round ซ้ำ)** → **data ปัจจุบันถูกแล้ว (ต่อเนื่อง) อย่าแตะ** · ถ้า model เป็น reuse (A) จะติดป้ายร้อง1/2/3 ผิด semantic (playback/highlight เพี้ยน)
→ **dedup = เรื่อง display ล้วน = SongSheet dev ทำ** (rule: รวมบรรทัดทำนอง **identical + ติดกัน** → โน้ตครั้งเดียว + เนื้อ stacked · normalize pickup ก่อนเทียบ · AABA ทำนองไม่ identical/ไม่ติดกัน = ไม่รวม)
**→ DA ไม่ต้องแก้ data · งาน import ครบ** · (บทเรียน: เปิด data ดูก่อน แยก "ต่อเนื่อง" ออกจาก "round ซ้ำ" ได้ → กันแก้ผิด semantic)

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
