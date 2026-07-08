# แผนที่โปรเจกต์ — เพลง.พระคำ.ชีวิต (pleng.phrakham.life)

**Codename: `pl2`** — pleng web **version 2** (โปรเจกต์รวมทั้งหมด) · อย่าสับสนกับ `ps1`–`ps4` = สปรินต์ย่อยข้างใน pl2 (pleng sprint N) ไม่ใช่คนละเวอร์ชัน

เอกสารนี้ = "อะไรอยู่ตรงไหน" สำหรับ Claude Code session ใหม่ (เครื่องไหนก็ได้) ให้ทำงานต่อได้ทันที

## เปิด session ใหม่ อ่านพวกนี้ก่อน
1. `docs/mission.md` — เรากำลังสร้างอะไร เพื่อใคร (พันธกิจ + สิทธิ์ 3 tier + แผนที่ worktree)
2. `docs/README.md` (ไฟล์นี้) — โครงโฟลเดอร์ + ไฟล์สำคัญ + กติกา git
3. `docs/workflow.md` — วิธีทำงานรวม (บทบาท SA/dev/tester · worktree ขนาน · port ประจำแต่ละงาน · prompt เริ่ม SA ใหม่)
4. `docs/status.md` — ตอนนี้ถึงไหนแล้ว (กระดานงาน 5 worktree + ถัดไป)
5. งานที่จะทำ: `docs/backlog.md` (idea ดิบ) หรือ `docs/us/<epic>.md` + `docs/ds/<epic>.md` (งานที่มี spec แล้ว)

## สายการทำงาน (ISO 29110-5-4 แบบเบา)
```
idea → docs/backlog.md → docs/us/<epic>.md (user story + AC) → docs/ds/<epic>.md (design) → code
```
เปิดโค้ดบรรทัดไหนก็สาวกลับไปได้ว่าตอบ story ไหน เพื่อ mission อะไร

## โครงโฟลเดอร์
| ที่ | คืออะไร |
|---|---|
| `src/` | โค้ดแอปจริง (Vue 3 + Vite) |
| `docs/` | เอกสารทั้งหมด |
| `docs/us/` · `docs/ds/` | user story / design spec — 1 worktree = 1 ไฟล์ (ชื่อไฟล์คู่กัน) |
| `docs/backlog.md` + `docs/backlog-assets/` | กล่อง idea เดียว + รูปประกอบ |
| `docs/design/` | wireframe อ้างอิง (`studio-wireframe.html`) |
| `.github/workflows/` | `deploy.yml` (push `main` = ขึ้นเว็บจริง) · `keepalive.yml` |
| scratch เก่า (`features/` `bugs/`) | **ย้ายออกแล้ว** ไป `OneDrive/4 Personal/claude/pleng/scratch-archive/` — ไม่อยู่ใน repo |

## ไฟล์สำคัญใน src/
**เปลือกร่วม (shell) — ทุกหน้าใช้**
- `App.vue` — ราก · วาง `ShellBar` ทุกหน้า · รู้ว่าอยู่หน้า studio ไหม
- `components/ShellBar.vue` — แถบหัวเดียวของทั้งเว็บ (หน้าอื่น teleport ปุ่มของตัวเองเข้ามา)
- `components/Icon.vue` — ชุดไอคอน (Lucide) ใช้ซ้ำทั้งเว็บ
- `styles.css` — สไตล์รวม (theme tokens · shell · studio-wide)
- `router.js` — เส้นทางหน้า · `store.js` — state กลาง (session, role) · `supabase.js` — backend + auth

**หน้าเพลง (song surface)**
- `views/Studio.vue` — **surface เดียวของเพลง** (โหมด ดู/แผ่น/แก้) — *WT-0 เป็นเจ้าของ*
- `components/SongViewer.vue` — โหมดดู/คาราโอเกะ (เล่น · ทรานสโพส · ฟอนต์ · ไฮไลต์ตาม) — *WT-A*
- `components/SongSheet.vue` — แผ่นเพลงพร้อมพิมพ์ A4 — *WT-B*
- `views/SongList.vue` — หน้าแรก (รายการเพลง + ค้นหา)
- `views/Guide.vue` · `views/About.vue` — คู่มือ / เกี่ยวกับเรา

**ข้างในตัวแก้เพลง (editor internals — อย่ารื้อ ยกทั้งก้อน)**
- `components/NoteBoxes.vue` · `components/NoteRow.vue` · `components/ComboSelect.vue`

**เครื่องมือ / logic**
- `components/DownloadTool.vue` — ดาวน์โหลด — *WT-C แตะ*
- `components/ProfileTool.vue` — login/บัญชี · `components/SiteFooter.vue` — ท้ายเว็บ
- `lib/notation.js` — แปลงโน้ตตัวเลข jianpu · `lib/songModel.js` — โมเดลเพลง v1/v2 (อ่าน `docs/song-model-v2.md` ก่อนแตะ)
- `lib/chords.js` — ทรานสโพสคอร์ด · `lib/midi.js` — เล่นเสียง (*WT-A*) · `lib/songSearch.js` · `lib/diff.js`
- `data/sample-songs.js` — เพลงตัวอย่าง

## เอกสารอ้างอิงอื่นใน docs/
- `song-model-v2.md` — ดีไซน์โมเดลเพลง (อ่านก่อนแตะ notation/model)
- `lessons.md` — บทเรียน/คอนเวนชันการ build
- `importing-songs.md` — playbook นำเข้าเพลง

## กติกา git (สำคัญมาก)
- **ฐานของงานใหม่ทั้งหมด = branch `studio-shell-redesign`** (ยังไม่ merge เข้า `main`)
- **`main` = เว็บจริง** — push เข้า `main` เมื่อไหร่ = deploy อัตโนมัติ → **ห้ามจนพี่เอมสั่ง**
- **1 งาน = 1 worktree = 1 branch = 1 พอร์ต dev** (กันหลาย session ชนไฟล์กัน)
  - `git worktree add ../pleng-<ชื่อ> -b <branch> studio-shell-redesign`
  - `npm run dev -- --port 53xx` (พอร์ตของตัวเอง)
- **ก่อน commit เช็ก `git branch --show-current` เสมอ** — dir หลักนี้ใช้ร่วมหลาย session สาขาอาจถูกสลับใต้มือ
- แผน "1 ฐาน + 4 ขนาน" + ไฟล์ที่แต่ละ worktree เป็นเจ้าของ → ดูตารางใน `docs/mission.md`

## ข้ามเครื่อง / ข้าม session
- ทุกอย่างที่ต้อง "ทำต่อได้" อยู่ใน git (docs + code) = SSOT — pull แล้วอ่าน `docs/` ได้เลย ไม่ต้องพึ่ง session เดิม
- ของ scratch/ชั่วคราวไม่เข้า git (ดู `.gitignore`) — ถ้าต้องเก็บ ย้ายไป `OneDrive/pleng/`
