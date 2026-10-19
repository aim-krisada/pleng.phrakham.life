# ส่งต่อรอบถัดไป

ไฟล์เดียว ชื่อคงที่ **เขียนทับทุกครั้ง** ห้ามต่อท้าย · ในนี้มีแค่ 2 อย่าง คือของที่ยังไม่มีที่อยู่ถาวร
กับลิงก์ไปที่อยู่จริงของแต่ละเรื่อง · **ห้ามคัดลอกสถานะจากใบมาไว้ที่นี่**

**อัปเดตล่าสุด** 19 ต.ค. 2569 · จาก Claude Code เซสชันคลาวด์ · สายงาน `ccr-fed0bad1-id6b5s`

## กำลังค้างอยู่ตรงไหน

1. งาน 3 เรื่องที่พี่เปาแจ้ง 19 ต.ค. 2569 **โค้ดเสร็จและดันขึ้น GitHub แล้ว** อยู่ที่สาย `ccr-fed0bad1-id6b5s`
2. **ยังไม่มีคำขอรวมที่เปิดอยู่** คำขอรวม 55 ถูกปิดไปแล้วเพราะเปิดผิดบัญชี https://github.com/aim-krisada/pleng.phrakham.life/pull/55
- 2.1 เปิดใหม่ด้วยบัญชี `aim-agent` ที่ https://github.com/aim-krisada/pleng.phrakham.life/compare/main...ccr-fed0bad1-id6b5s
- 2.2 base คือ `main` · head คือ `ccr-fed0bad1-id6b5s`
3. **ใบงาน 3 ใบยังไม่ได้เปิด** เนื้อใบเขียนครบแล้ว รอเปิดจริง https://github.com/aim-krisada/pleng.phrakham.life/tree/ccr-fed0bad1-id6b5s/docs/pm/tickets-2026-10-19
4. **ชื่อสายไม่ตรงกติกา** `ccr-fed0bad1-id6b5s` เป็นชื่อที่ระบบเซสชันคลาวด์กำหนดมา กติกาคือ `v1-<เลขใบ>-<ชื่อสั้น>` ได้เลขใบแล้วค่อยเปลี่ยน
5. **คอมมิตทั้ง 3 ยังไม่มีเลขใบต่อท้ายหัวข้อ** ได้เลขใบแล้วต้องเติม `(ใบ v3/pleng#n)` แล้วดันทับสายเดิม

## ทำไมถึงค้าง และต้องทำอะไรถึงจะไปต่อได้

1. **เซสชันคลาวด์เปิดคำขอรวมและใบในนาม `aim-agent` ไม่ได้** proxy ของเซสชันเขียนทับ `Authorization`
   ของทุกคำขอที่ไป `api.github.com` ด้วยกุญแจบัญชีที่พี่เอมเชื่อมไว้ ยิงด้วยกุญแจมั่วหรือไม่ใส่เลย
   ก็ยังได้ `aim-krisada` (ทดสอบ 19 ต.ค. 2569) ⇒ **ต้องยิงจากเครื่องพี่เอม หรือที่อื่นที่ไม่ผ่าน proxy ตัวนี้**
2. **เซสชันคลาวด์ต่ออัมกิตไม่ได้** gateway ตอบ 403 ตอน CONNECT ไป `git.aimagin.com` และไม่มีกุญแจ
- 2.1 แก้โดยเปิด `git.aimagin.com` ใน Allowed domains ของ environment และใส่ `GITLAB_TOKEN_AI_COMPANY`
- 2.2 แก้แล้วเซสชันคลาวด์รอบหลังเปิดใบบนอัมกิตได้เอง
3. **บัญชี AI บน GitHub คือ `aim-agent`** มีสิทธิ์ `write` ใน repo นี้อยู่แล้ว ไม่ต้องเชิญใหม่
4. กติกาเรื่องบัญชีเขียนไว้ที่ https://github.com/aim-krisada/pleng.phrakham.life/blob/ccr-fed0bad1-id6b5s/CLAUDE.md

## ที่อยู่จริงของแต่ละเรื่อง

1. โค้ดกับเหตุผลที่เลือกทางนี้ อยู่ในคอมมิต ไม่ได้สรุปซ้ำที่นี่
- 1.1 แก้เนื้อหาย https://github.com/aim-krisada/pleng.phrakham.life/commit/854db6e
- 1.2 ช่องอ้างอิง https://github.com/aim-krisada/pleng.phrakham.life/commit/2f1ffb2
- 1.3 ธีมพิมพ์เองได้ https://github.com/aim-krisada/pleng.phrakham.life/commit/23ed5b2
2. เนื้อใบงาน 3 ใบ และสคริปต์เปิดใบ อยู่ที่ https://github.com/aim-krisada/pleng.phrakham.life/tree/ccr-fed0bad1-id6b5s/docs/pm/tickets-2026-10-19
3. โครงข้อมูลเพลงที่เพิ่มใหม่ `content.bookRefs` อยู่ที่ https://github.com/aim-krisada/pleng.phrakham.life/blob/ccr-fed0bad1-id6b5s/docs/song-model-v2.md และ https://github.com/aim-krisada/pleng.phrakham.life/blob/ccr-fed0bad1-id6b5s/docs/system-map.md
4. กฎว่าคำบนช่องโน้ตลากเสียงห้ามถูกลบ อยู่ที่ https://github.com/aim-krisada/pleng.phrakham.life/blob/ccr-fed0bad1-id6b5s/docs/song-model-v2.md หัวข้อ Syllable input convention

## ของที่ยังไม่รู้ ต้องให้พี่เอมตอบ

1. ชื่อบัญชีผู้รับผิดชอบกับ cc ของทั้ง 3 ใบ ต้องเป็นคนจริง
2. ใบไปเก็บที่ `follow-up/customer` หรือ `follow-up/internal`
3. มีใบรับเรื่องแม่ของรอบนี้อยู่แล้วหรือยัง ถ้ามี ทั้ง 3 ใบต้องเป็นงานย่อยใต้ใบแม่ ห้ามเปิดคู่ขนาน
4. แม่แบบ WPA ทางการที่ https://git.aimagin.com/aimagin/sop/-/tree/main/iso-29110-5-4/templates เปิดจากคลาวด์ไม่ได้ จึงเขียนตามชื่อหัวข้อที่สกิลระบุ ขอให้ทาบกับแม่แบบจริงก่อนเปิดใบ

## เรื่องที่น่าจะต้องขึ้นสกิลกลาง

1. ข้อที่ว่า proxy ของเซสชันคลาวด์เขียนทับบัญชี GitHub เป็นเรื่องที่คนอื่นจะพลาดซ้ำแน่
   ตอนนี้จดไว้ใน `CLAUDE.md` ของ pleng ก่อน ถ้าเจอรอบสองในโปรเจกต์อื่น ให้ย้ายขึ้น `C:\gl\CLAUDE.md`
