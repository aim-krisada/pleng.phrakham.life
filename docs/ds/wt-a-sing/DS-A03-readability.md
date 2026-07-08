# DS-A03 — อ่านง่าย (ฟอนต์ / เนื้อเต็ม / เลือกท่อน)

**คู่กับ:** `us/wt-a-sing/US-A03-readability.md`

## ไฟล์ที่แตะ
- `src/components/SongViewer.vue`

## จุดเสี่ยงชนกับ worktree อื่น
- ไม่มี (ไฟล์เฉพาะ WT-A)

## design
- ปุ่มฟอนต์ ก−/ก+ (คูณขนาดตัวอักษรใน viewer) · toggle เนื้อเต็ม · section chips (คลิก → เลื่อนไปท่อน)

## test
- **unit:** chips map ไปตำแหน่งท่อนถูก
- **tester:** ปรับฟอนต์เห็นใหญ่/เล็กจริง · กด chip เลื่อนถูกท่อน

## a11y
- ฟอนต์ปรับได้ช่วยการมองเห็น · chips เป็นปุ่มจริง (role/tabindex)
