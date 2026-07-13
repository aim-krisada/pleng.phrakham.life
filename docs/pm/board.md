# PM board — pleng (ไม้ต่อ · refreshed 2026-07-13 · หลัง LAUNCH รอบ 21)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิค → git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
**⛔ เปิด PM session ใน worktree `C:\gl\krisada\pleng.phrakham.life-pm` เท่านั้น** (ไม่ใช่ primary clone · primary park ที่ `pm-primary-parking` · ดู `docs/sop.md` §5)
**เปิด PM session ใหม่:** `docs/pm/pm.md` → memory `pleng-pm-role` (+ feedback PM ชุด) → `docs/sop.md` → ไฟล์นี้ · **ตั้งชื่อ session ตามรอบ deploy ถัดไป (`pm22`)** · IP เครื่องเปลี่ยนบ่อย (เช็ก `Get-NetIPAddress`/vite Network line ก่อนส่ง URL)

---

## ▶ RESUME (hand-off pm21 → pm22 · 13 ก.ค.)
**🎉 LAUNCH สำเร็จ — deploy รอบ 21 `01765cb` (LIVE): B107 ระบบเสียงเครื่องดนตรีจริง 3 โหมด** (เปียโนเดี่ยว · กีตาร์เดี่ยว nylon · รวมวงเสียงจริง Option 1) + ปุ่ม "เสียงดนตรี" popover + self-host samples PWA offline. P'Aim confirm ครบ (desktop+มือถือ Chrome/Samsung) · ยืนยัน live (bundle มี SoundControl/audio-lines · `/samples/manifest.json`=200).

**🔴 GATE ยังอยู่ = priority จริง (ถ้า P'Aim ถามงานต่อ):** public เห็น **0 เพลง** · ปลดล็อก = ทีม review **อนุชน 122 เพลง** ในหน้าแก้ไข → กด "✓ ตรวจแล้ว" (verified=true) · **ยัง 0/122** (กลไก live พร้อม · ยังไม่มีคนเริ่ม) · tracker `docs/pm/review-anuchon.md` · เสียง = ของเสริม เสร็จแล้ว

**งานต่อยอด B107 (ไม่บล็อก · หลัง launch):**
- **🎨 icon violin/cello/ensemble** (branch `icons-violin-cello` `324d938` · asset ไม่ merge · **session archived 13 ก.ค.**) — ensemble = "วาทยกรมองจากหลัง แขน-V" (default D) + violin/cello (3 variant A/B/C ต่อเครื่อง) · **รอ P'Aim เลือก variant** → PM re-serve preview `docs/spikes/violin-cello-icons.html` (`node` server) ได้เมื่อ P'Aim พร้อมเลือก → dev เสียบ Icon.vue แทน `music`(violin/cello จาง)/`users`(ensemble placeholder)
- **🎵 ดาวน์โหลดเสียงจริง (P3)** — spike พิสูจน์แล้ว (`download-real-audio-spike.md` · offline+big-lookahead Scheduler + grand→Sampler pianoToPreset · 20-60× realtime) → **PM จ่าย dev integrate `renderSongToBuffer`** (≈1 module · reuse arrange/sampler/encoder) · ตอนนี้ดาวน์โหลด = synth เก่า
- **เครื่องเดี่ยว felt/violin/cello** (ยังจาง "เร็วๆนี้") + **ensemble balance** = P'Aim↔SA จูนต่อ (มี `window.__peaks()` · ค่าเป็น named const)
- **B102 รับข้อ4 มือถือ** — resolver ถูก (desktop) · ถ้า P'Aim ยืนยันมือถือป้ายถึง 4/4 แต่เงียบ = AudioContext suspend → เปิดงาน wake-lock แยก
- **B103 `.gitattributes` LF** (`b103-gitattributes` · dev เสร็จ) — renormalize · merge ได้แล้ว (EditorMode.vue land หมด) · **ควรทำ (กัน EOL noise ตอน cherry-pick)**

**บทเรียน launch (เข้า §กติกา):** (1) audio bug = วัด real output (AnalyserNode/OfflineAudioContext peak) ไม่ใช่ fire-ไม่-error (2) **UI มือถือ verify บน device emulation จริง 360/412 + per-button right≤viewport · Chrome font-boosting (text-size-adjust) เจอเฉพาะ Chrome มือถือจริง** (3) tester gate = เทียบ spec เต็มทุกข้อ · P'Aim ไม่ควรเป็นคนจับ spec-gap/บั๊กเอง

---

## 🟢 LIVE — รอบ 21 `01765cb` (13 ก.ค. · LAUNCH 3 โหมดเสียง)
main = `01765cb` (base=main · FF สะอาด) · **นโยบาย: PM คุม deploy เอง · deploy fix ที่ผ่าน tester** (§กติกา deploy)
- **รอบ 21 (LAUNCH):** B107 3 โหมด (arranger `src/lib/arranger/*` + `playEnsemble` + `SoundControl.vue`/`soundOptions.js` + self-host `public/samples/` + `public/sw.js` offline) · merge `b107-step9-instruments` → base (`01765cb`) → main FF
- ประวัติ (7-20): DockKey · slur/tie · B095 ล็อกหมวด · B097 undo · B098 tools · B099 ไท · B100 leave-warn · B101 copy-paste · B102 ร้องรับ · B104 3-mode chord · B105 real-time · B107P1 grand · GATE (public 0 เพลง) — **ทั้งหมด live + อยู่ใน base (superset · verify แล้วตอน merge launch)**

## 🔴 GATE ACTIVE (สำคัญสุด)
- 123 เพลง verified=false → **public เห็น 0 เพลง** ("เพลงกำลังตรวจทาน...") · ทีมล็อกอิน = เห็นครบ
- **▶ งานหลัก:** ทีม review อนุชน 122 ทีละเพลง → กด "✓ ตรวจแล้ว" → โชว์ public · กลไก live (`EditorMode.markVerified`) · **0/122 = ยังไม่มีคนเริ่ม** · tracker `docs/pm/review-anuchon.md` (อนุชน clean 80 + ติดธง 42) · PM re-run query นับ progress

## 🎯 รอ P'Aim ตัดสิน (ไม่บล็อก)
- SA interlinear ≥3 ภาษา (`task_aea51f3c` mockup) · B080 expert standards · B028 audit log (3 Qs) · i18n · สิทธิ์ลบเพลง
- import เล่มใหญ่ "บทเพลงสรรเสริญ" (⏸️ พัก · เพลง 32 ใน DB รอพี่เปาตรวจ · report `hymnal-import.md`)

## 📌 follow-up เล็ก
- **🔗 shared-core token layer (P'Aim อยาก "แก้ที่เดียว" · deferred 13 ก.ค.)** — แผน SSOT = DS `docs/ds/phrakham-parity.md` §🔗: พระคำ author `assets/pk-tokens.css` (CSS-var SSOT: สี/radius/shadow/line-height) → เพลง copy+alias `--brand:var(--pk-brand)` เหมือน pk-scrollnav · **font-size เก็บ local** (root 16≠17 · แชร์แล้วรั่วแผ่นเพลง) · ไม่เอา submodule/monorepo · **ต้องประสานทีมพระคำ (pk pm4)** · phase: เพลงก่อน→พระคำ theme.scss ตาม
- B094 in-app confirm dialog (แทน window.confirm) · B087 FLAG_LABEL ไทย + `lem-yai`→"เล่มใหญ่" picker
- data/review: พี่เปา review 41 เพลงติดธง · Amazing Grace `insert-amazing-grace.sql` รอ run · detail `docs/backlog.md`

## 🔬 วิเคราะห์เสร็จ — รอ P'Aim เคาะ implement (pm22 · 13 ก.ค.)
- **ปรับ pleng → สไตล์ phrakham + zoom 125%** · report `docs/reports/analyze-phrakham-style.md` (branch `analyze-phrakham-style` `5de5dc2`) · SA เสร็จ analysis-only
- **ข้อสรุป A (zoom):** 125% = ค่า "ซูมเริ่มต้น" ของ Chrome Android ที่เครื่อง P'Aim (โดนทุกเว็บ · incognito ก็เป็น) **ไม่ใช่บั๊กโค้ด** · เห็นพังแค่เพลงเพราะ dock ไม่ทน zoom (จอเหลือ ~288px, DockKey.vue:78,604-609 เผื่อแค่ ≥360px) · รอบก่อน pin `text-size-adjust` = แก้ผิดกลไก (font-boosting ≠ page-zoom) · **แก้ 2 ชั้น:** A-1 เครื่อง P'Aim ตั้งซูมกลับ 100% (หายทันที) · A-2 ทำ dock ทน ~288-320px (=WCAG Reflow · M · ต่ำเสี่ยง · **verify มือถือจริงที่ 125%**)
- **ข้อสรุป B (design):** parity ~70% แล้ว (สี/ฟอนต์/เงา/footer ตรง) · quick-win: **B-1 ตัวหนังสือ 18px (แก้ zoom ต้นเหตุด้วย) · B-2 header ครีมอุ่น** → B-4 มุมโค้ง → B-3 บรรทัดโปร่ง(หน้าอ่าน) → B-5/B-6 (M) · ห้ามแตะ line-height แผ่นเพลง/รื้อ dock logic
- **P'Aim เคาะ (13 ก.ค.):** zoom แก้ที่เครื่องแล้ว (default zoom 100%) · เดินหน้าแค่ **design parity look&feel** · แบ่ง SA/Dev/Tester เหมือนเดิม · **SA = สายเดิม** (`analyze-phrakham-style` `local_cd5fddfc`)
- **⭐ ข้อกำหนดใหม่ P'Aim:** เพลง+พระคำ **ใช้ core เดียวกันเท่าที่ share ได้ (แก้ที่เดียว)** · **ทิศทาง P'Aim: ยึดแพตเทิร์นเดิม** (พระคำ=SSOT · เพลงดึงมาใช้ เหมือน `pk-scrollnav.js` · alias `--pk-*`) → ขยายไป design tokens · **KISS ห้าม submodule/monorepo** เว้นทำไม่ได้จริง · SA verify wiring ปัจจุบันก่อน · brief `docs/pm/brief-phrakham-parity.md`
- **✅ DS เสร็จ + PM review แล้ว** (`d0a29ff` · `docs/ds/phrakham-parity.md`)
- **shared-core: P'Aim เคาะ = ทำทีหลัง** (13 ก.ค.) · ค่าตรงกันอยู่แล้ว ทำตอนนี้ยังไม่เห็นภาพเปลี่ยน + ต้องประสานทีมพระคำ → **ปล่อย 5 tweaks เสร็จก่อน** · แผนเก็บไว้ครบใน DS §🔗 (`1ec3cfd`) → ดู §📌 follow-up
- **🚩 B-2 (สีหัวเว็บ) — PM verify ยืนยัน premise เดิมผิด:** `theme.scss` ไม่ override navbar bg → พระคำ = `#f8f9fa` = เท่าเพลงเป๊ะ · "เหมือนพระคำ" = **ตัด B-2 ทิ้ง** (PM รับผิด: เคยบอก P'Aim ว่าครีม — ผิด) · **รอ P'Aim เคาะ: ตัดทิ้ง(ก แนะนำ) / ครีมอุ่นต่างจากพระคำ(ข)**
- **P'Aim เคาะ B-2 = (ก) ตัดทิ้ง** (13 ก.ค.) · scope final = **B-1,3,4,5,6** · แจ้ง SA ล็อก DS แล้ว · DS+report ย้ายเข้า base แล้ว (`git checkout` docs only)
- **จ่าย Dev แล้ว** — Dev session `local_72f2a19b` (worktree `keen-montalcini-f0f21a`, spawn_task ตั้งชื่อ branch เอง) · ลำดับ B-1→B-4→B-3→B-6→B-5 · self-verify AC + มือถือ 360/412 + regression แผ่นเพลง/dock · **รอ Dev report → Tester gate → P'Aim ดู → deploy**
- **DS re-sync (แก้ sync gap):** SA ล็อก B-2=DROPPED (`a85132e`) *หลัง* PM copy DS เข้า base → PM re-sync `git checkout` DS+report ล่าสุดเข้า base แล้ว (verify B-2=DROPPED บน base) · ส่ง heads-up Dev: verify fork จาก studio-shell-redesign (ไม่ใช่ main) + DS final B-2 dropped
- **บทเรียน:** spawn_task fork worktree/branch เอง (ชื่อ `claude/*` ไม่ตามที่ prompt ขอ) + อาจ fork จาก HEAD primary clone → **ทุก brief Dev ต้องสั่ง verify base branch เอง** (git merge-base) ก่อนลงมือ
- 📎 เจอ core lib `assets/pk-navbar.js` + reader font-scale (`--pk-fs`) ใน phrakham (theme.scss:123,152) — เผื่ออนาคต shared toolbar (ไม่ใช่รอบนี้)

## 📥 inbox → PM
- _(ว่าง — analysis+DS+shared-core proposal ทั้งหมด processed แล้ว · shared-core deferred → §📌 · Dev กำลังทำ 5 tweaks branch `phrakham-parity`)_

---

## roster / routing (session id)
- **หลัง LAUNCH: สาย launch archive ได้หมด** (dev `local_3fc2030f` · tester `local_04292fd9` · SA เต็มวง `local_a5d4b566` · research `local_7015b6a7` · icon `local_a08937ac`) — งาน commit/deploy ครบใน git · icon/download-P3 branch ยังอยู่ (asset/plan) เปิดใหม่ได้เมื่อจ่าย
- **ทุกงานใหม่ = spawn worktree + session ใหม่** (1 งาน = 1 worktree = 1 branch) · ไม่ปลุกสายเก่า
- **env:** GitHub token `OneDrive/4 Personal/claude/.env`→`GITHUB_TOKEN_PLENG` · Supabase `SUPABASE_*_PLENG` · main อยู่ worktree `pleng-natural-tie` · **PM server bug บทเรียน: `npx vite ... &` ทำ vite ตาย (orphan) → ใช้ run_in_background ไม่ใส่ `&`**

**Deploy history:** รอบ11 `84d259c`(B095) · 12 `6e6653d`(B098) · 13 `54eba5c`(B097) · 14 `4513961`(B099) · 15 `6951c19`(B100) · 16 `b7341ee`(B104) · 17 `64c21cb`(B105) · 18 `b161984`(B101) · 19 `359872b`(B102) · 20 `509195c`(B107P1) · **21 `01765cb`(LAUNCH 3-mode audio)**

---

## กติกา PM (บทเรียนสะสม — memory มีครบ)
- **PM = คุมกระดาน + จ่ายงาน เท่านั้น** ไม่แก้โค้ดเอง · จ่ายไป session แยกจริง `send_message` (**ห้าม Agent tool**) · triage แค่พอเขียน brief (`feedback_pm_dispatch_real_session`)
- **⭐ audio feature = วัด output จริง (AnalyserNode/OfflineAudioContext peak>0) + ฟังหู** ไม่ใช่ "fire ไม่ error" · unit test = invariant ดักจริง (vel ต้องตกใน layer ที่โหลด · smplr เงียบ >3s ใน offline → วัด ensemble ด้วย LIVE analyser)
- **⭐ UI มือถือ verify บน device emulation จริง (360/412) + per-button right≤viewport** ไม่ใช่ computed 375 · **Chrome font-boosting → pin `text-size-adjust:100%`** (เจอเฉพาะ Chrome มือถือจริง · emulate ไม่ trigger)
- **tester gate = เทียบ spec เต็มทุกข้อ** (`feedback_tester_gate_full_spec`) · UI ทุก control/viewport · P'Aim ไม่ควรจับ spec-gap เอง · print feature = P'Aim verify จาก PDF จริง
- **รายงาน session-agnostic:** dev เขียน `docs/reports/<branch>.md` + §📥 inbox + ping "PM ปัจจุบัน" (อย่า hardcode ชื่อสาย)
- **merge:** cherry-pick เฉพาะ commit โค้ด หรือ merge branch ที่ fork ถูก · git-verify ก่อน gate (`git diff` three-dot จาก merge-base — เลี่ยง phantom deletion) · เช็ก `git branch --show-current` ก่อน commit · rerun test (`--exclude '**/.claude/**'`)
- **deploy:** merge/cherry-pick → base → verify test+build → align main=base + push (`--force-with-lease` ถ้า diverged · verify base ⊇ origin/main ก่อน) → poll live bundle หา launch marker (GitHub build stamp hash เอง) · GATE ทำ public 0 เพลง → editor/audio features ปลอดภัย
- ทุก P'Aim example/บั๊ก → กฎใน `ui-standards.md`/checklist · แก้ที่ process ไม่โทษคน · เก็บภาพ P'Aim ลง `docs/pm/realuse-assets/`

## 🎼 B107 P2 reference (SSOT `docs/ds/instrument-arranger-p2.md` · handoff `docs/reports/b107-p2-sa-handoff.md`)
- **5 เครื่อง:** Grand · Felt (กรอง Grand) · Nylon Guitar · Solo Violin · Cello — arranger 3 ชั้น + instrument-module (§4B) · **launch = piano/guitar solo + ensemble Option 1** (§6b.2: ตัด pad · violinFill call-response · violinCounter chorus · balance เปียโนนำ/ไวโอลิน −12dB/เชลโล −15dB)
- **ยังไม่ทำ:** felt/violin/cello เดี่ยว · ensemble presets อื่น · auto-instrumentation · MP3 P3 · guitar fret-voicing/rubato — architecture เผื่อครบ (เสียบไม่รื้อ)
