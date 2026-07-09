# รายงาน — wt-dock2 (dock-polish · dock-core round 4)

**สาขา:** `wt-dock2` (ฐาน `studio-shell-redesign` · dock-core merged `5656149`) · **brief:** `docs/pm/brief-dock-polish.md`
**ทดสอบสด (มือถือได้):** <http://10.215.141.98:5315>  (dev `--host` พอร์ต 5315)

## สรุปให้ P'Aim (ภาษาคน)
3 จุดจากที่พี่เอมลองใช้จริง (หลัง dock-core รวมแล้ว):
- **A. แผงต่างๆ ไม่ตกขอบจอ** — แผง "ตั้งค่าปุ่ม"/เมนู/⋯ เปิดใกล้ขอบจอแล้วเลื่อนกลับเข้ามาให้เห็นเต็ม
- **B. "ความโปร่ง" ไม่โชว์ default** — ต้องกด "เพิ่ม" เองในตั้งค่าปุ่ม (เหมือนปุ่มอื่น) ไม่ติดแถบตลอดแล้ว
- **C. เรียงปุ่มหน้าฝึกร้องใหม่** — play › วนซ้ำ › คีย์ › ความเร็ว › ฟอนต์ › แสดงผล › พิมพ์ (เอา "คอร์ด" ออกจากค่าเริ่มต้น · ยังเพิ่มเองได้)

## ทำอะไรไป

### A — popup ไม่ตกขอบจอ (core · reusable ทุก popup)
- เพิ่ม `clampPopover()` ใน StudioDock: หลัง popup render → วัด `getBoundingClientRect()` → ถ้าล้นขอบ (บน/ล่าง/ซ้าย/ขวา) `translate` กลับเข้าจอ +ระยะขอบ 8px (แนวเดียว dragMove clamp)
- ใช้ **ตัวเดียวกับทุก popup** — customize · dropdown D7 (คีย์/แสดงผล/ความเร็ว) · ⋯ overflow · ทุกโหมด (query `.sd-pop` ที่เปิดอยู่ · watch `[pop, menuId]`)

### B — ความโปร่ง (blend) = tool เพิ่มเองได้ (core)
- blend เลิกเป็น built-in control ติดแถบ · กลายเป็น **tool ที่ dock เป็นเจ้าของ** id `__blend` เข้าไปอยู่ใน "จักรวาลปุ่ม" (customize เพิ่ม/เอาออก/เรียงได้) แต่ **ไม่อยู่ใน default**
- คลิก blend → เปิดสไลเดอร์ความโปร่งเดิม · ปุ่ม ตั้งค่าปุ่ม(⚙) + ⋯ ยัง built-in ท้ายเสมอ
- `addable` เปลี่ยนไปอ่าน `allTools` (รวม built-in) · onOutside + overflow-click กันเคส blend เปิด/ปิดซ้อน

### C — เรียง default dock ฝึกร้อง (SongViewer config)
- `SING_DEFAULT = ['play','loop','key','tempo','fdown','fup','display','print']` (เดิม `['play','chord','tempo','key','display','loop','fdown','fup','print']`) — เอา `chord` ออกจาก default (ยังอยู่ใน singTools เพิ่มเองได้) · order นี้เป็น SSOT ให้ music dock ของ B043 ด้วย

## ไฟล์ที่แก้
- `src/components/StudioDock.vue` — clampPopover (A) · blend เป็น tool `__blend` (B): allTools/addable/runTool/onOutside/overflow-click + ถอด built-in blend ออกจาก `.sd-rc`
- `src/components/SongViewer.vue` — SING_DEFAULT ใหม่ (C)
- เทสต์: `StudioDock.test.js` (blend เปิดสไลเดอร์ · blend ซ่อน default+เพิ่มได้) · `SongViewer.play.test.js` (harness โชว์ทุก tool กัน chord หาย)

## พิสูจน์แล้ว (เล่นจริงในเบราว์เซอร์ desktop 1280×800)
- **A:** ลากแถบชนขอบบน (top=4) → เปิด customize (เด้งขึ้นบน) → clamp `translate(0, 459px)` → panel อยู่ในจอเต็ม (top 8, bottom 456) ✅
- **B:** default ไม่มี blend บนแถบ ✅ · customize มี "ความโปร่ง" ในรายการเพิ่มได้ ✅ · กดเพิ่ม → ขึ้นแถบ + คลิกเปิดสไลเดอร์ได้ ✅
- **C:** dock ฝึกร้องเรียง play·วนซ้ำ·คีย์·ความเร็ว·ก−·ก+·แสดงผล·พิมพ์ · ไม่มี chord ✅
- ไม่มี console error

## เทสต์ + build
- `npm test` → **114/114 เขียว** (เพิ่มเคส blend hidden-default+addable)
- `npm run build` → ผ่าน

## DoD
- [x] A: popup อยู่ในจอเต็ม (พิสูจน์จริง) · reusable ทุก popup/โหมด
- [x] B: blend เพิ่ม/เอาออกได้ · default ไม่มี
- [x] C: dock ฝึกร้องเรียงตามสั่ง · chord ไม่อยู่ default
- [x] `npm test` เขียว · `npm run build` ผ่าน · `--host` + Network URL
- [x] report + (ฝาก PM เพิ่ม board §📥 inbox — สำเนา board ใน worktree เก่ากว่า กันเขียนทับ) + ping PM

## หมายเหตุ
- transport bar / play-pause แบบไม่มีพื้น = B043 (แยก) · ไม่แตะรอบนี้
- desktop-first เหมือนเดิม · มือถือคง flow เดิม
