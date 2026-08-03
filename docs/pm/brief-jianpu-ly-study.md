# Brief — วิจัย: jianpu-ly เอามาใช้ประโยชน์กับ pleng อะไรได้บ้าง (research · read-only)

**สั่งโดย:** pm7 (P'Aim 11 ก.ค.) · **research only — ⛔ ไม่แก้โค้ด pleng** · ส่งมอบ = รายงานวิเคราะห์

## เป้าหมาย
ศึกษา `C:\Users\aimkr\OneDrive\4 Personal\pleng.phrakham.life\jianpu-ly-master` (jianpu-ly โดย Silas S. Brown · `jianpu-ly.py` 111KB · แปลง text → LilyPond typeset jianpu โน้ตตัวเลข) แล้ว **ประเมินว่าเอามาใช้กับ pleng ได้อะไรบ้าง** — เป็นรูปธรรม จัดลำดับตามคุณค่า/ความคุ้ม

## ต้องเข้าใจ 2 ฝั่งก่อนเทียบ
1. **jianpu-ly:** อ่าน `README.md` + `guide_zh_CN.md` + สแกน `jianpu-ly.py` — syntax การป้อน (โน้ต/ออกเทฟ/accidental/duration/slur/tie/bar/repeat/lyric) · กฎ engraving ที่มันทำ (slur/beam/tie/spacing) · MusicXML import · dependency (LilyPond 2.20-2.24 = server-side/หนัก) · **LICENSE** (เทียบ pleng = GPL v3)
2. **pleng ปัจจุบัน:** `src/lib/notation.js` (parser โน้ตตัวเลข) · `src/lib/midi.js` · `src/components/NoteRow.vue`+`SongSheet.vue` (render SVG/HTML ในเบราว์เซอร์) · `docs/song-model-v2.md` · print PDF ผ่าน `@page`/browser (ดู B004) · งานเส้นเอื้อน/ไท B062/B069 (เราสู้เรื่อง slur/tie curve อยู่)

## ประเด็นที่อยากได้คำตอบ (จัดลำดับ + ระบุคุ้ม/ไม่คุ้ม)
1. **print/export PDF คุณภาพสูง:** LilyPond engraving สวยกว่า browser มาก — คุ้มไหมที่จะทำ export ผ่าน LilyPond? **ข้อจำกัดใหญ่: LilyPond = server-side/native (ไม่ใช่ client-side เหมือน pleng ตอนนี้)** → วิเคราะห์ trade-off (server cost · offline หาย · vs คุณภาพ) + ทางเลือก (เช่น export .ly ให้ผู้ใช้ไปรันเอง / บริการ render แยก)
2. **บทเรียน syntax:** jianpu-ly ผ่านการใช้จริงมานาน — มี edge case ของโน้ตตัวเลขที่ parser เราอาจพลาดไหม (KeepLength · dotted · triplet · grace · time sig · repeat/volta · multi-voice)
3. **กฎ engraving เส้นเอื้อน/ไท/beam/spacing:** เอาแนวทางมาปรับปรุง B062/B069 (SVG slur/tie ของเรา) ได้ไหม
4. **MusicXML import:** jianpu-ly นำเข้า MusicXML ได้ — ช่วยงานนำเข้าเพลงของ pleng (DA) ได้ไหม
5. **ไอเดียอื่น** ที่เห็นแล้วน่าเอามาใช้/ต่อยอด
6. **License:** ใช้/อ้างอิง/รวมโค้ดได้แค่ไหน (pleng GPL v3)

## ส่งมอบ
- **`docs/reports/jianpu-ly-study.md`** — (ก) jianpu-ly คืออะไร ทำงานยังไง (ข) ตารางโอกาส: หัวข้อ · คุณค่าต่อ pleng · ความคุ้ม/ข้อจำกัด · client-side ได้ไหม (ค) คำแนะนำ 2-3 ข้อ ที่ควรทำ/ไม่ควรทำ (ง) license verdict
- **สรุปภาษาคนสั้นๆ ให้ P'Aim** (F60+ · ม.ต้น) ท้ายรายงาน
- ⛔ **read-only · ไม่แตะโค้ด pleng · ไม่ install LilyPond** (วิเคราะห์จากเอกสาร/โค้ด)

## รายงานกลับ
(1) `docs/reports/jianpu-ly-study.md` (2) บรรทัด `docs/pm/board.md` §📥 inbox (3) ping PM = **pm7**
