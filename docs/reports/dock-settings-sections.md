# Design — ⚙ Settings แบ่งส่วนตามแถวจริงของ dock (map panel → dock rows)

**PM:** pm28 · **P'Aim ขอ** · **design-first · ⛔ ไม่เขียนโค้ด** · base = `dock-resize` (`DockKey.vue` · dev lane — Design ส่ง spec ไม่แตะไฟล์)
**verify โค้ดจริง** `dock-resize` @ `0c0f7c9` (`panelItems`/`row1`/`row2`/`pinnedItems`/`barRowOf`/`moveOrder`/`movePin`/`togglePin`/`toggleOff`) · Design 2026-07-18

---

## 0 · สรุป (ฟันธง · อ่าน 30 วิ)

**ปัญหา (P'Aim):** ⚙ = ลิสต์แบนเรียงรวด · กด ▲▼ **ไม่รู้ปุ่มอยู่/จะไป "แถวไหน" ของ dock จริง**

**ฟันธง:** **จัด `panelItems` เป็น section ตาม "แถวจริง" ของ dock (บนลงล่าง = mirror จอ)** พร้อม **header + เส้นแบ่ง + แผนภาพ dock ย่อ** → ลิสต์กลายเป็น "แผนที่ของแถบจริง" · **▲▼ = เรียงภายในแถวของตัวเอง** (ปุ่มไม่ข้ามแถว = ตามโค้ดจริง `barRowOf`) → หายงงทันที
**ไม่แตะ logic reorder/pin** — grouping + header ล้วน (presentational) · dev แค่ group ตาม `sectionOf(it)` + render header · **low-risk**

---

## 1 · โครง dock จริง (verify) = section ที่ต้อง mirror

DockKey เรนเดอร์ **บน→ล่าง:** `keysBands` → pinned rows → `row2` → `row1` (chrome ติดขอบจอล่าง) · panel ควรเรียง **ลำดับเดียวกัน** = แผนที่ตรงตัว (natural mapping · Norman)

| section (บน→ล่าง) | มาจาก (โค้ด) | ในนั้นทำอะไรได้ |
|---|---|---|
| **1. แป้นสัญลักษณ์** | `keysBands` (kind `keys` · `NEVER_MANAGE`) | อ่านอย่างเดียว (คงที่ · บนสุด) — โชว์ให้แผนที่ครบ |
| **2. ปุ่มปักหมุด** | `isPinned(id)` (pinned rows) | ▲▼ = `movePin` · 📌 = ถอน (→ ลิ้นชัก) |
| **3. แถวสั่งงาน (แถว 2)** | `place.row===2` & ไม่ `isOff` | ▲▼ = `moveOrder` ในแถว 2 · 📌 ถอน (ถ้า manageable) |
| **4. แถวหลัก (แถว 1)** | `place.row===1` & ไม่ `isOff` | ▲▼ = `moveOrder` ในแถว 1 · grip/⚙ ย้ายได้ **ถอนไม่ได้** |
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

## 3 · Mockup (panel มี section · desktop)

```
┌─ ⚙ ตั้งค่าแถบเครื่องมือ ─────────────────────┐
│  ┌ แผนภาพแถบ (mirror) ┐                       │
│  │ ▔▔▔ แป้นสัญลักษณ์   │  ← หัวแผนที่ กดเลื่อนไปหมวด │
│  │ ▭▭  ปักหมุด         │                       │
│  │ ▭▭▭ สั่งงาน          │                       │
│  │ ▭▭▭▭ หลัก (grip…⚙)  │                       │
│  └────────────────────┘                       │
│                                               │
│ ▎แป้นสัญลักษณ์  · อยู่บนสุด · คงที่            │  ← section header + hint
│   🎹 แป้นโน้ต                        (คงที่)   │
│ ─────────────────────────────────────────    │
│ ▎ปักหมุด  · เหนือแถวสั่งงาน                    │
│   🔊 เสียงดนตรี            [▲][▼]      📌●     │
│ ─────────────────────────────────────────    │
│ ▎แถวสั่งงาน (แถว 2)                            │
│   💾 บันทึก               [▲][▼]      📌●     │
│   📝 บันทึกร่าง            [▲][▼]      📌●     │
│ ─────────────────────────────────────────    │
│ ▎แถวหลัก (แถว 1) · ล่างสุด ติดขอบจอ            │
│   ⠿ ย้าย/ย่อ (grip)      [▲][▼]      🔒       │
│   ↩ ย้อน                 [▲][▼]      📌●     │
│   ↪ ทำซ้ำ                [▲][▼]      📌●     │
│   ▶ ฟังท่อน              [▲][▼]      📌●     │
│   ⚙ ตั้งค่า (gear)        [▲][▼]      🔒       │
│ ─────────────────────────────────────────    │
│ ▎ยังไม่อยู่บนแถบ · แตะ 📌 เพิ่ม                │
│   ⬇ ดาวน์โหลด                        📌○     │
│   ⛶ ดูผลทั้งเพลง                      📌○     │
└───────────────────────────────────────────────┘
```
- **หัวแผนภาพ** = dock ย่อ 4 ชั้นตามจริง → เห็นทันทีว่าแต่ละ section = แถวไหนบนจอ (natural mapping)
- **section header** = ชื่อ + **hint ตำแหน่ง** ("ล่างสุด ติดขอบจอ") + เส้นแบ่ง (Gestalt common-region)
- **▲▼ อยู่ในกรอบ section** → ชัดว่าเลื่อนได้แค่ในแถวนี้ (ปุ่มไม่กระโดดข้ามแถว)
- **🔒** = grip/⚙ ย้ายได้แต่ถอนไม่ได้ (แทน 📌 ที่กดไม่ได้ · สื่อ "ล็อกบนแถบ")
- **📌● / 📌○** = อยู่บนแถบ / เพิ่มได้ (คงสัญลักษณ์เดิม · P'Aim เคยปฏิเสธ ✕/＋)

## 4 · พฤติกรรม ▲▼ (แก้จุดที่ P'Aim งง)

- **ในแต่ละ section, ▲▼ เรียงเฉพาะภายในแถวนั้น** (`moveOrder`=row1/row2 · `movePin`=pinned) — ตรงกับโค้ด `barRowOf` (ปุ่มมี "บ้าน" คือแถวของมัน ย้ายข้ามแถวไม่ได้ = ดีไซน์ · grip ต้องอยู่แถว 1 ซ้าย)
- **ทำไมย้ายข้ามแถวไม่ได้ = ถูก:** แต่ละแถวมีบทบาท (หลัก/สั่งงาน) · การ section ทำให้ **ข้อจำกัดนี้มองเห็นได้** แทนที่จะซ่อนในลิสต์แบน → นี่คือคำตอบตรงปัญหา
- **ย้าย "ออก/เข้า" แถบ = 📌** (row/pinned ↔ ลิ้นชัก) — ปุ่มเลื่อน section อัตโนมัติเมื่อกด 📌 (เห็นมันวิ่งไปอยู่หมวดใหม่ = feedback)
- **ปลายแถว** = ▲/▼ disabled (มีแล้ว `reIndex===0`/`reLen-1`) — ไม่หลุด section

## 5 · a11y (WCAG · บังคับ · อ้างมาตรฐานเอง)

- **section = `role="group"` + `aria-labelledby`=header** · header = `role="heading"`/`<h3>` (WAI-ARIA APG grouping · WCAG **1.3.1 Info & Relationships** — สื่อโครงด้วย markup ไม่ใช่แค่เส้น)
- **▲▼ aria-label ระบุตำแหน่ง+หมวด:** "เลื่อนขึ้น · บันทึกร่าง ตำแหน่ง 2 จาก 2 ในแถวสั่งงาน" (WCAG **4.1.2** Name/Role/Value)
- **ประกาศผลย้าย** ผ่าน live region (`aria-live="polite"`): "ย้ายบันทึกร่างเป็นตำแหน่ง 1 ในแถวสั่งงาน" (WCAG **4.1.3** Status Messages) — reorder-by-button = keyboard-accessible (WCAG **2.1.1**, ดีกว่า drag)
- **🔒 grip/⚙:** `aria-disabled`/บอก "ล็อกบนแถบ ถอนไม่ได้" (ไม่ใช่แค่ไอคอน)
- ปุ่มทุกตัว ≥44px (WCAG 2.5.5 · มีแล้วใน `.dk-mv`/`.dk-pin` — Design ยืนยันคงไว้)

## 6 · มาตรฐานอ้างอิง (อ่านเอง · ไม่ Gemini)

- **grouped settings list + section header/divider = แพตเทิร์นมาตรฐาน:** [Apple HIG — Lists (grouped/inset · Settings)](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) · [Material — List subheaders & dividers](https://m3.material.io/components/lists/guidelines) · Gestalt **common region + proximity** (เส้น/กรอบ = จัดกลุ่มการรับรู้)
- **natural mapping (panel ↔ ตำแหน่งจริงบนจอ):** Norman, *The Design of Everyday Things* — control layout ควร map กับสิ่งที่มันคุมเชิงพื้นที่ → แผนภาพ dock ย่อ + เรียง section บน→ล่างตามจอ
- **reorder ด้วยปุ่ม + ประกาศตำแหน่ง (ไม่พึ่ง drag):** [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) · WCAG 2.1.1 / 4.1.3 — keyboard+touch เข้าถึง, screen reader รู้ผล
- **1.3.1 Info & Relationships:** [WCAG](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html) — โครงกลุ่มต้องอยู่ใน markup (group/heading) ไม่ใช่แค่ภาพ

## 7 · dev contract (§3.0 · Design ส่ง spec · dev = DockKey lane)

- **dev (logic):** `sectionOf(it)` + `sections` computed (group `panelItems` · §2) + live-region ประกาศผลย้าย · **ไม่แตะ** `moveOrder`/`movePin`/`togglePin`/`toggleOff` (reorder เดิมทำงานต่อ)
- **Design (presentation):** template header + เส้นแบ่ง + แผนภาพ dock ย่อ + CSS (`.dk-section`/`.dk-shead`/`.dk-diagram`) + 🔒 state + hint copy + aria strings · ส่งเป็น spec นี้ (ไม่แก้ไฟล์พร้อม dev)
- **mobile:** ปัจจุบัน panel = `settingItems` ล้วน (ไม่ reorder) → **ใส่ header กลุ่มได้ (อ่านง่ายขึ้น) แต่ปัญหา ▲▼ = desktop** · ขอบเขตนี้เน้น desktop (ที่ reorder อยู่) · mobile คงพฤติกรรมเดิม
- **2-host (พระคำ):** grouping = presentational · ไม่กระทบ island (พระคำ dock เล็ก · ไม่เปิด reorder) — ยืนยันตอน dev build

---

## 8 · ⛔ ที่ยังไม่ทำ
ไม่เขียนโค้ด/ไม่ merge · spec นี้ + P'Aim เคาะ → dev implement บน `dock-resize` → tester → P'Aim

*Design (SA+UX) · verify โค้ดจริง `dock-resize` `0c0f7c9` · presentational grouping · reuse reorder/pin เดิม*
