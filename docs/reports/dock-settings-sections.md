# Design — ⚙ Settings แบ่งส่วนตามแถวจริงของ dock (map panel → dock rows)

**PM:** pm28 · **P'Aim ขอ** · **design-first · ⛔ ไม่เขียนโค้ด** · base = `dock-resize` (`DockKey.vue` · dev lane — Design ส่ง spec ไม่แตะไฟล์)
**verify โค้ดจริง** `dock-resize` @ `0c0f7c9` (`panelItems`/`row1`/`row2`/`pinnedItems`/`barRowOf`/`moveOrder`/`movePin`/`togglePin`/`toggleOff`) · Design 2026-07-18

---

## 0 · สรุป (ฟันธง · อ่าน 30 วิ)

**ปัญหา (P'Aim):** ⚙ = ลิสต์แบนเรียงรวด · กด ▲▼ **ไม่รู้ปุ่มอยู่/จะไป "แถวไหน" ของ dock จริง**

**ฟันธง:** **จัด `panelItems` เป็น section ตาม "แถวจริง" ของ dock (บนลงล่าง = mirror จอ)** พร้อม **header + เส้นแบ่ง + แผนภาพ dock ย่อ** → ลิสต์กลายเป็น "แผนที่ของแถบจริง" · **▲▼ = เรียงภายในแถวของตัวเอง** (ปุ่มไม่ข้ามแถว = ตามโค้ดจริง `barRowOf`) → หายงงทันที
**ไม่แตะ logic reorder/pin** — grouping + header ล้วน (presentational) · dev แค่ group ตาม `sectionOf(it)` + render header · **low-risk**

**อัปเดต (P'Aim รีวิว 18 ก.ค. · fold 4 ข้อ):** §A **ไอคอนครบทุกแถว** (grip/⚙/ดาวน์โหลด ตอนนี้ช่องไอคอนว่าง) · §B **section แยกให้เด่น** (P'Aim: "not obvious" — เส้นบางไม่พอ → การ์ด/พื้นหลัง) · §C **⚙ panel ลากย้ายได้** (movable window · reuse grip-drag ของ dock) · §D **grip+⚙ ยึดแถวล่างสุด ซ้าย-ติดกัน ตายตัว** (grip ซ้ายสุด · ⚙ ติดขวา grip · ตัด ▲▼ — ต่างจาก §C: §D = ปุ่มบนแถบ · §C = หน้าต่าง popup)

---

## 1 · โครง dock จริง (verify) = section ที่ต้อง mirror

DockKey เรนเดอร์ **บน→ล่าง:** `keysBands` → pinned rows → `row2` → `row1` (chrome ติดขอบจอล่าง) · panel ควรเรียง **ลำดับเดียวกัน** = แผนที่ตรงตัว (natural mapping · Norman)

| section (บน→ล่าง) | มาจาก (โค้ด) | ในนั้นทำอะไรได้ |
|---|---|---|
| **1. แป้นสัญลักษณ์** | `keysBands` (kind `keys` · `NEVER_MANAGE`) | อ่านอย่างเดียว (คงที่ · บนสุด) — โชว์ให้แผนที่ครบ |
| **2. ปุ่มปักหมุด** | `isPinned(id)` (pinned rows) | ▲▼ = `movePin` · 📌 = ถอน (→ ลิ้นชัก) |
| **3. แถวสั่งงาน (แถว 2)** | `place.row===2` & ไม่ `isOff` | ▲▼ = `moveOrder` ในแถว 2 · 📌 ถอน (ถ้า manageable) |
| **4. แถวหลัก (แถว 1 · ล่างสุด)** | `place.row===1` & ไม่ `isOff` | **grip(ซ้ายสุด)+⚙(ติดขวา grip) = ยึดที่ ตายตัว ไม่มี ▲▼/📌 (§D)** · ที่เหลือ (ย้อน/ทำซ้ำ/ฟัง) ▲▼=`moveOrder` |
| **5. ไม่อยู่บนแถบ (ลิ้นชัก)** | `isOff(id)` หรือ `pinnable` ที่ยังไม่ปัก | 📌 = เพิ่มขึ้นแถบ · ไม่มี ▲▼ (ยังไม่มีตำแหน่ง) |

## 2 · `sectionOf(it)` (dev เขียน computed · Design กำหนด mapping)

```js
// จัดกลุ่ม panelItems (ของเดิม) → 5 section · ไม่แตะ reorder/pin logic
function sectionOf(it) {
  if (it.kind === 'keys')            return 'keypad'   // อ่านอย่างเดียว
  if (isPinned(it.id))               return 'pinned'
  if (it.place?.row === 2 && !isOff(it.id)) return 'row2'
  if (it.place?.row === 1 && !isOff(it.id)) return 'row1'
  return 'drawer'                                       // off-bar หรือ pinnable-ยังไม่ปัก
}
const SECTIONS = ['keypad','pinned','row2','row1','drawer'] // บน→ล่าง = mirror dock
// sections = SECTIONS.map(key => ({ key, header, hint, items: panelItems.filter(i => sectionOf(i)===key) }))
//            .filter(s => s.items.length)   // ซ่อน section ว่าง (ยกเว้น drawer โชว์เสมอถ้ามีของเพิ่มได้)
```
- **panelItems เดิมไม่เปลี่ยน** — แค่เพิ่ม keypad entry (read-only) เพื่อแผนที่ครบ (ถ้าไม่อยากยุ่ง = ข้าม section 1 · โชว์เป็นแค่หัวแผนภาพ)
- section ว่าง = ซ่อน (เช่น ไม่มี pinned)

## 3 · Mockup (panel มี section + title bar ลากได้ + ไอคอนครบ · desktop)

```
╔═ ⠿  ⚙ ตั้งค่าแถบเครื่องมือ            ↺  ✕ ═╗  ← TITLE BAR = ที่จับลาก (§C) + ปิด/รีเซ็ต
║  ┌ แผนภาพแถบ (mirror จอ) ┐                  ║
║  │ ▔▔▔ แป้นสัญลักษณ์       │                  ║
║  │ ▭▭  ปักหมุด            │                  ║
║  │ ▭▭▭ สั่งงาน             │                  ║
║  │ ▭▭▭▭ หลัก (grip·⚙ …)   │                  ║
║  └───────────────────────┘                  ║
║ ╭───────────────────────────────────────╮  ║  ← §B: การ์ด section (common-region)
║ │ ▩ แป้นสัญลักษณ์  · บนสุด · คงที่         │  ║     header เด่น (ตัวหนา+ไอคอนหมวด)
║ │  🎹 แป้นโน้ต                    (คงที่)  │  ║
║ ╰───────────────────────────────────────╯  ║
║ ╭───────────────────────────────────────╮  ║
║ │ 📌 ปักหมุด  · เหนือแถวสั่งงาน            │  ║
║ │  🔊 เสียงดนตรี          [▲][▼]     📌● │  ║
║ ╰───────────────────────────────────────╯  ║
║ ╭───────────────────────────────────────╮  ║
║ │ ▤ แถวสั่งงาน (แถว 2)                    │  ║
║ │  💾 บันทึก             [▲][▼]     📌● │  ║
║ │  ⬇ ดาวน์โหลด           [▲][▼]     📌● │  ║  ← §A: export ได้ ⬇ (เดิมว่าง)
║ ╰───────────────────────────────────────╯  ║
║ ╭───────────────────────────────────────╮  ║
║ │ ▤ แถวหลัก (แถว 1) · ล่างสุด ติดขอบจอ    │  ║
║ │  ⠿ ย้าย/ย่อ                 🔒 ยึดที่ │  ║  ← §D: grip ซ้ายสุด · ตายตัว (ไม่มี ▲▼)
║ │  ⚙ ตั้งค่า                   🔒 ยึดที่ │  ║  ← §D: ⚙ ติดขวา grip · ตายตัว · §A ไอคอน settings
║ │  ┈┈┈┈ ↓ ปุ่มด้านล่างเลื่อนได้ ↓ ┈┈┈┈  │  ║
║ │  ↩ ย้อน               [▲][▼]     📌● │  ║
║ │  ↪ ทำซ้ำ              [▲][▼]     📌● │  ║
║ │  ▶ ฟังท่อน            [▲][▼]     📌● │  ║
║ ╰───────────────────────────────────────╯  ║
║ ╭───────────────────────────────────────╮  ║
║ │ ➕ ยังไม่อยู่บนแถบ · แตะ 📌 เพิ่ม        │  ║
║ │  ⛶ ดูผลทั้งเพลง                   📌○ │  ║
║ ╰───────────────────────────────────────╯  ║
╚═════════════════════════════════════════════╝
```
- **title bar** = ที่จับลากทั้งหน้าต่าง (§C) + ✕ ปิด + ↺ รีเซ็ตตำแหน่ง · เป็นทั้ง header หน้าต่าง + drag handle
- **การ์ด section** (§B) = พื้นหลัง/กรอบมน + header เด่น (ตัวหนา + ไอคอนหมวด) + เว้นช่องระหว่างการ์ด → แยก **obvious** (Gestalt common-region · ไม่ใช่แค่เส้น)
- **ไอคอนครบทุกแถว** (§A) — grip=⠿ · ⚙=settings · ดาวน์โหลด=⬇ (เดิม `.dk-mi` ว่าง)
- **หัวแผนภาพ** = dock ย่อ 4 ชั้น → map section→แถวจริง (natural mapping)
- **▲▼ อยู่ในการ์ด section** → เลื่อนได้แค่ในแถวนี้ (ไม่ข้ามแถว)
- **🔒** = grip/⚙ ย้ายได้ ถอนไม่ได้ · **📌●/📌○** = อยู่บนแถบ / เพิ่มได้ (สัญลักษณ์เดิม)

## 4 · พฤติกรรม ▲▼ (แก้จุดที่ P'Aim งง)

- **ในแต่ละ section, ▲▼ เรียงเฉพาะภายในแถวนั้น** (`moveOrder`=row1/row2 · `movePin`=pinned) — ตรงกับโค้ด `barRowOf` (ปุ่มมี "บ้าน" คือแถวของมัน ย้ายข้ามแถวไม่ได้ = ดีไซน์ · grip ต้องอยู่แถว 1 ซ้าย)
- **ทำไมย้ายข้ามแถวไม่ได้ = ถูก:** แต่ละแถวมีบทบาท (หลัก/สั่งงาน) · การ section ทำให้ **ข้อจำกัดนี้มองเห็นได้** แทนที่จะซ่อนในลิสต์แบน → นี่คือคำตอบตรงปัญหา
- **ย้าย "ออก/เข้า" แถบ = 📌** (row/pinned ↔ ลิ้นชัก) — ปุ่มเลื่อน section อัตโนมัติเมื่อกด 📌 (เห็นมันวิ่งไปอยู่หมวดใหม่ = feedback)
- **ปลายแถว** = ▲/▼ disabled (มีแล้ว `reIndex===0`/`reLen-1`) — ไม่หลุด section
- **grip/⚙ = ไม่มี ▲▼ เลย** (§D · ยึดที่) — ปุ่มที่เลื่อนได้เริ่มหลัง ⚙ เสมอ

## 5 · a11y (WCAG · บังคับ · อ้างมาตรฐานเอง)

- **section = `role="group"` + `aria-labelledby`=header** · header = `role="heading"`/`<h3>` (WAI-ARIA APG grouping · WCAG **1.3.1 Info & Relationships** — สื่อโครงด้วย markup ไม่ใช่แค่เส้น)
- **▲▼ aria-label ระบุตำแหน่ง+หมวด:** "เลื่อนขึ้น · บันทึกร่าง ตำแหน่ง 2 จาก 2 ในแถวสั่งงาน" (WCAG **4.1.2** Name/Role/Value)
- **ประกาศผลย้าย** ผ่าน live region (`aria-live="polite"`): "ย้ายบันทึกร่างเป็นตำแหน่ง 1 ในแถวสั่งงาน" (WCAG **4.1.3** Status Messages) — reorder-by-button = keyboard-accessible (WCAG **2.1.1**, ดีกว่า drag)
- **🔒 grip/⚙:** `aria-disabled`/บอก "ล็อกบนแถบ ถอนไม่ได้" (ไม่ใช่แค่ไอคอน)
- ปุ่มทุกตัว ≥44px (WCAG 2.5.5 · มีแล้วใน `.dk-mv`/`.dk-pin` — Design ยืนยันคงไว้)

## 5A · ไอคอนครบทุกแถว (P'Aim ข้อ 1 · "add setting icon")

**verify:** `.dk-mi` เรนเดอร์ `<Icon :name="it.icon" />` · **item ที่ไม่มี `icon` = ช่องว่าง:** `grip`(kind grip) · `setting`(kind gear · = "setting icon" ที่ P'Aim ชี้) · `export`(kind slot) → 3 แถวนี้ไอคอนหาย
**แก้ (fallback · ไม่แตะ bar rendering):** panel ใช้ `panelIcon(it)` = `it.icon` ก่อน แล้ว fallback ตาม id/kind:

```js
const ICON_FALLBACK = { grip: 'grip-vertical', setting: 'settings', export: 'download' }
const KIND_FALLBACK = { grip: 'grip-vertical', gear: 'settings', keys: 'piano', slot: 'square-dashed' }
const panelIcon = (it) => it.icon || ICON_FALLBACK[it.id] || KIND_FALLBACK[it.kind] || 'square'
// .dk-mi → <Icon :name="panelIcon(it)" :size="16" />
```
- lucide ids (มีจริง · [[reference_lucide_icons]]): `grip-vertical` · `settings` (⚙ = แถวตั้งค่า) · `download` (⬇ ดาวน์โหลด) · `audio-lines`(soundctl มีแล้ว) · `piano`(แป้น)
- **ทำไม fallback ไม่ยัด `icon` ลง descriptor:** grip/gear เรนเดอร์บนแถบแบบพิเศษ (ไม่ผ่าน `.mi`) · เพิ่ม `icon` เสี่ยงกระทบ bar · fallback เฉพาะ panel = ปลอดภัย · **ทุกแถวมีไอคอนแน่นอน**

## 5B · section แยกให้เด่น (P'Aim ข้อ 2 · "not obvious")

เส้นบาง = อ่อนไป → ยก **common-region ให้ชัด** (Gestalt: พื้นหลัง/กรอบร่วม > เส้น > ระยะ):
- **การ์ด section** — แต่ละ section = กล่องมน `.dk-section` พื้นหลังต่างจาก panel (เช่น `var(--surface-2)`/tint อ่อน) + เว้นระหว่างการ์ด **≥12px**
- **header เด่น** `.dk-shead` — **ตัวหนา** + ไอคอนหมวด + สี/พื้นแตกต่าง (ไม่ใช่ข้อความเทาจาง) + hint ตำแหน่งบรรทัดเดียวกัน
- **contrast ผ่าน** WCAG 1.4.11 (พื้น/กรอบ ≥3:1 กับ panel) · 1.4.3 (header text ≥4.5:1)
- (option) tint หัวการ์ดต่างเฉดเบา ๆ ต่อ section → แยกด้วยสี + กล่อง (redundant coding · ไม่พึ่งสีอย่างเดียว = 1.4.1)

## 5C · ⚙ panel ลากย้ายได้ (P'Aim ข้อ 3 · "make setting window movable")

**reuse pattern grip-drag ของ dock** (`pos` + `gripDown/gripMove/gripUp` + `clampDock` · verify มีจริง) → generalize ให้ panel:
- **ที่จับลาก = title bar** (`⠿ ⚙ ตั้งค่าแถบเครื่องมือ`) — `@pointerdown` บน header → ลากทั้ง `.dk-panel` (แยก state `panelPos` ของตัวเอง · ไม่ปนกับ dock `pos`)
- **clamp ในจอ** — reuse แนว `clampDock` (margin 6px · ไม่ให้ title bar หลุดจอ = ลากกลับได้เสมอ)
- **✕ ปิด · ↺ รีเซ็ตตำแหน่ง** (กลับจุด default ใต้ ⚙) — กันลากหายมุมจอ
- **a11y (WCAG 2.1.1 keyboard):** title bar focusable → **ลูกศร = ขยับทีละ ~16px** + Esc ปิด · ไม่พึ่ง pointer อย่างเดียว · `role="dialog"` + `aria-label` (movable panel) · announce ไม่จำเป็น (ตำแหน่งเป็น visual)
- **persist (option):** จำ `panelPos` ใน localStorage (เหมือน dock) — เฟส 2 ได้ ไม่บังคับ
- **mobile คงเดิม** (P'Aim สั่ง) — จอเล็กลากยาก · panel = anchored/sheet เหมือนเดิม · drag = desktop only (เช็ก `!mobile`)
- **⚠️ ตอนลาก:** ปิด popover ซ้อน/รักษา openId='setting' · `clampPops` เดิมจับ .dk-pop อยู่แล้ว — ประสานกับ panelPos

## 5D · grip + ⚙ ยึดแถวล่างสุด ซ้าย-ติดกัน ตายตัว (P'Aim ข้อ 4)

**P'Aim:** grip = ซ้ายสุด · ⚙ = ติดขวา grip ทันที · **แถวล่างสุดเสมอ · ย้ายไม่ได้** ("grip left, setting next to it always") — ต่างจาก §C (§C = หน้าต่าง popup ลากได้ · §D = ปุ่ม grip/⚙ **บนแถบ** ตายตัว)

**verify + เปลี่ยนอะไร (dock layout · `rankOf`/anchor):**
| ปุ่ม | เดิม | เป็น (§D) |
|---|---|---|
| **grip** | `anchor:'left'` (rank 0) | คงเดิม — ซ้ายสุด · **+ ตัด ▲▼** |
| **⚙ setting** | `anchor:'right'` (rank 1000 = ขวาสุด) | **`anchor:'rightOf:grip'`** (rank ~0.01 = ติดขวา grip) · **+ ตัด ▲▼** |
| อื่น (ย้อน/ทำซ้ำ/ฟัง/soundctl) | reorder ได้ | คงเดิม — เริ่ม **หลัง ⚙** |

- **row1 ใหม่:** `[⠿ grip][⚙][↩][↪][▶][🔊]…` (grip+⚙ ยึดหัวแถว · ที่เหลือเลื่อนได้ต่อท้าย)
- **ตัด reorder ของ grip/⚙:** `canReorder` เดิมรวม grip/⚙ → **เพิ่มกันออก:** `canReorder = !mobile && barRowOf(it) && !['grip','gear'].includes(it.kind)` · และ `applyOrder`/`rankOf` ต้อง **ล็อก grip=ตำแหน่ง 0 · ⚙=1 เสมอ** (barOrder ของผู้ใช้เรียงได้เฉพาะ index ≥2) — dev คุม
- **row1 = "bottommost"** ยืนยัน: rows เรนเดอร์ `keys→pinned→row2→row1` = row1 ล่างสุดติดขอบจอ (ตรงที่ P'Aim ต้องการ) — ไม่ต้องแตะลำดับแถว แค่ล็อก grip/⚙ ในแถว
- **สะท้อนใน ⚙ panel (§1-3):** grip/⚙ อยู่ **บนสุดของ section แถวหลัก** · แสดง **🔒 "ยึดที่"** · ไม่มี ▲▼ ไม่มี 📌 (label/aria "ล็อกบนแถบ ซ้ายสุด/ถัดจากซ้าย")
- **เหตุผล (world-class ยังโอเค):** จับ **2 ปุ่มควบคุม (chrome: ย้าย+ตั้งค่า) รวมไว้มุมเดียว ตายตัว** = ตำแหน่งเดาได้เสมอ (predictable · muscle-memory) · ปุ่ม "ทำงาน" (action) ไล่จากซ้ายไปขวา — coherent (ต่าง toolbar-end convention แต่ P'Aim ต้องการ grouping chrome ซ้าย = ยอมรับได้ · consistency > convention ที่นี่)
- **2-host:** พระคำ island ก็ได้ grip/⚙ ยึดเหมือนกัน (anchor เปลี่ยนใน DockKey = ทั้ง 2 host) — ยืนยันตอน build ว่า island ไม่พัง (island เล็ก · grip/⚙ ยังจำเป็น)

## 6 · มาตรฐานอ้างอิง (อ่านเอง · ไม่ Gemini)

- **grouped settings list + section header/divider = แพตเทิร์นมาตรฐาน:** [Apple HIG — Lists (grouped/inset · Settings)](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) · [Material — List subheaders & dividers](https://m3.material.io/components/lists/guidelines) · Gestalt **common region + proximity** (เส้น/กรอบ = จัดกลุ่มการรับรู้)
- **natural mapping (panel ↔ ตำแหน่งจริงบนจอ):** Norman, *The Design of Everyday Things* — control layout ควร map กับสิ่งที่มันคุมเชิงพื้นที่ → แผนภาพ dock ย่อ + เรียง section บน→ล่างตามจอ
- **reorder ด้วยปุ่ม + ประกาศตำแหน่ง (ไม่พึ่ง drag):** [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) · WCAG 2.1.1 / 4.1.3 — keyboard+touch เข้าถึง, screen reader รู้ผล
- **1.3.1 Info & Relationships:** [WCAG](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html) — โครงกลุ่มต้องอยู่ใน markup (group/heading) ไม่ใช่แค่ภาพ
- **การ์ด/inset group เด่นกว่าเส้น (§B):** [Apple HIG — inset-grouped lists](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) · [Material — cards/containers](https://m3.material.io/components/cards) · WCAG **1.4.11** Non-text Contrast (กรอบ/พื้น ≥3:1) · Gestalt common-region > line
- **ไอคอนต่อรายการ = scannability (§A):** ทุกแถวมี glyph นำ → กวาดตาเร็ว (NN/g icon+label) · lucide id มีจริง [[reference_lucide_icons]]
- **movable/draggable panel (§C):** ที่จับ = title bar (แพตเทิร์นหน้าต่างสากล) · keyboard-move + clamp (WCAG 2.1.1) · [WAI-ARIA APG — dialog (movable)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) · reuse dock grip-drag = 1 กลไก 2 ที่ (consistency)

## 7 · dev contract (§3.0 · Design ส่ง spec · dev = DockKey lane)

- **dev (logic):** `sectionOf(it)` + `sections` computed (§2) + `panelIcon(it)` fallback (§A) + live-region ผลย้าย + **movable panel** (§C: `panelPos` + drag บน title bar + `clampPanel` reuse `clampDock` + keyboard-move) + **§D dock layout:** ⚙ anchor `right`→`rightOf:grip` · `canReorder` กัน grip/gear · `applyOrder` ล็อก grip=0/⚙=1 · **ไม่แตะ** `movePin`/`togglePin`/`toggleOff` + `moveOrder` (เดิมทำงานต่อ เฉพาะกัน grip/⚙)
- **Design (presentation):** template — title bar (drag handle+✕+↺) · การ์ด section + header เด่น (§B) · แผนภาพ dock ย่อ · ไอคอนทุกแถว (§A) · 🔒"ยึดที่" grip/⚙ (§D) · CSS (`.dk-section`/`.dk-shead`/`.dk-diagram`/`.dk-titlebar`/`.dk-locked`) · hint copy · aria strings · ส่ง spec นี้ (ไม่แก้ไฟล์พร้อม dev)
- **4 ข้อ P'Aim:** §A ไอคอนครบ · §B การ์ด section (obvious) · §C popup ลากได้ · **§D grip+⚙ ยึดล่างซ้าย ตายตัว**
- **mobile:** ปัจจุบัน panel = `settingItems` ล้วน (ไม่ reorder) → **ใส่ header กลุ่มได้ (อ่านง่ายขึ้น) แต่ปัญหา ▲▼ = desktop** · ขอบเขตนี้เน้น desktop (ที่ reorder อยู่) · mobile คงพฤติกรรมเดิม
- **2-host (พระคำ):** grouping = presentational · ไม่กระทบ island (พระคำ dock เล็ก · ไม่เปิด reorder) — ยืนยันตอน dev build

---

## 8 · ⛔ ที่ยังไม่ทำ
ไม่เขียนโค้ด/ไม่ merge · spec นี้ + P'Aim เคาะ → dev implement บน `dock-resize` → tester → P'Aim

*Design (SA+UX) · verify โค้ดจริง `dock-resize` `0c0f7c9` · presentational grouping · reuse reorder/pin เดิม*
