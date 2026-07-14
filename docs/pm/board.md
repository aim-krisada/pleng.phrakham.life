# PM board — pleng (ไม้ต่อ · refreshed 2026-07-13 · หลัง LAUNCH รอบ 21)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิค → git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
**⛔ เปิด PM session ใน worktree `C:\gl\krisada\pleng.phrakham.life-pm` เท่านั้น** (ไม่ใช่ primary clone · primary park ที่ `pm-primary-parking` · ดู `docs/sop.md` §5)
**เปิด PM session ใหม่:** `docs/pm/pm.md` → memory `pleng-pm-role` (+ feedback PM ชุด) → `docs/sop.md` → ไฟล์นี้ · **ตั้งชื่อ session ตามรอบ deploy ถัดไป (`pm22`)** · IP เครื่องเปลี่ยนบ่อย (เช็ก `Get-NetIPAddress`/vite Network line ก่อนส่ง URL)

---

## ▶ RESUME (hand-off pm24 → pm25 · 15 ก.ค.)
**🎉 DEPLOY รอบ 24 `2c580a8` LIVE** (https://pleng.phrakham.life · verify bundle: `lyric-words`+`PKDrawer`+`flowing`+`easeUnder` พบ · `violin-iowa`=0 ไม่หลุด · GH Actions success) = audio round 2 + STEP 0 + GATE-leak fix + karaoke พยางค์ + drawer เพลง(ซ้าย เหมือนพระคำ · pk-drawer core) · **กู้เสียงเงียบ live แล้ว**
- **post-deploy verify (live · มือคน):** พี่เปา verify karaoke พยางค์ + drawer slide บน device จริง (ถ้าเพี้ยนแก้รอบ 25 · เสี่ยงต่ำ)
- **ยังทำต่อ (แยก · ไม่อยู่ใน deploy):** 🎻 violin `task_15a3f347` (spike เสร็จ · Iowa PD · **รอ P'Aim ฟัง A/B** `:5344/docs/spikes/violin-iowa-demo.html`) · 🎨 Remix ⏸️พัก (design เสร็จ รอ P'Aim เคาะ GATE1)

**--- ประวัติ pm24 ด้านล่าง ---**

## ▶ RESUME เดิม (pm23 → pm24 · 14 ก.ค. ค่ำ)

**⏯️ RESUME SNAPSHOT (ถ้า credit limit → เปิดใหม่หลัง reset อ่านตรงนี้ · P'Aim สั่ง "resume when reset active"):** ทุกอย่าง save ครบ (git commit + board + memory) · **ห้าม deploy อัตโนมัติ — รอ P'Aim go เสมอ** · สายที่วิ่ง (ปลุกต่อได้ไร้รอยต่อ · worktree อยู่ครบ):
- **🎹 รอบ 24 (จะ deploy)** — base มี: audio r2(ear-approved)+STEP0+GATE-fix+karaoke-fix พร้อม · **รอ 2:** (1) พี่เปา verify karaoke device (โหมดเนื้อล้วน) (2) drawer เพลง dev เสร็จ `task_b512fd83` → merge → push · **spec+exclude ล็อกไว้ §⏭️ รอบ 24**
- **🚪 drawer เพลง** `task_b512fd83` — consume `pk-drawer.js` (phrakham main · left) · 🔵 dev ทำ
- **🎻 violin** `task_15a3f347` — SA ใหม่ · P'Aim iterate · **ไม่เข้ารอบ 24**
- **🎨 Remix** ⏸️ พัก (design เสร็จ · P'Aim หยุดชั่วคราว) · **ไม่เข้ารอบ 24**
- **GATE-fix แยก** = worktree `../pleng-r24` (`r24-gate-fix` commit 14b996e · unpushed · เผื่อ deploy เดี่ยว)

**🎉 pm23 = DEPLOY รอบ 23 `bb0c8d3` LIVE** (role-gate+audit+badge+notation+menu parity+expressive audio) — รายละเอียด+verify ใน §🎉 DEPLOYED รอบ 23 ด้านล่าง
_(ประวัติ pm22 = รอบ 22 `6cb8e68` phrakham look&feel — เก็บใน §DEPLOYED รอบ 22)_

**⏭️ รอบ 24 (pm24 สานต่อ · 14 ก.ค. ค่ำ · P'Aim จะแก้ karaoke ใน session นี้):**
- **พร้อมใน base ครบ:** audio round 2 (P'Aim ear-approve · 626 tests) + STEP 0 (Grand 5 layer 12.9MB) + GATE-leak fix — **แต่ HOLD push** เพราะ:
- **✅ karaoke bug เจอ+แก้แล้ว (`c034de4` merge base):** ต้นเหตุ = **"โหมดแสดงผลเนื้อล้วน"** (ซ่อนโน้ต โชว์เนื้อ · ไม่ใช่เพลงเนื้อล้วน!) → เพลง v2 render เนื้อเป็น text ไม่มี .syl span + seg-playing gate ไว้แค่ v1 → ไม่ highlight · fix 1 บรรทัด (เปิด seg-playing เมื่อ lineLyricsOnly) · **ไม่ใช่ regression รอบ 2** (logic SongSheet เดิม) · 33 tests · **SA verify advancement (poll สด)** · **🔄 P'Aim ขอไฮไลต์ราย "พยางค์" ไม่ใช่ท่อน → SA แก้เป็น per-syllable แล้ว (`aca4a74`: render inline syllable spans โหมดเนื้อล้วน · syl-playing เดิน 35 พยางค์เหมือนโหมดเต็ม · เว้นวรรคถูก · 623 tests)** · ⚠️ **base มี c034de4 (ทั้งท่อน · เก่า) → PM re-sync เป็น `aca4a74` (พยางค์) ตอนใกล้ push** (ไม่ churn ระหว่าง P'Aim iterate) · **เหลือ พี่เปา verify device (per-syllable · โหมดเนื้อล้วน) → re-sync + ปลด hold รอบ 24**
- **GATE-fix แยก:** cherry-pick สะอาดใน worktree `../pleng-r24` (branch `r24-gate-fix` · commit b8b2a3b บน origin/main) **ยังไม่ push** (P'Aim สั่ง "รอ") — พร้อม push standalone ถ้าจะปล่อยเฉพาะ GATE fix
- **🚀 DEPLOY รอบ 24 — spec ล็อกโดย P'Aim (14 ก.ค. ค่ำ):**
  - **Trigger:** deploy เมื่อ **(1) karaoke + (2) drawer** ผ่าน · **drawer ✅ merge base แล้ว** · **เหลือ พี่เปา verify device 2 จุด: (a) karaoke ไฮไลต์ทีละพยางค์ (โหมดเนื้อล้วน) (b) drawer slide-from-left** → ครบ → PM re-sync karaoke `c034de4→aca4a74` + push
  - **✅ รวม:** audio round 2 (ear-approved · กู้ hollow) + STEP 0 (5 layer) + GATE-leak fix + karaoke fix (`c034de4`) + **drawer เพลง (consume pk-drawer · `task_b512fd83`)**
  - **❌ ห้ามรวม/ห้าม merge เข้ารอบนี้: 🎻 violin (`task_15a3f347`) · 🎨 Remix** (ยังทำ/พัก · ไปรอบหลัง)
  - วิธี: merge drawer เข้า base → verify test+build → align main=base → push (violin/Remix อยู่ branch แยก ไม่ใน base = ปลอดภัย)

**🚀 pm23 ยิงขนาน 3 dev แล้ว (13 ก.ค. เย็น · P'Aim "เอาตามที่คุณเสนอ Go") — chip รอ/กดเริ่ม:**
- **[เลน 3] audit log B028 — ✅✅ Tester PASS 7/7 · PM merge เข้า base แล้ว** (`docs/reports/tester-audit-log-qa.md` · ลบ profile แล้วชื่อยังอยู่=actor_name snapshot จริง · integrity แก้ log ไม่ได้) · cherry-pick code-only จาก `distracted-shtern-255d85` `b6d7e2a` → base (3-way merge สะอาด · role-fix เลน4 `isApprover` คงอยู่ + audit RPC เข้ามาครบ) · verify บน base: db/004 6/6 (pglite Postgres) + verify 4/4 + approve-rpc/auditLog/RevisionHistory เขียว · +pglite devDep (`npm install` แล้ว) · **✅ db/004 รันบน prod แล้ว (13 ก.ค. ค่ำ · verify คอลัมน์ event/actor_name/op_group ขึ้น prod HTTP 200) — deploy-blocker เคลียร์** · เหลือ: วัด mobile 360/412 หลังมี data (post-deploy)
- **[เลน 5] เมนูเพลง — ✅✅ Tester re-check PASS 5/5 · PM merge เข้า base แล้ว** (boundary เป๊ะ 991=drawer/992=inline ตรง DS §4 · 768/900 drawer ไม่ regress desktop · report `docs/reports/tester-menu-breakpoint-qa.md`) · merge code-only `ShellBar.vue`+`styles.css` จาก `menu-breakpoint-992` (base ไม่แตะ 2 ไฟล์นี้ตั้งแต่ deploy 22 = checkout สะอาด) · verify base: ShellBar 7/7 · **รอ deploy รอบ 23**
- **[เลน 4] ปุ่ม "✓ ตรวจแล้ว" โชว์เฉพาะ approver — ✅ เสร็จ + PM merge เข้า base แล้ว** (`EditorMode.vue` `v-if loggedIn→isApprover` · จาก branch `sad-jennings-08f0ad` `fd314c9` · เอาเฉพาะโค้ด+test+report ไม่เอา board dev พ่วง) · git-verify diff สะอาด · 4/4 verify tests ผ่านบน base · report `docs/reports/verify-button-approver-gate.md` · **รอ deploy รอบหน้า (batch)**
- **[เลน 2] notation (issue8 beam + issues5 slur) — ✅✅ Tester PASS · PM merge เข้า base แล้ว (code-only 7 ไฟล์)** `task_4a0e274c` · branch `jovial-roentgen` `b287e84` · tester: golden 10/10 + Tier B บนจอ (beam ตามคำ · slur ข้ามห้อง 1arc/wrap 2ส่วน) · 545 tests · report `docs/reports/tester-notation-qa.md` · **⚠️ branch fork ฐานเก่า → merge เฉพาะ 7 ไฟล์ notation (ไม่ merge branch เต็ม = จะ revert เลน 3/4/6)** ✓ ทำแล้ว · verify base: notation/NoteRow/SongSheet 57/57 · **P'Aim เคาะ (ข) ขึ้นเลยเชื่อ QA บนจอ+golden — พี่เปา print/verify live หลัง deploy (ถ้าเพี้ยนแก้รอบหน้า)** · ไม่ regress issues2/B076/B069/B099

**🎉 DEPLOYED รอบ 23 — `bb0c8d3` LIVE (14 ก.ค. · P'Aim go · https://pleng.phrakham.life)** — 6 เลน: role-gate + audit-log(+db/004 prod) + review-badge + notation(beam ตามพยางค์+slur ข้ามห้อง) + menu parity + expressive audio(+popover พอดีจอ) · **verify prod จริง: bundle มี `easeUnderHold`/`approve_and_publish`/`ประวัติการแก้ไข`/`ประกายเสียง` + HTML Last-Modified หลัง push + GH Actions success** · push FF `git push origin studio-shell-redesign:main`
**📌 post-deploy follow-ups (pm24):**
- **🚪 drawer-parity (P'Aim 14 ก.ค. · เลือก ก):** drawer เพลงเปิดจาก**ขวา** ≠ พระคำ (top-right toolbar dropdown + nav กางจากซ้าย) + ขัด "ชิดซ้าย" → **✅ SA verify เสร็จ + 2 PM เห็นตรงกัน (14 ก.ค.):** พระคำ = Bootstrap collapse ไม่มี drawer · **ข้อเสนอร่วม = left off-canvas drawer + scrim ทั้ง 2 เว็บ (align-UP world-class)** · แก้ SSOT `menu-drawer-spec.md` แล้ว (`docs/ds/menu-drawer-parity-fix.md`) · สัญญาร่วม = เปลือก drawer (ไม่กำหนดเครื่องมือในเมนู · per-site) · **🏛️ P'Aim: drawer = core lib ตัวเดียวที่พระคำ · เพลงเรียกใช้ (แบบ pk-scrollnav/DockKey · แก้ที่เดียว) → พระคำ author  vanilla core (ไม่ใช่ Bootstrap offcanvas native · เพลง Vue แชร์ไม่ได้) · ส่ง pk pm5 แล้ว** · **🟢 P'Aim GO (14 ก.ค.): "พระคำสร้าง core" → พระคำ author `assets/pk-drawer.js` (จ่าย dev แล้ว) · decisions: ทิศ=left · ☰ ทุกหน้า + tools contextual (nav persistent มาตรฐานสากล) · API SSOT = phrakham `pm/spec-pk-drawer.md` (focus-trap re-query + refresh()) · เพลงรอ consume เมื่อ core เสร็จ (import+mount Vue panel+☰ ซ้ายบน)** · **✅ core เสร็จแล้ว: `assets/pk-drawer.js` บน phrakham `feat/pk-drawer` (61542cd left off-canvas)** · **P'Aim เคาะ "ปรับเมนูเพลงเหมือนพระคำ = (ก) consume core" (14 ก.ค. · จากภาพพระคำ live drawer ใหม่)** → **✅ pk pm5 ยืนยันครบ 3 (SSOT = phrakham `main:assets/pk-drawer.js` 61542cd left · live/นิ่ง · API+focus-trap re-query ครบ · ⛔ ไม่ใช่ feat/pk-drawer-right) → ✅✅ **Dev เสร็จ + PM merge เข้า base แล้ว** (`peaceful-clarke-c4f54a` `26ca8ba`) — vendored `src/lib/pk-drawer.js` **verbatim ตรง phrakham main:61542cd (พิสูจน์ byte-identical = แก้ที่เดียวจริง)** + ShellBar `PKDrawer.create side:'left'` (ซ้าย+ครีม+scrim) · backdrop regression กันไว้ (Studio menu click-away คงอยู่) · verify: ShellBar 7/7 + build + dev real-browser AC1-4 + 627 tests · **เหลือ พี่เปา verify slide-from-left บน device** (preview tab hidden = animation freeze · endpoint ถูก)** · **PM บทเรียน: อย่าเดา parity — เปิดดูจริง (feedback_verify_parity_live_computed)**
- **🎵 notation:** พี่เปา print #8/#12/เพลงเอื้อน เทียบหนังสือ (live) · เพี้ยน→แก้รอบหน้า
- **🎹 ROUND 2 audio (P'Aim 14 ก.ค. · ทิศ: โหลด sample ครบก่อน → ออกแบบจากของจริง · ไม่ band-aid):**
  - **✅ STEP 0 เสร็จ + PM merge เข้า base แล้ว** (`gallant-maxwell-ad4aa5` `51abe63` · code+assets-only · base ไม่แตะไฟล์นี้ = สะอาด · sampler 13/13) — Grand ครบ 5 layer (PPP/PP/MP/MF/FF · PD · self-host · Grand 2.4→12.9MB · samples รวม 21MB) · velocity-in-layer guard (mute-bug ปิดตายเชิงโครงสร้าง) · **comp ลง PPP ได้แล้ว = มือซ้ายเบาลงตามที่ P'Aim อยากได้** · offline-verified · **ยังไม่ deploy** (round 2 ก่อน) · report `docs/reports/grand-velocity-layers-step0.md` · **🔵 SA round 2 กำลัง iterate `task_f4bc785a`** (branch `vigilant-montalcini-c4c54d`) — P'Aim ฟัง+feedback แล้ว 4 รอบ: (1) hollow-gap fix half-note pulse (2) per-role mix ทำนองนำ/คลอ PPP (3) คลอไล่ 4 ระดับ (ลดพื้น GAIN_MIN + chordGain · ไม่แบน) (4) **ลูกรับส่งซ้าย-ขวา `fills.js`** (มือซ้ายตอบ chord-tone นำเข้าวรรค · fillLevel 0.4) (5) slash chord (6) passing bass (7) flowing legato comp default (8) slash root-first (9) sus4 voicing-swap · **(10) ⭐ เมนู "ปรับละเอียด" 12 เทคนิค** (toggle+slider · live-apply · persist · reset · 2-ชั้น preset/fine · SSOT `techniques.js`) — เครื่องมือให้ P'Aim ปิดทีละตัวหาตัวที่ไม่เพราะ · tests 622 เขียว · **round 2 ครบฟีเจอร์แล้ว** + ตามด้วย: คีย์ A→โซน A4 (พี่เปา · playback pitch เท่านั้น) · ซ่อนเมนูปรับละเอียดตอนกีตาร์ · **🎤 fix karaoke เพลงเนื้อล้วน (พี่เปาเจอ · หน้าฝึกร้องไม่วิ่ง) — ⚠️ verify sandbox ไม่ครบ (SA flag ตรงๆ) → เงื่อนไข gate: พี่เปาต้องลอง real device กับเพลงที่เจอปัญหาก่อน · ถ้าไม่วิ่ง ขอ id เพลง** · P'Aim iterate ตรง SA @ :5420 · **เหลือ P'Aim เคาะเสียง final + พี่เปา verify karaoke → PM gate → deploy รอบ 24 (เสียง + GATE fix + drawer · กู้ live hollow)**
  - **🔴 GATE จับได้ก่อน push (14 ก.ค.): karaoke highlight ไม่ขึ้น (real device incognito :5420)** — P'Aim/พี่เปาทดสอบ **เพลง 1 พระเจ้าเป็นความรัก** (`f266baf9`) = **มีโน้ต 47 ตัว + arrangement ครบ (ไม่ใช่เนื้อล้วน!)** → highlight พังบนเพลงมีโน้ตด้วย = กว้างกว่าที่คิด · **สงสัย regression จาก round 2 (songToNotes/midi.js)** · ✅ round 2 merge base แล้ว (626 tests) แต่ **HOLD push จนแก้** · ส่ง SA ตรวจด่วนแล้ว (`local_8d2bfd37`) · **P'Aim ตอบ: เพลงเล่นได้ (เสียง+เวลาเดิน) แต่ highlight ไม่ขยับ = บั๊กที่ตัวไฮไลต์ (li/si index ไม่เดินตาม playback) ไม่ใช่ playback** → ส่ง SA เจาะ onNote/tick→highlight sync · **⚠️ SA เดาผิดรอบแรก (ว่าเป็น Grand 12MB โหลดไม่ขึ้น/ไม่เล่น) — P'Aim ยืนยันเพลงเล่น = ตัดทฤษฎีโหลด · PM แก้ความเข้าใจ SA แล้ว: อาการ = เล่นได้แต่ highlight ค้าง/ไม่ advance (SA เห็น '.syl-playing 1 ตัว' = อาการค้าง ไม่ใช่ทำงาน)** · SA เจาะใหม่ทำไม playingSyl ไม่เลื่อนตาม onNote(ยิง 35 ครั้งพร้อม syk) · **→ ✅ RESOLVED (ดู §⏭️ รอบ 24): ต้นเหตุจริง = โหมดแสดงผลเนื้อล้วน (ไม่ใช่เพลงเนื้อล้วน/ไม่ใช่ load/ไม่ใช่ regression) · fix `c034de4` merge base แล้ว · รอ พี่เปา verify device**
  - **🎻 Violin เดี่ยว — SA `task_15a3f347` (branch `charming-cori-25514b`) · 🔵 research spike** (P'Aim สั่ง 14 ก.ค. · **ไม่เข้ารอบ 24**) — P'Aim ฟังเดโมแล้ว **ยังไม่เพราะพอ** · root cause = sample VSCO-2 **single-dynamic** (หรี่/เร่ง = แค่ volume · แบน · เหมือน Grand ก่อน 5 layer) → ต้องหา **multi-dynamic (pp/mf/ff)+vibrato** · **⚠️ ข้อจริง: solo violin คุณภาพสูงส่วนใหญ่ commercial · ฟรี PD/CC0 จำกัด → เต็ง University of Iowa MIS (PD หลาย dynamic)** · spike = audition 2-3 คลังฟรี→วัด→เลือก→self-host offline→เดโมใหม่ · **ถ้าฟรีดีสุดยังไม่ถึง Grand → SA flag → PM เอาให้ P'Aim ตัดสิน** · **✅ spike เสร็จ:** Iowa MIS (PD · pp/mf/ff) = ตัวเดียวที่ผ่านเกณฑ์ฟรี · หั่น self-host `public/samples/CC0/violin-iowa/{pp,mf,ff}/` (8พิตช์×3 · 644KB · offline · `tools/slice-iowa-violin.sh`) + **เดโม A/B `docs/spikes/violin-iowa-demo.html`** (Iowa↔VSCO) · **รอ P'Aim ฟัง A/B เคาะ** (Iowa ผ่าน→SA wire multi-dynamic bowed+เปิดปุ่ม→tester→gate · ไม่ถึง→SA flag→PM เอาให้ P'Aim ตัดสิน) · commits 7002418/cb22d41 · ยังไม่แตะ src/ · report `docs/reports/violin-solo.md`
  - ลำดับหลัง STEP 0 (P'Aim iterate ตรง SA · PM gate): (1) ✅ per-role volume + tune Grand (2) ✅ เมนูเทคนิคละเอียด 12 (3) ⏸️ **Remix — P'Aim หยุดชั่วคราว (14 ก.ค.)** · design เสร็จแล้ว (stepper ◀ [แบบที่N] ▶ + derived-lock · `docs/us/remix.md`+`docs/ds/remix.md`+wireframe · P'Aim iterate design แล้ว) · **on-hold รอ P'Aim กลับมาเคาะ GATE1 → dev** · ยังไม่จ่าย dev · handoff `docs/reports/handoff-audio-round2.md`
  - **⚠️ KNOWN ISSUE (live รอบ 23 · P'Aim รับไว้ 14 ก.ค.):** easeUnderHold หลบแรงไป → บางท่อนเงียบ ~2 บีต ("ท่อนเงียบ") คนโบสถ์ได้ยิน · **P'Aim เลือกไม่ redeploy band-aid → กู้ทีเดียวตอน round 2** (PM ท้วงแล้ว · P'Aim ตัดสิน ข) · SA มี fix "half-note pulse" พร้อมถ้าเปลี่ยนใจ
- **📱 audit mobile:** วัด RevisionHistory 360/412 หลังมี data · **🧹 cleanup hero.png/.webp 6.5MB**

**🟡 รอ P'Aim (action ฝั่งพี่เอม):**
- **1.2 เช็ก Supabase dashboard: ติว = role `editor` จริงไหม** (จุดตาย — ถ้าติว legacy/approver จะเผยแพร่เองได้ ผิด use case) · P'Aim รับไปทำ
- 1.3 = รับความเสี่ยง client-side filter ไว้ก่อน (ไม่ทำ) ✅ เคาะแล้ว

- **[เลน 6] ป้ายสถานะ ✓ตรวจแล้ว/ยัง ในรายการเพลง — ✅✅ Tester PASS 5/5 · PM merge เข้า base แล้ว** (`docs/reports/tester-review-status-badge-qa.md` · contrast 7.22:1 วัดสด AA+AAA · 360/412 ไม่ตัด/ไม่ h-scroll · ป้ายตรง verified 121/121 แถว 0 mismatch · ตัวนับ 8/124) · merge code-only (`bookshelf.js`+test · `SongList.vue` · ไม่เอา launch.json/board dev พ่วง) · verify บน base: bookshelf 20/20 · ป้ายเขียว/เทา + ตัวนับ X/Y team-only · **รอ deploy รอบหน้า (batch)**
- **[เลน 7] 🎹 ทำเพลงให้เพราะ (เปียโนเดี่ยว Grand-only) — ✅✅ Tester PASS + P'Aim "ดีขึ้น GO" · PM merge + re-sync tuning ล่าสุด เข้า base แล้ว** (5 เทคนิค: BPM-auto/sparkle+สไลเดอร์/rubato/ท่อนรับแตกคอร์ด 1.93×/humanize + เบส pedal + **final tuning: easeUnderHold มือซ้ายหลบ/touch 0.31/gapFill 0.18**) · re-checkout arranger ล่าสุดจาก branch (base แตะแค่ merge ผมเอง = สะอาด) · 54 arranger tests · **ROUND 2 handoff `docs/reports/handoff-audio-round2.md`** (P'Aim: จัดเต็ม tune Grand ให้เลอเลิศ + เมนูเลือกเทคนิคละเอียด + Remix(ต้องมี UX designer·แก้ MP3) + timecode · caveat L/R→slider · variability↔MP3 determinism)

**📋 to-do พี่เปา (root · ยังไม่จ่าย · §🐞):** issues4 (โครงเพลง▾) · ~~issues5~~ → เข้า spec notation แล้ว · issues6 (คลิก preview→แก้ไข) · issues7 (ใหม่ · ยังไม่ triage)

**🔴 เรื่องใหญ่สุด (สำคัญกว่าบั๊ก):** GATE — **คืบหน้าแล้ว 8/124 verified** (เปาทยอย approve · เช็กสด 13 ก.ค. เย็น: total 124 · verified 8 · false 116) · public เห็น 8 เพลงที่ approve แล้วถูกต้อง (ยืนยันตรงภาพ P'Aim: อนุชน 1/4/7/9/11/13/14/16) · กลไกทำงานถูก · เหลือทีมทยอยตรวจต่อ
- **🐞🔒 GATE leak (P'Aim เจอ 14 ก.ค.) — 🔵 จ่าย dev `task_6cb6764f`:** ตัวเลือกเพลง "เปิดเพลงที่มีอยู่" ในหน้าแก้ไข (`EditorMode.loadSongList`) ดึงเพลง**ทั้งหมด ไม่กรอง verified** → anon เห็นเพลงยังไม่ตรวจ (SongList กรองถูกแต่ picker ไม่) · fix = ใช้ `visibleSongs(list, loggedIn)` ใน pickerOptions · scope EditorMode.vue · **ควร deploy รอบหน้า (correctness)** · รอ dev → gate

**🧹 cleanup:** `public/pleng-hero.png/.webp` (6.5MB · ไม่ถูกอ้าง ลบได้) · pk pm4 = สาย 📖 (running · reconnected)

**✅ DEPLOYED รอบ 22 — `6cb8e68` LIVE (13 ก.ค. เย็น · P'Aim go · https://pleng.phrakham.life):**
- **merge 6 อันเข้า base แล้ว** (`studio-shell-redesign`): (1) parity [ae576b2 · styles/Guide/About] (2) tie+triplet [NoteRow/SongSheet] (3) beaming [NoteRow] (4) editor-preview [EditorMode] (5) repeat-seek [midi.js] (6) **hero/favicon** [cc84c7b · index.html/public ชุด favicon+hero/ShellBar/SongList/styles.css `.sb-app-ico` merge ไม่ทับ parity] · เอาเฉพาะไฟล์โค้ด/asset ไม่เอา launch.json/board.md ที่พ่วง
- **522 tests + build ok · serve :5350** (bg `bg281b8zj`)
- **✅ หัวเว็บ phrakham-style เสร็จ + P'Aim iterate โดยตรง + integrate เข้า base แล้ว** (menu Dev `local_e359bb54` `dreamy-dijkstra` → ShellBar/styles/SongList/Icon/2 test · verify parity คงครบ `--fs-base 1.125`) · desktop=ชื่ออย่างเดียว · mobile=icon+🔍/☰ drawer · login ขวาสุด · hero ลบแล้ว · 523 tests+build ✓
- **✅ 7 อัน LIVE production แล้ว** (verify live bundle: sb-drawer/burger/app-ico/brand-text + favicon links + android-chrome 200): parity · tie+เลข3(issue1) · beaming(issue2) · ดูผลทั้งเพลง(issue3) · repeat · favicon · phrakham-header · kanban พี่เปา → 🟢 เสร็จ (รอบ22) · **cleanup ทีหลัง:** `public/pleng-hero.png/.webp` (6.5MB) ไม่ถูกอ้างแล้ว ลบได้
- **🆕 ป้ายสถานะตรวจเพลง (team-only · GATE unlock) — P'Aim เลือก (ก) deploy 7 ก่อน · ป้ายรอบหน้า** → **Dev `task_5d4f34d6` กำลังทำ** (branch ใหม่จาก base ที่ deploy แล้ว) · รอ report → gate → deploy รอบ 23
- **🤝 ประสาน pk pm4 (menu design ร่วม · P'Aim สั่งให้ 2 PM คุยกันเอง):** drawer เพลงต่างพระคำ 3 จุด (ชิดขวา→ซ้าย · เอาไอคอน nav ออก · ตัวอักษรไทยปุ่มใหญ่→แถวเรียบ) · หลักสากล = พระคำถูกทั้ง 3 · **send_message → pk pm4 `local_9db3b697`** ถามว่าพระคำแก้อะไรอยู่ + เสนอทำ **สเปกเมนูร่วม 1 หน้า** ให้ dev 2 ฝั่งทำตามอันเดียว · **รอ pk pm4 ตอบ → เคาะสเปกร่วม → จ่าย Dev ปรับทั้ง 2 เว็บ**
- **issue2 = P'Aim ถามซ้ำ = อยู่ใน batch แล้ว (ยืนยัน)** · เผื่อหมาย issues5 (cross-bar slur · to-do) — ถาม P'Aim
- **notation (tie issue1 + beaming issue2) = P'Aim เคาะให้ขึ้น deploy ด้วย** (13 ก.ค. · issue2 = แก้เจ๋ง zero-data-migration · อยู่ใน batch NoteRow.vue แล้ว) → ไม่ hold รอพี่เปาแล้ว (พี่เปา verify live ทีหลังได้) · **ยังไม่ push main จน P'Aim go (รอหัวเว็บใหม่เสร็จก่อน)**

**⏸️ PAUSE/HANDOFF (pm22 · quota ส่วนตัว 97% weekly → ย้ายบัญชีบริษัท):**
- **ทุกสาย idle (isRunning=false) — ไม่มีการเผา token · worktree อยู่บนดิสก์ + context สายเก่าคงอยู่ → ไม่ต้องสั่งหยุด/ปลุก** (ปลุกต่อทีหลังได้ไร้รอยต่อ)
- **pm23 resume เรียงเล็ก→ใหญ่:** (1) gate+merge 4 สายเสร็จ [issues3 1ไฟล์ · repeat 1ไฟล์ · issues1 2ไฟล์ · parity ผ่าน Tester 3ไฟล์] — merge เฉพาะไฟล์โค้ด (ไม่เอา launch.json/board.md ที่พ่วง) → (2) hero/favicon `local_cfd288df` **เงียบตั้งแต่ 10:01 · เช็กก่อนว่าติด login ไหม** → (3) issues2 beaming ✅ **เสร็จแล้ว (NoteRow.vue · zero data migration)** รอแค่พี่เปา verify look+print → merge รวม tie Dev branch → (4) menu Dev (หลัง hero/favicon land) · **หมายเหตุ: tie Dev branch `brave-pasteur` มี issues1(fe8991b)+issues2(d90acbb) 2 commit — merge ได้ทั้งคู่ (NoteRow/SongSheet)**
- **verify ค้าง (มือคน):** repeat ear-verify `:5309` · issues1 พี่เปา print PDF "ของขวัญ"
- **ยังไม่ deploy จน P'Aim สั่ง** (นโยบาย batch: parity+hero/favicon+bug รวมรอบเดียว)

**--- ประวัติ pm21 (LAUNCH รอบ 21) ด้านล่าง ---**

## ▶ RESUME เดิม (hand-off pm21 → pm22 · 13 ก.ค.)
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

## 🆕 งานใหม่ (pm22 · 13 ก.ค. บ่าย)
- **🖼️ hero + favicon + ไอคอนมุมซ้ายบน** — P'Aim ทำ asset เสร็จเอง (`C:\Users\aimkr\Downloads\เพลง hero-favicon\`: `pleng-hero.webp/.png` + `favicon_io/` ชุดครบ · ไอคอน = หนังสือเรืองแสงแบบ (ก) เหมือนพระคำ) · **จ่าย Dev แล้ว** spawn_task `task_260b6d03` · brief `docs/pm/brief-hero-favicon.md` · integrate เท่านั้น · **⚠️ merge manifest ไม่ทับ (PWA offline ไม่พัง)** · รอ Dev → gate → P'Aim
- **🐞 บั๊กพี่เปาชุดใหม่ (survey ทั้งโฟลเดอร์ 13 ก.ค.):**
  - **issues1 triplet+tie ✅ Dev เสร็จ** (`fe8991b` branch `claude/brave-pasteur-07bbed`) · root cause 2 ชั้น (cold-load re-measure หลัง fonts.ready + arc anchor ข้าม dash หาเลขต้นทาง) + เลข 3 → 12.3px bold · **layer render ล้วน (data v2 encode tie ครบ · ไม่เด้ง lane)** · 278 tests + no-regression · **git-verify scope = NoteRow+SongSheet+test สะอาด** (⚠️ merge เอาเฉพาะโค้ด · ไม่เอา `.claude/launch.json`+`board.md` ที่ Dev พ่วง) · **ค้าง: visual verify + พี่เปา print PDF "ของขวัญ" ยืนยันบนกระดาษ** · Live http://192.168.1.124:5418/#/song/74ebe8b8...
  - **issues2 เอื้อน vs slur ✅ วิเคราะห์เสร็จ (`c675cd8` · report PART 2)** → **ไม่ใช่บั๊กเล็ก = decision convention โน้ต:** เอื้อนสั้นในบีท (`6 5`) หนังสือ = **beam เส้นใต้เชื่อม ไม่มี arc** · app = slur arc + เส้นใต้แยก (data ใส่ `(6_ 5_)`) · **Option A:** beat-based beaming ใน render + DA ล้าง `( )` คู่เขบ็ตในบีท (เอื้อนยาวข้ามบีทคง arc) · **blast 120 เพลง + ต้อง DA + กลับ design เดิม** → **✅✅ Option A prototype เสร็จ (`d90acbb` · NoteRow.vue เดียว 164บรรทัด · 522 tests)** · **⭐ zero data migration — ไม่ต้องแตะ 120 เพลง!** (render ตรวจ same-beat + suppress arc เอง · `( )` เดิม harmless) → บั๊กใหญ่กลายเป็นเล็ก ความเสี่ยง rollout ต่ำ · verify ข้ามเพลงเทียบหนังสือ (ในโลกนี้/เพลง5/ของขวัญ) ผ่าน · **ค้าง: พี่เปา verify look** (`:5418` 3 เพลง) **+ print PDF** → ok แล้ว rollout (รวม issues1 หรือแยก) · commit d90acbb แยกจาก issues1 fe8991b ได้
  - **issues3 "ดูผลทั้งเพลง" ≠ แผ่นเพลง ✅ Dev เสร็จ** (`2031962` branch `claude/trusting-joliot-780da7`) · root cause = preview ล็อก 42.05em (A4 print) vs sheet จอ 68.4em → ตัดห้องเร็ว · fix = วัดคอลัมน์จริง ตัดห้อง em เดียวกับหน้าแผ่นเพลง · **แตะแค่ EditorMode.vue → ไม่ชน SongSheet (ไม่ต้อง rebase)** · 94 tests · PM เคาะคง 720px (adjustable ทีหลัง) · **merge เอาเฉพาะ EditorMode.vue** · รอ gate + พี่เปา verify
  - kanban พี่เปา **จัดระเบียบแล้ว (P'Aim สั่ง):** issue1/2/3 + repeat → `2-กำลังทำ` (ลบ root · repeat เปลี่ยนชื่อเลิกผูก issue4) · **root = to-do:** issues4/5/6
  - **⚠️ to-do ใหม่ (พี่เปาเติมไฟล์ · ยังไม่จ่าย · หลัง deploy review):**
    - **issues4 ≠ repeat!** (พี่เปาเติมข้อความ) = **โครงเพลง/ทำนอง: ▾ ย่อขยาย "โครงเพลง" ให้เหมือน "ทำนอง"** (editor UI)
    - **issues5** = **slur ข้ามห้อง render ผิด** (พิมพ์ถูก อยู่คนละห้อง แต่แผ่นเพลงโชว์ผิด) — notation lane (เกี่ยว NoteRow/SongSheet)
    - **issues6** = **feature:** ใน"ดูผลทั้งเพลง" คลิกโน้ต → เด้งไปบรรทัดนั้นในหน้าแก้ไขเลย (ไม่ต้องเลื่อนหา)
- **🎨 เมนูสไตล์พระคำ (desktop+mobile · P'Aim 13 ก.ค. · ภาพ `Screenshot_20260713_164458_Chrome.jpg`)** — แฮมเบอร์เกอร์+ไอคอนซ้ายบน+ค้นหา+หมวด "เครื่องมือ" (Aa/ตั้งค่า/ดาวน์โหลด · = phrakham pk-navbar) → **✅ SA DS เสร็จ** `docs/ds/menu-parity.md` (`41708f0`) · แมปตามเครื่องมือจริง pleng (ShellBar เดียว · nav ซ่อนใน ▾ · Aa/⬇ contextual หน้าเพลง · ยังไม่มี ☰) → desktop nav inline + mobile ☰ drawer + หมวด "เครื่องมือ" · **PARKED (บล็อก: Dev เมนูต้องรอ hero/favicon merge — ชน shell-bar/teleport)**
  - **4 Q รอ P'Aim (§8) — PM เสนอ default:** (1) 🔍 = ใส่เป็นทางลัดค้นหาหน้า list ✓ (2) ย้ายตัวอักษรไทย→หมวดเครื่องมือ ✓ (3) desktop หน้าเพลงยุบ nav เป็น ▾ เว้นที่ Studio ✓ (4) login mobile = ปุ่มแยกขวาบน (ไม่ยัดในเครื่องมือ) · **เอามาให้ P'Aim เคาะตอนใกล้ทำ (หลัง hero/favicon) ไม่รีบ**
- **🐞 บั๊ก repeat (= issues4) ✅ Dev เสร็จ** (`7d54a77` branch `claude/sad-davinci-518b6e`) · root cause = playback engine slice โน้ตทิ้งหัวแล้ว do…while วน array ที่ slice → คลิก=นิยามลูปใหม่ · **fix `src/lib/midi.js` ไฟล์เดียว** (seek เฉพาะ pass 0 · loop วนกลับต้น order/B102 SSOT) · **🟢 ไม่ชน SongSheet/NoteRow (ไม่ต้องจัดลำดับ merge)** · พิสูจน์ playhead: ก่อน `[2,2,2,2]`→หลัง `[2,0,1,2]` · 517 tests · **merge เอาเฉพาะ midi.js** · **รอ P'Aim/พี่เปา ear-verify** http://192.168.1.124:5309/

## 🔴 GATE ACTIVE (สำคัญสุด) — คืบ 8/124 (13 ก.ค. เย็น)
- เช็กสด: total **124** · verified **8** · false **116** → public เห็น 8 เพลงที่ approve แล้ว (ทำงานถูก · client filter `bookshelf.visibleSongs`)
- **▶ งานหลัก:** ทีมทยอย review → กด "✓ ตรวจแล้ว" → โชว์ public · กลไก live (`EditorMode.markVerified`) · **เปาเริ่มแล้ว (0→8)** · tracker `docs/pm/review-anuchon.md` · PM re-run query นับ progress (curl `songs?verified=eq.true` count)
- **users จริง: มีแค่ 2 (P'Aim + เปา · ทั้งคู่ approver)** · ติวยังไม่สร้าง account (P'Aim 13 ก.ค.) → เรื่องเช็ก role ติว=editor ยังไม่ต้องทำ (จะ auto=editor ตอนสมัคร · ปุ่มตรวจ gate isApprover พร้อมแล้ว)

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
- **✅ Dev เสร็จ** (`b70e53c` branch `phrakham-parity` · fork base ถูกต้อง) · PM git-verify: diff = styles.css(13)+About/Guide.vue เท่านั้น scope สะอาด · self-verify AC ผ่าน + มือถือ 360/412 ไม่ overflow · **ข้อจำกัด: Dev worktree Supabase ว่าง → chip20/regression แผ่นเพลง verify ผ่าน bundle+git diff ไม่ใช่คลิกสด**
- **✅ Tester PASS ทุก AC** (`tester-phrakham-parity-qa` `d022aee` fork tip `c127578`) · report `docs/reports/phrakham-parity-qa.md` · หลักฐาน live 360/412/desktop: body 18px ไม่รั่วแผ่นเพลง(verified #1) · card14 · reading-page lh1.8/max820 · ปุ่มหลักทึบ · header คง #f8f9fa · 0 error · **Network URL live: http://192.168.1.124:5420/**
- **2 note ไม่บล็อก:** (1) `.section-chip` 20px ถูกแต่ยังไม่มี component render (selector dormant) → PM เก็บไว้ (เผื่ออนาคต/ตรงพระคำ ไม่ใช่ dead จริง) (2) B-5 hover ขอบน้ำตาล = `@media(hover:hover)` เดสก์ท็อปเท่านั้น (by design กัน hover ค้าง touch) — มือถือไม่เห็น = ปกติ
- **สถานะ: ผ่าน gate แล้ว · รอ P'Aim ดูของจริง (URL ข้างบน) + เคาะ deploy** (PM แนะนำ batch รวม hero/favicon) · ยังไม่ merge base/deploy
- 📎 เจอ core lib `assets/pk-navbar.js` + reader font-scale (`--pk-fs`) ใน phrakham (theme.scss:123,152) — เผื่ออนาคต shared toolbar (ไม่ใช่รอบนี้)

## 📥 inbox → PM
- **✅ DS menu-parity เสร็จ** (SA · branch `analyze-phrakham-style` `41708f0`) → `docs/ds/menu-parity.md` · เมนู pleng สไตล์พระคำ desktop+mobile: ลิงก์นำทาง inline (desktop) · ☰ drawer + หมวด "เครื่องมือ" (mobile ตามภาพ) · แมป**ตามของจริง** (Aa/ดาวน์โหลด = contextual หน้าเพลง · ตัวอักษรไทย/บัญชี/🔍 = global · pleng ไม่มี ⚙ display-settings แบบพระคำ) · Lucide id + AC ต่อจุด ครบ · **🚩 จุดทับ shell-bar §7:** ต้อง merge หลัง hero/favicon (`task_260b6d03`) + คง Studio teleport (`#shell-left`/`#shell-menus`) → เสนอ desktop หน้าเพลงยุบลิงก์เป็น ▾ · **❓ 4 ข้อรอ P'Aim เคาะ** (🔍 เอาไหม · ย้ายตัวอักษรไทยเข้าเครื่องมือ · desktop เพลงยุบ ▾ · login ใน drawer) · refine ไม่ redesign · **รอ P'Aim review spec ก่อนจ่าย Dev**
- _(shared-core deferred → §📌 · 5 tweaks branch `phrakham-parity` Dev กำลังทำ)_

---

## roster / routing (session id)
- **หลัง LAUNCH: สาย launch archive ได้หมด** (dev `local_3fc2030f` · tester `local_04292fd9` · SA เต็มวง `local_a5d4b566` · research `local_7015b6a7` · icon `local_a08937ac`) — งาน commit/deploy ครบใน git · icon/download-P3 branch ยังอยู่ (asset/plan) เปิดใหม่ได้เมื่อจ่าย
- **ทุกงานใหม่ = spawn worktree + session ใหม่** (1 งาน = 1 worktree = 1 branch) · ไม่ปลุกสายเก่า
- **env:** GitHub token `OneDrive/4 Personal/claude/.env`→`GITHUB_TOKEN_PLENG` · Supabase `SUPABASE_*_PLENG` · main อยู่ worktree `pleng-natural-tie` · **PM server bug บทเรียน: `npx vite ... &` ทำ vite ตาย (orphan) → ใช้ run_in_background ไม่ใส่ `&`**

**Deploy history:** รอบ11 `84d259c`(B095) · 12 `6e6653d`(B098) · 13 `54eba5c`(B097) · 14 `4513961`(B099) · 15 `6951c19`(B100) · 16 `b7341ee`(B104) · 17 `64c21cb`(B105) · 18 `b161984`(B101) · 19 `359872b`(B102) · 20 `509195c`(B107P1) · 21 `01765cb`(LAUNCH 3-mode audio) · **22 `6cb8e68`(phrakham look&feel) · **23 `bb0c8d3`(round23: role-gate+audit-log+review-badge+notation beam/slur+menu parity+expressive audio) · **24 `2c580a8`(round24: audio round2+STEP0 5-layer+GATE-leak fix+karaoke per-syllable+drawer left pk-drawer core · กู้ hollow)******

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
