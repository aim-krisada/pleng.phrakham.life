# ใบสั่ง (dev) — B090: เส้นจบเพลง เป็น 2 เส้น บาง+หนา (final barline)

**สั่งโดย:** pm7 · **ฐาน:** `studio-shell-redesign` · **branch: `final-barline`** · **ไฟล์: `SongSheet.vue` (+test)**
**ที่มา:** พี่เปา (issue2 · img `docs/backlog-assets/B090-final-barline-thin-thick.png` · เพลง 1) — **"แก้เส้นจบเพลงให้เห็นเป็น 2 เส้น (บางและหนา)"**

## ปัญหา
เส้นจบเพลง (end-of-song) ตอนนี้เป็น**เส้นเดียว** (`.bar-final` · `SongSheet.vue:318` = `<span class="bar-line bar-final">`) · มาตรฐานโน้ตดนตรี = **final barline = เส้นบาง + เส้นหนา** (‖)

## แก้ (มีต้นแบบในไฟล์แล้ว)
`.repeat-mark rep-end` (บรรทัด 320) วาด **thin+bar อยู่แล้ว** (`<i class="rep-thin"/><i class="rep-bar"/>`) → ทำ **`.bar-final` แบบเดียวกัน**: เส้นบาง (ซ้าย) + เส้นหนา (ขวา) ชิดกัน
- แก้ markup ของ `part.type==='end'` (318) ให้มี 2 เส้น (เช่น `<i class="bf-thin"/><i class="bf-thick"/>`) + CSS · หรือ reuse โครง rep-thin/rep-bar
- คงตำแหน่ง/ความสูงให้เข้ากับ bar-line ปกติ · โหมดมีคอร์ด/ไม่มีคอร์ด (`.sheet-no-chord`) ต้องถูกทั้งคู่

## ตรวจเอง + test
- Browser MCP (เพลง 1 / เพลงที่มีจบเพลง): เส้นจบ = บาง+หนา ชัด · ไม่กระทบเส้นห้องปกติ (B082) · repeat-end ยังถูก
- **verify print PDF** (เห็นตอนพิมพ์) · vitest เขียว + build · แตะเฉพาะ SongSheet.vue(+test) · เช็ก branch ก่อน commit

## รายงาน
`docs/reports/final-barline.md` + board §📥 inbox + ping PM=pm7 · ⛔ ไม่ merge/deploy
