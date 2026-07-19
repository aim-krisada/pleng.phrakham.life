# Design — ⚙ Settings แบ่งส่วนตามแถวจริงของ dock (map panel → dock rows)

**PM:** pm28 · **P'Aim ขอ** · **design-first · ⛔ ไม่เขียนโค้ด** · base = `dock-resize` (`DockKey.vue` · dev lane — Design ส่ง spec ไม่แตะไฟล์)
**verify โค้ดจริง** `dock-resize` @ `0c0f7c9` (`panelItems`/`row1`/`row2`/`pinnedItems`/`barRowOf`/`moveOrder`/`movePin`/`togglePin`/`toggleOff`) · Design 2026-07-18

---

## 0 · สรุป (ฟันธง · อ่าน 30 วิ)

**ปัญหา (P'Aim):** ⚙ = ลิสต์แบนเรียงรวด · กด ▲▼ **ไม่รู้ปุ่มอยู่/จะไป "แถวไหน" ของ dock จริง**

**ฟันธง:** **จัด `panelItems` เป็น section ตาม "แถวจริง" ของ dock (บนลงล่าง = mirror จอ)** พร้อม **header เด่น + การ์ดแยก section + hint ตำแหน่ง** → ลิสต์กลายเป็น "แผนที่ของแถบจริง" · **▲▼ = เรียงภายในแถวของตัวเอง** (ปุ่มไม่ข้ามแถว = ตามโค้ดจริง `barRowOf`) → หายงงทันที
**ไม่แตะ logic reorder/pin** — grouping + header ล้วน (presentational) · dev แค่ group ตาม `sectionOf(it)` + render header · **low-risk**

**อัปเดต (P'Aim รีวิว 18 ก.ค. · fold 4 ข้อ):** §A **ไอคอนครบทุกแถว** (grip/⚙/ดาวน์โหลด ตอนนี้ช่องไอคอนว่าง) · §B **section แยกให้เด่น** (P'Aim: "not obvious" — เส้นบางไม่พอ → การ์ด/พื้นหลัง) · §C **⚙ = หน้าต่างลอยอิสระ + ขยายเต็มจอ** (revise: ไม่ผูก dock · ลากทั่วจอ clamp หลวม · ⛶ maximize · **เรียบง่าย ตัดของประดับ**) · §D **grip+⚙ ยึดแถวล่างสุด ซ้าย-ติดกัน ตายตัว** (grip ซ้ายสุด · ⚙ ติดขวา grip · ตัด ▲▼ — ต่างจาก §C: §D = ปุ่มบนแถบ · §C = หน้าต่าง popup)

> **🔴 กฎ fixed/movable (P'Aim ยืนยัน final · หัวใจ):** **ยึดที่มีแค่ 2 = grip + ⚙** (ไม่ ▲▼ ไม่ 📌) · **ปุ่มอื่น *ทุกตัว* = ย้ายได้ (▲▼) + ถอนได้ (📌 พินแดง) — ทุก section ต้องมี 📌** · **แก้ที่ผิด:** `soundctl`(เสียงดนตรี) + `export`(ดาวน์โหลด) = kind `slot` → โค้ดล็อกถอนไม่ได้ (อยู่ใน `NEVER_MANAGE` ผ่าน `SLOT_KINDS`) = **ผิดกฎ** → slot ต้องถอน/ย้ายได้เหมือนปุ่มปกติ (การวาด slot cell = คนละเรื่องกับ removability) · **keypad (แป้นสัญลักษณ์) = P'Aim เคาะแล้ว: ถอด/ย้ายได้ทั้ง unit** (📌 + ▲▼ ระดับ band · ถอด = ไม่มีแป้นโน้ต · เพิ่มกลับใน ⚙ · P'Aim ยอมรับ)

---

## 1 · โครง dock จริง (verify) = section ที่ต้อง mirror

DockKey เรนเดอร์ **บน→ล่าง:** `keysBands` → pinned rows → `row2` → `row1` (chrome ติดขอบจอล่าง) · panel ควรเรียง **ลำดับเดียวกัน** = แผนที่ตรงตัว (natural mapping · Norman)

| section (บน→ล่าง) | มาจาก (โค้ด) | ในนั้นทำอะไรได้ |
|---|---|---|
| **1. แป้นสัญลักษณ์** | `keysBands` (kind `keys`) | **ถอด/ย้ายได้ทั้ง unit** (📌 ถอดทั้ง band + ▲▼ ระดับ band) · ถอด→ไม่มีแป้นโน้ต เพิ่มกลับใน ⚙ |
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
- **keypad เป็น 1 แถว unit** ใน section แรก (📌+▲▼ ระดับ band · §5C-keypad) — ให้แผนที่ครบทุกแถวจริง
- section ว่าง = ซ่อน (เช่น ไม่มี pinned)

## 3 · Mockup (⚙ = หน้าต่างลอย · เรียบ · section cards · desktop)

```
╔═ ⚙ ตั้งค่าแถบเครื่องมือ   …ลากที่แถบนี้…   ⛶  ✕ ═╗  ← TITLE BAR: ลากทั้งหน้าต่าง (§C) · ⛶ เต็มจอ · ✕ ปิด
║ ╭───────────────────────────────────────╮  ║  ← §B: การ์ด section (common-region)
║ │ ▩ แป้นสัญลักษณ์ (ทั้งชุด) [▲][▼]   📌● │  ║  ← 1 unit: ถอด/ย้ายได้ทั้ง band
║ │  🎹 โน้ต · จุด · เขบ็ต …        (ตัวอย่าง) │  ║
║ ╰───────────────────────────────────────╯  ║
║ ╭───────────────────────────────────────╮  ║
║ │ 📌 ปักหมุด  · เหนือแถวสั่งงาน            │  ║
║ │  (ยังไม่มี — แตะ 📌 ปุ่มไหนก็ปักมาที่นี่) │  ║  ← empty-state (โชว์ section เสมอ)
║ ╰───────────────────────────────────────╯  ║
║ ╭───────────────────────────────────────╮  ║
║ │ ▤ แถวสั่งงาน (แถว 2)                    │  ║
║ │  💾 บันทึก             [▲][▼]     📌● │  ║
║ │  ⬇ ดาวน์โหลด (export)  [▲][▼]     📌● │  ║  ← slot: มี 📌 แล้ว (แก้ที่ผิด) + ⬇ (§A)
║ ╰───────────────────────────────────────╯  ║
║ ╭───────────────────────────────────────╮  ║
║ │ ▤ แถวหลัก (แถว 1) · ล่างสุด ติดขอบจอ    │  ║
║ │  ⠿ ย้าย/ย่อ                 🔒 ยึดที่ │  ║  ← §D: grip ซ้ายสุด · ตายตัว (ไม่มี ▲▼/📌)
║ │  ⚙ ตั้งค่า                   🔒 ยึดที่ │  ║  ← §D: ⚙ ติดขวา grip · ตายตัว · §A ไอคอน settings
║ │  ┈┈┈┈ ↓ ปุ่มด้านล่างเลื่อน+ถอนได้ ↓ ┈┈ │  ║
║ │  🔊 เสียงดนตรี (slot)  [▲][▼]     📌● │  ║  ← slot: มี 📌 แล้ว (แก้ที่ผิด)
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
- **title bar** (§C) = ลากทั้งหน้าต่างไปทั่วจอ · **⛶ = ขยายเต็มจอ** (กดกลับ = คืนขนาด) · **✕ = ปิด** · เรียบ ไม่มีของประดับ (ตัด ↺/แผนภาพ ตาม P'Aim "ไม่หล่อเกิน")
- **การ์ด section** (§B) = พื้นหลัง/กรอบมน + header เด่น (ตัวหนา + ไอคอนหมวด) + เว้นช่องระหว่างการ์ด → แยก **obvious** (Gestalt common-region · ไม่ใช่แค่เส้น)
- **ไอคอนครบทุกแถว** (§A) — grip=⠿ · ⚙=settings · ดาวน์โหลด=⬇ (เดิม `.dk-mi` ว่าง)
- **▲▼ อยู่ในการ์ด section** → เลื่อนได้แค่ในแถวนี้ (ไม่ข้ามแถว)
- **🔒 = grip/⚙ เท่านั้น** (ยึดที่ · ไม่ ▲▼ ไม่ 📌) — **ยกเว้นแค่ 2 นี้** · **ปุ่มอื่นทุกตัว (รวม slot 🔊/⬇) = ▲▼ + 📌** · **📌●**=อยู่บนแถบ · **📌○**=เพิ่มได้ · ทุก section มี 📌

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

## 5C · ⚙ = หน้าต่างจริง เคลื่อนย้ายอิสระ + ขยายเต็มจอ (P'Aim revise · **เรียบง่าย ห้าม over-design**)

**P'Aim (ดู build จริง):** *"ลากได้ไม่ครบ · ไม่ต้องหล่อกว่า · หน้าเซ็ตติ้งไม่ต้องยึดกับกล่อง · ให้เป็นวินโดว์ของมันที่เคลื่อนย้ายง่ายๆ ดูเต็มจอง่ายๆ"*
**ปัญหาเดิม:** ⚙ = popover **anchor กับ dock + clamp แน่นในจอ** → ลากได้จำกัด
**เป้า:** หน้าต่างธรรมดา อิสระ ง่าย (ไม่ประดับเกิน)

1. **standalone window — ไม่ผูก dock:** เปิดมา **ลอยกลางจอ** (ไม่ anchor ใต้ ⚙) · เป็น element ของตัวเอง (ยก `.dk-panel` ออกจาก popover-ที่-เกาะ-dock → floating window · position:fixed + `panelPos` เริ่ม = กึ่งกลาง)
2. **ลากได้ทั่วจอ (clamp หลวม):** title bar ลากไปไหนก็ได้ · **ตัด clamp เข้ม** — เหลือแค่ **กัน title bar หลุดจนจับไม่ได้** (เก็บแถบหัว ≥ ~40px ในจอเสมอ = ลากกลับได้) · ไม่บังคับให้ทั้งกล่องอยู่ในจอ (P'Aim: "ลากได้ครบ")
3. **⛶ ปุ่มเต็มจอ (maximize/restore):** กด → หน้าต่างขยายเต็ม viewport (เห็นทุก section · scroll ถ้ายาว) · กดอีกที = กลับขนาด+ตำแหน่งเดิม · **1 ปุ่ม toggle**
4. **title bar เรียบ:** `⚙ ตั้งค่าแถบเครื่องมือ …ลากที่แถบนี้… ⛶ ✕` — แค่ ชื่อ + เต็มจอ + ปิด (**ตัด ↺ reset · ตัดแผนภาพประดับ** — เอาที่จำเป็น)
5. **a11y (มาตรฐาน window/dialog):** `role="dialog"` + `aria-label` · **Esc ปิด** · focus เข้าหน้าต่างตอนเปิด → คืนโฟกัสให้ ⚙ ตอนปิด · ลากด้วยคีย์บอร์ด (title bar focus + ลูกศรขยับ) · **non-modal** (เห็น/แก้ dock หลังได้) — [WAI-ARIA APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
6. **reuse:** drag = pattern เดียวกับ grip-drag (`pointerdown/move/up`+`panelPos`) แค่ clamp หลวม · **mobile คงเดิม** (เต็มจอ/sheet อยู่แล้ว · P'Aim ยืนยัน)

**⛔ ตัดออก (P'Aim "ไม่หล่อเกิน"):** แผนภาพ dock ย่อ (§3 เดิม) · ปุ่ม ↺ reset · เอฟเฟกต์ประดับ → หน้าต่าง = กรอบ + title bar + section cards เท่านั้น

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
- **natural mapping (panel ↔ ตำแหน่งจริงบนจอ):** Norman, *The Design of Everyday Things* — control layout ควร map กับสิ่งที่มันคุมเชิงพื้นที่ → **เรียง section บน→ล่างตามจอ + hint ตำแหน่งในหัว section** (ทำแผนที่โดยลำดับ+ป้าย ไม่ต้องมีแผนภาพประดับ · เรียบ)
- **reorder ด้วยปุ่ม + ประกาศตำแหน่ง (ไม่พึ่ง drag):** [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) · WCAG 2.1.1 / 4.1.3 — keyboard+touch เข้าถึง, screen reader รู้ผล
- **1.3.1 Info & Relationships:** [WCAG](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html) — โครงกลุ่มต้องอยู่ใน markup (group/heading) ไม่ใช่แค่ภาพ
- **การ์ด/inset group เด่นกว่าเส้น (§B):** [Apple HIG — inset-grouped lists](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) · [Material — cards/containers](https://m3.material.io/components/cards) · WCAG **1.4.11** Non-text Contrast (กรอบ/พื้น ≥3:1) · Gestalt common-region > line
- **ไอคอนต่อรายการ = scannability (§A):** ทุกแถวมี glyph นำ → กวาดตาเร็ว (NN/g icon+label) · lucide id มีจริง [[reference_lucide_icons]]
- **standalone movable + maximize window (§C):** title bar = ที่จับลาก + ปุ่มเต็มจอ = แพตเทิร์นหน้าต่างสากล (desktop window · movable/maximize/close · Esc + focus return) · [WAI-ARIA APG — dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) · keyboard-move (WCAG 2.1.1) · **เรียบง่าย** = ตัด reset/diagram (P'Aim "ไม่หล่อเกิน" · KISS)

## 7 · dev contract (§3.0 · Design ส่ง spec · dev = DockKey lane)

- **dev (logic):** `sectionOf(it)` + `sections` computed (§2) + `panelIcon(it)` fallback (§A) + live-region ผลย้าย + **standalone window** (§C: ยก `.dk-panel` ออกจาก popover-เกาะ-dock → floating `position:fixed` + `panelPos` เริ่มกึ่งกลาง · drag ที่ title bar · **clamp หลวม** เก็บแค่ title bar ≥40px ในจอ · **⛶ maximize/restore toggle** · Esc + focus-return) + **§D dock layout:** ⚙ anchor `right`→`rightOf:grip` · `canReorder` กัน grip/gear · `applyOrder` ล็อก grip=0/⚙=1 · **🔴 กฎ fixed (P'Aim เคาะเต็ม):** **`NEVER_MANAGE = ['grip','gear']` เท่านั้น** (เอา `SLOT_KINDS`+`keys` ออกทั้งคู่) → soundctl/export (slot) ถอน/ย้ายได้ · **keypad band ถอด/ย้ายได้ทั้ง unit** (📌+▲▼ ระดับ band · toggleOff ทั้งชุด · ถ้ามี band เดียว ▲▼ disabled) · `isManageable` slot/keys=true → ได้ 📌 · slot cell drawing (#cell-*) แยกจาก removability · **ไม่แตะ** `movePin`/`togglePin`/`toggleOff`/`moveOrder` (เดิมทำงานต่อ)
- **Design (presentation):** template — title bar เรียบ (drag + ⛶ + ✕ · **ไม่มีแผนภาพ/↺**) · การ์ด section + header เด่น (§B) · ไอคอนทุกแถว (§A) · 🔒"ยึดที่" grip/⚙ (§D) · maximize layout (เต็ม viewport + scroll) · CSS (`.dk-window`/`.dk-titlebar`/`.dk-section`/`.dk-shead`/`.dk-locked`) · hint copy · aria strings · ส่ง spec นี้ (ไม่แก้ไฟล์พร้อม dev)
- **4 ข้อ P'Aim:** §A ไอคอนครบ · §B การ์ด section (obvious) · §C popup ลากได้ · **§D grip+⚙ ยึดล่างซ้าย ตายตัว**
- **mobile:** ปัจจุบัน panel = `settingItems` ล้วน (ไม่ reorder) → **ใส่ header กลุ่มได้ (อ่านง่ายขึ้น) แต่ปัญหา ▲▼ = desktop** · ขอบเขตนี้เน้น desktop (ที่ reorder อยู่) · mobile คงพฤติกรรมเดิม
- **2-host (พระคำ):** grouping = presentational · ไม่กระทบ island (พระคำ dock เล็ก · ไม่เปิด reorder) — ยืนยันตอน dev build

---

## 8 · ⛔ ที่ยังไม่ทำ
ไม่เขียนโค้ด/ไม่ merge · spec นี้ + P'Aim เคาะ → dev implement บน `dock-resize` → tester → P'Aim

*Design (SA+UX) · verify โค้ดจริง `dock-resize` `0c0f7c9` · presentational grouping · reuse reorder/pin เดิม*
