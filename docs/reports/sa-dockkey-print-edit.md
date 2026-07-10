# Report — SA: DockKey descriptor หน้าพิมพ์ + หน้าแก้ไข

**สาย/branch:** `sa-dockkey-print-edit` · **สั่งโดย:** pm4 · **docs only** (ไม่แตะ code/DB) · **⛔ ยังไม่ merge (PM รวมให้)**

## ทำอะไร
เขียน **ITEMS_PRINT** (หน้าแผ่นเพลง/พิมพ์) + **ITEMS_EDIT** (หน้าแก้ไข) เป็น descriptor ป้อน DockKey core เดิม — ตามใบสั่ง `brief-dockkey-sa-print-edit.md`
ส่งมอบไฟล์เดียว: **`docs/ds/dockkey-print-edit.md`** (ตาราง descriptor 2 ชุด + layout default + บนแถบ vs ใน ⚙ + ข้อเสนอขยาย schema + 4 คำถาม)

## วิธีได้ descriptor (อ่านของจริงในโค้ด แล้วแมป)
- **หน้าพิมพ์** = `Studio.vue` `sheetDock` (ปุ่ม `print` ปุ่มเดียว · `SongSheet` ล็อก `mode=full/letter/songbook`) + `SongViewer.settingDescs` (แสดงผล/คอร์ด/คีย์/ดาวน์โหลด/พิมพ์ = แม่แบบ menu ที่พิสูจน์แล้ว)
- **หน้าแก้ไข** = `EditorMode.vue` `DOCK_DEFAULT` + `editDockTools` (undo/redo/play/playAll/stop/draft/send/download) + `PALETTE` (แป้นโน้ต 2 แถว) · เครื่องมือโครงสร้าง (ห้อง/บรรทัด/ท่อน/pickup/repeat) = **inline ในตาราง ไม่ใช่ dock**
- **ไอคอน** = Lucide id เป๊ะ · ทุกตัวที่ใช้ **มีใน `Icon.vue` registry แล้ว** (grip-vertical·printer·settings·layers·book-open·guitar·key-round·download·undo-2·redo-2·play·square·send·badge-check·circle-play·save·picture-in-picture-2) → build ไม่ต้องเพิ่มไอคอน

## สรุปผล
- **หน้าพิมพ์:** row1 = Grip·พิมพ์(prime)·Aa·⚙ · ตัวเลือกแผ่นเพลง (แสดงผล/แบบแผ่น/คอร์ด/คีย์/ดาวน์โหลด) อยู่ใน ⚙ ปักได้ · **เสียบ core ปัจจุบันได้ทันที ไม่ต้องขยาย schema**
- **หน้าแก้ไข:** band แป้นโน้ต 2 แถว (เต็มกว้าง) + row2 บันทึก(prime)·ฟังทั้งเพลง + row1 Grip·ย้อน·ทำซ้ำ·ฟังท่อน·Aa·⚙ · ⚙ = บันทึกร่าง·ดาวน์โหลด·ดูผลทั้งเพลง
- **ข้อเสนอขยาย schema (เฉพาะ edit · ไม่แตะ DS ฝึกร้อง):** E1 `kind:'keys'` (band คีย์บอร์ด) · E2 `prime` (ปุ่มหลักสีแบรนด์) · E3 `showWhen:'loggedIn'` (gating ตามล็อกอิน/สิทธิ์) — ทั้ง 3 มีของจริงใน `StudioDock`/`editDockTools` แล้ว แค่รับเข้า descriptor schema

## ค้าง / รอเคาะ
- 4 คำถามท้าย DS (default บนแถบหน้าพิมพ์ · Aa บนหน้าแก้ไขเก็บไหม · ตำแหน่งปุ่มพรีวิว · แบบแผ่นให้สลับเองไหม) — ไม่บล็อกการเสียบ core (default state = เท่าพฤติกรรมเดิม)
- นี่คือ **input ให้ dev คลื่นถัดไป** (สาย `dockkey-dev` ทำ core+ฝึกร้องอยู่) → phase 2 เสียบ ITEMS_PRINT (ได้เลย) + ITEMS_EDIT (หลัง E1–E3)

## ไฟล์
- ใหม่: `docs/ds/dockkey-print-edit.md` · `docs/reports/sa-dockkey-print-edit.md`
- แตะ code/DB: **ไม่มี**
