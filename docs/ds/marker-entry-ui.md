# Marker-entry UI — ใส่จุดวนร้อง/นำทาง (Segno/Coda/D.C./D.S./Fine + mid-bar) ในตัวแก้ inline

**สโคป:** สเปก **การป้อน** สัญลักษณ์วนร้อง/นำทางเข้าตัวแก้ inline (`SongViewer.vue` โหมด `editMode` +
`NoteInputBar.vue`) — **ให้คนทำเพลงโบสถ์ใส่ได้ไม่งง + world-class**. ⛔ **สเปกล้วน ยังไม่ลงโค้ด SongViewer**
(คิว hot-file หลัง deploy). deliverable = spec + acceptance **พร้อม build ทันทีที่ hot-file ว่าง**.

**ฐานที่ต่อ (อ่านแล้ว · อ้าง file:line จริง):**
- **canonical marker shape** = `docs/ds/repeat-jumps-midbar.md §7`: ทุกสัญลักษณ์ = line item
  `{type:'jump', kind, al?, id}` · kind ∈ `segno|coda|to-coda|dc|ds|fine` · `al` (dc/ds) ∈ `fine|coda`.
- **symbol registry (CP-0 · SSOT เดียว)** = `src/lib/editorCommands.js` — `SYMBOLS[]` + `applySymbolToContent`
  + behavior dispatch (`effectFor`). วันนี้มีแต่ note-key ตัวเดียว (`_ . - ~ ^ n ' ( ) { } | # b`).
- **caret model** = `docs/ds/editor-flow-polish.md §5–6` — caret เดินทีละโน้ต ระหว่างโน้ตไหนก็ได้ (`curIdx`
  `SongViewer.vue:240`) · block(ทับ)/line-caret(แทรก).
- **glyph render** = `SongSheet.vue:64–105` (`classifyJump`) — **วาด glyph จาก line item ที่ตำแหน่งของมันเอง =
  mid-bar safe แล้ว** · lane นี้แค่ป้อน data lane วาด.
- **preset + breadcrumb** = `repeat-jumps.md §2.2–2.4` · **mid-bar entry + snap** = `repeat-jumps-midbar.md §3`.

---

## 0. หลักการ — ต่างจาก note-key ตรงไหน (ทำไมไม่ยัดลง SYMBOLS เดิม)

note-key เดิม (`_ . ~ ^` ฯลฯ) = **กดคีย์ตัวเดียว → mark/box ริมโน้ตที่เลือก**. jump marker **ต่าง 3 อย่าง:**
1. **หายาก** (corpus ~0 เพราะใส่ไม่ได้ · `repeat-jumps §0`) → **progressive disclosure**: เข้าทาง Ctrl+K palette /
   ⋮ menu **ไม่กินคีย์โน้ต** (`repeat-jumps §2.3`) — ไม่เบียดคีย์ที่คนคีย์รัวใช้ทุกวัน.
2. **แทรกเป็น line item ใหม่** `{type:'jump',kind,...}` (ไม่ใช่ mark ที่ริมโน้ต) → ต้องมี **behavior ใหม่ 'jump'**
   ในรีจิสทรี + engine `withJumpMarker` (คนละอันกับ `withNoteMark`/`withInsertedBox`).
3. **มาเป็นชุด (preset)** — "D.S. al Coda" = 4 ชิ้น (Segno+To-Coda+Coda+คำสั่ง) → ผู้ใช้เลือก**รูปสำเร็จ**
   ระบบวางโครงให้ (`repeat-jumps §2.2`) ไม่ต้องรู้ทฤษฎี.

⇒ **ขยายรีจิสทรี ไม่แทน** — เพิ่ม `JUMP_COMMANDS[]` (คู่ขนาน `SYMBOLS[]`) + behavior `'jump'` ใน `effectFor`.
ทั้งหมดยัง SSOT เดียว (editorCommands.js) กัน drift แบบเดียวกับ CP-0.

---

## 1. เทียบมาตรฐานโลก (align UP · ไม่ก๊อปของต่ำกว่า)

| ระบบ | วิธีวาง jump | จุดแข็ง | จุดอ่อนสำหรับผู้ใช้เรา |
|---|---|---|---|
| **MuseScore 4** — palette "Repeats & Jumps" | เลือกโน้ต → ดับเบิลคลิก/ลาก glyph ลง notehead | glyph เกาะโน้ต (เห็นชัดว่าไม่ใช่เส้นห้อง) · positioned | ต้องประกอบเอง 4 ชิ้น + รู้ทฤษฎี · **broken routing** ถ้าลืมวาง Coda/id ไม่ตรง |
| **iReal Pro** | เลือกจากเมนู ระบบผูก Segno↔D.S. ให้ | auto-link กัน routing พัง | ตัวเลือกจำกัด (jazz chart) |
| **Dorico** | popover `Shift+R` พิมพ์ "Segno" ที่ caret | เร็ว · ที่ caret · mid-beat ได้ | ต้องรู้คำ + คีย์ลัด (pro) |

**สิ่งที่หยิบมา (world-class default):** (ก) **glyph เกาะโน้ต ที่ caret** (MuseScore+Dorico) · (ข) **auto-link
กัน broken routing** (iReal) · (ค) **preset ภาษาคน + dropzone** (ยกระดับเหนือทุกเจ้าเพราะกลุ่มเป้าหมายเราไม่ใช่มือโปร).

---

## 2. รีจิสทรีคำสั่ง jump (ขยาย editorCommands.js)

```js
// src/lib/editorCommands.js — คู่ขนาน SYMBOLS[]; ไม่อยู่บน note-key strip (ไม่กินคีย์โน้ต)
export const JUMP_COMMANDS = [
  // point markers (วางชิ้นเดียว · โหมดมือโปร)
  { id: 'jm-segno',   kind: 'segno',   th: 'เครื่องหมายวน 𝄋 (จุดที่ D.S. ย้อนมา)', anchor: 'before' },
  { id: 'jm-coda',    kind: 'coda',    th: 'โคดา 𝄌 (ท่อนปิดท้ายที่กระโดดไป)',      anchor: 'before' },
  { id: 'jm-tocoda',  kind: 'to-coda', th: 'ไปโคดา (จุดออกกลางเพลงตอนย้อน)',        anchor: 'after'  },
  { id: 'jm-fine',    kind: 'fine',    th: 'Fine (จุดจบตอนย้อนกลับมา)',            anchor: 'after'  },
  { id: 'jm-dc',      kind: 'dc',      th: 'D.C. (ย้อนต้นเพลง)',                    anchor: 'after'  },
  { id: 'jm-ds',      kind: 'ds',      th: 'D.S. (ย้อนไปเครื่องหมายวน)',            anchor: 'after'  },
]
// preset = ชุดสำเร็จ (ภาษาคน) → วาง command + placeholder markers
export const JUMP_PRESETS = [
  { id: 'p-dc',        th: 'ย้อนต้นเพลง (D.C.)',              place: [{kind:'dc'}] },
  { id: 'p-dc-fine',   th: 'ย้อนต้น แล้วจบที่ Fine (D.C. al Fine)', place: [{kind:'dc',al:'fine'}, {kind:'fine', drop:true}] },
  { id: 'p-dc-coda',   th: 'ย้อนต้น แล้วข้ามไปโคดา (D.C. al Coda)', place: [{kind:'dc',al:'coda'}, {kind:'to-coda',drop:true}, {kind:'coda',drop:true}] },
  { id: 'p-ds',        th: 'ย้อนไปเครื่องหมายวน (D.S.)',      place: [{kind:'ds'}, {kind:'segno',drop:true}] },
  { id: 'p-ds-fine',   th: 'ย้อน 𝄋 แล้วจบที่ Fine (D.S. al Fine)', place: [{kind:'ds',al:'fine'}, {kind:'segno',drop:true}, {kind:'fine',drop:true}] },
  { id: 'p-ds-coda',   th: 'ย้อน 𝄋 แล้วข้ามไปโคดา (D.S. al Coda)', place: [{kind:'ds',al:'coda'}, {kind:'segno',drop:true}, {kind:'to-coda',drop:true}, {kind:'coda',drop:true}] },
]
```
- **behavior `'jump'`** ใน `effectFor`: `case 'jump': return withJumpMarker(content, loc, {kind, al})` (ฟังก์ชันใหม่ §6).
- `anchor` = กติกา snap: **`before`** (segno/coda = จุดเข้า วางหน้าโน้ต) · **`after`** (fine/to-coda/dc/ds = จุดออก
  วางหลังโน้ต) — ตรง resolver `scanFlowMarkers` (`songModel.js`).

---

## 3. Flow การป้อน (3 ทาง · ตาม caret model)

### 3.1 เรียกเมนู (ไม่กินคีย์โน้ต)
- **Ctrl+K** (command palette · desktop) หรือ **⋮ เพิ่มเติม → "ใส่สัญลักษณ์วน/นำทาง"** (mobile + discoverable) →
  เปิดรายการ **preset ภาษาคน** (§2 JUMP_PRESETS) ก่อน · ปุ่ม "โหมดมือโปร (วางทีละชิ้น)" ล่างสุดสำหรับ JUMP_COMMANDS.
- ป้อน **ณ ตำแหน่ง caret** (`curIdx`) — caret อยู่ระหว่างโน้ตไหนก็ได้ = **กลางห้องได้ฟรี** (`midbar §3`).

### 3.2 preset → dropzone (auto-link กัน broken routing · iReal/Dorico)
เลือก preset เช่น "D.S. al Coda" →
1. ระบบ **วางคำสั่ง (ds al:coda) ที่ caret ทันที** (จุดที่ผู้ใช้อยู่ = ท้ายท่อนที่จะย้อน).
2. **"งอก" placeholder ที่ต้องเติม** (`drop:true`): Segno · To-Coda · Coda — แสดงเป็น **chip ค้าง** บนแถบ
   "ยังต้องวาง: [𝄋 Segno] [ไปโคดา] [𝄌 Coda]" + ไฮไลต์ที่ยังไม่วาง.
3. ผู้ใช้ **แตะ chip → แตะโน้ตปลายทาง** (หรือเลื่อน caret ไปโน้ต แล้วกด "วางที่นี่") → ระบบแทรก marker +
   **มินต์ id ผูกอัตโนมัติ** (`mintMarkerIds` · to-coda↔coda pair by kind — §7) → chip เปลี่ยนเป็น ✓.
4. **วางไม่ครบ = เตือน ไม่ปล่อยเงียบ**: `findOrphanJumps` (`songFlow.js`) → แถบ "ยังไม่ได้วาง Coda" ค้างจนครบ.

### 3.3 โหมดมือโปร (วางทีละชิ้น)
JUMP_COMMANDS ทีละตัวที่ caret — คนที่รู้ทฤษฎี / เคส preset ไม่ครอบ (multi-coda ฯลฯ).

---

## 4. mid-bar placement + snap-to-clean-boundary (บังคับ · `midbar §2–3`)

- caret อยู่กลางห้องได้ → วาง marker กลางห้องได้ทันที (line item แทรกตรง stream index).
- **snap-to-clean-boundary:** marker เกาะ **"โน้ต attack ที่กินพยางค์ (มี `syk`) และไม่กลาง `{}` tuplet"** เสมอ.
  ถ้า caret อยู่บนกล่องต่อเสียง (`-`/`~`) หรือกลาง tuplet/melisma → **snap ไป boundary ใกล้สุด + โชว์ anchor ที่
  resolve ได้** (ผู้ใช้เห็นว่าจะเกาะตรงไหนจริงก่อนยืนยัน).
  - หมายเหตุ: parser เก็บ `{}`/`()`/`~`/`-` **ใน 1 segment (1 si)** และ marker เป็น line item ระหว่าง segment →
    **แยกกลางหน่วยพวกนี้ไม่ได้เชิงโครงสร้างอยู่แล้ว** (พิสูจน์ใน `flow-jumps-midbar.test.js`). snap = UX ให้เห็นชัด
    (ไม่ใช่กันพัง engine ซึ่งกันเองแล้ว).

---

## 5. เห็น/แก้/ลบ (feedback ชัด · ไม่งง)

- **เห็น inline:** glyph วาดโดย render lane ที่ตำแหน่ง marker (`SongSheet.classifyJump`) — segno/coda = SVG,
  D.C./D.S./Fine = ข้อความ · **กลางห้อง = วาดกลางห้อง** (positioned).
- **breadcrumb "ลำดับเล่นจริง"** (`repeat-jumps §2.4`): แถบบน/ล่าง editor `Intro ➔ ข้อ1 ➔ รับ ➔ ข้อ1(D.S.) ➔
  รับ(To Coda) ➔ Coda` — กางจาก `resolvePlayOrder` (มีแล้ว · deterministic) · **อัปเดต real-time ตอนวาง/ลบ** →
  ผู้ใช้เห็นผลก่อนเล่นจริง ไม่ต้องจินตนาการเส้นโยง.
- **แก้:** แตะ glyph (edit mode) → popup เล็ก: เปลี่ยน kind/al · หรือย้าย (แตะ→แตะโน้ตใหม่) · หรือ **ลบ**.
- **ลบ:** ปุ่มถังขยะในpopup (≥24px · WCAG 2.5.8) · ลบคำสั่ง dc/ds ที่มี placeholder → ถาม "ลบทั้งชุด (Segno+Coda
  ด้วย) ไหม?" (กัน orphan ค้าง).

---

## 6. engine ที่ dev ต้องเพิ่ม (songEdit.js · สำหรับ build · lane นี้ไม่ลงโค้ด)

- **`withJumpMarker(content, loc, {kind, al})`** — แทรก `{type:'jump',kind,al?}` เข้า stanza line ที่ loc
  (resolve loc→(stanza, line, index) เหมือน note edits) · anchor before/after ตาม kind (§2) · เรียก `mintMarkerIds`
  หลังแทรกให้ id · **snap loc ไป clean boundary** ก่อนแทรก (§4).
- **`removeJumpMarker(content, loc/id)`** · **`updateJumpMarker(content, id, {kind,al})`**.
- ต่อ behavior `'jump'` ใน `effectFor` (§2) → dual-dispatch เดียว (keyboard palette + ⋮ menu) เหมือน CP-0.
- guards มีแล้ว (`mint/strip/findOrphanJumps` · Phase 2 — `mintMarkerIds` รู้จัก `type:'jump'` แล้ว) → wire เข้า
  paste/insert path.
- 🔴 **jump-shape gap ที่ต้องปิดตอน build (อ่านโค้ดจริง):** `src/lib/editorSerde.js` `KNOWN_ITEM_TYPES` (`:47`)
  = `continue section label end marker repeat-start repeat-end pickup volta bar segment` — **ไม่มี `jump`/`segno`/
  `coda`/`fine`** → round-trip ตัวแก้จะ **ทิ้ง marker ตอน serialize**. dev ต้อง **เพิ่ม `'jump'`** (+ legacy
  `segno`/`coda`) เข้า `KNOWN_ITEM_TYPES` ก่อน ไม่งั้นวางแล้วหาย. (memory `pleng-inline-editor-content-model`)
- ⛔ **ไม่แตะ resolver/playback** (เสร็จ Phase 2 แล้ว) · lane นี้แค่เขียน data ที่ resolver อ่าน.

---

## 7. Acceptance Criteria (วัดได้ · พร้อม build)

1. **AC-1 เข้าถึง:** ในโหมดแก้ กด **Ctrl+K** (desktop) หรือ **⋮ → ใส่สัญลักษณ์วน/นำทาง** (mobile) → เห็นรายการ
   preset ภาษาคน 6 อัน + ปุ่มโหมดมือโปร · **⛔ ไม่กินคีย์โน้ต** (พิมพ์เลข/`_.~^` ยังทำงานปกติ)
2. **AC-2 preset:** เลือก "D.S. al Coda" → คำสั่งลงที่ caret + chip "ยังต้องวาง: Segno·To-Coda·Coda" ค้าง →
   แตะ chip→แตะโน้ต วางครบ 3 → chip ✓ ทั้งหมด · id ผูกถูก (to-coda↔coda by kind) · เล่นย้อนถูก (ผ่าน resolver)
3. **AC-3 กัน orphan:** วางไม่ครบ (ลืม Coda) → แถบเตือน "ยังไม่ได้วาง Coda" ค้าง · `findOrphanJumps` รายงาน ·
   ⛔ ไม่ปล่อยเล่นมั่ว (resolver fail-safe เล่นตามเขียน)
4. **AC-4 mid-bar:** เลื่อน caret ไป**กลางห้อง** (ระหว่างโน้ต 2 ตัวในห้องเดียว) → วาง Segno → glyph วาดกลางห้อง
   นั้น (ไม่เด้งไปหัว/ท้ายบรรทัด) · เล่น D.S. เข้ากลางห้องถูก (Phase 2 engine)
5. **AC-5 snap:** วาง marker บนกล่องต่อเสียง (`-`/`~`) หรือกลาง `{}` → snap ไป attack ใกล้สุด + โชว์ anchor ก่อนยืนยัน
6. **AC-6 breadcrumb:** วาง/ลบ marker → แถบ "ลำดับเล่นจริง" อัปเดต real-time ตรงกับ `resolvePlayOrder`
7. **AC-7 แก้/ลบ:** แตะ glyph → popup เปลี่ยน kind/al / ย้าย / ลบ · ลบคำสั่งที่มีชุด → ถามลบทั้งชุด
8. **AC-8 มือถือ:** palette = **bottom-sheet** (ไม่ใช่ popover) · เป้ากด ≥24px · chip/ปุ่มลบ ≥24px · ไม่โดนแป้นบัง
9. **AC-9 a11y:** Ctrl+K + ⋮ มี `aria-haspopup`/`aria-expanded` · รายการ `role=listbox` · Esc ปิด · โฟกัสคืน caret
10. **AC-10 registry SSOT:** JUMP_COMMANDS/JUMP_PRESETS อยู่ใน editorCommands.js ที่เดียว · keyboard+menu อ่านชุดเดียว
    (drift-killer test แบบ CP-0) · ⛔ ไม่ hard-code kind ที่อื่น
11. **AC-11 Guide:** อัปเดต `Guide.vue` (กฎ `pleng-guide-always-updated`) — วิธีใส่ D.C./D.S./Coda เมื่อ build จริง
12. **AC-12 ไม่ regress:** โน้ต/คอร์ด/lyric/undo เดิมทำงานปกติ · light/dark · i18n-ready (`t()`)
13. **AC-13 round-trip:** วาง marker → save → reload → **marker ยังอยู่ครบ (kind/al/id)** · พิสูจน์ `editorSerde`
    round-trip เก็บ `{type:'jump'}` (unit test: serialize→deserialize เพลงที่มี jump = เท่าเดิม)

---

## 8. ยังไม่พิสูจน์ / รอ (no silent gap)

- ⏳ **G consult (meeting-room · บังคับ §4.5 ข้อ 10):** verify (1) preset+dropzone flow ดีสุดสำหรับมือใหม่ไหม
  (2) mid-bar placement UX (แตะกลางห้อง) งงไหม เทียบ MuseScore/Dorico (3) breadcrump vs เส้นโยง (4) การลบชุด
  (delete cascade) มาตรฐานทำยังไง. **ต้องการ P'Aim launch meeting-room** (`ceo/tools/meeting-room` · login ครั้งเดียว
  Chromium :9222) — flag เป็น dependency. transcript → `work/ปรับ pl edit ui/meetings/2026-07-24-marker-entry/`.
- ⏳ **prototype:** ยังไม่มี (SOP `no-throwaway-mockups` = สร้างบน real component ตอน build · lane นี้ = spec+AC).
- ⚠️ **Ctrl+K ว่างจริงไหมในโหมดแก้** — dev เช็ก keydown `SongViewer.vue:375–447` ก่อน implement (เหมือน chord `C` §3).
- ⚠️ **coordinate กับ command-palette lane** (`docs/ds/command-palette.md`) ถ้ามี Ctrl+K อยู่แล้ว → jump = หมวดหนึ่งในนั้น
  ไม่สร้าง palette คู่ขนาน.
