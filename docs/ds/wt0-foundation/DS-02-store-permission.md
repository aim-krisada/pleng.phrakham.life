# DS-02 — gating รวมศูนย์

**คู่กับ:** `us/wt0-foundation/US-02-store-permission.md`

## ไฟล์ที่แตะ
- `src/store.js` (นิยาม getter) · ใช้ที่ `Dock` / เมนูบันทึก

## design
- getter ใน store:
  - `tier` : `'anon' | 'editor' | 'approver'` (มาจาก session + isApprover)
  - `canStore` : editor ขึ้นไป (เก็บร่าง/ส่งตรวจได้)
  - `canApprove` : approver (อนุมัติ/ลบ/ย้อน)
- ปุ่มบันทึกใน Dock เลือกตาม tier: `anon → 'json'` · `editor → 'draft'/'pending'` · `approver → + 'publish'/ลบ/ย้อน`
- โหมดแก้ **ไม่ล็อกด้วย login** — ใครก็เข้าแก้ได้ ต่างแค่ปลายทางบันทึก

## จุดเสี่ยงชนกับ worktree อื่น
- A/B/C/D จะเรียก getter เหล่านี้ → ต้องมีครบก่อน ไม่งั้นแต่ละ worktree จะไปเช็ก session เองแบบซ้ำซ้อน

## test
- **unit:** ป้อน session 3 แบบ (ไม่ล็อกอิน / editor / approver) → `tier`/`canStore`/`canApprove` คืนค่าถูก
- **tester:** ลอง 3 บัญชี → เห็นปุ่มบันทึกต่างกันตามสิทธิ์
