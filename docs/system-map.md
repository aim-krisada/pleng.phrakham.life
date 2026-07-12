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
| `id` | int | รหัสเพลง (คีย์หลัก) |
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

RLS: **public อ่านได้ / team เท่านั้นที่เขียนได้** · เขียนคลังจริงบางอย่าง (เช่น reset) = P'Aim รัน SQL เอง

### ตาราง `song_drafts` — ร่างก่อนเผยแพร่
ที่พักงานของ editor ก่อนเข้าคลัง · แถวมี `song_id` (null = เพลงใหม่), `number`, `title_th`,
`content`, และ `status` (`'draft'` = ร่างส่วนตัว · `'pending'` = ส่งตรวจแล้ว) · เขียนผ่าน
`store.js saveDraftRow()` · เมื่ออนุมัติ ข้อมูลถูกเขียนลง `songs` แล้วปิดร่างนั้น
(ประวัติการแก้เก็บใน `song_revisions` → ทำให้ย้อนได้)

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
| `yuwachon` | ยุวชน (เด็กเล็ก) |

ตรรกะจัดชั้นหนังสือ (นับ/เรียง/จัดเล่ม) = `src/lib/bookshelf.js` · เล่มที่ไม่มีเพลงถูกซ่อน
· เพลงไม่มี `category` ตกลงถัง "อื่นๆ / ยังไม่จัดเล่ม"

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
  (เพื่อตรวจ/แก้) · กรองที่ต้นทาง (`bookshelf.js visibleSongs`) → นับเล่ม/รายการ/ค้นหา ตรงกันหมด
- **(ง) นำเข้า/พกพา JSON** — ดาวน์โหลดเพลงเป็น JSON v2 หรือ upload JSON ของตัวเองมาแก้
  โดยไม่แตะคลัง (`lib/jsonIO.js`, `DownloadTool.vue`) → [ds/wt-c-json/](ds/wt-c-json/)

---

## 5 · Invariants / กติกาออกแบบ (ที่โค้ดไม่บอก "ทำไม")

- **1 เพลง = 1 เล่ม** — เพลงสังกัด `category` เดียว ไม่มีเพลงโผล่ 2 เล่ม (`book_refs` = ป้ายอ้างอิง ไม่ใช่ที่สังกัด)
- **verified เป็น layer แยกจาก grouping** — การมองเห็น (public/team) แยกจากการจัดเล่ม
  → ปล่อย gate ได้อิสระ ไม่พันกับ taxonomy
- **`category` เป็น free-text** — เพิ่มเล่มใหม่ = ข้อมูลใส่ code ใหม่ได้เลย ไม่ต้องแก้โค้ด
  (ชื่อสวยเติมใน `bookshelf.js`; code ที่ไม่รู้จักก็ยังแสดงดิบ ๆ ไม่พัง)
- **hash router** — ทุกเส้นทางเป็น `#/...` (host บน GitHub Pages ได้โดยไม่ต้องตั้ง server rewrite)
- **โน้ต = scale degree + จุดบน/ล่างบอก octave** — ตัวเลข = ขั้นคู่เสียง, `.` บน/ล่าง = ระดับเสียงสูง/ต่ำ,
  `-`/`~` = เสียงยาว/โยง, `|` = เส้นกั้นห้อง · SSOT = jianpu มาตรฐานครบ (เครื่องมือช่วยจัดเป็นแค่ตัวช่วย)
- **แก้ทำนองที่เดียว** — v2 เก็บทำนองใน stanza ครั้งเดียว หลายข้อใช้ร่วม; อย่า duplicate เนื้อทำนอง

---

**มาตรฐาน UI/a11y ทั้งหมด** → [docs/ui-standards.md](ui-standards.md) ·
**วิธีทำงานของทีม (บทบาท/gate/worktree)** → [docs/sop.md](sop.md)
