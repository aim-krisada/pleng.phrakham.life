# B075 — Ctrl+Z ย้อนผิดตัว (ข้ามการแก้ล่าสุด)

**Branch:** `fix-undo-latest` (จาก `studio-shell-redesign`, ฐานมี B073 `2ab5628`) · **commit `2660431`** · **⛔ ห้าม merge/deploy**
**ขอบเขต:** แตะ `src/components/EditorMode.vue` + test เท่านั้น (ตามรั้ว B075)

## อาการ (พี่เปา repro)
หน้าแก้ไข กด Ctrl+Z แล้ว "ย้อนไปตัวที่ไม่ใช่การแก้ล่าสุด" — ข้ามการแก้ล่าสุดไปเลย

## ต้นเหตุจริง (ยืนยันด้วย test ที่ fail ก่อนแก้)
ใบสั่งเดาว่า `undo()` ไม่ได้ flush snapshot ที่ค้าง debounce ก่อนถอย — **แต่โค้ดเดิม `undo()` เรียก `commitSnapshot()` อยู่แล้ว** (มีมาตั้งแต่ commit ฐาน 8 ก.ค.) การ flush จึงไม่ใช่ปัญหา

ต้นเหตุที่แท้ = **debounce รวบการแก้ 2 ครั้งที่เร็วกว่า 400ms เป็น snapshot เดียว**:
- watcher เก็บ snapshot แบบ debounce 400ms — commit *หลัง* หยุดแก้ 400ms
- แก้ A → (ยังไม่ถึง 400ms) แก้ B → debounce reset → **A ไม่เคยถูก push เข้า `history` เลย** (ถูก B ทับ)
- ตอนกด Ctrl+Z, `commitSnapshot()` เก็บได้แค่ B (สถานะปัจจุบัน) แล้วถอยไป S0 → **ข้าม A**
- เกิดง่ายมากบน **มือถือ** (กดปุ่ม palette โน้ตรัว ๆ < 400ms) ซึ่ง pleng ทดสอบบนมือถือ

การแก้แบบเว้นจังหวะ (>400ms ต่อครั้ง เช่น พิมพ์ช้า ๆ) commit ครบทุกครั้ง undo ถูกอยู่แล้ว — บั๊กโผล่เฉพาะรัว ๆ

## วิธีแก้ — commit ที่ "ขอบขาขึ้น" (leading edge) ของ burst
```js
watch(snapshotState, () => {
  if (applyingHistory) return
  if (!histTimer) commitSnapshot()   // ← burst เริ่ม (timer ว่าง) = commit ทันที
  scheduleCommit()                    // trailing debounce เก็บสถานะสุดท้ายของ burst เหมือนเดิม
})
```
- การแก้ครั้งแรกของ burst ถูก commit ทันที → เป็น undo step ของตัวเอง แม้ครั้งต่อไปจะมาภายใน 400ms
- ตั้ง `histTimer = null` เมื่อ timer ยิง / ใน `undo()` / ใน `resetHistory()` เพื่อให้ตรวจ "burst ว่าง" (`histTimer === null`) เชื่อถือได้
- การแก้แบบตั้งใจ (เว้น >400ms) ทุกครั้งเป็น leading edge → เป็น step แยกกันหมด (ตรงกับ "แก้ 2-3 ครั้งติด → ย้อนทีละขั้น")
- redo tail ไม่เพี้ยน: `commitSnapshot()` ยัง `splice(histPos+1)` ทิ้ง tail ตอนแก้หลัง undo เหมือนเดิม

**trade-off เล็กน้อย:** พิมพ์คำยาวรวดเดียว → อักษรตัวแรกกลายเป็น step แยก (undo คำนั้นกด 2 ที: คำ→ตัวแรก→ว่าง) ยอมรับได้ และดีกว่าทำการแก้หาย

## DoD
- ✅ **vitest 275 ผ่าน** (ฐาน 270 + ใหม่ 5) — `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'`
  - "1 failed file" = `notationLint.test.mjs` (`process.exit` เดิม ไม่ใช่บั๊ก ไม่ได้แตะ)
- ✅ **build ผ่าน** (`npm run build`)
- ✅ test ใหม่ `src/components/EditorMode.undo.test.js` (mount จริง + ยิง `Ctrl+Z` keydown จริง + reactivity/timer จริง):
  1. แก้ A → แก้ B (commit แล้วทั้งคู่) → Ctrl+Z ได้ **A** (ไม่ใช่ S0/B)
  2. **รัว** แก้ A → แก้ B (ไม่เว้นจังหวะ) → Ctrl+Z ได้ **A** ← เดิม fail (ได้ S0) = repro พี่เปา, ตอนนี้ผ่าน
  3. แก้ B แล้วกด Ctrl+Z ทันที (ก่อน debounce) → flush B แล้วได้ A
  4. แก้ 3 ครั้ง (A/B/C) → Ctrl+Z ทีละขั้น C→B→A→S0
  5. Ctrl+Z แล้ว Ctrl+Shift+Z (redo) กลับได้ B
- ✅ **dev `--host`** — Network URL (มือถือพี่เปา): **http://10.215.141.98:5311/**
  - served code ยืนยัน fix อยู่จริง (curl `EditorMode.vue` เจอ leading-edge commit)

## ตรวจต่อ (พี่เปา)
เปิด http://10.215.141.98:5311/ บนมือถือ → หน้าแก้ไข → กดปุ่มโน้ต/แก้ 2-3 ครั้งติดเร็ว ๆ → Ctrl+Z (หรือปุ่มย้อน) ควรถอยล่าสุดทีละขั้น ไม่ข้าม

## หมายเหตุ shared-dir (ตามคำเตือนใบสั่ง)
main dir ถูกสลับ branch เป็น `studio-shell-redesign` ใต้มือระหว่างทำ (session อื่น) → ย้ายงานเข้า worktree ของ session เอง (`intelligent-matsumoto-d44a32`) แล้ว commit บน `fix-undo-latest` · ไฟล์ `pptx`/`docx` ค้างใน main dir ไม่ใช่ของงานนี้ ไม่แตะ
