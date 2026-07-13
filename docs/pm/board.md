# PM board — pleng (ไม้ต่อ · refreshed 2026-07-13 · หลัง LAUNCH รอบ 21)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิค → git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
**⛔ เปิด PM session ใน worktree `C:\gl\krisada\pleng.phrakham.life-pm` เท่านั้น** (ไม่ใช่ primary clone · primary park ที่ `pm-primary-parking` · ดู `docs/sop.md` §5)
**เปิด PM session ใหม่:** `docs/pm/pm.md` → memory `pleng-pm-role` (+ feedback PM ชุด) → `docs/sop.md` → ไฟล์นี้ · **ตั้งชื่อ session ตามรอบ deploy ถัดไป (`pm22`)** · IP เครื่องเปลี่ยนบ่อย (เช็ก `Get-NetIPAddress`/vite Network line ก่อนส่ง URL)

---

## ▶ RESUME (hand-off pm22 → pm23 · 13 ก.ค. เย็น)
**🎉 pm22 = DEPLOY รอบ 22 `6cb8e68` LIVE** (phrakham look&feel: parity+header + bug issue1/2/3+repeat + favicon · https://pleng.phrakham.life) · kanban พี่เปา 4 บั๊ก → 🟢 เสร็จ · รายละเอียดใน §✅ DEPLOYED

**🔵 กำลังทำ / รอต่อ (pm23 สานต่อ):**
- **ป้ายสถานะตรวจเพลง** (team-only · GATE unlock) — Dev `task_5d4f34d6` กำลังทำ · รอ report → gate → **deploy รอบ 23**
- **🤝 menu design ร่วมกับ pk pm4 — เคาะจบแล้ว + ร่างสเปก** `docs/ds/menu-drawer-spec.md` (pushed) · **กฎร่วม:** ชิดซ้าย · nav text-only · **tools: picker=ปุ่มพรีวิว (font ก ข ค) / toggle=แถวเรียบ** (pk pm4 แก้ premise ผม: พระคำพอร์ตปุ่ม font 2 อันจากเพลงวันนี้ = ปุ่มถูกทั้ง 2) · <992px · **เพลงต้องแก้ 2 จุด (ชิดซ้าย + เอาไอคอน nav ออก) · พระคำ = baseline แล้ว** · **ค้าง: pk pm4 ratify (ฝากตอบที่สาย pl pm) → รายงาน P'Aim ร่วม → อนุมัติ → จ่าย dev 2 ฝั่งพร้อมกัน** · pm23 เช็กสาย pk pm4 `local_9db3b697`

**📋 to-do พี่เปา (root · ยังไม่จ่าย · §🐞):** issues4 (โครงเพลง▾) · issues5 (slur ข้ามห้อง render) · issues6 (คลิก preview→แก้ไข)

**🔴 เรื่องใหญ่สุด (สำคัญกว่าบั๊ก):** GATE — public เห็น 0 เพลง · ต้องทีม review อนุชน 122 กด ✓ (ยัง 0/122) · ป้ายที่กำลังทำช่วยเรื่องนี้

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

**Deploy history:** รอบ11 `84d259c`(B095) · 12 `6e6653d`(B098) · 13 `54eba5c`(B097) · 14 `4513961`(B099) · 15 `6951c19`(B100) · 16 `b7341ee`(B104) · 17 `64c21cb`(B105) · 18 `b161984`(B101) · 19 `359872b`(B102) · 20 `509195c`(B107P1) · 21 `01765cb`(LAUNCH 3-mode audio) · **22 `6cb8e68`(phrakham look&feel: parity+header + bug issue1/2/3+repeat + favicon)**

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
