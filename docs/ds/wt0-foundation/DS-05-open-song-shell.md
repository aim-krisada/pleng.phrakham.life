# DS-05 — เปิด/เลือกเพลง ที่ shell

**คู่กับ:** `us/wt0-foundation/US-05-open-song-shell.md`

## ไฟล์ที่แตะ
- `src/views/Studio.vue` (+ teleport ปุ่มเข้า `ShellBar`)

## จุดเสี่ยงชนกับ worktree อื่น
- เป็นของ WT-0 (`Studio.vue`) — ทำแยกจาก A/B/C/D · ทำได้ขนานกับ A/B/C ได้เพราะ A/B/C ไม่แตะ Studio.vue

## design
- ย้าย "เปิดเพลง" + ค้นหา ออกจาก `EditorMode` → ขึ้น `Studio` shell (teleport เข้า `ShellBar` เหมือนปุ่มโหมด) → โผล่ทุกโหมด
- คง "จัดการ" (ร่าง/เผยแพร่/ลบ) ไว้ใน `EditorMode` (ระดับ editor)

## test
- **unit:** ปุ่มเปิดเพลงเห็นทั้ง 3 โหมด · เลือกเพลง → `song` เปลี่ยนในโหมดปัจจุบัน
- **tester:** port 5301 อยู่โหมดดู → กดเปิดเพลงอื่น → เปลี่ยนได้โดยไม่เข้าโหมดแก้

## a11y
- ปุ่ม/ช่องค้นหา มี label ชัด · คีย์บอร์ดเข้าถึงได้
