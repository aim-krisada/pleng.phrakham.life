# รายงาน — หัวไทม์ไลน์ชิดขอบ dock หน้าฝึกร้อง (fix)

**branch:** `fix-sing-timeline-edge` (จาก `studio-shell-redesign`) · **commit:** `66915b8`
**ใบสั่ง:** `docs/pm/brief-sing-timeline-edge.md` (pm7 · P'Aim GATE-4 · บล็อก deploy รอบ 7)

## ปัญหา
หน้าฝึกร้อง — หัวสไลด์ไทม์ไลน์ (`.st-kn` วงกลม 16px) ตอน frac=0 **ชิดขอบซ้าย dock ~3px** (วงกลมวางที่ 0% ยื่นเลยจุดเริ่มราง 8px) ดูอึดอัด ไม่หายใจเท่าขอบอื่น

## แก้ (เฉพาะ `src/components/SingTransport.vue`)
**Inset ทั้งราง 10px สองข้าง ภายในเซลล์เดิม 200px (เดสก์ท็อป) / 150px (มือถือ)** — ไม่ทำเซลล์กว้างขึ้น (dock มือถือยัง cap พอดี):
- `.st-trk` = `left:10px; right:10px` (รางเริ่ม-จบตรงช่วงที่หัวเลื่อนได้)
- หัว + แถบท่อน (`.st-seg`) + เส้นแบ่ง (`.st-div`) map 0..1 → ช่วง `[10px, 100%−10px]` ผ่าน `posOf(f) = calc(10px + f*(100% − 20px))` · width ท่อน = `widthOf()` scale เดียวกัน
- `fracAt()` invert ช่วง inset: `(clientX − r.left − 10) / (r.width − 20)` clamp 0..1 → แตะ/ลากยังตรงนิ้ว 1:1
- ลบ `pct` computed เดิม (หัวใช้ `posOf(frac)` แทน)

**เหตุผลค่า inset = 10px:** dock padding = 10px (เดสก์ท็อป) / 8px (มือถือ) · inset 10 ทำให้หัวห่างขอบ dock ≥10px ทุกจอ (มือถือ padding 8 + border 1 + (inset−8)=2 = 11px)

## AC — verify Tier-B สด (Claude Browser MCP · `--host :5401` · `http://192.168.1.124:5401/`)
| จอ | หัว frac=0 ห่างขอบซ้าย | row overflow | ลาก 1:1 |
|---|---|---|---|
| มือถือ 375 | **11px** ✅ (≥10) | ไม่มี ✅ | ตรงนิ้ว ✅ |
| แท็บเล็ต 768 | **13px** ✅ | ไม่มี ✅ | ตรงนิ้ว ✅ |
| เดสก์ท็อป 1280 | **13px** ✅ | ไม่มี ✅ | ตรงนิ้ว (คลิกกลาง 548 → หัว 548) ✅ |
- **AC1** frac=0 ≥10px ทุกจอ ✅ (เดิม 3px)
- **AC2** frac=1 สมมาตร (posOf inset สองข้างเท่ากัน + track inset เท่ากัน → หัวห่างขอบขวาเท่าซ้าย) ✅ by construction · (คลิกให้ถึง frac=1 เป๊ะไม่ได้เพราะ SongViewer quantize เป็น note index — เป็นพฤติกรรม seek เดิม ไม่เกี่ยว geometry)
- **AC3** ไม่ทำเซลล์กว้างขึ้น · dock ไม่ล้นจอ 375 (rowOverflow=false ทุกจอ) ✅
- **AC4** ลาก/แตะ 1:1 (knob center = clickX เป๊ะ) ✅
- **AC5** แถบท่อน/เส้นแบ่ง scale เดียวกับราง (posOf/widthOf) — ยังตรงตำแหน่งสัมพันธ์ราง ✅
- console **0 error** ✅

## DoD
- **vitest 317 passed** (ฐานเดิม · scrub test ยังผ่าน: fracAt กลางราง = 0.5) · `npm run build` ผ่าน
- dev `--host` **Network URL `http://192.168.1.124:5401/`** (P'Aim/พี่เปาลองมือถือ)
- แตะเฉพาะ `SingTransport.vue` (+ temp launch config `ste` :5401) · **ไม่แตะ** DockKey engine/EditorMode/อื่นๆ
- ⛔ ยังไม่ merge/deploy — รอ tester + PM
