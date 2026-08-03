# Brief — SA: ออกแบบรายการปุ่ม dock หน้าพิมพ์ + หน้าแก้ไข (docs only)

**สั่งโดย:** pm4 · **branch ใหม่:** `git switch -c sa-dockkey-print-edit studio-shell-redesign` · **docs only — ⛔ ไม่แตะ code/DB**
**เป้าหมาย (P'Aim 10 ก.ค.):** dock ทั้ง 3 หน้าใช้ **core เดียวกัน (DockKey)** ต่างแค่ "รายการปุ่ม" · หน้าฝึกร้องเคาะแล้ว → เขียน **ITEMS_PRINT** (หน้าพิมพ์/แผ่นเพลง) + **ITEMS_EDIT** (หน้าแก้ไข) ป้อน core เดิม

## อ่านก่อน (อยู่ในฐานแล้ว)
- `docs/ds/dockkey-library.md` — descriptor schema §2 + กติกา engine + ตัวอย่างหน้าฝึกร้อง (ITEMS_SING) = ต้นแบบรูปแบบที่ต้องเขียนตาม
- `docs/design/dockkey-sing-prototype.html` — เห็น `ITEMS_SING` เป็นโครงจริง
- `docs/design/ข้อกำหนด dockey.docx` (ถ้าเปิดได้) — ข้อกำหนดต้นทาง
- ของเดิมที่ dock 2 หน้านี้เคยมี: หน้าแก้ไข = `EditorMode.vue` DOCK_DEFAULT (แป้นโน้ต/เครื่องมือแก้) · หน้าพิมพ์/แผ่นเพลง = `Studio.vue` (print + download) — ดูว่าปัจจุบันมีปุ่ม/ควบคุมอะไรบ้าง แล้วแมปเป็น descriptor

## ส่งมอบ
1. **`docs/ds/dockkey-print-edit.md`** — ตาราง descriptor 2 ชุด (เหมือนตารางหน้าฝึกร้องใน DS):
   - **ITEMS_PRINT** (หน้าแผ่นเพลง/พิมพ์): ปุ่มพิมพ์ PDF · ดาวน์โหลด · Aa (ถ้าต้องมี) · ตัวเลือกแผ่นเพลง (songbook/คอร์ด/โน้ต) · ฯลฯ — แต่ละตัวระบุ id/name/icon(Lucide จริง)/kind/place{row,col,span,anchor}/default/pinnable/permanent/showWhen
   - **ITEMS_EDIT** (หน้าแก้ไข): แป้นโน้ตตัวเลข · เครื่องมือแก้ (จุด/เขบ็ต/ห้อง/ท่อน) · พรีวิว · Aa · ฯลฯ
   - ระบุ layout default (แถว/คอลัมน์) ของแต่ละหน้า + อะไรอยู่บนแถบ vs ในหน้า Setting (⚙)
2. คง **row1 core คงที่** (Grip ซ้าย · ⚙ ขวา) เหมือนหน้าฝึกร้อง เพื่อความสม่ำเสมอ 3 หน้า
3. ถ้าเจอปุ่ม/ควบคุมที่ core schema ปัจจุบันรับไม่ได้ → ระบุเป็น "ข้อเสนอขยาย schema" ท้ายไฟล์ (ไม่แก้ DS หน้าฝึกร้อง)
4. ไอคอนทุกตัว **หาจาก Lucide ชุดเต็ม** `OneDrive/.../references/svg-icon-lucide/icons/` (1,745 ตัว · memory `reference_lucide_icons`) อย่าเดาว่าไม่มี · อ้าง id เป๊ะ

## หมายเหตุ
- นี่คือ **input ให้ dev รอบถัดไป** (สาย `dockkey-dev` กำลังทำ core+ฝึกร้องอยู่) — ยังไม่ต้อง build · เขียน spec ให้ dev เสียบ core ได้เลย
- ถ้ามีจุดต้องพี่เอมตัดสิน (เช่น ปุ่มไหน default onDock vs inSetting) → รวมเป็นคำถามท้ายไฟล์ ไม่เกิน 3-4 ข้อ

## รายงานกลับ (session-agnostic)
(1) `docs/reports/sa-dockkey-print-edit.md` (2) บรรทัดใน `docs/pm/board.md` §📥 inbox (3) ping PM ปัจจุบัน = **`pm4`** (board §🎯) · ⛔ ห้าม merge เอง (docs — PM รวมให้)
