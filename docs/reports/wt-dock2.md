# รายงาน — wt-dock2 (dock-polish · dock-core round 4)

**สาขา:** `wt-dock2` (ฐาน `studio-shell-redesign` · dock-core merged `5656149`) · **brief:** `docs/pm/brief-dock-polish.md`
**ทดสอบสด (มือถือได้):** <http://10.215.141.98:5315>  (dev `--host` พอร์ต 5315)

## สรุปให้ P'Aim (ภาษาคน)
2 จุดจากที่พี่เอมลองใช้จริง (หลัง dock-core รวมแล้ว):
- **A. แผงต่างๆ ไม่ตกขอบจอ** — แผง "ตั้งค่าปุ่ม"/เมนู/⋯ เปิดใกล้ขอบจอแล้วเลื่อนกลับเข้ามาให้เห็นเต็ม
- **C. เรียงปุ่มหน้าฝึกร้องใหม่** — play › วนซ้ำ › คีย์ › ความเร็ว › ฟอนต์ › แสดงผล › พิมพ์ (เอา "คอร์ด" ออกจากค่าเริ่มต้น · ยังเพิ่มเองได้)

> **B (ทำ "ความโปร่ง" ซ่อน/เพิ่มเอง) — ยกเลิกตามที่ P'Aim ปรับโมเดล** · เหตุผล: ถ้าซ่อนแล้วต้องเข้าตั้งค่าไปเพิ่ม/เอาออก = ไม่สมเหตุสมผล · transparency จะย้ายไป "แผงตั้งค่า" (SA ออกแบบแยก · dev ทีหลัง) · blend คงเป็น built-in ท้ายแถบเหมือนเดิม

## ทำอะไรไป

### A — popup ไม่ตกขอบจอ (core · reusable ทุก popup)
- เพิ่ม `clampPopover()` ใน StudioDock: หลัง popup render → วัด `getBoundingClientRect()` → ถ้าล้นขอบ (บน/ล่าง/ซ้าย/ขวา) `translate` กลับเข้าจอ +ระยะขอบ 8px (แนวเดียว dragMove clamp)
- ใช้ **ตัวเดียวกับทุก popup** — customize · dropdown D7 (คีย์/แสดงผล/ความเร็ว) · ⋯ overflow · ทุกโหมด (query `.sd-pop` ที่เปิดอยู่ · watch `[pop, menuId]`)

### B — ยกเลิก (P'Aim ปรับโมเดล)
- ~~ทำ blend เป็น tool ซ่อน/เพิ่มเอง~~ → **ไม่ทำ** · blend คงเป็น built-in ท้ายแถบ (transparency จะย้ายไปแผงตั้งค่า เป็นงาน SA/dev แยก)

### C — เรียง default dock ฝึกร้อง (SongViewer config)
- `SING_DEFAULT = ['play','loop','key','tempo','fdown','fup','display','print']` (เดิม `['play','chord','tempo','key','display','loop','fdown','fup','print']`) — เอา `chord` ออกจาก default (ยังอยู่ใน singTools เพิ่มเองได้) · order นี้เป็น SSOT ให้ music dock ของ B043 ด้วย

## ไฟล์ที่แก้
- `src/components/StudioDock.vue` — clampPopover (A · reusable ทุก popup)
- `src/components/SongViewer.vue` — SING_DEFAULT ใหม่ (C)
- เทสต์: `SongViewer.play.test.js` (harness โชว์ทุก tool กัน chord หาย — C)

## พิสูจน์แล้ว (เล่นจริงในเบราว์เซอร์ desktop 1280×800)
- **A:** ลากแถบชนขอบบน (top=4) → เปิด customize (เด้งขึ้นบน) → clamp `translate` → panel อยู่ในจอเต็ม (top 8) ✅ · reusable ทุก popup/โหมด
- **C:** dock ฝึกร้องเรียง play·วนซ้ำ·คีย์·ความเร็ว·ก−·ก+·แสดงผล·พิมพ์ · ไม่มี chord ✅
- blend คง built-in ท้ายแถบ (B ยกเลิก) · ไม่มี console error

## เทสต์ + build
- `npm test` → **113/113 เขียว**
- `npm run build` → ผ่าน

## DoD
- [x] A: popup อยู่ในจอเต็ม (พิสูจน์จริง) · reusable ทุก popup/โหมด
- [x] C: dock ฝึกร้องเรียงตามสั่ง · chord ไม่อยู่ default
- [–] B: ยกเลิกตาม P'Aim (transparency → แผงตั้งค่า · งานแยก)
- [x] `npm test` เขียว · `npm run build` ผ่าน · `--host` + Network URL
- [x] report + (ฝาก PM เพิ่ม board §📥 inbox — สำเนา board ใน worktree เก่ากว่า กันเขียนทับ) + ping PM

## หมายเหตุ
- transport bar / play-pause แบบไม่มีพื้น = B043 (แยก) · ไม่แตะรอบนี้
- desktop-first เหมือนเดิม · มือถือคง flow เดิม
