# Dev brief — dock-polish (dock-core round 4)

**ฐาน:** `studio-shell-redesign` (dock-core merged แล้ว `5656149`) · branch ใหม่ `wt-dock2` (fresh จากฐานอัปเดต)
**ที่มา:** P'Aim real-use 9 ก.ค. (หลัง dock-core merged) · 3 จุด (2 core StudioDock + 1 SongViewer config)

## A. (core · StudioDock) popup ตกขอบจอ → เลื่อนให้เห็นเต็ม
- img `realuse-assets/dock-popup-offscreen.png` — แผง "ตั้งค่าปุ่ม" (customize) เปิดแล้ว**ตกขอบบน-ขวา** (แถวบนถูกตัด)
- **ทำเป็น core reusable:** ใช้กับ **ทุก popup ใน dock** — customize panel · dropdown menu (D7 คีย์/แสดงผล/ความเร็ว) · ⋯ overflow · ทุกโหมด
- spec: หลังเปิด popup วัด `getBoundingClientRect()` → ถ้าล้นขอบ (บน/ล่าง/ซ้าย/ขวา) ปรับตำแหน่งให้อยู่ในจอ + margin ~8px (flip ขึ้น/ลง หรือ shift เข้า) — แนวเดียวกับ `dragMove` clamp ที่มีอยู่แล้ว

## B. ~~(core) blend ซ่อน/เพิ่มได้~~ → ❌ **ยกเลิก · แทนด้วยโมเดล "แผงตั้งค่า" (SA ออกแบบแยก)**
- **เหตุผล (P'Aim 9 ก.ค.):** ถ้าซ่อน transparency แล้วต้องปักกลับมาบนแถบเพื่อตั้งค่า แล้วเอาออก = ไม่สมเหตุสมผล (setting ที่ใช้นานๆ ที)
- **โมเดลใหม่:** แยก **แถบ = ปุ่มลัดที่ปัก** ออกจาก **แผงตั้งค่า(⚙) = บ้านของทุก setting ปรับได้แม้ไม่ปักบนแถบ** · transparency อยู่ในแผงตั้งค่า ปรับได้ตลอด
- **→ ไป B043 SA ออกแบบ** (เป็น dock-core concept · dev ทำทีหลัง) · **dock-core รอบนี้ข้าม B · ทำแค่ A + C**

## C. (SongViewer config) เรียง default dock ฝึกร้องใหม่
- img `realuse-assets/sing-dock-reorder.png` · order P'Aim (ซ้าย→ขวา): **play › repeat › key › speed › font › layer › print › setting**
- แก้ `SongViewer.vue` บรรทัด ~214:
  `const SING_DEFAULT = ['play','loop','key','tempo','fdown','fup','display','print']`
  (เดิม `['play','chord','tempo','key','display','loop','fdown','fup','print']`) — **เอา `chord` ออกจาก default** (ยังอยู่ใน singTools เพิ่มเองได้) · เรียงใหม่ตามข้างบน · fdown+fup = "font size"
- หมายเหตุ: order นี้บันทึกใน brief-b043 ด้วย (music dock ของ B043 จะคงลำดับนี้)

## Setup
```
git switch -c wt-dock2 studio-shell-redesign
npx vite . --host --port 5315 --strictPort   # หรือพอร์ตว่างอื่น + --host
```
## DoD
- A: เปิด popup ใกล้ขอบทุกทิศ → อยู่ในจอเต็ม (พิสูจน์จริงในเบราว์เซอร์) · B: blend เพิ่ม/เอาออกได้ · default ไม่มี · C: dock ฝึกร้องเรียงตามสั่ง · chord ไม่อยู่ default
- npm test เขียว · build ผ่าน · --host + Network URL ในรายงาน
- report `docs/reports/wt-dock2.md` + board §📥 inbox + ping PM ปัจจุบัน "debug pl2 round 1"
