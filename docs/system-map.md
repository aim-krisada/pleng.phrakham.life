# System Map — เพลง.พระคำ.ชีวิต (pleng.phrakham.life)

> **ประตูหน้าเดียว** สำหรับคนใหม่ (คนหรือ AI) ที่ยังไม่รู้จักโค้ด — อ่านหน้านี้จบแล้ว
> เข้าใจว่า "ระบบตอนนี้ออกแบบไว้ยังไง" พอจะต่อยอดได้ · เขียนแค่ **ของที่นิ่ง**
> (สิ่งที่มี, คอลัมน์ข้อมูล, ทางเดินหลัก, กติกาออกแบบ) — รายละเอียดผันผวนอยู่ในโค้ด/`docs/ds/`
>
> **Living doc — แก้ดีไซน์ทีไร อัปเดตหน้านี้ทุกที** (DoD ผูกไว้ที่ `docs/sop.md` §5)

---

## 1 · ระบบนี้คืออะไร

คลังเพลงนมัสการฟรีสำหรับคริสตจักรไทย รวม **เนื้อร้อง + คอร์ดกีตาร์ + โน้ตตัวเลข (jianpu)**
ไว้ที่เดียว · เปิดดูได้เลยไม่ต้องล็อกอิน — ร้อง/ฝึก, ทรานสโพส (เปลี่ยนคีย์), พิมพ์แผ่น A4
· ทีมที่ได้รับเชิญ **แก้เพลง → เก็บเป็นร่าง → ส่งตรวจ → อนุมัติเข้าคลัง**
พันธกิจเต็ม + ผู้ใช้ 3 กลุ่ม → **[docs/mission.md](mission.md)**

**Stack:** Vue 3 + Vite + Vue Router (hash mode) → GitHub Pages · หลังบ้าน = Supabase (Postgres + auth)
· แผนที่โฟลเดอร์/ไฟล์ → **[docs/README.md](README.md)**

---

## 2 · ข้อมูล (Data) — entities + data dictionary

### ตาราง `songs` (Supabase Postgres) — เพลงที่เผยแพร่แล้ว
คอลัมน์ที่แอปใช้จริง (จาก `SongList.vue` + `EditorMode.vue`):

| คอลัมน์ | ชนิด | ความหมาย |
|---|---|---|
| `id` | uuid | รหัสเพลง (คีย์หลัก · UUID) |
| `number` | int | เลขข้อในเล่ม (ลำดับในหมวด) · ใช้เรียงในเล่ม |
| `title_th` | text | ชื่อเพลงภาษาไทย (ใช้ตั้งชื่อไฟล์ดาวน์โหลดด้วย) |
| `title_en` | text | ชื่อภาษาอังกฤษ (ถ้ามี) |
| `category` | text | **เล่มที่เพลงสังกัด** (1 เพลง 1 เล่ม) — ดูข้อ "เล่มเพลง" ล่าง |
| `theme` | text | หมวดหัวข้อ/แนวเพลง (ป้ายเสริม ไม่ใช่เล่ม) |
| `content` | jsonb | ตัวเพลงจริง (เนื้อ+คอร์ด+โน้ต) — โครงสร้าง v2 ดูข้อ 2.2 |
| `verified` | bool | **ตรวจแล้วหรือยัง** — public เห็นเฉพาะ `true` (ดู Invariants) |
| `review_flags` | jsonb | รายการธงรอตรวจ (repeat / lint / words) — DA/ระบบ lint ใส่ไว้ |
| `book_refs` | jsonb | อ้างอิงเล่มกระดาษอื่น `[{book:'ล', no:282}]` = **ป้ายอ้างอิง** ไม่ใช่ที่สังกัด · ชื่อเล่ม → `src/lib/bookCodes.js` |
| `scripture` | text | ข้ออ้างอิงพระคัมภีร์ |

**RLS (บังคับที่ชั้นฐานข้อมูล · ไม่ใช่แค่ client):**
- **อ่าน:** anon/public เห็น **เฉพาะ `verified=true`** · authenticated (team) เห็นครบ — บังคับด้วย RLS policy (`db/005`) · client `bookshelf.js visibleSongs` = defense-in-depth ชั้นสอง (ไม่ใช่ด่านจริง)
- **เขียน (insert/update/delete):** **approver เท่านั้น** (`db/002`) · เขียนคลังบางอย่าง (เช่น reset) = P'Aim รัน SQL เอง
- migrations ทั้งหมด → โฟลเดอร์ **`db/`** (รันมือใน Supabase SQL Editor · P'Aim รันเอง)

### ตาราง `song_drafts` — ร่างก่อนเผยแพร่
ที่พักงานของ editor ก่อนเข้าคลัง · คอลัมน์: `song_id` (null = เพลงใหม่), `number`, `title_th`,
`content`, `author_id` (คนเขียนร่าง · default `auth.uid()`), `review_comment`, และ
`status` (`'draft'` ร่างส่วนตัว · `'pending'` ส่งตรวจ · `'approved'` · `'rejected'`) · เขียนผ่าน
`store.js saveDraftRow()` · **RLS:** เห็น/แก้ได้เฉพาะร่างตัวเอง **หรือ** ถ้าเป็น approver (เห็นทุกร่าง) ·
อนุมัติ = RPC `approve_and_publish` (เช็ก approver) เขียนลง `songs` + ปิดร่าง (op เดียว · audit ผูก op_group)
(ประวัติการแก้เก็บใน `song_revisions` → ย้อนได้)

### ตาราง `notifications` (`db/008` · B108) — ศูนย์แจ้งเตือน
inbox ต่อผู้ใช้ · คอลัมน์: `recipient_id`, `type` (v1 = `'draft_submitted'`), `ref_id` (draft/song),
`payload` jsonb (snapshot ชื่อ/ผู้ส่ง · ไม่ join ตอนแสดง), `read_at` (null = ยังไม่อ่าน) ·
**RLS:** `recipient_id = auth.uid()` (เห็นเฉพาะของตัวเอง · anon ไม่เห็น) · เขียนโดย trigger/RPC เท่านั้น
(client forge ไม่ได้) · v1 event = draft เข้า `pending` → แจ้ง approver ทุกคน · กดอ่าน = RPC `mark_notification_read`

### ตาราง `profiles` · `song_revisions`
`profiles` — 1 แถว/user ถือ `role` (`editor`/`approver` · เปลี่ยนที่ dashboard) · authenticated อ่านได้ ·
`song_revisions` — audit log ทุกการเปลี่ยน (เขียนโดย trigger security-definer เท่านั้น · แก้/ลบไม่ได้ · ISO 27001 A.12.4)

### 2.2 · โครงสร้าง `content` (โมเดลเพลง v2)
v2 แยก **ทำนอง (stanza)** ออกจาก **คำร้อง (verse/refrain ที่ผูกกับ stanza)** — 1 พยางค์
ต่อ 1 โน้ตที่กินพยางค์ · แก้ทำนองที่เดียว ทุกข้อที่ใช้ทำนองนั้นเปลี่ยนตาม · ยังรองรับ v1
(`content.lines` แบน) ควบคู่ · **อย่าแก้ notation/model ก่อนอ่าน** →
**[docs/song-model-v2.md](song-model-v2.md)** (SSOT ของโครง content)

### เล่มเพลง (`category`) = 3 เล่ม · 1 เพลง อยู่ได้เล่มเดียว
| code | ชื่อเล่ม |
|---|---|
| `lem-yai` | เล่มใหญ่ |
| `anuchon` | อนุชน |
| `dek-lek` | เด็กเล็ก |

ตรรกะจัดชั้นหนังสือ (นับ/เรียง/จัดเล่ม) = `src/lib/bookshelf.js` · เล่มที่ไม่มีเพลงถูกซ่อน
· เพลงไม่มี `category` ตกลงถัง "อื่นๆ / ยังไม่จัดเล่ม"
· **ช่อง "หมวด" ในหน้าแก้ไข (EditorMode) ล็อก 3 เล่มนี้เท่านั้น** (ไม่มี `allow-custom` · พิมพ์ค่านอกลิสต์ไม่ติด — P'Aim 12 ก.ค. ผ่าน PM) · การเพิ่ม/เปลี่ยนชื่อเล่ม = งาน admin (B096 · deferred)

---

## 3 · ส่วนประกอบหลัก

| ส่วน | หน้าที่ (1 บรรทัด) | DS ที่เกี่ยว |
|---|---|---|
| `views/SongList.vue` | หน้าแรก — ค้นหา + ชั้นหนังสือ (bookshelf 3 เล่ม) | [ds/home-redesign.md](ds/home-redesign.md) |
| `views/Studio.vue` | **surface เดียวของเพลง** — สลับโหมด ดู/แผ่น/แก้ | [ds/wt0-foundation/DS-01-single-song-surface.md](ds/wt0-foundation/DS-01-single-song-surface.md) |
| `components/SongViewer.vue` | โหมดดู/คาราโอเกะ — เล่น · ทรานสโพส · ไฮไลต์ตาม | [ds/ps3-viewer.md](ds/ps3-viewer.md) |
| `components/SongSheet.vue` | เรนเดอร์แผ่นเพลงพร้อมพิมพ์ A4 | [ds/wt-b-print/DS-B02-print-a4-clean.md](ds/wt-b-print/DS-B02-print-a4-clean.md) |
| `components/EditorMode.vue` | โหมดแก้เพลง — บาร์/โน้ต/พยางค์ + ร่าง/ส่งตรวจ/เผยแพร่ | [ds/ps3-editor.md](ds/ps3-editor.md) |
| `components/NoteRow.vue` · `NoteBoxes.vue` | เรนเดอร์โน้ตตัวเลข (แถว/กล่อง) — อย่ารื้อ ยกทั้งก้อน | [ds/ps3-editor.md](ds/ps3-editor.md) |
| `components/DockKey.vue` | dock กลาง 3 โหมด (คุมคีย์/เทมโป/ฟอนต์) | [ds/ps3-dock.md](ds/ps3-dock.md) |
| `components/ShellBar.vue` | แถบหัวเดียวของทั้งเว็บ (หน้าอื่น teleport ปุ่มเข้ามา) | [ds/ps3-shell.md](ds/ps3-shell.md) |

logic แกน: `lib/notation.js` (แปลง jianpu) · `lib/songModel.js` (v1/v2 + migrate) ·
`lib/chords.js` (ทรานสโพส) · `lib/midi.js` (เล่นเสียง) · `store.js` (state + auth) · `supabase.js`

---

## 4 · ทางเดินหลัก (Flow) 4 อย่าง

- **(ก) ดู + ทรานสโพส + พิมพ์** — เปิดหน้าแรก → เลือกเล่ม → เลือกเพลง → `Studio` โหมดดู;
  เปลี่ยนคีย์สด/ปรับฟอนต์ผ่าน DockKey; โหมดแผ่น → พิมพ์ A4 (ทุก tier ไม่ต้องล็อกอิน)
- **(ข) แก้ไข → ร่าง → เผยแพร่** — editor แก้ใน `EditorMode` → บันทึกเป็น `song_drafts`
  (`draft`/`pending`) → approver กด "เผยแพร่" → เขียนลง `songs` (lint ก่อน: เตือน+ใส่ธง แต่ไม่บล็อก)
- **(ค) verified gate** — public เห็นเฉพาะเพลง `verified=true`; ทีมที่ล็อกอินเห็นทุกเพลง
  (เพื่อตรวจ/แก้) · **ด่านจริง = RLS ที่ฐานข้อมูล (`db/005`)** — anon query ได้เฉพาะ verified · `bookshelf.js visibleSongs`
  = ชั้นสอง (นับเล่ม/รายการ/ค้นหา ตรงกัน) · **แก้ verified ทีละเพลงในหน้าแก้ไข** → เพลงโผล่ public เพิ่มเอง
- **(ง) นำเข้า/พกพา JSON** — ดาวน์โหลดเพลงเป็น JSON v2 หรือ upload JSON ของตัวเองมาแก้
  โดยไม่แตะคลัง (`lib/jsonIO.js`, `DownloadTool.vue`) → [ds/wt-c-json/](ds/wt-c-json/)

---

## 5 · Invariants / กติกาออกแบบ (ที่โค้ดไม่บอก "ทำไม")

- **1 เพลง = 1 เล่ม** — เพลงสังกัด `category` เดียว ไม่มีเพลงโผล่ 2 เล่ม (`book_refs` = ป้ายอ้างอิง ไม่ใช่ที่สังกัด)
- **verified เป็น layer แยกจาก grouping** — การมองเห็น (public/team) แยกจากการจัดเล่ม
  → ปล่อย gate ได้อิสระ ไม่พันกับ taxonomy
- **`category` เป็นคอลัมน์ free-text ที่ระดับ schema · แต่หน้าแก้ไข "ล็อก" 3 เล่ม** (B095 · P'Aim ผ่าน PM) —
  ช่อง "หมวด" ใน `EditorMode` เสนอ **แค่ 3 เล่ม canonical** (เล่มใหญ่/อนุชน/เด็กเล็ก) · **ไม่มี `allow-custom`** →
  พิมพ์ค่านอกลิสต์ไม่ติด (เด้งกลับ 1 ใน 3) · การเพิ่มเล่มที่ 4/เปลี่ยนชื่อ = งาน admin (B096 · deferred) หรือ import ที่ตั้ง code ตรง ๆ
  ไม่ใช่ free-text ในหน้าแก้ไข · `bookshelf.js` ยังแสดง code ที่ไม่รู้จักแบบดิบ ๆ ไม่พัง (data-driven เดิม)
- **hash router** — ทุกเส้นทางเป็น `#/...` (host บน GitHub Pages ได้โดยไม่ต้องตั้ง server rewrite)
- **โน้ต = scale degree + จุดบน/ล่างบอก octave** — ตัวเลข = ขั้นคู่เสียง, `.` บน/ล่าง = ระดับเสียงสูง/ต่ำ,
  `-`/`~` = เสียงยาว/โยง, `|` = เส้นกั้นห้อง · SSOT = jianpu มาตรฐานครบ (เครื่องมือช่วยจัดเป็นแค่ตัวช่วย)
- **แก้ทำนองที่เดียว** — v2 เก็บทำนองใน stanza ครั้งเดียว หลายข้อใช้ร่วม; อย่า duplicate เนื้อทำนอง

---

## 6 · Security & ฐานข้อมูล

- **RLS เปิดครบทุกตาราง** (songs·song_drafts·song_revisions·profiles·notifications) · ไม่มีตารางเปิดโล่ง
- **กุญแจ:** ใช้แค่ **publishable key** (เปิดเผยได้ · `supabase.js`) — write ป้องกันด้วย RLS+auth · **ไม่มี service_role/secret ใน repo**
- **migrations:** `db/NNN-*.sql` รันมือใน Supabase SQL Editor (P'Aim รันเอง) · 002 draft/review+audit · 003 profile · 004 audit events+`approve_and_publish` · 005 verified-read RLS (LIVE) · 008 notifications · 009 hardening (เตรียม)
- **audit ผลการตรวจล่าสุด** → [docs/reports/security-audit-sa.md](reports/security-audit-sa.md) (F1 self-approve · F2/F3 hardening → `db/009`)

---

**มาตรฐาน UI/a11y ทั้งหมด** → [docs/ui-standards.md](ui-standards.md) ·
**วิธีทำงานของทีม (บทบาท/gate/worktree)** → [docs/sop.md](sop.md)
