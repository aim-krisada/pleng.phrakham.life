# Brief — ทดสอบ: Amazing Grace (PD-safe) + feature เนื้อ 2 ภาษา

**สั่งโดย:** pm7 (P'Aim 11 ก.ค.) · **experiment/research** — สร้าง sample + ประเมิน · ⛔ ไม่ push live DB (P'Aim ตัดสิน)
**ที่มา:** P'Aim สำรวจ (ref `Downloads/กลุ่มเพลง-Crossover-Music-และ-10-ปลาวาฬ.md` = แชต Gemini) ว่าเพลง Crossover (10 ปลาวาฬ) **ติดลิขสิทธิ์เอามาใช้ไม่ได้** → ทดสอบระบบด้วยเพลง **public domain** แทน

## Task 1 · เอา Amazing Grace เข้าระบบ (PD-safe)
- **ลิขสิทธิ์ (ยืนยันก่อน):** เนื้อ EN = John Newton (1779) = **public domain** · ทำนอง "New Britain" (Virginia Harmony 1835) = **PD** → เวอร์ชันมาตรฐานปลอดลิขสิทธิ์เต็ม
- **⚠️ คำแปลไทย:** คำแปลไทยที่ตีพิมพ์บางฉบับ **อาจมีลิขสิทธิ์ของผู้แปล** → ใช้ **คำแปล PD หรือแต่งขึ้นเอง** เท่านั้น · ระบุที่มาชัดในข้อมูลเพลง (field source/notes)
- สร้างเป็น **v2 song data** (docs/song-model-v2.md): ทำนองเป็นโน้ตตัวเลข jianpu (New Britain) + arrangement ใส่เนื้อรายพยางค์ · verify ผ่าน `resolveContent`+beat-checker · render ในแอป localhost ให้เห็นจริง (ฝึกร้อง/แผ่นเพลง)
- ไฟล์: `docs/samples/amazing-grace.json` (+ ระบุ PD/source ในไฟล์)

## Task 2 · ทดสอบ + ประเมิน feature เนื้อ 2 ภาษา
- **สถานะปัจจุบัน:** โมเดล v2 = 1 พยางค์/โน้ต · **1 ภาษา/arrangement row** — ไม่มี native bilingual
- **ทดสอบวิธีอ้อม:** สร้าง **2 arrangement rows บน stanza เดียว** (เช่น "EN" + "TH") บนทำนอง Amazing Grace เดียวกัน → ดูว่า sing/แผ่นเพลง/print แสดงยังไง · ใช้งานจริงพอไหม (สลับข้อ EN↔TH)
- **ประเมิน gap ถ้าอยากได้ "2 ภาษาพร้อมกัน"** (EN บน / TH ล่าง ใต้โน้ตเดียวกัน แบบ interlinear): ต้องแก้โมเดล (syllables 2 ชั้น?) + UI (editor รับ 2 ภาษา) + render (NoteRow/SongSheet วาง 2 แถวเนื้อ) แค่ไหน · คุ้ม/ไม่คุ้ม · client-side ได้ไหม
- เสนอ **ทางเลือกที่แนะนำ** (อ้อมด้วย 2 rows พอ หรือควรทำ native) ตามหลักมาตรฐาน (`docs/ui-standards.md`) + KISS

## ส่งมอบ
- `docs/samples/amazing-grace.json` (PD-safe · มี source note)
- `docs/reports/bilingual-amazing-grace.md` — (ก) copyright verdict (ข) วิธีเอา Amazing Grace เข้า + ภาพ render จริง (ค) ผลทดสอบ 2 ภาษาแบบอ้อม + ประเมิน native + คำแนะนำ (ง) สรุปภาษาคน ม.ต้น ให้ P'Aim
- ⛔ **read/experiment · ไม่แตะ production code · ไม่ push Supabase** (สร้าง sample + demo localhost `--host` ให้ P'Aim ดู · Network URL)

## รายงานกลับ
`docs/reports/bilingual-amazing-grace.md` + board §📥 inbox + ping **pm7**
