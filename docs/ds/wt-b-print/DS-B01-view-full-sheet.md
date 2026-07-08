# DS-B01 — ดูแผ่นเพลงเต็ม

**คู่กับ:** `us/wt-b-print/US-B01-view-full-sheet.md`

## ไฟล์ที่แตะ
- `src/components/SongSheet.vue`

## จุดเสี่ยงชนกับ worktree อื่น
- ไม่มี (ไฟล์เฉพาะ WT-B) — รับ `:song` ตาม contract

## design
- `SongSheet` render `resolveContent` ของทั้งเพลง (เรียงตามลำดับการร้อง) · โหมด sheet ใน Studio mount ตัวนี้

## test
- **unit:** render ครบทุกท่อน (โน้ต/คอร์ด/เนื้อ)
- **tester:** port 5303 เปิดดู → เห็นครบทั้งเพลง

## a11y
- โครงหัวข้อ/ลำดับอ่านได้ด้วย screen reader
