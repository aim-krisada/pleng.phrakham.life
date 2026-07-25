# รอบ 1 — สรุป + จุดที่ผมตรวจเอง (ก่อนเขียนลงสเปก)

**แชต Gemini (Pro · ล็อกอินอยู่):** https://gemini.google.com/app — ชื่อที่ตั้งใจ `pleng-caret-insert-delete-2026-07-24` (rename ผ่าน CDP ไม่ได้ ใช้ transcript บน disk เป็นหลักฐาน)
**ส่งเต็ม (ที่ G ตอบจริง) = `05-flat-sent.md` · คำตอบเต็ม = `06-round1-resp-FULL.md`** (ไฟล์ 01-04 = ความพยายามก่อนหน้าที่ Quill ตัดข้อความ/G เข้าใจผิด — เก็บไว้เป็น audit trail)

## G ค้านอะไร (และผมรับ)
- 🔴 **G ค้านโมเดลไฮบริดเดิมของผม** ("caret + active = ตัวซ้าย/ขวาสลับที่ g0") ว่าเป็น **context-dependent rule → muscle memory พัง** (# จะตกซ้ายหรือขวาขึ้นกับตำแหน่ง) — **ผมรับ ถูกต้อง** → เปลี่ยนไปใช้ **cursor เปลี่ยนรูปตามโหมด** (Block=ทับ / Line Caret=แทรก) ไม่รวม selection+caret เข้าด้วยกัน
- **G เห็นด้วยกับผม/ทีม (Q2):** คง overwrite เป็น default (optimize happy-path แก้พิตช์ 80-90%)

## จุดที่ผมเปิดตรวจเอง (ไม่เชื่อ G ลอย ๆ — G เคยอ้าง MuseScore ผิดเวอร์ชัน)
| ข้ออ้าง G | ตรวจกับของจริง | ผล |
|---|---|---|
| Dorico: default พิมพ์=ทับที่ caret · กด **I** = โหมดแทรก (ดันขวา) · Backspace ลบก่อน caret | [Dorico Pro Help — Insert mode](https://www.steinberg.help/r/dorico-pro/6.1/en/dorico/topics/write_mode/write_mode_insert_mode/write_mode_insert_mode_c.html) : "notes inserted before existing music ahead of the caret... pushed ahead" · key = **I** toggles · Insert ON→pull-tight, Insert OFF→become rests | ✅ ตรง (แม่นกว่าที่ G สรุป: **Dorico default mode ลบ=กลายเป็น rest** ไม่ใช่ pull-tight — ตรงกับที่ pleng ทำอยู่วันนี้พอดี) |
| Backspace ลบตัวก่อน cursor · Delete ลบตัวที่/หลัง cursor | [Wikipedia — Backspace](https://en.wikipedia.org/wiki/Backspace) : "deletes the character before the cursor" · Delete "deletes text at or following the cursor position" | ✅ ตรง — เป็นฐานของทิศ Backspace/Delete |
| MuseScore 4: insert-before-first ผ่าน block-select + Insert mode (Shift+I/Ctrl+Shift+I) | **ไม่ยืนยัน keybinding** (G เคยพลาด MuseScore keys) → **ไม่อ้าง keybinding MS4 ในสเปก** · ใช้ Dorico+Wikipedia เป็นฐานแทน | ⚠️ ตัดทิ้ง ไม่เอาเข้าสเปก |
| มือถือ: อย่าให้แตะช่องบาง <44px | Apple HIG 44pt / Material 48dp / WCAG 2.5.8 AA=24px (memory `wcag-target-size-aa-24-not-44`) | ✅ หลัก · สเปกใช้: แตะโดนโน้ต=select block, ปุ่มบนจอ ≥44px |

## จุดที่ผมปรับต่างจาก G (ตัดสินใจเอง + เหตุผล)
- **Del/Backspace ให้ "ทิศคงที่" ข้ามทั้ง 2 โหมด** (ไม่ใช่ Dorico ที่ default=rest / insert=pull-tight คนละแบบ) → กันความสับสนแบบเดียวกับที่ G เตือน: **Backspace ลบตัวซ้ายเสมอ · Delete ลบตัวขวา/ตัวที่เลือกเสมอ (pull-tight)** · "ทำเป็น rest อยู่กับที่" ย้ายไป **พิมพ์ 0** (ทำได้อยู่แล้ว) — ได้สิ่งที่พี่เปาอยากได้ + ทิศไม่กลับ
- **Bar overflow ของ G ไม่ applies** — pleng bars = เส้นแบ่งอิสระ (`{type:'bar'}` · ไม่มี time-signature/นับ beat ใน `songEdit.js`) → แทรกโน้ต = ห้องยาวขึ้นเฉย ๆ ไม่ล้น · (dev/PM ยืนยันว่าไม่มี beat-sum validation)
