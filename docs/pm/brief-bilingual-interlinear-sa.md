# Brief — SA: ออกแบบ "แสดงเนื้อหลายภาษาคู่กัน" (interlinear · ≥3 ภาษา) · B077

**สั่งโดย:** pm7 (P'Aim เคาะ 11 ก.ค.) · **docs only — ⛔ ไม่แตะ code** · **branch:** `git switch -c sa-bilingual-interlinear studio-shell-redesign`
**ที่มา:** ผลทดลอง `docs/reports/bilingual-amazing-grace.md` — P'Aim เลือกแนว **"จับคู่ N ภาษาตอนแสดงผล (render-only)"** (❌ ไม่ทำ native `{lang}` slot ที่รื้อ editor/DB)

## ⭐ ต้องรองรับ "อย่างน้อย 3 ภาษา" (P'Aim 11 ก.ค.)
**ที่ประชุม P'Aim ใช้ ไทย · จีน · อังกฤษ** → **ออกแบบเป็น multi-language ตั้งแต่แรก (N ภาษา ≥3)** ไม่ใช่ล็อก 2 ภาษา · โมเดล v2 รองรับ **หลาย arrangement rows บน stanza เดียว** อยู่แล้ว (row ละภาษา · align โน้ตชุดเดียว) → ทำ **render mode "จับกลุ่ม N row มาแสดงซ้อนกัน"** ใต้โน้ตเดียว = **ไม่แก้ model/editor/DB · client-side ล้วน**

## ต้องออกแบบ (ตอบให้ชัด)
1. **ผู้ใช้เลือก "กลุ่มภาษา + ลำดับ" ยังไง?** — เสนอ KISS สุด (พิจารณา): (ก) mark ภาษาให้ row (field `lang`: th/zh/en/…) แล้ว toggle "แสดงหลายภาษา" + เลือกภาษาที่จะโชว์ (checkbox) + ลำดับ (เช่น ไทยบน · จีน · อังกฤษล่าง) · (ข) auto จับ row บน stanza เดียว · **เลือก N ภาษาได้ · เปิด/ปิดรายภาษา**
2. **render หน้าตายังไง** — โน้ตครั้งเดียว · เนื้อ **N บรรทัดซ้อน** (ไทย/จีน/อังกฤษ ตามลำดับที่ตั้ง) ใต้แต่ละพยางค์ align ตรงโน้ต · ระยะห่าง/ขนาด/สี ตาม `ui-standards.md` · **⚠️ 3+ บรรทัด = กินพื้นที่แนวตั้ง** → ออกแบบ spacing/ขนาดให้ยังอ่านง่าย ไม่ทับ (โดยเฉพาะมือถือ) · **จีน (CJK) กว้าง/สูงต่างจากไทย/ละติน** → เผื่อ line-height/ฟอนต์
3. **หน้าไหนใช้** — แผ่นเพลง/print เป็นหลัก · ฝึกร้อง/sing = เลือกภาษาเดียวหรือโชว์หลาย (เสนอ)
4. **edge:** พยางค์แต่ละภาษาไม่เท่ากัน (อังกฤษ 1 = ไทย 2 = จีน 1 ตัวอักษร) จัด align ยังไง · row ภาษาเดียว = ไม่โชว์โหมดนี้ · เลือกโชว์ 2 จาก 3 ได้

## ส่งมอบ (docs only)
- `docs/us/bilingual-interlinear.md` + `docs/ds/bilingual-interlinear.md` (ต่อยอด song-model-v2 · ระบุว่า render-only ไม่แตะ model)
- **mockup คลิกได้** `docs/design/bilingual-interlinear.html` (ให้ P'Aim ดูก่อน dev · ใช้ Amazing Grace 2 row เป็นตัวอย่าง)
- คำถาม P'Aim ≤3 ท้าย (ถ้ามี) · ยึด `docs/ui-standards.md`
- ⛔ ไม่แตะ code · gate = P'Aim ดู mockup เคาะก่อน dev (dev รอบหลัง · ชน SongSheet/EditorMode ที่กำลัง build = pm7 จัดคิว)

## รายงานกลับ
`docs/reports/sa-bilingual-interlinear.md` + board §📥 inbox + ping **pm7**
