# DS-D02 — ส่งเพลงให้ตรวจ

**คู่กับ:** `us/wt-d-editor-library/US-D02-submit-review.md`

## ไฟล์ที่แตะ
- `src/components/EditorMode.vue` / dock save · `src/store.js` (สถานะ pending)

## จุดเสี่ยงชนกับ worktree อื่น
- ร่วม `store.js` — ทำในสาขา WT-D ต่อจาก D01 (ลำดับเดียวกัน ไม่ขนานกับ epic อื่นที่แตะ store)

## design
- `save('pending')` → เปลี่ยนสถานะเพลงเป็น pending · approver query รายการ pending

## test
- **unit:** เปลี่ยนสถานะ draft → pending
- **tester:** editor ส่งตรวจ → approver เห็นในรายการรอตรวจ
