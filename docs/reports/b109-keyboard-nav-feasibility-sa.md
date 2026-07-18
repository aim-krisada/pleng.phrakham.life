# SA feasibility (คู่ UX) — B109 keyboard nav (ตอบ 6 คำถาม §5 ของ `editor-keyboard-nav.md`)

**คู่กับ:** `docs/us/editor-keyboard-nav.md` (uxui-standing `32f1d1d`) · **UX design แน่น อ้างมาตรฐานจริง (MuseScore/Flat/Sheets/ARIA/WCAG)** — SA ตรวจ feasibility
**verify โค้ดจริง:** `EditorMode.vue`/`ComboSelect.vue` 2026-07-18 · ⛔ read-only · build หลัง dock-space (EditorMode hot lane)

---

## สรุป: ✅ ทำได้ทั้ง scheme · 2 ประเด็นต้อง fold เข้า design (🔴 Mac Ctrl+Arrow · Esc คอร์ด gap) · focus-reactivity ใช้ fix ร่วมกับ dock-space continuity

| Q | คำตอบ |
|---|---|
| 1 data model | ✅ ครบทั้ง note+syllable (`slotStarts`/`data-slot` · `[data-bar] .note-box`) · ต้องมี "current-pos resolver" เล็ก ๆ |
| 2 integration | ✅ reuse `onUndoKeys`(:1710) window-keydown pattern เป๊ะ |
| 3 dock keyboard-aware | ✅ แก้แล้วโดย guard "ไม่ hide ตอนคีย์บอร์ดขึ้น" (dock-space Q1) — keypad band = nav surface ที่ต้องคงเหนือแป้น |
| 4 focus reactivity | ✅ `focusSlot` ใช้ได้ · **ใช้ fix เดียวกับ dock-space continuity** (persist selection แยกจาก @blur) |
| 5 Ctrl+Arrow | ✅ preventDefault ได้ · 🔴 **แต่ Mac: Ctrl+←/→ = OS switch-Spaces แย่งไปก่อน browser → jump ตายบน Mac** → Tab เป็นหลัก |
| 6 chord Enter/Esc | Enter = `allow-custom` (ไม่ใช่ commitRename) · **Esc = gap** (ComboSelect ไม่ปิด editingChord) → wrapper @keydown.esc |

---

## Q1 · data model — ✅ ครอบทั้ง note + syllable

- **syllable side:** `slotStarts["li-bi-si"]`(:299) → slot แรกของห้อง = `slotStarts["li-bi-0"]` · `focusSlot(n)`(:348) โฟกัส `[data-slot]`
- **note side:** `[data-bar="li-bi"] .note-box:not(.add)`(:905 · `addBar` ใช้อยู่) โฟกัสโน้ตแรกของห้อง · `data-bar="li-bi"`(:2869) จับทุกห้อง
- **line context:** `activeLine`(:880) · `activeStanza`(:192)
- **ต้องเพิ่ม (build): "current-position resolver"** — รู้ (li,bi,si) ปัจจุบันจาก `document.activeElement.closest('[data-bar]')` (ทั้ง note+syllable อยู่ใน `[data-bar]`) หรือ reverse-map `focusedSlot`→slotStarts → แล้ว `goBar/goLine(±1)` คำนวณ target แล้วเรียก `focusSlot`/focus note-box · **primitive ครบ · resolver = helper เล็ก**
- ✅ **"ครอบทั้ง note+syllable" = ยืนยันได้** (addressing มีทั้งสองฝั่ง)

## Q2 · integration — ✅ reuse `onUndoKeys` pattern เป๊ะ

- **มี pattern อยู่แล้ว:** `onUndoKeys`(:1710) = `window.addEventListener('keydown', ...)` add ตอน `onMounted`(:1722) · remove `onUnmounted`(:1725) · guard `if (!(e.ctrlKey||e.metaKey)||e.altKey) return`
- → **B109 เพิ่ม nav ในตัวจัดการเดียวกัน/พี่น้อง:** Tab/Shift+Tab · Ctrl+Arrow · Home/End → dispatch `goNote/goBar/goLine(±1)` · **ปุ่มบนจอ wire ฟังก์ชันเดียวกัน** (1 ฟังก์ชัน 2 ทางเรียก) — ตรงที่ UX ออกแบบ
- ✅ ไม่ต้องสร้าง infra ใหม่

## Q3 · dock keyboard-aware — ✅ ประสานแล้ว

- ตอนพิมพ์เนื้อ แป้นขึ้น → dock auto-hide (dock-space) · **แต่ปุ่มนำทางต้องคงเหนือแป้น**
- **แก้แล้วโดยไม่ขัดกัน:** dock-space Q1 ผมวาง guard **"ไม่ hide ขณะคีย์บอร์ดขึ้น"** ไว้แล้ว → **keypad/nav band = พื้นที่ที่ต้องคงเหนือแป้นตอนพิมพ์** (ไม่โดน auto-hide) · วางเหนือแป้นด้วย `visualViewport` offset (dock-space Q2)
- **ประสาน dock-space:** nav band = ข้อยกเว้นของ auto-hide (คือ surface ที่พี่เปาใช้ข้ามห้องตอนพิมพ์) → ต้องอยู่ในสเปก dock-space ด้วย (สายเดียวกัน · 1 ไฟล์ 1 สาย = คิวหลัง dock-space จริง)

## Q4 · focus management / @focus reactivity — ✅ ใช้ fix ร่วมกับ dock-space continuity

- `focusSlot(target)`(:348) set `focusedSlot=target` → nextTick → `el.focus()` → `@focus` re-confirm (ค่าเดียวกัน) · programmatic focus ทำงาน
- **⚠️ ประเด็นเดียวกับบทเรียน session นี้:** `focusedSlot` ผูก `@focus/@blur`(:2920) — ตอน jump, `@blur` ช่องเก่า set `-1` แล้ว `@focus` ช่องใหม่ set target (ลำดับ blur→focus = ลงเอย target ถูก) · **แต่ถ้า jump ไป element ที่ไม่ raise focus ทันที = selection หลุด**
- **→ ใช้ fix เดียวกับ dock-space continuity:** เก็บ "slot/seg ที่เลือก" ใน **ref ที่ persist อิสระจาก @blur** (ไม่พึ่ง DOM focus ล้วน) → jump + fold/rotate ใช้ selection ตัวเดียวกัน · **note side** = `activeInput`(:879/884) (DOM el · มี `[data-bar]` ancestor) — jump โน้ตโฟกัส note-box target
- ✅ feasible · **B109 + dock-space continuity = concern เดียว แก้ที่เดียว** (ประสานสาย)

## Q5 · Ctrl+Arrow override native — ✅ ได้ · 🔴 แต่ Mac มีปัญหา OS-level (ต้อง fold เข้า design)

- **preventDefault ใน keydown หยุด native word-jump ได้ทุกเบราว์เซอร์** · ช่องคอร์ด/พยางค์สั้น → เสีย word-jump ในช่อง = ไม่กระทบจริง (UX ว่าถูก)
- **🔴 ประเด็น Mac (SA จับเพิ่ม · UX ควร fold):** **`Ctrl+←/→` บน macOS = OS "สลับ Spaces" (Mission Control)** — ระบบแย่งไป**ก่อน**ถึง browser → **`preventDefault` หยุดไม่ได้ → ข้ามห้องบน Mac ตาย** · `Cmd+←/→` บน Mac = ต้น/ท้ายบรรทัด (native · ก็ไม่เหมาะยึด)
- **→ SA แนะ:** **Tab/Shift+Tab = คีย์หลัก cross-platform** (UX ให้เป็นหลักอยู่แล้ว = ปลอดภัยทุก OS) · **Ctrl+Arrow = enhancement เฉพาะ Win/Linux** · Mac ให้ใช้ **Tab + ปุ่มบนจอ** (หรือ Option+Arrow ถ้าจะ map) · **document ข้อจำกัดนี้** — อย่าสัญญา Ctrl+Arrow ว่าได้ทุก OS
- handler เช็ก `e.ctrlKey` (Win/Linux) · Mac fallback = Tab (ไม่พึ่ง Ctrl)

## Q6 · chord Enter=ยืนยัน / Esc=ยกเลิก — reuse commitRename ได้บางส่วน

- **Enter=ยืนยัน:** ❌ **ไม่ใช่ commitRename pattern** — commitRename ผูก plain `<input>` (:2546) · **คอร์ด = `ComboSelect` component ที่มี Enter handler ของตัวเอง** (`onKeydown`) → **fix = เพิ่ม `allow-custom` ที่คอร์ด ComboSelect** (root cause ที่ผมหาไว้ `ffbf54f`: ตอนนี้ allowCustom=false → พิมพ์คอร์ดนอก list = filtered 0 = Enter ตาย) → branch (c) emit ค่าที่พิมพ์ → `applyChordAt` ยืนยัน+ปิด · **blast radius 0** (ไม่แตะ ComboSelect ที่ share)
- **Esc=ยกเลิก:** 🔴 **gap จริง** — ComboSelect Escape(:88) แค่ revert text ของตัวเอง **ไม่ปิด `editingChord`** → วันนี้ Esc ไม่ยกเลิกตัวแก้คอร์ด · **fix = ใส่ `@keydown.esc.prevent` ที่ `.chord-cell` wrapper ใน EditorMode** (keydown bubble ขึ้นจาก ComboSelect input) → `editingChord = null` · **นี่คือการ reuse *จิตวิญญาณ* `cancelRename` ที่ wrapper** (ไม่แตะ ComboSelect ที่ share = blast 0)
- **⛔ อย่าเพิ่ม Enter/Esc emit เข้า `ComboSelect.vue`** (shared 3 ที่: คอร์ด/หมวด/song-picker → blast radius) · จัดที่ **prop (`allow-custom`) + wrapper (`@keydown.esc`)** ฝั่ง EditorMode เท่านั้น
- **clash:** ✅ ไม่ชน — Enter/Esc ในคอร์ด (ComboSelect focus) vs Enter ในพยางค์ (`onSylKey`) vs Enter ในเปลี่ยนชื่อ (commitRename) = **คนละ focus คนละ input** (WCAG 2.1.4 active-on-focus · ตรงที่ UX เขียน)

---

## สรุปให้ dev (build phase · หลัง dock-space)
1. current-pos resolver (`closest('[data-bar]')`) + `goNote/goBar/goLine` reuse `slotStarts`/`focusSlot`/`[data-bar] .note-box`
2. nav keydown ต่อ `onUndoKeys` pattern · ปุ่มบนจอเรียกฟังก์ชันเดียว
3. nav band = exempt auto-hide + เหนือแป้น (ประสาน dock-space · สายเดียว)
4. selection ref persist แยกจาก @blur (ร่วม dock-space continuity)
5. **Tab = หลัก cross-platform** · Ctrl+Arrow = Win/Linux only (Mac OS แย่ง) · ทุก nav key preventDefault
6. คอร์ด: `allow-custom` (Enter) + wrapper `@keydown.esc` (Esc) · ไม่แตะ ComboSelect ที่ share

**verdict:** scheme UX ทำได้จริงทั้งหมด · **แก้ 2 จุดใน design ก่อน P'Aim/พี่เปาเคาะ: (ก) Mac Ctrl+Arrow ไม่ครอบ → Tab หลัก (ข) Esc คอร์ดเป็น wrapper ไม่ใช่ ComboSelect** · build ต่อคิวหลัง dock-space (EditorMode lane)

---

*verify โค้ดจริง 2026-07-18 · SA (feasibility · read-only) · ฐาน `studio-shell-redesign`*
