# PM state — เพลง.พระคำ.ชีวิต (อ่านไฟล์เดียวนี้ = rehydrate PM ได้ทันที)

> **สมองอยู่บน disk** → PM ตายเกิดใหม่ได้ (อ่านไฟล์นี้ + `decisions-log.md` พอ) · เก็บให้ **สั้น** · จบแล้วตัดออกทันที · มติ → `decisions-log.md` · เก่า → `decisions-archive.md`

## ▶ pl pm 42 เริ่มที่นี่ (handoff 24 ก.ค. เช้า · จาก pm 41)

**base = `studio-shell-redesign` @ `79b468f`** (A+B+Ctrl+Z merged · palette+AC docs) · `npm run test:all` = **1315 ผ่าน / 10 skip** · build ผ่าน (PM รันเองทุก merge)
**⛔ เว็บจริงยังไม่ถูกแตะเลยตั้งแต่ 23 ก.ค.** — `main` = `5661068`
**🔥 ไฟล์ร้อน `SongViewer.vue` — จ่ายทีละตัว ห้ามขนาน** · คิว: ~~A~~✅ ~~B~~✅ ~~Ctrl+Z~~✅ → **C** (B060 save-bar 6 ปุ่ม · กำลัง integrate → PM merge) → **CP-0** → **B091**
**🖥 พรีวิว PM ให้พี่เอมดู:** `npx vite . --host --port 5478` จาก worktree -pm (base) · http://localhost:5478 · http://10.24.43.98:5478 (มือถือ) · ⛔ ไม่ใช่ :5480 (ของพี่เอม)

### ⭐⭐ ลำดับความสำคัญ (P'Aim 24 ก.ค. · ใช้ตัดสินทุกการจ่ายงาน)
> **"สำคัญคือ UI และ engine ทำเพลง"** · **เสียง = เปียโนเสียงทองอย่างเดียวให้ perfect พอ** · cello / piano+cello ทีหลัง · **กีตาร์ · ไวโอลิน · รวมวง = "ได้แค่ไหนแค่นั้น"** (ไม่ใช่ตัวบล็อก)

### ☑️ CHECKLIST บังคับ — ใส่ในทุกใบสั่งงานที่มีการตัดสินใจออกแบบ
**(PM ลืมมา 2 ครั้ง · P'Aim ทักเอง "การออกแบบ อย่าลืมให้เอสเอคุยกับจีนะ" → แก้ที่กระบวนการ ไม่ใช่จำเอา)**
1. **คุย G ก่อนตัดสินใจออกแบบทุกครั้ง** (ไม่ใช่ทางเลือก) · 2. **เซฟ transcript เต็มลง disk → path ใน `EVIDENCE`** (เล่าลอยๆ = ไม่นับ ปิด gate ไม่ได้) · 3. **ชื่อแชต `pleng-<หัวข้อ-อังกฤษ>-YYYY-MM-DD`** · 4. **ติด Sign in → worker เรียก P'Aim ผ่านป้าย `C:\gl\pm-inbox\_ขอความช่วยเหลือ\README.md` เองได้เลย ไม่ต้องผ่าน PM** ⛔ ห้ามกรอกรหัสผ่าน · Chromium ของ session ตัวเอง (⛔ ไม่ใช่ 9222) · 5. ⛔ **อย่าคุยแบบขอตรายาง** ตามต่อ 1-2 รอบ · **G เคย hallucinate จนถอนคำ 2 ครั้ง → ตรวจเองก่อนใช้**

### 🆕 พี่เอมใช้พรีวิวจริง 24 ก.ค. → editor flow polish (spec ก่อน · G บังคับ · dev สร้างหลัง C · **จ่าย session ใหม่สด ไม่ใช่ SA palette ที่ context บวม**)
**สเปกข้อ 1-3 เสร็จ merge `3d3fcad`** (`docs/ds/editor-flow-polish.md` + transcript G) — SA จับ G ผิด 2 จุด: (ก) MuseScore4 เอา Tab ออก → ใช้ **Space=ยืนยัน+ไปโน้ตถัดไป** (ข) chord-delete เก็บในป๊อปอัป (Del/Backspace จองลบโน้ตแล้ว `SongViewer.vue:422-423`) · **ต้นตอ "ซ่อนแท็บ" = SongViewer โหมดแก้ emit สถานะขึ้น Studio ไม่ได้ → เพิ่ม emit 1 จุด + ปุ่มเสร็จเดิม + Esc ลำดับชั้น (ปิดป๊อปอัปก่อน) + sticky กัน layout shift**
🔴 **NOT PROVEN → ใส่ในใบสั่ง dev บังคับ:** คีย์ `C`(ป๊อปอัปคอร์ด)+`Ctrl+Space`(ข้ามห้อง) ยังไม่เช็กชน keydown เดิม `SongViewer.vue:382-423` · scrollIntoView ต้องเทสต์ Chrome จริง (เคยเงียบใน browser pane)
4. ✅ **เมนู "เพลง ▾" → P'Aim เคาะ: ย้ายเข้า ⋮ เพิ่มเติม** (เอา create ออก=ซ้ำหน้าแรก · "เปิดเพลงอื่น"เข้า ⋮ + ต่อ `filterSongs` จริง) · v-if mode!=edit อยู่แล้ว = คนละเรื่อง "ซ่อนแท็บตอนแก้"
5. 🆕 **พี่เปา: caret/insert/delete model** — (ก) "ใส่ 5 ก่อน 2" แทรกหน้าไม่ได้ (ข) เสนอสลับ Del↔Backspace · **PM วินิจฉัย: ต้นตอเดียว = cursor แบบ "เลือกทับตัว" ไม่ใช่ "ระหว่างตัว"** → แก้ราก caret ระหว่างตัว → แทรกหน้า + Del(ขวา)/Backspace(ซ้าย) ตามมาตรฐาน text editor ออกมาถูกเอง ⛔ ไม่สลับปุ่มดื้อๆ

6. 🆕 **พี่เปา: พิมพ์ octave ด้วยคีย์บอร์ดล้วน (B2)** — `.5`=ต่ำ (จุดก่อนเลข) · `5'`=สูง (apostrophe หลังเลข) · **"แบบที่เคยเป็น" = RESTORE ของเดิม ไม่ออกแบบใหม่** (เปิด EditorMode.vue/NoteInputBar.vue/notation.js ดูของเดิม) · คีย์บอร์ดล้วน=เดสก์ท็อป ปุ่มยังอยู่สำหรับมือถือ · `.`/`'` ห้ามชน keydown 382-423

**→ SA session ใหม่ = `optimistic-kare-b535ad` (local_dc0b2d2f · กำลังทำ): เมนู→⋮ (ข้อ4) + caret model (ข้อ5) + octave keyboard (ข้อ6) เข้า `docs/ds/editor-flow-polish.md` · G บังคับ · ประสาน Space=advance + keydown เดิม 382-423**

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
- 🎧 **ฟังเสียงแล้วบอกแค่ "ชอบอันไหน"** — `audio-2026-07-23-preecho\` (โน้ตผีเพลง 33) · `audio-2026-07-24-rubato\` (ยืดหายใจก่อนขึ้นท่อน) · `audio-2026-07-24-ensemble\` (ไวโอลิน 3 คู่ + กีตาร์ 1 · **ชอบ B = สแกนคลังแล้วเปิดให้ไวโอลิน · ชอบ A/แยกไม่ออก = ปล่อยเดิม**) · `audio-2026-07-24-ensemble-sections\`
- **deploy: พร้อม 0 บล็อก** → เคาะว่าปล่อย `/v2` คู่ตัวเก่าเลยไหม + รัน db/011 · ต้องเขายืนยันเองด้วยหู/มือถือ/PDF/เซฟตอนล็อกอิน (ตรวจแทนไม่ได้)
- ✅ **คอขวด Gemini เคลียร์ครบ 3 สาย (24 ก.ค. หลัง Surface รีสตาร์ท):** A (transcript รอดก่อนรีสตาร์ท) · palette (Pro รอบ · https://gemini.google.com/app/9a95feba7af5ea3d) · B060 (Pro · `docs/meetings/2026-07-24-b060-song-settings/`) · **กฎใหม่ข้อ 6 ในกระดานป้าย** = เปลี่ยนชื่อหน้าต่าง+แถบสี+monitor ฟ้องเมื่อเบราว์เซอร์ตาย (README อัปเดต · ที่มา: ป้าย 4 ใบ URL เดียวกัน P'Aim กดผิดหน้าต่าง + หน้าต่างถูกปิดระหว่างไล่หา + monitor กลืน exception)
- **2 คำถาม cross-ref จากหนังสือ:** (ก) **"อ.NNN" ชี้เล่มไหน** — ไม่ใช่อนุชน (เลข 3 หลักเกิน 120) · น่าจะ "เล่มบทเพลง.pdf" 53MB (ข) **"238=/233=" เขียนด้วยมือ** ที่หัว #432/#515 = เลขเล่มไหน · + เพลง (อ.842) ถูกขีดฆ่าปากกาแดงในเล่มใหญ่ใบ 335 (ตั้งใจตัด?)
  → ตอบแล้ว PM spawn SA ทำ audit อนุชนต่อ (hold อยู่)

### 🔴 หนี้ที่ต้องคืน (ห้ามลืม)
**เพลง 33 · ต้นฉบับ `E` · บน production เป็น `E7`** — พี่เปาแก้เองเพื่อกลบบั๊กเสียง (ปิดแล้ว) → **หลัง deploy ต้องรัน `tools/restore-song33-chord-E.sql` คืนเป็น E ทันที** (มี guard + rollback · แตะเพลงเดียว) ไม่งั้นเพลงผิดต้นฉบับถาวรและไม่มีใครจำได้ว่าทำไม

### คิวถัดไป (ยังไม่จ่าย · เรียงตามที่ผู้ใช้เจ็บ)
**🔒 คิวไฟล์ร้อน `SongViewer.vue` (ทีละตัว):** **Ctrl+Z** (จ่าย B แล้ว · 1 บรรทัด stopPropagation + เทสต์ keydown จริง) → **C/B060** integrate save-bar → **CP-0** → **B091**
🔴 **CP-0 = ไม่ใช่ยุบ 2 ที่ แต่ 4 ที่** (SA เปิดซอร์สอ่านเอง): (1) `NoteInputBar.vue:38` SYMBOL_GROUPS (2) `SongViewer.vue:295` SYMBOL_CHARS (3) `SongViewer.vue:405-421` keydown จัดประเภท **ชุด 1** (4) `SongViewer.vue:646` applySymbol จัดประเภท **ชุด 2 ซ้ำ** · **keydown ไม่เรียก applySymbol = drift จริงวันนี้** (คอมเมนต์ 644 เขียนว่า "never two code paths that drift" แต่มันมี 2) → ใบสั่ง CP-0 ต้องบังคับ keydown เรียก applySymbol ปิด drift · AC พร้อม `docs/ds/command-palette-acceptance.md` (AC-0.3 unit test ล้วน · AC-1.7 event-log + denominator guard)
**คอร์ดกดแล้วพิมพ์เลือกเลย** (พี่เปาบอกตอนนี้หลายคลิก) · **ย้าย/คัดลอก/วาง ห้อง·บรรทัด·ข้อ** — 🔴 ใบนี้ต้องมีข้อบังคับ **"id ของเครื่องหมายต้องออกใหม่ตอนวาง"** ไม่งั้น `flow` ชี้กำกวม = เล่นผิดเงียบ · **ยกโครงเพลง+การวนซ้ำ+เพิ่มบรรทัด/ห้อง+พิมพ์ เข้าตัวแก้ใหม่** (แล้วค่อยตัดแถบแท็บ) · ช่องไฟระหว่างห้อง · ชาร์ป-แฟลตในป๊อปอัป · อาการ "melody เกิน" 7.3% (รอหูพี่เปา) · `db/006` author_id (ไม่เคย deploy · P'Aim เคาะเอง) · ตัวแปลงไฟล์นำเข้าสร้างของพังซ้ำได้ · B120 หน้ากากแบบอนุชน · B121 เลือกขนาดกระดาษ · B122-B126 · 163/170 เพลงไม่มีระดับ verse จากป้ายท่อนตัวเอง (เหมือนกัน 2 เส้นทาง = ไม่ใช่บั๊ก)

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

## SSOT pointers
`docs/backlog.md` · 🔴 **repeat-flow spec = อยู่บน branch `nostalgic-perlman-7b5f10` ไม่เคย merge base** (ไฟล์ `docs/ds/repeat-flow-override.md`+`note-symbol-set.md` ไม่มีบน base) → **spec จริงบน base = header ใน `src/lib/songFlow.js:1-15` + `docs/song-model-v2.md:223-237`** (cherry-pick doc มาถ้าต้องใช้) · `work/ปรับ pl edit ui/ux-groundup-design.md` (ดีไซน์ล็อก) · `evidence-2026-07-24-ui-gap-audit/REPORT-ui-gap-audit.md` (**สถานะ UI ล่าสุด**) · `C:\gl\pm-inbox\pleng\` (รายงานทุกสาย) · `C:\gl\pm-inbox\_ขอความช่วยเหลือ\` (ป้ายเรียก P'Aim)
