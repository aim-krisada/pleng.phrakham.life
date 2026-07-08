# DS — ps3 Epic 5: dock ร่วม (B021/B022/B024/B025)

US: `docs/us/ps3-dock.md` · prototype อ้างพฤติกรรม: `docs/design/ps3-dock-prototype.html` (มี logic ครบ: fit / collapse / trans / customize / per-mode registry — พอร์ตมาเป็น Vue)

## สถาปัตยกรรม
- **แยก dock เป็นคอมโพเนนต์ร่วม `StudioDock.vue`** (ปัจจุบันฝังใน `EditorMode.vue` — dock engine มีอยู่แล้ว: `DOCK_STORE`, `dockRegistry`, `dockTools`, `dockMove/Add/Remove/Reset`, drag `dockPos`). ยกออกมาเป็นคอมโพเนนต์เดียว รับ prop `mode: 'edit'|'sing'|'print'` แล้ว shell (`Studio`) วางไว้ชั้นล่างร่วมทุกโหมด
- **Registry ต่อโหมด** = ข้อมูล (array ของ tool defs) · โครงเดิม `dockRegistry` computed → ขยายเป็น `REGISTRY[mode]`
- **localStorage แยกต่อโหมด:** `pleng.dock.<mode>.tools` (ลำดับ/ที่ซ่อน) · `pleng.dock.alpha` (ความโปร่ง ร่วมได้) · `pleng.dock.collapsed.<mode>`

## Tool defs (ต่อโหมด) — ไอคอน = Lucide (ชื่อตรง · แหล่ง: `OneDrive/.../references/svg-icon-lucide/`)
- **edit:** `undo`(undo-2) `redo`(redo-2) `play`(play·ฟังท่อน) `playAll`(circle-play) `stop`(square·danger·visible=playing) `send`(send/`badge-check` ตามสิทธิ์) `download`(download) — **ตัด "บันทึกร่าง" ออกจาก default** (auto-save อยู่แล้ว · P'Aim เคาะ)
- **sing:** `play`(play⇄pause) `chord`(guitar·menu) `tempo`(gauge·menu·badge=BPM) `key`(key-round·menu·badge=ตัวคีย์) `display`(layers·menu) `loop`(repeat·menu·multi) `fdown`(a-arrow-down) `fup`(a-arrow-up) — **ลำดับ default = play,chord,tempo,... เพื่อ mobile โชว์ 3 ตัวแรกตาม B024**
- **print:** `print`(printer) `display`(layers·menu) `chord`(guitar·menu) `key`(key-round·menu·badge) `fdown` `fup`
- แต่ละ def: `{id,label,icon,menu?,options?,value?,multi?,badge?,cls?,visible?}` · `visible` = guard ตามสิทธิ์/สถานะเล่น (คงของเดิม)
- คีย์โน้ต jianpu = แถวแยก โชว์เฉพาะ `mode==='edit'`

## Dynamic overflow (D3) — priority+
```
fit: build(primary=visibleTools, overflow=[])
     if (rowW := tools.clientWidth) > 50:
         while required() > rowW+1 and primary.length>0:
             overflow.unshift(primary.pop()); rebuild
```
- **`required()` = Σ child.offsetWidth + gap·(n−1)** (อย่าใช้ `scrollWidth` — เพี้ยนกับ margin-auto/flex)
- **guard `clientWidth>50`** — ถ้ากว้าง 0 (ยังไม่ layout) = โชว์ทุกปุ่ม อย่ายุบ (บั๊กเดิม: วัดตอนกว้าง=0 → ยุบหมด)
- **`ResizeObserver` บน dock** → เรียก fit ใหม่เมื่อความกว้างจริงมา (เทียบ lastW กันลูป)
- ปุ่มจัดการอยู่กลุ่มขวา `.rc { margin-left:auto }` · ปุ่ม tool `flex:0 0 <size>` (ห้าม shrink ไม่งั้นวัดเพี้ยน)
- **⋯** = popover ลอย (`position` เหนือ dock · ไม่ดันเนื้อ) · **ห้าม swipe/scroll แนวนอน**
- คีย์โน้ต: `.keys{flex-wrap:nowrap} .key{flex:1 1 0;min-width:0;max-width:~46}` = บรรทัดเดียวเสมอ

## Collapse (D4) — manual only
- state `collapsed` ต่อโหมด · ปุ่ม `panel-top-close`
- **desktop:** `.dock.collapsed` ซ่อน keys+tools เหลือแถบบาง · คลิกแถบ = กาง
- **mobile:** `.dock.m.collapsed{transform:translateY(120%)}` เลื่อนพ้นจอ + โชว์ `.tab` (`panel-bottom-open`) ริมล่าง · แตะ tab = กาง

## Transparency (D5)
- CSS var `--dock-alpha` (0.4–1) → `background:rgba(var(--dock-bg),var(--dock-alpha))`
- ปุ่ม `blend` เปิด popover สไลเดอร์ **เต็มกว้าง** (`width:100%`) · เขียน `pleng.dock.alpha` ทุกครั้ง

## Customize (D6)
- ต่อยอด `dockMove/dockAdd/dockRemove/dockReset` เดิม แต่ key ตาม mode · popover `sliders-horizontal`
- ของจริงเพิ่ม **drag reorder** (prototype ยังเป็น checkbox) · drag ทั้งแถบ (desktop) = `grip-vertical` คงของเดิม

## Menu/dropdown (D7)
- `menu:true` → popover รายการ · single-select set `value`+`updateBadge` · `multi:true` (loop) = ติ๊กหลายอัน (`sel{}`)
- **badge:** key = ตัวอักษรคีย์ (`options[value].split(' ')[0]`) · tempo = เลข BPM (`/=(\d+)/`)
- **คีย์ (transpose) = state ร่วมทุกโหมด** (แบบ A · WT-B#4) — ผูก `chords.js` transpose · เปลี่ยนที่ไหน ทุกโหมดตาม (WYSIWYG)
- **ความเร็ว** ผูก tempo ของ playback (`midi.js`) · map ศัพท์→BPM ตาม US · "ตามเพลง" = tempo ที่เก็บในเพลง
- **แสดงผล/คอร์ด** = คุม layer render ของ `SongSheet` (ร่วม viewer/print)

## Print (โหมดพิมพ์)
- `@media print { .dock,.tab { display:none } }` — dock เป็น UI จอ ไม่ติดกระดาษ
- ปุ่ม `print` = `window.print()` (ต่อกับงาน print เดิม I3)

## WCAG 2.2 AA
- target: desktop 44 / mobile 40 (≥24 ผ่านเกณฑ์) · `aria-label` ทุกปุ่ม · `:focus-visible` ชัด · ไอคอน contrast ≥3:1 · popover ปิดด้วย Esc/คลิกนอก · เมนูเข้าถึงด้วยคีย์บอร์ด (↑↓ Enter)

## ไอคอน — โปรเจกต์ยังไม่ bundle Lucide
- ตอนนี้ repo ไม่มี lucide dep · dev เลือก: inline SVG เฉพาะที่ใช้ (เหมือน prototype · เบาสุด) **หรือ** เพิ่ม `lucide` (tree-shakeable) · ยึด **ชื่อ Lucide** เป็น SSOT — ห้ามวาดเอง
- ชุดที่ใช้: undo-2 redo-2 play circle-play square send badge-check download layers guitar key-round gauge repeat a-arrow-down a-arrow-up pause printer panel-top-close panel-bottom-open ellipsis blend sliders-horizontal grip-vertical chevron-down

## ไฟล์ที่แตะ (ps4)
`StudioDock.vue` (ใหม่) · `Studio.vue`/shell (วาง dock) · `EditorMode.vue` (ย้าย dock engine ออก) · viewer/print โหมด · `SongSheet.vue` (display/chord layer) · `chords.js`/`midi.js` (key/tempo) — ⚠️ ทับ B027 (notation/midi/NoteRow) → จัดลำดับ worktree ตอน build
