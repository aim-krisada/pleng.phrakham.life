# PM state — เพลง.พระคำ.ชีวิต (อ่านไฟล์เดียวนี้ + `decisions-log.md` = rehydrate PM ทันที)

> **สมองอยู่บน disk** → PM ตายเกิดใหม่ได้ · เก็บ **สั้น** · จบแล้วตัดออกทันที · มติ → `decisions-log.md` · เก่า → `decisions-archive.md`

## ▶ pl pm 46 เริ่มที่นี่ (handoff 24 ก.ค. ดึก · จาก pm45 · P'Aim สั่ง "PM เก็บงาน + session ใหม่")
> **pm46: ตั้ง title ตัวเองเป็น "pl pm 46" ก่อน** (workers หา PM จาก title prefix "pl pm" เลขสูงสุด · §4.5 r9) · report-back หลักผ่าน inbox `C:\gl\pm-inbox\pleng\`

### 🚀 pm46 · BATCH แก้ editor 7 ตัว LIVE บน /v2 แล้ว (deploy สำเร็จ+verified live · 24 ก.ค. ~22:35)
- **`integration/editor-fix-batch @717fb7a` (off 7afb038) = LIVE /v2** · รวม BI-004/dc-ds/symbol/BI-005/BI-006+007/new-song/BI-010 · test:all 1577/0-fail · `/v2/` bundle stamp 717fb7a · `/` (v1) stamp 393fe9e tree byte-identical ปลอดภัย · 0 SQL · deploy mechanism + assembler-caught-error → decisions-log (24 ก.ค. pm46)
- 🧪 **จ่าย regression-tester ตรวจ integration ทั้งก้อน live /v2** (hot-file SongViewer.vue union 4 feature · แต่ละชิ้น verified แยกแล้ว = catch fast-follow) — running
- 🔴 **P'Aim ทดสอบเองบน /v2 live:** BI-005 IME/มือถือจริง · BI-010 QR scan โทรศัพท์ · BI-007 role editor/approver (ล็อกอินจริง) · new-song server draft-save
- 🎯 **เฟส POLISH (P'Aim สั่ง · ทุกงาน world-class + G consult บังคับ ผ่าน ai-bridge Chrome :9335):**
  - **BI-011** ลบเส้นโค้งบนโน้ต (tie/slur) — session `567d43e1` running (เพิ่มเงื่อนไข G แล้ว)
  - **BI-012** คอร์ด inline — ✅ **Phase1 design+G เสร็จ · PM GATE อนุมัติ Phase2 build** (session `2347770c`) · finding: keyboard-continuous **มีอยู่แล้ว** (กด c→พิมพ์→Space เด้งถัดไป · G-reviewed) = REFINE ไม่ rebuild · gap: (1) click/tap โซนคอร์ดเปิด (2) **discoverability**=สำคัญสุด(P'Aim ไม่รู้ว่ามี) affordance+first-run hint (3) desktop caret vs touch chip (4) Tab/ghost-preview/aria · D6=KEEP ปุ่มล่างรอบนี้ · spec `docs/ds/bi012-chord-entry.md`
  - **issue9 BUILD** ย้ายชื่อเพลง+meta(คีย์·จังหวะ·ความเร็ว)+scripture เหนือเนื้อ — **P'Aim priority รอบนี้** (ทวงว่ายังไม่ทำ) · SA design+G เสร็จแล้ว → chip `task_1b479280` build (display phase1 ไม่แตะ DB · bpm null=ซ่อน · displayKey มีอยู่)
  - **BI-015** ลาก grip บรรทัดไม่ move (bug ใหม่) — ⚠️ BI-004 tester เคยว่า drag PASS แต่ใช้ CDP synthetic → chip `task_2bfde98b` repro pointer จริง+fix+G
  - **BI-016** เมนูไม่ยุบตอนคลิกนอก (systemic เกือบทุกเมนู) — chip `task_309b25f3` หา click-outside ร่วม แก้ทีเดียว+Esc+focus-out+G
  - **BI-012 gate2 เคาะแล้ว:** (ก) เลิก hard-block คอร์ดผิด **แต่เก็บ text+soft-mark ไม่ discard** (กันข้อมูลหาย · PM ตัดสินเองตามมาตรฐาน) (ข) D6 KEEP ปุ่มล่าง · advance=Space (G รอบ3) · pill preview แทน dropdown → build
  - **BI-014** คลิกข้างๆแล้ว highlight ค้างแต่พิมพ์ต่อไม่ได้ (focus↔highlight ไม่ sync) — chip `task_2c46146b` (analyze+G→STOP gate)
  - **BI-013** ลบบรรทัดใน StructureDrawer — audit ยืนยัน **หายจริง** (แถว sd-line มีแค่ ▲▼/คัดลอก/ทำซ้ำ · มี trash เฉพาะท่อน/ทำนอง ไม่มีของบรรทัด) → chip `task_ccd80630` (reuse onDelete pattern + undo/ยืนยัน + G)
- ✅ **audit `a6f51224` DONE (717fb7a):** BI-001..010 + item3/4 **present ครบทุกตัว** · **SB1 desktop = clean LIVE จริง** (single bar · ไม่มี share/⋮ ซ้ำ · ShellBar.vue:36/217/256/263) — **desktop ดีแล้ว แต่ ship ไปทั้งที่พี่เอม HOLD** · **SB1 มือถือ = ยังเป็น stopgap** (song ↗+⋮ ตก 2 แถวบนจอเล็ก · flag "รอแถบบนออกแบบใหม่" styles.css:625) = ตรงกับที่ HOLD ไว้ → **PM แนะ KEEP desktop (world-class) · มือถือคง temp รอ redesign** (รอ P'Aim veto)
  - 🧪 regression-tester `f09d703b` running (batch รวม live /v2)
- ⏭️ **queue ต่อ (redeploy ทีละตัว):** issue9 lead-sheet header (SA design เสร็จ) · SB1 มือถือ (P'Aim คิด) · item1 repeat-marker เพิ่มเติม
<!-- ARCHIVED assemble detail (ชิ้นย่อย verified) — ดู decisions-log 24 ก.ค. pm46 -->
<details><summary>assemble detail (verified · shipped)</summary>
- ✅ **CLEAN+Tester PASS พร้อม assemble:** BI-004 `@6549ae6` · dc/ds `@a31cce2` · BI-006 `@eae57c2` · **new-song `@db7ebce` Tester PASS** (create-in-inline/type/exit-no-trap/mobile44×44 · NOT PROVEN=server draft-save ต้อง creds · non-blocking)
- ✅ **symbol `@011190e` TESTER PASS ครบ 6** (no-collision = P'Aim #1 ยืนยัน screenshot · tie/toggle/octave/มือถือ) = clean พร้อม assemble · flag ไม่บล็อก: help panel "วิธีใช้" auto-open ทับ strip @360 จน ×-dismiss (first-run friction · P'Aim/pm46 เคาะว่า file ไหม)
- ✅ **BI-005 `@32e546c` TESTER PASS** (split-advance·no-clobber·latin·มือถือ360/412) — ⚠️ NOT closed: **IME composition จริง + OSK มือถือ** (CDP ทำไม่ได้ · acceptance ผ่าน · **ต้องมือถือจริง/P'Aim ก่อน ship**) · พร้อม assemble (logic solid)
- ✅ **new-song Tester PASS** (`287afc35` · verdict inbox `2026-07-24-tester-newsong.md`) — batch verified ครบทุกตัว = พร้อม assemble 100%
- ✅ **BI-007 `@19d9813` P1+4 G-refinements เสร็จ** (Chip C `5c330050` · suite 1525 · label ภาษาหน้าที่ · Saved/Submitted · มือถือ pill+ดูขั้นตอน→vertical stepper · anon verified live) — **role editor/approver = P'Aim ทดสอบเองหลัง deploy** (ไม่ต้อง creds · dev :5486 ค้าง)
- ✅ **BI-010 share `@82da968` (off 7afb038) merge-ready** — appBase() swap dev/LAN origin→https://pleng.phrakham.life คง sub-path (/v2 ถูก) · QR decoded=canonical (jsQR) · tests pass · NOT: eyeball QR pixel + phone scan จริง (P'Aim post-deploy) · issue9 header = queue build หลัง batch (base 7afb038)
- ⚠️ **BI-007 tip merge = `@19d9813`** (ไม่ใช่ 5f93562=ก่อน refinements) · chain: 7afb038→eae57c2(BI-006)→5f93562→19d9813 · cherry-pick BI-007 = เอาทั้ง 5f93562+19d9813 · dev :5486 ค้าง (P'Aim ลอง role: approver="อนุมัติและเผยแพร่" · editor="ส่งให้ผู้อำนวยเพลงตรวจทาน")
- **Tester `287afc35` = standby regression-check integration** (มี scripts: real-DnD · mobile-emu · WebAudio-RMS)
- **deploy = ✅ DONE (717fb7a live /v2)** · mechanism จริง = trigger บน main (empty commit) → workflow build v2 จาก ssr · ดู decisions-log
</details>

### ⏸️ HOLD/รอ P'Aim
- **SB1 มือถือ** (P'Aim ขอเวลาคิด · bundle SB1+BI-002+lint+paste รอ ship) · **topology swap** (defer · bug ยังเยอะ) · **issue8** = ไม่ดึง (P'Aim เคาะ) · **BI-007 role + audio-follows-jump ear-test** = P'Aim หลัง deploy
- **ai-bridge:** ✅ **MR ceo!13 MERGED** (P'Aim เลือก ceo/tools · tool home = `krisada/ceo` tools/aibridge/ · daemon UP :9335) · ⏳ ค้าง: enteam/ai-bridge !32 pointer (เคาะว่าเก็บ pointer ไหม) · broadcast SOP "ทุก session ใช้ `bridge.py ask G/N` เลิก meeting-room CDP" ยังไม่ทำ (pm46 broadcast ตอน session ใหม่ spin) · "waiting-web page" ที่ P'Aim จำ = ยังไม่ confirm หมายถึง tool ไหน


### ✅ deploy mechanism (RESOLVED — pm45 landmine เข้าใจผิด · assembler+PM git-verified 24 ก.ค.)
- **`origin/studio-shell-redesign` = ตัว /v2 live จริง** (ไม่ใช่ c90c18f=PM docs local) · **canonical editor base = `7afb038`** · integration `717fb7a` LIVE แล้ว
- **redeploy /v2 = empty commit บน main** (PAT ไม่มี actions:write) → workflow (identical main+ssr · trigger push:[main,ssr]+dispatch) build v1 จาก main + v2 จาก ssr เสมอ · **env-protection: เฉพาะ main deploy ได้ · ssr-run FAIL เสมอ**
- ⛔ **local -pm ssr (PM docs) ≠ origin/ssr (app) — ห้าม push -pm ssr ไป origin** · รายละเอียด → decisions-log 24 ก.ค. pm46

### 🎉 สถานะใหญ่: /v2 LIVE บน production แล้ว (deploy สำเร็จ+verified ก่อน 20:00)
- **`https://pleng.phrakham.life/v2/` = ตัวใหม่ live** (stamp `132a041` · แท็บหาย · ตัวแก้ inline ครบ · import/export ใน ⋮ · share-2 · ฟังได้ · 0 loss)
- **`https://pleng.phrakham.life/` = v1 เดิม ปลอดภัย ไม่กระเทือน** (stamp `3286a1f` = app v1 byte-identical + 2 CI ไฟล์ deploy.yml+sw.js) · DB เดียวกัน (Supabase · 170 เพลง verified ครบ)
- push แล้ว: `main` `5661068..3286a1f` (แค่ deploy.yml+sw.js) · `studio-shell-redesign` `e28c60d..132a041` (ship artifact) · FF ไม่ force · **ไม่รัน SQL เลย**
- ⛔ **อย่ารัน `reset-verified-false.sql`** (พลิก 170→0 ทั้ง 2 รุ่น) · deploy-prep runbook = `docs/deploy-v2-runbook.md`

### 🔵 คิว FOLLOW-UP (redeploy ทีละตัวขึ้น /v2 · 2-3 นาที/รอบ · P'Aim จับเวลา velocity)
**merge = PM · ทุก worker ping merge-ready → PM fast-forward studio-shell-redesign + push (Actions redeploy)**
| # | งาน | worker | สถานะ |
|---|---|---|---|
| **📦 BUNDLE** | **branch `editor-port-repeat-markers @7afb038` (base @55171ef=SB1 · test:all 1498 เขียว) = SB1 + BI-002-fix + lint + paste พร้อม FF+redeploy รอบเดียว** | `a06948f3` (wound down) + `411913fd` | ⏸️ **HOLD — P'Aim ขอเวลาคิด SB1 (pm45 "มีปัญหาเยอะที่อยากแก้")** · fix เสียงค้าง+lint+paste รอ ship พ่วง SB1 · ยังไม่ redeploy จนพี่เอมพร้อม |
| ├ SB1 | แถบบนสะอาด (ShellBar.vue · BI-001 อยู่ในนี้) | | desktop ✓ · รอมือถือ |
| ├ BI-002 fix | เสียงค้าง กด✏️ตอนเล่น `@7afb038` | | ✅ verified (stopPlay=เส้นทาง ⏹ · audio-state test ไม่ใช่ภาพ) |
| ├ item4 lint | ป้ายตรวจโน้ต `@2a972b8` | | ✅ verified live (pickup-aware) |
| └ item3 paste | วางเนื้อ→attack `@c85062c` | | ✅ verified live (StructureDrawer.vue) |
| SB2 | ▶ Play hero + secondary→⋮ | `411913fd` | ✅ **RESOLVED = KEEP dock (P'Aim เคาะ pm45): "dock ดีอยู่แล้ว ไม่แตะ"** → จบแค่ส่วนปลอดภัย `@0cc866f` (download→⚙) · ⛔ ไม่ย้ายคีย์/เสียงดนตรีออกบาร์ · ▶ accent = เฉพาะ visual เบาไม่ restructure (ไม่ชัวร์=ไม่ทำ) |
| #4 ต่อ | paste-syllable → repeat-markers UI (engine banked · spec `marker-entry-ui.md`@02cde29) | `a06948f3` | หลัง BI-002 · กำลังทำ paste |
| #5 | **header แก้ inline** (lead-sheet · 2 synced surface กับ ⚙ · design เสร็จ `docs/ds/song-header-inline-edit.md`) → build | design `534ea90d` done | รอ dispatch build |
| **issue9** | **lead-sheet metadata header (DISPLAY)** — ชื่อลงบรรทัดเต็ม + `คีย์·อัตราจังหวะ·ความเร็ว` ใต้ชื่อ + scripture · **เฟส 1 เท่านั้น** (ไม่เอา credits/ลิขสิทธิ์) · คีย์=current (ต้นฉบับ=ปกติ · shift=บอก) · bpm null=ซ่อน | SA design (dispatched) | 🔧 ร่าง spec `docs/ds/` · เช็คมาตรฐาน transposed-key ผ่าน G · ยังไม่ build |

### 🐛 บั๊ก editor batch (pm45 · พี่เปา user จริง · "แก้เพลงใช้ยากกว่า v1" · SSOT `docs/pm/bug-intake.md`)
**P'Aim เคาะ: จ่าย fix เลย · เคลียร์ทั้ง 9 issues = scope session PM นี้ · ทุกตัวมีเจ้าภาพ:**
| chip/session | บั๊ก | สถานะ |
|---|---|---|
| A `08953bf8` | **BI-005** พิมพ์เนื้อ split-advance | ✅ **BI-005 `@32e546c` +1 สะอาดบน 7afb038 · re-verified (suite 1498)** · 🧪 รอ Tester (มือถือ/IME) · Chip A ~จบ scope → wind down · 🔑 **BI-008 + §6 octave + chord-popup มีบน 7afb038 อยู่แล้ว = ship bundle หายเอง ไม่ต้อง build** (live /v2=132a041 ยังไม่มี → พี่เปาเลยเจอ) |
| B `28a324dd` | **BI-004** copy/paste ห้อง+บรรทัด `@6549ae6` (on 7afb038) | ✅✅✅ **CLEAN + TESTER PASS ครบ** (drag · insertion-point · มือถือ360/412 overflow=0 · slot 26px≥AA วัดจริง) = **ชิ้นแรกสมบูรณ์ · #1 ใน merge order** · HOLD รอ assemble batch |
| C `5c330050` | **BI-006** เล่นห้องนี้ + **BI-007-full** | ✅✅ **BI-006 `@eae57c2` TESTER PASS by-ear** (วัด RMS · เล่นเฉพาะห้อง auto-stop ตาม caret) = ตัวที่ 3 พิสูจน์ · **BI-007 `@5f93562` เสร็จบน base จริง** (harvest CompletionStatus + 4 G-refinements · anon verified live · **role editor/approver ยัง jsdom → ต้อง login จริง (P'Aim ลองเอง/หา creds)**) · 1523 pass · 2 commit แยก · standby assemble |
| ~~BI-007-build `dfe14ace`~~ | | ✅ **stood down** (build บน EditorMode พื้นผิวผิด · ปิด server · component ส่งต่อ Chip C harvest) |
| new-song-inline `b6c152b9` | **ปุ่ม "＋ เพลงใหม่" เข้า inline editor** (P'Aim สั่ง pm45) | ✅ **merge-ready `@db7ebce` (base ถูก 7afb038)** · verified live: กด→เพลงเปล่าเปิด inline · พิมพ์ได้ทันที · blank-trap แก้ (seed rest '0') · escapable · SongViewer chrome-only เล็ก · 🧪 Tester `287afc35` (พิมพ์จริง+server save) · NOT PROVEN: keystroke method+server draft |
| symbol-pass `257400f4` | **BI-003** + **BI-009** ระบบเครื่องหมาย `@011190e` | ✅✅✅ **CLEAN + TESTER PASS ครบ 6:** **no-collision = P'Aim #1 "น่าอนาถ" FIXED (screenshot)** · ~ TIE+arc · toggle ครบ · octave บน/ล่างถูก · มือถือ360/412 target46×44 · เอา ' ออกแถบคงพิมพ์ +`,`ต่ำ +#/b · **พร้อม assemble** · NOT: cross-barline ~ (ใช้ -) · flag first-run help-panel overlay@360 |
| 📖 **นิยาม symbol (symbol-pass ตอบ · durable):** `()` = เอื้อน/slur (คนละ pitch ใน 1 พยางค์) · `~` = tie (pitch เดียว sustain) · `-` = ต่อเสียง +1 beat · `#/b/n` = กลุ่มเดียว (jianpu 变音) | | ตอบพี่เปา/อัปเดต Guide ได้ |
| item1 dc/ds `31412dcd` | **ใส่ D.C./D.S./Segno/Coda/Fine เอง** `@a31cce2` | ✅✅✅ **CLEAN + TESTER PASS ครบ 4:** glyph render · directive จริง (breadcrumb) · interaction · มือถือ360/412 · polish auto-scroll fixed+verified@360 · build-stamp ยืนยัน serve branch · **พร้อม assemble** · NOT: ear-test เสียงตาม jump (model โอเค · follow-up) |
| BI-010 `ca5ea240` | **share/QR ใช้ 127.0.0.1 มือถือเปิดไม่ได้** (S2) | ✅ **merge-ready `@82da968`** (appBase swap dev/LAN→pleng.phrakham.life คง sub-path · QR decoded=canonical · tests pass · isolated share.js) · NOT: phone scan จริง (P'Aim post-deploy) |
| BI-007 build `4ed20d3d` | **completion-flow** (spec `docs/ds/edit-completion-flow.md` @35a4ce3) | 🔧 **P'Aim เคาะแล้ว = capability-based (มาตรฐาน CMS):** ปุ่มจบงานปรับตาม capability (มีเผยแพร่→"เผยแพร่เลย"+รอง"บันทึกร่าง"เลือกได้ · แก้อย่างเดียว→"ส่งตรวจ") + stepper+auto-save+ยืนยัน · ไม่แตะ RLS · **TODO แยก: grant พี่เปา approver (data 1 row) → เผยแพร่เองได้** |
| BI-001 SB1 | แถบบน | ⏸️ พัก (P'Aim คิด) |
| BI-002 | เสียงค้าง | ✅ fixed (ใน bundle รอ ship) |

### 🎼 dc/ds (D.C./D.S./Segno/Coda/Fine) — Explore ยืนยัน (pm45)
- **แสดงบนแผ่น = มีครบ** (SongSheet.vue `classifyJump`/`jumpLabel` · SVG segno/coda · เทสต์) ถ้าข้อมูลเพลงมี item jump
- **ใส่เอง/แก้เองในตัวแก้ = ❌ ไม่มี** — palette มีแค่โน้ต · ⋮ ได้แค่ free-text "ป้าย" (→`{type:label}` ข้อความเปล่า ไม่ใช่ marker จริง) · **มีปุ่มเฉพาะ `|: :|` + 1st/2nd ending เท่านั้น** · **engine jump ไม่มีบน base** (อยู่บน musing-carson branch `editor-port-repeat-markers` ยังไม่ merge · เป็น engine ล้วน)
- = ที่พี่เปา/P'Aim รู้สึกว่า "dc ds ไม่มี" ถูกต้อง · งาน = **item1 repeat-marker UI** (spec `docs/ds/marker-entry-ui.md` + engine bank + handoff `C:\gl\pm-inbox\pleng\2026-07-24-editor-port-item1-ui-handoff.md`) · design ผ่าน G Pro 2 รอบแล้ว
- ✅ **P'Aim เคาะ pm45: "จ่ายงานเลย" (build ไม่รอ G ซ่อม)** → chip `439701c9` launched · base off `editor-port-repeat-markers @7afb038` (มี engine · base ยังไม่มี) · §8 G-consult UI-flow = deferred เขียนคำถามไว้ · verify ต้องใส่ marker จริง→เป็น marker จริง (ไม่ใช่ label เปล่า)

**hot-file `SongViewer.vue`:** bundle (`a06948f3` wound down) landed แล้วเป็นของ base · chip A + item1-UI จะแตะต่อ → **merge ตามลำดับ PM · rebase หลัง bundle land**

### 🔴 รอ P'Aim เคาะ (ไม่บล็อก · ตามสะดวก)
1. 📱 **SB1 มือถือ** = แถวเดียวไหม (→ redeploy) + **logo มือถือ** เอาออก/คงไว้ (ทีมเอาออกตาม mockup · veto ได้)
2. 🔀 **topology swap: v2→root · v1→/v1** — ⏸️ **DEFER (P'Aim pm45: "ยังไม่ย้าย bug ยังเยอะ")** · ทำหลัง editor bugs นิ่ง (BI-005 ยืนยัน editor ยังไม่พร้อม replace v1) · plan เสร็จ `docs/deploy-v2-promote-plan.md` (deploy-prep `8294e63a`): **v2→root ง่ายมาก (ป้าย ⇄ หายเอง)** · งานจริง = v1→/v1: **Option B (แนะนำ ~15น · online ครบ · offline-PWA ไม่เป๊ะ · v1=fallback เลิกอยู่แล้ว)** vs A(~1ชม เป๊ะ) · `/v2/` links redirect ครบ · SW cache-bump · ~30-45น รวม · เสี่ยงกลาง-สูง(แตะ root คนใช้ทุกวัน) · rollback ~3น · **แนะทำหลัง top-bar สะอาด** · plan-ก่อน-execute · P'Aim go
3. 🐛 **bug-workflow ใหม่ (P'Aim เสนอ · PM เห็นด้วย):** per-bug = 1 session → วิเคราะห์+repro+สร้าง **GitHub issue** (evidence) → ping PM → PM จ่าย fix (session ไม่ fix เอง · search กันซ้ำก่อน) · **ต้องเช็ก: issues เปิด + token scope `aim-krisada/pleng.phrakham.life`** (`GITHUB_TOKEN_PHRAKHAM` ครอบไหม) → PM เสนอ set up template+เช็ก token

### 🧵 สาย support
- **bug-intake channel** `1290d01f` (idle · `docs/pm/bug-intake.md` BI-NNN · P'Aim ส่ง bug ผ่านช่องนี้ · batch ยกเว้น S1) — กำลังจะ evolve เป็น per-bug-session (ข้อ 3)
- **ai-bridge** `2cac6a71` — ✅ **G-consult ซ่อมแล้ว!** root cause = เกาะ :9222 busy (ไม่ใช่ Py3.14) · P'Aim เคาะ Chrome เฉพาะ :9335 · **เครื่องมือใช้ได้ `C:\gl\.aibridge\` (bridge.py/daemon.py · `ask G/N <id> "..."` · transcript auto-save)** พิสูจน์ 2 session + N citation · จ่ายต่อ: (1) รัน G-review **BI-007 completion-flow** → feed Chip C (2) commit tool → `ceo/tools/`? ยืนยัน P'Aim · ⚠️ :9222 P'Aim ดับตอนเทสต์ (แจ้งแล้ว) · G-defer ยกเลิกได้แล้ว
- **melody 100%** `df00094f` done รอบ 1 (worklist Tier1 11 เพลงจังหวะ · Tier2 16 เนื้อ · `2026-07-24-melody-correctness-audit.md`) → เส้นทาง 100% = `tools/pdf-melody-diff.mjs` จ่ายต่อได้
- **midbar repeat engine** `cf8a3d91` done `daa8c7f` (test 1386 · **merge HELD** · dormant จน marker-entry UI = #4-repeat ขึ้น) + glyph normalise `+id/+al/pair-by-kind` ตอน landing

### 🔴 หนี้ (ห้ามลืม)
**เพลง 33 คอร์ด `E7`→`E`** (พี่เปาแก้กลบบั๊กเสียงที่ปิดแล้ว) · `tools/restore-song33-chord-E.sql` (guard+rollback) — **รันเมื่อ P'Aim ย้ายคนไป /v2** (v2 มี fix pre-echo · แต่ / v1 ยังไม่มี → รันตอนนี้ = pre-echo กลับบน v1)

## ⭐⭐ ลำดับความสำคัญถาวร (P'Aim)
- **"สำคัญคือ UI และ engine ทำเพลง"** · **MusicScore/เมโลดี้ = SSOT ต้อง 100% · เสียง(timbre) ไม่ต้อง 100%** (piano ทองพอ · กีตาร์/ไวโอลิน/รวมวง = ได้แค่ไหนแค่นั้น)
- **ship-fast, fix-faster** · ขึ้นผิด=บั๊กแก้ทีหลัง · ⛔ เว้นกลุ่มเดียว = **ข้อมูลหายเงียบ+กู้ไม่ได้** (เกทเสมอ)

## ☑️ CHECKLIST ใบสั่งงานออกแบบ (บังคับ)
1. **คุย G ก่อนตัดสินใจออกแบบ** (ตอนนี้ G พัง → DEFER/ai-bridge · design-first บนมาตรฐาน+ดีไซน์ล็อกไปก่อน) · 2. เซฟ transcript → EVIDENCE · 3. ชื่อแชต `pleng-<หัวข้อ>-YYYY-MM-DD` · 4. ⛔ ไม่ขอตรายาง ตามต่อ 1-2 รอบ · **G เคย hallucinate ถอนคำ 2 ครั้ง → ตรวจเอง**

## กติกาถาวร
⛔ re-import/bulk-write 120 เพลง · ⛔ **merge = PM เท่านั้น** · ⛔ **main/deploy/SQL = P'Aim สั่ง go** · ⛔ SQL เพิ่มอย่างเดียว + guard/rollback · ⛔ ไม่แตะ server/browser P'Aim (:5480·Chrome 9222) · ⛔ **ไม่กั้น UI ด้วย `@media(hover)`** (เครื่อง P'Aim hover:none ทั้งที่มีเมาส์) · reuse engine · Vue3+Vite · **PM = จ่ายงาน+อ่านสรุป+gate · ไม่ code/ไม่ส่องโค้ดเอง** (§4.5)

## SSOT pointers
- **PM brain:** ไฟล์นี้ + `docs/pm/decisions-log.md` (มติ · deploy record ล่างสุด)
- **ดีไซน์ล็อก:** `work/ปรับ pl edit ui/ux-groundup-design.md` (one-surface + ✏️ + ▶ · context-B chrome)
- **รายงาน worker:** `C:\gl\pm-inbox\pleng\` · **ป้ายเรียก P'Aim:** `C:\gl\pm-inbox\_ขอความช่วยเหลือ\`
- **preview:** [:5321](http://192.168.1.124:5321/) (app · clever-einstein) · :5410/v2/ (artifact · deploy-prep) · IP บ้าน `192.168.1.124`
- **repeat/nav (future):** `docs/ds/repeat-jumps.md`+`marker-entry-ui.md` · engine spike `dc-ds-jumps@35769b1` (line-level · P'Aim เคาะ v1=รวม mid-bar)
