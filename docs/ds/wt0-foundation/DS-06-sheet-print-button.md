# DS-06 — ปุ่มพิมพ์ในโหมดแผ่นเพลง

**คู่กับ:** `us/wt0-foundation/US-06-sheet-print-button.md`

## ไฟล์ที่แตะ
- `src/views/Studio.vue` (toolbar ของโหมดแผ่น)

## จุดเสี่ยงชนกับ worktree อื่น
- WT-0 (`Studio.vue`) · แยกจากรูปแบบพิมพ์ที่ `SongSheet` (WT-B) — ปุ่ม trigger กับ print-format คนละไฟล์ ไม่ชน

## design
- ปุ่ม 🖨 ในแถบโหมดแผ่น → `window.print()` · WT-B คุมว่าพอ print แล้วหน้าตาเป็นยังไง (`@media print` ใน `SongSheet`)

## test
- **unit:** ปุ่มมีในโหมดแผ่น + คลิกเรียก `window.print`
- **tester:** port 5301 โหมดแผ่น → เห็นปุ่มพิมพ์
