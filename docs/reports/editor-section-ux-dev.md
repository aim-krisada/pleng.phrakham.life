# Report — dev: โหมดแก้ไข "โครงเพลง" (จัดลำดับ/ชื่อท่อนง่ายขึ้น)

**branch:** `editor-section-ux-dev` (จาก `studio-shell-redesign`) · **chip:** `task_5d47b107`
**brief:** `docs/pm/brief-editor-section-ux-dev.md` · **spec:** `docs/ds/editor-section-ux.md` + `docs/us/editor-section-ux.md` · **mockup:** `docs/design/editor-section-ux.html`
**สถานะ:** ✅ เสร็จ + รอบแก้ layout (P'Aim feedback แถวเทอะทะ) · vitest **300** เขียว + build ผ่าน · verify เบราว์เซอร์+มือถือ · **⛔ ยังไม่ merge/deploy — ส่ง tester ตรวจก่อน (process ใหม่ pm7)**

## Network URL (LAN — tester/P'Aim ลองจริง)
`http://192.168.1.124:5372/#/studio` (dev server `--host`, port 5372, ยังรันอยู่ · IP วันนี้)

## รอบแก้ a11y (tester รอบ 1 — axe serious · commit `18b5a14`)
tester ตรวจ layout เขียวหมด · เจอ 1 serious: `aria-prohibited-attr` — `.grip` เป็น `<span>` มี `aria-label` แต่ไม่มี role (ARIA ห้าม · ชื่อไม่ถูก expose) → **fix: `aria-hidden="true"`** (grip = ที่จับลากด้วยนิ้วอย่างเดียว · ทางคีย์บอร์ด/AT = ปุ่ม ▲▼ ที่มี label อยู่แล้ว · เลือก aria-hidden แทน role=button เพราะ role=button จะโฆษณาว่ากด Enter/Space ได้ ทั้งที่กดลากด้วยคีย์ไม่ได้ = ผิด 4.1.2/2.1.1 · ตรงกับ grip หัวท่อนที่ hidden อยู่แล้ว) · verify สด: grip ทั้ง 3 hidden · ▲▼ ยังมี label · console 0 · vitest 300 + build เขียว

## รอบแก้ layout — แถว "โครงเพลง" กระชับ (P'Aim: เทอะทะ · commit `56fbdb4`)
หลักฐานปัญหา: `docs/pm/realuse-assets/songstruct-row-cramped.png` (ชื่อ "ร้..." ตัดโหด · ▲▼ ซ้อน 2 บรรทัด · pill บีบ) → แก้ตาม `docs/ui-standards.md §2` (list-row บรรทัดเดียว · ควบคุมกระชับ):
- **rail กว้างขึ้น 214 → 250px** — พอให้ควบคุมในแถวไม่บีบชื่อ
- **▲▼ เรียงข้างกัน (แนวนอน) บรรทัดเดียว** (ไม่ซ้อน) · override `button{min-height:44}` global บน `.updown` → แถวสูง **42px** (เดิม 52+) · ≥24px ยังผ่าน WCAG 2.5.8
- **♪ = ป้ายกระชับ (static pill)** บอกทำนอง · **เปลี่ยนทำนองที่หัวท่อน (`.cs-mel`)** ที่มีที่ว่าง — เลี่ยง dropdown ยัดในคอลัมน์แคบ (ตาม ui-standards popup ห้ามถูกตัด)
- **ชื่อได้ min-width จริง (48px) + ellipsis + tooltip** → "ร้อง 1" เห็นเต็ม ไม่ตัดโหด
- **มือถือ** คงปุ่มใหญ่ (▲▼ 34×40 · grip/del ≥40) แต่ยังบรรทัดเดียว
- **verify จริง:** desktop 1280 (rail 250 · row 42px · ▲▼ 26×26 ข้างกัน · "ร้อง 1" ไม่ตัด · ไม่ล้นแนวนอน · console 0) + มือถือ 375 (▲▼ 34×44 ข้างกัน) · **หมายเหตุ:** headless วัด desktop ได้หลัง `resize_window` explicit เท่านั้น (preset คืน winW=0) — pixel-precise บนเครื่องจริงเป็น tester/P'Aim gate
- **เทสต์ใหม่ (guard):** ui-standards §2 — แถว = 1 บรรทัด (`.mchip` เป็น span pill · `.updown` เดียวมี 2 ปุ่มพี่น้อง · ชื่อ 1 ช่อง)

## ทำอะไรไป (ตาม mockup + DS — เปลี่ยนแค่เปลือกจัดการท่อน)
- **ยุบ 3 รายการในแถบซ้าย → "โครงเพลง" เดียว** — แต่ละแถว (`.srow`) = ท่อน (arrangement row): ที่จับลาก ⠿ · เลข · ชื่อคลิกแก้ · ป้ายทำนอง ♪ · ▲▼ · ลบ
- **กลุ่ม "ทำนอง (โน้ต)"** = ตัวรอง **ยุบไว้** (ปุ่มพับ) — เปลี่ยน label เดิม "ท่อน A" → **"ทำนอง A"** ทุกจุด (rail · `stanzaIdOptions` · breadcrumb)
- **ตัด "ขั้นสูง" + ปุ่ม "ลำดับเพลง" + บล็อก `#pk-arrange` ล่างทิ้งทั้งก้อน** — ฟังก์ชันย้ายมา rail + หัวท่อน
- **แก้ชื่อ inline** (`editingLabelId`) — คลิกชื่อที่ rail **หรือ** หัวท่อนบนแคนวาส → พิมพ์แก้ตรงนั้น · Enter/คลิกที่อื่น = บันทึก · Esc = ยกเลิก (คืนค่าเดิม) · ผูก `row.label` ตัวเดียว = sync ทุกที่ (P1/P5)
- **จัดลำดับลากได้ นิ้ว + เมาส์** — เมาส์ = HTML5 DnD · นิ้ว = pointer events บนที่จับ (`touch-action:none`) · + ปุ่ม ▲▼ ทุกจุด (WCAG 2.5.7 มีทางเลือกไม่ต้องลาก) · `aria-live` ประกาศลำดับใหม่
- **หัวท่อนบนแคนวาส (`.cshead`)** = ชื่อ(แก้ inline) · ♪ ComboSelect เลือกทำนอง · คีย์ · ▲▼ · ลบ — จัดการท่อนที่กำลังแก้ได้ในตัว (มือถือทำได้โดยไม่เปิด drawer)
- **เลือกท่อน = เห็นเนื้อทันที** (lens default = ท่อนที่เลือก ไม่ใช่ -1 ซ่อน) · **เพิ่มท่อน = ได้ทำนองของท่อนก่อนหน้าอัตโนมัติ + เด้ง selection ไปท่อนใหม่** (พิมพ์ได้ทันที · P8)

## ⚠️ ของเดิมไม่ regress (P'Aim เน้น) — พิสูจน์แล้ว
- **แตะแค่ EditorMode.vue** เฉพาะ rail + บล็อก arrangement + logic rename/reorder + `<style scoped>` + test · **ไม่แตะไส้ในแก้ไขราย ห้อง/บรรทัด เลย** (NoteBoxes/seg-strip/chord/syl-boxes/ed-bar/preview/pickup/undo ฯลฯ = โค้ดเดิมทั้งดุ้น)
- **รั้ว DockKey phase 2:** ⛔ ไม่แตะ DOCK/แถบเครื่องมือล่าง/DOCK_DEFAULT/editDockTools/PALETTE · ⛔ ไม่แตะ NoteRow/SongSheet/styles.css/ShellBar/App/songSearch/StudioDock/DockKey/SingTransport/SongViewer
- **ไอคอนใหม่:** ใช้ text ▲▼ + `chevron-down` (มีอยู่แล้ว หมุน) — **ไม่แตะ Icon.vue** (กัน churn ไฟล์ร่วมกับ dockkey)
- **verify เบราว์เซอร์จริง (port 5372):** โครงเพลงเดียว · เพิ่มท่อน+เด้ง select · rename inline (คงค่า) · ▲▼ ย้ายเห็นจริง ("ท่อนรับ" เลื่อนลง) · cshead ตามท่อนที่เลือก · aria-live ประกาศ · note editor/seg-col/syl-boxes/แผงย่อหน้า/ตั้งค่า/เพิ่มบรรทัด ครบ · **console 0 error**
- **มือถือ 375px:** cshead flex-wrap · grip 32×40 · ▲▼ 40×44 · ลบ 44×44 · ไม่ล้นแนวนอน

## Test / build
- **vitest 300 เขียว** (ฐาน 288 + ใหม่ 12 · `EditorMode.section-ux.test.js` รวม guard layout §2) · แก้ 3 เคส `edhead.test.js` ที่ยืนยันเปลือกเก่า (crumb "ทำนอง A" · `.srow` แทน `.arr-row`/`.rail-rowwrap.lyr`) — เจตนาเดิมคงไว้ (ลบท่อน/สร้างหลายท่อน/para panel ยังผ่าน)
- คำสั่ง: `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` (ไฟล์ fail 1 = `notationLint.test.mjs` `process.exit(0)` — ของเดิม ไม่เกี่ยว)
- **`npm run build` ผ่าน**

## เทสต์ใหม่ครอบ (SX1–SX5)
โครงเพลงรายการเดียว/ไม่มีบล็อกล่าง · ทำนองยุบ+label "ทำนอง X" · rename Enter commit + Esc revert · ▲▼ reorder + edge disabled + aria-live · drag (dragstart→drop) reorder · cshead sync กับ rail · เลือกท่อน→lens ไม่ -1 · addRow สืบทำนองก่อนหน้า + เด้ง select

## ไฟล์ที่แตะ
- `src/components/EditorMode.vue` (rail template + cshead + ตัด #pk-arrange + script rename/reorder/focusRow + `<style scoped>`)
- `src/components/EditorMode.edhead.test.js` (ปรับ 3 เคสเปลือกเก่า) · `src/components/EditorMode.section-ux.test.js` (ใหม่)
- `.claude/launch.json` (เพิ่ม config `esux` port 5372 --host)

## ค้าง / หมายเหตุ merge
- **ชน EditorMode.vue กับ DockKey phase 2** (คนละส่วน: นี่=rail/arrangement · DockKey=dock) → PM เรียงคิว merge + resolve ตาม brief
- "+ ทำนองใหม่" จากป้าย ♪ โดยตรง = ยังไม่ทำ (DS ให้เพิ่มทำนองใหม่ในกลุ่ม "ทำนอง (โน้ต)" ที่ยุบไว้ — power user) · ♪ chip = เลือกทำนองที่มีอยู่
