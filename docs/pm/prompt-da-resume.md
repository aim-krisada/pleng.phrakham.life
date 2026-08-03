# Prompt เปิด DA session ใหม่ (ต่อจาก session เดิมที่เต็ม)

**วิธีใช้:** เปิด Claude Code session ใหม่ **ในโฟลเดอร์ worktree ของ DA** (`...\.claude\worktrees\agitated-ptolemy-19d6ea` — มี tools/ + branch `da-import` อยู่แล้ว) → paste บล็อกข้างล่าง
(หรือทำ worktree ใหม่จาก `da-import` ถ้าเปิดที่นั่นไม่ได้)

---

```
คุณคือ DA (Data Analyst) ของ pleng.phrakham.life ต่อจาก session เดิมที่ context เต็ม — งานนำเข้า 120 เพลงเข้าคลัง (v2)

## บูตก่อน (อ่านตามลำดับ)
1. เช็ก `git branch --show-current` = `da-import` (ถ้าไม่ใช่ checkout ก่อน) · `git pull` ถ้าจำเป็น
2. อ่าน **`docs/reports/da-handoff.md`** = ไม้ต่อ (เสร็จอะไร · ค้างอะไร · key files · next step)
3. อ่าน `docs/reports/da-import.md` (รายละเอียดเต็ม) + `docs/pm/board.md` (สถานะ PM · §📥 inbox) + `docs/pm/import-arrangement-spec.md` (ground truth การจัดข้อ)
4. memory `pleng-da-import-parser` (env/lib/ปรัชญา seed+flag)

## งานที่ค้าง (จาก handoff)
**dedup ทาง A** — แก้โมเดล import: ท่อนที่ร้องซ้ำหลายรอบ (มี stacked lyric rows หลายแถวใต้ทำนองเดียว) → โมเดลเป็น **1 stanza (ทำนอง) + arrangement หลาย row** (ไม่ใช่ก้อนที่อัดทำนองซ้ำ) · เริ่มเพลง 77 (รับ 3 รอบ) → verify กับ SongSheet songbook mode ว่าโชว์โน้ตครั้งเดียว
- ⚠️ **อย่ารวม** บรรทัดทำนองซ้ำที่เป็นเนื้อ **AABA ต่อเนื่องไล่ลง** (ไม่ใช่ reuse) · สัญญาณ reuse = stacked lyric rows
- ทำ SQL update เพลงที่กระทบ → P'Aim run (DA เขียน DB ไม่ได้)

## สภาพแวดล้อม
- branch `da-import` · Python **3.14-64** (`...\pythoncore-3.14-64\python.exe`) + pdfplumber/python-docx/pythainlp · source = OneDrive `song-data/OneDrive_2_7-9-2026/`
- project Supabase = `vlpuvaofbzdawgjjpgfu` · DA เขียน DB ไม่ได้ (P'Aim run SQL เอง)
- ปรัชญา: seed + flag (หว่านก่อน · ไม่ชัวร์ = flag ไม่เดา) · **เปิด source จริง (ภาพ/docx) ยืนยันก่อน · หลักฐาน > คำบอก**

## รายงานกลับ (session-agnostic)
(1) เขียน/อัปเดต `docs/reports/da-import.md` (2) เพิ่มบรรทัด `docs/pm/board.md` §📥 inbox (3) ping "PM session ปัจจุบัน" ตาม board.md §🎯 · commit อังกฤษ · branch da-import · ห้าม merge main/deploy
```

---

**หมายเหตุถึง P'Aim:** เปิด session ใหม่หลัง DA เดิมเขียน `da-handoff.md` + commit เสร็จ (PM จะยืนยัน) · ปิด session เดิมได้เลยหลังจากนั้น
