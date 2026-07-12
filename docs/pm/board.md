# PM board — pleng (ไม้ต่อ · กระชับ · refreshed 2026-07-12)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิค → git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
**⛔ เปิด PM session ใน worktree `C:\gl\krisada\pleng.phrakham.life-pm` เท่านั้น (ไม่ใช่ primary clone!)** — primary ถูกสลับ branch ใต้มือ (park ที่ `pm-primary-parking`) · ดู `docs/sop.md` §5
**เปิด PM session ใหม่:** อ่าน `docs/pm/pm.md` → memory `pleng-pm-role` (+ feedback PM ทั้งชุด) → `docs/sop.md` → ไฟล์นี้ · **ตั้งชื่อ session ตัวเองตามรอบ deploy ถัดไป (`pm11`)** แล้วอัปเดต §🎯

---

## 🟢 LIVE ตอนนี้ — deploy รอบ 14 (`4513961`, 12 ก.ค. · B099 tie curve)
main = `4513961` · **นโยบายใหม่: PM deploy ทีละ fix ที่ผ่าน tester** (ดู §กติกา deploy) · รอบ11 B095 · รอบ12 B098 · รอบ13 B097 · รอบ14 B099 · ("1 failed file" = notationLint process.exit เดิม ไม่ใช่บั๊ก)
- **ขึ้น live รอบ 10:** บั๊ก+ข้อเสนอพี่เปาครบ (โน้ต space ripple B084 · สติกกี้ B085 · ย้ายบรรทัด B086 · เส้นจบ‖ B090 · ล้างเนื้อบรรทัด · ปุ่มห้อง+มือถือ B092 · lint-ก่อนเผยแพร่ B093) + **หน้าแรกใหม่ (เล่ม picker) + verified GATE (B087+B089)**
- ประวัติรอบก่อน (7-9): DockKey 3 หน้า+polish · slur B076 · ไทข้ามห้อง B069 · เส้นปิดห้อง B082 · พรีวิว B081 · จับคู่ทำนอง B083 · timeline D6 · a11y infra

## 🔴 GATE ACTIVE (สำคัญสุด — public เปลี่ยนแล้ว)
- P'Aim รัน `reset-verified-false.sql` แล้ว → **123 เพลง verified=false ทั้งหมด**
- **public (ไม่ล็อกอิน) = เห็น 0 เพลง + ข้อความ "เพลงกำลังอยู่ระหว่างตรวจทาน จะเปิดให้ชมเร็วๆ นี้"** (ยืนยันบน live แล้ว) · ทีมล็อกอิน = เห็นครบ + ป้าย ✓/⚠️
- **▶ งานหลักต่อไป:** ทีม **review อนุชน (122) ทีละเพลง** ในหน้าแก้ไข → กด "✓ ตรวจแล้ว?" (verified=true) → เพลงกลับมาโชว์ public · กลไกพร้อม+live (`EditorMode.markVerified`) · **ที่ยัง 0/122 = ยังไม่มีคนเริ่ม ไม่ใช่บั๊ก**
- **campaign tracker + checklist มาตรฐาน:** `docs/pm/review-anuchon.md` (PM re-run query นับ progress ทุก session) · อนุชน = clean 80 + ติดธง 42 (words28/repeat16/lint6/อื่น3)

## 🚧 กำลังทำ / รอ (รอบ 11 เริ่ม · pm11)
- **B098 แยกเครื่องมือโน้ต/ห้อง (4 การกระทำ) + auto-focus เพิ่มห้อง — ✅ เสร็จ + ขึ้น LIVE (รอบ 12 · `6e6653d`)** — tester PASS ครบ (คลิกจริง 4 สโคป + auto-focus + มือถือ 375px) → PM cherry-pick `3a934a4`+`b79cd37`→base (auto-merge สะอาด ไม่ชน B095) → FF main + push → poll bundle เจอ `6e6653d` ✅ · โน้ต: คัดลอก/ลบ · ห้อง: คัดลอก/ลบ · กดเพิ่มห้อง→พิมพ์ต่อได้เลย · report `docs/reports/b098-note-bar-tools.md`+`tester-b098-note-bar-tools.md` · **พี่เปาลอง live ได้**
- **B104 MIDI คอร์ดคลอ — ✅ SA spec เสร็จ · จ่าย DEV แล้ว** (SA `local_b852f9a3` spec `e75d1ad` → dev branch `b104-dev-midi-chords` · `task_157c47ae`) · spec `docs/ds/midi-chord-accompaniment.md` (AC 10) · music sheet=SSOT · 3 โหมด (ทำนอง/คอร์ด/รวม · default ทำนอง) · voicing v1 = เบสราก+block triad (เลือกเอง= v2) · ครบ ฟังท่อน+ทั้งเพลง+MP3 · **SA แกะ hymnal.net: เสียงเต็มเขา = SATB แต่งมือทีละเพลง ลอกอัตโนมัติไม่ได้ · ของเรา = คอร์ดคลออัตโนมัติจากชื่อคอร์ด (ใกล้ฟีล เรียบง่ายกว่า)** · ▶ dev→tester→PM deploy
- **B102 ท่อนสร้อยฝึกร้องไม่ซ้ำ — ✅ SA เสร็จ · รอ P'Aim เคาะ 2 ข้อ (รวมในสรุป)** (branch `b102-sa-chorus-repeat` · `local_07713533`) · **ต้นเหตุ = DATA gap ไม่ใช่บั๊ก engine** (เพลง 141 ใส่รับครั้งเดียวใน arrangement · playback เล่นตามข้อมูล → รับ 1 ครั้ง · พิสูจน์ด้วย node จริง: ใส่รับหลังทุกข้อ→4 ครั้ง 252 โน้ต) · **แก้ KISS:** A1 = ใส่แถวรับหลังข้อ2/3/4 (0 โค้ด · งาน DA/พี่เปา) · A2 = dedup แผ่นเพลงพิมพ์รับครั้งเดียว (โค้ดเล็ก SongSheet) · **2 คำถาม:** (1)แผ่นพิมพ์รับครั้งเดียวไหม (=ทำ A2) (2)เอาฟีเจอร์ "รับหลังทุกข้อ" อัตโนมัติไหม (C) · spec `docs/ds/sing-chorus-repeat.md`
- **B103 `.gitattributes` LF — ✅ DEV เสร็จ · PM ถือ merge ไว้ก่อน** (branch `b103-gitattributes` · `local_7b9714fc` · commit `0a7e2a0`) · renormalize ทั้งรีโป → **ต้อง merge หลังสาย EditorMode.vue อื่น land หมด (กัน conflict)** · report `docs/reports/b103-gitattributes.md`
- **B100 เตือนก่อนออกหน้าแก้ไข — ✅ DEV เสร็จ · จ่าย tester** (branch `b100-leave-warning` · code `8175ec4` · dev `local_ee61e1c1` หยุดแล้ว · tester `task_bcef042e`) · EditorMode.vue+`EditorMode.leave.test.js` (105) · route guard+beforeunload · report `docs/reports/b100-leave-warning.md` · ▶ tester PASS → PM deploy · **(ping ไม่ถึง PM — เจอจาก list_sessions)**
- **B101 คัดลอก/วางบรรทัด-ห้อง ยืดหยุ่น + wording — ✅ DEV เสร็จ · จ่าย tester** (branch `b101-copy-paste-flexible` · code `2d32af4` · dev `local_d3a5e953` หยุดแล้ว · tester `task_a5296043`) · EditorMode.vue(152)+Icon.vue · report `docs/reports/b101-copy-paste-flexible.md` (มี wording rationale) · ▶ tester PASS → PM deploy
- **B099 เส้นโค้งไท (โบว์→arc เดียว) — ✅ เสร็จ + ขึ้น LIVE (รอบ 14 · `4513961`)** — tester PASS ครบ (เคสโบว์ `1~ ~1`→arc เดียว · cross-bar+slur ไม่ regress) → PM cherry-pick โค้ด `SongSheet.vue` เท่านั้น (จาก `2af393d` · EOL normalize LF · 12/6) commit `4513961` → FF main + push → poll เจอ ✅ · ต้นเหตุ = ไท `~` ในห้องเดียว วาด 2 ครึ่งเหลื่อมเป็นโบว์ · แก้ overlay `measureTies()` วาด arc เดียว · **พี่เปาลอง live ได้**
- **B097 undo/redo — ✅ เสร็จ + ขึ้น LIVE (รอบ 13 · `54eba5c`)** — tester PASS ครบ (เพลงจริง #12: แก้เนื้อร้อง2→Ctrl+Z โน้ต+เนื้อถูกยังเที่ยว 2 · สลับท่อนไม่กิน undo · redo mirror · sabotage-proof) → PM apply logic (docState/viewState split · applyState กู้ view แทน resetLens) commit `54eba5c` → FF main + push → poll bundle เจอ `54eba5c` ✅ · **พี่เปาลอง live ได้** · (⚠️ EOL: branch CRLF → PM apply LF patch สะอาด +55/-15 · ดู §กติกา merge)
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
  - **⚠️ EOL (บทเรียน B097 12 ก.ค.):** ถ้า dev เซฟไฟล์เป็น CRLF ทั้งไฟล์ (autocrlf=true, ไม่มี .gitattributes) → cherry-pick ตรงๆ ได้ diff ยักษ์ + conflict. วิธีแก้: `git cat-file -p <fixcommit>^:<file> | tr -d '\r' > A` · `git cat-file -p <fixcommit>:<file> | tr -d '\r' > B` · `diff -u --text A B | patch -p0 <file>` (apply แค่ logic เป็น LF · autocrlf แปลงกลับตอน commit) · **ควรเพิ่ม `.gitattributes` (`*.vue text eol=lf`) กันปัญหาถาวร** — ค้างเป็น follow-up
- **deploy (นโยบายใหม่ P'Aim 12 ก.ค.): PM คุม deploy เอง · deploy ทีละ fix ที่พร้อม (ผ่าน tester) ไม่ต้องรอครบทุกงาน ไม่ต้องถาม P'Aim ทุกครั้ง** — พี่เปาทดสอบบน live · เงื่อนไข: ต้องผ่าน tester gate ก่อน + เป็น fix ที่ปลอดภัยกับ public (ตอนนี้ GATE ทำให้ public เห็น 0 เพลง → editor features ไม่กระทบ) · วิธี: cherry-pick commit โค้ดของ fix นั้น → align main=base (FF) + push → poll live bundle จนเจอ commit · **kanban พี่เปา:** ย้ายโฟลเดอร์ `สถานะบั๊ก/{1-รอทำ,2-กำลังทำ,3-เสร็จแล้ว}` ทุกครั้งสถานะเปลี่ยน + อัปเดต `อ่านตรงนี้-สถานะบั๊ก.md`
- ทุก P'Aim example → กฎใน `ui-standards.md`/checklist (tester ดักครั้งหน้า) · แก้ที่ process ไม่โทษคน

## roster / routing (session id)
- **ไม่มี session ค้าง (archived หมด 12 ก.ค.)** — งานขึ้น live รอบ 7-10 ครบ, branch+commit ยังอยู่ใน git
- **ทุกงานใหม่ = spawn worktree + session ใหม่** (1 งาน = 1 worktree = 1 branch ตามหลักบอร์ด) · ไม่ปลุก session เก่า
- ข้อยกเว้น: import เล่มใหญ่ `local_9f147e9d` (⏸️ พัก) — ถ้ายังไม่ archive ปลุกต่อได้ ไม่งั้น spawn ใหม่จาก report `hymnal-import.md`

**Deploy history:** รอบ7 `71b8d8f` · รอบ8 `e83afe7` · รอบ9 `e7af727` · รอบ10 `4c5fd07` (+GATE) · รอบ11 `84d259c` (B095 lock) · รอบ12 `6e6653d` (B098) · รอบ13 `54eba5c` (B097) · **รอบ14 `4513961` = LIVE (12 ก.ค. · B099 tie curve) — PM deploy ทีละ fix**
**env:** GitHub token `OneDrive/4 Personal/claude/.env`→`GITHUB_TOKEN_PLENG` (source ก่อน · repo public) · Supabase `SUPABASE_*_PLENG` · main อยู่ worktree `pleng-natural-tie` · IP เปลี่ยนบ่อย (เช็ก `Get-NetIPAddress` / vite Network line)
