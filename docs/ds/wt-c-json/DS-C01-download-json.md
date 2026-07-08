# DS-C01 — ดาวน์โหลดเพลงเป็น JSON

**คู่กับ:** `us/wt-c-json/US-C01-download-json.md`

## ไฟล์ที่แตะ
- `src/lib/jsonIO.js` (ใหม่) · `src/components/DownloadTool.vue`

## จุดเสี่ยงชนกับ worktree อื่น
- `DownloadTool` ถูกวางใน shell — mount ที่ไหนเป็นของ WT-0; WT-C เป็นเจ้าของ *เนื้อใน* ปุ่ม/ไฟล์นี้

## design
- `jsonIO.exportSong(song)` → สร้าง blob → ดาวน์โหลด · ตั้งชื่อไฟล์จาก `title`

## test
- **unit:** export แล้ว `parse` กลับได้ค่าเท่าเดิม (round-trip)
- **tester:** port 5304 ดาวน์โหลด → เปิดไฟล์เห็นข้อมูลครบ
