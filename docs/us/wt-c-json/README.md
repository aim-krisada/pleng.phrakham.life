# WT-C JSON พกพา — user stories

**Branch:** `wt-c-json` (จาก `studio-shell-redesign`) · **Port:** 5304 · **DS:** `docs/ds/wt-c-json/`
**ขึ้นกับ:** WT-0 (contract) ต้อง merge ก่อน

**ภาพรวม:** ไฟล์ JSON = "สำเนางานของตัวเอง" สำหรับคนไม่ล็อกอิน (ดาวน์โหลด/อัปโหลด) + ช่องทางส่งขออนุมัติทางอีเมล. รวม logic ไว้ที่ `lib/jsonIO.js` (ใหม่). บางส่วน wired แล้ว (`DownloadTool`, `manageUpload`) — งาน = รวมเป็นระบบ + validate + email-submit

## US
- `US-C01-download-json.md` — ดาวน์โหลดเพลงเป็น JSON
- `US-C02-upload-on-demand.md` — อัปโหลด JSON มาเปิด (on-demand ไม่เก็บในระบบ)
- `US-C03-email-submit.md` — ส่งเพลงขออนุมัติทางอีเมล (คนทำเพลงภายนอก)
- `US-C04-validate-json.md` — ตรวจไฟล์ JSON ก่อนเปิด
