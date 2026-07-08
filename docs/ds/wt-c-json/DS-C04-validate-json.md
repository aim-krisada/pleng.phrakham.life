# DS-C04 — ตรวจไฟล์ JSON

**คู่กับ:** `us/wt-c-json/US-C04-validate-json.md`

## ไฟล์ที่แตะ
- `src/lib/jsonIO.js` · ใช้ `src/lib/songModel.js` (v1/v2)

## จุดเสี่ยงชนกับ worktree อื่น
- `songModel.js` เป็น model กลาง — **แค่เรียกใช้ ไม่แก้** (ถ้าต้องแก้ ประสาน WT-D DS-D04)

## design
- `jsonIO.validate(obj)` → เช็ก schema ด้วย `songModel` → คืน `{ok, song, error}`
- ถ้าเป็น v1 → แปลงเป็น v2 ด้วย `songModel`

## test
- **unit:** ไฟล์ดี / ไฟล์เสีย / ไฟล์ v1 → ผลถูก · `error` เป็นข้อความภาษาคน
- **tester:** อัปโหลดไฟล์มั่ว → เห็นข้อความบอกสาเหตุ ไม่ค้าง

## a11y
- ข้อความ error อ่านง่าย เป็นภาษาคน
