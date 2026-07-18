# US/UX — นำทางด้วยคีย์บอร์ด + ปุ่มนำทางทุกอุปกรณ์ (B109)

**ประเภท:** UX flow + design (นำ) · **⛔ analysis · read-only · ไม่แตะ `EditorMode.vue`** (build หลัง dock-space ปิด · ชนไฟล์) · SA ตรวจ feasibility คู่
**โจทย์ (พี่เปาขอ · P'Aim จ่าย):** หน้าแก้เพลง — เพิ่ม **ข้ามห้อง (bar) + ข้ามบรรทัด (line)** ด้วยคีย์บอร์ด · ระดับโลก · **ทุกอุปกรณ์**
**ยึด:** `docs/ux-platform-patterns.md §0-1` (touch≠pointer) · WCAG 2.1.1/2.1.4 · MuseScore/Flat.io · ARIA grid role · `docs/ui-standards.md`

---

## 0 · สรุป (ฟันธง · อ่าน 30 วิ)

**หลักเดียว:** **navigation model เดียวทุกอุปกรณ์ — ต่างแค่ trigger** (desktop=คีย์จริง · mobile/fold=ปุ่มบนจอ) · **ข้ามห้อง/บรรทัด = Ctrl+ลูกศร (โลกตรงกัน) / ปุ่มบนจอ** · **+ ซ่อม Enter=ยืนยันคอร์ด · Esc=ยกเลิก** (พี่เปาต้องเอาเมาส์คลิก = ผิด convention)

**scheme keyboard ทั้งชุด (ออกแบบครบทีเดียว):** Space=ถัดไป(มี) · **Enter=ยืนยันคอร์ด(ซ่อม)** · **Esc=ยกเลิก** · Tab=โน้ตถัดไป · **Ctrl+ลูกศร=ข้ามห้อง/บรรทัด(ใหม่)** · ปุ่มบนจอ(mobile) · WCAG-safe

| อุปกรณ์ | trigger |
|---|---|
| **desktop** (มีคีย์จริง) | Tab=โน้ตถัดไป · **Ctrl+←/→=ห้อง** · **Ctrl+↑/↓=บรรทัด** · Home/End=ต้น/ท้ายห้อง |
| **mobile/tablet/fold** (ไม่มี Tab/Ctrl · มีแค่ keypad แอป + OS keyboard) | **ปุ่มนำทางบนจอ** (◀▶ โน้ต · ⏮ห้อง⏭ · ▲บรรทัด▼) ใน keypad band · = action เดียวกัน |

---

## 1 · ⭐ ของเดิม (verify โค้ดจริง `EditorMode.vue` · SOP §4) — คีย์ที่ "จองแล้ว" ห้ามชน

| คีย์ | ทำอะไรวันนี้ | ที่ไหน |
|---|---|---|
| **Space** | แยกพยางค์ที่ caret (+ไปต่อ) | `onSylKey` :402 |
| **Enter** | แยกพยางค์ + ไปโน้ตถัดไป | :406 |
| **Backspace** (ต้นช่อง) | รวมกับช่องก่อน | :418 |
| **Delete** (ท้ายช่อง) | รวมช่อง | :426 |
| **Ctrl/Cmd+Z · Shift+Z · Y** | undo/redo (global) | `onUndoKeys` :1751 |

→ **B109 ห้ามแตะ 5 กลุ่มนี้** · editor = **ตารางช่องพิมพ์** → `←→` ในช่อง = caret (native · ห้ามยึด) · **เหลือช่องว่างปลอดภัย: Tab · Ctrl+ลูกศร · Home/End · ↑↓** (non-printable/modifier)

---

## 2 · scheme คีย์ (desktop · ฟันธง · อ้างมาตรฐานจริง)

| คีย์ | ทำอะไร | อ้าง (เปิดจริง) |
|---|---|---|
| **Tab / Shift+Tab** | โน้ต/พยางค์ ถัดไป/ก่อนหน้า (ข้ามห้อง/บรรทัดเนียน) | Google Sheets (Tab=next field) · form nav สากล |
| ⭐ **Ctrl+→ / Ctrl+←** *(Win/Linux)* | **ห้องถัดไป / ก่อนหน้า** | **MuseScore 4** (`Ctrl+Right`=next measure) **+ Flat.io** (ตรงกัน · [handbook](https://handbook.musescore.org/navigation/navigating-your-score) · [Flat](https://help.flat.io/en/music-notation-software/keyboard-shortcuts/)) |
| ⭐ **Ctrl+↓ / Ctrl+↑** *(Win/Linux)* | **บรรทัดถัดไป / ก่อนหน้า** | ARIA grid (↑↓=แถว) + Ctrl=block-jump ([MDN grid](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role)) |
| **Home / End** *(เปล่า)* | **คงเดิม (native caret ต้น/ท้ายข้อความในช่อง)** — ไม่ override | ทุก text field ทุก OS · แก้พยางค์หลายตัวอักษรพัง ถ้ายึด |
| **Ctrl+Home / Ctrl+End** | ต้น/ท้าย **เพลง** | grid + Sheets (Ctrl+Home/End=ต้น/ท้ายเอกสาร) |

> **🔧 แก้ (dev `bb18c08` จับ · UX เคาะ 18 ก.ค.):** สเปกเดิม plain Home/End=ข้ามห้อง = **override native caret** ในช่องพิมพ์ → พังการแก้พยางค์หลายตัวอักษร (เช่น "ฮาเลลูยา" กด Home คาดว่าไป caret ต้นคำ) · แถมข้ามห้องมี **Ctrl+←/→ + ปุ่ม ⏮⏭ บนจอ**อยู่แล้ว → plain Home/End ซ้ำซ้อน · **∴ คง native Home/End · เหลือ Ctrl+Home/End=เพลง** (world-class = ไม่แย่ง convention text field)
| `←→` เปล่า · Space/Enter/… | **คงเดิม** (caret · แยกพยางค์) | ไม่แตะ |

**ทำไม scheme นี้:** (1) **Ctrl+ลูกศร=block-jump** = MuseScore+Flat.io **เห็นตรงกัน** + spreadsheet muscle-memory → ไม่ประดิษฐ์ (2) ทุกคีย์เป็น **non-printable/modifier** → นอกขอบเขต WCAG 2.1.4 (§4) (3) ไม่ชนของเดิม (Space/Enter/Backspace/Delete/Ctrl+Z/Y ครบ)

> **🔴 ข้อจำกัด Mac (SA `5e3f011`):** macOS ยึด `Ctrl+←/→` ไว้สลับ **Spaces** (OS แย่งก่อน browser · `preventDefault` หยุดไม่ได้) → **Ctrl+Arrow jump ตายบน Mac** · **∴ Tab/Shift+Tab = คีย์หลัก cross-platform** (ทำงานทุก OS · ผมให้เป็นหลักอยู่แล้ว) · **Ctrl+Arrow = enhancement เฉพาะ Win/Linux** · **Mac ข้ามห้อง/บรรทัด = ใช้ปุ่มบนจอ (§3) หรือ Tab** → ทุก OS ทำงานได้ ไม่มีใครตกขบวน

### 2.5 · ⭐ Enter=ยืนยัน · Esc=ยกเลิก (context-scoped · ซ่อมคอร์ด · พี่เปาขอ)
**บั๊กจริง:** พิมพ์คอร์ด → กด Enter **ไม่ยืนยัน** ต้องเอาเมาส์คลิก = ผิด convention ทุกฟอร์ม/editor
- **ในตัวแก้คอร์ด (`editingChord`/ComboSelect `:2889`):** **Enter=ยืนยันคอร์ด · Esc=ยกเลิก**
- **กลไกจริง (SA `5e3f011` ยืนยัน root cause):**
  - **Enter = ยืนยันค่าที่พิมพ์** → ComboSelect `allow-custom` (รับค่าที่พิมพ์เอง ไม่ใช่แค่เลือกจาก list) — root cause ที่ Enter ไม่ทำงานวันนี้
  - **Esc = `@keydown.esc` ที่ `.chord-cell` wrapper** (ปิด `editingChord`) — **⛔ ไม่ใส่ emit ใน ComboSelect** (ComboSelect Esc แค่ revert text + **share 3 ที่** · แตะ = กระทบที่อื่น · ui-standards single-source)
- **precedent ในไฟล์เดียวกัน:** เปลี่ยนชื่อท่อน (`:2591`) `@keydown.enter="commitRename"` + `@keydown.esc="cancelRename"` = pattern เดียวกัน (wrapper-level · consistency)
- **Enter = context-scoped (WCAG-safe · active-on-focus):** ในช่องพยางค์=แยกพยางค์(เดิม) · ในตัวแก้คอร์ด=ยืนยัน · ในเปลี่ยนชื่อ=commit → **คนละ focus คนละความหมาย ไม่ชนกัน** (WCAG 2.1.4 "active only on focus")
- **ทุกอุปกรณ์:** OS keyboard มือถือมี Enter/Done · Esc = desktop (mobile ใช้ปิดแป้น/ปุ่มยกเลิกบนจอ)

---

## 3 · ⭐⭐ ทุกอุปกรณ์ = หัวใจ (touch≠pointer · พี่เปาใช้มือถือ)

**มือถือ/tablet/fold ไม่มี Tab/Ctrl** (OS keyboard สำหรับเนื้อ = ไม่มีคีย์พวกนี้ · keypad แอปเป็นปุ่มบนจอ) → **equivalent = ปุ่มนำทางบนจอ** (action เดียวกับคีย์ desktop):
- **◀ ▶ โน้ต** · **⏮ห้อง ⏭ห้อง** · **▲บรรทัด ▼บรรทัด** — วางใน **keypad band (`keys`)** หรือ nav cluster ในหน้าแก้ไข
- **navigation เดียวทั้ง 2 platform** — desktop กดคีย์ / mobile แตะปุ่ม → เรียกฟังก์ชัน `goNote/goBar/goLine(±1)` ตัวเดียวกัน
- ปุ่มบนจอ **โผล่เหนือ OS keyboard** ตอนพิมพ์เนื้อ (ต่อ dock-space keyboard-aware · SA เช็ค §5) → พี่เปาข้ามห้อง/บรรทัดได้โดยไม่ต้องปิดแป้น
- touch target ≥44px · aria-label · fit device-matrix 344-desktop (`ux-platform-patterns §5.5`)

---

## 4 · a11y (WCAG · บังคับ)

- **2.1.4 Character Key Shortcuts:** ครอบเฉพาะ shortcut ที่เป็น **ตัวอักษร/เลข/สัญลักษณ์ล้วน** · scheme §2 ใช้ **non-printable + modifier เท่านั้น → อยู่นอกขอบเขต 2.1.4** (ปลอดภัยโดยโครงสร้าง · [WCAG 2.1.4](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html)) · **⛔ ห้ามทำ shortcut ตัวอักษร/เลขเปล่า** (ผู้ใช้พิมพ์เลข/พยางค์อยู่ = ชนแน่ + speech-input พัง)
- **2.1.1 Keyboard:** ทุก action นำทางถึงได้ด้วยคีย์ ([WCAG 2.1.1](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)) · + ปุ่มบนจอ = ทางเลือกที่ไม่ต้องใช้คีย์เลย (ครอบ touch)
- ปุ่มนำทางบนจอ = **discoverability** ในตัว (เห็น = รู้) + ทางเลือกแทนคีย์ (ครอบ 2.1.4 turn-off/alternative)

---

## 5 · feasibility → SA (ผ่าน PM)

1. **data model:** คำนวณ "ห้อง/บรรทัด ถัดไป/ก่อนหน้า" จากตำแหน่งปัจจุบัน (li-bi-si) + โฟกัสช่องเป้าหมายได้ไหม (มี `activeLine`:880 · `barMenuOpen` · โครง li-bi-si)
2. **integration:** เพิ่ม keydown handler (แบบ `onUndoKeys`:1751 · scope ตอน editor focus) สำหรับ Tab/Ctrl+Arrow/Home-End · + ปุ่มบนจอ wire ฟังก์ชันเดียวกัน
3. **กระทบ dock-space keyboard-aware ไหม:** ตอนพิมพ์เนื้อ (แป้นขึ้น · dock ซ่อน) → ปุ่มนำทางต้องยังเข้าถึงได้ (keypad band เหนือแป้น) — ประสาน
4. **focus management:** ย้ายโฟกัสไปช่องเป้าหมาย programmatic (ระวัง `@focus` reactivity — บทเรียน session นี้) · ตั้ง selSlot/focusedSeg ให้ต่อ (continuity dock-space)
5. **Ctrl+Arrow ในช่องพิมพ์:** override word-jump native (ช่องสั้น = ไม่กระทบ) · ยืนยัน cross-browser/OS
6. **ยืนยันคอร์ด (§2.5):** `ComboSelect` (`:2889`) วันนี้ยืนยันด้วยอะไร (คลิก option? `@update:model-value`?) · Enter=ยืนยันค่าที่พิมพ์/ไฮไลต์ ทำที่ ComboSelect (component) หรือ EditorMode (`applyChordAt`/`editingChord`) · Esc=ปิด+คืนค่าเดิม · reuse pattern `commitRename`/`cancelRename` (`:2591`) ได้ไหม

---

## 6 · เฟส (พี่เปามือถือ = priority)

| เฟส | ทำ | ได้อะไร |
|---|---|---|
| **A ⭐ (ทุกอุปกรณ์)** | **ปุ่มนำทางบนจอ** (โน้ต/ห้อง/บรรทัด prev-next) ใน keypad + ฟังก์ชัน `goNote/goBar/goLine` | **พี่เปาข้ามห้อง/บรรทัดบนมือถือได้ทันที** (คนใช้จริง) |
| **B (desktop)** | keyboard scheme §2 (Tab + Ctrl+Arrow + Home/End) → เรียกฟังก์ชันเดียวกับเฟส A | คนใช้ desktop เร็วขึ้น |
| **C** | cheatsheet (ต่อ "?สัญลักษณ์"/คู่มือเดิม) + tooltip + remap(ถ้าต้องการ) | ค้นพบ/เรียนรู้ |

**ทำไมเรียงงี้:** เฟส A = ปุ่มบนจอ = ครอบ**ทุกอุปกรณ์** (รวมพี่เปา) + เป็น discoverability ให้เฟส B ด้วย → คุ้มสุด · desktop keys ต่อยอดฟังก์ชันเดิม (ไม่ทำใหม่)

**🚧 build lane (SA `5e3f011`):** **focus/nav-band = สายเดียวกับ dock-space** (continuity fix ร่วม · แตะ `EditorMode.vue` ตัวเดียวกัน) → **build ต่อคิวหลัง dock-space ปิด · 1 ไฟล์ 1 สาย** (analysis นี้ read-only)

---

*UX/UI seat · 2026-07-18 · analysis read-only · ⛔ ไม่แตะ `src/` (build หลัง dock-space) · อ้างอิงเปิดจริง: [MuseScore 4 navigation](https://handbook.musescore.org/navigation/navigating-your-score) · [Flat.io shortcuts](https://help.flat.io/en/music-notation-software/keyboard-shortcuts/) · [Google Sheets shortcuts](https://support.google.com/docs/answer/181110) · [MDN ARIA grid role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role) · [WCAG 2.1.1](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html) · [WCAG 2.1.4](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html)*
