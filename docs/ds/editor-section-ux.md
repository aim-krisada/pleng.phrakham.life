# DS — โหมดแก้ไข: จัดการท่อน/ข้อ ให้เข้าใจง่ายระดับสากล

US: `docs/us/editor-section-ux.md` · visual: `docs/design/editor-section-ux.html` · ต่อยอด `docs/ds/ps3-editor.md`
ไฟล์ที่แตะ (คาด): **`src/components/EditorMode.vue` ไฟล์เดียว** (template + script ส่วน rail/arrangement/lens + `<style scoped>`) · **ไม่แตะ** `notation.js` · `songModel.js` · schema.

## ✅ P'Aim เคาะแล้ว (10 ก.ค.) — ล็อกก่อนเขียนโค้ด
1. ตัดบล็อกล่าง `#pk-arrange` ทิ้ง · 2. แถวหลัก = **“ท่อน”** · 3. ทำนองเบื้องหลัง · 4. ลาก + ▲▼ · 5. **ไส้ในเดิมเหมือนเดิม** (ดู §🚧 กำแพงกันของเดิม ล่างสุด — regression gate ก่อน merge)

**คำเรียก (แก้ปมชนคำ):** ในโค้ด `stanza` = melody, `arrangement row` = section — ชื่อภายในไม่เปลี่ยน. ที่ **UI**:
- **“ท่อน”** = arrangement row (ตัวหลัก · ชื่อ = `row.label`) · header รายการ = **“โครงเพลง”** · ปุ่ม = “เพิ่มท่อน”
- **“ทำนอง X”** = stanza (เบื้องหลัง · ป้าย ♪X) — **เปลี่ยน label UI เดิม “ท่อน A” → “ทำนอง A”** ทุกจุด: rail กลุ่มทำนอง + `stanzaIdOptions` (`'ท่อน '+id` → `'ทำนอง '+id`) + breadcrumb/crumbLabel + tip/help ที่พูดว่า “ท่อน” หมายถึง melody

## ยึดหลัก
- **โมเดล v2 ไม่เปลี่ยน** — `stanzas[]` (ทำนอง) + `arrangement[]` (`{stanza,label,syllables,key}`) เหมือนเดิม. งานนี้คือ **จัดวาง UI ใหม่รอบข้อมูลเดิม**.
- แก้ชื่อ = เขียน `arrangement[i].label` · จัดลำดับ = `moveRow`/splice บน `arrangement` (มี `moveRow(i,dir)` แล้ว) · เลือกท่อน = ตั้ง `lensChoice = i` (มีแล้ว).
- ของที่มีอยู่แล้วและ **reuse ได้**: `moveRow`, `addRow`, `removeRow`, `rowLabel`, `lensChoice`, `rowStatus`, `stanzaIdOptions`, `rowKeyOptions`, `railSelectRow`.

## โครงใหม่ของ rail (SX1)
แทน template 3 กลุ่ม (`ทำนอง` / `เนื้อร้อง` / `ขั้นสูง`→ลำดับเพลง) ด้วย:
```
โครงเพลง (v-for arrangement)               ← รายการหลัก (เดิม = กลุ่ม "เนื้อร้อง")
  [grip] [n.] [ชื่อ inline] [♪stanza] [▲▼] [⋯]
  + เพิ่มท่อน  (= addRow)
—
ทำนอง (โน้ต) ▸  (collapsible, default ยุบ)  ← เดิม = กลุ่ม "ทำนอง"
  ท่อน A/B... + เพิ่มทำนอง (= addStanza/removeStanza/selectStanza)
```
- **ลบ** template ของบล็อกล่าง `#pk-arrange` (`<h3>📜 ลำดับเพลง</h3>` + `.arr-row` loop + “+ เพิ่มข้อ”) ทั้งก้อน — ฟังก์ชันย้ายมา rail + หัวท่อน (SX1: ตัดบล็อกล่าง).
- ป้ายกลุ่ม “ขั้นสูง” → ลบ.

## แก้ชื่อ in-line (SX2)
- state ใหม่: `editingLabelId = ref(-1)` (index ของ arrangement row ที่กำลังแก้ชื่อ; -1 = ไม่มี).
- render: ถ้า `editingLabelId === i` → `<input>` (autofocus, v-model ผูก `arrangement[i].label`); ไม่งั้น `<span>` ชื่อ (คลิก = ตั้ง `editingLabelId=i`).
- `@keydown.enter` / `@blur` → commit (`editingLabelId=-1`) · `@keydown.esc` → ยกเลิก (revert ค่าเดิม; เก็บ snapshot ก่อนแก้).
- ทำ component/ฟังก์ชันร่วม ใช้ทั้งใน **rail row และ หัวท่อนบนแคนวาส** (ผูก field เดียว = sync อัตโนมัติ, แก้ P1/P5).
- แสดง affordance: `.sname:hover{background:cream;cursor:text}` · มี `aria-label="แก้ชื่อท่อน"` บน input.

## จัดลำดับ ลาก + ▲▼ (SX3)
- **▲▼**: reuse `moveRow(i,dir)` (มีแล้ว · เรียก `resetLens`). วางที่ rail row **และ** หัวท่อน. ปุ่มขอบ `:disabled`.
- **Drag (เมาส์):** HTML5 DnD (`draggable`, `dragstart/dragover/drop`) บน rail row → คำนวณ from/to → splice `arrangement` → `sel`/lens ตาม.
- **Drag (touch):** pointer events บนที่จับ ⠿ (`touch-action:none`) → ติดตาม `clientY` หา row เป้าหมาย → splice. (ดู prototype JS ใน mockup เป็นแนว — dev ทำให้แกร่งขึ้น: auto-scroll, aria-live บอกตำแหน่ง.)
- **WCAG 2.2 §2.5.7:** ลากทุกจุดต้องมี ▲▼ แทนได้ (คงไว้เสมอ · ห้ามลากอย่างเดียว).

## เลือกท่อน = เห็นเนื้อ (SX4)
- ปัจจุบัน `lensChoice=-1` = ซ่อนเนื้อ → เปลี่ยน default: เมื่อเลือก arrangement row ให้ `lensChoice=i` (ผ่าน `railSelectRow`/คลิกท่อน) และเมื่อ activeStanza เปลี่ยนให้ `resetLens()` ชี้แถวแรกที่ใช้ stanza นั้น (มี `resetLens` แล้ว — ตรวจว่าไม่ตั้ง -1 โดยไม่ตั้งใจ).
- ผลลัพธ์: เลือกท่อน → ช่องคำใต้โน้ตโผล่ (โค้ด `sylCells`/`syl-boxes` เดิมทำงานต่อ). พาเนลย่อหน้า E4 คงเดิม.

## ทำนองเป็นสมบัติ (SX5)
- **เพิ่มท่อน (addRow ปรับ):** ปัจจุบัน `addRow` ผูก `activeStanzaId || stanzas[0].id`. คงพฤติกรรม “ได้ทำนองทันที” · ตัวเลือก (เคาะกับ P'Aim ข้อ 3): เพิ่มท่อน → สร้าง stanza ใหม่อัตโนมัติ **หรือ** ใช้ stanza ของท่อนก่อนหน้า. แนะนำ: **ใช้ stanza ของท่อนก่อนหน้าเป็น default** (ท่อน 2 มักทำนองเดียวกับท่อน 1) + ป้าย ♪ ให้เปลี่ยนได้.
- **ป้าย ♪X:** ปุ่ม/ComboSelect เล็กบนแถว = `arrangement[i].stanza` (reuse `stanzaIdOptions`) · เมนูมี “+ ทำนองใหม่” (= addStanza แล้ว point ท่อนนี้ไปที่มัน).
- **แก้/เพิ่มทำนองตรง ๆ:** อยู่ในส่วน “ทำนอง (โน้ต)” ที่ยุบไว้ (reuse selectStanza/addStanza/removeStanza).

## Responsive (SX6)
- **PC (≥ ~900px):** rail ค้าง (เดิม `.rail` sticky) · หัวท่อน `.cshead` ถือ grip+ชื่อ+♪+▲▼+⋯.
- **มือถือ:** rail = drawer เดิม · หัวท่อนบนแคนวาสถือ แก้ชื่อ+▲▼ (ทำได้โดยไม่เปิด drawer) · เปิด “โครงเพลง” เต็มเป็น drawer/bottom-sheet เพื่อกระโดด. ปุ่ม ≥44px. flex-wrap หัวท่อนบนจอแคบ.
- ทดสอบ 375 / 768 / 1280 (memory `pleng-ui-sop`).

## WCAG / คุณภาพ
- ปุ่มแตะ ≥24×24 (§2.5.8; เราใช้ ≥44 ตาม SOP) · โฟกัสน้ำตาลเห็นชัดทุกจุด (ชื่อ inline, grip, ▲▼, ♪, ⋯).
- ชื่อ inline: `aria-label` + Enter/Esc keyboard. Drag: มี ▲▼ fallback (§2.5.7) + `aria-live` แจ้งลำดับใหม่.
- label จริงทุก input (ไม่พึ่ง placeholder). `lang="th"`.
- อัปเดต `/guide` ถ้ามีข้อความ how-to เปลี่ยน (Guide-sync rule).

## ทดสอบ (ให้ dev/QA)
- แก้ชื่อท่อนในแถบซ้าย → หัวท่อน + ที่อื่นเปลี่ยนตาม (P1).
- ลาก/▲▼ จัดลำดับ → arrangement เปลี่ยนลำดับจริง + preview/สҫheet ตาม.
- เลือกท่อนใหม่ → ช่องคำโผล่ทันที ไม่ต้องกดเปิด (P4).
- เพิ่มท่อน → พิมพ์โน้ต/คำได้ทันที ไม่ต้องเข้าใจ “เลือกทำนอง” (P8).
- มือถือ 375: แก้ชื่อ+เลื่อนท่อนได้โดยไม่เปิด drawer.
- regression: เพลง import v2 (เช่นเพลง 100) โหลด/บันทึกได้เหมือนเดิม.

## 🚧 กำแพงกันของเดิม (P'Aim ย้ำ: “ไส้ในต้องเหมือนเดิม” · = US SX7 · regression gate)
งานนี้ **ห้ามแตะพฤติกรรม/มาร์กอัปของ** ส่วนแก้ไข-ราย ห้อง/บรรทัด. เปลี่ยนได้เฉพาะ **ชั้นจัดการท่อน** (rail · rename · reorder · ตัด `#pk-arrange` · lens default). แนวปฏิบัติ:

**❌ ห้ามแก้ (คงพฤติกรรม + โครง DOM/handler เดิม — เป็นได้แค่ย้ายตำแหน่ง ไม่ใช่รื้อ):**
- ช่องโน้ต `NoteBoxes` · การ ripple/คีย์ (Enter/space/←→) · แถบสัญลักษณ์ `PALETTE`/`insertSym`/`activeInput`
- คอร์ด: `.chord-cell`/`.chord-btn`/`ComboSelect` picker · `openChord`/`applyChordAt` (split/merge)
- ช่องคำรายพยางค์: `sylCells`/`.syl-boxes`/`onSylKey`/`pushSlot`/`pullSlot`/`overflowSlots` · ตัวนับ `rowStatus`
- **การดู (สัญลักษณ์ inline):** `livePreview`/`.ed-bar-live` · ดูผลต่อห้อง `toggleBarShown`/`.ed-bar-render` · ดูผลทั้งเพลง `sheetWinOpen` float + `showSheet` overlay + `resolvedPreview`
- สถานะจังหวะ `barStatus`/`pickupCheck`/ห้องต่อกัน · เครื่องมือห้อง `.ed-bar-menu` (`moveBar`/`duplicateBar`/`removeBar`/`repeatStart`/`repeatEnd`/`volta`)
- โครงเพลงระดับบรรทัด: quick-struct (`qHook`/`qRepeat`/`qCopyLine`/`qDeleteLine`) · `.ed-more-menu` (section/cont/label) · จบเพลง `line.end` · `barLayout`
- ฟังเสียง `playStanza`/`playLine`/`playBar`/`playFull` + follow highlight
- แผง “📝 แก้เนื้อแบบย่อหน้า” (`paraOpen`/`rowLyricText`/`setRowLyricText`) — **ยังเป็นทางเลือกรอง คงไว้**
- การ์ดตั้งค่าเพลง (`#pk-settings`) · ตรวจแล้ว `markVerified` · migrate note · review banner
- save/draft/publish/approve/reject/delete · history · drafts panel · download/upload JSON · undo/redo · help (i)/(?) legend + ลิงก์คู่มือ

**✅ แก้เฉพาะนี้:**
- rail 3 กลุ่ม → “โครงเพลง” (ท่อน list) + “ทำนอง” (ยุบ, background) · เปลี่ยน label “ท่อน A”→“ทำนอง A”
- inline rename (`editingLabelId`) ที่ rail row + หัวท่อน · drag + ▲▼ reorder (`moveRow` + DnD/pointer)
- ตัด `#pk-arrange` block · ย้ายเลือกทำนอง(♪)/คีย์/ลำดับ/ลบ ไป rail/หัวท่อน
- lens default = ท่อนที่เลือก (ไม่ -1) · addRow default ทำนอง = ท่อนก่อนหน้า
- หัวท่อนบนแคนวาส `.cshead` (grip/ชื่อ/♪/▲▼/⋯) ครอบ “การ์ดกลุ่มบรรทัดของท่อนนั้น” โดย **ไส้ใน (บรรทัด/ห้อง) เดิมทั้งดุ้น**

> เกณฑ์ผ่าน: เปิดเพลง 100 → ทุกปุ่ม/ทุกการดูในไส้ในทำงานเท่ากับก่อน redesign (ทำ before/after checklist). ถ้าจำเป็นต้องแตะไส้ในเกินย้ายตำแหน่ง = หยุด ถาม PM/P'Aim ก่อน.
