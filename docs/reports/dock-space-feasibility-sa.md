# SA feasibility — dock-space (ตอบ 5 คำถาม §9 + continuity · gate ก่อน dev build)

**คู่กับ:** `docs/ds/dock-space-spec.md` (uxui-standing) · **dev block รอคำตอบนี้ก่อนเขียน engine**
**verify โค้ดจริง:** `DockKey.vue` / `EditorMode.vue` / `App.vue` / `index.html` · 2026-07-18 · ⛔ docs only ไม่แตะ `src/`

---

## สรุป: ทำได้ครบ 5 ข้อ · 1 continuity risk ต้องจัด (`focusedSlot`) · 2 ข้อเป็น 🔴 2-host (rebuild พระคำ)

| # | คำตอบสั้น |
|---|---|
| Q1 scroll | **window** (ไม่มี wrapper) · preview=fixed แยก · hide-on-scroll = rAF + directional-delta ~8px (ไม่ใช่ time-debounce) |
| Q2 keyboard | **`visualViewport` reliable ทั้ง iOS/Android** ด้วย meta ปัจจุบัน · threshold drop **>150px** · fallback focusin · **ห้ามเติม `interactive-widget=resizes-content`** |
| Q3 AT | **ไม่มี API detect screen reader (by design)** → toggle ⚙ + `prefers-reduced-motion` + focus-guard = **มาตรฐานถูกแล้ว ไม่มีทางดีกว่า** |
| Q4 cap=f(width) | ทำได้ + **แก้ Fold-jump ที่ 760 พอดี** · `ro` slot ว่างอยู่ (ยังไม่ทำงาน) · ⚠️ observe **full-width ref ไม่ใช่ตัว dock** (feedback loop) · พระคำ low-risk แต่ 🔴 2-host |
| Q5 scope filter | **ปลอดภัย ไม่กระทบ** — per-bar tools + `onSylKey` แยกจาก `editItems` (คอมเมนต์ :1779 ยืนยัน) |
| continuity | ✅ collapsed/pins/alpha/เนื้อ/activeLine/Stanza รอด · 🔴 **`focusedSlot` ผูก DOM focus → fold/หมุน blur = selection หาย** ต้องจัด |

---

## Q1 · scroll container = **window** (ยืนยัน)

- `App.vue` root = `<main class="container">` + `<router-view/>` · **ไม่มี `overflow:auto/scroll` wrapper** รอบ editor (grep App/Studio = ว่าง)
- หลักฐานตรง: edhead เดิม `position:static` แล้ว *"scrolled away with the page"* (EditorMode :1934) → ทีมทำ sticky = **หน้าเลื่อนที่ window**
- **preview = `position:fixed`** (`floatEl`) แยกจาก page scroll (ไม่กวน)
- **→ hide-on-scroll listen `window` `scroll`**
- **debounce ที่แนะนำ (ฟันธง):** **ไม่ใช้ time-debounce** (หน่วง = รู้สึกหืด) · ใช้ **rAF-gate + directional delta**: เก็บ `lastY` · scroll-down Δ>~8px → hide · scroll-up → show ทันที · gate 1 ครั้ง/เฟรม · **guard: ไม่ hide ขณะ ⚙/popover เปิด หรือคีย์บอร์ดขึ้น** (ไม่งั้นแถบหายกลางแก้)

## Q2 · `visualViewport` keyboard-detect = **reliable ทั้ง 2 · ใช้ได้**

- **ยังไม่ใช้ที่ไหนเลย** วันนี้ · meta ปัจจุบัน = `width=device-width, initial-scale=1, viewport-fit=cover` (**ไม่มี `interactive-widget`**)
- **iOS Safari 13+:** `visualViewport.height` หดเมื่อคีย์บอร์ดขึ้น = เชื่อถือได้ · **Android Chrome (default `resizes-visual`):** height หดเช่นกัน → **`visualViewport` + event `resize` ใช้ได้ทั้งคู่**
- **threshold ฟันธง:** height ลด **>150px = คีย์บอร์ด** — เพราะ URL-bar collapse ลดแค่ ~60–100px · คีย์บอร์ด ~260–330px → 150px แยกสองอย่างนี้สะอาด (อย่าใช้ค่าต่ำกว่า จะ trigger ตอน URL bar ยุบ)
- **⛔ อย่าเติม `interactive-widget=resizes-content`** ใน meta — จะเลื่อน layout viewport แทน visual → `visualViewport.height` ไม่หด = พังการ detect · **คง meta เดิม**
- **fallback (เบราว์เซอร์เก่าไม่มี visualViewport):** `focusin` บน `input`/`textarea` = คีย์บอร์ดขึ้น · `focusout` = ลง (พอสำหรับ editor ที่พิมพ์ในช่อง)

## Q3 · AT-detect = **ไม่มี API · proxy ที่เสนอถูกแล้ว (world-class)**

- **ไม่มีทาง detect screen reader จาก web เลย (เจตนา privacy)** — ไม่มี API ไหนดีกว่า · อย่าพยายาม sniff (heuristic ผิดพลาด = กันคนใช้จริง)
- **มาตรฐานที่ถูก (ฟันธง · Material BottomAppBar):** (1) **toggle "ปิด auto-hide" ใน ⚙** (persist localStorage) (2) **respect `prefers-reduced-motion`** → auto-ปิดการซ่อน/ลดอนิเมชัน (3) **เพิ่ม focus-guard:** ห้าม auto-hide ขณะ focus อยู่ใน dock/toolbox (คน keyboard-nav) + **peek handle เอื้อมถึงเสมอ** (AT หาแถบกลับได้)
- **→ toggle + reduced-motion + focus-guard = ครบมาตรฐาน ไม่มี detect ที่ดีกว่านี้** (ยืนยันให้ UX สบายใจ)

## Q4 · `cap = f(width)` (ResizeObserver) แทน `matchMedia(760)` — ทำได้ + **แก้ Fold-jump**

- วันนี้ `cap = mobile ? 7 : 14` · `mobile = matchMedia('(max-width:760px)')` (binary) → **Fold กาง 690–768 คร่อม 760 → cap กระโดด 7↔14** (root ของ §4)
- **`ro` slot มีอยู่แล้วแต่ว่าง:** `let ro = null` + `ro?.disconnect()` — **ไม่เคย `new ResizeObserver`** (ไม่มี RO ทำงานตอนนี้) → wire ตัวใหม่เข้า slot นี้ได้เลย
- **cap = clamp(floor(availWidth / perButtonBudget≈48–52px), min 3, max 14)** → ต่อเนื่อง ไม่กระโดด
- **⚠️ ข้อควรระวังสำคัญ (บอก dev):** ResizeObserver ต้อง observe **full-width reference** (parent ของ `.dk-host` / `documentElement` / ใช้ `visualViewport.width`) — **ไม่ใช่ `.dk-host` เอง** เพราะ dock เป็น `fixed`/auto-width → observe ตัวเอง = feedback loop (cap→ปุ่ม→width→cap)
- **กระทบพระคำ (2-host):** island มี ~4–5 ปุ่ม → cap แทบไม่เคย bind → **low-risk** · แต่ observe viewport-width ทำงานเหมือนกันทั้ง 2 host · **🔴 engine change → rebuild `pk-dock-island.js` + standards gate พระคำ ที่ 344/690/768** (2-host DoD ทุกครั้ง)

## Q5 · contextual toolbox `scope` filter — **ปลอดภัย ไม่กระทบ `onSylKey`/per-bar tools**

- **โค้ดยืนยันตรง ๆ (EditorMode :1779 คอมเมนต์):** *"The structural per-bar tools stay INLINE in the table (contextual — not dock commands)"* → per-bar tools = template inline · **ไม่ได้อยู่ใน `editItems`**
- `editItems` (:1824) feed **DockKey อย่างเดียว** (`<DockKey :items="editItems">` :3094) · `onSylKey` (:374) = keydown บน **ช่องพยางค์** (:2922/:3050) — **คนละกลไก**
- **→ เติม `scope` ใน editItems + กรอง DOCK ตาม selection = ไม่แตะ onSylKey / slot-tools / per-bar เลย** ✅
- **⚠️ กันสับสน spec (บอก dev):** มี **2 กลไกแยกกัน** — (ก) `scope` บน `editItems` = ซ่อน/โชว์ **ปุ่ม DOCK** ตาม scope ที่เลือก · (ข) contextual toolbox เกาะ element = ต่อยอด **inline tools** (`slot-tools`/per-bar ที่ contextual อยู่แล้ว) · **อย่ารวมสองอันเป็นก้อนเดียว** — คนละที่ คนละ lifecycle · ทั้งคู่ไม่แตะ onSylKey

## Continuity · fold/หมุน = resize → cap rebuild — อะไรรอด อะไรเสี่ยง reset

| state | รอดไหม | เพราะ |
|---|---|---|
| `collapsed` · `pins` · `alpha` | ✅ รอด | localStorage-backed (`pleng.dockkey.<storeKey>.*`) โหลดตอน mount · resize ไม่ reset |
| เนื้อที่พิมพ์ (`stanzas`/`arrangement`) | ✅ รอด | reactive state · ไม่ผูก viewport |
| `activeLine`/`activeStanza`/`editingChord` | ✅ รอด | plain ref · resize ไม่แตะ |
| dock `pos` (ตำแหน่งลาก) | ✅ รอด (อาจขยับ) | `clampDock` re-clamp ให้อยู่ในจอ (คงตำแหน่ง · แค่กันหลุดขอบ) |
| **`focusedSlot` (selection ของ toolbox)** | 🔴 **เสี่ยงหาย** | ผูก DOM focus: `@focus=set` / `@blur=-1` (:2920/2921) → **fold/หมุน/คีย์บอร์ดปิด ทำ input blur → `focusedSlot=-1` → toolbox ของ slot นั้นหาย** |

- **ไม่มี `v-if="mobile/narrow"` ที่ unmount subtree** (grep template = ว่าง) → ไม่มี state หายจากการ remount (นอกจาก focus)
- **🔴 ต้องจัด (บอก dev):** เก็บ "slot ที่เลือก" ใน **ref ที่คงอยู่อิสระจาก blur** (แยกจาก DOM focus) หรือ **restore focus หลัง resize settle** (debounced) → selection คงข้ามพับ/หมุน ตามสเปก §7 continuity
- อื่น ๆ รอดหมด → continuity **ทำได้** แก้จุดเดียว (`focusedSlot`)

---

## สิ่งที่ dev ต้องรู้ก่อนเขียน (สรุป actionable)
1. hide-on-scroll → `window` · rAF+delta ไม่ใช่ debounce · guard popover/keyboard
2. keyboard → `visualViewport` resize · drop>150px · fallback focusin · **อย่าแตะ meta**
3. AT → ⚙ toggle + reduced-motion + focus-guard (ไม่มี detect)
4. cap=f(width) → observe **full-width ref ไม่ใช่ dock** · clamp · 🔴 rebuild+test พระคำ 344/690/768
5. scope → editItems (dock) กับ inline toolbox = **2 lane แยก** · ไม่แตะ onSylKey
6. continuity → แก้ `focusedSlot` ให้ persist อิสระจาก blur (จุดเดียว)

**ลำดับ (SA เห็นด้วยกับ §8):** A(slim+hide+a11y·engine) → B(toolbox·EditorMode ร้อน·seq orientation) → C(keyboard+width-cap·engine) → D(continuity+safe-area) · **ทุกเฟสแตะ engine = rebuild+gate พระคำ** · EditorMode = คิวกับ orientation D-series (1 ไฟล์ 1 สาย)

---

*verify โค้ดจริง 2026-07-18 · SA · ฐาน `studio-shell-redesign` (merged base HEAD)*
