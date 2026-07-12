# PM board — pleng (ไม้ต่อ · กระชับ · refreshed 2026-07-12)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิค → git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
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

## 🚧 กำลังทำ / รอ
- **📥 import เล่มใหญ่ "บทเพลงสรรเสริญ" (scanned 477 หน้า · session แยก `local_9f147e9d`)** — เพลง 32 (`lem-yai`) อยู่ใน DB แล้ว · **รอพี่เปาตรวจในแอป** → ผ่าน = ping DA ล็อก template + ไล่ทีละเพลง · **⏸️ พักไว้ก่อน** (P'Aim: อนุชน review ก่อน) · ~8-11K tok/เพลง (context แยก/เพลง · อย่าทำแชทเดียว) · ไฟล์ `tools/hymnal-samples/`, report `hymnal-import.md`
- **B092 responsive-split = live แล้ว** (มือถือเก็บ สำเนา/ลบ ใน ⋯) — ถ้าพี่เปายังว่าหนักบนมือถือ ค่อยปรับ

## 🎯 รอ P'Aim ตัดสิน (ไม่บล็อก)
- **SA interlinear ≥3 ภาษา** (`task_aea51f3c` · mockup รอเคาะ · ชน SongSheet → จัดคิว dev) · **B080 expert standards** (ต่อยอด ui-standards)
- **B028 audit log** (DS `docs/ds/audit-log.md` · 3 Qs) · **i18n** (`lang=th`+`translate="no"`) · **สิทธิ์ลบเพลง** (approver-only vs ทุกคน)
- **yuwachon code** — DA ยืนยันโค้ด category "ยุวชน" ตอน import จริง (ยังไม่มีเพลง=ไม่กระทบ)

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
