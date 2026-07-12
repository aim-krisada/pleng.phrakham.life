# Brief — B100: เตือนก่อนออกจากหน้าแก้ไข (กันงานหาย)

**ฐาน:** `studio-shell-redesign` · **worktree/branch ใหม่:** `b100-leave-warning` (แตกจากฐาน · เช็ก `git branch --show-current` ก่อน commit)
**สั่งโดย:** PM (pm11) · ที่มา: P'Aim 12 ก.ค.

## อาการ/ความต้องการ (P'Aim)
กำลังแก้เพลงอยู่ในหน้าแก้ไข แล้ว **เผลอกดเปลี่ยนหน้า / ออกจากหน้า / ปิดแท็บ** → งานที่ยังไม่บันทึกหาย
ต้องการ: **เด้งคำเตือนก่อนออก** ("มีงานที่ยังไม่บันทึก จะออกจริงไหม?") ให้ผู้ใช้ยืนยันก่อน — กันงานหาย

## สิ่งที่ต้องได้
- ถ้ามี**การแก้ที่ยังไม่บันทึก** (dirty) แล้วผู้ใช้พยายามออกจากหน้าแก้ไข (เปลี่ยน route / ปิด-รีเฟรชแท็บ) → เตือนให้ยืนยันก่อน
- ถ้า**ไม่มีการแก้ค้าง** (บันทึก/ไม่ได้แตะ) → ออกได้เลย ไม่กวน
- ถ้ามี auto-save draft อยู่แล้ว → นิยาม "ยังไม่บันทึก" ให้เหมาะ (อย่าเตือนพร่ำเพรื่อจนน่ารำคาญ) — สายที่รับวิเคราะห์เอง

## ขอบเขต (สายที่รับ = วิเคราะห์เอง+ออกแบบ+แก้+verify)
- หาว่า "dirty state" ของ editor ควรจับจากอะไร + วางตัวกันออก (route guard `beforeRouteLeave` + `beforeunload` สำหรับปิด/รีเฟรชแท็บ) — pointer: `EditorMode.vue`, `src/router.js`
- **KISS** ต่อยอดของเดิม · ข้อความเตือนภาษาไทยชัด ตาม `docs/ui-standards.md`
- ระวัง B094 (in-app confirm dialog แทน window.confirm) ที่ค้าง backlog — beforeunload ต้องใช้ browser native (เลี่ยงไม่ได้) แต่ route guard ในแอปใช้ dialog ของเราได้

## ⚠️ ชนไฟล์ (PM เฝ้า)
อาจแตะ `EditorMode.vue` เดียวกับ **B101** (คัดลอก/วาง) ที่จ่ายขนาน → แยก branch จากฐาน · region น่าจะคนละที่ (lifecycle/save vs segment ops) · PM cherry-pick ทีละงาน · เจอ region เดียวกัน flag PM

## DoD + รายงาน (session-agnostic)
- `npx vitest run` เขียว (`notationLint` quirk เดิม ไม่นับ) + `npm run build` ผ่าน · เพิ่ม test ถ้าจับ dirty logic ได้
- dev server **`--host`** + **Network URL** ในรายงาน
- **verify เบราว์เซอร์จริง:** แก้เพลง → กดออก/เปลี่ยนหน้า → เตือนขึ้น · ยกเลิก=อยู่ต่อ · ออก=ไป · บันทึกแล้วออก=ไม่เตือน · เช็กมือถือ — แนบภาพ
- รายงาน: `docs/reports/b100-leave-warning.md` + บรรทัด `board.md` §📥 inbox + ping **PM ปัจจุบัน §🎯 (pm11)** · **report/commit ลง branch ตัวเองเท่านั้น ไม่แตะ base**
- ⛔ **ห้าม self-merge / ห้าม deploy** — tester gate ก่อน แล้ว PM cherry-pick + deploy
