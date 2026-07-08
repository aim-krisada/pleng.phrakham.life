# รายงาน — สาย V (Viewer) · คลื่น 2

**Branch:** `wt-viewer` · **worktree:** `../pleng-viewer` · **port:** 5313 (`--host`)
**ทดสอบมือถือ:** `http://10.215.141.98:5313/#/` → เปิดเพลง → กด "ฝึกร้อง"

## ขอบเขต (ตามแผน `docs/pm/wave2-parallel.md`)
- **B024** control bar ฝึกร้อง = dropdown แสดงผล / คอร์ด / คีย์(โชว์ค่า) / ความเร็ว(ศัพท์ดนตรี) + customizable
- **B016** เล่นแล้ว auto-scroll พัก 3.5s เมื่อผู้ใช้เลื่อนเอง + ปุ่มหยุด sticky

## สิ่งที่ทำ
Control bar เดิม (`.vw-bar` แบบ select ธรรมดา) → เปลี่ยนมา **consume `StudioDock` โหมด `sing`** ตาม DS ps3-dock/ps3-viewer ("control bar = dock"). ได้ collapse / ความโปร่ง / ตั้งค่าปุ่ม / overflow ฟรีจาก dock engine ของคลื่น 1.

### ไฟล์ที่แก้
- **`SongViewer.vue`** — เขียนใหม่: control bar = `<StudioDock mode="sing">`; registry เครื่องมือ `play · chord▾ · tempo▾ · key▾ · display▾ · loop · fdown · fup · print` (ลำดับ default นำด้วย play,chord,tempo เพื่อมือถือโชว์ 3 ตัวแรกตาม B024). B016 = watch `playingSeg` ข้าม scrollIntoView ถ้า `Date.now() < pausedScrollUntil`; `wheel/touchmove` ตั้ง `pausedScrollUntil = now + 3500`. ปุ่ม ▶⇄⏸ เป็นปุ่มเดียว sticky (dock = `position:fixed`).
- **`StudioDock.vue`** *(ไฟล์ร่วม — เพิ่มแบบ additive ไม่รื้อโครง)* — เพิ่ม **menu/dropdown (D7)**: tool def รับ `menu · options · value · multi · selected · badge · onPick`; popover เมนู (single-select เลือกแล้วปิด · multi ติ๊กค้างไว้), caret + badge บนปุ่ม, `data-tool` id ให้ทดสอบ/อ้างอิงได้. ยึด id ไม่ยึด object (parent เป็น computed ที่ rebuild ทุกครั้ง → เมนูอ่านค่าสดจาก id).
- **`SongSheet.vue`** *(ไฟล์ร่วม — backward-compatible)* — เพิ่ม prop `showChord/showNote/showLyric` (default `null` = ตกไปใช้ `mode` เดิม → ผู้เรียกเดิมทุกที่ไม่เปลี่ยนพฤติกรรม). ทำให้ "แสดงผล" 5 แบบ (ครบ / เนื้อ+คอร์ด / เนื้อ+โน้ต / เนื้อล้วน / โน้ตล้วน) render ได้จริง.
- **`Icon.vue`** — เพิ่มไอคอน Lucide: `guitar · gauge · key-round · layers · repeat · a-arrow-down · a-arrow-up` (path จาก reference set — ไม่วาดเอง).
- **`midi.js`** — ปรับ `TEMPO_MARKS` ให้ตรง US V1 (Grave40…Presto180, ตัด Allegretto/116 ออก).

## ทดสอบ
- **Unit:** `npx vitest run` → **89/89 เขียว** (เดิม 81 + เพิ่ม 8: viewer เขียนใหม่ครบ play/stop/resume/live-key/live-tempo/badge/display-layers/section-chip/B016 + StudioDock menu D7 4 เคส). Build ผ่าน.
- **ในเบราว์เซอร์ (5313):** ยืนยันด้วย DOM —
  - เมนูคีย์เปิดครบ 12 คีย์ · E = "(ต้นฉบับ)" ติ๊ก ● · เลือก G → badge E→G, คอร์ดในแผ่นทรานสโพสสด (E→G, C#m→Em, F#m→Am), เมนูปิดเอง.
  - แสดงผล 5 แบบสลับ layer ถูก (เนื้อล้วน → คอร์ด0/โน้ต0/เนื้อ50; โน้ตล้วน → เนื้อหาย; ครบ+ซ่อนคอร์ด → คอร์ด0 โน้ต/เนื้อคง).
  - มีแค่ dock เดียวโชว์ (edit dock ถูก `v-show` ซ่อน display:none) — **N1 dock ซ้อน = งานคลื่น 3 (B030) ตามแผน**.
  - มือถือ 375px: หน้าไม่ scroll แนวนอน · dock พับหางเป็น ⋯ เหลือ play/chord/tempo (3 ตัวแรก) เมื่อ fit ทำงาน.

## ทางแยกดีไซน์ที่ตัดสินเอง (ให้ P'Aim เคาะ)
1. **display มี 5 แบบ (ตาม prototype ps3-dock)** ไม่ใช่ 4 แบบใน US — prototype ละเอียดกว่า (มี "เนื้อ+โน้ต"). เลือกตาม prototype.
2. **คอร์ด ▾ มี "ซ่อนคอร์ด"** (letter/roman/hidden). "ซ่อนคอร์ด" ซ้อนกับ display ได้ — ผลรวม = ซ่อนถ้าอันใดอันหนึ่งสั่งซ่อน.
3. **คงปุ่ม `print` ไว้ใน dock ฝึกร้อง** (ไม่อยู่ใน DS sing registry เพราะพิมพ์เป็นโหมดแยกที่ยังไม่ build) — กันคนที่เคยกดพิมพ์จากหน้าดูหาย. ถ้าไม่เอาค่อยตัด.
4. **loop เป็นปุ่ม toggle ธรรมดา** (ยังไม่ทำ multi-select วนซ้ำท่อน = V3/B024-extended นอกสโคปคลื่น 2). Dock รองรับ `multi` แล้ว ต่อยอด V3 ได้เลย.
5. **TEMPO_MARKS ยึด US** (Moderato110/Allegro130/Vivace150/Presto180) แทนค่าเดิมใน midi.js.

## ฝากคลื่น 3 (PM)
- ยก `StudioDock` ขึ้นระดับ `Studio` + mount ครบทุกโหมด (B030) → เคลียร์ N1 (ตอนนี้ dock edit/sing แยก instance ต่อโหมด, ซ่อนกันด้วย v-show — merge แล้วควรรวมเป็นตัวเดียว).
- ไฟล์ร่วมที่แตะ: `StudioDock.vue` (เพิ่ม menu D7), `SongSheet.vue` (layer flags), `Icon.vue`, `midi.js` (TEMPO_MARKS) — ทั้งหมด additive/backward-compatible, conflict กับสาย E/H น่าจะน้อย.
