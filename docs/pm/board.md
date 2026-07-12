# PM board — pleng (ไม้ต่อ · กระชับ · refreshed 2026-07-12)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิค → git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
**⛔ เปิด PM session ใน worktree `C:\gl\krisada\pleng.phrakham.life-pm` เท่านั้น (ไม่ใช่ primary clone!)** — primary ถูกสลับ branch ใต้มือ (park ที่ `pm-primary-parking`) · ดู `docs/sop.md` §5
**เปิด PM session ใหม่:** อ่าน `docs/pm/pm.md` → memory `pleng-pm-role` (+ feedback PM ทั้งชุด) → `docs/sop.md` → ไฟล์นี้ · **ตั้งชื่อ session ตัวเองตามรอบ deploy ถัดไป (`pm11`)** แล้วอัปเดต §🎯

---

## 🟢 LIVE ตอนนี้ — deploy รอบ 10 (`4c5fd07`, 12 ก.ค.)
main === base (`studio-shell-redesign`) · **371 test + build เขียว** ("1 failed file" = notationLint process.exit เดิม ไม่ใช่บั๊ก)
- **ขึ้น live รอบ 10:** บั๊ก+ข้อเสนอพี่เปาครบ (โน้ต space ripple B084 · สติกกี้ B085 · ย้ายบรรทัด B086 · เส้นจบ‖ B090 · ล้างเนื้อบรรทัด · ปุ่มห้อง+มือถือ B092 · lint-ก่อนเผยแพร่ B093) + **หน้าแรกใหม่ (เล่ม picker) + verified GATE (B087+B089)**
- ประวัติรอบก่อน (7-9): DockKey 3 หน้า+polish · slur B076 · ไทข้ามห้อง B069 · เส้นปิดห้อง B082 · พรีวิว B081 · จับคู่ทำนอง B083 · timeline D6 · a11y infra

## 🔴 GATE ACTIVE (สำคัญสุด — public เปลี่ยนแล้ว)
- P'Aim รัน `reset-verified-false.sql` แล้ว → **123 เพลง verified=false ทั้งหมด**
- **public (ไม่ล็อกอิน) = เห็น 0 เพลง + ข้อความ "เพลงกำลังอยู่ระหว่างตรวจทาน จะเปิดให้ชมเร็วๆ นี้"** (ยืนยันบน live แล้ว) · ทีมล็อกอิน = เห็นครบ + ป้าย ✓/⚠️
- **▶ งานหลักต่อไป:** ทีม **review อนุชน (122) ทีละเพลง** ในหน้าแก้ไข → กด "✓ ตรวจแล้ว?" (verified=true) → เพลงกลับมาโชว์ public · กลไกพร้อม+live (`EditorMode.markVerified`) · **ที่ยัง 0/122 = ยังไม่มีคนเริ่ม ไม่ใช่บั๊ก**
- **campaign tracker + checklist มาตรฐาน:** `docs/pm/review-anuchon.md` (PM re-run query นับ progress ทุก session) · อนุชน = clean 80 + ติดธง 42 (words28/repeat16/lint6/อื่น3)

## 🚧 กำลังทำ / รอ (รอบ 11 เริ่ม · pm11)
- **B098 แยกเครื่องมือโน้ต/ห้อง — คัดลอก+ลบ ครบ 4** — **จ่าย dev แล้ว (spawn_task 12 ก.ค. · branch `b098-note-bar-tools`)** · อาการ P'Aim: ปุ่ม ✕ กับ ถังขยะ ทำเหมือนกัน = ลบทั้งห้อง · ต้องแยก: คัดลอกโน้ต/ลบโน้ต + คัดลอกห้อง/ลบห้อง (ห้อง=bar) · **+ auto-focus: กดเพิ่มห้อง → cursor เด้งช่องโน้ตใหม่ พิมพ์ต่อได้เลย (P'Aim 12 ก.ค. · รวมเข้าสายนี้)** · dev วิเคราะห์+ออกแบบ+แก้เอง · KISS ต่อยอดของเดิม + คงมือถือ B092 · brief `docs/pm/brief-b098-note-bar-tools.md` · session `local_7eb9c7a7` · **⚠️ ชน `EditorMode.vue` กับ B097/B095 → cherry-pick ทีละงานตอน merge** · ▶ dev→tester→PM merge · **ยังไม่ deploy**
- **B097 undo/redo ให้ถูกครบทุกกรณี** (หน้าแก้ไข) — ✅ **DEV เสร็จ · จ่าย tester gate แล้ว** (branch `fix-b097-undo-redo` @ `18eee9f` · session dev `local_f2f1836b` · tester `task_f66f73da`) · แก้ตามต้นเหตุ: แยก doc-state/view-state (สลับท่อน/เที่ยว=ไม่นับ undo step · เก็บ+กู้ view ใน snapshot แทน resetLens) · 380 test เขียว + build · dev verify browser (เนื้อเที่ยว 2 กลับถูก) · รั้ว `EditorMode.vue`+`EditorMode.undo-view.test.js` · report `docs/reports/fix-b097-undo-redo.md` · ▶ รอ tester PASS → PM cherry-pick · **ยังไม่ deploy**
- **B095 เล่มเพลง 3 เล่ม + ล็อกหมวด** — requirement = **ล็อก 3 เล่ม** (P'Aim เคาะ AskUserQuestion 12 ก.ค. ผ่าน PM · commit `0ac0556` · dev/tester อ้าง "เลี้ยงได้" ผ่านคอมเมนต์โค้ด = ไม่ผ่าน PM ไม่นับ)
  - **สถานะจริง (git-verified pm11, 12 ก.ค.): fix แก้กลับล็อก ยังไม่ได้ทำเลย · base ยัง contaminated เป็น flexible**
  - base `studio-shell-redesign` = **allow-custom/flexible (breach)** — `EditorMode.vue:2156` ยังมี `allow-custom` · test = `ComboSelect.category.test.js` (flexible) · self-merged เข้ามา (`a1d3c20`+`b60f221`+`d0ef2b8`)
  - **ไม่มี branch ไหนมี code fix แก้กลับล็อก:** `book-taxonomy-lock` = docs-only (ไม่แตะโค้ด) · `book-taxonomy-3` จบที่ flexible (`b60f221`) · สาย fix ที่จ่ายไป `local_ae09d959` (branch `claude/zealous-albattani-850756`) = **ไม่ได้ commit อะไรเลย** (tip ยัง `4c5fd07` · EditorMode ยัง allow-custom · ไม่ได้รัน) · `task_96ab1591` หายแล้ว (task ไม่ persist)
  - tester re-gate (`book-taxonomy-3-tester`, session friendly-hugle) = **✗ FAIL** ยืนยัน fix ยังไม่ลง (report `docs/reports/book-taxonomy-3-tester.md`)
  - **ยังไม่ deploy → public ไม่กระทบ** · แต่ base ต้อง revert กลับล็อก
  - **▶ จ่าย dev แล้ว (spawn_task 12 ก.ค. · branch `b095-lock-fix`)** — brief `docs/pm/brief-b095-lock-fix.md`: (1) ตัด `allow-custom` `EditorMode.vue:2156` (2) test ค่านอกลิสต์ไม่ติด แบบ mount EditorMode จริง (ไม่ mount ComboSelect ลวง) (3) docs `home-redesign.md`+`book-taxonomy-3.md`+`system-map.md` §เล่มเพลง → "ล็อก" · ไม่แตะ DB/bookshelf → dev เสร็จ → tester re-verify (browser: พิมพ์ค่านอกลิสต์ **ไม่ติด**) → PM cherry-pick เข้า base
- **B096 หน้าจัดการเล่ม (approver-only)** — 🅿️ **deferred** (P'Aim: ยังไม่เอาตอนนี้) · คือวิธี "เลี้ยงได้" ที่ถูก (ตาราง `book_categories` + admin UI) แทน allow-custom ในช่องแก้เพลง · file ไว้ backlog B096 · แยกจาก B095
- **system-map.md** — ✅ canonical (base · PM แก้ id int→uuid) · **⚠️ §เล่มเพลง+invariant ยังเป็น "เลี้ยงได้" (breach) บน base → ต้องแก้กลับ "ล็อก 3 เล่มในหน้าแก้ไข" พร้อม B095 dev fix ข้างบน**
- **📥 import เล่มใหญ่ "บทเพลงสรรเสริญ" (scanned 477 หน้า · session แยก `local_9f147e9d`)** — เพลง 32 (`lem-yai`) อยู่ใน DB แล้ว · **รอพี่เปาตรวจในแอป** → ผ่าน = ping DA ล็อก template + ไล่ทีละเพลง · **⏸️ พักไว้ก่อน** (P'Aim: อนุชน review ก่อน) · ~8-11K tok/เพลง (context แยก/เพลง · อย่าทำแชทเดียว) · ไฟล์ `tools/hymnal-samples/`, report `hymnal-import.md`
- **B092 responsive-split = live แล้ว** (มือถือเก็บ สำเนา/ลบ ใน ⋯) — ถ้าพี่เปายังว่าหนักบนมือถือ ค่อยปรับ

## 📥 inbox → PM (dev handoff · รอ gate/merge)
- _(ว่าง — B095 handoff เดิม (`book-taxonomy-3`, flexible) ถูก tester gate FAIL แล้ว · สถานะจริงรวมอยู่ใน §🚧 B095 ข้างบน · รอ spawn dev fix ใหม่)_

## 🎯 รอ P'Aim ตัดสิน (ไม่บล็อก)
- **SA interlinear ≥3 ภาษา** (`task_aea51f3c` · mockup รอเคาะ · ชน SongSheet → จัดคิว dev) · **B080 expert standards** (ต่อยอด ui-standards)
- **B028 audit log** (DS `docs/ds/audit-log.md` · 3 Qs) · **i18n** (`lang=th`+`translate="no"`) · **สิทธิ์ลบเพลง** (approver-only vs ทุกคน)
- ~~**yuwachon code**~~ — ปิดแล้ว (B095): P'Aim เคาะ 3 เล่ม canonical · ยุวชน→**เด็กเล็ก** (`dek-lek`) · เพลงเด็กเล็ก import ทีหลังด้วยโค้ดนี้

## 📌 follow-up เล็ก (ไม่บล็อก · หลัง live รอบ 10)
- **B094 in-app confirm dialog** — แทน `window.confirm` ที่ ลบบรรทัด/ลบห้อง/ล้างเนื้อ (tester ยืนยัน freeze Browser MCP · UX)
- **B087 FLAG_LABEL ไทย** — `lint:beats`→"จังหวะไม่ครบ" ฯลฯ ใน SongList (ตอนนี้ lint flag โชว์ raw) · **`lem-yai`→"เล่มใหญ่"** ใน picker
- ปิด dev server เก่าหลายพอร์ต · worktree เก่า ~15 (`git worktree list`) · branch `claude/*` เยอะ

## 📦 data/review backlog (ไม่เร่ง · detail `docs/backlog.md`)
- พี่เปา review 41 เพลงติดธง (16 repeat/6 lint/28 words) · `tools/repeat-6-simple.sql` P'Aim อาจยังไม่ run · Amazing Grace `insert-amazing-grace.sql` (verified=false) รอ run
- ideas: ป้าย "ทำไม match" ในผลค้น · ค้นโน้ตข้ามท่อน · B046 ชื่อ↔เนื้อ · B066 tempo

---

## กติกา PM (บทเรียนสะสม — memory มีครบ)
- **PM = คุมกระดาน + จ่ายงาน เท่านั้น** ไม่แก้โค้ดเอง · จ่ายทุกอย่าง (analysis/design/dev/data) ไป **session แยกจริง** ด้วย `send_message` (**ห้าม Agent tool**) · triage แค่พอเขียน brief (`feedback_pm_dispatch_real_session`)
- **tester gate = ทุก UI ก่อน P'Aim** · dev/SA self-verify Tier-B (Browser MCP) ก่อน · print feature = P'Aim verify จาก PDF จริง (ไม่ใช่ DOM)
- **รายงาน session-agnostic:** dev เขียน `docs/reports/<branch>.md` + บรรทัด §📥 inbox + ping "PM ปัจจุบัน" (อย่า hardcode ชื่อสาย)
- **merge:** cherry-pick เฉพาะ commit โค้ด (เลี่ยง doc conflict + กัน branch เก่า revert งานใหม่) · เช็ก `git branch --show-current` ก่อน commit ทุกครั้ง · rerun test
- **deploy:** P'Aim สั่งเท่านั้น · align main=base (FF) + push → poll live bundle จนเจอ commit · **kanban พี่เปา:** ย้ายโฟลเดอร์ `สถานะบั๊ก/{1-รอทำ,2-กำลังทำ,3-เสร็จแล้ว}` ทุกครั้งสถานะเปลี่ยน + อัปเดต `อ่านตรงนี้-สถานะบั๊ก.md`
- ทุก P'Aim example → กฎใน `ui-standards.md`/checklist (tester ดักครั้งหน้า) · แก้ที่ process ไม่โทษคน

## roster / routing (session id)
- **ไม่มี session ค้าง (archived หมด 12 ก.ค.)** — งานขึ้น live รอบ 7-10 ครบ, branch+commit ยังอยู่ใน git
- **ทุกงานใหม่ = spawn worktree + session ใหม่** (1 งาน = 1 worktree = 1 branch ตามหลักบอร์ด) · ไม่ปลุก session เก่า
- ข้อยกเว้น: import เล่มใหญ่ `local_9f147e9d` (⏸️ พัก) — ถ้ายังไม่ archive ปลุกต่อได้ ไม่งั้น spawn ใหม่จาก report `hymnal-import.md`

**Deploy history:** รอบ7 `71b8d8f` · รอบ8 `e83afe7` · รอบ9 `e7af727` · **รอบ10 `4c5fd07` = LIVE (12 ก.ค. · 371 test · +GATE)**
**env:** GitHub token `OneDrive/4 Personal/claude/.env`→`GITHUB_TOKEN_PLENG` (source ก่อน · repo public) · Supabase `SUPABASE_*_PLENG` · main อยู่ worktree `pleng-natural-tie` · IP เปลี่ยนบ่อย (เช็ก `Get-NetIPAddress` / vite Network line)
