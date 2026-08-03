# Brief (Dev · เพลง/pleng) — ปรับเมนูเพลงให้ตรงสเปกร่วม (2 จุด)

**ผู้สั่ง:** PM (pleng) · **ชนิดงาน:** แก้ UI (refine ไม่ redesign) · **ฐาน branch:** `studio-shell-redesign` (ยืนยัน merge-base เอง · ไม่ใช่ main)
**อนุมัติแล้ว:** P'Aim เคาะสเปก 13 ก.ค. (2 PM ratify)

## SSOT อ่านก่อน
**`docs/ds/menu-drawer-spec.md`** — สเปกร่วม pleng↔พระคำ (RATIFIED) · อ่านทั้งไฟล์

## งาน = แก้เพลง 2 จุดเท่านั้น (พระคำไม่ต้องแตะ · baseline แล้ว)
ตามตาราง DS §"สถานะปัจจุบัน":
1. **Alignment → ชิดซ้าย** — เมนู/ลิงก์/หมวด ปัจจุบันเพลง **ชิดขวา** → เปลี่ยนเป็น **ชิดซ้ายทั้งหมด** (ไทย/LTR อ่านซ้าย→ขวา)
2. **เอาไอคอนหน้า nav links ออก** — ลิงก์นำทาง (เพลง/คู่มือ/เกี่ยวกับ) = **ข้อความล้วน** ไม่มีไอคอนนำหน้า

**คงไว้ (อย่าแตะ):**
- font picker 2 ปุ่ม "ก ข ค" = ตรงแล้ว
- breakpoint < 992px → ☰ drawer (align 991.98px ให้ตรงพระคำ)
- **ปุ่ม login คงไว้** (เพลงมีบัญชี — ต่างจากพระคำที่ไม่มี) · ปุ่ม login = แยกบนแถบ ไม่อยู่ใน drawer
- **Studio teleport** (`#shell-left` / `#shell-menus`) ต้องคงทำงาน — เพลงมี ShellBar เดียว
- ลำดับ controls ในหมวด "เครื่องมือ" = per-site (เพลงจัดเอง ไม่ใช่ contract ร่วม)

## Scope ไฟล์ (คาดการณ์ · ยืนยันเอง)
`src/components/ShellBar.vue` + `src/styles*.css` (nav alignment + เอา icon ออก) · อย่าลามไป EditorMode/SongSheet

## DoD
- verify มือถือจริง **360px + 412px** (emulate) + desktop ≥992px · **ทุกปุ่ม right ≤ viewport** (ไม่ล้น) · drawer เปิด/ปิดปกติ
- regression: แผ่นเพลง + dock + Studio teleport ไม่พัง
- เปิด server `--host` + **Network URL** ในรายงาน
- test เดิมไม่แตก + build ผ่าน · **ห้าม merge เอง / ห้าม deploy** — PM gate + tester

## Deliverable (session-agnostic — อย่า hardcode ชื่อ PM)
1. โค้ด + `docs/reports/<branch>.md` (สรุป + Network URL + screenshot/หลักฐาน 360/412)
2. เพิ่ม 1 บรรทัดใต้ `## 📥 inbox → PM` ใน `docs/pm/board.md`
3. รายงานเสร็จ → ping PM ปัจจุบัน (board §RESUME)
