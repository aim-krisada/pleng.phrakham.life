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
| 2 | resize (ใหญ่ไป = **กินพื้นที่จอ**) | ✅ **desktop = ลากขอบย่อ · mobile = เลือกขนาดในหน้าตั้งค่า** · ลด footprint ด้วยการ **โชว์ปุ่มน้อยลง + ย่อแถบ** ไม่ใช่ย่อปุ่มต่ำกว่า 44px (**ปุ่มวันนี้ 44px อยู่แล้ว · มีแค่ play=50px**) | Apple Dynamic Type · MD3 density (mobile) · pointer drag (desktop) · WCAG 44px floor |
| 3 | จัดตำแหน่งปุ่ม + window | ✅ **ใช้ระบบเดิม: ปัก 📌 + ▲▼ จัดลำดับ** (ไม่ใช่วางอิสระ x/y — พังบนมือถือ + แตก invariant row1) · window/ตำแหน่ง dock = **ลาก grip** (มีแล้ว) | ui-standards §2 (invariant) · Fitts (grip ลากทั้งแถบ) |
| 4 | ทุกปุ่มตั้งใน settings | ✅ **มี design แล้ว** (⚙ = ทุก item `inSetting`/`pinnable`) — งานนี้ทำให้มัน **ครบ+ชัด** เป็นศูนย์คุม | dockkey-library §4 (I4) |
| 5 ⭐ | toggle ชื่อปุ่ม + ชื่ออ้างอิง | ✅ **สวิตช์ "แสดงชื่อปุ่ม" 1 ตัว** (เปิด=ไอคอน+ชื่อไทย) + **ทุกปุ่มมี "ชื่ออ้างอิง" 1 เดียว = ป้ายที่เห็น = accessible-name = tooltip = ชื่อที่ทั้งทีมใช้** + **id คงที่แยกไว้ (code/test)** | WCAG **2.5.3 Label in Name** · **4.1.2** · ARIA APG · VS Code (id↔title แยกชั้น) |

**ข้อเสนอเดียว:** ทำ **"หน้าตั้งค่า DockKey = ศูนย์คุมเดียว"** (เลือกปุ่ม · ขนาด · ชื่อ) บน core engine เดิม + **ระบบชื่ออ้างอิง (id + ชื่อไทย)** ที่เป็นทั้ง a11y + test-hook + ภาษากลางของทีม → **แก้ pain การสื่อสารของพี่เปาถาวร ไม่ใช่แค่ feature**

---

## 0.5 · ⭐ ของเดิมมีอะไรแล้ว vs ใหม่จริง (verify `DockKey.vue` · ยึด `ux-platform-patterns §4`)

**เปิดโค้ดจริงแล้ว (P'Aim จับถูก — ของเดิมมีเยอะกว่าที่คิด):**

| ฟีเจอร์ | สถานะ | หลักฐาน (`DockKey.vue`) |
|---|---|---|
| ⚙ หน้าตั้งค่าในตัว (ปรับ inline) | ❌ **มีแล้ว — ไม่ทำใหม่** | `dk-panel` :404 |
| ปัก/ถอนปุ่ม 📌 | ❌ มีแล้ว | `togglePin` :458 |
| เลื่อน ▲▼ (ปุ่มที่ปัก) | ❌ มีแล้ว | `movePin` :450 |
| ย่อแถบ (collapse `[⋮⋮][⚙]`) | ❌ มีแล้ว | `collapsed` :264 |
| โปร่งใส · จำค่าทุกอย่าง | ❌ มีแล้ว | `alpha` · localStorage |
| ปุ่ม 44px (มือถือ 42/40) · play 50px | ❌ เป็นแบบนี้แล้ว | `--touch-min` :514 · `.dk-play` :529 |
| **desktop ลากขอบปรับขนาด** | ✅ **ใหม่** | — |
| **mobile ⚙ = หน้าเต็มจอ (ไม่ใช่ popup)** | ✅ **ใหม่** (วันนี้ mobile ใช้ popover เดียวกับ desktop = คับ) | — |
| **สวิตช์ "แสดงชื่อปุ่ม"** | ✅ **ใหม่** | — |
| **ปุ่ม "คืนค่าเริ่มต้น"** | ✅ **ใหม่** | — |
| **ตารางชื่ออ้างอิง (เอกสารกลาง)** | ✅ **ใหม่** (ชื่อมีเป็น `it.name` แล้ว) | :342 |
| ลด footprint (default โชว์น้อยลง + preset) | 🟡 ต่อยอด | — |

> **แปลว่า:** งานนี้ **เล็กกว่าที่เสนอรอบแรก** — เลิกเสนอ "เลือกปุ่ม/ปัก/▲▼/ตั้งค่า" (มีแล้ว) · เหลือ DELTA จริง = **ลากขอบ (desktop) · หน้าเต็มจอ (mobile) · แสดงชื่อ · คืนค่า · ตารางชื่อ + ลด footprint**

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

**พื้นผิวหน้าตั้งค่า (สำคัญ — ทิศ P'Aim):** **desktop = popover ข้างแถบ** (ของเดิม `dk-panel` โอเค) · **mobile = เปิดหน้าเต็มจอ** (full-screen) เลือกเสร็จกด "เสร็จ" **กลับจุดเดิม รักษา state หน้าแก้ไข** — ไม่ใช่ popover คับ ๆ บนจอ 360px (ยึด `ux-platform-patterns §1`: popup→full-screen บนมือถือ · Material full-screen dialog).

หน้า ⚙ ตั้งค่า มี 2 กลุ่มชัด (โมเดล Photoshop):
- **📌 บนแถบ** — ปุ่มที่โชว์บน dock ตอนนี้ (แต่ละแถว: ไอคอน · ชื่อไทย · ▲▼ จัดลำดับ · ปุ่มถอน "→ ย้ายเข้าตั้งค่า")
- **⚙ ในตั้งค่า (ซ่อนจากแถบ)** — ปุ่มที่ยังกดใช้ได้ในหน้านี้ แต่ไม่กินที่บนแถบ (ปุ่ม "📌 ปักขึ้นแถบ")
- **↺ คืนค่าเริ่มต้น** — 1 ปุ่ม รีเซ็ตทั้งชุด (VS Code Reset · Photoshop Restore Defaults)

**ทำไมไม่ใช่ drag-drop ข้ามคอลัมน์บนมือถือ:** ลากของข้ามกล่องบน touch = fiddly (ต้องกดค้าง+เล็ง). → ใช้ **ปุ่มกด "ปัก/ถอน" + ▲▼** (แตะเดียว ชัวร์ · ปุ่ม 44px). desktop เพิ่ม drag ได้เป็น sugar แต่ปุ่มกดเป็นทางหลักทั้ง 2.

### 3.2 ขนาดแถบ (resize) — **desktop ลากขอบ · mobile เลือกขนาด** (แก้ปัญหา "กินพื้นที่จอ")

> **ฟันธง (ทิศ P'Aim 18 ก.ค. · ตรงมาตรฐาน):** **desktop = ลากขอบปรับขนาดอิสระ** (เมาส์ทำได้ · Photoshop/VS Code panel) · **mobile = เลือกขนาด 3 ระดับในหน้าตั้งค่าเต็มจอ** (นิ้วลากขอบเล็งยาก — Apple Dynamic Type + MD3 density ให้ "เลือกขนาด" ไม่ใช่ drag บน touch). **คนละท่า คิดเรื่องเดียว.**

**สำคัญ — แก้คำที่เคยเขียนผิด:** ปุ่ม dock **วันนี้ 44px อยู่แล้ว** (มือถือย่อเป็น 42/40 เอง) — **ไม่ใช่ 50px** · มีแค่ปุ่ม play = 50px. → "ย่อปุ่มให้เล็กลง" **ทำไม่ได้** (ต่ำกว่า WCAG 44px). **"ใหญ่ไป" ที่พี่เปารู้สึก = แถบกินพื้นที่จอรวม** (ปุ่มเยอะ 2 แถว + แป้นโน้ต + ระยะห่าง) → **ทางลดจริง:** (1) โชว์ปุ่มน้อยลง (เก็บใน ⚙) (2) preset กะทัดรัด บีบ gap/padding + play 50→44 (3) ย่อแถบ (collapse มีแล้ว) (4) ให้ผู้ใช้ย่อเอง (desktop ลาก · mobile เลือกขนาด).

| ระดับ | ปุ่ม | gap/padding | เมื่อไหร่ |
|---|---|---|---|
| **กะทัดรัด** ⭐default | **44px** | แน่น (gap 4 · pad 6) | พี่เปาว่า 50px ใหญ่ไป → เริ่มที่นี่ |
| **สบาย** | 48px | กลาง | นิ้วใหญ่/อยากชัด (= เพดาน MD3) |
| **ใหญ่** | 56px | โปร่ง | จอใหญ่/การมองเห็น |

- **default = กะทัดรัด** (play 50→44 + บีบ gap/padding) = footprint เล็กลง **แต่ทุก preset ≥ 44px** (Apple HIG 44pt + project target · MD3 แนะ 48 แต่เลือก 44 ตามมาตรฐานโปรเจกต์+คำขอผู้ใช้)
- ขนาดคุมทั้งชุด (ปุ่ม+gap+padding) → footprint เล็กลงจริง ไม่ใช่แค่ปุ่ม
- **desktop = ลากขอบ** (มี `floatEl`/drag primitive อยู่แล้ว) · **mobile = เลือก preset ในหน้าเต็มจอ**

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

**ผมเป็นเจ้าของ "2 เว็บเป็นตระกูลเดียว" (uxui.md ข้อ 4)** — และ **SA ยืนยันแล้ว (report `dockkey-shared-core-feasibility.md` `2c98c2c`) ว่า DockKey แชร์จริง** (P'Aim ถูก):

- **`DockKey.vue` = source เดียวที่แชร์จริง** — พระคำ import ตัวเดียวกันผ่าน `@pleng` alias (`IslandApp.vue`) เป็น dock อ่านออกเสียง (ไม่ใช่ก๊อป) → **config ต้องอยู่ชั้น engine ใน `DockKey.vue` = แก้ครั้งเดียว 2 เว็บได้จริง** (ตรงคำสั่ง P'Aim เป๊ะ)
- **แยกชั้นถูก:** ระบบชื่ออ้างอิง + preset ขนาด + name-toggle = **engine (shared)** → 2 เว็บวินัยเดียวกัน · ส่วน "ปุ่มไหนมี" = **data (items) ต่อเว็บ** (พระคำ reading dock · เพลงปุ่มเยอะกว่า) → ชื่ออ้างอิง per-site แต่ scheme+หน้าตั้งค่า shared
- **🔴 ราคาที่ต้องรู้ (SA):** แชร์จริง = **แตะ engine กระทบ dock อ่านออกเสียงพระคำด้วย** → **DoD ต้อง test 2 host + rebuild island `pk-dock-island.js`** ทุกครั้งที่แตะ engine (แก้แค่ `ITEMS_EDIT` = data เพลง → พระคำไม่กระทบ) · 1 edit แต่ **2 deploy** (เพลงตรง · พระคำ rebuild+render)
- **ที่ SA ตอบให้แล้ว:** persist = `localStorage` per `storeKey` (แยก user/เว็บอยู่แล้ว) · id คงที่ = มีครบ · resize = เติม

---

## 6 · เฟส (มีของถึงมือพี่เปาทุกรอบ)

| เฟส | ทำ | พี่เปาได้ | เสี่ยง |
|---|---|---|---|
| **A ⭐** | default ขนาด **กะทัดรัด 44px** + สวิตช์ **แสดงชื่อปุ่ม** + **ตารางชื่ออ้างอิง** เป็นเอกสารกลาง | แถบเล็กลงทันที + เรียกชื่อปุ่มได้ (แก้ pain สื่อสาร) | ต่ำ — ใช้ id/name ที่มีแล้ว |
| **B** | หน้าตั้งค่า 2 คอลัมน์ (เลือกปุ่มโชว์/ซ่อน + ▲▼ + คืนค่า) ครบ | คุมว่าจะเห็นปุ่มไหน | กลาง — ต่อยอด ⚙ เดิม |
| **C** | preset ขนาด 3 ระดับ + (desktop) ลากมุมปรับ window | เลือกขนาดเองได้ | กลาง |
| **D** | ยกขึ้น shared core → พระคำได้ตาม | 2 เว็บตระกูลเดียว | รอ SA map core + P'Aim |

---

## 7 · feasibility — SA ตอบแล้ว (`2c98c2c`) · เหลือปิดตอน DS

**SA ยืนยัน (✅ ตอบครบ 3/4):**
1. **shared:** ✅ `DockKey.vue` engine แชร์จริง (พระคำ `@pleng` import) → config ที่ engine = แก้ครั้งเดียว 2 เว็บ · **regression พระคำจริง → 2-host DoD** (ดู §5)
2. **persist:** ✅ `localStorage` per `storeKey` (แยก user/เว็บอยู่แล้ว · anon ได้)
3. **id คงที่:** ✅ มีครบ (`data-cell=it.id`)

**เหลือปิดตอนทำ DS/build:**
4. **name-toggle × band:** render `it.name` บนปุ่ม → cap/overflow engine จัดแถวใหม่ได้ (ยืนยันแล้วในหลักการ) · **ต้องเช็คตอน build ว่าไม่กระทบ band แป้นโน้ต (`keys`) เต็มกว้าง** + verify ไม่ล้น 360/412 พร้อมชื่อเปิด

---

## 8 · 🖼️ Mockup (จิ้มได้จริง · desktop + มือถือ)

- **เปิดเลย:** [🎛️ mockup DockKey config — สลับขนาด · เปิดชื่อปุ่ม · เลือกปุ่มโชว์/ซ่อน](https://claude.ai/code/artifact/555c023e-4bdb-46b4-a894-05509fbd559d)
- ไฟล์รีโป: `docs/ds/dockkey-config-mockup.html`
- **แสดง:** dock จริง (หน้าแก้ไข) + หน้าตั้งค่า — เลื่อนขนาด กะทัดรัด/สบาย/ใหญ่ เห็น dock ย่อสด · เปิดสวิตช์ "แสดงชื่อปุ่ม" เห็นชื่อไทยโผล่ทุกปุ่ม · ปัก/ถอนปุ่ม · ↺ คืนค่า

---

*UX/UI seat · 2026-07-18 · docs-only · ⛔ ไม่แตะ `src/` · อ้างอิงเปิดจริง: [Photoshop Edit Toolbar](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html) · [VS Code custom layout](https://code.visualstudio.com/docs/configure/custom-layout) · [VS Code command id/title](https://code.visualstudio.com/api/extension-guides/command) · [Apple Dynamic Type / larger text](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/) · [MD3 density](https://m3.material.io/foundations/layout/understanding-layout/density) · [Android target size 48dp](https://support.google.com/accessibility/android/answer/7101858) · [WCAG 2.5.3 Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name) · [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html) · [ARIA APG names](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)*
