# Brief (Dev · สาย DB/audit) — B028 ระบบ audit log "ใครแก้อะไร"

**ผู้สั่ง:** PM (pleng) · **ชนิดงาน:** เขียนโค้ด (DB migration + lib + component) · **ฐาน branch:** `studio-shell-redesign` (ยืนยัน merge-base เอง ก่อนลงมือ · ไม่ใช่ main)
**เหตุเร่ง:** จะเริ่มมีหลายคนแก้เพลงเร็ว ๆ นี้ → build ก่อนคนเข้าเยอะ (กันช่วง drafts หลุด log)

## SSOT อ่านก่อน
- **`docs/ds/audit-log.md`** — DS เต็ม (schema · events · RPC · §"✅ เคาะแล้ว" 7 ข้อ) · **DS นี้ update แล้ว เชื่อไฟล์ใน base**
- ของเดิมที่มีอยู่: `db/002-draft-review-system.sql:79-108` = ตาราง `song_revisions` + trigger `songs_audit` (log เฉพาะ `songs`) — **วิวัฒน์ในที่เดิม data ไม่หาย**

## คำตัดสิน P'Aim (ยึดตามนี้ · DS §เคาะแล้ว)
1. **จับ `song_drafts` ด้วย** (create/edit/submit/reject ฝั่งคนทำเพลง) ไม่ใช่แค่ `songs`
2. **event มีความหมาย** (ไม่ใช่ insert/update ดิบ): `create·edit·submit·approve_publish·reject·edit_published·unpublish`
3. **RPC `approve_and_publish`** — "อนุมัติ+เผยแพร่ = 1 เหตุการณ์ ใครกดชัด"
4. ⭐ **ต้อง snapshot `actor_name` (+`actor_role`) ลง log ตอนเขียน** — **ชื่อคนแก้ต้องไม่หาย** แม้ user ถูกลบ/เปลี่ยนชื่อ (P'Aim ยืนยัน 13 ก.ค. · กลับคำจากร่างเดิม) · เก็บ `actor_id` fk ไว้ด้วย · **อย่า** map ชื่อตอนแสดงอย่างเดียว
5. วิวัฒน์ `song_revisions` ที่เดิม (ไม่ทำตารางใหม่)
6. `unpublish` เดียวไปก่อน (ยังไม่แยกถอน/ลบ)
7. visibility: logged-in อ่าน log ได้หมด ไม่แยก role (คง RLS เดิม) — audit integrity = แก้ log ไม่ได้ (security definer + no client write) **ต้องคงคุณสมบัตินี้**

## Scope ไฟล์
- **`db/004-*.sql`** — วิวัฒน์ trigger จับ 2 มือ (`songs` + `song_drafts`) · map เป็น meaningful event · snapshot actor_name/actor_role · RPC `approve_and_publish` (1 op_group)
- **`src/lib/auditLog.js`** — อ่าน/รวม log ให้ UI (event → ข้อความไทย/ไอคอน · เรียงใหม่→เก่า)
- **`src/components/RevisionHistory.vue`** — หน้า/พาเนล "ประวัติการแก้ไข": เวลา · ผู้ทำ (actor_name) · event (ป้าย/ไอคอน · แยกสี editor/approver)
- **`EditorMode.vue`** — wiring เท่าที่จำเป็น: เรียก RPC ตอน approve+publish · เปิดพาเนล RevisionHistory · **⚠️ อย่าแตะโซนปุ่ม "✓ ตรวจแล้ว" (~บรรทัด 2361) — สาย "ป้ายสถานะตรวจเพลง" ทำโซนนั้นพร้อมกัน** เลี่ยง merge ชน · แก้เฉพาะโซน approve()/saveDirect() (~1292-1408, 2388)

## DoD
- unit test: trigger เขียน log ครบทุก event (รวม song_drafts) + actor_name snapshot ไม่หายเมื่อ profile หาย · RPC = 1 op_group
- เปิด server `--host` + ใส่ **Network URL (`http://<IP>:<port>`)** ในรายงาน (พี่เอม/พี่เปาทดสอบมือถือ)
- test เดิมไม่แตก + build ผ่าน
- **ห้าม merge เอง / ห้าม deploy** — PM gate + tester เทียบ DS เต็มทุกข้อ

## Deliverable (session-agnostic — อย่า hardcode ชื่อ PM)
1. โค้ดตาม scope + `docs/reports/<branch>.md` (สรุปสิ่งที่ทำ + Network URL + วิธี verify)
2. เพิ่ม 1 บรรทัดใต้ `## 📥 inbox → PM` ใน `docs/pm/board.md`
3. รายงานเสร็จ → ping PM ปัจจุบัน (ดู board §RESUME) · KISS · อธิบายภาษาคนได้
