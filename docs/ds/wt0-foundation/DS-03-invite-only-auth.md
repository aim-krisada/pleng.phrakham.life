# DS-03 — invite-only auth

**คู่กับ:** `us/wt0-foundation/US-03-invite-only-auth.md`

## ไฟล์ที่แตะ
- `src/supabase.js` · `src/components/ProfileTool.vue`

## design
- ปิดการสมัครเอง: Supabase Auth settings ปิด public sign-up · `ProfileTool` แสดงแค่ login (อีเมล-รหัส) ไม่มีปุ่มสมัคร
- role เก็บที่ไหน — dev ยืนยันของจริงในโค้ด/Supabase แล้ว **บันทึกกลับที่นี่** (ตัวเลือก: ตาราง `profiles.role` หรือ `app_metadata`) เพื่อให้ WT-D อ้างอิงได้

## จุดเสี่ยงชนกับ worktree อื่น
- WT-D (อนุมัติ) พึ่ง `canApprove` ที่มาจาก role นี้ → ต้องนิยามแหล่ง role ให้ชัดก่อน

## test
- **unit/manual:** ลองสมัครเอง → ทำไม่ได้ · บัญชีที่เชิญ login ได้ · role ถูก map เป็น editor/approver
- **tester:** พี่เอมเชิญ 1 บัญชี → บัญชีนั้น login เห็นสิทธิ์ตามที่ให้
