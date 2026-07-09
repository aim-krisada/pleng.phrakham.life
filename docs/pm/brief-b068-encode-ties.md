# brief — B068 encode tie/slur (เส้นโค้งเอื้อน) into song data · สาย DA

**สาย:** DA · branch `da-import` (worktree เดิม `...\.claude\worktrees\agitated-ptolemy-19d6ea` หรือ worktree ใหม่จาก `da-import`)
**ที่มา:** P'Aim 10 ก.ค. — เลือก **"ใส่ข้อมูลครบก่อน แล้วค่อยวาด"** (data-first) · B068 (งานนี้) เสร็จ → PM ค่อยจ่าย B062 (วาดเส้น SVG)
**ทำไม:** ตอนนำเข้า 120 เพลง **0/120 มี tie(`~`)/slur(`( )`) ในข้อมูล** — หนังสือต้นฉบับมีเส้นโค้ง แต่ import กลายเป็นโน้ตค้างธรรมดา (`-`) → B062 วาดเส้นไม่เห็นผลจนกว่าข้อมูลจะมีเส้น

## ⛔ ขอบเขต (กันชน — สำคัญที่สุด · แก้เพิ่ม 10 ก.ค.)
**สายนี้ = ข้อมูลล้วน (data-only).** งานคือ "บันทึกว่าโน้ตไหนมีเส้นเอื้อน" = เติมสัญลักษณ์ `( )`/`~` ลง **content ของเพลง + SQL** เท่านั้น
- ✅ แตะได้: `tools/*.py`, `tools/*.sql`, JSON เพลง (content), `docs/reports/da-import.md`
- ⛔ **ห้ามแตะ `src/components/NoteRow.vue` · SongSheet.vue · ห้ามเขียน SVG/CSS วาดเส้นเด็ดขาด** — การ **"วาด"** เส้นโค้ง (engraving/SVG path) = **B062 = สาย Android เจ้าเดียว** (คนละ session · offline)
- เปรียบเทียบ: DA = คน **"จดว่าโน้ต 3-4-5 เชื่อมกัน"** ลงสมุดโน้ต · Android = คน **"วาดส่วนโค้ง"** ทับ · คนละหน้าที่ ไม่ใช่ทั้งคู่วาด
- ถ้าเจอไอเดียเรื่องรูปทรงเส้น (engraving) = **จดไว้ในรายงานส่งต่อ B062** อย่าลงมือวาดเอง

## โจทย์
อ่านต้นฉบับ (ภาพ/PDF) หาว่าโน้ตไหนมี **เส้นโค้งเอื้อน** (arc/slur/tie) แล้ว **encode ลงสตริงโน้ต** ให้ครบทุกเพลงที่มี

## ไวยากรณ์ (parser รองรับอยู่แล้ว — `src/lib/notation.js`)
- `( ... )` = **slur** คร่อมกลุ่มโน้ต (เอื้อนหลายตัว เช่น `(5 6 5)`) → token `open/close group:'slur'`
- `~5` = **tie** (นำหน้าโน้ต = tie-end เชื่อมจากตัวก่อน) เช่น `6~6` = โน้ต 6 ค้างข้ามเป็น 6 · ใช้ตอนเสียงเดียวกันลากค้าง
- ข้ามห้อง (`│1`) = SongSheet คร่อม segment เอง · ในห้องเดียว = NoteRow
- ref กติกา lint: R4 `slur-crosses-bar` · R5 `tie-cross-pitch` (`src/lib/notationLint.js`) — encode ให้ไม่ผิดกฎ

## ที่เก็บข้อมูล (v2)
- สตริงโน้ตอยู่ใน **`content.stanzas[].lines[]`** — เติม `( )`/`~` ตรงนี้
- ⚠️ **สำคัญ — พยางค์ต้องยังตรง:** `arrangement[].syllables[]` เรียง 1:1 กับ **โน้ตที่มีพยางค์** · โน้ตใต้ slur/tie = ตัวค้าง (ไม่รับพยางค์) · แต่ import เดิมทำ arc เป็น `-` (ก็ตัวค้างไม่มีพยางค์อยู่แล้ว) → ถ้าแทน `-`/แยกตัวด้วย slur จำนวนพยางค์ **ต้องเท่าเดิม** · verify ทุกเพลงด้วย resolveContent + beat-checker (เหมือนตอน import · 0 mismatch)

## Source of truth
- ต้นฉบับภาพ/docx: OneDrive `song-data/OneDrive_2_7-9-2026/` (เปิดของจริงยืนยัน — หลักฐาน > คำบอก · pdfplumber `to_image` อ่าน arc ได้ตามบทเรียน 99/100)
- **เพลงอ้างอิง = เพลง 100** (`docs/backlog-assets/B062-slur-curve-correct.jpg` = ต้นฉบับถูก · `-wrong.jpg` = แอปเราตอนนี้)

## ลำดับ (pilot → batch — เลียนแบบ workflow import ที่สำเร็จ)
1. **Pilot:** เพลง 100 + 2-3 เพลงที่มีเอื้อนชัด → encode → SQL รายเพลง → P'Aim run → **verify แบบโครงสร้าง** (parseNotes เห็น token `( )`/`~` ตรงตำแหน่ง + พยางค์ยังตรง · ยังไม่เห็นเส้นบนจอเพราะ B062 ยังไม่ทำ — นั่นคือ gate ถัดไป)
2. รายงาน pilot ให้ PM → PM/P'Aim เคาะว่า encoding ถูกทาง
3. **Batch:** ไล่ครบทุกเพลงที่มีเอื้อน → รวม `import-ties.sql` (idempotent · update by number) → P'Aim run ครั้งเดียว
4. เก็บ flag เพลงที่ไม่ชัวร์ (ไม่เดา) ให้ B062/พี่เปา verify ตอน render

## Deliverable
- `tools/encode-ties.py` (หรือต่อยอด parser เดิม) + `tools/import-ties.sql` (P'Aim run · DA เขียน DB ไม่ได้)
- report `docs/reports/da-import.md` (ต่อท้าย section B068) — เพลงไหน encode, กี่เพลงมีเอื้อน, flag อะไร
- **นับจำนวนเพลงที่มีเอื้อนจริง** (ตอนนี้ไม่รู้ว่า ~กี่เพลง) = ข้อมูลให้ PM ประเมิน B062

## สภาพแวดล้อม
- Python **3.14-64** (`...\pythoncore-3.14-64\python.exe`) + pdfplumber/python-docx/pythainlp · Supabase project `vlpuvaofbzdawgjjpgfu` · memory `pleng-da-import-parser`

## รายงานกลับ (session-agnostic)
(1) `docs/reports/da-import.md` §B068 · (2) บรรทัด `docs/pm/board.md` §📥 inbox · (3) ping "PM session ปัจจุบัน" ตาม board §🎯 (**ตอนนี้ = `PM รอบ 10 ก.ค. (a)`**) · commit อังกฤษ · branch `da-import` · **ห้าม merge main/deploy**
