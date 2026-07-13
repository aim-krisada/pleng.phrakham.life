# Report — เมนูเพลง parity (Dev · เพลง/pleng)

**Branch:** `claude/wizardly-mcnulty-97ecf3` (fork ยืนยัน merge-base = `ce41874` = HEAD ของ `studio-shell-redesign` ✅ ไม่ใช่ main)
**Brief:** `docs/pm/brief-menu-pleng.md` · **สเปกร่วม:** `docs/ds/menu-drawer-spec.md` (RATIFIED)
**Network URL (verify มือถือจริง):** http://192.168.1.124:5423/ (`--host` · launch config `menu`)

## Objective
ปรับเมนูเพลงให้ตรงสเปกร่วม 2 จุด: (1) alignment ชิดซ้าย · (2) เอาไอคอนหน้า nav links ออก. Refine ไม่ redesign.

## สิ่งที่แก้ (จริง)
- **จุด 2 (เอาไอคอน nav ออก) — ✅ ทำแล้ว.** ลบไอคอนนำหน้าลิงก์ใน **drawer มือถือ** (`ShellBar.vue` `.sb-drawer-nav`): เดิม `รายการเพลง`=list-music · `คู่มือ`=book-open · `พระคำ.ชีวิต`=โลโก้ phrakham (img) · `เกี่ยวกับเรา`=info → ตอนนี้ **ข้อความล้วน**. คง `↗` ท้าย `พระคำ.ชีวิต` (เป็น text external-marker เหมือน desktop `.sb-ext` ไม่ใช่ไอคอนนำหน้า).
- ลบ CSS ที่ตายแล้ว: `.sb-brand-ico`, `.sb-drawer-nav .icn` + const `brandIcon` (ไม่ถูกอ้างอีก).
- ไฟล์: `src/components/ShellBar.vue` + `src/styles.css` (+ `.claude/launch.json` เพิ่ม config `menu` สำหรับ verify worktree — ไม่ใช่โค้ดโปรดักชัน). **ไม่แตะ** EditorMode/SongSheet/Studio teleport.

## จุด 1 (alignment ชิดซ้าย) — ✅ ตรงอยู่แล้วบน base นี้ (ไม่ต้องแก้โค้ด) · หลักฐานแนบ
วัด **live computed** (ไม่เดาจาก source) ทั้งบน **live production + base branch** — เมนูเพลงชิดซ้ายอยู่แล้วทุกจุด:

| surface | ผล (offset จากขอบซ้าย / text-align) |
|---|---|
| desktop nav (≥992px) | ลิงก์เรียงจากซ้ายถัดจากแบรนด์ (left 186→476) · text-only · ไม่มีไอคอน |
| drawer nav (มือถือ) | ทุกลิงก์ `offLeft 17px` · `text-align: start` |
| หัวข้อ "เครื่องมือ" / ตัวอักษรไทย | `offLeft 17–27px` · `start` |

**ทำไม DS ตาราง "สถานะปัจจุบัน" บอกเพลง 🔴 ชิดขวา:** จาก git history "ชิดขวา" คือ **เมนู `▾` dropdown เก่า** (`.sb-mode-menu { left:auto; right:0 }`) ตอนเพลง**ยังไม่มี ☰** (ดู board line 74 "ยังไม่มี ☰"). commit `d189bb5` (13 ก.ค. 19:33) เปลี่ยนเป็น **☰ drawer ชิดซ้าย** ไปแล้ว — แต่ drawer ใหม่ติดไอคอนมา (= จุด 2). DS ratify 20:23 / brief 21:11 หลัง `d189bb5` แต่ตารางยังอ้างสถานะก่อนหน้า. → **alignment จบไปกับ `d189bb5` แล้ว เหลือแค่จุด 2.** ขอ PM ยืนยัน; ถ้า P'Aim เห็น surface ไหน "ชิดขวา" ที่ยังตกหล่น ระบุมา จะแก้รอบต่อไป.

## 🚩 flag เพิ่ม (นอก scope 2 จุด · ไม่ได้แก้ · ให้ PM ตัดสิน)
- **Breakpoint ไม่ตรง DS §4.** DS/brief ระบุ drawer `< 992px` (พระคำ 991.98px) แต่โค้ดเพลงปัจจุบันตัดที่ **767/768px** (`styles.css:441` `min-width:768px` · `:442` `max-width:767px`). ผล: ช่วง **768–991px** เพลงโชว์ desktop nav ขณะพระคำเป็น drawer → parity gap. อยู่นอก "2 จุด" + brief สั่ง "คงไว้ breakpoint" → **ไม่แตะ** (แตะช่วง 768–991 เสี่ยง regress + เกิน scope). เสนอ: แยกเป็น task เล็ก หรือ PM สั่งพับเข้ารอบนี้.

## DoD
- ✅ verify มือถือจริง (emulate) **360 / 390 / 412** + desktop **1000 (≥992)** — ทุกปุ่มบนแถบ `right ≤ viewport`, ไม่มี horizontal overflow (`scrollWidth == innerWidth`). login ขวาสุด: 360→352 · 412→404 (≤ vp).
- ✅ regression: drawer เปิด/ปิดปกติ · font toggle "ก ข ค" + หัวข้อ "เครื่องมือ" ครบ · ปุ่ม login คงบนแถบ · **Studio teleport** `#shell-menus` รับ mode switch ปกติ (ฝึกร้อง/แผ่นเพลง/แก้ไข/จัดการ) · desktop nav ไม่กระทบ.
- ✅ console ไม่มี error.
- ✅ **523 tests ผ่าน** (`vitest run`) · **build ผ่าน** (`vite build`). หมายเหตุ: `notationLint.test.mjs` โชว์ "failed suite" = quirk เดิม (สคริปต์เรียก `process.exit(0)` = สำเร็จ · vitest ฟ้อง) ไม่เกี่ยวไฟล์ที่แก้ (launch.json/ShellBar/styles).
- ✅ เปิด `--host` + Network URL ด้านบน.
- ⛔ **ไม่ merge / ไม่ deploy เอง** — รอ PM gate + tester.

## Next (PM)
1. gate: git-verify diff (เอาเฉพาะ `ShellBar.vue`+`styles.css` · launch.json/board เป็นของ worktree อย่า merge) → tester เทียบ DS ทุกข้อ.
2. เคาะ 2 flag: (ก) ยืนยัน alignment ถือว่าจบ (evidence ด้านบน) หรือชี้ surface ที่ยังชิดขวา · (ข) breakpoint 767→992 แยก task หรือพับเข้ารอบนี้.
3. merge → base `studio-shell-redesign` · deploy เฉพาะเมื่อ P'Aim สั่ง.
