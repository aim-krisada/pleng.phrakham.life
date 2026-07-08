# WT-B พิมพ์แผ่นเพลง — user stories

**Branch:** `wt-b-print` (จาก `studio-shell-redesign`) · **Port:** 5303 · **DS:** `docs/ds/wt-b-print/`
**ขึ้นกับ:** WT-0 (contract) ต้อง merge ก่อน

**ภาพรวม:** โหมด "แผ่นเพลง" = `SongSheet.vue` + print CSS (build ไว้แล้ว). งานหลัก = ยืนยันหน้าตาพิมพ์ A4 สวย + ต่อ contract (รับ `:song` · อ่านอย่างเดียว)

## US
- `US-B01-view-full-sheet.md` — ดูแผ่นเพลงเต็มพร้อมพิมพ์
- `US-B02-print-a4-clean.md` — พิมพ์ A4 สวย ไม่ตกขอบ (+ เลือกคีย์ก่อนพิมพ์)
