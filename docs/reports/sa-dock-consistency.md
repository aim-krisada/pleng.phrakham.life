# รายงาน SA — dock สม่ำเสมอ 3 โหมด (sa-dock-consistency)

**branch:** `sa-dock-consistency` (แตกจาก `studio-shell-redesign`) · **docs only · ไม่แตะ code · ห้าม merge/deploy**

## ทำอะไร
วิเคราะห์ dock 3 โหมดจากโค้ดจริง → คุยกับ P'Aim สด → เคาะโครง "slot เดียว" ครบ → เขียน AC พร้อมจ่าย dev

## ส่งมอบ
- `docs/ds/dock-consistency.md` — วิเคราะห์รากปัญหา + โครง slot (R1–R8) + **AC §3 (10 ข้อ)** + ขอบเขตไฟล์
- `docs/design/dock-consistency-wireframe.html` — ภาพร่างโครงเดียว 3 โหมด + แผงเฟือง + ตารางเทียบ

## ข้อค้นพบหลัก
รากปัญหา = **chrome ของ dock มี 2 ชุด** (ฝึกร้องวาดเองใน `SingTransport` · แผ่นเพลง/แก้ไขใช้ chrome ของ `StudioDock`) → grip/⚙/แผง 2 มาตรฐาน → drift

## โครงที่เคาะ (P'Aim 10 ก.ค.)
โครง "ช่องไอคอน (slot) เดียว" ทุกโหมด:
- grip = ซ้ายสุด · ⚙ = ขวาสุด · ทั้งคู่แถวล่างเสมอ
- ทุก element = slot เท่ากัน (ปุ่ม=1 · timeline=ไอคอนยาวในกริด · เลือกท่อน=2 slot)
- cap/บรรทัด: **มือถือ 6 · เดสก์ท็อป 12** · ล้น→พับเข้า **⋯** (เก็บ ⋯ ไว้ · วางก่อน ⚙)
- แผงเฟือง ⚙ = แบบฝึกร้อง (เลื่อนลำดับ+pin) = บ้านเดียวของทุกปุ่มทุกโหมด · ความโปร่ง+จัดปุ่มยุบเข้าแผง
- grip แตะ=ยุบ ลาก=ย้าย (คงเดิม) · คีย์ jianpu = แถวพิเศษเหนือกริด (คงเดิม)
- **เบสโค้ดเดียว:** SingTransport เลิกวาด chrome เอง → ใช้โครง StudioDock ชุดเดียว

## สถานะ / ต่อไป
- ✅ **design เคาะครบ · AC พร้อม** → รอ PM จ่ายสายโค้ด
- ต้นทุน build ที่ PM ต้องรู้: refactor SingTransport+StudioDock ใช้โครงเดียว · ทับ B043 sing-repeat/dock-polish → จัดคิว worktree · คง test เดิม `StudioDock.test.js`/`SongViewer.play.test.js` + เพิ่มเคส cap/pin
