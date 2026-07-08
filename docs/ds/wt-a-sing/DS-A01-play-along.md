# DS-A01 — เล่นตามแบบคาราโอเกะ

**คู่กับ:** `us/wt-a-sing/US-A01-play-along.md`

## ไฟล์ที่แตะ
- `src/components/SongViewer.vue` · `src/lib/midi.js`

## จุดเสี่ยงชนกับ worktree อื่น
- ไม่มี (ไฟล์เฉพาะของ WT-A) — แค่ต้องรับ props ตาม contract WT-0 (`:song`, `:tier`) และไม่ emit `save`

## design
- `SongViewer` รับ `song` → render sheet + play engine (`midi.js`) → ไฮไลต์ token ปัจจุบันระหว่างเล่น
- โหมด view = อ่านอย่างเดียว: ไม่มีปุ่มบันทึก/แก้

## test
- **unit:** play เริ่ม/หยุด · index ไฮไลต์เลื่อนตามเวลา
- **tester:** port 5302 กดเล่น → เห็นไฮไลต์วิ่งตามเสียง หยุด/เล่นต่อได้

## a11y
- ปุ่มเล่น/หยุดมี `aria-label` · ไฮไลต์ contrast พอ · ควบคุมด้วยคีย์บอร์ดได้
