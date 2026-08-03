# DA brief — นำเข้าเพลงชุดใหม่ 120 เพลง (v2 · upsert · ทับของเก่า)

**Decisions (P'Aim 9 ก.ค.):** โมเดล **v2** (มีท่อน) · **upsert ตามเลขเพลง** (เลขเดิม=ทับ · เลขใหม่=เพิ่ม) · **ทับของเก่า**
**Source:** `C:\Users\aimkr\OneDrive\4 Personal\pleng.phrakham.life\song-data\OneDrive_2_7-9-2026` (120 เพลง · แต่ละเพลงมี PDF + DOCX)
**โมเดล:** อ่าน `docs/song-model-v2.md` ก่อน (stanza=ทำนอง · arrangement=verse/refrain ผูก stanza · 1 พยางค์/โน้ตที่มีพยางค์)
**ไม่ชนโค้ด UI** (B043/edit-dev) — งานนี้ = data/tooling · ทำขนานได้

## ทำทีละ step + 🚦 GATE ระหว่าง (P'Aim/PM เคาะก่อนไปต่อ · ห้ามรวดเดียวจบ)

### Step 1 — วิเคราะห์ source: PDF vs DOCX อันไหนดีกว่า
- เทียบ **3-5 เพลง** (เช่น 1, 10, 31, 100) · อันไหน parse **ครบ+แม่น**กว่า (โน้ตตัวเลข · คอร์ด · เนื้อ · marker ท่อน)
- PM เห็นแล้ว: DOCX เพลง 1 มีครบ + `(รับ)` แต่มี **noise พิกัด Word** (เช่น `396240 340995 0 0`) → ประเมินว่ากรองยาก/ง่าย · เทียบ PDF (เป็น text จริง)
- **ส่ง PM:** สรุปเลือก source (รวม/รายเพลง) + เหตุผล + **sample parsed JSON 1-2 เพลง**
- 🚦 **GATE 1:** PM/P'Aim เคาะ source ก่อนไป Step 2

### Step 2 — ประเมินความเสี่ยง + นำร่อง (verify)
- เขียน **parser** → JSON โมเดล v2 (stanza + arrangement มีท่อน · กรอง noise)
- **นำร่อง 3-5 เพลง → โหลดเข้าแอปดูจริง** (โน้ต/คอร์ด/เนื้อ/ท่อน ตรง · เล่นได้ · ท่อน ร้อง/รับ ถูก)
- **ประเมินความเสี่ยง:** ความแม่น parse · เคสยาก (เพลงไม่มีท่อนชัด · โน้ตซับซ้อน · จุดคู่ `..` · เอื้อน) · ผลกระทบตอนทับ
- **แผน backup:** วิธีสำรองเพลงเดิมใน Supabase ก่อนทับ (เตรียม SQL export)
- **ส่ง PM:** risk report + pilot JSON (verified ในแอปแล้ว) + backup plan
- 🚦 **GATE 2:** PM/P'Aim go/no-go ก่อน bulk

### Step 3 — ดำเนินการ (แปลงครบ + import)
- parse ครบ **120 เพลง** → JSON · **สุ่มตรวจ 10-15 เพลง** (กระจายทั้งเล่ม)
- **สำรองเพลงเดิม Supabase ก่อน** (DA เตรียม SQL backup) → **P'Aim run SQL เอง** (DA เขียน DB ไม่ได้)
- **P'Aim run SQL upsert** ตามเลขเพลง (เลขเดิมทับ)
- verify: 120 เพลงขึ้นแอปถูกต้อง

## Traceability (คราวก่อน DA อยู่นอก git — รอบนี้แก้)
- **parser tool + sample JSON เข้า repo** (branch `da-import` หรือ folder `tools/`) · raw PDF/DOCX + 120 JSON output เก็บ OneDrive (ใหญ่ · ไม่เข้า git)
- รายงาน: `docs/reports/da-import.md` + board §📥 inbox + ping PM ปัจจุบัน "debug pl2 round 1" (ดู board §🎯)
- Supabase config อยู่ใน `.env` (`SUPABASE_URL_PLENG` / `SUPABASE_PUBLISHABLE_KEY_PLENG`) — publishable key = read เท่านั้น · **เขียน DB = P'Aim run SQL**
