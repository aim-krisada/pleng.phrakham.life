# D.C. / D.S. / Segno / Coda / Fine — playback jump resolver (design spec)

**สถานะ:** Phase-1 spec (locked to verified standard) → Phase-2 engine on branch `dc-ds-jumps`.
**ผู้ใช้จุดเริ่ม:** พี่เปา ถาม "ย้อน D.C./D.S. ทำไง" — วันนี้เป็น **ข้อความ label เฉยๆ** เล่นไม่ตาม.

## หลักฐานมาตรฐาน (เปิดตรวจเอง ไม่เชื่อคำบอกเล่า)

W3C MusicXML 4.0 `<sound>` — <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/sound/>
(verify ครั้งนี้เอง 2026-07-24 · ตรงกับที่ `docs/ds/repeat-flow-override.md` บน branch nostalgic-perlman ตรวจไว้):

| attribute | สเปกเขียนว่า | แมปของเรา |
|---|---|---|
| `dacapo` | "go back to the beginning of the movement" · ค่า `yes` เสมอ · default = **first time through** | `flow.jump: "capo"` |
| `dalsegno` | "the **starting point** for a backward jump to a segno sign" · default first time through | `flow.jump: "segno"` (คำสั่งอยู่ท้ายข้อ) |
| `segno` | "the **end point** for a backward jump to a segno sign" | marker `{type:'segno', id}` (ปลายทางย้อน) |
| `tocoda` | "the **starting point** for a forward jump to a coda sign" · default = **second time through** | marker `{type:'coda', id, role:'source'}` (To Coda) |
| `coda` | "the **end point** for a forward jump to a coda sign" | marker `{type:'coda', id, role:'target'}` (Coda) |
| `fine` | "Follows the final note or rest in a movement with a da capo or dal segno direction" | marker `{type:'marker', kind:'fine'}` |
| `time-only` | "which times to apply … through a repeat" | To-Coda `activeOnPass` (default 2) — forward-compat |

**ปรึกษา G รอบ 1** (Gemini Pro · แชต `pleng-dcds-jump-flow-2026-07-24` · transcript:
`work/ปรับ pl edit ui/meetings/2026-07-24-dc-ds/{01-sent-to-G,02-reply-from-G}.md`) — ยืนยันโมเดล + ตอบ 5 edge cases (ดูตัดสินใจด้านล่าง).

## โมเดลข้อมูล

**คำสั่งกระโดด** = ฟิลด์บน arrangement entry (ต่อจาก R3 flow เดิม), ยิงตอน **จบ range ของข้อนั้น**:

```jsonc
"flow": { "jump": "capo" }   // "capo" = D.C. (ย้อนต้นเพลง) · "segno" = D.S. (ย้อนไป segno marker)
                             // "none" = ไม่กระโดด (ปิด default ที่อาจ inherit — เผื่อไว้)
```

⛔ **ไม่มี `jump:"coda"`** — G ยืนยันเป็น anti-pattern. Coda เป็น "การกระโดดแทรก (intercept)" ที่ทำงาน
เฉพาะตอนอยู่ในรอบย้อน (`isJumpPass`), ขับด้วย **marker ล้วน** ไม่ใช่คำสั่งกระโดดหลัก.

**Marker** = item ใน stanza line (มี id ถาวร มินต์โดย `mintMarkerIds` อยู่แล้ว):
- `{type:'segno', id:'s1'}` — ปลายทางของ D.S.
- `{type:'coda', id:'c1', role:'source'}` — To Coda (จุดออกกลางเพลง ตอนรอบย้อน)
- `{type:'coda', id:'c1', role:'target'}` — Coda (ท่อนท้ายที่กระโดดไปหา) · จับคู่ด้วย id เดียวกัน
- `{type:'marker', kind:'fine'}` — จุดจบตอนวิ่งย้อนกลับมา

**al-Fine / al-Coda ไม่เก็บในคำสั่ง** — "งอก" จากการมี marker (ตรง MusicXML: `dacapo` ไม่บอกเอง ·
`fine`/`coda` sound element ต่างหากที่บอก). ผู้ใช้ใส่ **Fine หรือ Coda อย่างใดอย่างหนึ่ง** ต่อหนึ่งการย้อน.

## semantics การเล่น (ยืนยัน W3C + G)

1. **รอบแรก (ก่อน D.C./D.S.):** เล่นทั้งเพลงตามลำดับปกติ (base/strophic order) · **เพิกเฉย Fine และ To-Coda**
   (Fine/To-Coda สังเกตเฉพาะ "รอบย้อน" — W3C: tocoda default second time through).
2. **เจอคำสั่งกระโดดท้ายข้อ J:**
   - `capo` → กลับไป display line แรก (li 0)
   - `segno` → กลับไป display line ของ segno marker **ตัวแรกในลำดับเล่น**
3. **รอบย้อน (`isJumpPass=true`):** เล่นไปข้างหน้าจากปลายทางย้อน โดย:
   - เจอ **Fine** → หยุด (จบเพลง) — al Fine
   - เจอ **To-Coda source** → กระโดดไป **Coda target** เล่นต่อจนจบ — al Coda
   - ไม่มีทั้งคู่ → เล่นถึงปลายเพลงแล้วหยุด — D.C./D.S. เปล่า
   - **ข้าม `:‖` backward repeat ทุกตัวในช่วงย้อน** (W3C after-jump default = ไม่วนซ้ำหลังกระโดด)
4. **ชน Fine + Coda พร้อมกัน** → lint error; runtime **Coda ชนะ** (เจอ To-Coda ก่อน Fine ในลำดับเล่นเสมอ — G).
5. **ข้อ arrangement หลังข้อที่มี jump** = dead code / เล่นไม่ถึง (เพลงจบที่ Fine/Coda) → lint เตือน.
6. **Repeat ภายใน Coda เอง** = เล่นวนตามปกติ (กฎ "ไม่วน" ใช้เฉพาะช่วงวิ่งย้อน ไม่ใช่ใน Coda — G).
7. **Nested jump** (D.S.-in-D.C.) = ไม่รองรับ v1 · resolver เล่น **รอบย้อนเดียว** แล้วหยุด → loop-safe โดยธรรมชาติ
   (คำสั่งกระโดดในรอบย้อนไม่ re-trigger).

## สถาปัตยกรรม engine — seam ที่ `songModel.js resolvePlayOrder`

section-level play order เป็น `[{fromLi,toLi}]` ranges อยู่แล้ว · `buildPlayNotes` ต่อ ranges + filter ตาม `li`.
Jump = **ต่อ range รอบย้อน** หลัง range ของข้อ J:

| เคส | ranges ที่ต่อเพิ่มหลังข้อ J |
|---|---|
| capo al Fine | `{0 … liFine}` |
| segno al Fine | `{liSegno … liFine}` |
| capo al Coda | `{0 … liToCoda}` + `{liCoda … last}` |
| segno al Coda | `{liSegno … liToCoda}` + `{liCoda … last}` |
| capo/segno เปล่า | `{0 … last}` / `{liSegno … last}` |

`liSegno/liCoda` = บรรทัดของ marker (วางหัวบรรทัด) · `liFine/liToCoda` = บรรทัดของ marker (วางท้ายบรรทัด).
ประกอบกับ strophic order ("กางก่อน แล้วค่อยตัด": strophic ก่อน → jump ต่อท้าย) และ bar-level `expandRepeats` เดิม.

## SAFETY GUARDS (บังคับ — jump ที่ไม่ผ่าน guard = เล่นผิดเงียบ)

- `mintMarkerIds` — มินต์ id ให้ segno/coda/fine (ทำ segno/coda อยู่แล้ว · **เพิ่ม pairing role source↔target ด้วย id เดียว**).
- `stripEditorMarkerIds` — **เพิ่ม** clear `segnoId`/`codaId` ตอน copy-paste (กัน 2 marker id ซ้ำ = กระโดดกำกวม).
- `findOrphanFlows` — **เพิ่มเคส `jump`**: `jump:"segno"` แต่ไม่มี segno marker = กำพร้า → เพิกเฉย เล่นตามทำนอง ⛔ ไม่กระโดดมั่ว.
  (`jump:"capo"`/`"none"` ไม่มีวันกำพร้า — ต้นเพลงมีเสมอ).
- resolver ต้องรับ `knownIds` และ **fallback = ไม่กระโดด** เมื่อ target หาย (เหมือน R4 skip/times).

## ตัดสินใจ scope V1 + ข้อจำกัดที่รู้ล่วงหน้า (⚠️ ต้องบอก PM — no silent caps)

- ✅ **ทำ:** capo/segno · al Fine · al Coda (To-Coda→Coda) · guards ครบ · unit tests พิสูจน์ลำดับจากโมเดล.
- ⚠️ **known limit 1 — marker granularity = line-level:** Fine/To-Coda สังเกตที่ **ท้ายบรรทัด** ของ marker ·
  Segno/Coda ที่ **หัวบรรทัด**. G ว่า mid-line "บ่อยพอสมควร" → v1 ให้ผู้ใช้เคาะขึ้นบรรทัดใหม่เพื่อจัด marker ให้ตกหัว/ท้ายบรรทัด
  (workaround) · **data เก็บตำแหน่ง item แม่นอยู่แล้ว** (marker เป็น item ในสตรีม) → v2 honor mid-line ได้โดยไม่ต้องรื้อ.
- ⚠️ **known limit 2 — `:‖` ในช่วงที่ถูกวิ่งย้อน:** v1 filter จาก note stream ที่ expand repeat แล้วครั้งเดียว →
  ถ้าช่วงย้อน (ระหว่างปลายทางย้อน↔Fine/To-Coda) มี `:‖` มันจะ **วนซ้ำ** (ผิด after-jump default).
  เคสหลัก (D.C./D.S. ไป section ที่ไม่มี `:‖` ภายใน จบที่ Fine) = ถูกต้อง · v2: ใส่ flag `noRepeat` บน range.
- ⏳ **forward-compat (โครงเผื่อ ไม่มี UI/engine v1):** To-Coda `activeOnPass:[2]` (pass-specific) · multiple segno (id รองรับแล้ว) · `flow.path` (through-composed · MEI `<expansion @plist>`).

## Phase 3 — UI (GATED ON PM · ไม่แตะ SongViewer.vue)

วันนี้ D.C./Fine พิมพ์เป็น free-text ที่ `curLine().label` (EditorMode.vue:3225) — cosmetic.
`flow.jump` serialize แล้ว (EditorMode.vue:217) แต่ไม่มี UI เขียน. เสนอ (รอ PM sequence):
ยก segno/coda/Fine/jump ออกจาก raw JSON textarea เป็น **guarded control** ใน EditorMode.vue (ตัวแก้เก่า) —
ไม่ชนคิว SongViewer.vue (ตัวแก้ inline ใหม่). รายละเอียด + mock รอเคาะกับ PM.
