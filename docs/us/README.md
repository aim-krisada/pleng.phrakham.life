# User Stories (US) — วิธีเขียน

**1 story = 1 ไฟล์** (ปิด sprint ทีละใบได้ · แก้คนละ story ไม่กระทบไฟล์กัน)

โครง: `docs/us/<epic>/US-<n>-<slug>.md` · แต่ละ epic มี `README.md` รวมภาพรวม + ลิสต์ US
- **1 epic = 1 worktree** — dev สร้าง US ทั้งชุดของ epic นั้นด้วยกันใน worktree เดียว. แยกไฟล์ US = เพื่อ track/ปิด sprint **ไม่ใช่แยก worktree**
- คู่กับ design spec ไฟล์ต่อไฟล์ที่ `docs/ds/<epic>/DS-<n>-<slug>.md` (เลข/slug ตรงกัน)

แต่ละไฟล์ US มี:
- **Worktree / branch** · **คู่ DS** · **สถานะ** (spec → building → merged → tested)
- **โยงกลับ mission** — ข้อไหนใน `docs/mission.md` ที่ story นี้รับใช้ (traceability ของ ISO 29110)
- **เล่าเป็นภาษาคน** — สำหรับพี่เอมอ่าน+approve · ระดับ ม.ต้น + flow of argument (สถานการณ์ → ปัญหา → สิ่งที่อยากได้ → ประโยชน์) · **นี่คือส่วนที่พี่เอมอนุมัติเป็นหลัก**
- **Story** — *ในฐานะ&lt;ผู้ใช้&gt; ฉันต้องการ&lt;สิ่งที่ทำ&gt; เพื่อ&lt;คุณค่า&gt;* (สรุปสั้นจากด้านบน)
- **Acceptance Criteria (AC)** — checklist (เป็นฐานของ unit test + การทดสอบของ tester)
- **นอกขอบเขต** · (**ที่มา** backlog id ถ้ามี)
