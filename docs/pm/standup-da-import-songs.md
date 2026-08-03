# Standup — da-import-songs

สายงาน: da-import-songs · สถานะล่าสุด: ข้อมูล+เครื่องมือพร้อม · **ยังไม่นำเข้าคลังจริง** · รอพี่เอมเคาะ 3 เรื่อง
อัปเดตล่าสุด: 2026-07-08 โดย session รอบที่ 1

## 1. คุณคือใคร
DA (Data Analyst) สาย **นำเข้าเพลงเข้าคลัง** — แปลง `YS 2014.pdf` เป็น pleng v1 JSON seed ให้พร้อม import เข้า Supabase (ตามบท "Claude seeds, P'Pao fixes")

## 2. ตอนนี้ทำอะไรอยู่
เสร็จรอบ build เครื่องมือ + parse ทั้งเล่มแล้ว · สถานะปัจจุบัน = **รอพี่เอมเคาะ** ก่อนเดินต่อ (ดูข้อ 6)

## 3. ถึงไหนแล้ว / เหลืออะไร
**เสร็จ:**
- seed มือ 3 เพลง: #1 (มีในคลังอยู่แล้ว) · #31 · #84 (JSON+SQL, validate ผ่าน)
- **ค้นพบ:** PDF เป็น native text (ไม่ใช่สแกน) → เขียน **deterministic parser** อ่าน text+เวกเตอร์ (จุด octave/เขบ็ต/บาร์/slur) แม่นกว่า vision · รันบน ARM ได้ (ไม่ต้อง render รูป)
- parse **ทั้งเล่ม 84 เพลง** ในไม่กี่วินาที · 29 เพลง beat สะอาด 100% · ~320 บาร์ flag ให้ตรวจ (มี `_REPORT.md` ชี้รายเพลง)

**เหลือ:**
- Studio-verify บาร์ที่ flag (พี่เปา) · เริ่มจาก 29 เพลงสะอาดเป็น pilot
- ย้าย tool+doc เข้า repo (MR) — **รอเคาะ**
- gen SQL + **run เข้า Supabase (ยังไม่ทำเลย)** — DB เขียนเองไม่ได้ (read-only)
- refine parser: ties/slur, lyric alignment, แก้ #81 ชื่อไฟล์ซ้ำ

## 4. ไฟล์รายละเอียดอยู่ไหน  ⚠️ ทั้งหมดอยู่ **OneDrive ไม่ใช่ repo**
`C:\Users\aimkr\OneDrive\4 Personal\pleng.phrakham.life\`
- `tools/` — `parse_full.py` `common.py` `batch.py` `report.py` `validate.mjs` + `README.md` + **`HANDOFF.md`** (สถานะเต็ม) + `PM-PROMPT.md`
- `song-data/` — seed มือ #1/#31/#84 (json+sql)
- `song-data/auto-parsed/` — 84 JSON อัตโนมัติ + **`_REPORT.md`** (ตารางสุขภาพรายเพลง)
- input: `song-picture/YS 2014.pdf` · `features/feature 003/*.jpg`

## 5. คุณเป็นเจ้าของไฟล์ไหน (กันชน)
- **เขียน:** เฉพาะใต้ OneDrive `tools/` + `song-data/` (ข้างบน) · ในโฟลเดอร์ repo นี้ = **อ่านอย่างเดียว** (ยกเว้น standup ไฟล์นี้)
- **อ้างอิง (read-only):** `src/lib/notation.js` (parser พึ่งไฟล์นี้) · `docs/importing-songs.md` · `docs/song-model-v2.md`
- branch: `studio-shell-redesign` · ไม่รัน dev-server/ไม่จอง port · commit เฉพาะ `docs/pm/standup-da-import-songs.md`

## 6. ติด / รออะไรอยู่ — **รอพี่เอมเคาะ 3 เรื่อง**
1. **ย้าย tool+data เข้า repo ไหม?** (ตอนนี้อยู่ OneDrive → git มองไม่เห็น = traceability gap) · ถ้าย้าย ต้องให้ dev session ทำ MR
2. **verify ก่อน หรือ import ก่อน?** — เปิด 29 เพลงสะอาดใน Studio ตรวจก่อน แล้วค่อย import?
3. **เพลงไหนก่อน** (เรียงตามการใช้จริง?) · แล้ว **พี่เอม run SQL เอง** (DA write DB ไม่ได้)

## 7. จุดต่อกับคนอื่น
- **สาย SA/dev jianpu/notation:** parser พึ่ง `src/lib/notation.js` — ถ้าใครแก้ไวยากรณ์โน้ต ต้อง sync parser ด้วย (นัดกันก่อนแก้)
- **พี่เปา (Studio-verify):** seed ที่ผมทำ = จุดตั้งต้น พี่เปาเกลาใน Studio ตาม `_REPORT.md`
- **dev session:** ถ้าเคาะให้เข้า repo → dev เป็นคนยก tool+doc เข้าผ่าน MR (ไม่ใช่สายนี้ push โค้ด)

## ⚠️ จุดที่เอกสารไม่ตรงกับของจริง (สำหรับ PM cross-check)
1. **`docs/importing-songs.md` ล้าสมัย** — playbook บอก "ARM render/extract PDF ไม่ได้ (เละ) → ใช้รูป + ขอ screenshot ทีละเพลง + vision transcribe" · **ของจริง:** PDF เป็น text, ดึง text+พิกัดบน ARM ได้เป๊ะ, parser อ่านทั้งเล่มอัตโนมัติ ไม่ต้องรูป/ไม่ต้อง vision → ควรเขียน playbook ใหม่/แนบภาคผนวก
2. **งานสายนี้มองไม่เห็นใน git** — ไม่มี backlog id / US / DS / report ใน repo · tool+data อยู่ OneDrive หมด · PM (อ่านแค่ git) จะไม่เห็นเลย = traceability gap ตาม ISO 29110
3. **"นำเข้าคลัง" ยังไม่เกิดจริง** — seed ยัง staged ใน OneDrive · run เข้า Supabase = **0 เพลง** จากงานรอบนี้ (เพลง #1 มีอยู่ก่อน) · #31/#84 มี SQL แต่ยังไม่ยืนยันว่า run · 84 auto-parsed ยังไม่ได้ gen SQL
4. **แนวทางเปลี่ยน** จาก "seed มือทีละเพลง (JSON+SQL)" → "parser อัตโนมัติทั้งเล่ม (JSON)" · รูปแบบ output ต่างจาก playbook เดิม (auto-parsed ยังไม่มี .sql)
