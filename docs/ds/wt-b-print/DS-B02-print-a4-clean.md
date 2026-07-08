# DS-B02 — พิมพ์ A4 สวย ไม่ตกขอบ

**คู่กับ:** `us/wt-b-print/US-B02-print-a4-clean.md`

## ไฟล์ที่แตะ
- `src/components/SongSheet.vue` (+ `@media print` CSS)

## จุดเสี่ยงชนกับ worktree อื่น
- **ระวัง:** ถ้าใส่ print CSS ใน `styles.css` (global) จะทับกับ WT-0/อื่นได้ → **ให้ใส่ print CSS แบบ scoped ใน `SongSheet.vue`** เพื่อเลี่ยงการชน

## design
- `@media print`: ซ่อน shell/controls · จัด A4 · คุม `page-break-inside: avoid` ไม่ให้ตัดกลางท่อน · **footer/หัวกระดาษ** (เช่น `pleng.phrakham.life`) ผ่าน slot หรือ print CSS
- **ปุ่มกดพิมพ์อยู่ที่ WT-0 (`Studio.vue` toolbar โหมดแผ่น = US-06)** เรียก `window.print()` · WT-B รับผิดชอบ *หน้าตาเวลาพิมพ์* · เลือกคีย์ก่อนพิมพ์ (reuse `chords.js` transpose)

## test
- **manual:** print preview A4 ไม่ตกขอบ · ไม่ตัดกลางท่อน
- **unit:** transpose คีย์ก่อนพิมพ์ถูก

## a11y
- งานพิมพ์ contrast ดี (ขาว-ดำ อ่านชัด)
