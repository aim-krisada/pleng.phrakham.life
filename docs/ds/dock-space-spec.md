# DS/สเปก — คืนพื้นที่ editor (dock หลบเอง + contextual) · **targeting โค้ดจริง**

**สถานะ:** 🟡 **DRAFT (prep · read-only)** — เขียนบนโค้ดจริงตาม SOP §3.0 (เลิก mockup ทิ้ง · สเปกครบ → dev build บนโค้ดจริง 1 branch) · **⛔ ยังไม่แตะไฟล์/ไม่ build จน PM เคาะ dev+sequence + P'Aim เคาะทิศ**
**⚠️ code-ref verify vs ฐาน `studio-shell-redesign` ปัจจุบัน (PM จับดริฟต์ 18 ก.ค. · `uxui-standing` ล้าหลัง 2 คอมมิต):** เลขบรรทัดทั้งหมดด้านล่าง = **base ปัจจุบัน** (EditorMode 4687 บรรทัด · DockKey 629) · **dev ต้อง branch จาก `studio-shell-redesign` ไม่ใช่ `uxui-standing`** (ไม่งั้น revert phase-1 `38cd50b` + 2c `ce1022e`) · **phase-1 (D3/D4/D2 · ห้ามเลือดไหล) แก้ `reviewingDraft`/`save.name=saveName`/primaryAction แล้ว** — slim/contextual ของสเปกนี้ต้องไม่ชนของนั้น
**แทน:** mockup HTML (`docs/ds/dock-space-mockup.html`) = **reference ทีม/dev เท่านั้น ไม่ใช่ deliverable P'Aim**
**ยึด:** `docs/us/dock-space-reclaim.md` (แนวคิด+มาตรฐาน) · `ux-platform-patterns.md` (§5.5 device-matrix) · `docs/ui-standards.md`
**map 1:1 กับ:** `src/components/DockKey.vue` (engine · แชร์ 2 เว็บ) · `src/components/EditorMode.vue` (`editItems` + contextual)

---

## 0 · สถาปัตยกรรมจริง (verify แล้ว · ชื่อจริงในโค้ด)

| ส่วน | ไฟล์:บรรทัด | ข้อเท็จจริง |
|---|---|---|
| **dock ของ editor = `DockKey.vue`** | `EditorMode.vue:19,3094` | `<DockKey :items="editItems" store-key="edit" v-model:alpha="editAlpha">` · **engine แชร์ 2 เว็บ (พระคำ `@pleng` import) → แตะ = 2-host DoD** |
| **ตำแหน่ง dock** | `DockKey.vue` `.dk-host` | `position:fixed; bottom:0; z-index:90` · เนื้อ editor scroll ใต้ dock (window scroll) |
| **ปุ่มของ edit dock** | `EditorMode.vue:1824 editItems` | ดู §1 (ชื่อ id จริงทุกปุ่ม) |
| **ปุ่มต่อ element (ห้อง/โน้ต) = inline อยู่แล้ว** | `EditorMode.vue:1779` comment + `slot-tools` :2909/3039 | *"structural per-bar tools stay INLINE (contextual — not dock commands)"* → contextual toolbox **มีเชื้อแล้ว** |
| **5 selection refs** | focusedSlot:327 · editingChord:426 · barMenuOpen:1885 · activeLine:880 · activeStanza:192 | ครบ (จาก selection-driven §3.1) |
| **collapse/grip** | `DockKey.vue` collapsed:61 · transition:157 · gripDown:186 | ย่อแถบ+ลากย้าย มีแล้ว |
| **setting panel + pin/reorder** | `DockKey.vue` :404 · togglePin:138 · movePin:141 · settingItems:44 | ⚙ + 📌 + ▲▼ มีแล้ว (settingItems = `default:'inSetting' || pinnable`) |
| **cap/breakpoint** | `DockKey.vue` cap:74 · mobile matchMedia('(max-width:760px)'):235 · `--touch-min` 44/42/40 :516/619/625 | **จุดเดียว 760 = ต้องแก้เป็น width-derived (§4)** · ⚠️ comment :616 เตือน: shrink `--touch-min` cascade ทุกปุ่ม → **width-cap ห้ามย่อ target · ต้อง reflow เพิ่มแถว** |
| **persist** | `pleng.dockkey.edit.{pins,collapsed,alpha}` :47-49 | localStorage per storeKey |

> **สรุป:** งานนี้ = **refine บน DockKey engine + editItems + contextual เดิม** · 5/7 มีเชื้อแล้ว · ที่เพิ่มจริง = hide-on-scroll · keyboard-aware · width-cap · a11y-SR · toolbox ครบ 5 scope

---

## 1 · `editItems` จริง (EditorMode.vue:1824) → เปลี่ยนอะไร (DATA-only · ไม่แตะ engine · ไม่กระทบพระคำ)

| id | kind | ปุ่ม | วันนี้ (place/default) | สเปกใหม่ (slim essential) |
|---|---|---|---|---|
| `keys` | keys | แป้นสัญลักษณ์ (band) | เต็มกว้างเหนือแถว | คงไว้ (จำเป็นตอนพิมพ์) · **ซ่อนตอน dock hidden** |
| `grip` | grip | ย้าย/ย่อ | row1 left | คง (permanent) |
| `undo`/`redo` | btn | ย้อน/ทำซ้ำ | row1 | **คงบนแถบ** (essential) |
| `play`/`stop` | btn | ฟังท่อน/หยุด | row1 | คง |
| `soundctl` | slot | เสียงดนตรี | row1 leftOf:setting | 🟡 **ย้ายเข้า ⚙** (`default:'inSetting',pinnable`) — ใช้นาน ๆ ครั้ง |
| `setting` | gear | ตั้งค่า | row1 right (permanent) | คง |
| `save` | btn prime | บันทึก/ส่งตรวจ/อนุมัติ (`name=saveName.value` · D2 full-truth · phase-1) | row2 col1 span2 | คง (prime · permanent) · **อย่าแตะ** (phase-1 เพิ่ง reword) |
| `playAll` | btn | ฟังทั้งเพลง | row2 col3 | 🟡 **ย้ายเข้า ⚙** (pinnable) |
| `export` | slot | ดาวน์โหลด | row2 col4 | 🟡 **ย้ายเข้า ⚙** (pinnable) |
| `draft` | btn | บันทึกร่าง | row2 col5 (permanent · issues9) | **คง** (พี่เปาใช้บ่อยสุด — ห้ามย้าย · comment :1840) |
| `preview` | toggle | ดูผลทั้งเพลง | `default:'inSetting',pinnable` ✅ | คง (อยู่ ⚙ แล้ว) |

**ผล:** default บนแถบเหลือ **essential** (keys·grip·undo·redo·play·soundctl→out·save·draft·setting) → footprint เล็กลงจริง · ที่ย้ายเข้า ⚙ ยังกดได้ + ปักกลับได้ (pin มีแล้ว) · **P'Aim/พี่เปาปรับเองได้** ผ่าน ⚙ ที่มีอยู่ · **นี่คือ "จัดปุ่ม" ที่ P'Aim อยากเห็น — ทำงานได้จริงอยู่แล้วใน DockKey `:138/404`**

---

## 2 · hide-on-scroll (ใหม่ · engine `DockKey.vue` · 2-host) — คืนพื้นที่ตอนอ่าน

- **พฤติกรรม:** scroll เนื้อลง → `.dk-host` เลื่อนหาย (`transform: translateY(100%)`) · scroll ขึ้น → กลับ · เหลือ handle จิ๋ว (peek) แตะกาง
- **map โค้ด:** เพิ่มใน DockKey — `@scroll`(window/ผู้ปกครอง) → set `autoHidden` ref → class บน `.dk-host` · ต่อยอด `collapsed` transition ที่มี · **prop ใหม่ `auto-hide` (default true เฉพาะหน้าที่ต้องการ)** เพื่อให้พระคำเลือกได้
- **debounce/threshold:** ซ่อนเมื่อ scroll ลง > ~24px (กัน jitter · Chrome เตือน reflow) · แสดงเมื่อ scroll ขึ้น
- **🔴 a11y (Material เตือน):** เปิด screen reader → **ปิด auto-hide** (fallback) — detect ไม่มี API ตรง → **prop/toggle `auto-hide` + respect `prefers-reduced-motion`** · ดู §6
- **scroll container:** editor = window scroll (dock fixed) → listen window · **ยืนยันกับ dev ตอน build** ว่า container ไหน (มี preview float ด้วย)
- **2-host:** พระคำ dock อ่านออกเสียงก็ scroll บทความ → ได้ประโยชน์ · **DoD test 2 host + rebuild `pk-dock-island.js`**

---

## 3 · keyboard-aware (ใหม่ · editor+engine) — พิมพ์ → dock ซ่อน · เครื่องมือเหนือแป้น

- **พฤติกรรม:** คีย์บอร์ดมือถือขึ้น → dock ซ่อน (โดนบังอยู่แล้ว) · เหลือ **contextual toolbox เกาะเหนือช่องที่พิมพ์** (`slot-tools` :2909 พิสูจน์แล้ว keyboard-safe)
- **map:** detect keyboard via **`visualViewport` resize** (height ลด > ~150px = แป้นขึ้น) → set state → dock `autoHidden` · **ยืนยัน cross-browser (iOS Safari/Android Chrome) ตอน build**
- `keys` band: ตอนพิมพ์ในช่อง band ยังโชว์ได้ (แป้นสัญลักษณ์) — สเปกให้ dock (แถวปุ่ม) ซ่อน · band+toolbox เหนือแป้นคงไว้

---

## 4 · reflow-cap: แก้ breakpoint จุดเดียว → width-derived (engine · SA flag)

- **วันนี้:** `mobile = matchMedia('(max-width:760px)')` :235 → `cap` 7/14 = binary · **Fold กาง 690–768 คร่อม 760 → dock กระโดด**
- **สเปก:** `cap = f(containerWidth)` ต่อเนื่อง (คำนวณจำนวนปุ่ม/แถวจากความกว้างจริง · ปุ่มคง `--touch-min` floor 44/42/40) — reflow แบบ width-driven · **ไม่กระโดดที่ 760**
- **map:** แทน `mobile` boolean ด้วยการวัด `hostEl` width (ResizeObserver มี pattern ใน dock-core) → cap ต่อเนื่อง · **SA วัด engine ที่ 344/690/768 + continuity**

---

## 5 · contextual toolbox ครบ 5 scope (EditorMode · ต่อยอด §10)

- **มีเชื้อแล้ว:** per-bar tools inline (:1779) + `slot-tools` (◀▶) บน `focusedSlot` :2909/3039 · 5 selection refs ครบ
- **สเปก:** ขยายเป็น toolbox เกาะ element ครบ (โน้ต/คอร์ด/ห้อง/บรรทัด/ท่อน) — **icon-only + aria-label + overflow ⋯ + `max-width: calc(100% - 12px)`** (รับประกัน fit Fold 344 · emoji glyph varies) · วางเหนือ element (scope พิมพ์) · flip/clamp (Apple HIG)
- **map:** ใช้ 5 refs เดิม + editItems `scope` (จาก selection-driven §3.3) · **ไฟล์ร้อน EditorMode — ชนกับ orientation D-series → PM sequence**

---

## 6 · a11y (WCAG · Material) — บังคับ

- **hide-on-scroll ปิดเมื่อ screen reader** (Material BottomAppBar เตือน hide ทำ AT หาแถบไม่เจอ) → **toggle "ปิด auto-hide" ใน ⚙ + respect `prefers-reduced-motion`** (proxy · ไม่มี AT-detect API ตรง — **คำถาม SA**)
- peek handle มี aria-label · dock ทุกปุ่ม `aria-label` (มีแล้ว) · contextual toolbox ปุ่ม icon-only ต้องมี aria-label
- safe-area: `.dk-host` + toolbox = `env(safe-area-inset-bottom)` (iOS home-indicator · Android) · `viewport-fit=cover` (B020 มีแล้ว)

---

## 7 · device-matrix (§5.5) — behavior ต่อจอ

| จอ | dock | toolbox |
|---|---|---|
| Fold พับ ~344 | slim + auto-hide + cap ปุ่มขึ้นแถว | icon-only fit (max-width clamp) |
| มือถือ 360–430 | 3 จังหวะ (scroll/keyboard/contextual) | เหนือ element |
| Fold กาง 690–768 · tablet | cap ต่อเนื่อง (ไม่กระโดด §4) · แถวเดียวเตี้ยลง | วางข้าง element ได้ (จอกว้าง) |
| desktop | hover peek (`@media hover:hover`) | เหนือ/ข้าง |
| **continuity** | พับ↔กาง/หมุน = cap re-compute + **คง pins/collapsed/alpha (localStorage) + เนื้อที่พิมพ์ + selection** ห้าม reset |

---

## 8 · เฟส (dev build บนโค้ดจริง 1 branch · tester gate · P'Aim ลองแอปจริงครบจบ)

| เฟส | ทำ (โค้ดจริง) | ไฟล์ | 2-host? |
|---|---|---|---|
| **A** | slim essential (`editItems` default) + hide-on-scroll + a11y toggle | `editItems`(EditorMode·data) + `DockKey`(engine) | 🔴 engine=2-host |
| **B** | contextual toolbox ครบ 5 scope (icon+overflow+clamp) | `EditorMode` (ร้อน · seq กับ orientation) | ไม่ |
| **C** | keyboard-aware (visualViewport) + width-cap (แทน 760) | `DockKey` engine | 🔴 2-host |
| **D** | device-matrix polish + continuity + safe-area | `DockKey` CSS | 🔴 2-host |

---

## 9 · คำถาม SA (feasibility คู่)

1. scroll container จริงของ editor (window vs wrapper) + debounce
2. `visualViewport` keyboard-detect reliable ข้าม iOS/Android ไหม
3. AT-detect (screen reader) — ไม่มี API → toggle+`prefers-reduced-motion` พอไหม
4. `cap = f(width)` (ResizeObserver) แทน matchMedia — กระทบ layout พระคำยังไง (2-host)
5. contextual toolbox: editItems `scope` filter กระทบ `onSylKey`/inline per-bar tools เดิมไหม

---

*DRAFT · UX/UI seat · 2026-07-18 · read-only prep (verify โค้ดจริง `DockKey.vue`/`EditorMode.vue`) · **⛔ ไม่แตะไฟล์/build จน PM เคาะ dev+sequence + P'Aim เคาะทิศ** · เมื่อเคาะ → UX pair dev เขียน+build บน branch เดียว*
