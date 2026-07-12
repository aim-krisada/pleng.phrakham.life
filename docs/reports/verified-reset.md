# Reset verified=false ทั้งตาราง songs — รายงาน DA

**สั่งโดย:** P'Aim ผ่าน PM (pm7) 11 ก.ค. · **เหตุ:** quality reset — display+editor ยังมีบั๊ก →
ทีม review เพลงใหม่ทีละเพลง (เริ่มเล่มอนุชน) · public เห็นเฉพาะ verified (dev ทำ filter ที่ SongList)

## ไฟล์
`tools/reset-verified-false.sql` — **P'Aim รันเอง** ใน Supabase SQL Editor (project `vlpuvaofbzdawgjjpgfu`)

## SQL ทำอะไร
- `update songs set verified=false where verified is distinct from false` — ทุกเล่ม/ทุก category
- แตะ **column `verified` อย่างเดียว** · ไม่ลบแถว · ไม่แก้ content/title/category/review_flags/อื่น ๆ
- **idempotent** — รันซ้ำ = no-op (ทุกแถว false แล้ว)
- **self-check** — นับ verified=true ก่อน/หลัง (RAISE NOTICE) · ถ้าหลังรันยังเหลือ true → RAISE + rollback ทั้งก้อน

## ⚠️ ผลหลังรัน (ตั้งใจ)
live/public จะ **ว่างเปล่า** จนกว่าทีมจะ verify ทีละเพลง — ไม่ใช่บั๊ก. dev กำลังเพิ่ม verified-filter ที่ SongList.

## หมายเหตุงานเล่มใหญ่ (hymnal import)
P'Aim สั่ง **พักการ import เล่มใหญ่** — ให้เล่มอนุชน (120 เพลงที่มีอยู่) review ทีละเพลงให้เรียบร้อยก่อน.
เพลง 32 เล่มใหญ่ (`lem-yai/32 นมัสการพระบิดา`) import แล้ว (verified=false) รอพี่เปาตรวจ — ค้างไว้ตามคำสั่ง.
