# PM state — เพลง.พระคำ.ชีวิต (อ่านไฟล์เดียวนี้ = rehydrate PM ได้ทันที)

> **สมองอยู่บน disk** → PM ตายเกิดใหม่ได้ (อ่านไฟล์นี้ + `decisions-log.md` พอ) · เก็บให้ **สั้น** · จบแล้วตัดออกทันที · มติ → `decisions-log.md` · เก่า → `decisions-archive.md`

## ▶ pl pm 43 เริ่มที่นี่ (handoff 24 ก.ค. 17:00 · จาก pm 42 · session เต็ม)

**🎯 GOAL แข็ง: 20:00 ศุกร์ 24 ก.ค. = /v2 พร้อม deploy + ใช้ได้จริง** (P'Aim สั่ง 17:00 · คนวางแผนรอ) · **token efficiency สูงสุด** (P'Aim ย้ำ)
**base = `studio-shell-redesign` @ `9eca713`** (code ล่าสุด `7425b15`) · `test:all` = **1367 ผ่าน/10 skip** · build ✓ (PM รันเองทุก merge) · **เว็บจริง `main` = `5661068` (ยังไม่แตะ)**
**เข้า base แล้ว 24 ก.ค.:** A(3จุดเจ็บ) · B(ปุ่มฟัง) · Ctrl+Z · C(B060 ตั้งค่าเพลง) · CP-0(ยุบสัญลักษณ์) · B121(กระดาษ) · glyph(𝄋𝄌) + specs

### 🚀 แผน deploy 20:00 (ship-fast)
- **ปล่อย base เป็น /v2 คู่ตัวเก่า** — ของบน base **ใช้ได้จริงแล้ว** (หน้าแรก·ตัวแก้ inline·ฟัง·ค้นหา·แชร์·พิมพ์) · **ตัวแก้เก่า=fallback แก้โครง/copy-paste** → ไม่ต้องรอ build ใหญ่
- 🔵 **deploy-prep session** (`task_d010af5d`) กำลังทำ runbook + stage /v2 config + เรียง SQL → `docs/deploy-v2-runbook.md` + inbox `2026-07-24-deploy-prep.md`
- 🔴 **1 decision รอ P'Aim:** verified-gate — `reset-verified-false.sql` ทำ public เห็นเฉพาะ verified · **รันผิด = แคตตาล็อกสาธารณะว่าง** → เคาะ gate ON/OFF ก่อน go
- 🔴 **หนี้ต้องคืนหลัง deploy:** `tools/restore-song33-chord-E.sql` (E7→E · มี guard)
- **deploy/main/SQL = P'Aim สั่ง go เท่านั้น**

### ⭐⭐ ลำดับความสำคัญ (P'Aim 24 ก.ค.)
> **"สำคัญคือ UI และ engine ทำเพลง"** · **เสียง = ปิดประเด็นแล้ว (P'Pao โอเค · ship-first-fix-later · ไม่บล็อก)** · กีตาร์/ไวโอลิน/รวมวง = "ได้แค่ไหนแค่นั้น"

### ⭐⭐ ลำดับความสำคัญ (P'Aim 24 ก.ค. · ใช้ตัดสินทุกการจ่ายงาน)
> **"สำคัญคือ UI และ engine ทำเพลง"** · **เสียง = เปียโนเสียงทองอย่างเดียวให้ perfect พอ** · cello / piano+cello ทีหลัง · **กีตาร์ · ไวโอลิน · รวมวง = "ได้แค่ไหนแค่นั้น"** (ไม่ใช่ตัวบล็อก)

### ☑️ CHECKLIST บังคับ — ใส่ในทุกใบสั่งงานที่มีการตัดสินใจออกแบบ
**(PM ลืมมา 2 ครั้ง · P'Aim ทักเอง "การออกแบบ อย่าลืมให้เอสเอคุยกับจีนะ" → แก้ที่กระบวนการ ไม่ใช่จำเอา)**
1. **คุย G ก่อนตัดสินใจออกแบบทุกครั้ง** (ไม่ใช่ทางเลือก) · 2. **เซฟ transcript เต็มลง disk → path ใน `EVIDENCE`** (เล่าลอยๆ = ไม่นับ ปิด gate ไม่ได้) · 3. **ชื่อแชต `pleng-<หัวข้อ-อังกฤษ>-YYYY-MM-DD`** · 4. **ติด Sign in → worker เรียก P'Aim ผ่านป้าย `C:\gl\pm-inbox\_ขอความช่วยเหลือ\README.md` เองได้เลย ไม่ต้องผ่าน PM** ⛔ ห้ามกรอกรหัสผ่าน · Chromium ของ session ตัวเอง (⛔ ไม่ใช่ 9222) · 5. ⛔ **อย่าคุยแบบขอตรายาง** ตามต่อ 1-2 รอบ · **G เคย hallucinate จนถอนคำ 2 ครั้ง → ตรวจเองก่อนใช้**

### 🔵 LANES ที่วิ่งอยู่ (ณ 17:00 · ทั้งหมด fresh session · ping กลับ pm 43)
| lane | task | ไฟล์ | หมายเหตุ |
|---|---|---|---|
| **deploy-prep** | `d010af5d` | docs/config | runbook /v2 + SQL order · 🔴 gate deadline 20:00 |
| **editor-flow-polish build** | `72e66dc4` | SongViewer(keydown/caret) + Studio | spec `editor-flow-polish.md` (merged) · เช็ก keydown ไม่ชน · **แชร์ SongViewer กับ structure-migration → merge base ก่อน commit · PM เรียง merge** |
| **structure-migration (ยกแก้โครง+copy/paste)** | `005a4a43` | StructureDrawer ใหม่ + SongViewer(drawer region) | #1 gap · 🔴 paste ต้อง re-mint marker id · ⛔ ไม่ตัดแท็บเก่า · big chunk |
| **midbar (repeat design+engine)** | `local_cf8a3d91` | songModel/midi/songFlow (คนละไฟล์) | design-only จน PM gate · G ผ่าน tool ใหม่ · 🔴 ต้องเคาะ **canonical marker shape** (render อ่าน `{type:jump…}` · engine ใช้ `flow.jump`) แล้วบอก glyph lane |
**กติกา shared SongViewer:** merge base ก่อน commit · ห้ามทับของอีกเลน · PM เรียงลำดับ merge (แบบ A/B/C save-bar) · **merge=PM เท่านั้น**

**สเปก editor ที่ merge แล้ว (ให้ build อ่าน):** `docs/ds/editor-flow-polish.md` (PART1-2: auto-scroll·ซ่อนแท็บ·คอร์ด-ตรงจุด·cursor 2 โหมด·Delete ดึงชิด rest=0·octave .5/5'·เมนู→⋮) · `command-palette.md`+acceptance · `repeat-jumps.md`+`dc-ds-jump-flow.md`

### 🔄 หมุน session — **session-health pass = กฎถาวรใน §4.5 ข้อ 6 แล้ว** (auto ทุก "PM เก็บงาน" + ทุกปิด gate/merge)
- **อ่าน % context ตรงไม่ได้ = heuristic** (done+idle / คุย G ≥2 / ≥3 deliverable) · กลาง chunk = ไม่แตะ · rotate = PM สั่ง wind down เอง งานหน้า = session ใหม่สด
- **ผล pass 24 ก.ค. ~14:00:** C(B060)=กลาง chunk KEEP · SA caret=เพิ่งเริ่ม KEEP · SA palette/B/A/D=stopped done แล้ว · **ไม่มีตัวต้อง rotate**

### 🔵 สายที่วิ่งอยู่ (ทุกใบมี checklist G ครบ)
| สาย | ทำอะไร | กันชน |
|---|---|---|
| ~~A · 3 จุดเจ็บทุกวัน~~ | ✅ **merge เข้า base `04821cd`** — ช่องถูกบัง 92→0 ทุกความกว้าง · แท็บออกจากโหมดแก้จริง · **G cross-check 2 รอบ (transcript บน disk `g-transcript-*round1/2.md`): G ยอมรับ bottom-dock ผิดเรื่อง side-rail · ค้าน 2 → ปรับตาม: (1) แท็บออก = แถบในหน้า "งานยังอยู่ครบ · กลับไปแก้ต่อ" ไม่ใช่ modal (2) คืน Home/End ให้ word layer ใช้ Ctrl+Home/End)** · test:all 1303 | ปิดสาย |
| ~~B · ปุ่มฟังเพลงในตัวแก้~~ | ✅ **merge เข้า base `65b98bf`** — ปุ่มฟัง 3 ปุ่ม (ทั้งเพลง/ท่อนนี้/บรรทัดนี้) บน save-bar · merge A แล้วเก็บปุ่ม "เสร็จ" ครบ · **save-bar 5 ปุ่ม ownHit 5/5 ทุกความกว้าง · เสียง byte-identical หลัง merge sha 198b0fa8 · test 1314** · 🔴 clarify: **Ctrl+Z ย้อน 2 ขั้น = บั๊กใหม่ใน `SongViewer.vue` (inline) คนละตัวกับ B075 (EditorMode เก่า สาย D ถูก)** — เหตุ: onCaptureKey ลืม stopPropagation → bubble ไป onUndoKeys ซ้ำ · แก้ 1 บรรทัด + เทสต์ dispatch keydown จริง (จ่าย B แล้ว) | เจ้าของ: พื้นที่ปุ่มเล่น |
| ~~C · B060 ตั้งค่าเพลง~~ | ✅ **merge เข้า base `c0ff63a`** — 8 ฟิลด์ในตัวแก้ inline · เปลี่ยนคีย์ใช้ transpose เดิม · round-trip number/theme/title_en พิสูจน์ครบ (B108-safe) · **save-bar 6 ปุ่ม ownHit 6/6 ทุกความกว้าง** (▶×3 + ⚙ + บันทึก + เสร็จ ไม่ถอดใคร) · test **1330** · ปิด Gemini profile แล้ว | ปิดสาย |
| ~~D · ไล่บั๊กเก่าพี่เปา 9 ข้อ~~ | ✅ **เสร็จ** (`2026-07-24-retest-old-bugs.md` + รายงานเต็ม 13 ภาพ) — **หายแล้ว 7:** B075·B084·B085·B092·B109·B111(กวาด 16 เพลง 419 บรรทัด ตรงโมเดลทุกเส้น)·B118 · **ป๊อปอัปคอร์ดไม่ได้พัง** (กดด้วยเมาส์จริงเด้งขึ้น+มีลิสต์) · **ค้าง 2:** B091 ไม่มี "ล้างเฉพาะโน้ตทั้งบรรทัด" (งานเล็ก มีของคู่ให้ลอก) · B083 ตั้งชื่อทำนองยังไม่ได้ (จอไม่หายแล้ว · แยก A/B ด้วยพรีวิว 5 โน้ตแรก = ทางที่เคาะไปแล้ว → ชื่อจริง = งานใหม่ ไม่ใช่บั๊กค้าง) | ปิดสายแล้ว |
| ~~E · SA สเปก Ctrl+K palette~~ | ✅ **สเปกจบ (Flash+Pro) merge `f787ff8`** · §13.1 ตาราง Flash↔Pro · MRU zone ≤3 + preselect-on-single-match · **Cancellation Rate KPI ล็อกเข้า scope CP-1** (Pro ชี้ = ความเสี่ยง #1) · **🔴 CP-0 ต้องมาก่อน** (ยุบ hard-code สัญลักษณ์ 2 ที่ `NoteInputBar.vue`+`SongViewer.vue`) → **จ่ายเป็น dev session แยก ตัวท้ายๆ ของคิวไฟล์ร้อน** (หลัง B→C→Ctrl+Z) · ⛔ ไม่แตะ `EditorMode.vue` · SA ว่างแล้ว = standing seat |

**กติกากันชนที่ใช้ได้ผล:** แต่ละสายเป็นเจ้าของพื้นที่ตัวเอง · **merge base ล่าสุดเข้าสาขาตัวเองก่อน commit สุดท้ายเสมอ** · ต้องแตะพื้นที่คนอื่น = **ping PM ก่อน ห้ามแก้ทับ**

### 📋 รอ P'Aim (ไม่บล็อกงาน)
- ✅ **เสียง = ปิดประเด็น (P'Aim 24 ก.ค.):** P'Aim ฟังเองไม่รู้ · **P'Pao บอกโอเค** → **"ขึ้นได้แล้วค่อยแก้"** = ship-first-fix-later · ⛔ **ไม่ใช่ตัวบล็อก deploy อีกต่อไป** (เลิกรอฟัง 4 ชุด)
- 🚀 **DEPLOY = ทางเร็วสุดสู่ผู้ใช้ที่รออยู่** (ทุกอย่างยัง pre-deploy · เว็บจริงยังตัวเก่า) · เสียงปลดแล้ว → เหลือ prep: `/v2` คู่ตัวเก่า · เรียง SQL (`reset-verified-false.sql` = กับดักแคตตาล็อกว่าง · db/011) · คืนคอร์ดเพลง 33 · **main/deploy = P'Aim สั่ง go เท่านั้น**
- ✅ **คอขวด Gemini เคลียร์ครบ 3 สาย (24 ก.ค. หลัง Surface รีสตาร์ท):** A (transcript รอดก่อนรีสตาร์ท) · palette (Pro รอบ · https://gemini.google.com/app/9a95feba7af5ea3d) · B060 (Pro · `docs/meetings/2026-07-24-b060-song-settings/`) · **กฎใหม่ข้อ 6 ในกระดานป้าย** = เปลี่ยนชื่อหน้าต่าง+แถบสี+monitor ฟ้องเมื่อเบราว์เซอร์ตาย (README อัปเดต · ที่มา: ป้าย 4 ใบ URL เดียวกัน P'Aim กดผิดหน้าต่าง + หน้าต่างถูกปิดระหว่างไล่หา + monitor กลืน exception)
- **2 คำถาม cross-ref จากหนังสือ:** (ก) **"อ.NNN" ชี้เล่มไหน** — ไม่ใช่อนุชน (เลข 3 หลักเกิน 120) · น่าจะ "เล่มบทเพลง.pdf" 53MB (ข) **"238=/233=" เขียนด้วยมือ** ที่หัว #432/#515 = เลขเล่มไหน · + เพลง (อ.842) ถูกขีดฆ่าปากกาแดงในเล่มใหญ่ใบ 335 (ตั้งใจตัด?)
  → ตอบแล้ว PM spawn SA ทำ audit อนุชนต่อ (hold อยู่)

### 🔴 หนี้ที่ต้องคืน (ห้ามลืม)
**เพลง 33 · ต้นฉบับ `E` · บน production เป็น `E7`** — พี่เปาแก้เองเพื่อกลบบั๊กเสียง (ปิดแล้ว) → **หลัง deploy ต้องรัน `tools/restore-song33-chord-E.sql` คืนเป็น E ทันที** (มี guard + rollback · แตะเพลงเดียว) ไม่งั้นเพลงผิดต้นฉบับถาวรและไม่มีใครจำได้ว่าทำไม

### คิวถัดไป (ยังไม่จ่าย · เรียงตามที่ผู้ใช้เจ็บ)
**🔒 คิว BUILD ไฟล์ร้อน `SongViewer.vue`/`NoteInputBar.vue` (ทีละตัว · P'Aim สั่ง build 24 ก.ค.):**
1. ✅ **CP-0 merge เข้า base `2e6ba27`** — registry เดียว `src/lib/editorCommands.js` (ไม่ใช่ noteSymbols · ตาม AC/tester grep) · keydown+ปุ่มใช้ dispatch เดียว ลบตารางซ้ำ 2 ชุด net −53 บรรทัด · drift-killer test ทุกสัญลักษณ์ 2 ประตูเท่ากัน + synthetic · **test:all 1342 · build ✓** (PM verify) · พฤติกรรมเดิมเป๊ะ · **ยังไม่พิสูจน์: DOM keystroke จริงในเบราว์เซอร์** (พิสูจน์ที่ shared dispatch)
   → **ปลด hot-file แล้ว · ตัวถัดไปบน SongViewer.vue = editor-flow-polish + ยกแก้โครง/copy-paste (serialize)**
2. **editor-flow-polish** (auto-scroll/ซ่อนแท็บ/คอร์ด-ตรงจุด/caret 2 โหมด/Delete ดึงชิด/octave/เมนู⋮ · spec `editor-flow-polish.md` · เช็ก keydown :387-459)
3. **repeat-jumps UI ใส่จุดย้อนในตัวแก้** (รอคิว · ส่วน engine แยกไปทำขนานแล้ว ↓)
4. **B091** ล้างเฉพาะโน้ตทั้งบรรทัด
**🔴 #1 gap (audit) — ยังไม่อยู่ในคิว ต้องดันขึ้นหัวหลัง CP-0:** **ยกแก้โครง (drawer การ์ดท่อน) + copy/paste/move ห้อง·บรรทัด·ข้อ เข้าตัวแก้ใหม่** (ตอนนี้อยู่เฉพาะ EditorMode เก่า) → แล้วตัดแท็บ+ตัวเก่า = gate สู่ "สมบูรณ์"

**⚡ ขนานได้ (คนละไฟล์ · จ่ายแล้ว P'Aim สั่งเร่ง 24 ก.ค.):**
- ✅ **repeat glyph render merge `7425b15`** (SongSheet.vue · SVG กันตัวแตก · test 1367 · วางจาก marker's spot=mid-bar safe · render nothing จน marker มี=ไม่ regress) · 🔴 **contract = `{type:'jump',kind,al?}` item ในบรรทัด · แต่ engine spike เก็บ `flow.jump` = อาจคนละโมเดล → สั่ง midbar เคาะ "canonical marker shape ชุดเดียว" (engine+render+entry อ่านตรงกัน) แล้ว render normalise ตาม**
- ✅ **B121 ขนาดกระดาษ merge `4edfe2c`** (A4/Letter/A5 · PDF พิสูจน์ขนาดเปลี่ยนจริง · test 1344)
- 🔴 **G/N consult เปลี่ยนวิธี (P'Aim 24-Jul · กฎ §4.5 ข้อ 10):** ใช้ **meeting-room tool ตัวเดียวร่วม :9222 (ล็อกอินครั้งเดียว)** · แต่ละ session แชทเอง · N=แสวงหา 1-5 · บรีฟยาว=อัปโหลดไฟล์ · ⛔ เลิก hand-roll หน้าต่าง Gemini · verify/render คง own-port · **midbar = หน้าต่างสุดท้ายที่ hand-roll (จบรอบนี้แล้วเลิก)**
- 🔵 **repeat มิดบาร์ design+engine** (`task_55e1f134` session ใหม่) — Phase1 ปิด mid-bar design + **G Pro** (docs · ping PM gate ก่อน engine) · Phase2 ต่อยอด spike line-level→mid-bar บน `songModel/midi/songFlow` (คนละไฟล์ SongViewer = ขนาน CP-0 ได้) · ⛔ ไม่แตะ SongViewer/EditorMode (UI ใส่ = คิว hot-file)
🔴 **CP-0 = ไม่ใช่ยุบ 2 ที่ แต่ 4 ที่** (SA เปิดซอร์สอ่านเอง): (1) `NoteInputBar.vue:38` SYMBOL_GROUPS (2) `SongViewer.vue:295` SYMBOL_CHARS (3) `SongViewer.vue:405-421` keydown จัดประเภท **ชุด 1** (4) `SongViewer.vue:646` applySymbol จัดประเภท **ชุด 2 ซ้ำ** · **keydown ไม่เรียก applySymbol = drift จริงวันนี้** (คอมเมนต์ 644 เขียนว่า "never two code paths that drift" แต่มันมี 2) → ใบสั่ง CP-0 ต้องบังคับ keydown เรียก applySymbol ปิด drift · AC พร้อม `docs/ds/command-palette-acceptance.md` (AC-0.3 unit test ล้วน · AC-1.7 event-log + denominator guard)
**คอร์ดกดแล้วพิมพ์เลือกเลย** (พี่เปาบอกตอนนี้หลายคลิก) · **ย้าย/คัดลอก/วาง ห้อง·บรรทัด·ข้อ** — 🔴 ใบนี้ต้องมีข้อบังคับ **"id ของเครื่องหมายต้องออกใหม่ตอนวาง"** ไม่งั้น `flow` ชี้กำกวม = เล่นผิดเงียบ · **ยกโครงเพลง+การวนซ้ำ+เพิ่มบรรทัด/ห้อง+พิมพ์ เข้าตัวแก้ใหม่** (แล้วค่อยตัดแถบแท็บ) · ช่องไฟระหว่างห้อง · ชาร์ป-แฟลตในป๊อปอัป · อาการ "melody เกิน" 7.3% (รอหูพี่เปา) · `db/006` author_id (ไม่เคย deploy · P'Aim เคาะเอง) · ตัวแปลงไฟล์นำเข้าสร้างของพังซ้ำได้ · B120 หน้ากากแบบอนุชน · B121 เลือกขนาดกระดาษ · B122-B126 · 163/170 เพลงไม่มีระดับ verse จากป้ายท่อนตัวเอง (เหมือนกัน 2 เส้นทาง = ไม่ใช่บั๊ก)

## 🔍 Completeness gaps (audit 24 ก.ค. · เทียบดีไซน์ล็อก vs base จริง)
- **🔴 #1 = migration ยังไม่จบ (gate สู่ "สมบูรณ์"):** ตัวแก้ใหม่ (SongViewer.vue) ทำ note/sharp-flat/octave/chord/symbol/settings/save/undo/mobile ได้ · **แต่ยัง "แก้โครง (drawer การ์ดท่อน)" + "copy/paste/move ห้อง·บรรทัด·ข้อ" ไม่ได้ = อยู่เฉพาะ EditorMode.vue เก่า** · แท็บ 3 อัน (ฝึก/แผ่น/แก้) ยังอยู่ · **ต้องยก 2 อย่างนี้เข้าตัวใหม่ก่อน แล้วตัดแท็บ+ตัวเก่า** ← ยังไม่อยู่ในคิว build ปัจจุบัน (queue = polish+repeat) · ความเสี่ยง: old editor ไม่ถูก drain แท็บไม่ถูกตัด = split-brain ถาวร
- **🪤 กับดัก deploy (data):** `reset-verified-false.sql` (B089) ยังไม่รัน → public เห็นเฉพาะ verified · รันผิดจังหวะ = **แคตตาล็อกสาธารณะว่างเกือบหมด** · `import-ties.sql` ต้องคู่กับ render fix · **57 เพลง flag tie/slur ยังไม่แก้** + import เคยสลับ melody↔lyrics = หนี้คุณภาพข้อมูล
- **deferred (ล็อกไว้ แต่ยังไม่มีโค้ด):** **dark mode = ABSENT ทั้งที่ดีไซน์ล็อกต้องมี** · zh/en (มีแค่ th ไม่มี switcher) · Ctrl+K palette (spec เฉย ๆ) · MusicXML export · B120 เนื้อล้วน/B121 ขนาดกระดาษ · audio B104/106/107 ยังไม่ยืนยันเข้า base
- **ปล่อยได้แม้ migration ไม่จบ:** ตัวแก้เก่าเป็น fallback → **deploy /v2 คู่ตัวเก่าได้ (ship-fast)** · "สมบูรณ์" ค่อยวัดตอน migration จบ

## กติกาถาวร
⛔ ห้าม re-import/bulk-write 120 เพลง · ⛔ merge = PM เท่านั้น · ⛔ main/deploy = P'Aim สั่ง go เท่านั้น · ⛔ SQL = เพิ่มอย่างเดียว ต้องมี guard + rollback · ⛔ ห้ามแตะ server/เบราว์เซอร์ที่ P'Aim ใช้ (:5480 · Chrome 9222) · ⛔ **ห้ามกั้น UI ด้วย `@media(hover)`** (เครื่อง P'Aim รายงาน hover:none ทั้งที่มีเมาส์) · **บั๊กที่ทำข้อมูลหายเงียบ = กลุ่มเดียวที่ห้ามปล่อย** · reuse engine · Vue3+Vite

## 🎵 D.C./D.S. (พี่เปาถาม "ย้อนทำไง") — Explore เสร็จ 24 ก.ค.
- **วันนี้ = ข้อความประดับเท่านั้น** — พิมพ์ "D.C. al Fine"/"Fine" เป็นป้าย (`EditorMode.vue:3241`) → **พิมพ์ออกได้แต่ playback ไม่อ่าน ไม่ย้อนจริง** · ไม่มี Segno/Coda สัญลักษณ์ · ไม่มีปุ่ม
- **ที่ทำงานจริงวันนี้:** `|: :|` + volta 1st/2nd (เมนูห้อง) เท่านั้น · เอนจิน R1-R5 ทำ per-verse ไม่ทำ go-back jump
- **ช่องโหว่ = ทั้งโมเดล+UI แต่โมเดลใกล้กว่า** — `songFlow.js:14-21` จอง prefix segno/coda + mint id แล้ว · `flow.jump` serialize แล้วแต่**ไม่มีใครอ่าน** · seam อยู่ `songModel.js:185`
- **แผนแก้ (staged):** (1) UI: ยก Segno/Coda + D.S./D.C. jump จาก JSON textarea ขึ้นเมนูห้อง (ถูก · โมเดล mint รองรับแล้ว) (2) **engine: resolver อ่าน jump→เรียงลำดับเล่น/พิมพ์** (งานจริง · ก่อนหน้านี้ UI ใดๆ = ป้ายโกหก) · 🔴 **ต้องผ่าน guard เดิม** `mintMarkerIds`/`stripEditorMarkerIds`/`findOrphanFlows` (กัน id ซ้ำ=เล่นผิดเงียบ · JSON textarea วันนี้ bypass = อันตราย)
- **✅ P'Aim ยกระดับ: DESIGN อย่างเดียว ⛔ ไม่ลงโค้ด · ยกเป็น "ระบบวนร้อง/นำทางครบชุด"** (session `local_73ac8a99`) — สโคป `docs/ds/repeat-jumps.md`:
  - **(1) D.C./D.S. ซับซ้อน → คุย G จนตกผลึกจริง** ทุก edge case (al Coda+To Coda+Fine ในเพลงเดียว · pass แรก vs ย้อน) · URL ทุกข้อ
  - **(2) world-class UX/UI** — เทียบ MuseScore/Sibelius/iReal ให้ผู้ใช้(คนทำเพลงโบสถ์)ใส่ไม่งง · WCAG+มือถือ
  - **(3) 🌏 survey ครบชุด grounded ในเพลงจริง 120 เพลง** — `|::|`+count · volta · D.C./D.S. ทุก al · Segno · Coda/To Coda · Fine · จบเพลง‖ (พี่เปาถาม Fine vs final barline) · (รับ) · เอามาให้หมด
  - **(4) 🔴 integration กับ "แก้โครง"** (แผงโครงเพลง: ลิสต์ท่อน ข้อ/รับ ลากจัดลำดับ + ทำนอง A/B = strophic v2) → jump ต้องเข้ากับระบบนี้ ไม่สร้างระบบคู่ขนาน · ระดับท่อน/ห้อง? · ประสาน `optimistic-kare` (caret/symbol)
  - resolver บนกระดาษ (guard mint/strip/orphan) · Phase engine/UI ปลดหลัง P'Aim เห็นชอบ · chunk ใหญ่ handoff ได้
  - ✅ **DESIGN เสร็จ merge base `af5788d`** (`docs/ds/repeat-jumps.md` + `dc-ds-jump-flow.md` + transcript G Pro 2 รอบ · เฉพาะเอกสาร) — G Pro ตกผลึก · **corpus 170 เพลงจริง: end-barline 145 · refrain 105/45 · `|::|` แค่ 3 · structured D.C./D.S. ~0 = "discoverability trap"** (ใส่ไม่ได้ ไม่ใช่ไม่ต้องการ · demand จากเล่มกระดาษ+พี่เปา) · **G surface "Vamp" ที่มองข้าม** · integration แก้โครง (marker=sheet item · D.C./D.S.=structure directive) ประสาน caret §5-6
  - **engine SPIKE ค้าง `dc-ds-jumps` @`35769b1`** (line-level · 1343 เขียว · reorder playback ผ่าน resolvePlayOrder + guard) — **ใช้ต่อได้ถ้า P'Aim ยืน line-level** · play-order deterministic (unit-test) · หูพี่เปาเฉพาะ timbre · ฐานมาตรฐาน = `repeat-flow-override.md` (nostalgic-perlman · W3C MusicXML 4.0)
  - ✅ **P'Aim เคาะ scope:** Vamp = ออกแบบไว้ build ทีหลัง · **v1 = รวม mid-bar (P'Aim ปรับทิศ: "ย้อนมิดบาร์ก็มีจริง")** · al-target `to` field PM รับ
  - ⚠️ **ผลของ mid-bar:** engine spike เป็น **line-level → ต้องต่อยอดรองรับ mid-bar** (ไม่ใช่ reuse ตรงๆ) · **design ต้องปิด mid-bar entry UX ให้ครบก่อน build** (doc เดิมคลุม mid-bar แบบ "ทีหลัง") → **build = session ใหม่: (ก) ปิด mid-bar design gap +G (ข) ต่อยอด spike รองรับ mid-bar (ค) build** หลังคิว hot-file · session เดิมปิดสะอาดแล้ว

## SSOT pointers
`docs/backlog.md` · 🔴 **repeat-flow spec = อยู่บน branch `nostalgic-perlman-7b5f10` ไม่เคย merge base** (ไฟล์ `docs/ds/repeat-flow-override.md`+`note-symbol-set.md` ไม่มีบน base) → **spec จริงบน base = header ใน `src/lib/songFlow.js:1-15` + `docs/song-model-v2.md:223-237`** (cherry-pick doc มาถ้าต้องใช้) · `work/ปรับ pl edit ui/ux-groundup-design.md` (ดีไซน์ล็อก) · `evidence-2026-07-24-ui-gap-audit/REPORT-ui-gap-audit.md` (**สถานะ UI ล่าสุด**) · `C:\gl\pm-inbox\pleng\` (รายงานทุกสาย) · `C:\gl\pm-inbox\_ขอความช่วยเหลือ\` (ป้ายเรียก P'Aim)
