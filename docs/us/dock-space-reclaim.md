# US/UX — คืนพื้นที่หน้าจอ: "dock หลบเอง" ไม่ใช่ "ให้คนย่อ dock"

**ประเภท:** UX flow + design (นำ · design lead) · **⛔ ยังไม่ build — รอ P'Aim GATE 1** · SA ตรวจ feasibility คู่
**reframe:** P'Aim 18 ก.ค. — *"รากเง้าคือมันกินพื้นที่ ทำให้ใช้งานยาก"* (resize free-form = แก้ปลายเหตุ) · **PM expert POV → UX ต่อยอด+ฟันธง**
**ต่อยอด (ไม่รื้อ):** `docs/us/selection-driven-editor.md §10` (contextual toolbox ที่ผม banked · **กลับมามีบ้าน**) · `docs/us/dockkey-config.md` (resize/settings เดิม) · engine `DockKey.vue` (collapse/grip/pin มีแล้ว)
**ยึด:** `docs/ux-platform-patterns.md` (SOP) · `docs/ui-standards.md` · WCAG 2.2 AA · Apple HIG · Material 3
**สรุป ม.ต้น:** `docs/pm/summary-dock-space-paim.md`

> **root ที่ P'Aim ชี้:** dock ถาวร (2 แถว + แป้นโน้ต) กิน ~1/3 จอมือถือ **แย่งพื้นที่กับเนื้อเพลงที่พี่เปากำลังแก้** → ย่อ dock เอง = ยังกินที่ + ต้องมานั่งย่อ

---

## 0 · ข้อเสนอ (ฟันธง 1 ทาง · P'Aim ให้ root มาแล้ว ไม่ต้องถามต่อ)

**หลักเดียว (จากการเปิดมาตรฐานจริง):** **โลกไม่ทำแถบให้ "เล็กลง" — ทำให้ "มีเงื่อนไข" (conditional not smaller)** · แถบโผล่เฉพาะตอนต้องใช้ · ไม่งั้นหลบให้เนื้อหา

> **✅ ข้อเสนอ: "conditional dock" — แถบต้องหาพื้นที่คืนด้วยการหลบเอง 3 จังหวะ + เครื่องมือไปหา element**

| # | พฤติกรรม | trigger | คืนแถบ | อ้างมาตรฐาน (เปิดจริง) |
|---|---|---|---|---|
| 1 | **ซ่อนตอนอ่าน/scroll** — เลื่อนดูเพลง → dock เลื่อนหาย | scroll ลง | scroll ขึ้น / แตะ | Apple HIG (Safari ซ่อน toolbar ตอน scroll · "defer to content") · Material bottom bar `hideOnScroll` · browser chrome |
| 2 | **ซ่อนตอนพิมพ์ → เครื่องมือเกาะเหนือแป้น** — คีย์บอร์ดขึ้น dock ซ่อน (โดนบังอยู่แล้ว) | keyboard ขึ้น | keyboard ปิด | iOS `inputAccessoryView` · Google Docs (toolbar เหนือแป้น) |
| 3 ⭐ | **เครื่องมือไปหา element ที่แตะ (contextual toolbox §10)** — แตะโน้ต/ห้อง/บรรทัด → toolbox โผล่ตรงนั้น | แตะ element | เลิกเลือก | Material floating selection toolbar (เกาะ selection ไม่ทับ) · CAB · §10 (Canva/Apple) |
| + | **default = แถบบางเฉพาะ essential** (play·undo·save·⚙) ที่เหลือใน ⚙ overflow | — | — | SOP §3 (ลดจำนวน ไม่ย่อ target) · Material CAB/overflow |
| + | resize (แบบ 2) + โปร่งใส = **เสริม** ถ้ายังต้องการ | — | — | dockkey-config §3.2 |

**ทำไมดีกว่า free-form resize:** resize = ผู้ใช้ต้องมานั่งจัดการเอง + ย่อแล้ว**ยังกินที่ตลอดเวลา** · conditional = **พื้นที่คืนอัตโนมัติเมื่อไม่ได้ใช้ + เครื่องมือมาหาที่งาน** → พี่เปาได้จอเต็มไว้อ่าน/แก้เพลง

### ⭐ ฟันธง: resize (v4 แบบ 2) อยู่ในคำตอบไหม? (PM ถามตรง)
> **resize ไม่ใช่ตัวแก้ root — auto-collapse + contextual toolbox แก้ root ได้เอง จน "ย่อ dock เอง" แทบไม่จำเป็น.** แต่ **กลไก reflow (แบบ 2) ที่ PM verify แล้วว่าใช้ได้จริง = ตัวเดียวกับที่ทำ responsive ข้ามอุปกรณ์** (§5.5) → **เก็บ reflow ไว้เป็น "เครื่องยนต์ responsive" (อัตโนมัติต่อจอ) + ให้ผู้ใช้ nudge เองได้เป็น personalization (desktop ลากขอบ · mobile สไลเดอร์กว้าง) — ไม่ใช่ภาระที่ต้องทำเพื่อคืนพื้นที่.**
>
> **สรุปการรวม (ไม่ให้รก):** ชั้นที่ *แก้ root* = **auto-hide + slim + contextual** (ทำงานเอง ผู้ใช้ไม่ต้องแตะ) · ชั้น *personalization* = reflow width + โปร่งใส (ซ่อนใน ⚙ · ใครอยากปรับค่อยเข้าไป) → **default สะอาดสุด ไม่มีอะไรให้ตั้งค่าก็ใช้ดี**

### 📱 ครอบทุกอุปกรณ์ (apply `ux-platform-patterns §5.5` · binding)
โมเดล conditional+reflow เป็น **fluid** อยู่แล้ว → ทดสอบต่ออุปกรณ์:

| คลาส | dock ทำตัวยังไง |
|---|---|
| **Fold พับ ~344** (ตึงสุด — "กินพื้นที่" หนักสุด) | auto-hide + slim + contextual **ต้องเอาอยู่** · reflow → ปุ่มขึ้นหลายแถว/ซ่อนใน ⚙ · toolbox เกาะเหนือ element |
| **มือถือ ~360–430** | ตามหลัก 3 จังหวะ |
| **Fold กาง ~690–768 · tablet** (เกือบสี่เหลี่ยม · **ไม่ใช่มือถือยืด**) | ใช้ความกว้าง: **dock reflow เป็นแถวเดียว** (เตี้ยลง) · **contextual toolbox วางข้าง element ได้** (ไม่ต้องเหนืออย่างเดียว) · portrait+landscape |
| **desktop ≥1280** | hover peek เต็ม (`@media hover:hover`) · dock กว้าง แถวเดียว |
| **⭐ continuity** | พับ↔กาง / หมุนจอ = **reflow + คง state** (เนื้อที่พิมพ์ค้าง · dock position · element ที่เลือก) **ห้าม reset** — reflow แบบ 2 เข้าทางนี้พอดี (width เปลี่ยน ปุ่ม repack ไม่ล้างค่า) |
| safe-area · touch+pointer | `env(safe-area-inset-*)` (dock ล่าง/toolbox ไม่โดน notch/home-indicator บัง) · Fold/tablet มีทั้งนิ้ว+เมาส์ → hover เป็น enhancement เท่านั้น |

> **📌 DS note 1 (PM GATE0 · toolbox ต้อง fit จอแคบสุด):** contextual toolbox **ห้ามล้มจอ 344 (Fold พับ)** — ป้ายข้อความยาว nowrap = ~537px ล้น · **ฟันธง: icon-only + aria-label + overflow ⋯** (Material floating selection: primary icons + More) → **แก้แล้ว `3ca279d` (537→~338px · PM ยอมรับ hairline 2px @344)** · ผูก §10 + `§5.5`
> — **build guarantee (จาก PM วัด 338 · ผมวัด 291 ต่างกัน):** ความกว้าง toolbox **แปรตาม emoji glyph** (🗑 กว้างไม่เท่ากันข้าม OS/font) → **อย่าพึ่งการนับ px · ต้อง `max-width: calc(100% - 12px)` + ปุ่มเกินเข้า ⋯** = รับประกัน 0 overflow ทุก font/จอ (ไม่ใช่แค่ 344 ที่ทดสอบ)
> **📌 DS note 2 (SA flag · breakpoint จุดเดียวทำ dock กระโดด):** engine ใช้ `matchMedia('(max-width:760px)')` เส้นเดียว → cap 7/14 · **Fold กาง ~690–768 คร่อม 760 → dock กระโดดกลางช่วง** · **ฟันธง: cap ต้อง derive จาก *ความกว้างจริง* แบบต่อเนื่อง ไม่ใช่ binary 760** — **= reflow แบบ 2 อยู่แล้ว** (width-driven · ปุ่ม repack ต่อเนื่องไม่กระโดด) → DS ให้ cap = f(container width) · SA วัด engine ที่ 344/690/768 + continuity

---

## 1 · thesis จากมาตรฐาน — "conditional not smaller" (เปิดของจริง)

- **Apple HIG (defer to content):** UI ต้องหลบให้เนื้อหาเป็นพระเอก · toolbar *"ซ่อนเมื่อผู้ใช้ไม่น่าต้องใช้ — เช่น Safari ซ่อน toolbar ตอน scroll เพราะกำลังอ่าน"* ([HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) · SPA — เก็บจาก extract, ยืนยัน exact quote ตอน build)
- **Mobile browser chrome:** address/toolbar เลื่อนหายตอน scroll ลง กลับมาตอน scroll ขึ้น = คืนพื้นที่อ่าน ([Chrome blog](https://developer.chrome.com/blog/url-bar-resizing))
- **Material bottom app bar `hideOnScroll`:** ซ่อนตอน scroll ลง โผล่ตอน scroll ขึ้น ([BottomAppBar doc](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomAppBar.md))
- **Material floating selection toolbar:** เครื่องมือโผล่ *"เหนือ selection แต่ไม่ทับ"* · More → ขยาย ([m1 selection](https://m1.material.io/patterns/selection.html))
- **iOS inputAccessoryView / Google Docs:** เครื่องมือแก้ไขเกาะ**เหนือแป้นพิมพ์** เลื่อนตามแป้น ([Docs Android](https://support.google.com/docs/answer/1663349))

> **🔴 a11y บังคับ (Material เตือน):** hide-on-scroll **auto-disable เมื่อเปิด screen reader (TalkBack)** — ไม่งั้นแถบหายจาก AT · **ต้องมี fallback: เปิด screen reader → dock ไม่ auto-hide** ([BottomAppBar doc](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomAppBar.md))

---

## 2 · ต่อยอดของเดิม (ยึด `ux-platform-patterns §4` · SA ตรวจ)

| พฤติกรรม | ของเดิมรองรับ | ต้องเติม |
|---|---|---|
| ซ่อน/กางแถบ | ✅ `collapse-in-place` + grip (`DockKey.vue:151/184`) | trigger จาก scroll (ตอนนี้แตะ grip เอง) |
| overflow/pin essential | ✅ pin 📌 + settingItems (`:139/:44`) | เลือก essential set + default |
| contextual toolbox | 🟡 §10 (design เสร็จ · banked) + `focusedSlot`/`slot-tools` เกาะ element แล้ว | ขยายครบ 5 scope |
| keyboard-aware | 🟡 `slot-tools` เกาะเหนือช่องพิสูจน์แล้ว keyboard-safe | ให้ dock ซ่อนตอน keyboard ขึ้น |
| a11y fallback | — | detect screen reader → ไม่ auto-hide |

→ **refine หนัก ไม่ใช่ rebuild** — 4/5 มีเชื้ออยู่แล้ว · งานคือ**ประสาน** (scroll/keyboard state → collapse engine + §10)

---

## 3 · เฟส (มีของถึงมือพี่เปาทุกเฟส)

| เฟส | ทำ | พี่เปาได้ | บล็อก |
|---|---|---|---|
| **A ⭐ (คุ้มสุด root)** | **hide-on-scroll** + slim essential default + a11y fallback | อ่าน/เลื่อนเพลง = จอเต็ม dock หลบเอง | 🚩 `DockKey.vue` engine (2-host) |
| **B** | **contextual toolbox §10** (โน้ต+ห้องก่อน) | เครื่องมือมาหา element = ไม่ต้องพึ่งแถบใหญ่ | 🚩 `EditorMode.vue` (ไฟล์ร้อน) |
| **C** | **keyboard-aware** (พิมพ์→dock ซ่อน · toolbox เหนือแป้น) + toolbox ครบ 5 scope | แก้บนมือถือลื่น ไม่โดนแป้นบัง | ต่อ B |
| **D** | resize แบบ 2 + โปร่งใส = เสริม (ถ้า P'Aim ยังอยาก) | ปรับเพิ่มเองได้ | — |

**ทำไมเรียงงี้:** เฟส A แก้ root ตรงสุดด้วยของที่มีเกือบครบ (collapse engine) · เฟส B-C คือ §10 ที่ banked ไว้ = ต่อได้เลย

---

## 4 · 🚦 1-ไฟล์-1-สาย (ใหญ่กว่า dock-config — แตะ editor space)

| ไฟล์ | แตะอะไร | ชนใคร |
|---|---|---|
| **`DockKey.vue`** (engine · แชร์ 2 เว็บ) | hide-on-scroll · slim default · keyboard state | **2-host DoD** · shared |
| **`EditorMode.vue`** (ไฟล์ร้อน) | contextual toolbox §10 · scroll/keyboard hook | orientation D-series · editor งานเก่า |
| `Studio.vue`/`ShellBar.vue` | — (dock/editor ชั้นล่าง) | ✅ ไม่ควรชน orientation 2a / B108 bell ถ้าคุมชั้น |

→ **แตะ 2 ไฟล์ร้อน** · design ได้เลย · **build เข้าคิวหนัก** PM sequence กับ orientation 2a + B108 + toolbox

---

## 5 · feasibility → SA (ผ่าน PM)

1. **scroll hook:** ผูก scroll direction ของพื้นที่เพลง → collapse engine เดิมได้ไหม · debounce กัน jitter (Chrome เตือน reflow) · scope element ไหน scroll
2. **keyboard detect:** จับ keyboard ขึ้น/ลง บนมือถือ (visualViewport API?) ให้ dock ซ่อน + toolbox เกาะเหนือช่อง — reliable ข้าม browser ไหม
3. **screen-reader detect → ไม่ auto-hide:** ตรวจ AT ได้แค่ไหน (ไม่มี API ตรง) · fallback = respect `prefers-reduced-motion`? หรือ toggle ในตั้งค่า
4. **contextual toolbox §10:** (คำถามเดิมใน §10.4/feasibility) anchor/clamp ต่อ element · scope conditional กระทบ `onSylKey`
5. **shared 2 host:** hide-on-scroll ใน engine กระทบ dock อ่านออกเสียงพระคำยังไง (พระคำก็ scroll อ่านบทความ — อาจได้ประโยชน์ด้วย) · 2-host DoD

---

## 6 · 🖼️ Mockup (จิ้มได้ · desktop + มือถือ)

- **เปิดเลย:** [📱 mockup คืนพื้นที่ — scroll ซ่อน dock · แตะ element โผล่ toolbox · พิมพ์ dock หลบ](https://claude.ai/code/artifact/1483051e-a506-4384-8d97-64a1d42c3d2c)
- ไฟล์รีโป: `docs/ds/dock-space-mockup.html`
- **แสดง:** เลื่อนเพลง → dock เลื่อนหาย (จอคืนพื้นที่) · แตะโน้ต/บรรทัด → toolbox โผล่ที่ตรงนั้น · กด "พิมพ์" → แป้นขึ้น dock ซ่อน toolbox เกาะเหนือช่อง · toggle "screen reader" → dock ไม่ auto-hide (a11y)

---

*UX/UI seat · 2026-07-18 · docs-only · ⛔ ไม่แตะ `src/` · อ้างอิงเปิดจริง: [Apple HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) · [Chrome URL-bar resizing](https://developer.chrome.com/blog/url-bar-resizing) · [Material BottomAppBar](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomAppBar.md) · [Material selection toolbar](https://m1.material.io/patterns/selection.html) · [Google Docs Android](https://support.google.com/docs/answer/1663349) · [iOS inputAccessoryView](https://www.hackingwithswift.com/example-code/uikit/how-to-add-a-toolbar-above-the-keyboard-using-inputaccessoryview)*
