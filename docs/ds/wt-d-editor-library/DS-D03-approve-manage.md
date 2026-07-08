# DS-D03 — อนุมัติ / ตีกลับ / ลบ / ย้อน

**คู่กับ:** `us/wt-d-editor-library/US-D03-approve-manage.md`

## ไฟล์ที่แตะ
- `src/store.js` (actions) · panel รายการรอตรวจ (ในเมนูจัดการ / `EditorMode`) · ใช้ `src/lib/diff.js` (ย้อนประวัติ)

## จุดเสี่ยงชนกับ worktree อื่น
- ร่วม `store.js` กับ WT-0/D01/D02 — ทำในสาขา WT-D เดียว (ไม่ขนานกับ epic อื่นที่แตะ store)

## design
- actions gated ด้วย `store.canApprove`: `approve` → approved · `reject` → กลับ draft · `delete` · `restore` (จากประวัติ, `diff.js`)

## test
- **unit:** แต่ละ action + gating (ไม่ใช่ approver เรียกไม่ได้)
- **tester:** approver อนุมัติ/ตีกลับ/ลบ/ย้อน เห็นผลถูก · editor ธรรมดาไม่เห็นปุ่ม
