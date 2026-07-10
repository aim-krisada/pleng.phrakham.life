# รายงาน SA — dock สม่ำเสมอ 3 โหมด (sa-dock-consistency)

**branch:** `sa-dock-consistency` (แตกจาก `studio-shell-redesign`) · **docs only · ไม่แตะ code · ห้าม merge/deploy**

## ทำอะไร (pass 1)
วิเคราะห์ dock ปัจจุบันของ 3 โหมด (ฝึกร้อง/แผ่นเพลง/แก้ไข) จากโค้ดจริง → เสนอ layout รวม "dock grammar" เดียว + คำถาม 5 ข้อให้ P'Aim เคาะ

## ส่งมอบ
- `docs/ds/dock-consistency.md` — วิเคราะห์รากปัญหา + ตารางเทียบ 3 โหมด + ข้อเสนอ R1–R6 + ข้อดี-ข้อเสีย + Q1–Q5
- `docs/design/dock-consistency-wireframe.html` — ภาพร่างเทียบ ตอนนี้/เสนอ (เปิด Chromium ดูได้)

## ข้อค้นพบหลัก
รากปัญหา = **chrome ของ dock มี 2 ชุด**: ฝึกร้องวาดเองใน `SingTransport` (StudioDock ซ่อน chrome ตัวเองเมื่อมีแต่ top-region), ส่วนแผ่นเพลง/แก้ไขใช้ chrome ของ `StudioDock` → grip/⚙/แผง วาง 2 มาตรฐาน → drift ตามที่ P'Aim เห็น

## ข้อเสนอย่อ
โครงเดียวทุกโหมด: R1 grip บนซ้าย · R2 ⚙ ล่างซ้าย (ตรง grip · บ้านเดียวของปุ่มรอง) · R3 timeline เต็มแถวของตัวเอง · R4 ปุ่มหลักกลาง · R5 pins ขวา · R6 แผงกางขึ้น-ลากได้-clamp เหมือนกันหมด · Q5: รวมเป็นโครง dock เดียว (sing เลิกวาด chrome เอง)

## สถานะ / ต่อไป
- ⏸ **รอ P'Aim เปิดสายมาคุย** → เคาะ Q1–Q5 → SA เขียน AC เพิ่มใน DS → PM จ่ายสายโค้ด
- ต้นทุน build ที่ PM ต้องรู้: refactor ให้ SingTransport + StudioDock ใช้โครงเดียว · ทับพื้นที่ dock กับ B043/dock-polish → จัดคิว worktree
