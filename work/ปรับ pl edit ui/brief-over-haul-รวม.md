# Editor over-haul — brief รวมเพื่อล็อกดีไซน์ (ให้ G Pro ท้าทาย/เติม)

เขียนโดย Claude (โปรแกรมเมอร์ pleng) · เป้า: **จบดีไซน์ editor over-haul ใน session นี้**
G ช่วย 3 อย่าง: (A) ชี้จุดที่ยังหลุด (B) ออกแบบ editor UX ที่เรายังไม่ได้ทำ (C) ท้าทาย idea ผมข้อ §3

## 1. สิ่งที่ตกลงแล้ว (ล็อก — ต่อยอด v2 ไม่รื้อ)
- โมเดล v2 (stanzas ทำนอง + arrangement ลำดับ/เนื้อ + resolvePlayOrder + expandRepeats) = ฐาน · ไม่ออกแบบใหม่
- ลำดับ gap: **1) D.C./D.S./Fine/Segno (เล่นเสียงถูก · >30% ใช้) 2) display compact สากล 3) ปุ่มลัด (รับ) 4) MusicXML export**
- แก้ issue6 (คลิกโน้ต preview→เด้งแก้): แปะ `_source:{stanzaId,lineIdx,segIdx,noteIdx}` ตอน resolveContent (in-memory ไม่แตะ DB)
- voice (ลูกคู่) กับ language = คนละมิติ (orthogonal)
- เปลี่ยน time signature กลางเพลง: token ที่หัวห้อง (รองรับแล้ว)

## 2. crux ที่ยังไม่เคาะ — flat vs nested `syllables`
ตอนนี้ `syllables: [...]` (flat 1 มิติ) · multi-lang/voice ต้องการ nested `{voice:{lang:[...]}}`
- **ปัญหา:** editor tooling ทั้งชุด (กล่องพยางค์ · shift ◀▶ · paragraph · auto-split · verse lens) สมมติ flat → nested = **รื้อ tooling** (memory `pleng-bilingual-approach` เตือน: แพงสุด · Amazing Grace พิสูจน์ render-only 0 โค้ด)

## 3. 🟢 idea ผม (ให้ G ท้าทาย): nested ใต้ฮู้ด + progressive-disclosure บน editor
- **ใต้ฮู้ด = nested เต็ม** (`syllables:{voice:{lang}}` + `melismaOverrides` ต่อ row) → รองรับ lang/voice/melisma ครบตามที่ G เสนอ
- **บน editor = เรียบง่ายเท่าเดิมสำหรับ 99%:** เพลง 1 ภาษา/1 voice เห็น flat เหมือนเดิมเป๊ะ · มิติ voice/lang **โผล่เฉพาะตอนกด "เพิ่มภาษา/เพิ่มลูกคู่"** (progressive disclosure)
- ผลลัพธ์: แก้ crux ได้ทั้งคู่ — ยืดหยุ่นแบบ G + ไม่ภาษี common case + รื้อ tooling **ครั้งเดียว**ตอน over-haul (ไม่รื้อ 2 รอบ = บทเรียน "ทำ v2 ก่อน batch-key")
- **เหตุผลจังหวะ:** ถ้าจะเอา multi-lang จริง (P'Aim ขอแล้ว) การทำ flat ก่อนแล้ว nested ทีหลัง = รื้อ editor 2 รอบ · over-haul คือจังหวะรื้อทีเดียว

## 4. ⬜ ที่เรายังไม่ได้ออกแบบเลย = editor UX over-haul (ขอ G ช่วยตรงนี้มากสุด)
คนใช้ทุกวัน (พี่เปา = คอขวด พิมพ์เพลงเข้าคนเดียว) · บั๊ก daily ที่ยังค้าง = อาการของ editor ที่ซับซ้อนไป:
- **ลบทั้งเพลงหาไม่เจอ** (issues10) · **preview เล็กเลื่อนหาแก้ยาก** (issues6/7) · **โครงเพลง collapse ไม่เหมือนทำนอง** (issues4) · **พิมพ์ 2 คอร์ด/ห้องไม่ได้เอง** (issue21)
- ตอนนี้ editor มี: Melodies panel + Arrangement panel + verse lens + syllable boxes + shift tools + paragraph editor = **เยอะ/งง**
- **โจทย์ให้ G:** ออกแบบ interaction ของ editor ที่ over-haul แล้ว — ให้ (ก) พิมพ์เพลงเร็ว (batch 100 เพลง) (ข) แก้จุดที่เห็นได้ทันที (คลิก preview=แก้จุดนั้น) (ค) รองรับ 2 display mode + lang/voice แบบ progressive (ง) เรียบพอสำหรับคนไม่รู้โปรแกรม · **ทำงานบนแท็บเล็ต/มือถือด้วย**

## 5. คำถามล็อกดีไซน์ให้ G Pro
1. §3 (nested+progressive) เห็นด้วยไหม หรือมีทางที่ดีกว่าที่ทั้งถูกและถูกกว่า?
2. §4 editor UX — เสนอ interaction model ที่เป็นรูปธรรม (พอเอาไป implement) · จุดไหนของ editor ปัจจุบันควร "ตัดทิ้ง/รวบ"
3. มีประเด็นสำคัญอะไรที่ทั้ง Claude และ G ยัง "หลุด" ไปในดีไซน์นี้ไหม (นี่คือคำถามหลัก — กันตกหล่น)
