# DS — ps3: กฎตรวจโน้ตในโหมดแก้ไข (lint)

US: `docs/us/ps3-editor-rules.md` · Backlog: B026
**อ้างอิงกฎ:** Wikipedia "Numbered musical notation" + โค้ด plugin MuseScore jianpu (`EasyJianpu.qml` = duration; `Jianpu_Numbered_Notation_v410/v46.qml` = pitch/octave/accidental table) ที่ `Downloads/jianpu/`

## ไฟล์ที่เป็นเจ้าของ
- **`src/lib/notationLint.js`** — เครื่องยนต์กฎ (pure · UI-agnostic) · **spike แล้วบน `main`** (R1/R2/R3 + เทสต์ 21 ผ่าน) → รอบนี้เพิ่ม **R4 R5 R6 R7** + ยกเป็น SSOT ของกฎ
- **`src/lib/notationLint.test.mjs`** — เทสต์ dependency-free (`node …test.mjs`) · เพิ่มเคสทุกกฎใหม่ (รวมเคส valid = ต้องเงียบ)
- **ต่อเข้า editor** = แตะ `EditorMode.vue` (แทน `barStatus` เดิม) — **คอขวดสาย editor เดียว** ประสาน ③/I5/WT-D · เครื่องยนต์ (lib) **สร้าง/เทสต์ขนานได้อิสระก่อน**
- อ่านประกอบ: `lib/notation.js` (`parseNotes`/`beatCount`/`expectedBeats`/`groupNotes`) — token มี `{accidental, low, high, pitch, underlines, dotted, tieStart, tieEnd, type}`

## API
```
SEVERITY = { ERROR:'error', WARNING:'warning', HINT:'hint' }
lintBar(noteString,{timeSignature}) -> [{severity,code,message}]   // 1 ห้อง (R1/R2/R3/R6/R7)
lintLine(noteString,{timeSignature}) -> [...{bar}]                 // แยก '|' + bar index (ใช้ R5 ข้ามห้องได้)
lintBoxes(boxes[],{timeSignature}) -> [...]                        // ★ R4 ต้องรู้ขอบเขตช่อง
```

## algorithm รายกฎ (pitch helper: semitone = MAJOR[deg-1] + (#:+1 / b:-1); MAJOR=[0,2,4,5,7,9,11])
- **R3 unreadable** (error): token `type:'raw'` → รายงาน · ถ้ามี → ข้าม R2
- **R2 beats** (warning): `expectedBeats(ts)!=null` & มีโน้ต/ext → `|beatCount-exp|>0.01` → เตือน `got/exp`
- **R1 natural-no-effect** (warning): เดินโน้ตในห้อง เก็บ Set ของ **degree=`pitch@(high-low)`** ที่โดน #/b · เจอ `accidental==='n'` แล้ว degree ไม่อยู่ใน set → เตือน · `n` ล้าง degree ออก
- **R4 slur-split** (warning · บน `boxes[]`): parse แต่ละช่องเดี่ยว → ช่องที่มีวงเล็บ **ไม่สมดุลในตัวเอง** (`(` เปิดไม่ปิดในช่องเดียวกัน) = เอื้อนคร่อมหลายช่อง → เตือน · จับเฉพาะ `( )` (ไม่จับ `{ }` triplet ที่อาจตั้งใจหลายคำ)
- **R5 tie-different-pitch** (warning · บน `lintLine` เพราะไทข้ามห้องได้): เดิน note tokens ตามลำดับ · โน้ตที่ `tieStart` → หา note ตัวถัดไป · ถ้ามันมี `tieEnd` และ **semitone(รวม octave+accidental) ต่างกัน** → เตือน "ไทใช้กับเสียงเดียวกัน; เอื้อนใช้วงเล็บ" · (เสียงเดียวกัน = ปกติ ไม่เตือน)
- **R6 rest-modifier** (warning): token `pitch==='0'` และ (`accidental!==''` หรือ `high>0` หรือ `low>0`) → เตือน · **ไม่จับ** `-`(ext) และ `dotted` (เป็นความยาว ใส่ได้)
- **R7 impossible-accidental** (warning): เฉพาะ 4 กรณีตายตัว — `#` บน `3`/`7` · `b` บน `1`/`4` → เตือนพร้อมเสนอเลขที่ถูก (`#3→4`,`b4→3`,`#7→1`,`b1→7`) · (accidental บน 5 ขั้นโครมาติก #1/#2/#4/#5/#6 + b2/b3/b5/b6/b7 = ถูก ไม่เตือน)

## แสดงผล (ตอนต่อเข้า editor)
- แทน `barStatus()` เดิมด้วยผลจาก lint (superset) · map severity → สี: error=แดง · warning=เหลือง · hint=ฟ้า · ตำแหน่งเดิม (ใต้/ข้างห้อง) · หลายอัน/ห้องได้ · **ไม่ gate** ปุ่มบันทึก/ส่งตรวจ

## ยึด / ระวัง
- เครื่องยนต์ **pure** — ห้ามพึ่ง DOM/Vue (เทสต์ node ได้) · ทุกกฎ = ข้อเท็จจริงของ **ระบบโน้ต** ไม่ใช่ดุลพินิจดนตรี
- **ไม่ตรวจ**: โน้ตถูกทำนอง/คอร์ด/คีย์ (นอกขอบเขต) · double-dot/32/grace/chord-stack = ไม่อยู่ในโมเดลแอป (ดู "จงใจยังไม่ทำ" ใน US)
- R2 เผื่ออนาคต multi-time-sig (Wikipedia): ถ้าเพลงมีหลายอัตราจังหวะ → รับ "เซ็ตของค่าที่ถูก" ไม่ใช่ค่าเดียว (ยังไม่ทำตอนนี้)
- ข้อความเตือน = ภาษาคน สั้น + บอกทางแก้ (สไตล์ที่พี่เปาเข้าใจง่าย) · เทสต์ครอบทุกกฎ + เคส valid (ต้องเงียบ) ก่อน merge
