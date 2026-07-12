# PM board — pleng (ไม้ต่อ · กระชับ · refreshed 2026-07-12)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิค → git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
**⛔ เปิด PM session ใน worktree `C:\gl\krisada\pleng.phrakham.life-pm` เท่านั้น (ไม่ใช่ primary clone!)** — primary ถูกสลับ branch ใต้มือ (park ที่ `pm-primary-parking`) · ดู `docs/sop.md` §5
**เปิด PM session ใหม่:** อ่าน `docs/pm/pm.md` → memory `pleng-pm-role` (+ feedback PM ทั้งชุด) → `docs/sop.md` → ไฟล์นี้ · **ตั้งชื่อ session ตัวเองตามรอบ deploy ถัดไป (`pm11`)** แล้วอัปเดต §🎯

---

## 🟢 LIVE ตอนนี้ — deploy รอบ 12 (`6e6653d`, 12 ก.ค. · B098 note/bar tools)
main = `6e6653d` · **นโยบายใหม่: PM deploy ทีละ fix ที่ผ่าน tester** (ดู §กติกา deploy) · ล่าสุด: รอบ11 B095 lock (`84d259c`) · รอบ12 B098 (`6e6653d`) · ("1 failed file" = notationLint process.exit เดิม ไม่ใช่บั๊ก)
- **ขึ้น live รอบ 10:** บั๊ก+ข้อเสนอพี่เปาครบ (โน้ต space ripple B084 · สติกกี้ B085 · ย้ายบรรทัด B086 · เส้นจบ‖ B090 · ล้างเนื้อบรรทัด · ปุ่มห้อง+มือถือ B092 · lint-ก่อนเผยแพร่ B093) + **หน้าแรกใหม่ (เล่ม picker) + verified GATE (B087+B089)**
- ประวัติรอบก่อน (7-9): DockKey 3 หน้า+polish · slur B076 · ไทข้ามห้อง B069 · เส้นปิดห้อง B082 · พรีวิว B081 · จับคู่ทำนอง B083 · timeline D6 · a11y infra

## 🔴 GATE ACTIVE (สำคัญสุด — public เปลี่ยนแล้ว)
- P'Aim รัน `reset-verified-false.sql` แล้ว → **123 เพลง verified=false ทั้งหมด**
- **public (ไม่ล็อกอิน) = เห็น 0 เพลง + ข้อความ "เพลงกำลังอยู่ระหว่างตรวจทาน จะเปิดให้ชมเร็วๆ นี้"** (ยืนยันบน live แล้ว) · ทีมล็อกอิน = เห็นครบ + ป้าย ✓/⚠️
- **▶ งานหลักต่อไป:** ทีม **review อนุชน (122) ทีละเพลง** ในหน้าแก้ไข → กด "✓ ตรวจแล้ว?" (verified=true) → เพลงกลับมาโชว์ public · กลไกพร้อม+live (`EditorMode.markVerified`) · **ที่ยัง 0/122 = ยังไม่มีคนเริ่ม ไม่ใช่บั๊ก**
- **campaign tracker + checklist มาตรฐาน:** `docs/pm/review-anuchon.md` (PM re-run query นับ progress ทุก session) · อนุชน = clean 80 + ติดธง 42 (words28/repeat16/lint6/อื่น3)

## 🚧 กำลังทำ / รอ (รอบ 11 เริ่ม · pm11)
- **B098 แยกเครื่องมือโน้ต/ห้อง (4 การกระทำ) + auto-focus เพิ่มห้อง — ✅ เสร็จ + ขึ้น LIVE (รอบ 12 · `6e6653d`)** — tester PASS ครบ (คลิกจริง 4 สโคป + auto-focus + มือถือ 375px) → PM cherry-pick `3a934a4`+`b79cd37`→base (auto-merge สะอาด ไม่ชน B095) → FF main + push → poll bundle เจอ `6e6653d` ✅ · โน้ต: คัดลอก/ลบ · ห้อง: คัดลอก/ลบ · กดเพิ่มห้อง→พิมพ์ต่อได้เลย · report `docs/reports/b098-note-bar-tools.md`+`tester-b098-note-bar-tools.md` · **พี่เปาลอง live ได้**
- **B097 undo/redo ให้ถูกครบทุกกรณี** (หน้าแก้ไข) — ✅ **DEV เสร็จ · จ่าย tester gate แล้ว** (branch `fix-b097-undo-redo` @ `18eee9f` · session dev `local_f2f1836b` · tester `task_f66f73da`) · แก้ตามต้นเหตุ: แยก doc-state/view-state (สลับท่อน/เที่ยว=ไม่นับ undo step · เก็บ+กู้ view ใน snapshot แทน resetLens) · 380 test เขียว + build · dev verify browser (เนื้อเที่ยว 2 กลับถูก) · รั้ว `EditorMode.vue`+`EditorMode.undo-view.test.js` · report `docs/reports/fix-b097-undo-redo.md` · ▶ รอ tester PASS → PM cherry-pick · **ยังไม่ deploy**
- **B095 ล็อกหมวด 3 เล่ม — ✅ เสร็จ + ขึ้น LIVE (deploy รอบ 11 · `84d259c` · 12 ก.ค.)** — tester PASS 5/5 (`tester-b095-lock-fix.md`) → PM cherry-pick `e9ae706`→base (`84d259c`) → FF main + push → poll live bundle เจอ `84d259c` ✅ · ช่องหมวดล็อก 3 เล่ม (ตัด allow-custom) · docs+system-map revert เป็น "ล็อก" แล้ว · breach ปิดจบ · B096 (admin จัดการเล่ม) = 🅿️ deferred แยกไว้ backlog
- **📥 import เล่มใหญ่ "บทเพลงสรรเสริญ" (scanned 477 หน้า · session แยก `local_9f147e9d`)** — เพลง 32 (`lem-yai`) อยู่ใน DB แล้ว · **รอพี่เปาตรวจในแอป** → ผ่าน = ping DA ล็อก template + ไล่ทีละเพลง · **⏸️ พักไว้ก่อน** (P'Aim: อนุชน review ก่อน) · ~8-11K tok/เพลง (context แยก/เพลง · อย่าทำแชทเดียว) · ไฟล์ `tools/hymnal-samples/`, report `hymnal-import.md`
- **B092 responsive-split = live แล้ว** (มือถือเก็บ สำเนา/ลบ ใน ⋯) — ถ้าพี่เปายังว่าหนักบนมือถือ ค่อยปรับ

## 📥 inbox → PM (dev handoff · รอ gate/merge)
- _(ว่าง — B095 + B098 ผ่าน tester + ขึ้น live แล้ว · รอ B097 tester)_

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
- **deploy (นโยบายใหม่ P'Aim 12 ก.ค.): PM คุม deploy เอง · deploy ทีละ fix ที่พร้อม (ผ่าน tester) ไม่ต้องรอครบทุกงาน ไม่ต้องถาม P'Aim ทุกครั้ง** — พี่เปาทดสอบบน live · เงื่อนไข: ต้องผ่าน tester gate ก่อน + เป็น fix ที่ปลอดภัยกับ public (ตอนนี้ GATE ทำให้ public เห็น 0 เพลง → editor features ไม่กระทบ) · วิธี: cherry-pick commit โค้ดของ fix นั้น → align main=base (FF) + push → poll live bundle จนเจอ commit · **kanban พี่เปา:** ย้ายโฟลเดอร์ `สถานะบั๊ก/{1-รอทำ,2-กำลังทำ,3-เสร็จแล้ว}` ทุกครั้งสถานะเปลี่ยน + อัปเดต `อ่านตรงนี้-สถานะบั๊ก.md`
- ทุก P'Aim example → กฎใน `ui-standards.md`/checklist (tester ดักครั้งหน้า) · แก้ที่ process ไม่โทษคน

## roster / routing (session id)
- **ไม่มี session ค้าง (archived หมด 12 ก.ค.)** — งานขึ้น live รอบ 7-10 ครบ, branch+commit ยังอยู่ใน git
- **ทุกงานใหม่ = spawn worktree + session ใหม่** (1 งาน = 1 worktree = 1 branch ตามหลักบอร์ด) · ไม่ปลุก session เก่า
- ข้อยกเว้น: import เล่มใหญ่ `local_9f147e9d` (⏸️ พัก) — ถ้ายังไม่ archive ปลุกต่อได้ ไม่งั้น spawn ใหม่จาก report `hymnal-import.md`

**Deploy history:** รอบ7 `71b8d8f` · รอบ8 `e83afe7` · รอบ9 `e7af727` · รอบ10 `4c5fd07` (+GATE) · รอบ11 `84d259c` (B095 lock) · **รอบ12 `6e6653d` = LIVE (12 ก.ค. · B098 note/bar tools) — PM deploy ทีละ fix**
**env:** GitHub token `OneDrive/4 Personal/claude/.env`→`GITHUB_TOKEN_PLENG` (source ก่อน · repo public) · Supabase `SUPABASE_*_PLENG` · main อยู่ worktree `pleng-natural-tie` · IP เปลี่ยนบ่อย (เช็ก `Get-NetIPAddress` / vite Network line)
