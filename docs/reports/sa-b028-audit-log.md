# Report — SA B028: audit log (บันทึกประวัติ) · design

**สาย:** SA B028 (docs only) · branch `sa-b028-audit-log` · **ห้าม merge/deploy**
**ผล:** DS เขียนเสร็จ → `docs/ds/audit-log.md` (design ready · รอ P'Aim เคาะก่อน dev)

## สรุปสั้น (F60+)
ออกแบบระบบ **"บันทึกประวัติ"** — จดทุกครั้งที่มีคนแตะเพลงในคลังกลาง โดย **ให้ DB จดเอง (trigger) = ข้าม/ลบร่องรอยไม่ได้**. จับ **2 มือ** (คนทำเพลง + คนอนุมัติ) · เก็บ **ก่อน→หลัง** เต็ม (ดู diff + ต่อยอดปุ่มย้อนเวอร์ชันได้) · จับ **เฉพาะคลังกลาง** (JSON ส่วนตัวไม่ถูกจดโดยธรรมชาติ).

## จุดที่ค้นเจอ (สำคัญ)
- **มีฐานอยู่แล้ว:** `db/002` มีตาราง `song_revisions` + trigger `log_song_change()` — แต่จับ **แค่ตาราง `songs`** (คลังที่เผยแพร่) + เก็บแค่ op ดิบ (insert/update/delete)
- **ช่องโหว่ 3 จุด:** (1) ไม่จับ `song_drafts` = ฝั่งคนทำเพลงหายทั้งมือ (2) ไม่มีความหมาย — "อนุมัติ+เผยแพร่" แยกไม่ออกจาก insert ธรรมดา (3) เก็บแค่ `editor_id` — ชื่อคนหายถ้า profile เปลี่ยน/ถูกลบ
- → B028 = **วิวัฒน์ฐานเดิม** ให้จับครบ 2 มือ + event มีความหมาย + สำเนาชื่อ ณ ตอนทำ (ไม่ใช่ของใหม่ทั้งหมด)

## DS ครอบอะไร
1. **Data model** — คอลัมน์: `song_ref`(รวมไทม์ไลน์) · `entity`(draft/song) · `event` · `hand`(editor/approver) · `actor_name/role`(สำเนา) · `before/after`(เต็ม) · `op_group`
2. **Trigger 2 มือ** — ตาราง `song_drafts` + `songs` · แปลง op+status transition → event มีความหมาย (`create/edit/submit/approve_publish/reject/edit_published/unpublish`)
3. **แก้ไม่ได้** — RLS อ่านอย่างเดียว · ไม่มี policy เขียนให้ client (แม้ approver) · เขียนได้ทางเดียว = trigger
4. **จุดต่อ UI** — component ใหม่ `RevisionHistory.vue` + `lib/auditLog.js` · ปุ่ม "ประวัติการแก้ไข" ใน ps3sa shell (เฉพาะล็อกอิน) · diff ใช้ `lib/diff.js` เดิม
5. **ต่อยอดปุ่มย้อนเวอร์ชัน** — เก็บ `after` เต็มไว้ → อนาคตเอามาเขียนกลับได้ ไม่ต้องแก้ schema

## กันชน (ไม่ชนใคร)
docs เท่านั้น · ⛔ ไม่แตะ code/DB/SQL/NoteRow/SongSheet/notation/Studio/store · handshake ตอน build = WT-D รอบ 2 (status transitions + `song_ref` เพลงใหม่) + ps3sa (ที่วางปุ่ม)

## รอ P'Aim เคาะ (3 ข้อ — อยู่ท้าย DS)
1. วิวัฒน์ `song_revisions` เดิม vs ตารางใหม่ `audit_log` (แนะ: วิวัฒน์ในที่เดิม)
2. "ถอน" กับ "ลบ" แยกกันไหม (ตอนนี้รวมเป็น `unpublish`)
3. ทำ RPC `approve_and_publish` (atomic) เลยไหม หรือรอบหลัง
