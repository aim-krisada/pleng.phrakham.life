# รายงาน — DockKey phase 2: แผ่นเพลง + แก้ไข + MP3 (dev)

**สาย:** `dockkey-dev` (ต่อจาก phase 1) · **commit:** `5c71c16` (code) · **ฐาน:** sync `studio-shell-redesign` ล่าสุดแล้ว (merge `bd39df3`)
**ใบสั่ง:** `docs/pm/brief-dockkey-phase2.md` (pm4) · **spec:** `docs/ds/dockkey-print-edit.md`

## ทำอะไรไป (F60+)
ทำให้ **3 หน้าใช้ DockKey engine ตัวเดียวกัน** ต่างแค่ "รายการปุ่ม" (descriptor) — ฝึกร้อง (phase 1) + **แผ่นเพลง (ITEMS_PRINT)** + **แก้ไข (ITEMS_EDIT)** · เสียบ **MP3 เข้าเมนู export กลาง (PDF/JSON/MP3)** ของ dock · **ปลด StudioDock เดิม** (ไม่มีใคร mount แล้ว)

## step 0 — sync ฐาน
merge `studio-shell-redesign` (ขยับ 33 commit: audioExport MP3 lib · B073 beat · B075 undo · preview-final · note-search ฯลฯ) → conflict เฉพาะ `board.md` (เอาของ pm4) · SongViewer/SingTransport merge สะอาด · **vitest 291 เขียวก่อนเริ่มของใหม่**

## ไฟล์
- **`DockKey.vue`** — ต่อ schema (DS §4):
  - **E1 `kind:'keys'`** — band แป้นโน้ตเต็มกว้าง (หลายแถว) เหนือทุกแถว · ยกเว้น cap/overflow · ซ่อนตอนย่อ · แต่ละคีย์ `@mousedown` → `onInsert(sym)`
  - **E2 `prime`** (ปุ่มหลักสีแบรนด์) + ปุ่มมี `label` (ขยายเป็น pill icon+ข้อความ) + `disabled` + `danger`
  - `message` prop = แถบสถานะลอยเหนือ dock (แทน `sd-msg` เดิมของ StudioDock — ใช้โชว์ผลบันทึกหน้าแก้ไข)
  - cellFlex: เฉพาะ timeline/sel ยืดเต็มแถว · Aa/export = กว้างธรรมชาติ (dock ยัง hug ปุ่ม)
- **`ExportTool.vue` (ใหม่)** — ปุ่ม "ดาวน์โหลด" + เมนู **PDF / JSON / MP3** (+ estimate/progress/ETA) · MP3 เรียก `audioExport.songToMp3Blob` (import แบบ lazy · code-split) · mount ใน slot `#cell-export` ของ dock พิมพ์+แก้ไข (ใช้ open/toggle/close ของ engine = เปิดทีละ 1 + clamp)
- **`Studio.vue`** — แผ่นเพลง mount DockKey ป้อน **ITEMS_PRINT**: row1 `[grip · พิมพ์(prime) · export · Aa · ⚙]` · ⚙ = แสดงผล/แบบแผ่น/คอร์ด/คีย์/ดาวน์โหลด (ปักได้) · SongSheet เลิกล็อกตาย → รับ `mode/chord-system/show-*/display-key/songbook` จาก state (default = เท่าเดิม: ครบ·สมุดเพลง·ตัวอักษร·คีย์เดิม) · **ถอด `<StudioDock>` + editDock/activeDock ออกหมด**
- **`EditorMode.vue`** — mount DockKey ของตัวเอง ป้อน **ITEMS_EDIT**: band แป้นโน้ต 2 แถว (21 สัญลักษณ์) · row1 `[grip · ย้อน · ทำซ้ำ · ฟังท่อน↔หยุด · ⚙]` · row2 `[บันทึก(prime) · ฟังทั้งเพลง · export]` · ⚙ = บันทึกร่าง/ดูผลทั้งเพลง (ปักได้) · เลิก `emit('dock')` · **ปุ่มโครงสร้างต่อห้อง/บรรทัด คงไว้ inline ในตาราง** (contextual · ไม่ขึ้น dock ตาม DS §2)

## รั้ว — ยืนยัน
แตะเฉพาะ DockKey/SingTransport/SongViewer/Studio/EditorMode + ใหม่ ExportTool · **ไม่แตะ** styles.css · ShellBar · App · songSearch · NoteRow · StudioDock (แค่เลิกใช้ · ไฟล์+เทสต์ยังอยู่ = retired ไม่ลบ กันกระทบ base test)

## DoD
- ✅ **vitest 295 passed** (ฐาน merge 291 + DockKey E1/E2 +4 · notationLint fail=ของเดิม) · `npm run build` ผ่าน (audioExport code-split 171kB แยก chunk)
- ✅ dev `--host` **Network URL `http://10.215.141.98:5315`** (พี่เอม/พี่เปาเทสต์มือถือจริง · ยังรัน)
- ✅ **verify เบราว์เซอร์ 3 หน้า** (DOM/interaction · viewport headless 0×0 วัดพิกัดไม่ได้ตามเดิม):
  - **1 dock โผล่ทีละหน้า** (docksVisible=1 ทั้ง sheet+edit · อีก 2 โดน v-show ซ่อน) ✓
  - แผ่นเพลง: row1 `[grip · พิมพ์(prime✓) · export✓ · Aa · ⚙]` ✓
  - แก้ไข: **band แป้นโน้ต 21 สัญลักษณ์** `[1 2 3 4 5 6 7 0 - ~ …]` ✓ · row1 `[grip · undo · redo · play · ⚙]` · row2 `[playAll · export]` (บันทึก/ร่าง ซ่อนเพราะ guest = ถูกต้อง · โผล่เมื่อล็อกอิน) ✓
  - **note-insert ไม่ regress:** โฟกัสช่องโน้ต `.5.` → แตะคีย์ `6` → `.5.6` ✓
  - **เมนู export = PDF / JSON / MP3** (เปิดได้จริง) ✓
  - console **0 error** ✓
  - dock hug ปุ่ม (fit-content): rule เดียวกับ phase 1 (วัดสด 383px แล้ว) · แก้ไข dock กว้างตาม band แป้นโน้ต (แถวกว้างสุด) · **ฝากยืนยันบนมือถือจริง**
- ⚠️ **ยังไม่ได้ทดสอบเชิงลึก (ฝาก P'Aim gate LAN):** MP3 encode จริงจนได้ไฟล์ (ช้า ~วินาที) · undo/redo/beat-check พฤติกรรม (โค้ดเดิมไม่แตะ) · ปุ่มบันทึกตอนล็อกอิน

## จุดที่ตัดสินใจ/ค้าง (ตอบ DS §6 + ใบสั่ง)
1. **Aa หน้าแก้ไข (DS Q2):** **ถอดออก** — หน้าแก้ไขเป็นฟอร์ม row1 เหลือ `[grip·ย้อน·ทำซ้ำ·ฟัง·⚙]` (เลือกตามตัวเลือกที่ DS เปิดไว้) · หน้าฝึกร้อง+แผ่นเพลงมี Aa
2. **"ดูผลทั้งเพลง" (DS Q3):** เพิ่ม toggle ใน ⚙ หน้าแก้ไข (wired กับ `sheetWinOpen` เดิม) · **คงปุ่มเดิมที่หัวไว้ด้วย** = ไม่ regress · ถ้าพี่เอมอยากให้เหลือที่เดียวบอกได้
3. **แบบแผ่น/แสดงผล/คีย์ หน้าพิมพ์ (DS Q1/Q4):** ใส่ครบใน ⚙ (default = พฤติกรรมเดิม) · ผู้ใช้ปรับได้ · export menu มี PDF ซ้ำกับปุ่มพิมพ์ prime (พิมพ์=ด่วน · export=เมนูรวม) — ตั้งใจ
4. **StudioDock.vue** = **ลบทิ้งแล้ว** (P'Aim สั่ง 11 ก.ค. · `6ff9b1e`) — ไม่มีใคร mount แล้ว · ลบไฟล์ + StudioDock.test.js + stub ในเทสต์ EditorMode · **284 test** (จาก 300 −16 = เทสต์ StudioDock เอง) · build ผ่าน

## รอบเสริม — MP3/export ครบ 3 หน้า (pm4 tip · re-sync b2ffbab)
pm4 แจ้ง: สาย `mp3-dock-wire` merged เข้าฐาน (`b2ffbab`) ก่อนคำสั่งยกเลิก = มี MP3 item ใน `SongViewer.settingDescs` แล้ว → ให้ carry เข้า DockKey descriptor
- **re-sync ฐานล่าสุด** (merge `studio-shell-redesign` รอบ 2: b2ffbab MP3 + favicon-footer + search-555 + editor-ux docs) — auto-merge สะอาด (ไม่มี conflict · SongViewer 2 ฝั่งแก้คนละที่)
- **ยก MP3 เข้า ExportTool กลาง** (commit `08870aa`): `ExportTool` รับ `bpm`/`transpose` เพิ่ม → **MP3 หน้าฝึกร้อง render ตามคีย์/สปีดที่เลือก** (เหมือนปุ่มฟัง) · พิมพ์/แก้ไข = คีย์/bpm ต้นฉบับ
- **เพิ่ม export เข้า dock ฝึกร้อง** (row1 rightOf:forward) → sing row1 = `[grip·back·play·fwd·export·Aa·⚙]` · **ลบโค้ด MP3 inline เดิม + item download/mp3/print ใน settingDescs ที่ตายแล้ว** (ExportTool คุมแทน · settingDescs เหลือ display/chord/key/tempo)
- **ครบ 3 หน้ามี PDF/JSON/MP3 เมนูเดียวกันหมด** · verify: sing export menu = [PDF, JSON, MP3] · key badge (E) ยังอยู่ · **300 test · build ผ่าน · 0 error**
- ⚠️ export หน้าฝึกร้องเพิ่ม 1 ปุ่มบน row1 ที่ P'Aim accept ไว้ (transport เดิม 6 → 7) — ถ้าอยากย้ายไป ⚙ บอกได้ (ตอนนี้ ⚙ ยัง render slot ไม่ได้เพราะ overflow clip · ต้องเพิ่ม engine)

## รอบ checklist — P'Aim ตรวจหน้าฝึกร้อง 11 ก.ค. (pm7 · `docs/pm/dockkey-checklist.md`)
แก้ที่ **engine ครั้งเดียว → 3 หน้าได้ตาม** (ไม่ hand-roll ต่อหน้า) · ทุกข้ออิง WCAG 2.2 AA · verify DOM สด (viewport session นี้ทำงาน)

### §A ENGINE invariants (DockKey core · ทุกหน้า)
- [x] **ทุก popup เปิดชิดขวา เริ่มจากขอบบน dock — ตำแหน่งเดียวกันหมด** · เอา `position:relative` ออกจากปุ่ม → popover ยึด dock ไม่ใช่ปุ่ม · **วัดสด: setting/ท่อน/คีย์/Aa gap ขวา = 9px เท่ากันหมด**
- [x] **ทุก popup fit เนื้อหา ไม่มี scroll แนวตั้ง/แนวนอน** · setting `scrollW/H = 0` (เดิมโดนตัด+h-scroll) · `width:max-content`
- [x] **spacing สม่ำเสมอ** · setting row rhythm 8px + เส้นคั่น
- [x] **ตัดลูกศร ▾** · ไม่มี `.dk-caret` แล้วทุกปุ่ม
- [x] **ไอคอนล้วนบนแถบ** · ปุ่ม download = ไอคอนอย่างเดียว
- [x] **button hierarchy** · **เจอต้นตอ:** ปุ่ม ExportTool ใช้ class `.dk-btn` แต่ style ของ DockKey เป็น scoped → ไม่ถึง slot → ตกไป global fill สีน้ำตาล = "ปุ่ม download น้ำตาลโดด" · แก้ให้ `.et-trig` เป็น ghost เต็ม (bg โปร่ง) · **filled สงวนให้ primary จริง: ฝึกร้อง=เล่น ▶(สีแบรนด์) · แผ่นเพลง=พิมพ์(filled) · แก้ไข=บันทึก(filled)** · download/tool = ghost หมด · วัดสด: export bg = `transparent` ทั้ง 3 หน้า
- [x] **ไม่มีคำอธิบายวิธีใช้ในหัว popup** · ตัดหัว ⚙ + trim หัว Aa

### §B หน้าฝึกร้อง
- [x] **B1** เวลาไม่ซ้อนปุ่มคีย์ · timeline เป็น fixed-width (ไม่ยืด) กัน total-time ล้นเข้า คีย์ · **วัดสด: -34px (ซ้อน) → +10px (เว้น)**
- [x] **B2** selection↔timeline · **ต้นตอ = progress fill (แถบน้ำตาล 0→ปัจจุบัน) ทับท่อนที่ไม่เลือก ดูเหมือนถูกเลือก** → **ลบ fill** · selection มาจากเส้นท่อนอย่างเดียว (เลือก=น้ำตาล/ข้าม=เทา) · ตำแหน่ง = หัวสไลเดอร์เดียว
- [x] B3 = §A (popup ชิดขวา) ✓
- [x] **B4** ตัด "ไม่เลือก = ทั้งเพลง" · **B5** หัว popup "เลือกท่อนที่จะซ้อม" → **"เลือกท่อนที่จะฟัง"**
- [x] B6 = B1 (timeline margin) ✓ · **B7** download เหลือไอคอน ✓ · **B8** label หายตอนเปิด download = หมดปัญหา (ไอคอนล้วน)
- [x] **B9** คีย์ตัด ▾ ✓ · **B10** setting ไม่มี h-scroll ✓ · **B11** ตัดหัว setting ✓ · **B12** spacing setting ✓

### verify 3 หน้า (DOM สด · `192.168.1.124:5315`)
- ฝึกร้อง: row1 `[grip·back·play·fwd·export(ghost)·Aa·⚙]` · time→key +10px · popup 4 ตัว gap ขวา 9 เท่ากัน · ไม่มี fill · console 0 error
- แผ่นเพลง: export ghost · ไม่มี caret · `[grip·พิมพ์(prime)·export·Aa·⚙]`
- แก้ไข: export ghost · band แป้นโน้ต 21 · setting ไม่มีหัว/ไม่มี h-scroll
- **300 test · build ผ่าน**

### รอบ tester (pm7) — a11y + Tier-B
- [x] **axe critical `aria-required-children` (WCAG 4.1.2):** `.dk-panel` เป็น**ฟอร์ม**ไม่ใช่ menu (ลูก = controls) → `role="menu"` → **`role="group"`** (dropdown จริง `.dk-dd` คง `role="menu"` = ถูก) · `867b287`
- [x] **Tier-B fit (มือถือ):** ▲▼ เดิมโชว์ทุกแถว (disabled ตอนไม่ปัก) ดันแถวเกิน 55px บนจอ 375 = h-overflow → **โชว์ ▲▼ เฉพาะ item ที่ปัก** → panel fit ไม่มี scroll
- [x] **Tier-B verify สด 3 breakpoint** (`--host` · 375/768/1280): ทุก popover **on-screen + ชิดขวา + ไม่มี v/h scroll** · **tap target 44px** · dock hug (≥แท็บเล็ต) · console 0 error
  - มือถือ 375: setting hScroll 0 · on-screen (ขวา 16px) · dock 359 (เต็มกว้าง)
  - แท็บเล็ต 768: dock 386 hug · popover ทั้ง 5 on-screen · minTap 44
  - เดสก์ท็อป 1280: dock 386 hug · setting ชิด dock ขวา 9px · hScroll 0

**DoD checklist:** vitest **284** + build ✓ · dev `--host` **`http://192.168.1.124:5315`** ✓ · Tier A (axe/popup/focus) + Tier B (no-scroll/target-size/clamp 3 จอ) verify แล้ว ✓ · **⛔ ยังไม่ให้ P'Aim ดู — ส่ง tester ตรวจซ้ำก่อน** (screenshot MCP timeout · ตรวจด้วย getBoundingClientRect/computed-style + prototype)

## รอบ §D — P'Aim GATE 4 (ตรวจฐานรวม 11 ก.ค. · `dockkey-checklist §D`) · commit `108167c`
แก้ที่ **engine → 3 หน้าได้ตาม** · verify Tier-B 3 breakpoint (375/768/1280) เอง
- [x] **D1 (margin/polish):** dock padding 10px (มือถือ 8px) + row gap กว้างขึ้น = แถวปุ่มโปร่งสบายตา
- [x] **D2 (smart row-pack · engine):** บนจอ ≥แท็บเล็ต ถ้า row2+row1 เป็น **แถวปุ่มล้วนทั้งคู่** และรวมกันไม่เกิน cap → **ยุบเป็นแถวเดียว** (row2 แทรกก่อน ⚙) · **แก้ไข** จาก 2 แถวครึ่งๆ → 1 แถวเต็ม `[grip·undo·redo·ฟังท่อน·ฟังทั้งเพลง·export·⚙]` · มือถือไม่ยุบ (กันล้น)
- [x] **D3 (fit ทุกด้าน):** ลบ min-width ที่ดันความกว้าง → **แผ่นเพลง hug พอดี 262px** (trailing หลัง ⚙ = ~1px) · วัดเดิม 39px → 1px
- [x] **D4 (no redundant):** ปุ่มฟัง 2 ตัวแยกชัด — **▶ ฟังท่อน** (ท่อนที่แก้) vs **◉ ฟังทั้งเพลง** (arrangement) · label + ไอคอนต่างกัน · ไม่ใช่ ▶ เปล่า 2 อัน
- [x] **D5 (timeline sections):** เพิ่ม **เส้นแบ่งขาวทุกขอบท่อน** + เส้นท่อนที่ไม่เลือกเป็นเทากลาง (เห็นชัด) → เพลง 2 ท่อนเห็น 2 ช่วง + 1 เส้นแบ่ง · timeline responsive (150px มือถือ / 200px เดสก์ท็อป) กัน row2 ล้น
- **Tier-B verify สด 3 breakpoint** (`--host http://192.168.1.124:5315`): **0 row overflow** ทุกหน้าทุกจอ · dock hug (≥แท็บเล็ต) · แก้ไขยุบ 1 แถว (≥แท็บเล็ต) / 2 แถว (มือถือ ไม่ล้น) · แผ่นเพลง 258-270 hug · console 0 error · **300 test · build**
  | หน้า | มือถือ 375 | แท็บเล็ต 768 | เดสก์ท็อป 1280 |
  |---|---|---|---|
  | ฝึกร้อง | 356 · 2 แถว | 392 hug · 2 แถว | 392 hug · 2 แถว |
  | แผ่นเพลง | 258 hug | 270 hug | 270 hug |
  | แก้ไข | 359 · 2 แถว | 491 hug · **1 แถว** | 491 hug · **1 แถว** |

### B079 (ต่อจาก D4 · P'Aim) — download ซ้ำ 2 ที่ · commit `10e91d5`
- [x] "ดาวน์โหลด JSON" อยู่ทั้งเมนู **จัดการ ▾** และ **dock export** = ผิด single-source-of-action (Hick's Law · NN/g #4 · `ui-standards §2`)
- **แก้:** export (PDF/JSON/MP3) = **dock ExportTool ที่เดียว** · จัดการ ▾ เอา "ดาวน์โหลด JSON" ออก เหลือ **อัปโหลด JSON (import)** + งานร่าง/ประวัติ/ลบเพลง · verify: จัดการ = [อัปโหลด JSON, …] · dock export = [PDF, JSON, MP3] · **300 test**

## ⛔ ห้าม merge/deploy เอง — รอ PM ตรวจ DoD + P'Aim gate LAN 3 หน้า (โดยเฉพาะหน้าแก้ไข)
