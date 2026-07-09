# Dev brief — edit-fix (หน้าแก้ไข · ขนานกับ B043)

**ฐาน:** `studio-shell-redesign` (merged base · มี dock-core+dock-polish · **ยังไม่มี B043** ที่อยู่บน wt-b043-dev) · branch `wt-edit-fix`
**ที่มา:** P'Aim review หน้าแก้ไข 9 ก.ค. · imgs `docs/pm/realuse-assets/edit-*.png`
**ขนานกับ B043 dev** (sing page · คนละไฟล์) — **ห้ามแตะ** SongViewer/StudioDock/SingTransport/ShellBar (ของ B043)

## Scope (3 fix + 1 compare)
### B048 — default โหมดแสดง = "ต่อกัน" ไม่ใช่ "1 ห้อง/แถว"
- หน้าแก้ไขมี toggle "1 ห้อง/แถว" ⇄ "ต่อกัน" · **default ตอนโหลด = ต่อกัน** (ตอนนี้เป็น 1 ห้อง/แถว)
- ไฟล์: `EditorMode.vue` (state เริ่มต้นของ toggle) · **อิสระ ไม่ชน B043**

### B050 — "ดูผลทั้งเพลง" แล้วเนื้อร้องหาย (bug)
- กดปุ่ม "ดูผลทั้งเพลง" → พรีวิวโชว์**แต่โน้ต ไม่มีเนื้อร้อง** (img `edit-preview-clustered.png`)
- **สอบก่อน:** พรีวิวนี้ render ด้วยอะไร — `SongSheet.vue` หรือ EditorMode-internal?
  - ถ้า **EditorMode-internal** = อิสระ แก้ได้เลย
  - ถ้าใช้ **`SongSheet.vue`** = ⚠️ **flag PM ก่อน** (B043 เฟส 2 จะแตะ SongSheet · ต้องนัดลำดับ — edit-fix merge ก่อน B043 เฟส 2 · หรือแยก)
- แก้ให้เนื้อร้องโผล่ในพรีวิว

### B051 — พรีวิว: ป้าย "♦ ร้อง 1" ขึ้นทุกกล่อง = รกเกิน (คู่ B050)
- ควรโชว์ป้ายท่อน **ครั้งเดียว/บรรทัด** ไม่ใช่ทุกกล่อง · ไฟล์เดียวกับ B050

### B049 — arrangement (ลำดับเพลง) ไม่ตรง prototype (compare + report · ยังไม่ต้องแก้หมด)
- เทียบ UI "ลำดับเพลง" ที่ build (imgs `edit-arrangement-actual.png` + `edit-main-page.png`) กับ prototype `docs/design/ps2-studio-prototype.html`
- **รายงานช่องว่าง (gap) ให้ PM** ว่าต่างตรงไหน · PM ตัดสินว่าจะแก้เลยหรือให้ SA ออกแบบเพิ่ม

## Setup + DoD
```
git switch -c wt-edit-fix studio-shell-redesign
npx vite . --host --port 5325 --strictPort
```
- test/build เขียว · พิสูจน์เบราว์เซอร์ (B050 เนื้อร้องโผล่จริง · B048 default ต่อกัน)
- **B050/B051 ถ้าแตะ SongSheet → บอก PM ก่อน merge** (กันชน B043 เฟส 2)
- report `docs/reports/wt-edit-fix.md` + board §📥 inbox + ping PM ปัจจุบัน "debug pl2 round 1" (ดู board §🎯)
