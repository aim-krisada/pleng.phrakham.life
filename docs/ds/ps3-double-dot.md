# DS — ps3: รองรับโน้ตจุดคู่ (double-dot)

US: `docs/us/ps3-double-dot.md` · Backlog: B027 · อ้างอิง: Wikipedia jianpu ("two dots = +¾")

## ไฟล์เจ้าของ
- `src/lib/notation.js` — `parseNotes` (อ่านจุด) + `beatCount`
- `src/lib/midi.js` — `tokenBeats`
- `src/components/NoteRow.vue` — วาดจุด (ปัจจุบันมี `<span class="aug">•</span>` เมื่อ dotted)
- `src/views/Guide.vue` — เพิ่มแถวคู่มือ
- + เทสต์ (dependency-free node หรือ inline)

## เปลี่ยน token: `dotted: boolean` → `dots: 0 | 1 | 2`
**ไม่มี migration** — token มาจากการ parse note string สด ๆ (ไม่ได้ serialize) · `5..` แค่ parse เป็น `dots=2` · เก็บ note string เดิมทั้งหมดใช้ได้ทันที

## parseNotes — จุด augmentation (หลัง underline)
ปัจจุบัน (notation.js ~บรรทัด 47-54) อ่าน augmentation dot ได้ **ทีละ 1** (`dotted=true; j++`) · แก้เป็น **นับได้สูงสุด 2**
- **คงกติกาเดิม (backward-compat):** จุด **1 จุด** ที่อยู่ติดหน้า digit ตัวถัดไป = จุดอ็อกเทฟล่างของ digit นั้น ไม่ใช่ augmentation (เช่น `5.3` = 5 แล้ว .3) · ในโมเดลกล่อง (1 โน้ต/กล่อง) จุดหลัง digit ในกล่องเดียวกัน = augmentation ชัดเจน
- ผลลัพธ์ที่ต้องได้: `5..` → dots=2 · `5.` → dots=1 · `.5` (อ็อกเทฟล่าง) และ `5..3` (แพ็กติดกัน) เดิม **ไม่เปลี่ยนพฤติกรรม**

## ความยาว
- `beatCount` (notation.js) + `tokenBeats` (midi.js): แทน `if (t.dotted) d*=1.5` ด้วย
  `if (t.dots===1) d*=1.5; else if (t.dots===2) d*=1.75`

## render — NoteRow.vue
- แสดง `•` จำนวนเท่ากับ `t.dots` (1 หรือ 2 จุด) ต่อท้ายเลข (loop/`v-for` แทน span เดี่ยว)

## เทสต์ (ต้องผ่านก่อน merge)
- `parseNotes('5..')` → note.dots===2 · `parseNotes('5.')` → dots===1
- `beatCount('5..')` === 1.75 · `beatCount('5.')` === 1.5 (เดิม)
- midi: ความยาวเสียง `5..` = 1.75 × spb
- **ไม่ regress:** `.5` (อ็อกเทฟ) · `5..3` (แพ็ก) · เพลงจริงที่มี `5.` เดิม
- **lint:** R2 (beats) ใช้ `beatCount` → รับจุดคู่อัตโนมัติ ไม่ต้องแก้ notationLint · แต่ให้ **ตัด "double-dot" ออกจากหัวข้อ "จงใจยังไม่ทำ" ใน `docs/us/ps3-editor-rules.md`**
