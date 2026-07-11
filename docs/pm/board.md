# PM board — pleng (ไม้ต่อ · กระชับ · pm4 2026-07-10 ค่ำ)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิคอยู่ใน git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
เปิด PM session ใหม่: อ่าน `docs/pm/pm.md` + memory `pleng-pm-role` (บทเรียน PM) ก่อน แล้วอ่านไฟล์นี้ · ประวัติเก่า → `docs/pm/board-archive-2026-07-10.md`

---

## ▶▶ ต่อ session (pm7 · assembled deploy รอบ 7 base · 11 ก.ค. บ่าย)
**ยัง sprint 7 · session = `pm7` ต่อ · อ่าน `docs/pm/pm.md` + `docs/sop.md` + memory ก่อน**
**สถานะ workers:** dev DockKey / tester / slur dev / section-ux dev / SA interlinear = **idle (`isRunning:false`) ทั้งหมด** (เช็ก 11 ก.ค. บ่าย) · ไม้ต่อจริงอยู่ใน git ครบ ไม่ต้อง re-ping · running มีแต่ phrakham.life2 (คนละโปรเจกต์)
- **✅ ฐานรวม deploy รอบ 7 ประกอบ+ตรวจแล้ว → `studio-shell-redesign` HEAD `b369a49`** · **317 test เขียว** (300 เดิม + 17 axe/invariant ใหม่ · "1 failed file" = notationLint process.exit เดิม ไม่ใช่บั๊ก) · **build เขียว**
- **merge เข้าฐานรอบนี้ (ทั้งหมด tester PASS):**
  1. **DockKey §D GATE-4 polish** `108167c` + **B079** download single-source `10e91d5` (merge `84f0b38`) — tester PASS 3 โหมด dock (`d2a1dc2`)
  2. **slur B076** Bézier ตามความกว้างจริง `c202e13` (merge `c845183`) — tester PASS geometry (`0edf690`) · conflict launch.json (พอร์ต) resolve เก็บทั้งคู่
  3. **tester a11y infra** (axe-core + `ui-invariants.js` + DockKey invariant spec) `b369a49` — npm test รัน a11y ในฐานแล้ว (follow-up ปิด)
- **🚧 GATE-4 defect (P'Aim 11 ก.ค.) → บล็อก deploy รอบ 7 · [dev เสร็จ → in tester]:** หน้าฝึกร้อง หัวสไลด์ไทม์ไลน์ชิดขอบ dock (เดิม 3px) — **dev แก้แล้ว** (`66915b8` branch `fix-sing-timeline-edge` · inset ราง+หัว 10px ในเซลล์เดิม ไม่ทำกว้างขึ้น · self-verify 375/768/1280 = 11/13/13px · ลาก 1:1 · 317 test) → **ส่ง tester (`local_03855226`) confirm D6 แล้ว รอผล** · server `192.168.1.124:5401` · report `docs/reports/sing-timeline-edge.md`
  - **pm7 ต่อ:** tester PASS → merge `fix-sing-timeline-edge` เข้าฐาน (มี doc-divergence: dev แตกก่อน commit process-rule ของ pm7 → 3-way keep ทั้งคู่ · board.md อาจ conflict inbox line) → re-serve 5400 → P'Aim ตรวจ → go
  - **process ปิดช่องโหว่แล้ว:** ui-standards + checklist **D6** (slider knob วัดสองปลาย ≥10px) แทน B1/B6 ที่กว้างไป → tester ดักครั้งหน้า
  - **P'Aim เคาะ (11 ก.ค.):** เสนอเพิ่มกรอบรอบ timeline → **ไม่ทำ** (PM เตือน nested-border ซ้อนในการ์ดที่มีกรอบแล้ว = ขัด minimalist · slider มาตรฐานไม่มีกรอบ · บันทึกใน ui-standards) → **สั่ง "รอ tester ผ่าน แล้ว deploy รอบ 7 เลย"** (pre-authorized deploy · contingent tester PASS)
  - **pm7 ต่อ (สำคัญ):** tester PASS → merge fix เข้าฐาน → **deploy รอบ 7** (align main=base + push · P'Aim สั่งแล้ว) → รายงาน version จริง vs live footer · ถ้า tester FAIL → หยุด แจ้ง P'Aim
- 🟢 ขนาน (ไม่บล็อก deploy): **SA interlinear ≥3 ภาษา** (mockup รอ P'Aim เคาะ) · **B080 expert standards** · Amazing Grace ในคลัง (พี่เปาฟังเช็ก)
- **✅ จ่าย 2 สาย bug พี่เปาแล้ว (11 ก.ค. บ่าย · หลัง deploy รอบ 7):**
  - **สาย A** = B082 + B069 · `SongSheet.vue` · branch `fix-songsheet-barline-tie` · **✅ dev เสร็จ (`314e99c` · SongSheet+test+launch · NoteRow/EditorMode ไม่แตะ · vitest 322 +5) → in tester (`local_03855226`)** · B069 ต้นเหตุ = ไท encode tie-START ที่โน้ตตัวแรกห้อง (CSS เดิมซ่อนไม่โดน) + **overlay เป็น 1 SVG/บรรทัด (เดิม SVG เดียวคลุมแผ่น = พิมพ์แค่หน้าแรก = bonus fix)** · B082 = ปิดเส้นเมื่อ beatCount==expected (Fine ไม่ซ้ำ) · dev `192.168.1.124:5410` · report `songsheet-barline-tie.md` · ⚠️ **print = ด่าน P'Aim**
  - **สาย B** = B081 (พรีวิว "ดูผลทั้งเพลง" กระดาษล้น) · `EditorMode.vue` · branch `fix-editor-preview-overflow` · **✅ dev เสร็จ (`22abb9d` · EditorMode เดียว · SongSheet ไม่แตะ · 317 test) → in tester (`local_03855226`)** · แก้ = render A4 print จริง ย่อพอดีด้วย font-size (ไม่ใช่ transform → tie ไม่เพี้ยน) WYSIWYG wrap · dev `192.168.1.124:5411` · report `editor-preview-overflow.md` · ⚠️ **AC2 print = ด่าน P'Aim** (dev ไม่เคลม print จาก DOM)
  - ⚠️ 2 สายห้ามแตะไฟล์ของกัน (A=SongSheet · B=EditorMode) · ทั้งคู่ **verify print PDF จริง** · รอ dev → tester → merge → deploy รอบ 8
  - 🔎 **note สาย A (จาก dev B):** ฐานรอบ 7 นี้ ไทข้ามห้องใน**พรีวิวลอย** render โค้งเดียวถูกแล้ว (NoteRow ครึ่ง start+end ซ่อนครบ · 0 doubled) → สาย A verify B069 บน**เคสจริงที่พี่เปาเจอ (เพลงที่ 3 · แผ่นพิมพ์/print)** อาจต่างจากพรีวิวลอย · อย่า assume พังทุกที่
  - kanban พี่เปา 3 ตัว ย้าย **รอทำ→กำลังทำ** แล้ว (`สถานะบั๊ก/2-กำลังทำ/`)
- **⭐ B083 จับคู่ทำนอง↔เนื้อ (พี่เปา bug1 + P'Aim ปัญหาจริง) = จ่าย SA ออกแบบแล้ว (`local_b6a88b87` SA โหมดแก้ไข):** import สลับทำนอง↔เนื้อ · เครื่องมือเปลี่ยนทำนองพัง (เปลี่ยน A→B แถบแก้เนื้อหาย เพราะผูก activeStanza ไม่ใช่ stanza ของท่อน · `EditorMode.vue:242/2028`) + ทำนองไม่มีชื่อ/พรีวิว + เนื้อ import เป็นก้อน · เคส **เพลง 2 "ของขวัญ"** · brief `brief-melody-pairing-sa.md` · **ส่งมอบ = mockup → P'Aim เคาะ → ค่อย dev** · kanban → กำลังทำ
- **B084 space bar เลื่อนช่อง (พี่เปา bug2)** = 📋 รอ reproduce (โค้ดมี space→ช่องถัดไปแล้ว · น่าจะช่องพิมพ์ก้อน/โน้ตไม่ไฮไลต์ตาม) · เพลง 2 เดียวกัน คนละอาการกับ B083 · kanban → รอทำ · dev ต้องดูสเต็ปจริงกับพี่เปา
- **📊 kanban พี่เปา (P'Aim 11 ก.ค.):** สถานะ bug พี่เปา mirror เป็น folder ให้พี่เปาเห็นเองที่ `OneDrive/4 Personal/pleng.phrakham.life/pleng2-pow-bug-report/สถานะบั๊ก/` (3 ช่อง `1-รอทำ`/`2-กำลังทำ`/`3-เสร็จแล้ว`) · **PM ต้องย้ายโฟลเดอร์บั๊กไปช่องถัดไปทุกครั้งที่สถานะเปลี่ยน** (จ่าย=→กำลังทำ · deploy ขึ้น live=→เสร็จแล้ว) + อัปเดต `อ่านตรงนี้-สถานะบั๊ก.md` · ตอนนี้ 3 ตัวอยู่ `1-รอทำ`
- **cleanup ค้าง:** ปิด dev server เก่า (:5315/:5372/:5376 อาจยังรัน) · worktree เก่า ~15

## ▶ RESUME (git-verified)
- **ฐาน `studio-shell-redesign` = main HEAD = `71b8d8f`** = **317 test + build** · main===base อีกครั้ง (clean FF)
- 🎉 **DEPLOY รอบ 7 = LIVE + verified (11 ก.ค. · `71b8d8f`)** — live footer stamp `71b8d8f*` (ยืนยัน bundle มี `71b8d8f` · ไม่มี `1a3aa65` เดิม) · `*` = CI build tree dirty (cosmetic · ไม่กระทบโค้ด · follow-up เล็ก)
- **ขึ้น live รอบ 7:** DockKey §D polish + B079 export single-source · slur B076 โค้งไม่บิด · **หัวไทม์ไลน์ไม่ชิดขอบ (D6 · knob 13px)** · tester a11y infra · (ของรอบ 6 ครบ)
- **✅ 2 สาย merged + combined-verified (11 ก.ค. เย็น · HEAD `3e931ab`):** Lane A (B069+B082 `b8e2c4a`) + Lane B (B081 `b82f6a9`) cherry-pick เข้าฐาน · **322 test + build** · **tester จับ B081 มือถือ FAIL (tie-overlay 679px ไม่หด) → merge Lane A ก่อน (overlay per-line) แก้เอง**: วัดจริงมือถือ 375 = overlay หด 351=กระดาษ · h-overflow 0 (เดิม 316) ✅ · เดสก์ท็อป+มือถือผ่านทั้งคู่
  - **🚦 ค้างที่ P'Aim = print เช็กจาก PDF จริง** (เสิร์ฟ `http://192.168.1.124:5400` --host): เพลง 3 (ไทข้ามห้อง) · เพลง 4 (เส้นปิดห้อง) · เพลงยาวหลายหน้า (ไทพิมพ์ครบทุกหน้า) · + พรีวิว "ดูผลทั้งเพลง" = กระดาษ → go → **deploy รอบ 8** → ย้าย kanban B081/B082/B069 → เสร็จแล้ว
- **✅ B083 melody-pairing = tester PASS บนเพลง 2 จริง (`0784961` · `17f49ee` EditorMode+test เดียว · ไม่แตะโมเดล · vitest 326):** MP1 เปลี่ยนทำนอง A→B ไม่หาย (บั๊กพี่เปา ✅) · MP2 พรีวิวโน้ต A≠B ✅ · MP3 ✂ แตกก้อน 137→266 ✅ (⚠️ ◀▶ tester trigger synthetic ไม่ขึ้น = ฝาก P'Aim กดมือ · ไม่ใช่ FAIL) · MP4 badge got/need สด ✅ · no-regress rail 1-line/326 test ✅ · branch `melody-pairing-dev` (ฐาน `e83afe7`) · dev `192.168.1.124:5412/#/studio`
  - **✅ merged เข้าฐาน (`76881bc` · 326 test + build) → เสิร์ฟ `--host :5450` รอ P'Aim LAN เพลง 2** · **⚠️ IP เปลี่ยน = `10.215.141.98`** (เก่า 192.168.1.124 คนละ network) · รอ P'Aim ยืนยัน MP3 ◀▶ ด้วยมือ + เปลี่ยนทำนอง + save/ดูผล → go → **deploy รอบ 9** → kanban B083 → เสร็จแล้ว

## 🎯 PM session ปัจจุบัน = `pm7` (sprint รอบ 7 · pm4 รับต่อเป็น pm7 เอง ไม่ handoff · P'Aim 10 ก.ค.)
- **กติกา (P'Aim 10 ก.ค.): เลข PM = เลข sprint/deploy รอบ** · pm4→รอบ6 · **pm7 = sprint รอบ 7**
- **🎯 เป้าหมายวันนี้ (P'Aim 11 ก.ค.) — ✅ ครบ + polish + slur + tester infra MERGED เข้าฐาน `b369a49` (317 test · build):** (1) DockKey 3 หน้า + §D polish + B079 (2) โครงเพลง (3) slur B076 — ทั้งหมด tester PASS → **🚦 GATE 4: เสิร์ฟฐานรวม `http://192.168.1.124:5400` (กำลังรัน) รอ P'Aim ตรวจ "ผลรวม" ก่อน deploy รอบ 7** · ✅ follow-up ปิด: tester infra เข้าฐานแล้ว · ⏳ ปิด server dev เก่า
- **⭐ process upgrade (P'Aim 11 ก.ค.):** Tier-B ทำอัตโนมัติผ่าน **Claude Browser MCP** (resize+วัดพิกัดจริง) · auto-loop `fix-verify-loop` (≤3 รอบ) ครอบ Tier-A+B · P'Aim เหลือแค่ทิศทาง/ความสวย
- dev/SA รายงานเสร็จ (session-agnostic): (1) `docs/reports/<branch>.md` (2) เพิ่มบรรทัด §📥 inbox (3) ping PM ปัจจุบัน · **อย่า hardcode ชื่อสายใน prompt**
- **เช็ก `git branch --show-current` ก่อน commit ทุกครั้ง** (spawn_task สลับ branch main dir ใต้มือ · ดู memory)

## 📥 inbox (รายงานเข้า → pm7 อ่าน)
- **🆕 สาย B — B081 พรีวิว "ดูผลทั้งเพลง" กระดาษล้น** `fix-editor-preview-overflow` (EditorMode.vue เท่านั้น +28/−12 · ยังไม่ push) — ✅ เปลี่ยนจาก nowrap+max-content (ต้นเหตุล้น) เป็น **render ที่สัดส่วน A4 print (178mm:1rem=42.05) แล้วย่อพอดีหน้าต่างด้วย font-size** (`container-type`+`100cqw`+`scrollbar-gutter:stable`) → wrap เหมือนกระดาษ · **ไม่มี h-scroll · ไม่ตัดคอลัมน์** · ย่อ font (ไม่ใช่ transform) → B069 tie overlay ไม่เพี้ยน · verify Browser MCP เพลง 1+4 (เดสก์ท็อป ~1:1 · มือถือ 360px no h-scroll · ratio คงที่ทุกความกว้าง) · 317 test + build + console 0 · **ค้าง: P'Aim print PDF จริงเทียบ (AC2 gate)** · report `docs/reports/editor-preview-overflow.md` · ⛔ รอ pm7 → tester
  - **ข้อสังเกตให้สาย A:** ฐานรอบ 7 นี้ ไทข้ามห้องในพรีวิวลอย render โค้งเดียวถูกแล้ว (NoteRow start+end ซ่อนครบ · 0 doubled)
- **✅ MERGED เข้าฐาน b369a49 แล้ว (pm7 11 ก.ค. บ่าย):** DockKey §D polish+B079 (`84f0b38`) · slur B076 (`c845183`) · tester a11y infra (`b369a49`) — ดู §▶▶ ด้านบน
  - **follow-up ค้างจาก B076:** P'Aim ควร print PDF จริง (verify print/PDF จาก PDF ไม่ใช่ DOM — memory) · **B069 cross-bar overlay (SongSheet คนละกลไก) ยังไม่ตรวจ** · detail `docs/reports/slur-bezier.md`

---

## ✅ merged เข้าฐาน deploy รอบ 7 (b369a49) — เดิมอยู่ §🟢 กำลัง build
- **dockkey-dev** (3 หน้า DockKey engine เดียว · §A/§B/§D + B079 · ถอด StudioDock) — merge `84f0b38` · tester PASS
- **editor-section-ux-dev** (โครงเพลงรายการเดียว · rename inline · ▲▼) `56fbdb4` — เข้าฐาน `2b8462b` ก่อนหน้า · tester PASS
- **slur-bezier B076** (`v-arc` Bézier ตามความกว้างจริง) — merge `c845183` · tester PASS
> merge sequencing เสร็จแล้ว: dockkey-dev + slur-bezier แตะ `EditorMode.vue`/`NoteRow.vue` คนละส่วน — merge clean, conflict มีแค่ launch.json (พอร์ต) resolve เก็บทั้งคู่

## 🔬 research/experiment (ขนาน · ไม่บล็อก)
- ✅ **Amazing Grace experiment เสร็จ** (`task_90eab2dc`) — PD-safe ยืนยัน (EN Newton1779+New Britain PD · TH แต่งเอง CC0) · เข้า v2 verify ผ่าน · 2-row EN+TH ใช้ได้ 0 โค้ด · report `docs/reports/bilingual-amazing-grace.md` · sample `docs/samples/amazing-grace.json` · **P'Aim เคาะ:** (1) ทำ interlinear จับคู่ 2 row (2) **เข้าคลังจริงทดสอบ** → session ทำ `tools/insert-amazing-grace.sql` (verified=false · พี่เปาฟังเช็ก melody syllabic) **รอ P'Aim run**
- 🟢 **SA interlinear หลายภาษา** (`task_aea51f3c`) — ออกแบบ "แสดงหลายภาษาคู่กัน render-only" · **⭐ ≥3 ภาษา (ไทย/จีน/อังกฤษ — P'Aim ใช้ในที่ประชุม)** ไม่ล็อก 2 · จับกลุ่ม N row · mockup ให้ P'Aim เคาะก่อน dev · brief `brief-bilingual-interlinear-sa.md` · dev รอบหลัง (ชน SongSheet → pm7 จัดคิว)
- ✅ **jianpu-ly research เสร็จ** (`task_c8d52b9f`) → report `docs/reports/jianpu-ly-study.md` (branch `research-jianpu-ly`) · **🟢 P'Aim ตัดสิน (11 ก.ค.): เอาแค่แนวคิดมาปรับปรุงของเราให้ดีขึ้นพอ — ❌ ไม่รับ LilyPond export / ❌ ไม่รับ MusicXML import** · แนวคิดที่รับมา = (1) เช็กลิสต์ syntax ตรวจ `notation.js` (gap เฝ้าดู ไม่รีบ: เขบ็ต 3 ชั้น/ห้องยก/DC-Coda · v2 playOrder แก้ซ้ำได้ดีกว่า volta) (2) แก้ B062/B069 เส้นเอื้อนบิด → คำนวณ Bézier ตามความกว้างจริง (เลิก `preserveAspectRatio=none`) · license Apache 2.0 → รวมใน GPL v3 ได้ (เอาแนวคิด ไม่ลอกโค้ด) · **pm7: จ่ายเป็น backlog ปรับปรุงในสายเราเอง ไม่มี dependency ภายนอก**
- ✅ **UI standards SSOT = P'Aim approve แล้ว** `docs/ui-standards.md` (5 de-facto + invariants + บังคับใช้ 4 ชั้น) — ทุก brief อ้างอิง · เฉพาะฟีเจอร์ = `docs/pm/dockkey-checklist.md` ต่อยอด
- 🧪 **Tester gate = ด่านของ *ทุก* UI delivery ก่อน P'Aim** (`task_afad8e4c`) — automate axe/no-scroll/target-size + ตรวจ ui-standards+checklist · **ห้าม UI ใดถึง P'Aim โดยไม่ผ่าน tester** (P'Aim 11 ก.ค. — โครงเพลงหลุดถึง P'Aim เพราะไม่ผ่าน tester = ช่องโหว่ที่ปิดแล้ว) · คิว: DockKey · editor-section-ux(แถวโครงเพลง) · B076 slur
- **⭐ process rule (P'Aim 11 ก.ค.):** ทุกตัวอย่างที่ P'Aim ยกมา = **เพิ่มเป็นกฎใน `ui-standards`/checklist** (ไม่ใช่แก้จุดเดียว) → tester ดักครั้งหน้า · เป้า = ดันคุณภาพ ~100% ก่อนถึง P'Aim · เพิ่มล่าสุด: list-row บรรทัดเดียว/▲▼ ข้างกัน/ไม่ตัดชื่อโหด
- **หลัก process (P'Aim 11 ก.ค. · memory `feedback_pm_process_not_output`):** มีมาตรฐาน→ตรวจ→iterate · เจอไม่ตรงแก้ที่ process ไม่โทษคน · PM = ensure process perfect

## 🎯 รอ P'Aim ตัดสิน (ไม่บล็อก)
- **B028 audit log** — DS `docs/ds/audit-log.md` · 3 Qs (branch `sa-b028-audit-log` docs · รอเคาะก่อน dev)
- **i18n** — `lang=th` + `translate="no"` ที่ NoteRow/ShellBar (แทน i18n เต็ม · ยังไม่ spawn)
- **สิทธิ์ลบเพลง** — approver-only vs ทีมทุกคน

## 📦 data/review + backlog (ไม่เร่ง · detail ใน `docs/backlog.md`)
- **พี่เปา:** review 41 เพลงติดธง (review_flags: 16 repeat/6 lint/28 words) · ตั้ง 10 COMPLEX repeat ใน Studio · verify undo/นับจังหวะ บน live
- `tools/repeat-6-simple.sql` — P'Aim อาจยังไม่ run · DA option B (repeat จาก geometry ~18) defer
- **ideas ใหม่:** ป้าย "ทำไม match" ในผลค้นหา · ค้นโน้ต match ข้ามท่อน (บังคับในท่อนเดียว) · B046 ชื่อ↔เนื้อ · B066 tempo

## 🚧 กำลังทำ (จ่ายแล้ว 11 ก.ค. ค่ำ)
- **B085 สติกกี้ + B086 ย้ายบรรทัด = ✅ dev เสร็จ → in tester (`8fe0c8c` · EditorMode+test · vitest 330 +4 · B085 sticky top:58px z4 · B086 reslice พยางค์ทุก verse)** · ⚠️ tester เน้น **เลื่อนจริง** (dev headless เลื่อนไม่ได้) · dev `10.215.141.98:5413` · **💡 dev flag → B088:** `copyLine`/`removeLine` ก็ไม่ reslice พยางค์ (latent · queued follow-up)
  - **📌 standing plan (P'Aim 11 ก.ค. เย็น):** tester B085/B086 **PASS → merge (cherry-pick `8fe0c8c` · EditorMode · git-verify+rerun test) → deploy รอบ 10** (align main=base + push + verify live · pre-authorized · ถ้า tester FAIL หยุด แจ้ง P'Aim)
- **B087 หน้าแรกใหม่ (เล่ม picker แบบพระคัมภีร์ · 9 เล่มตรงๆ · คงค้นหา)** = **จ่าย SA (spawn `task_0332e825`)** · taxonomy P'Aim เคาะแล้ว · ข้อมูลพร้อม (`book_refs`+`bookCodes.js`) · reference phrakham picker · brief `brief-home-redesign-sa.md` · **P'Aim: รีบ** → mockup → เคาะ → dev
- **นำเข้าเล่มใหญ่ "บทเพลงสรรเสริญ" (scanned 477 หน้า)** = session แยกรันแล้ว · **✅ เพลง 32 ตัวอย่างเสร็จ (P'Aim สั่ง import เพลงเดียวก่อน · ยังไม่ batch)** — v1 เนื้อล้วน (โน้ตว่าง เห็นบนเว็บทันที · ทีมเติมทำนองใน B083 ทีหลัง) · category **`lem-yai`** (เลข ~470 ไม่ชน anuchon) · verified=false · ไฟล์ `tools/hymnal-samples/s032.{json,sql}` · report `hymnal-import.md`
  - **🚦 ค้างที่ P'Aim+พี่เปา:** P'Aim รัน `s032.sql` เอง (guard+idempotent เพลงเดียว) → **พี่เปาตรวจเพลง 32 ในแอป** → ผ่าน = ล็อก template → DA ไล่ทีละเพลง (DA หยุดรอ)
  - **โทเค็นจริง = ~8-11K/เพลง** (1 เพลง/subagent · context แยก) → ~470 เพลง ≈ **~4-5M tok** ทั้งเล่ม
  - **💡 small follow-up:** frontend ต้อง map `lem-yai`→"เล่มใหญ่" (เหมือน `anuchon`→"ไทยอนุชน 120") · เกี่ยว **B087** (SA เล่ม picker ต้องรวมเล่มใหญ่เข้า taxonomy · book_refs vs category ให้สอดคล้อง) → flag ตอน B087 mockup กลับมา
- **B084 space bar** = 🟡 รอ reproduce (สเต็ปพี่เปา)

## 🧹 cleanup (เมื่อสายปิด)
worktree เก่า ~15 (`.claude/worktrees/` + `pleng-*`) · branch `claude/*` เยอะ · dev server เก่าหลายพอร์ต (`:5400`/`:5410-5413`/`:5450` อาจยังรัน) · `git worktree list` ดู · **IP ปัจจุบัน = `10.215.141.98`**

**Deploy history:** รอบ5 `1535e1f` · รอบ6 `1a3aa65` · รอบ7 `71b8d8f` · รอบ8 `e83afe7` · **รอบ9 `e7af727` = LIVE + verified (11 ก.ค. ค่ำ · B083 จับคู่ทำนอง↔เนื้อ · P'Aim LAN-approved · live bundle มี e7af727 ไม่มี e83afe7)** · main===base
kanban พี่เปา: **เสร็จแล้ว = B081/B082/B069/B083** · กำลังทำ = (ว่าง) · **รอทำ = B084 (spacebar · รอสเต็ปพี่เปา)**
**env:** GitHub `OneDrive/4 Personal/claude/.env` → `GITHUB_TOKEN_PLENG` (source ก่อน · repo public) · Supabase `SUPABASE_*_PLENG` · main อยู่ worktree `pleng-natural-tie`
