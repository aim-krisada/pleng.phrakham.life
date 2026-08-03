# Brief — B097: undo/redo ให้ถูกต้อง "ครบทุกกรณี" (หน้าแก้ไข)

**ฐาน:** `studio-shell-redesign` · **worktree/branch ใหม่:** `fix-b097-undo-redo` (แตกจากฐาน)
**รั้ว:** แตะแค่ `src/components/EditorMode.vue` + ไฟล์ test ของมัน (`EditorMode.undo.test.js` ฯลฯ) เท่านั้น
**สั่งโดย:** PM (pm11) · ต่อยอด B075 (`0e29bc0` เดิมแก้เฉพาะ meta) — **อย่ารื้อระบบ history เดิม ให้ซ่อม/ต่อยอด (KISS)**

## อาการที่ P'Aim เจอจริง (12 ก.ค.)
> "กดที่ช่องโน้ต อันดูถูก แต่กล่อง text ข้างล่างผิด" + **"อยากให้ครอบคลุมทั้งหมด"**
โน้ต (ช่องบน) กับกล่องเนื้อร้อง (ช่องล่าง) ไม่ตรงกัน โดยเฉพาะหลัง undo/redo หรือหลังสลับท่อน/เที่ยว

## ต้นเหตุที่ PM trace มาให้ (ยืนยันในโค้ด — dev เช็กซ้ำได้)
โครง: ช่องโน้ต = ทำนอง `stanzas` · กล่องข้อความล่าง = เนื้อของ "เที่ยว" ที่เลือก = `lensRow` = `arrangement.value[lensChoice.value]` (ผูก `lensRow.syllables[start+k]`)

1. **lens เด้งผิดเที่ยวหลัง undo/redo** — `applyState()` (~1473) กู้ `stanzas/arrangement/activeStanza` คืนถูก แต่เรียก `resetLens()` (~391) ซึ่ง**เด้ง `lensChoice` กลับไป arrangement row *แรก* ของท่อนเสมอ** · แถม `lensChoice` **ไม่ได้อยู่ใน snapshot** (~1433 `snapshotState`) → ถ้ากำลังแก้เที่ยว 2 อยู่ พอ undo/redo โน้ตเหมือนเดิม (ทำนองท่อนเดียวกัน) แต่กล่องเนื้อล่างเด้งไปโชว์เนื้อเที่ยว 1 = **โน้ตถูก เนื้อผิด** (ตรงอาการเป๊ะ)

2. **การสลับท่อน (แค่ดู) ถูกนับเป็น 1 ขั้น undo** — `snapshotState` ใส่ `activeStanza` เข้าไปด้วย → `selectStanza()` (นำทางล้วน ไม่แก้เนื้อ) ทำให้ `watch(snapshotState)` commit history หนึ่งขั้น → กด Ctrl+Z ครั้งแรกไปย้อน "การสลับท่อน" แทน "การแก้ล่าสุด"

## เป้าหมายแก้ (ครอบทั้งหมด)
- **แยก "สถานะเอกสาร" (meta · opts · stanzas · arrangement) ออกจาก "สถานะมุมมอง" (activeStanza · lensChoice)**
  - เปลี่ยน "เฉพาะมุมมอง" (สลับท่อน/สลับเที่ยว) = **ไม่สร้าง history step ใหม่** (`commitSnapshot` เทียบแค่ส่วนเอกสาร)
  - แต่ **เก็บสถานะมุมมองไว้ใน snapshot** และ **กู้คืนใน `applyState`** (แทน `resetLens()` เด้งเที่ยวแรก) — undo/redo แล้วเนื้อล่างต้องกลับมาโชว์เที่ยว/ท่อนเดิมที่แก้ · กัน index เกินขอบเมื่อ arrangement หด (clamp)
- **undo แล้ว "โน้ต + กล่องเนื้อล่าง" ตรงกันเสมอ** ทุกชนิดการแก้:
  แก้โน้ต · คอร์ด (ตั้ง/แทรก/ล้าง) · เนื้อ/พยางค์ (setSyl · space-ripple · merge/ลบ) · meta (ชื่อ/เลข/คีย์) · opts · เพิ่ม/ลบท่อน · label เที่ยว
- **redo กลับตรงทุกกรณี** (mirror undo · redo tail ไม่เพี้ยน)

## เทสต์ (เพิ่ม · เก็บของเดิมเขียว)
- แก้เนื้อ**เที่ยว 2** (ท่อนเดียวมีหลายเที่ยว) → Ctrl+Z → เนื้อ**และ**โน้ตกลับถูก และยังชี้เที่ยว 2 (regression ตรงอาการ P'Aim)
- **สลับท่อน = ไม่ใช่ undo step** (แก้เนื้อ → สลับท่อนไปดู → Ctrl+Z ต้องย้อน "การแก้เนื้อ" ไม่ใช่พลิกท่อน)
- แก้โน้ต / คอร์ด / เพิ่มท่อน → undo คืน + redo กลับ
- ของเดิมใน `EditorMode.undo.test.js` ต้องยังผ่าน

## DoD + รายงาน (session-agnostic)
- `npx vitest run` เขียวทั้งหมด (`notationLint` "1 failed file" = quirk เดิม ไม่นับ) + `npm run build` ผ่าน
- dev server **`--host`** + ใส่ **Network URL (`http://<IP>:<port>`)** ในรายงาน (พี่เอ/พี่เปาเทสต์มือถือ)
- **verify เบราว์เซอร์จริง (login approver · Supabase live):** เลือกเพลงที่ท่อนหนึ่งมี ≥2 เที่ยว → แก้เนื้อเที่ยว 2 → Ctrl+Z → โน้ต+เนื้อตรงกันบนเที่ยว 2 · สลับท่อนแล้ว Ctrl+Z ไม่ใช่แค่พลิกท่อน · redo กลับตรง — แนบภาพ/บันทึกผล
- รายงาน: เขียน `docs/reports/fix-b097-undo-redo.md` + เพิ่มบรรทัดใน `board.md` §📥 inbox + ping **PM session ปัจจุบันที่ระบุใน `board.md` §🎯** (อย่า hardcode ชื่อสาย)
- ⛔ **ห้าม self-merge เข้าฐาน / ห้าม deploy** — PM cherry-pick เอง หลัง tester gate
