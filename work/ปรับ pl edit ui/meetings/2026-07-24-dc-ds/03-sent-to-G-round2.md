# ปรึกษา G Pro รอบ 2 — ตกผลึก edge cases + validate UX (D.C./D.S./Coda/Fine)

(ต่อจากรอบ 1 · โมเดล flow.jump:capo|segno + marker Segno/Coda/Fine ยืนยันตรง W3C แล้ว)
⚠️ ทุกข้ออ้าง semantics = ขอ URL + ชื่อ construct (element/attribute) ที่เปิดตรวจเองได้.

## A. edge cases ที่ต้องตกผลึก (ตอบทีละข้อ มี URL)

A1. **D.C./D.S. al Coda ที่มีทั้ง To-Coda + Fine ในเพลงเดียว** — ลำดับความสำคัญจริงตามมาตรฐานคือ?
    (รอบ 1 บอก Coda ชนะเพราะเจอ To-Coda ก่อน Fine — ยืนยัน/แก้ พร้อม URL)

A2. **pass แรก vs pass ย้อน เล่นคนละทาง** — ยืนยัน default ของ MusicXML:
    - `tocoda` = "second time through" (pass ย้อน) — ✅ ตรวจแล้ว
    - `fine` สังเกตเฉพาะ pass ย้อน — สเปกระบุ default ตรงไหน? (element/attribute + URL)
    - `dacapo`/`dalsegno` = "first time through" — แปลว่าอะไรในเพลง strophic ที่ท่อนถูกเล่นหลายรอบ?

A3. **นับ pass ต่อ stanza หรือทั้งเพลง?** เพลงเรา arrangement เรียงข้ออิสระ + มี refrain คั่น
    (A·รับ·A·รับ·A). "รอบที่ 2 ของ A" ควรนับข้าม refrain ไหม? (มาตรฐานว่าไง)

A4. **D.C./D.S. con repetición** (ย้อนแล้ว *เล่น* :‖ ซ้ำ) มีจริงในทางปฏิบัติไหม หรือ default
    (ข้าม repeat หลังย้อน) ครอบเกือบทุกเคส? (MusicXML `after-jump` — ยืนยันความหมาย)

A5. **repeat ภายในท่อน Coda** — ยืนยันว่าเล่นวนปกติ (กฎ "ไม่วนหลังย้อน" ไม่คลุม Coda)?

## B. validate UX สำหรับผู้ใช้ = คนทำเพลงโบสถ์ (ไม่ใช่นักดนตรีอาชีพ)

บริบท: editor เรา = แผ่นเพลงพื้นผิวเดียว (inline WYSIWYG) + Drawer "โครงเพลง" (ลากบล็อกข้อ/รับ).
MuseScore ให้ผู้ใช้ประกอบเอง 4 ชิ้น (วาง Segno + To-Coda + Coda + ข้อความ D.S. al Coda) จาก palette
"Repeats & Jumps" — ทรงพลังแต่ต้องรู้ว่าวางอะไรตรงไหน.

B1. สำหรับ **มือใหม่ที่ไม่ใช่นักดนตรี** — เสนอ **"preset สำเร็จรูป"** (เลือก "D.S. al Coda" ทีเดียว
    แล้วระบบวาง Segno/To-Coda/Coda ให้ ผู้ใช้แค่ลากตำแหน่ง) ดีกว่าให้ประกอบเองไหม? มีแอปไหนทำแบบนี้?
    (iReal Pro / Sibelius First / Flat.io — ใครทำ jump ให้เข้าใจง่ายสุด · ขอตัวอย่าง)

B2. **แยก 2 ระดับ** — marker (Segno/Coda/Fine) วางบน "แผ่นเพลง" (ที่ห้อง/โน้ต) · คำสั่งย้อน (D.C./D.S.)
    วางใน "โครงเพลง" (ระดับท่อน) — ถูกต้องตาม mental model ไหม หรือควรอยู่ที่เดียวกัน?

B3. **แสดงผลให้เข้าใจ** — พอใส่ D.S. al Coda แล้ว จะให้ผู้ใช้ "เห็น" การไหลของเพลงยังไงไม่งง
    (เส้นโยง? หมายเลขลำดับเล่น? preview "ลำดับเล่นจริง"?) — best practice?

## C. survey ครบ — มี construct การวนร้อง/นำทางมาตรฐานอะไรอีกที่ผมตกหล่น
(ที่เพลงนมัสการ/hymn ใช้จริง) นอกจาก: |: :| +count · volta 1st/2nd/nth · D.C./al Fine/al Coda ·
D.S./al Fine/al Coda · Segno · Coda/To-Coda · Fine · final barline ‖ · (รับ)/refrain?
