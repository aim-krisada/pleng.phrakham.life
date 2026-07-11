# Report — B076: เส้นเอื้อน/ไทบิด → คำนวณ Bézier ตามความกว้างจริง

**branch:** `slur-bezier` (จาก `studio-shell-redesign`) · **ที่มา:** `docs/reports/jianpu-ly-study.md` (ค)#2 · **ping:** pm7
**Network (มือถือ P'Aim):** `http://192.168.1.124:5376/` (dev `--host`, port 5376)

## Objective
เส้นเอื้อน (slur) + ไท (tie) โค้งรูปทรงสวยคงที่ทุกความยาว — สั้น 2 โน้ต ↔ ยาว 8+ โน้ต — ปลายเรียว หนากลาง ไม่บิด/ไม่แบน

## ปัญหาเดิม (ยืนยันในโค้ด)
`NoteRow.vue` วาด slur/tie เป็น SVG **path ตายตัว** ใน `viewBox` คงที่ (`0 0 100 40` / `0 0 10 40`) + `preserveAspectRatio="none"`
→ ตัว path ถูก **ยืดแกน x อย่างเดียว** ให้เท่าความกว้างกลุ่ม. พอเอื้อนยาว จุดควบคุมที่เดิมอยู่ 26/74 (จาก 100) ถูกยืดออกไปไกลมาก
(เช่น เอื้อน 8 โน้ต กว้าง 282px → จุดควบคุมไปอยู่ ~73px/209px) → **ปลายทู่ โดมแบน เส้นบิดผิดรูป**

## วิธีแก้ (หลักการจาก LilyPond — เอาแนวคิด ไม่ลอกโค้ด)
เลิกยืด path สำเร็จ → **คำนวณ `d` ของ Bézier จากความกว้างจริงที่วัดได้** ทุกครั้ง:
- directive `v-arc` (อยู่ใน `NoteRow.vue`) วัด `clientWidth` ของ arc แต่ละเส้น แล้ว **สร้าง `d` ใหม่** + ตั้ง `viewBox="0 0 <W> 40"` ให้เท่าความกว้างจริง → แกน x เป็น **1:1 ไม่ถูกสเกล** (แม้ยังใช้ `preserveAspectRatio="none"` ก็ไม่บิด เพราะ viewBox = ความกว้างจริง)
- **จุดควบคุม (taper) อยู่ห่างปลายคงที่ 26px** ทุกความยาว → ปลายเรียวคมเท่ากันเสมอ, **เฉพาะช่วงกลางที่แบนราบยืดออก** (นี่คือวิธีที่ช่างโน้ตเขียน slur ยาวจริง) · slur สั้นมาก cap taper ไว้ที่ 0.32×span กันเส้นม้วนทับ
- **ความสูงโค้ง (apex) + ความหนากลาง คงที่** (ค่าพิกัด y เดิมทุกตัว: ปลาย y=33, apex y=3, ขอบใน y=17) — ลักษณะ engraving เดิม (filled lens ปลายเรียว หนากลาง) ไม่เปลี่ยน
- tie 2 ครึ่ง (start/end) ใช้หลักเดียวกัน (วัดความกว้างจริง → สร้าง `d`) · ปลายเรียวที่ตัวโน้ต ตัดตรงเต็มความหนาที่ขอบห้อง
- **print:** ผูก `beforeprint` + `matchMedia('print')` ให้ re-measure ก่อนพิมพ์ (เผื่อ print เปลี่ยนขนาดโน้ต) + `ResizeObserver` sync ตอน layout เปลี่ยน (transpose/ฟอนต์)

## ไฟล์ที่แตะ (ตามรั้ว — เฉพาะ NoteRow)
- `src/components/NoteRow.vue` — เพิ่ม `v-arc` directive + ฟังก์ชัน geometry (`slurArc`/`tieStartArc`/`tieEndArc`), template ใช้ directive, comment/CSS อัปเดต
- `src/components/NoteRow.test.js` — เพิ่ม 4 เทสต์ (B076): path เป็น lens ปิด, เอื้อน 8 โน้ตได้ทรงเดียวกัน (ไม่แตก/บิด), tie 2 ครึ่งปิด, viewBox = `0 0 W 40`
- `.claude/launch.json` — เพิ่ม config `b076` (port 5376, `--host`) สำหรับ verify
- ⛔ **ไม่แตะ** `SongSheet.vue` / `DockKey.vue` / `EditorMode.vue` / `styles.css` / `songSearch`

## Verify
- **vitest:** `NoteRow.test.js` 11/11 เขียว · **สวีททั้งชุด 292 เทสต์ผ่าน** (1 "failed file" = `notationLint.test.mjs` เรียก `process.exit(0)` — quirk เดิม ไม่ใช่บั๊ก ไม่เกี่ยว NoteRow)
- **build:** `npm run build` ผ่าน
- **geometry (วัดจริงในเบราว์เซอร์):** viewBox width = clientWidth 1:1 ทุกเส้น (71≈70.5, 106≈105.8, 141≈141.1, 282≈282.2). เอื้อน 3/4/8 โน้ต จุดควบคุมคงที่ `a=30, b=W−26` (taper 26px เท่ากันหมด) → ต่างกันแค่ช่วงกลางที่ยาวขึ้น ไม่บิด
- **3 หน้าไม่ regress:** Guide (8 arc ถูกต้อง viewBox=clientWidth) · Song sheet (arc ที่โชว์ตรงกับความกว้าง · arc ที่ถูกซ่อนเป็น rule เดิมของ SongSheet เอง `.nt.tie-start:last-child .tie-start-arc{display:none}` ไม่เกี่ยวกับการแก้นี้) · editor route โหลดไม่ error · **console ไม่มี error ทั้ง 3 หน้า**
- **before/after:** ดูภาพเทียบใน chat (widget) — เอื้อน 8 โน้ต เดิมปลายทู่/แบน ↔ ใหม่ปลายเรียวโค้งเรียบ

### วิธี reproduce (สำหรับ tester-qa)
เปิด `http://192.168.1.124:5376/#/guide` (มีตัวอย่าง slur/tie) หรือใส่โน้ตทดสอบใน NoteRow: `(1 2)` · `(1 2 3 4)` · เอื้อนยาว `(1 2 3 4 5 6 7 1')` · tie `1~ ~1`

## ยังต้องให้ P'Aim/tester ทำ
- **print PDF จริง:** ผมตรวจได้แค่ handler print ทำงาน (ไม่ throw) + viewBox 1:1 — **การพิมพ์กระดาษจริงต้องให้ P'Aim สั่ง Print → PDF แล้วดูว่าเส้นบนกระดาษไม่บิด** (บทเรียน: DOM check ไม่พิสูจน์หน้ากระดาษ)
- ดูรูปโค้งจริงบนมือถือผ่าน Network URL

## Follow-up (ไม่แก้ในสายนี้ — แจ้ง pm7)
- **B069 cross-bar overlay** ใน `SongSheet.vue` เป็น**คนละกลไก** (overlay ข้ามห้อง ไม่ผ่าน NoteRow). ถ้า overlay นั้นบิดตอนยาวด้วย = งานแยก ต้องแตะ `SongSheet.vue` (DockKey ถืออยู่) — ยังไม่ได้ตรวจในสายนี้ตามรั้ว

## DoD
vitest ✅ · build ✅ · dev `--host` + Network URL ✅ · report + board inbox + ping pm7 ✅ · ⛔ ไม่ merge/deploy (รอ pm7 + P'Aim)
