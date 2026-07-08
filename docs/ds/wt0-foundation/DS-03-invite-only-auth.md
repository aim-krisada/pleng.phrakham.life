# DS-03 — invite-only auth

**คู่กับ:** `us/wt0-foundation/US-03-invite-only-auth.md`

## ไฟล์ที่แตะ
- `src/supabase.js` · `src/components/ProfileTool.vue`

## design
- ปิดการสมัครเอง: Supabase Auth settings ปิด public sign-up · `ProfileTool` แสดงแค่ login (อีเมล-รหัส) ไม่มีปุ่มสมัคร
- role เก็บที่ไหน — **ยืนยันจากโค้ด (dev · WT-0):** ตาราง **`profiles.role`** ค่าที่ใช้จริง = `'editor'` | `'approver'` · อ่านใน `store.js › loadProfile()` (`select('role, display_name').eq('id', session.user.id)`) · ผู้ใช้แก้ role เองไม่ได้ (มีแต่ RPC `update_my_display_name` สำหรับชื่อ) · โมดโหมดอื่น (WT-D) อ้างอิงผ่าน `store.tier` / `store.canApprove` ไม่อ่าน `profiles` ตรง ๆ

## จุดเสี่ยงชนกับ worktree อื่น
- WT-D (อนุมัติ) พึ่ง `canApprove` ที่มาจาก role นี้ → ต้องนิยามแหล่ง role ให้ชัดก่อน

## test
- **unit/manual:** ลองสมัครเอง → ทำไม่ได้ · บัญชีที่เชิญ login ได้ · role ถูก map เป็น editor/approver
- **tester:** พี่เอมเชิญ 1 บัญชี → บัญชีนั้น login เห็นสิทธิ์ตามที่ให้
