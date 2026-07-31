# G consultation — lead-sheet header inline-edit + dual-synced surfaces

**สถานะ:** ร่างพร้อมถาม · รอ slot (G serialize อยู่ · สาย onboarding ใช้) · ping PM ขอ greenlight
**เซฟ transcript:** เมื่อได้คำตอบ → เก็บคำถาม+คำตอบเต็มต่อท้ายไฟล์นี้ แล้วอ้าง path นี้ใน EVIDENCE

---

## บริบทที่จะให้ G (อัปโหลดเป็นไฟล์ ไม่ paste ยาว)

เว็บ pleng.phrakham.life = คลังเพลงนมัสการไทย แสดง **jianpu (โน้ตตัวเลข · movable-do)** + คอร์ดกีตาร์ + เนื้อร้อง.
หัวของแต่ละเพลงต้องเป็น lead-sheet มาตรฐานสากล เปิดมาเห็นทันที: **key (เขียนแบบ jianpu "1=C") · meter (3/4) · tempo (♩=92) · ชนิดโน้ต (jianpu)**.
ต้องการให้ **แก้ค่าเหล่านี้ได้ 2 พื้นผิวที่ sync กัน**: (1) คลิกแก้ตรงหัวแผ่นเพลง (inline click-to-edit) (2) กล่อง ⚙ ตั้งค่าเพลง เดิม. ทั้งคู่เขียน song model ชุดเดียว.
ข้อจำกัดโดเมน: **เปลี่ยน key = transpose คอร์ด · ตัวเลข jianpu ไม่เปลี่ยน** (movable-do — "1" = tonic เสมอ).

## คำถาม (ขอคำตอบอ้างมาตรฐาน/ผลิตภัณฑ์จริง)

1. **Inline-edit หัว lead-sheet — best practice:** เครื่องมือโน้ตระดับโลก (MuseScore, Sibelius, Dorico, Flat.io, iReal Pro, Noteflight) ให้แก้ key/meter/tempo ที่หัวเพลงยังไง? คลิกค่าแล้วเปิดอะไร (inline dropdown/stepper/popover เล็ก vs เปิด dialog แยก)? ค่าไหนควร inline ค่าไหนควรเป็น dialog เพราะ side-effect ใหญ่ (เช่น key → transpose)?

2. **Affordance:** ทำให้ผู้ใช้รู้ว่า "ค่าตรงหัวคลิกแก้ได้" โดยไม่รก/ไม่ทำลายความเป็น lead-sheet สะอาด — pattern ไหนดีสุด (underline dotted, hover bg, ปุ่ม pencil ที่โผล่ตอน hover/focus, chip look)? บนมือถือ (ไม่มี hover) ต้องสื่อยังไง?

3. **Dual-synced surface — มี 2 ที่แก้ค่าเดียวกัน (inline + panel):** เป็น pattern ที่ดีหรือสับสน? ตัวอย่างระดับโลกที่ทำสำเร็จ (เช่น Figma: แก้บน canvas + right panel; Notion: inline + properties)? กติกาออกแบบให้ไม่งง — เช่น เปิด inline แล้วควรไฮไลต์ค่าเดียวกันใน panel ไหม, ควรมีตัวเดียวเป็น "primary" ไหม, กันสองที่เปิดพร้อมกันชนกันยังไง?

4. **Meter/tempo/key controls:** ค่าแต่ละชนิดควรใช้ control อะไรถึงเป็นมาตรฐาน — key = list of 12 (หรือ +minor)? meter = numerator/denominator 2 stepper หรือ preset list (2/4,3/4,4/4,6/8)? tempo = number stepper + คำศัพท์ (Andante/Moderato)? notation type = toggle jianpu⇄staff หรือ locked?

5. **A11y + mobile:** target size, focus order, keyboard (Enter/Esc/ลูกศร), screen-reader labels สำหรับ inline-edit ในหัวเพลง — จุดที่คนมักพลาด?

---

## คำตอบจาก G (เติมเมื่อได้ slot)

_(ยังไม่ถาม — รอ PM greenlight)_
