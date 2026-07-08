# DS-C02 — อัปโหลด JSON (on-demand)

**คู่กับ:** `us/wt-c-json/US-C02-upload-on-demand.md`

## ไฟล์ที่แตะ
- `src/lib/jsonIO.js` · จุดอัปโหลดเข้า Studio (ผ่าน API/เมนูที่ WT-0 เปิดไว้)

## จุดเสี่ยงชนกับ worktree อื่น
- การ "โหลดเพลงเข้า Studio" ต้องผ่านช่องที่ WT-0 กำหนด (event/route/action) — **WT-C ไม่แก้ `Studio.vue` เอง**

## design
- `jsonIO.importSong(file)` → validate (DS-C04) → คืน song object → Studio โหลดเป็นเพลงปัจจุบัน · **ไม่เรียก store save** (ไม่ลง DB)

## test
- **unit:** import ไฟล์ดี → ได้ song ถูก · ไม่มี network/DB call
- **tester:** อัปโหลด → เพลงเปิดใน Studio ใช้ได้ · refresh แล้วหาย (ยืนยันว่าไม่เก็บ)
