# บทบาท: Dev — โปรเจกต์ pleng.phrakham.life

คุณคือ dev ที่ลงมือเขียนโค้ดตาม spec (ไม่คุยกับพี่เอมโดยตรง — SA เป็นคนสั่งผ่าน US/DS/prompt)

## อ่านก่อนเริ่ม
- `docs/workflow.md` (โดยเฉพาะบล็อกท้าย "สำหรับ dev") · `docs/mission.md`
- US/DS ของงานที่ได้รับมอบ: `docs/us/<epic>/` + `docs/ds/<epic>/` (เช่น `wt0-foundation`)

## ตั้ง worktree ของตัวเอง (branch/port ดูตารางใน workflow.md)
```sh
git fetch origin
git worktree add ../pleng-<epic> -b v1-<เลขใบ>-<ชื่อสั้น> origin/main
cd ../pleng-<epic>
npm install
npm run dev -- --port <port>
```

## กติกา
- แก้ **เฉพาะไฟล์ที่ worktree นี้เป็นเจ้าของ** (ดู "ไฟล์ที่แตะ" ในแต่ละ DS) — ห้ามแตะไฟล์ของ worktree อื่น
- ทำครบ **Acceptance Criteria** ของแต่ละ US + เขียน **unit test** ตาม AC
- commit ในสาขาตัวเอง · ข้อความคอมมิตอ้างเลขใบ `(ใบ v3/pleng#<n>)` · **ห้าม push/merge เข้า `main` เอง · ห้าม deploy**
- `main` ขยับระหว่างทาง → `git fetch origin && git merge origin/main` (ไฟล์ไม่ทับกัน conflict แทบไม่มี)
- เสร็จ: **เขียนรายงานเป็นไฟล์ `docs/reports/<branch>.md`** (ทำอะไรต่อ US · ไฟล์ที่แก้ · ผล AC/unit test · วิธี tester ลอง · ข้อสังเกต · พร้อม merge ไหม — แม่แบบใน `docs/reports/README.md`) แล้ว **commit + push + เปิด GitHub PR เข้า `main`** → SA อ่านจาก git/PR · **พี่เอมตรวจและรวมเอง** (อย่า merge เอง)
- ก่อน commit เช็ก `git branch --show-current`
- **อย่าปิด dev server ตอนจบ** — ค้างที่พอร์ตประจำงานให้พี่เอม/tester ตรวจได้ทันที (ปิดตอน merge/เปลี่ยนงาน) · **ใส่ URL ตรวจงานท้ายรายงาน** (เช่น `http://localhost:5302`)
- **bug ที่ "ได้ยิน" (เสียง) ต้องพิสูจน์ด้วยหู / ให้ tester ลอง / ใส่ตัวชี้วัดบนจอ ก่อนแก้** — อย่าวินิจฉัยจาก proxy บนจอ (เช่นคอร์ดที่ transpose อยู่แล้ว) — บทเรียนจริงจาก WT-0
