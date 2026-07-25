# US/UX — DockKey ปรับแต่งได้ (เลือกปุ่ม · ย่อขนาด · ชื่ออ้างอิง)

**ประเภท:** UX flow + design (นำ) · **⛔ ยังไม่ build — รอ P'Aim เคาะ GATE 1** · SA ตรวจ feasibility + core lib คู่
**brief:** `docs/pm/brief-dockkey-config.md` · **ต่อยอด (ไม่รื้อ):** `docs/ds/dockkey-library.md` (core engine + schema) · `dockkey-print-edit.md` · `menu-drawer-spec.md`
**ยึด:** `docs/ui-standards.md` · SOP §1.3 (world-class · เชิงรุก+ฟันธง · พาไปตัดสินใจ · มองข้าม 2 เว็บ) · WCAG 2.2 AA · Apple HIG · Material 3 · VS Code/Photoshop customize (เปิดของจริง)
**สรุป ม.ต้น:** `docs/pm/summary-dockkey-paim.md`

> **หลักเดียว:** พี่เปาไม่ได้ขอ dock ใหม่ — ขอ **คุมของเดิมได้** (เลือกปุ่ม · ย่อ · ตั้งเอง) + **เรียกชื่อ component ได้** (แก้ pain การสื่อสาร). schema เดิม (`id`+`name`+`default`+`pinnable`) รองรับ 80% แล้ว → งานนี้ **refine + เติมชั้น config/naming** ไม่ใช่ redesign.

---

## 0 · สรุปการตัดสินใจ (อ่าน 30 วิ · ฟันธงทุกข้อ ไม่โยนเมนูให้ P'Aim)

| # | พี่เปาขอ | ฟันธง UX | อ้างมาตรฐาน (เปิดจริง) |
|---|---|---|---|
| 1 | เลือกปุ่มที่แสดง | ✅ **หน้าตั้งค่าแบบ 2 คอลัมน์: "บนแถบ ↔ ในตั้งค่า"** + ปุ่ม **คืนค่าเริ่มต้น** · ซ่อน = ย้ายเข้าตั้งค่า (ยังกดใช้ได้ ไม่หาย) | Photoshop *Edit Toolbar* (2 คอลัมน์ + Restore Defaults) · VS Code (hide→overflow ไม่ลบ + Reset Menu) |
| 2 | resize (ใหญ่ไป) | ✅ **"ขนาดแถบ" 3 ระดับใน settings: กะทัดรัด / สบาย / ใหญ่** · **default = กะทัดรัด (ปุ่ม 44px, ลดจาก 50px วันนี้)** · **ไม่ใช่ลากขอบย่อบนมือถือ** | Apple Dynamic Type (ขนาด = ตั้งค่า UI ปรับตาม) · MD3 density = user option (มีเพดานต่ำ) |
| 3 | จัดตำแหน่งปุ่ม + window | ✅ **ใช้ระบบเดิม: ปัก 📌 + ▲▼ จัดลำดับ** (ไม่ใช่วางอิสระ x/y — พังบนมือถือ + แตก invariant row1) · window/ตำแหน่ง dock = **ลาก grip** (มีแล้ว) | ui-standards §2 (invariant) · Fitts (grip ลากทั้งแถบ) |
| 4 | ทุกปุ่มตั้งใน settings | ✅ **มี design แล้ว** (⚙ = ทุก item `inSetting`/`pinnable`) — งานนี้ทำให้มัน **ครบ+ชัด** เป็นศูนย์คุม | dockkey-library §4 (I4) |
| 5 ⭐ | toggle ชื่อปุ่ม + ชื่ออ้างอิง | ✅ **สวิตช์ "แสดงชื่อปุ่ม" 1 ตัว** (เปิด=ไอคอน+ชื่อไทย) + **ทุกปุ่มมี "ชื่ออ้างอิง" 1 เดียว = ป้ายที่เห็น = accessible-name = tooltip = ชื่อที่ทั้งทีมใช้** + **id คงที่แยกไว้ (code/test)** | WCAG **2.5.3 Label in Name** · **4.1.2** · ARIA APG · VS Code (id↔title แยกชั้น) |

**ข้อเสนอเดียว:** ทำ **"หน้าตั้งค่า DockKey = ศูนย์คุมเดียว"** (เลือกปุ่ม · ขนาด · ชื่อ) บน core engine เดิม + **ระบบชื่ออ้างอิง (id + ชื่อไทย)** ที่เป็นทั้ง a11y + test-hook + ภาษากลางของทีม → **แก้ pain การสื่อสารของพี่เปาถาวร ไม่ใช่แค่ feature**

---

## 1 · โจทย์จริง (พี่เปา + P'Aim) — reframe

พี่เปา 4 + P'Aim 1. แต่ **ข้อ 5 คือหัวใจ** — ไม่ใช่ความสวย แต่เป็น **โครงสร้างการสื่อสารทั้งทีม**:

> P'Aim: *"เวลาพี่เปาบอกอยากแก้ตรงโน้นตรงนี้ สื่อสารยากมาก ต้อง capture screen ให้ · ถ้าทุก component มีชื่ออ้างอิงชัด คุยกันง่าย"*

**แปลเป็นภาษา design:** ทุก component ต้องมี **"ชื่อที่มนุษย์เรียกได้"** ที่ **คงที่และเห็นได้** → พี่เปาพูดชื่อ → PM/dev รู้ทันทีว่าปุ่มไหน → ไม่ต้องส่งรูป. และชื่อเดียวกันนี้ **เป็น accessible-name (a11y) + test-id anchor (QA) ในตัว** = world-class 4-in-1 โดยไม่ต้องทำ 4 งาน.

**ข่าวดี — โครงมีอยู่แล้ว 80%** (`DockKey.vue` วันนี้): ทุกปุ่มมี `:data-cell="it.id"` (id คงที่ = test anchor แล้ว) + `:aria-label="it.name"` + `:title="it.name"` (ชื่อไทย = accessible-name + tooltip แล้ว). **ที่ขาด = (ก) สวิตช์โชว์ชื่อบนปุ่ม (ข) ตารางอ้างอิงกลางให้ทีม (ค) หน้าคุมเลือกปุ่ม/ขนาดที่ครบ.**

---

## 2 · เทียบ pattern โลกจริง (เปิดของจริง · อ้างเป็นข้อ)

| เรื่อง | ของจริง (เปิดแล้ว) | เอาอะไรมา |
|---|---|---|
| **เลือกปุ่มโชว์** | **Photoshop *Edit Toolbar*** — dialog 2 คอลัมน์ *Toolbar*(โชว์) ↔ *Extra Tools*(ซ่อน) · ลากข้ามคอลัมน์ · **Restore Defaults / Save Preset** | โมเดล 2 คอลัมน์ "บนแถบ ↔ ในตั้งค่า" + คืนค่าเริ่มต้น |
| **ซ่อน ≠ ลบ** | **VS Code** — hide action → เข้า `...` More Actions (ยังเรียกได้) · **Reset Menu / Reset All Menus** | ซ่อนปุ่ม = ย้ายเข้า ⚙ (ยังกดใช้ได้) ไม่ใช่หายไป |
| **id คงที่ vs ชื่อคน** | **VS Code** — `command`(id คงที่ เช่น `git.stage`) แยกจาก `title`(ป้ายคน) · id ไม่เปลี่ยนแม้ย้าย/เปลี่ยนป้าย | **id (ascii) แยกจาก ชื่อไทย** — ชื่อเปลี่ยน/แปลได้ id นิ่งเพื่อ code+test |
| **ขนาด = ตั้งค่า ไม่ใช่ลาก** | **Apple Dynamic Type** — ผู้ใช้เลือกขนาด UI ปรับตาม (Apple ยังรับ in-app size control เป็นทางเลือกที่ถูกต้อง) · **MD3 density = user option** *"provide density options… choose a higher density"* แต่ห้ามต่ำกว่าเพดาน target | resize บนมือถือ = **preset ในตั้งค่า** ไม่ใช่ลากขอบ |
| **ชื่อเดียว = ป้าย = a11y** | **WCAG 2.5.3 Label in Name** *"the name contains the text that is presented visually"* · **APG** *"using the visible text for the accessible name simplifies maintenance, prevents bugs"* | ป้ายที่เห็น = accessible-name = ชื่อเดียวกันเป๊ะ (best practice) |

> **⚠️ กับดักมาตรฐาน (ต้องออกแบบเลี่ยง):** ห้ามเอา **id ภาษาอังกฤษ** ไปเป็น `aria-label` ในจอไทย — จะผิด **2.5.3** (accessible-name ต้องมี "ข้อความที่เห็น" ซึ่งเป็นไทย). → **id คงที่ = key แยก (code/test เท่านั้น)** · **ชื่อไทย = ป้ายที่เห็น + aria-label + tooltip.** ตาราง §4 จับคู่ id↔ชื่อไทยให้ครบ.

---

## 3 · 5 การออกแบบ (ทุกข้อ desktop + มือถือ)

### 3.1 เลือกปุ่มที่แสดง — หน้าตั้งค่าแบบ 2 คอลัมน์ + คืนค่า

หน้า ⚙ ตั้งค่า มี 2 กลุ่มชัด (โมเดล Photoshop):
- **📌 บนแถบ** — ปุ่มที่โชว์บน dock ตอนนี้ (แต่ละแถว: ไอคอน · ชื่อไทย · ▲▼ จัดลำดับ · ปุ่มถอน "→ ย้ายเข้าตั้งค่า")
- **⚙ ในตั้งค่า (ซ่อนจากแถบ)** — ปุ่มที่ยังกดใช้ได้ในหน้านี้ แต่ไม่กินที่บนแถบ (ปุ่ม "📌 ปักขึ้นแถบ")
- **↺ คืนค่าเริ่มต้น** — 1 ปุ่ม รีเซ็ตทั้งชุด (VS Code Reset · Photoshop Restore Defaults)

**ทำไมไม่ใช่ drag-drop ข้ามคอลัมน์บนมือถือ:** ลากของข้ามกล่องบน touch = fiddly (ต้องกดค้าง+เล็ง). → ใช้ **ปุ่มกด "ปัก/ถอน" + ▲▼** (แตะเดียว ชัวร์ · ปุ่ม 44px). desktop เพิ่ม drag ได้เป็น sugar แต่ปุ่มกดเป็นทางหลักทั้ง 2.

### 3.2 ขนาดแถบ (resize) — preset ในตั้งค่า · **ไม่ใช่ลากขอบ**

> **ฟันธง:** resize บนมือถือ = **เลือกขนาด 3 ระดับในตั้งค่า** ไม่ใช่ลากมุมย่อ. เพราะ Apple Dynamic Type + MD3 density ทำ "ขนาด = ตั้งค่า" ไม่ใช่ drag บน touch (drag-resize เป็นสำนวนเมาส์ เดสก์ท็อป — VS Code เองก็ไม่มี toolbar resize).

| ระดับ | ปุ่ม | gap/padding | เมื่อไหร่ |
|---|---|---|---|
| **กะทัดรัด** ⭐default | **44px** | แน่น (gap 4 · pad 6) | พี่เปาว่า 50px ใหญ่ไป → เริ่มที่นี่ |
| **สบาย** | 48px | กลาง | นิ้วใหญ่/อยากชัด (= เพดาน MD3) |
| **ใหญ่** | 56px | โปร่ง | จอใหญ่/การมองเห็น |

- **default ลดจาก 50px → 44px** = เล็กลงเห็นได้ทันที **แต่ยังผ่าน Apple HIG 44pt + project target 44px + WCAG 2.5.8 (ขั้นต่ำ 24px)**. *(หมายเหตุตรง: MD3 แนะ 48dp — เราเลือก 44 ตาม Apple + มาตรฐานโปรเจกต์ + คำขอผู้ใช้ "ใหญ่ไป" · ทุก preset ≥ 44px ไม่ต่ำกว่านั้น)*
- ขนาดคุมทั้งชุด (ปุ่ม+gap+padding) → footprint เล็กลงจริง ไม่ใช่แค่ปุ่ม
- **desktop:** เพิ่ม "ลากมุมย่อ/ขยาย" ได้ (มี `floatEl` primitive) เป็น sugar — **มือถือใช้ preset**

### 3.3 สวิตช์ "แสดงชื่อปุ่ม"

- สวิตช์ 1 ตัวใน settings: **ปิด (default) = ไอคอนล้วน** (สะอาด · ชื่ออยู่ใน tooltip/aria เหมือนเดิม) · **เปิด = ไอคอน + ชื่อไทยใต้/ข้างปุ่ม**
- **เปิดแล้วพี่เปาเห็นชื่อทุกปุ่ม → พูดชื่อได้เลย** (แก้ pain ตรง) · **WCAG 2.5.3:** ป้ายที่โชว์ = ข้อความเดียวกับ aria-label เป๊ะ (ใช้ `it.name` ตัวเดียว ไม่แยก label สั้น — กันผิด 2.5.3)
- เปิดชื่อ → ปุ่มกว้างขึ้น → cap/แถวจัดใหม่อัตโนมัติ (engine เดิมทำได้) · verify ไม่ล้นจอ 360/412

### 3.4 ⭐ ระบบชื่ออ้างอิง (หัวใจ) — 1 ชื่อ = 4 หน้าที่

ทุก component ใน dock มี **2 field** (ตาราง §4):
- **`id`** — ascii คงที่ (`grip` `play` `save` `undo`…) · **ไม่แปล ไม่เปลี่ยน** · ใช้ใน code + `data-cell` (test anchor) · = VS Code `command` id
- **`ชื่ออ้างอิง (ไทย)`** — string เดียวที่เป็น **(1) ป้ายบนปุ่มตอนเปิดชื่อ (2) aria-label (3) tooltip (4) ชื่อในตารางที่ทีมใช้เรียก**

**= 4-in-1 โดยทำ field เดียว** (APG: ใช้ visible text เป็น accessible name *"simplifies maintenance, prevents bugs"*). พี่เปาพูด **"ปุ่มฟังท่อน"** → ทุกคนเปิดตาราง → `id=play` → dev/test ตรงตัว. **ชื่อ = ภาษากลาง · id = ภาษาเครื่อง.**

### 3.5 จัดตำแหน่ง + window

- **ลำดับปุ่ม:** ▲▼ ในตั้งค่า + ปัก 📌 (มีแล้ว) — **ไม่ทำวางอิสระ x/y** (มือถือลากเล็งยาก + แตก invariant "grip ซ้ายสุด · ⚙ ขวาสุด")
- **ตำแหน่ง dock บนจอ:** ลาก **grip** ย้ายทั้งแถบ (มีแล้ว · clamp ในจอ) · desktop ลากมุมปรับขนาด window ได้

---

## 4 · 📛 ตารางชื่ออ้างอิง — หน้าแก้ไข (ITEMS_EDIT · P'Pao ทำก่อน)

**ภาษากลางของทีม** — พี่เปาพูด "ชื่ออ้างอิง" · dev/test ใช้ `id`. (หน้าฝึกร้อง/พิมพ์ = ตารางเดียวกันใน `dockkey-library.md §3` / `dockkey-print-edit.md §1` — id+ชื่อครบแล้ว)

| id (คงที่) | ชื่ออ้างอิง (ไทย) | อยู่ไหน (default) | ทำอะไร |
|---|---|---|---|
| `grip` | ที่จับ/ย่อแถบ | แถวล่าง ซ้ายสุด | ลากย้ายทั้งแถบ · แตะย่อ |
| `undo` | ปุ่มย้อน | แถวล่าง | ย้อนการแก้ |
| `redo` | ปุ่มทำซ้ำ | แถวล่าง | ทำซ้ำการแก้ |
| `play` | ปุ่มฟังท่อน | แถวล่าง | ฟังทำนองท่อนที่กำลังแก้ |
| `stop` | ปุ่มหยุด | แทน `play` ตอนเล่น | หยุดเล่น |
| `scale` | ปุ่มขนาดตัวอักษร (Aa) | แถวล่าง ซ้ายของ ⚙ | ย่อ/ขยายตัวอักษรพรีวิว |
| `setting` | ปุ่มตั้งค่า (⚙) | แถวล่าง ขวาสุด | เปิดหน้าตั้งค่า dock |
| `keys` | แป้นโน้ตตัวเลข | แถบบนสุด (เต็มกว้าง) | คีย์แทรกสัญลักษณ์ลงช่องโน้ต |
| `save` | ปุ่มบันทึก/ส่งตรวจ | แถวกลาง (ปุ่มหลัก) | ส่งตรวจ (editor) / เผยแพร่ (approver) |
| `playAll` | ปุ่มฟังทั้งเพลง | แถวกลาง | เล่นทั้งเพลงตามลำดับ |
| `draft` | ปุ่มบันทึกร่าง | ในตั้งค่า (ปักได้) | เซฟร่าง |
| `download` | ปุ่มดาวน์โหลด | ในตั้งค่า (ปักได้) | โหลดไฟล์ JSON |
| `preview` | ปุ่มดูผลทั้งเพลง | ในตั้งค่า (ปักได้) | เปิดหน้าต่างพรีวิวลอย |

> **ป้ายชั่วคราวในระบบ (`data-cell=<id>`) มีอยู่แล้วในโค้ด** → ตารางนี้แค่ทำให้เป็น **เอกสารกลางที่ทุกคนอ้าง** + เพิ่มสวิตช์โชว์ชื่อให้พี่เปาเห็นสด. **มาตรฐานเดียว 3 หน้า (ฝึกร้อง/พิมพ์/แก้ไข).**

---

## 5 · มองข้าม 2 เว็บ (พระคำ + เพลง) — consistency ข้าม product

**ผมเป็นเจ้าของ "2 เว็บเป็นตระกูลเดียว" (uxui.md ข้อ 4)** → dock-config นี้ต้องคิดข้าม product:

- **ระบบชื่ออ้างอิง + preset ขนาด + name-toggle = ควรอยู่ใน core engine ที่แชร์** (ยึดสัญญา `pk-drawer.js` / DockKey core ที่ menu-drawer-spec วางไว้) → **แก้ครั้งเดียว 2 เว็บได้วินัยเดียวกัน** (ทุกปุ่มมีชื่ออ้างอิง · resize preset เหมือนกัน · toggle ชื่อเหมือนกัน)
- **ชื่ออ้างอิงเป็น per-site** (เครื่องมือคนละชุด) แต่ **scheme + หน้าตั้งค่า = shared** → 2 เว็บ "รู้สึกเป็นตระกูลเดียว"
- **⚠️ คำถาม feasibility ส่ง SA (เจ้าของ core lib):** ดู §7

---

## 6 · เฟส (มีของถึงมือพี่เปาทุกรอบ)

| เฟส | ทำ | พี่เปาได้ | เสี่ยง |
|---|---|---|---|
| **A ⭐** | default ขนาด **กะทัดรัด 44px** + สวิตช์ **แสดงชื่อปุ่ม** + **ตารางชื่ออ้างอิง** เป็นเอกสารกลาง | แถบเล็กลงทันที + เรียกชื่อปุ่มได้ (แก้ pain สื่อสาร) | ต่ำ — ใช้ id/name ที่มีแล้ว |
| **B** | หน้าตั้งค่า 2 คอลัมน์ (เลือกปุ่มโชว์/ซ่อน + ▲▼ + คืนค่า) ครบ | คุมว่าจะเห็นปุ่มไหน | กลาง — ต่อยอด ⚙ เดิม |
| **C** | preset ขนาด 3 ระดับ + (desktop) ลากมุมปรับ window | เลือกขนาดเองได้ | กลาง |
| **D** | ยกขึ้น shared core → พระคำได้ตาม | 2 เว็บตระกูลเดียว | รอ SA map core + P'Aim |

---

## 7 · คำถาม feasibility → SA (ผ่าน PM · SA เจ้าของ core lib)

1. **shared จริงหรือก๊อป-drift:** config (เลือกปุ่ม/ขนาด/ชื่อ) + ระบบชื่ออ้างอิง ควรอยู่ชั้นไหนถึง **"แก้ครั้งเดียว 2 เว็บ"** — `pk-drawer.js`/DockKey core หรือ per-site · แตะแล้วพระคำ regress ไหม
2. **persist:** เก็บ config ต่อผู้ใช้ที่ไหน (localStorage / profile) · anon (พี่เปาเทสต์ไม่ล็อกอิน) เก็บได้ไหม
3. **id คงที่:** `data-cell=it.id` มีครบทุกปุ่มจริงไหม (รวม sing/print) · ต้องเพิ่ม id ให้ตัวไหน
4. **name-toggle:** render `it.name` บนปุ่มแล้ว cap/overflow engine เดิมจัดแถวใหม่ได้เลยไหม · กระทบ band แป้นโน้ต (`keys`) ไหม

---

## 8 · 🖼️ Mockup (จิ้มได้จริง · desktop + มือถือ)

- **เปิดเลย:** [🎛️ mockup DockKey config — สลับขนาด · เปิดชื่อปุ่ม · เลือกปุ่มโชว์/ซ่อน](https://claude.ai/code/artifact/555c023e-4bdb-46b4-a894-05509fbd559d)
- ไฟล์รีโป: `docs/ds/dockkey-config-mockup.html`
- **แสดง:** dock จริง (หน้าแก้ไข) + หน้าตั้งค่า — เลื่อนขนาด กะทัดรัด/สบาย/ใหญ่ เห็น dock ย่อสด · เปิดสวิตช์ "แสดงชื่อปุ่ม" เห็นชื่อไทยโผล่ทุกปุ่ม · ปัก/ถอนปุ่ม · ↺ คืนค่า

---

*UX/UI seat · 2026-07-18 · docs-only · ⛔ ไม่แตะ `src/` · อ้างอิงเปิดจริง: [Photoshop Edit Toolbar](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html) · [VS Code custom layout](https://code.visualstudio.com/docs/configure/custom-layout) · [VS Code command id/title](https://code.visualstudio.com/api/extension-guides/command) · [Apple Dynamic Type / larger text](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/) · [MD3 density](https://m3.material.io/foundations/layout/understanding-layout/density) · [Android target size 48dp](https://support.google.com/accessibility/android/answer/7101858) · [WCAG 2.5.3 Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name) · [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html) · [ARIA APG names](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)*
