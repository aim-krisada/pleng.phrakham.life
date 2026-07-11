# Brief — SA: ออกแบบ "แสดงเนื้อ 2 ภาษาคู่กัน" (interlinear · จับคู่ 2 row) · B077

**สั่งโดย:** pm7 (P'Aim เคาะ 11 ก.ค.) · **docs only — ⛔ ไม่แตะ code** · **branch:** `git switch -c sa-bilingual-interlinear studio-shell-redesign`
**ที่มา:** ผลทดลอง `docs/reports/bilingual-amazing-grace.md` — P'Aim เลือกแนว **"จับคู่ 2 ภาษาตอนแสดงผล (render-only)"** (❌ ไม่ทำ native `{en,th}` slot ที่รื้อ editor/DB)

## แนวที่ P'Aim เคาะ (ออกแบบรายละเอียดบนนี้)
โมเดล v2 รองรับ **2 arrangement rows บน stanza เดียว** อยู่แล้ว (EN row + TH row · align โน้ตชุดเดียวกัน) → ทำ **render mode ที่ "จับคู่" 2 row มาแสดงคู่กัน** ใต้โน้ตเดียว = **ไม่ต้องแก้ model/editor/DB · client-side ล้วน**

## ต้องออกแบบ (ตอบให้ชัด)
1. **ผู้ใช้บอก "คู่ภาษา" ยังไง?** — เสนอทางที่ดีสุด (พิจารณา): (ก) toggle "แสดง 2 ภาษา" ใน layer/แสดงผล menu แล้ว auto จับ 2 row แรกของ stanza · (ข) mark row ว่าเป็นภาษาอะไร (field `lang`?) · (ค) เลือกคู่ในหน้าแก้ไข · **เสนอที่ KISS สุด + ตามมาตรฐาน**
2. **render หน้าตายังไง** — โน้ตครั้งเดียว · เนื้อ **บรรทัด 1 (EN) บน / บรรทัด 2 (TH) ล่าง** ใต้แต่ละพยางค์ align ตรงโน้ต · ระยะห่าง/ขนาด/สี ตาม `ui-standards.md` (spacing grid · ไม่ทับ · อ่านง่าย · responsive)
3. **หน้าไหนใช้** — แผ่นเพลง/print เป็นหลัก (interlinear เหมาะพิมพ์) · ฝึกร้อง/sing = จำเป็นไหม (เสนอ)
4. **edge:** พยางค์ 2 ภาษาไม่เท่ากัน (EN 1 พยางค์ = TH 2 พยางค์) จัดยังไง · ถ้า row มีภาษาเดียว (เพลงไทยล้วน) = ไม่โชว์โหมดนี้

## ส่งมอบ (docs only)
- `docs/us/bilingual-interlinear.md` + `docs/ds/bilingual-interlinear.md` (ต่อยอด song-model-v2 · ระบุว่า render-only ไม่แตะ model)
- **mockup คลิกได้** `docs/design/bilingual-interlinear.html` (ให้ P'Aim ดูก่อน dev · ใช้ Amazing Grace 2 row เป็นตัวอย่าง)
- คำถาม P'Aim ≤3 ท้าย (ถ้ามี) · ยึด `docs/ui-standards.md`
- ⛔ ไม่แตะ code · gate = P'Aim ดู mockup เคาะก่อน dev (dev รอบหลัง · ชน SongSheet/EditorMode ที่กำลัง build = pm7 จัดคิว)

## รายงานกลับ
`docs/reports/sa-bilingual-interlinear.md` + board §📥 inbox + ping **pm7**
