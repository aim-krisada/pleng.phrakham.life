# ปรึกษา G — semantics ของ D.C./D.S./Segno/Coda/Fine (playback jump resolver)

**บริบท:** เว็บโน้ตเพลงนมัสการ (jianpu โน้ตตัวเลข). โมเดลเพลง v2 แยก "ทำนอง (stanza)" กับ
"ข้อ (arrangement entry)". วันนี้ D.C./D.S./Fine เป็น **ข้อความ label เฉยๆ** — เล่นไม่ตาม.
กำลังจะทำ resolver ให้ playback **ย้อน/กระโดดจริง**.

**สิ่งที่ยืนยันเองแล้วจากสเปกจริง (ไม่ต้องตอบซ้ำ — แค่ยืนยันว่าถูก):**
W3C MusicXML 4.0 `<sound>` (เปิดอ่านเอง https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/sound/):
- `dacapo="yes"` = กลับต้นเพลง · default jump = **first time through**
- `dalsegno` = จุดเริ่มกระโดดย้อน · `segno` = จุดหมาย (marker)
- `tocoda` = จุดเริ่มกระโดดไป coda · default = **second time through** · `coda` = จุดหมาย
- `fine` = ตามหลังโน้ตสุดท้ายในเพลงที่มี D.C./D.S. (จบตรงนี้ตอน "วิ่งกลับมา")
- `time-only` = ใช้เฉพาะรอบไหนของ repeat

**โมเดลที่จะใช้ (ยืนยันว่าตรงมาตรฐาน):**
- `flow.jump: "capo"` = D.C. (ย้อนต้น) · `"segno"` = D.S. (ย้อนไป segno marker) · `"none"` = ไม่กระโดด
- al-Fine / al-Coda **ไม่เก็บในคำสั่ง jump** แต่ "งอก" จากการมี marker: มี Fine marker = จบที่ Fine ·
  มี To-Coda + Coda = กระโดด coda. (ตรง MusicXML: dacapo attribute ไม่บอกเอง — fine/coda sound element ต่างหากที่บอก)
- Segno/Coda = marker item มี id ถาวร (มินต์ไว้แล้ว) · Fine = `kind:'fine'`

**คำถาม (ตอบสั้น ตรงประเด็น — เป็นคำถามวิศวกรรม/edge case ไม่ใช่ทฤษฎีดนตรีพื้นฐาน):**

1. **ถ้าเพลงมีทั้ง Fine marker และ Coda pair (To-Coda+Coda) พร้อมกัน** — ควรตีความยังไง?
   ในทางปฏิบัติ "D.C. al Fine" กับ "D.C. al Coda" ใช้คนละอย่าง. ปกติผู้ประพันธ์ใส่อย่างใดอย่างหนึ่ง.
   ถ้าเผลอมีทั้งคู่ ควรให้อะไรชนะ (Coda pass หรือ Fine)? หรือถือว่าเป็น input ผิดแล้วเตือน (lint)?

2. **ระดับความละเอียดของตำแหน่ง marker** — engine เราเล่นเป็น "ช่วงบรรทัด" (line ranges).
   Segno/Coda-dest วางต้นบรรทัด · Fine/To-Coda วางท้ายบรรทัด → line-level พอ.
   ในเพลงนมัสการจริง (ไม่ใช่คลาสสิกซับซ้อน) มีเคสที่ Segno/Coda/Fine **ต้องอยู่กลางบรรทัด/กลางห้อง**
   บ่อยไหม? หรือ line-level เป็น scope ที่ยอมรับได้สำหรับ v1 (mid-line = known limit)?

3. **`flow.jump: "coda"` แบบรายข้อ** มีความหมายจริงไหม? หรือ al-Coda ควรขับด้วย marker ล้วน
   (jump บอกแค่ back-target capo/segno)? เคสไหนที่ต้องมี jump:"coda" ตรงๆ?

4. **หลัง D.C./D.S. แล้ว** — ตาม after-jump ของ MusicXML (default = ไม่เล่น backward repeat ซ้ำ):
   ยืนยันว่า "รอบที่วิ่งกลับมา = รอบสุดท้าย ไม่วน `:‖` ซ้ำอีก" ถูกไหม? และ **ข้อ arrangement ที่อยู่หลัง
   ข้อที่มี jump** ควรถือว่า "เล่นไม่ถึง" (เพลงจบที่ Fine/Coda/ปลายทางย้อน) — ถูกต้องตามหลักดนตรีไหม?

5. มี **กับดัก/เคสตกหล่น** อะไรที่ resolver แบบ line-range + marker-driven นี้จะพลาด? (เช่น
   nested D.S.-in-D.C., Coda ที่มี repeat ในตัว, ฯลฯ) ที่ควรออกแบบเผื่อ **โครงข้อมูล** ไว้ตั้งแต่ตอนนี้
   แม้ยังไม่ทำ UI.
