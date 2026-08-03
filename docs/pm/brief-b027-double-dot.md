# brief — B027 จุดคู่ (double-dot `..` = ×1.75)

**สาย:** dev (algorithm) · worktree ใหม่จากฐาน `studio-shell-redesign` · **1 worktree = 1 branch = 1 port**
**backlog:** B027 (approved) — ดูรายละเอียดเต็มใน `docs/backlog.md`

## โจทย์
ขยายระบบความยาวโน้ต jianpu ให้รองรับ **จุดคู่** (`..` ต่อท้ายโน้ต = ×1.75 ของความยาวฐาน) · ตอนนี้มีแค่จุดเดียว (×1.5)
อ้าง Wikipedia jianpu ("two dots = +¾") · beatCount ต้องคำนวณ ×1.75 ถูก

## ไฟล์ (ขอบเขต — กันชนสายอื่น)
- `src/lib/notation.js` — parse `..` + `beatCount` (×1.75)
- `src/lib/midi.js` — `tokenBeats` (ความยาวเสียงตอนเล่น)
- `src/components/NoteRow.vue` — วาด 2 จุดใต้/บนโน้ต
- `src/views/Guide.vue` — อธิบายจุดคู่ (**Guide.vue = สายนี้เจ้าเดียว** · B026 ไม่แตะ)
- ⛔ **ห้ามแตะ** `notationLint.js` (B026) · `songSearch.js` (B052)

## Verify
- เพิ่ม unit test: parse `..` → beat = base×1.75 · beatCount ห้องที่มีจุดคู่ครบ · midi tokenBeats ถูก
- `npx vitest run --exclude '**/.claude/**'` เขียว + `npm run build` ผ่าน
- เปิด dev `--host` ใส่ Network URL ในรายงาน · ลองพิมพ์โน้ตมีจุดคู่ในโหมดแก้ไข → ดูผลถูก

## รายงานกลับ (session-agnostic)
`docs/reports/wt-b027.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy
**หมายเหตุ merge:** สายนี้ควร merge ก่อน B026 (B026 lint อ่าน beatCount)
