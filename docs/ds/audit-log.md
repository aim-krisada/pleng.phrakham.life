# DS — audit-log: บันทึกประวัติ "ใครทำอะไรกับเพลงในคลัง"

US: `docs/us/audit-log.md` · Backlog: **B028** · โยง mission: สิทธิ์ 3 tier + เส้นแบ่ง "เก็บเข้าคลังได้ไหม"
ธีมใหม่ **"บันทึกประวัติ"** — ไฟล์/ตารางของตัวเอง ไม่ทับ editor (`ps3-editor`) หรือ กฎโน้ต (`sa-jianpu-rules`)

## ภาพรวม (F60+)
จดทุกครั้งที่มีคนแตะเพลง**ในคลังกลาง** โดย **ให้ฐานข้อมูลจดเอง (trigger)** — คนทำงานข้าม/ลบร่องรอยไม่ได้.
จับ **2 มือ**: คนทำเพลง (สร้าง/แก้/ส่งตรวจ) + คนอนุมัติ (อนุมัติ+เผยแพร่/ตีกลับ/ถอน-ลบ).
เก็บ **ก่อน→หลัง** ทุกครั้ง (เปิดดู diff ได้ · เก็บสำเนาเต็มไว้ต่อยอดปุ่มย้อนเวอร์ชันในอนาคต).
ประวัติ **อ่านอย่างเดียว** — แม้แต่ approver ก็แก้/ลบรายการไม่ได้.

## ต่อยอดจากของเดิม (สำคัญ — ไม่ใช่ของใหม่ทั้งหมด)
`db/002` มีแล้ว: ตาราง `song_revisions` + trigger `log_song_change()` บนตาราง `songs`.
**ช่องโหว่ที่ต้องอุด:**
1. จับแค่ `songs` (คลังที่เผยแพร่แล้ว) — **ไม่จับ `song_drafts`** = ฝั่งคนทำเพลง (สร้าง/แก้/ส่งตรวจ/ถูกตีกลับ) หายทั้งมือ
2. เก็บแค่ `insert/update/delete` ดิบ — **ไม่รู้ความหมาย** เช่น "อนุมัติ+เผยแพร่" โผล่มาเป็นแค่ insert ธรรมดา แยกไม่ออกว่าใครทำเพลงเป็นสาธารณะ
3. เก็บแค่ `editor_id` — ถ้าผู้ใช้ถูกลบ/เปลี่ยนชื่อ **ชื่อคนทำหาย** อ่านประวัติเก่าไม่รู้เรื่อง
→ B028 = **วิวัฒน์ `song_revisions` เป็นตารางบันทึกเดียวที่จับครบ 2 มือ + มีความหมาย** (build เป็น `db/004`, dev เขียน — DS นี้ออกแบบเฉย ๆ)

---

## 1. Data model — ตารางบันทึก (ออกแบบ · ต่อจาก `song_revisions`)

| คอลัมน์ | ชนิด | ความหมาย |
|---|---|---|
| `id` | bigint identity | รหัสรายการ (เรียงเวลาในตัว) |
| `song_ref` | uuid | **กุญแจรวมไทม์ไลน์ของเพลง 1 เพลง** ตลอดสาย (ร่าง→เผยแพร่) — ดู §2 |
| `entity` | text | แตะที่ไหน: `draft` (ฝั่งทำเพลง) \| `song` (คลังเผยแพร่) |
| `event` | text | **ความหมาย**: `create · edit · submit · approve_publish · reject · edit_published · unpublish` (ดู §3) |
| `hand` | text | มือไหน: `editor` (คนทำเพลง) \| `approver` (คนอนุมัติ) — ให้ UI แยกขั้นได้ (US-3) |
| `actor_id` | uuid | ผู้ทำ (fk auth.users, ปล่อยว่างได้ถ้าผู้ใช้ถูกลบ) |
| `actor_name` | text | **สำเนาชื่อ ณ ตอนทำ** — อ่านประวัติเก่าได้แม้ profile เปลี่ยน/หาย |
| `actor_role` | text | สำเนา role ณ ตอนทำ (`editor`/`approver`) |
| `before` | jsonb | สำเนา**เต็ม**ของเพลงก่อนแก้ (null = สร้างใหม่) |
| `after` | jsonb | สำเนา**เต็ม**ของเพลงหลังแก้ (null = ลบ) |
| `note` | text | หมายเหตุ เช่น เหตุผลตีกลับ (`review_comment`) |
| `op_group` | uuid | รวมหลายแถวที่เป็นเหตุการณ์เดียว (ดู §4) |
| `created_at` | timestamptz | เวลา (default now()) |

**ยึด:** `before`/`after` เก็บ**เนื้อเพลงเต็ม** (content jsonb + ชื่อ/เลข) ไม่ใช่แค่ diff — เพื่อ (ก) เทียบ ก่อน↔หลัง ได้ (US-2) (ข) **ปุ่มย้อนเวอร์ชันในอนาคตแค่เอา `after` ของแถวเก่ามาเขียนกลับ = ไม่ต้องแก้ schema ตอนนั้น**.

## 2. รวมไทม์ไลน์ 1 เพลง (`song_ref`) — จุดที่ต้อง handshake
เพลง 1 เพลงเดินข้าม 2 ตาราง: `song_drafts` (ตอนทำ) → `songs` (ตอนเผยแพร่, id คนละตัว). US-4 อยากดูประวัติ**ทั้งสาย**ในที่เดียว → ต้องมีกุญแจรวม:
- แก้ร่างของเพลงที่มีอยู่แล้ว → `song_ref = drafts.song_id` (= id ในคลัง)
- ร่างเพลงใหม่เอี่ยม → `song_ref = drafts.id` (id ของร่างเอง) จนกว่าจะเผยแพร่
- **จุดต่อ (build handshake กับ WT-D):** ตอน `approve_publish` เพลงใหม่ ให้ตัว publish รู้ว่า row `songs` ใหม่มาจากร่างไหน (แนะนำเพิ่ม `songs.source_draft_id` หรือส่งผ่าน RPC) → trigger จะ set `song_ref` ให้ต่อเนื่องกับร่างเดิมได้ **นี่คือรายละเอียดเดียวที่ต้องนัดกับ WT-D ตอน build** (เฟส design ยังไม่ชน)

## 3. Trigger จับ event อะไรบ้าง (2 มือ)
DB จดเอง — คนข้ามไม่ได้. trigger แปลง "op ดิบ + การเปลี่ยน status" เป็น `event` ที่มีความหมาย:

| ตาราง / op | เงื่อนไข status | → event | hand |
|---|---|---|---|
| `song_drafts` INSERT | — | `create` (สร้างร่าง) | editor |
| `song_drafts` UPDATE | `draft`/`rejected` → `pending` | `submit` (ส่งตรวจ) | editor |
| `song_drafts` UPDATE | เนื้อเปลี่ยน status คงเดิม | `edit` (แก้ร่าง) | editor |
| `song_drafts` UPDATE | `pending` → `approved` | `approve_publish` | approver |
| `song_drafts` UPDATE | `pending` → `rejected` | `reject` (ตีกลับ + note) | approver |
| `songs` INSERT | — | `approve_publish` (ออกสู่สาธารณะ) | approver |
| `songs` UPDATE | — | `edit_published` (approver แก้ตรงคลัง) | approver |
| `songs` DELETE | — | `unpublish` (ถอน/ลบจากคลัง) | approver |

- **status values ยึดตาม `db/002`**: `draft · pending · approved · rejected` — ไม่คิดชุดใหม่
- `hand` มาจาก `actor_role` ณ ตอนทำ + ชนิด event → UI แยก "ขั้นทำเพลง" vs "ขั้นอนุมัติ" (US-3) ได้ทันที
- **"อนุมัติ+เผยแพร่" ต้องแน่นสุด (US-3):** เป็นเหตุการณ์เดียวที่ตอบ "ใครทำเพลงนี้เป็นสาธารณะ" — trigger บน `songs` INSERT จับได้เสมอ ต่อให้ทางแอปทำหลายสเต็ป

## 4. "อนุมัติ+เผยแพร่" = เหตุการณ์เดียว (op_group)
ตอนอนุมัติ แอปทำ 2 อย่าง: อัปเดตร่าง `pending→approved` + เขียนเข้า `songs` → เกิด 2 แถว audit.
- แนะนำ build ผ่าน **RPC `approve_and_publish(draft_id)` (security definer, 1 transaction)** ให้ atomic + ใส่ `op_group` เดียวกันทั้ง 2 แถว → UI แสดงเป็น**บรรทัดเดียว**
- ถ้าไม่ทำ RPC ก็ยังจับครบ (แค่โชว์ 2 แถว) — `op_group` เป็น future-proof ไม่ block รอบนี้

## 5. แก้ไม่ได้ (เชื่อถือได้จริง — US-5)
- RLS: **SELECT ให้ผู้ล็อกอินอ่านได้เท่านั้น · ไม่มี policy insert/update/delete ให้ client เลย** (RLS default = deny) → **แม้แต่ approver ก็ลบ/แก้ร่องรอยไม่ได้**
- เขียนได้ทางเดียว = ผ่าน trigger (`security definer`) — ตรงกับแนวเดิมของ `song_revisions` (คงไว้ ตอกย้ำ)

## 6. ขอบเขต — จับเฉพาะคลังกลาง
- trigger อยู่บน `song_drafts` + `songs` เท่านั้น → **JSON ส่วนตัว/คนไม่ล็อกอิน ไม่แตะ DB = ไม่ถูกจดโดยธรรมชาติ** (ไม่ต้องเขียน guard เพิ่ม)
- **ไม่ตัดสินคุณภาพ** การแก้ — จดว่าเกิดอะไร เฉย ๆ (การตัดสินเป็นของ approver)

## 7. จุดต่อ UI (ออกแบบ — ยังไม่ build)
- **component ใหม่ `RevisionHistory.vue`** (ไฟล์ของธีมนี้เอง) — พาเนล/หน้าไล่รายการ **ใหม่→เก่า**: เวลา · ผู้ทำ (`actor_name`) · event (ไอคอน/ป้าย) · แยกสี editor/approver
- คลิกแถว `edit`/`approve_publish`/`edit_published` → มุมมอง **ก่อน↔หลัง** ไฮไลต์จุดต่าง → **ใช้ `lib/diff.js` ที่มีอยู่** (เนื้อร้อง + โน้ต/โครงเพลง)
- **จุดเข้า "ประวัติการแก้ไข"** วางในแถบของหน้าจอเพลง (พื้นที่ **ps3sa shell**) — โผล่เฉพาะคนล็อกอิน (`tier !== 'anon'`), คนทั่วไปไม่เห็น (US-4)
- อ่านข้อมูลผ่าน `lib/auditLog.js` ใหม่ (query ตาม `song_ref`) → ไม่ยุ่ง store เดิม

## 8. อนาคต (ออกแบบเผื่อ — ยังไม่ทำรอบนี้)
- **ปุ่มย้อนเวอร์ชัน:** เอา `after` ของแถวที่เลือกมาเขียนเป็นร่างใหม่/แก้ → การย้อนก็ถูกจดเป็น event ใหม่ (`edit`/`revert`) — **ไม่ต้องแก้ schema** (เพราะ §1 เก็บสำเนาเต็ม)
- แจ้งเตือน/สรุปรายงาน · ประวัติของสิ่งที่ไม่ใช่เพลง — นอกขอบเขต

---

## ไฟล์ที่เป็นเจ้าของ + กันชน SA อื่น
- **เป็นเจ้าของ:** `docs/us/audit-log.md` · `docs/ds/audit-log.md` · แถว B028 · ตาราง+trigger ฝั่ง DB (`db/004`, dev เขียน) · `components/RevisionHistory.vue` (ใหม่) · `lib/auditLog.js` (ใหม่)
- **ไม่แตะ:** `NoteRow.vue`/`SongSheet.vue`/`notation.js`/editor internals (วินัยเลน DA/render — ดู memory `pleng-b068`) · `Studio.vue`/`store.js` core
- **handshake ตอน build (เฟส design นี้ยังไม่ชน):**
  1. **WT-D รอบ 2 (ps4):** status transitions ส่งตรวจ/อนุมัติ/ตีกลับ ต้องตรงชุด `draft·pending·approved·rejected` ที่ trigger คาด · `song_ref` ต่อเนื่องเพลงใหม่ (§2)
  2. **ps3sa shell:** ที่วางปุ่ม "ประวัติการแก้ไข"

## เปิดประเด็นให้ P'Aim เคาะ (ก่อน dev)
1. **วิวัฒน์ `song_revisions` เดิม** (เพิ่มคอลัมน์ + trigger ฝั่งร่าง) หรือ **ทำตารางใหม่ `audit_log`** แล้วเลิกใช้อันเก่า? (แนะนำ: วิวัฒน์ในที่เดิม — data ที่จดไว้แล้วไม่หาย)
2. **"ถอน" กับ "ลบ" แยกกันไหม?** ตอนนี้รวมเป็น `unpublish` (ลบจาก `songs`) — ถ้าอยากได้ "ถอนชั่วคราว" ต่างจาก "ลบถาวร" ต้องเพิ่ม state
3. ทำ **RPC `approve_and_publish`** เลย (atomic + op_group สวย) หรือไว้รอบหลัง?
