# Reports — รายงานส่งงานจาก dev (handoff ผ่าน git)

dev **ไม่ส่งรายงานเป็นข้อความให้พี่เอม copy-paste** — แต่เขียนเป็นไฟล์ commit ลง git
SA อ่านไฟล์นี้จาก git (SSOT) แล้วตัดสิน merge

**ที่อยู่ไฟล์:** `docs/reports/<branch>.md` (เช่น `wt0-foundation.md`) · commit บนสาขาของ dev เอง
SA อ่านได้จาก worktree ของ dev โดยตรง หรือ `git show <branch>:docs/reports/<branch>.md`

## แม่แบบรายงาน (dev ก๊อปไปเติม)
```markdown
# รายงาน — <branch> (<epic>)
**รอบ:** <ครั้งที่/บริบท>
**สถานะ:** เสร็จ / ติดปัญหา

## ทำอะไรไปบ้าง (ต่อ US)
- US-01: ✅ / ⬜ — <สรุปสั้น>
- US-02: ...

## ไฟล์ที่แก้
- `path/to/file` — <ทำอะไร>

## ผลทดสอบ
- unit: <ผ่าน/ไม่ผ่าน + จุดเด่น>
- วิธี tester ลอง: เปิด port 53xx → <ขั้นตอน>

## ข้อสังเกต / คำถามถึง SA
- <ถ้ามี>

## พร้อม merge ไหม
ใช่ / ไม่ (เพราะ ...)
```
