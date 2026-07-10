# B057 — lint repeat/volta consistency (R8, R9)

**Branch:** `b057-lint-repeat-volta` (จาก `studio-shell-redesign`) · **ห้าม merge/deploy**
**ขอบเขต:** เพิ่มกฎลงใน `src/lib/notationLint.js` + test เท่านั้น (ต่อ B026 R1–R7)

## ทำอะไร

เพิ่มกฎตรวจ **ความสอดคล้องของเครื่องหมายเล่นซ้ำ + volta** อีก 2 กฎ ในโครงเดียวกับ R1–R7
(pure · UI-agnostic · message ภาษาไทย · return `{severity, code, message}`).

- **R8 `repeat-unbalanced`** — `‖:` (เปิดเล่นซ้ำ) ต้องจับคู่ `:‖` (ปิด) ให้ครบ
  - `‖:` ไม่มี `:‖` ปิด → เตือน
  - `:‖` ไม่มี `‖:` เปิดมาก่อน → เตือน
  - `‖: ‖:` (เปิดซ้อน ไม่ปิดอันแรก) → เตือน · `:‖ :‖` (ปิดเกิน) → เตือน
- **R9 volta (จบรอบ)** — ต้องครบคู่ + เรียงถูก
  - `volta-incomplete` — มีจบรอบ 1 แต่ขาดจบรอบ 2 (หรือกลับกัน)
  - `volta-order` — จบรอบ 2 มาก่อนจบรอบ 1 หรือเลขรอบซ้ำ

## จุดออกแบบสำคัญ (SA note)

เครื่องหมายเล่นซ้ำ/volta **ไม่ใช่ token ในสตริงโน้ต** — มันเป็น structural item ของ content model
(`{type:'repeat-start'|'repeat-end'|'volta',num}`) ที่ `midi.js` + `SongSheet.vue` เดินอ่าน อยู่ **ระหว่างห้อง** ไม่ใช่ในห้อง.
ดังนั้น R8/R9 จึง **ไม่เสียบเข้า `lintBar`** (ที่ parse สตริงโน้ตทีละห้อง) แต่เป็น export ใหม่ระดับเพลง/บรรทัด:

```js
lintRepeatVolta(marks)   // marks = ordered item list ของบรรทัด/เพลง; item ที่ไม่ใช่ marker ถูกข้าม
```

รับ item list เดิมที่ SongSheet/midi เดินอยู่แล้วส่งเข้ามาตรง ๆ ได้ (filter เอาเฉพาะ marker)
→ ผู้เรียก (editor UI / DA `parse_song.py`) เตรียม marks แล้วเรียก. **การเสียบเข้า pipeline เหล่านั้น = คนละงาน (ไม่อยู่ในรอบนี้)**

repeat ในโมเดลนี้เป็นแบบ **แบน/ต่อเนื่อง** (ไม่ nested) — เปิด `‖:` แล้วปิด `:‖` สลับกันไป
(ตรงกับ `midi.js` ที่ track `repStart` ล่าสุด) ดังนั้น R8 ใช้ state machine "สลับ open/close" ไม่ใช่ balanced bracket.

## Verify

- `node src/lib/notationLint.test.mjs` → **72 passed, 0 failed** (เพิ่ม 21 เคสใหม่ ครอบ R8/R9 ผ่าน+ไม่ผ่าน + edge non-array/empty)
- `npx vitest run --exclude '**/.claude/**'` → **239 passed** (ของเดิมไม่พัง)
  - หมายเหตุ: suite `notationLint.test.mjs` ขึ้น "failed" ใน vitest เพราะไฟล์ standalone เรียก `process.exit()` — **มีมาก่อนแล้ว** (base ก็เป็น เพราะไฟล์นี้ออกแบบให้รันด้วย `node` ไม่ใช่ vitest) ไม่ใช่ regression จากงานนี้
- `npm run build` → **เขียว** (116 modules, built in ~2s)

## กันชน (ยืนยันไม่หลุด)

แตะแค่ 2 ไฟล์: `src/lib/notationLint.js` + `src/lib/notationLint.test.mjs`
ไม่แตะ `notation.js` / `NoteRow` / `EditorMode` / UI / data

## ต่อไป (นอกขอบเขต — ให้ PM จัดคิว)

- เสียบ `lintRepeatVolta` เข้า editor UI (เตือนตอนแก้) + DA `parse_song.py` (จับ error ก่อน import)
- ต้องมีตัว extract marks จาก content → marks list ให้ผู้เรียก
