# DS — ฝึกร้อง: tag ท่อน + เลือกวนซ้ำหลายท่อน (B043)

US: `docs/us/sing-repeat.md` · โมเดล: `docs/song-model-v2.md` · dock: `ps3-dock` (ปุ่ม "วนซ้ำ" D7) · เชื่อม B038 (scroll ตรงพยางค์) · B006/`ps3-highlight` · B042 (เล่นต่อ/เริ่มใหม่)

**หลักคิด:** ไม่สร้าง UI ใหม่ขนาน — `SongViewer.vue` มี **แถบชิปท่อน** (`▶ ทั้งเพลง · ร้อง1 · รับ · ร้อง2`) + เล่นเป็นท่อน + ไฮไลต์รายพยางค์ + auto-scroll อยู่แล้ว. B043 = **ต่อยอดระบบเดิมชิ้นเดียว** ให้ (1) ยุบท่อนซ้ำเป็นชิปเดียว (2) ติ๊กหลายชิป = วน (3) ⏮/⏭ ท่อนก่อน/ถัดไป.

---

## 0. ของเดิมที่มีแล้ว (อย่าเขียนซ้ำ) — `SongViewer.vue`
| มีอยู่ | ใช้ทำอะไร |
|---|---|
| `sections` computed (บรรทัด ~73) | หา `{type:'section'}` marker ใน `resolved.lines` → `[{name, fromLi, toLi}]` = **ชิปท่อน** |
| แถบชิป (template ~289) | `▶ ทั้งเพลง` + ชิปต่อท่อน · แตะ = `playSection(i)` เล่นท่อนนั้น · `v-if="sections.length"` |
| `startPlay(range, key, startIndex)` | เล่นช่วง `{fromLi,toLi}` เดียว · มี `loop` (ทั้ง viewer) · `pausedIndex` (B042 เล่นต่อ) |
| `playingSyl = {li,si,syk}` (onNote) | **ไฮไลต์รายพยางค์อยู่แล้ว** (B006) · addr ด้วย `li-si` = ไม่ซ้ำต่อ occurrence |
| watch(playingSeg) → scrollIntoView `[data-seg="li-si"]` | **auto-scroll ตามอยู่แล้ว** (B016) · พัก 3.5s ตอนผู้ใช้ปัด |
| dock tool `loop` (id:'loop', icon 'repeat', ~258) | ตอนนี้ = toggle วนทั้งเพลง (bool) |

**สรุป:** ไฮไลต์/scroll/เล่นต่อ/เล่นเป็นท่อน **มีครบ** — เป็นเครื่องยนต์. B043 = **เปลี่ยนเปลือก control เป็น music dock + ยุบท่อนซ้ำ + multi-range play order + prev/next**.

---

## 0b. ยกเครื่อง control ฝึกร้อง → Music dock ล่าง (PM #4 · directive P'Aim)
**directive:** ตัด **การ์ดควบคุมบนหัว** ทั้งก้อน (`▷ ฟังเพลง · ♩ ตามเพลง · ☐ วนซ้ำ · ก-/ก+ · เต็ม/เนื้อล้วน · ABC/IVV · 🖨`) → ย้าย control **ทั้งหมด** ลง **แถบ dock ล่าง sticky แบบ music player** (config ลง dock-core library · ref `docs/pm/realuse-assets/ref-music-player-*.jpg`)

**องค์ประกอบ music dock (sing mode):**
1. **แถบ progress (timeline)** — เต็มกว้าง · เวลาเล่น/เวลารวมซ้าย-ขวา · **marker = จุดเล็ก บอกตำแหน่งท่อน** (ไม่แบกภาระเลือก — PM #6d) · dot ตำแหน่งวิ่งตาม `onProgress` (มีใน `playSong` แล้ว: `onProgress(elapsedMs,totalMs)`) · **แตะ marker/ลากแถบ = scrub** (§3d)
2. **transport row** — `⏮ ท่อนก่อน` · `▶/⏸` (ใหญ่กลาง) · `⏭ ท่อนถัดไป` · `🔁 วนซ้ำ` (loop เปิด/ปิด §3) · `☰ เลือกท่อน` (เปิดรายการเลือก §3d)
3. **⚙ ดูเพิ่ม/ตั้งค่า (ขวาสุด §4b/§4c)** — แผงแนวตั้ง+ชื่อ+ inline: แสดงผล · คอร์ด · คีย์ · ความเร็ว · ฟอนต์ · ความโปร่ง · **ดาวน์โหลด** · พิมพ์ · จัดปุ่มเอง(D6)
   - **ย้ายปุ่มดาวน์โหลดเข้า dock** (ออกจากแถบหัว · ปัจจุบัน `DownloadTool.vue` teleport เข้า shell → ย้าย mount เป็น dock tool)

**ไฟล์:** ลบ `.section-bar` การ์ด/แถบชิปบน (template ~289) ออกจาก `SongViewer.vue` → controls ทั้งหมดเป็น `singTools` ใน `StudioDock` (D1-D7 · ปุ่มมีอยู่แล้วส่วนใหญ่: play/chord/tempo/key/display/loop/fdown/fup/print — เพิ่ม prev/next + progress-bar + download) · แถบ progress = ส่วนใหม่ของ dock-core (transport kind) → **ออกแบบที่นี่ dock-core สร้าง**
**seek (H=ทั้งสอง):** แตะ marker = กระโดด occurrence นั้น · **ลาก scrub อิสระ** = map time→note index → `startIndex` (ทำทั้งคู่)

## 1. ยุบท่อนซ้ำ → 1 ท่อน = 1 tag บน timeline (PM #1)
แยก 2 ระดับ (สำคัญ — timeline ≠ selection):
- **timeline markers** = `sections` เดิม (ทุก occurrence · รับ = 2 marker) — เพราะ timeline ต้องเรียงตามเวลาจริง แตะ marker ไหน=ไปจุดนั้น
- **selection tags** = จัดกลุ่มตาม **ชื่อท่อน (label)** — ผู้แต่งคุมผ่าน label (รับที่ร้องซ้ำ = "รับ" เหมือนกัน → tag เดียว; ตั้งใจต่าง = "รับ 2"):
```js
// sectionTags = group sections by name → [{ name, ranges:[{fromLi,toLi}, ...] }]
//   เลือก tag "รับ" = เลือกทุก range/marker ที่ label = "รับ" (2 จุดสว่างพร้อมกัน)
```
- แตะ marker (โหมดปกติ) = เล่นจากจุดนั้น (occurrence นั้น) — ไป "ที่รับ" จุดที่แตะ (**decision E**)
- **v1 / เพลงแบน** (`content.lines` ไม่มี section marker · migrateToV2 = stanza เดียว label ว่าง → resolveContent ไม่ใส่ marker) → `sections.length===0` → **ไม่มี marker** (แถบ progress เป็น timeline เปล่า) → §5 fallback

## 2. การแสดงผลแผ่นเพลง = **A2 แผ่นย่อ** (P'Aim เคาะ 9 ก.ค. · decision A = A2)
**เคาะแล้ว: แผ่นย่อ — รับโชว์ครั้งเดียวบนจอ เล่นวนกลับ** (วิสัยทัศน์เดิม P'Aim · ประหยัดที่ทั้งจอ+พิมพ์)
- render section-group **ครั้งเดียว** (เหมือน print "stack by stanza", song-model-v2 §Three renders) — **แตะ `SongSheet` (ร่วม print/editor)**
- ไฮไลต์ต้อง anchor ด้วย **`(sectionKey, slot)`** ไม่ใช่ `li-si` เพราะบล็อกเดียวเล่นหลายรอบ → รับรอบ 2 กลับมาไฮไลต์บล็อกเดิมถูกพยางค์ + ป้าย **"รอบ N"** (decision B = เอา)
- ⚠️ **ต้อง verify พิมพ์ PDF จริง** (verify-print-from-pdf) — SongSheet ร่วม print → ห้ามพังกระดาษ
- (ทางเลือก A1 "แผ่เต็ม ไม่แตะ SongSheet" ไม่เลือก — บันทึกไว้เผื่อย้อน)

## 3. เลือกท่อนแบบ Gmail — selection ขับ music control (PM #6)
**เปลี่ยนจากโมเดล toggle-mode เดิม → Gmail-style** (ภาพ `realuse-assets/gmail-select-all-none.png`): marker เลือกได้เสมอ ไม่มีโหมด · music control ทำกับ selection

### 3a. State (ชั่วคราว — ไม่แตะเพลง เหมือน key/tempo/font)
```js
const selectedSecs = ref(new Set())  // ชื่อท่อนที่เลือก · ว่าง = ทั้งเพลง
const loopOn = ref(false)            // 🔁 วนซ้ำ เปิด/ปิด (แยกจาก selection)
```
- **เลือกได้เสมอ** (ไม่มีโหมด) · toggle ท่อนตาม label — จาก **รายการเลื่อนได้ (§3d)** หรือ **ป้ายท่อนบนแผ่นเพลง**
- **All / None** อยู่หัวรายการ (§3d) — เลือกทุกท่อน / ล้าง
- **🔁 = loop เปิด/ปิด** (ไม่ใช่ mode) · **▶/⏸ · ⏮/⏭ เดินตาม selection** (ว่าง = ทั้งเพลง)
- **ความเร็ว/คอร์ด/แสดงผล/คีย์ = global** (ไม่ผูก selection) — อยู่ใน dock เหมือนกัน
- **ไม่ persist (C=ไม่จำ เคาะแล้ว):** เปลี่ยนเพลง = ล้าง `selectedSecs`

### 3b. Play order — สร้างจาก ranges ของท่อนที่เลือก
```js
// effectiveOrder(sectionTags, selectedSecs) → [{fromLi,toLi}, ...] เรียงตามลำดับในเพลง
// - selectedSecs ว่าง → undefined (= ทั้งเพลง range เดียว, พฤติกรรม startPlay เดิม)
// - มีค่า → เก็บทุก range ของท่อนที่เลือก · เรียงตาม fromLi · ยุบท่อนซ้ำติดกัน
//   · ยุบรอยต่อวนกลับ (ถ้าท่อนแรก=ท่อนสุดท้าย ตัดตัวแรก → {ร้อง2,รับ} → ร้อง2→รับ)
```
(logic นี้ node-test แล้ว — ดู wireframe `<script>` เดียวกัน)

### 3c. เล่น — ต่อ `startPlay`/`playSong` ให้รับหลายช่วง
```js
// playSong(content, { ...เดิม, order, loop })  — order = [{fromLi,toLi}, ...]
//   ถ้ามี order: notes = ต่อ notes ของแต่ละช่วง (กรองด้วย n.li) ตามลำดับ order แล้ว do/while
//   ไม่มี order = พฤติกรรมเดิมเป๊ะ (additive — ไม่พัง v1/ทั้งเพลง)
// startPlay: order = effectiveOrder(...) (undefined ถ้าไม่เลือก = ทั้งเพลง) · loop = loopOn (อิสระจาก selection)
```
`songToNotes` แต่ละโน้ตมี `.li` อยู่แล้ว → กรอง/ต่อช่วงตรงได้ · **selection กำหนด "เล่นอะไร" · 🔁 กำหนด "วนไหม"** (2 แกนแยกกัน)

### 3d. UI เลือกท่อน — รายการเลื่อนได้ แยกจาก progress bar (PM #6d · ท่อนเยอะล้นจอ)
**โจทย์:** เพลงท่อนเยอะ (เช่น song-84) → marker เบียดกันบน progress bar มือถือ แตะเลือกยาก. **แยก 2 หน้าที่:**
- **progress bar** = ตำแหน่ง + scrub เท่านั้น · marker = จุดเล็ก (แตะ = กระโดด ไม่ใช่เลือก)
- **เลือกท่อน = รายการเลื่อนได้แบบ Gmail** — เปิดจากปุ่ม `☰ เลือกท่อน` (มือถือ = **bottom sheet**, desktop = popover) · หัวมี **All / None** · แต่ละแถว = `checkbox + ชื่อท่อน (+ป้ายฮุก)` · **ท่อนเยอะแค่ไหนก็ scroll ไม่เบียด**
- **สองทางเลือก sync กัน:** แถวในรายการ ↔ ป้ายท่อนบนแผ่นเพลง (body tag) — แตะที่ไหนก็ toggle ท่อนเดียวกัน (ป้ายบนเพลง = ทางลัดตอนท่อนน้อย · รายการ = ตอนท่อนเยอะ/มือถือ)
- ปุ่ม `☰` โชว์จำนวนที่เลือก (`N/total` / "ทั้งหมด" / ว่าง)

## 4. ⏮/⏭ ท่อนก่อน/ถัดไป (transport)
- 2 ปุ่มใน transport: `prev`/`next` → เลื่อน `playingSection` ไป marker ก่อน/ถัดไปใน play order แล้ว `startPlay` ช่วงนั้น
- marker ที่กำลังเล่น = `active` + dot ตำแหน่งเลื่อนตาม `onProgress` (มีแล้ว) · marker เป็น progress ในตัว

## 4b. Dock layout convention (PM #3) — ธรรมเนียมแถบควบคุมกลาง
convention ของ dock library กลาง (`ps3-dock`) ใช้ทุกโหมด · B043 เพิ่มปุ่ม `loop`(เลือกวน) + `prev`/`next` ลงแถบนี้ จึงระบุที่นี่ให้ dock-core ยึดตอนสร้าง library:
- **ลำดับ:** `[grip] [ปุ่มเครื่องมือ …] [⋯ ดูเพิ่ม]` — **⋯ อยู่ขวาสุดของกลุ่มเครื่องมือเสมอ** (ธรรมเนียม overflow)
- **ปุ่มระบบ dock** (หุบ/collapse) **แยกออกจากแถวเครื่องมือ** — สอดคล้อง dock-core ที่จะยกปุ่มหุบเป็นปุ่มลอย → ⋯ เป็นตัวท้ายพอดี (ห้ามมี blend/sliders/หุบ อยู่ขวาของ ⋯)
- **ทิศ:** แถบ = **แนวนอน** (คุมอ่านซ้าย→ขวา เหมือน music player) · **เมนูที่ ⋯ กางออก = แนวตั้ง + ไอคอน+ชื่อกำกับ** (overflow ต้องมีชื่อ อ่านง่าย ไม่ใช่ไอคอนล้วนให้เดา)
- ผลกับ B043: ปุ่ม transport ชิดซ้าย · ปุ่มที่ปักเป็นเครื่องมือถัดมา · **ตัวขวาสุด = ⚙ แผงตั้งค่า** (รวมบท "ดูเพิ่ม/overflow" เข้ากับ §4c — vertical + ชื่อ + ปรับ inline) · ปุ่มหุบ dock ไม่ปนแถวนี้

## 4c. โมเดล 2 ชั้น: แถบ (ปัก) + ⚙ แผงตั้งค่า (PM #6c) — core dock concept
**โจทย์ P'Aim:** setting ที่ใช้นานๆ ที (เช่น ความโปร่ง) ถ้าซ่อนจากแถบแล้วต้องปักกลับมา-ปรับ-ถอน = ไม่สมเหตุผล → **ต้องปรับได้โดยไม่ต้องปัก**

**2 ชั้น (dock-core สร้าง · ใช้ทุกโหมด · B043 = ตัวตั้ง config):**
1. **แถบ dock** = ปุ่มลัดที่ **ปักไว้** (ของใช้บ่อย · customize เลือกได้ D6)
2. **⚙ แผงตั้งค่า** = **บ้านของ *ทุก* control/setting** · **ปรับ inline ตรงนั้นได้ทันที แม้ไม่ได้ปักบนแถบ** (เช่น slider ความโปร่งอยู่ในแผง ปรับได้ตลอด ไม่ต้องปัก) · แต่ละแถวมี **📌 ปัก/ถอน** ขึ้นแถบ

- **ทุก control มีที่อยู่ในแผงเสมอ** → ปักบนแถบ = ทางลัด (optional) ไม่ใช่ทางเดียวที่จะปรับได้
- **B043 sing default pin:** All/None · ⏮ ▶ ⏭ 🔁 (transport) · ที่เหลือ (แสดงผล/คอร์ด/คีย์/ความเร็ว/ฟอนต์/ความโปร่ง/ดาวน์โหลด/พิมพ์) อยู่ในแผง ปรับ inline · ผู้ใช้ปักเพิ่มเองได้ (**decision G**)
- ไฟล์: `StudioDock.vue` (dock-core) สร้าง **core settings panel** (inline widget + pin state ต่อโหมด · เก็บ localStorage · ต่อยอด deck-key เดิม D6) · **แทน** ⋯ overflow แบบ launcher เดิม
- **แยกได้จาก decision A:** transport + settings panel = ก้อนที่ dock-core build ได้เลยเมื่อ P'Aim เคาะ (ไม่ผูก "แผ่เต็ม/ย่อ" มาก) — PM ยืนยัน build ก้อนนี้ถัดไป

## 5. เพลงไม่มีโครงท่อน (v1 แบน) — fallback (PM #2 · F=เงียบ)
- `sections.length===0` → timeline ไม่มี marker · ซ่อนปุ่ม `☰ เลือกท่อน` · เหลือ `▶` + `🔁` = เล่น/วนทั้งเพลง (degenerate case ที่ถูกต้อง)
- **F = เงียบ (เคาะแล้ว):** ไม่มีคำใบ้ "เพิ่มโครงท่อน" — เล่นทั้งเพลงเงียบ ๆ ตามปกติ

## 5b. ไฮไลต์ + scroll (S4) — A2 path
- เพิ่ม `sectionKey`+`slot` บนโน้ต (`songToNotes`) + span `[data-sec][data-syl]` ใน SongSheet → บล็อกเดียว (รับ) เล่นหลายรอบ ไฮไลต์กลับมาถูกพยางค์ (ร่วม B006) + auto-scroll เล็งพยางค์ = **สิ่งที่ B038 ต้องการ** + ป้าย "รอบ N" (B)
- **scrub (H=ทั้งสอง):** ลากแถบ progress → map ตำแหน่ง→ occurrence+พยางค์ → `startIndex`/ไฮไลต์ตรงนั้น · แตะ marker = กระโดด occurrence นั้น

## ไฟล์ที่แตะ (ตอน dev — ยังไม่ทำรอบนี้)
| ไฟล์ | ทำอะไร (A2) |
|---|---|
| `SongViewer.vue` | **ลบการ์ด control บน** · `sectionTags` group-by-label · `selectedSecs`+`loopOn` (เลือกที่ tag/marker) · ⏮/⏭ · scrub · ส่ง `order` |
| `StudioDock.vue` (dock-core) | **transport kind** (progress+marker+play/pause+scrub) + **⚙ core settings panel** (§4c: inline widget + pin/localStorage) · sing tools ครบ · convention §4b |
| `SongSheet.vue`(+`NoteRow`) | **render ย่อ** (section-group ครั้งเดียว · A2) + span `[data-sec][data-syl]` (ร่วม B006 highlight) · ⚠️ ร่วม print/editor · worktree แยก · **verify PDF จริง** |
| `src/lib/midi.js` | `effectiveOrder()` + `playSong` รับ `order` · `onProgress` ขับ dot · `sectionKey`+`slot` บนโน้ต (anchor ไฮไลต์ A2) |
| `DownloadTool.vue` | ย้าย mount จาก shell teleport → เป็น dock tool/แผง |

⚠️ **ชน dock-core หนัก** (SongViewer/StudioDock/DownloadTool + SongSheet ร่วม print) → **ต้องหลัง dock-core merge** · ประสาน dock-core (เขาสร้าง transport+panel, SA ออกแบบ) · ยิงรวม batch viewer กับ **B038 + B042**

## ยึด / ระวัง
- `selectedSecs`/`loopOn` = local state ล้วน · ห้ามเขียนลง `content`/DB (หลัก v2 — จอ/พิมพ์ render จาก dataset เดียว)
- อย่าแตะจังหวะ/ทำนองใน midi.js · ทดสอบเสียงด้วยหู (heard-bugs prove by ear)
- **A2 แตะ SongSheet (ร่วม 3 ทาง) → verify พิมพ์ PDF จริง** (verify-print-from-pdf)

## Decisions (P'Aim เคาะครบ 9 ก.ค.)
- **✅ A = A2** แผ่นย่อ (รับครั้งเดียว เล่นวนกลับ) — แตะ SongSheet + verify print
- **✅ B = เอา** ป้าย "รอบ N"
- **✅ C = ไม่จำ** — เปลี่ยนเพลง = ล้าง `selectedSecs` (เริ่มใหม่ทุกเพลง · state ชั่วคราวเหมือน key/tempo)
- **✅ D** = ตามลำดับในเพลง + ยุบรอยต่อ (ทำในไฟล์แล้ว)
- **E** = ตัด (marker = เลือก/กระโดด แยกจาก selection-list แล้ว)
- **✅ F = เงียบ** — v1 ไม่มีท่อน = เล่นทั้งเพลง ไม่มีคำใบ้
- **✅ G = ตามเสนอ** (⏮ ▶ ⏭ 🔁 + ☰เลือกท่อน บนแถบ · ที่เหลือใน ⚙)
- **✅ H = ทั้งสอง** — scrub อิสระ + แตะ marker กระโดด · ⏮/⏭ เดินใน selection ถ้ามีเลือก
