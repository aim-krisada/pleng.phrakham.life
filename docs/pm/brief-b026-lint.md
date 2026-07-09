# brief — B026 กฎตรวจโน้ต (lint) R4-R7

**สาย:** dev (algorithm) · worktree ใหม่จากฐาน `studio-shell-redesign` · **1 worktree = 1 branch = 1 port**
**backlog:** B026 (approved) — ดูรายละเอียด 7 กฎใน `docs/backlog.md`

## โจทย์
`src/lib/notationLint.js` มี R1-R3 อยู่แล้ว (เข้าฐานหลัง reconcile · เทสต์ 21 ผ่าน · รันด้วย `node src/lib/notationLint.test.mjs`)
เพิ่ม **R4-R7** (กฎสัญลักษณ์/โครงสร้าง — ไม่ตัดสินทำนอง/คอร์ด/คีย์):
- **R4** เอื้อนแยกช่อง (slur ข้ามช่องผิด)
- **R5** ไทคนละเสียง (tie โน้ตต่างระดับ)
- **R6** ตัวหยุดมี #/จุด (rest ห้ามมี sharp/dot)
- **R7** #3 / b4 / #7 / b1 (ชาร์ป-แฟลตที่ไม่มีจริงในสเกล)

## ไฟล์ (ขอบเขต — กันชนสายอื่น)
- `src/lib/notationLint.js` + เทสต์ (`notationLint.test.mjs` — เพิ่มเคส R4-R7)
- ⛔ **ห้ามแตะ** `notation.js`/`midi.js`/`NoteRow.vue` (B027 กำลังแก้ beatCount) · **ห้ามแตะ `Guide.vue`** (B027 เจ้าของ) · `songSearch.js` (B052)
- R2 (จังหวะไม่ครบ) ใช้ `beatCount` จาก notation.js — **แค่ import ใช้ อย่าแก้** (B027 กำลังเปลี่ยน beatCount)

## Verify
- เพิ่มเคสเทสต์ R4-R7 ใน notationLint.test.mjs · รัน `node src/lib/notationLint.test.mjs` = ผ่านหมด
- `npm run build` ผ่าน · (lint ยังไม่ต้องต่อ UII รอบนี้ = logic ล้วน · การเสียบเข้า EditorMode = งานต่อ กันชน mobile/editor)

## รายงานกลับ (session-agnostic)
`docs/reports/wt-b026.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy
**หมายเหตุ merge:** ให้ B027 merge ก่อน (beatCount) · ถ้า base ขยับ ให้ rebase แล้วรัน test ซ้ำ
