# Repeat & navigation symbols — design + AC (การวนร้อง / การกระโดด)

**สโคป:** ออกแบบ (ไม่ลงโค้ด) ให้ผู้ใช้ **ใส่ / เห็น / แก้** สัญลักษณ์การวนร้อง+กระโดดครบชุด
(‖: :‖ · volta · D.C. · D.S. · Segno · Coda/To-Coda · Fine · จบเพลง ‖ · รับ) ให้เล่น/พิมพ์ถูก และ
เข้าชุดเดียวกับ editor ปัจจุบัน + ทิศทาง ground-up. **P'Aim: DESIGN ก่อน แล้วโค้ดปรับนิดเดียว.**

**ฐานที่ไม่ทำซ้ำ (อ่านประกอบ):**
- `docs/ds/repeat-flow-override.md` (branch `nostalgic-perlman-7b5f10`) — งานวิจัยมาตรฐาน verify กับ W3C
  MusicXML 4.0 แล้ว (มี URL ครบ) + model mapping. **ใช้เป็นฐานข้อเท็จจริงมาตรฐาน.**
- `docs/ds/dc-ds-jump-flow.md` (lane นี้) — semantics + resolver ที่ verify W3C เอง + ปรึกษา G รอบ 1.
- `docs/ds/editor-flow-polish.md` §5/§6 (branch `optimistic-kare-b535ad` @6615d6f) — caret/keyboard/symbol
  model (SSOT ของการป้อนสัญลักษณ์). `work/ปรับ pl edit ui/ux-groundup-design.md` — ดีไซน์ ground-up ล็อก.
- `docs/song-model-v2.md` — โมเดล stanza + arrangement (strophic).

---

## 0. หลักฐานจากคลังจริง (grounded · ดึงจาก DB จริง 2026-07-24)

ดึง content ทั้งคลัง **170 เพลง** (v2 ทั้งหมด) นับ markup การวนร้อง/นำทางจริง:

| construct | จำนวนเพลง | หมายเหตุ |
|---|---|---|
| **จบเพลง ‖ (`type:"end"`)** | **145 / 170** | เกือบทุกเพลง — final barline คือมาตรฐานที่ผู้ใช้ใช้จริงอยู่แล้ว |
| **รับ / refrain (คำว่า "รับ")** | 105 | ท่อนรับคือ "การวนร้อง" ที่พบมากที่สุด |
| **`afterEachVerse` (รับทุกข้อ)** | 45 | กลไก strophic ที่มีอยู่ + ทำงานแล้ว |
| **`‖: :‖` (repeat-start/end)** | **3** (#3, 72, 79) | โครงสร้าง repeat แบบมีเส้น — พบน้อยมาก |
| **volta (ห้องจบ 1./2.)** | **0** | ยังไม่มีใครใช้ |
| **D.C. / D.S. / Segno / Coda / Fine (structured)** | **~0** | **ดูข้อสังเกตล่าง** |

🔴 **ข้อสังเกตสำคัญ — discoverability trap (ไม่ใช่ "ไม่ต้องการ"):**
คลังวันนี้ **แทบไม่มี D.C./D.S./Segno/Coda/Fine เลย** — แต่ **ไม่ได้แปลว่าไม่ต้องใช้** · แปลว่า
**ระบบยังใส่ไม่ได้** (วันนี้เป็นแค่ label ข้อความ เล่นไม่ตาม → ไม่มีใครใส่). ความต้องการจริงมาจาก:
1. **พี่เปาถามตรง ๆ "ย้อน D.C./D.S. ทำไง"** (= ผู้ใช้รายวันต้องการ)
2. **ต้นฉบับหนังสือเพลง** (เล่มใหญ่/YS 2014) ที่มีสัญลักษณ์พวกนี้บนกระดาษ แต่ยัง key ลงระบบไม่ได้
⇒ **วัดความต้องการจากต้นฉบับ + คำขอผู้ใช้ ไม่ใช่จากคลังปัจจุบัน** (นับคลัง = 0 เพราะทำไม่ได้ ไม่ใช่ไม่จำเป็น)
(หลักนี้ตรงกับ `feedback_correctness_not_a_numbers_game` — ถึง 1 เพลงก็ต้องทำให้ถูก · ความถี่จัดลำดับ UI ไม่ใช่ตัดสินว่าทำไหม)

**นัยต่อ UX:** สิ่งที่ผู้ใช้ทำบ่อย (รับ 105 · จบเพลง 145) ต้องง่ายสุด/เด่นสุด · D.C./D.S./Coda (หายาก)
= อยู่ลึกลงไป (progressive disclosure) แต่ **เข้าถึงได้และทำถูก 100%**.

---

## 1. Survey construct ครบชุด + แมปมาตรฐาน + แมปโมเดล v2

(semantics verify กับ W3C MusicXML 4.0 `<sound>` / `<barline>` เอง — ดู `dc-ds-jump-flow.md` §หลักฐาน)

| # | construct | ความหมาย | มาตรฐาน (element/attr) | โมเดล v2 |
|---|---|---|---|---|
| 1 | `‖: :‖` + count | วนท่อน N รอบ | `<repeat>` @times, `<barline>` | `{type:repeat-start/end, id, times}` ✅มี |
| 2 | volta 1./2./n. | ห้องจบต่างรอบ | `<ending number="1,2">` | `{type:volta, id, num:[..]}` ✅มี |
| 3 | **D.C.** | ย้อนต้นเพลง | `<sound dacapo="yes">` (first time through) | `flow.jump:"capo"` (ระดับท่อน) |
| 4 | **D.C. al Fine** | ย้อนต้น หยุดที่ Fine | dacapo + `fine` | capo + มี Fine marker |
| 5 | **D.C. al Coda** | ย้อนต้น แล้วกระโดด Coda | dacapo + `tocoda`+`coda` | capo + To-Coda+Coda markers |
| 6 | **D.S.** | ย้อนไป Segno | `<sound dalsegno>` | `flow.jump:"segno"` + Segno marker |
| 7 | **D.S. al Fine / al Coda** | ย้อน Segno → Fine / Coda | dalsegno + fine / tocoda+coda | segno + marker |
| 8 | **Segno 𝄋** | จุดหมายของ D.S. | `<sound segno>` "end point" | `{type:segno, id}` (point marker) |
| 9 | **To Coda 𝄌** | จุดออกกลางเพลง (รอบย้อน) | `<sound tocoda>` (second time through) | `{type:coda, id, role:"source"}` |
| 10 | **Coda 𝄌** | ท่อนท้ายที่กระโดดไป | `<sound coda>` "end point" | `{type:coda, id, role:"target"}` |
| 11 | **Fine** | จุดจบตอนวิ่งย้อน | `<sound fine>` | `{type:marker, kind:"fine"}` (point marker) |
| 12 | **จบเพลง ‖** (final barline) | จุดจบ *ทางสายตา* ของแผ่น | `<barline><bar-style>light-heavy` | `{type:"end"}` ✅มี (145 เพลง) |
| 13 | (รับ) / refrain | ท่อนรับ ร้องซ้ำ | (arrangement) | `afterEachVerse` ✅มี |
| 14 | 🆕 **Vamp / "วนจนให้สัญญาณ"** | วน intro/bridge รอผู้นำ (พบบ่อยในนมัสการ!) | `<measure-repeat>` / `<direction><text>Vamp` | ต้องออกแบบเพิ่ม (ดู §1.2) |
| 15 | 🆕 Multiple Coda (Coda II) | ย้อนซ้อน 2 ชั้น | `tocoda="coda2"` custom id | id ถาวรรองรับแล้ว (marker หลายตัว) |
| 16 | 🆕 Caesura // (Grand Pause) | หยุดจังหวะ (ไม่ใช่ jump) | `<fermata>` / caesura | fermata ✅มี · caesura ต้องเพิ่ม |

*(#14–16 = G Pro รอบ 2 surface เพิ่ม · Vamp สำคัญสุดสำหรับเพลงนมัสการ — ยังไม่มีในโมเดล)*

⏳ **เผื่อโครง ไม่มี UI รุ่นนี้:** `flow.path` (through-composed · MEI `<expansion @plist>`) สำหรับกระโดดซ้อน;
`flow.times`/`flow.skip`/`flow.ending`/`flow.skipSections` (per-verse override · ✅ engine มีแล้ว).

### 1.2 🆕 Vamp — "วนจนให้สัญญาณ" (G Pro รอบ 2 ชี้ว่าตกหล่น · พบบ่อยในนมัสการ)
วน intro/bridge ไปเรื่อย ๆ จนผู้นำให้สัญญาณ (ไม่ระบุจำนวนรอบตายตัว). ต่างจาก `‖: :‖ ×N` (นับรอบแน่นอน).
โมเดลยังไม่มี — เสนอ `{type:repeat-end, times:"vamp"}` หรือ flag `vamp:true` (เล่น = loop จนกดหยุด/ให้สัญญาณ ·
พิมพ์ = แสดง "Vamp" + เส้นซ้ำ). **ต้องเคาะกับ P'Aim/PM ว่าอยู่ในสโคปรอบนี้ไหม** (พบบ่อยแต่ต้องมี UI "หยุด vamp").

### 1.1 🔴 พี่เปาถาม: **Fine ต่างจาก "จบเพลง ‖" ยังไง** (ตอบให้ชัด)

| | **จบเพลง ‖** (final barline) | **Fine** |
|---|---|---|
| คืออะไร | จุดจบ **ทางสายตา** ของแผ่นเพลง (เส้นคู่ บาง+หนา) | จุดจบ **ทางการเล่น** ตอนวิ่งย้อนกลับ |
| ต้องมี D.C./D.S. ไหม | **ไม่** — ทุกเพลงมี (จบตรงนี้) | **ใช่** — มีความหมายเฉพาะเมื่อมี D.C./D.S. |
| รอบแรกเล่นเจอแล้วทำไง | เพลงจบ (ถ้าไม่มีย้อน) | **เล่นผ่านไป** (ไปหา D.C./D.S. ข้างหน้า) |
| รอบย้อนเล่นเจอแล้วทำไง | — | **หยุด** (นี่คือจุดจบจริงของ "al Fine") |
| ตำแหน่ง | ท้ายสุดของแผ่น | มัก **ก่อน** ท้ายแผ่น (เพราะ D.C. text อยู่ท้ายสุด) |

สรุปภาษาคน: **"จบเพลง ‖" = ตรงนี้แผ่นจบ** (ผู้ใช้ 145 เพลงใช้อยู่แล้ว) · **"Fine" = ตอนย้อนกลับมา
ให้จบตรงนี้** (ใช้เฉพาะเพลงที่มี D.C. al Fine / D.S. al Fine). เพลงส่วนใหญ่ใช้แค่ ‖ · Fine โผล่เฉพาะ
เพลงมีย้อน. **ห้ามรวมเป็นปุ่มเดียว** (คนละความหมาย) แต่ **วางใกล้กันในเมนูเดียว** (ทั้งคู่ = "จบ/ปิดท้าย").

---

## 2. UX — ใส่ / เห็น / แก้ (world-class · ผู้ใช้ = คนทำเพลงโบสถ์ ไม่ใช่นักดนตรีอาชีพ)

### 2.1 เทียบมาตรฐานโลก
- **MuseScore** — palette "Repeats & Jumps": เลือกห้อง → double-click/ลากสัญลักษณ์ลงห้อง. ผู้ใช้ต้อง
  **ประกอบเอง 4 ชิ้น** (Segno + To-Coda + Coda + ข้อความ "D.S. al Coda") และรู้ว่าวางตรงไหน.
  [handbook](https://handbook.musescore.org/notation/repeats/jumps-and-markers) ·
  [how-to](https://musescore.org/en/node/291062) — ทรงพลังแต่ **ต้องมีความรู้โน้ต** = สูงไปสำหรับผู้ใช้เรา.
- **หลักที่ได้:** สัญลักษณ์เกาะ **ห้อง** (measure-scoped) · การเล่น = engine จับคู่ marker อัตโนมัติ.

### 2.2 🎯 ข้อเสนอสำหรับผู้ใช้เรา — **"preset สำเร็จรูป" แทนการประกอบเอง**
ผู้ใช้เรา **ไม่ต้องรู้ว่า D.S. al Coda ประกอบด้วย 4 ชิ้น** — เลือก **รูปแบบสำเร็จ** ทีเดียว ระบบวางให้:

| ผู้ใช้เลือก (ภาษาคน) | ระบบวางให้ | ผู้ใช้แค่ |
|---|---|---|
| "ย้อนต้นเพลง" (D.C.) | ตั้ง `flow.jump:capo` ที่ท่อนนี้ | — |
| "ย้อนต้น แล้วจบที่ Fine" (D.C. al Fine) | capo + วาง Fine marker | ลาก Fine ไปจุดจบจริง |
| "ย้อนไปเครื่องหมาย 𝄋 (D.S.)" | วาง Segno + ตั้ง jump:segno | ลาก Segno ไปจุดหมาย |
| "ย้อน 𝄋 แล้วข้ามไปท่อนท้าย (al Coda)" | Segno + To-Coda + Coda + jump:segno | ลาก 3 จุด |

⇒ ลด cognitive load จาก "รู้ทฤษฎี" → "เลือกสิ่งที่อยากได้". (ตรงหลัก ground-up §1 "Object+Action ไม่ใช่ Mode"
+ `feedback_deliver_user_concrete_want` — ให้สิ่งที่ผู้ใช้อยากได้ตรง ๆ + เสนอ world-class ควบ.)
**ยังต้องเปิด "โหมดมือโปร"** ให้วาง marker ทีละชิ้นได้ด้วย (คนที่รู้ + เคส preset ไม่ครอบ).

**🎯 กลไก "dropzone" (G Pro รอบ 2 · เทียบ iReal Pro auto-link · Dorico smart-panel):** เลือก preset
"D.S. al Coda" → ระบบ **"งอก" placeholder 3 จุด** (Segno · To Coda · Coda) เป็น **dropzone ที่ต้องเติม** →
ผู้ใช้แค่ลากแต่ละจุดไปที่ตำแหน่งในเพลง → **ระบบผูก id ให้อัตโนมัติ กัน broken routing** (ลืมวาง Coda / id ไม่ตรง =
ปัญหาที่ MuseScore ปล่อยให้พลาดเอง). ⇒ ผู้ใช้ไม่มีทางวางไม่ครบ.

**🔴 al-target ต้อง explicit ในคำสั่ง (G Pro รอบ 2 · A1):** al-Fine vs al-Coda **ตัดสินจากคำสั่งกระโดด**
(ผู้ใช้เลือก "al Fine" หรือ "al Coda") **ไม่ใช่เดาจาก marker ที่มี** — ตรง MusicXML (`<sound>` มี `fine` *หรือ*
`tocoda` อย่างใดอย่างหนึ่งต่อคำสั่ง ใช้คู่ไม่ได้). ⇒ ปรับโมเดล: `flow.jump` ควรพก exit-target ด้วย เช่น
`{jump:"segno", to:"coda"}` / `{jump:"capo", to:"fine"}` / `{jump:"segno"}` (เปล่า) — preset กรอกให้เอง.
(นี่คือ refinement จาก dc-ds-jump-flow.md ที่ให้ "งอกจาก marker" — รอบ 2 ชี้ว่าคำสั่งควรระบุชัด เพื่อไม่กำกวมตอนมีทั้ง Fine+Coda).

### 2.3 ที่อยู่ของคำสั่ง (integrate กับ caret/symbol model ของ optimistic-kare)
ตาม SA caret model (`editor-flow-polish.md`): สัญลักษณ์หายาก **ไม่กินคีย์โน้ต** → เข้าทาง **Ctrl+K
command palette หรือ ⋮ menu** · ป้อน ณ ตำแหน่ง caret (dual-dispatch `applySymbol` `SongViewer.vue:691`).

| สัญลักษณ์ | ระดับ | ที่ใส่ | เกาะที่ |
|---|---|---|---|
| Segno 𝄋 · Coda/To-Coda 𝄌 · Fine · จบเพลง ‖ | **point marker** | บนแผ่นเพลง · Ctrl+K/⋮ (ป้อนที่ caret) | เป็น **item type ของตัวเองใน v2 line** (แบบ `{type:"bar"}` `withBarAfter`) — ⛔ ไม่ยัดเป็น note-box mark (กินคีย์โน้ต) |
| D.C. / D.S. (+ al Fine/al Coda) | **directive ระดับท่อน** | ใน **Drawer "🎼โครง"** ที่บล็อกท่อน (ข้อ) | `flow.jump` บน arrangement entry |

(= ตอบคำถาม PM "อยู่ระดับท่อนหรือห้อง?" → **ทั้งคู่**: marker=ระดับห้อง/โน้ต บนแผ่น · jump=ระดับท่อน ใน Drawer —
ตรง MusicXML: marker อยู่ใน `<barline>`/`<direction>` ของ measure · jump เป็น `<sound>` direction.)

### 2.4 เห็นการไหล (ไม่งง)
- ใน Drawer โครงเพลง: ท่อนที่มี jump แสดงป้าย **"↩ ย้อนไป 𝄋" / "↩ ย้อนต้น → Coda"** อ่านเป็นภาษาคน
- **🎯 Linear Playback Track / breadcrumb (G Pro รอบ 2 · B3 · แทนเส้นโยง):** แถบ **"ลำดับเล่นจริง"** บน/ล่าง
  editor: `Intro ➔ ข้อ1 ➔ รับ ➔ ข้อ1(D.S.) ➔ รับ(To Coda) ➔ Coda` — อัปเดต real-time ตอนแก้โครง ·
  ผู้ใช้เห็น flattened array ไม่ต้องจินตนาการเส้นโยงข้ามหน้า (เส้นโยง = รก+อ่านยากบนจอเล็ก · G ค้าน).
  กาง through-composed จาก `resolvePlayOrder` เดิม (deterministic pipeline อยู่แล้ว).
- ตอนเล่น: ไฮไลต์วิ่งข้ามไปตามการกระโดด (buildPlayNotes ติด original-li ให้แล้ว)
- **WCAG 2.2 AA · touch≠pointer · มือถือ = bottom-sheet ไม่ใช่ popover · เป้ากด ≥24px** (ตาม ground-up)

---

## 3. Integration กับ "แก้โครง" (แผงโครงเพลง) + v2 strophic model

**โครงเพลงวันนี้** (`EditorMode.vue` §editor-section-ux ~:151 · Drawer ground-up):
- `arrangement[]` = ลำดับท่อน (ข้อ1·รับ·ข้อ2·ข้อ3) · ลาก reorder · แท็กทำนอง (stanza A/B) · `afterEachVerse`
- ทำนอง (`stanzas[]`) แยกจากการเรียง (arrangement) = **strophic model**

**การกระโดดเข้ากับระบบนี้ยังไง (ไม่สร้างระบบคู่ขนาน):**
1. **D.C./D.S. = property ของ "บล็อกท่อน" ใน Drawer** — เพิ่มที่ `arrangement[i].flow.jump` (มีในโมเดลแล้ว ·
   serialize แล้ว `EditorMode.vue:217`). บล็อกท่อนสุดท้ายมักถือคำสั่งย้อน. UI = ปุ่ม/เมนูบนบล็อกนั้น.
2. **Segno/Coda/Fine = marker บน "ทำนอง" (stanza line)** — เพราะจุดย้อน/จุดจบเป็นตำแหน่งในทำนอง
   ไม่ใช่ในการเรียง. ถ้าทำนองถูกใช้ซ้ำหลายข้อ marker ก็อยู่ที่เดียว (เจ้าของเดียวต่อข้อเท็จจริง).
3. **"กางก่อน แล้วค่อยตัด"** — `afterEachVerse` กางลำดับเต็มก่อน → jump ต่อท้าย (resolver ทำตามนี้แล้ว).
4. **แยกให้ชัด (เจ้าของเดียว):** จำนวนรอบ/ข้ามท่อน = `flow` per-verse (มี engine) · การย้อน = `flow.jump` +
   marker · ท่อนรับ = `afterEachVerse`. ไม่เก็บซ้ำ 2 ที่.

---

## 4. Resolver บนกระดาษ (ผ่าน guard · ไม่ลงโค้ด — แต่พิสูจน์ feasible แล้ว)

**seam = `songModel.js resolvePlayOrder`** (คืน `[{fromLi,toLi}]` ranges · `buildPlayNotes` ต่อ+filter ตาม li).
การกระโดด = ต่อ range "รอบย้อน" หลังท่อนที่มี jump (ตาราง `dc-ds-jump-flow.md` §สถาปัตยกรรม):

- `capo` → returnFrom = li 0 · `segno` → returnFrom = บรรทัด Segno แรก
- รอบย้อน: เจอ Fine→หยุด · เจอ To-Coda→กระโดด Coda→จบ · ไม่มี→เล่นถึงปลาย · **ข้าม ‖: :‖ ในช่วงย้อน** (after-jump)
- ชน Fine+Coda → Coda ชนะ (เจอ To-Coda ก่อน · G รอบ 1) · ท่อนหลัง jump = เล่นไม่ถึง (drop)

**🔴 ผ่าน guard เสมอ (jump ที่ไม่ผ่าน guard = เล่นผิดเงียบ):**
- `mintMarkerIds` — id ถาวรให้ Segno/Coda/Fine (มินต์ segno/coda อยู่แล้ว · round-trip stable)
- `stripEditorMarkerIds` — เคลียร์ id ตอน copy-paste **(ต้องเพิ่ม segnoId/codaId)** กัน 2 marker id ซ้ำ
- `findOrphanFlows` — **(ต้องเพิ่มเคส jump)** — `jump:"segno"` แต่ไม่มี Segno = กำพร้า → เพิกเฉย เล่นตามเขียน ⛔ ไม่เดา

**หลักฐาน feasibility:** engine + guard + 15 unit tests (ลำดับเล่น derived จากโมเดล) ทำเสร็จ+เขียวแล้วบน
branch นี้ (commits ก่อน P'Aim ปรับทิศ design-first) · `test:all` 1343 green · **design จะเป็นตัวนำ · engine
ปรับตามที่อนุมัติ** (ไม่ใช่ back-justify). พิสูจน์ว่า "โค้ดปรับนิดเดียว" ตามที่ P'Aim คาด = จริง.

---

## 5. Acceptance Criteria (design → dev หยิบไปทำตอนอนุมัติ)

1. ผู้ใช้ใส่ **D.C. / D.C. al Fine / D.C. al Coda / D.S. / D.S. al Fine / D.S. al Coda** ผ่าน "preset ภาษาคน"
   (§2.2) + โหมดมือโปรวาง marker ทีละชิ้น · **เล่นย้อนถูกตามมาตรฐาน** (pass แรก≠pass ย้อน · Fine/To-Coda เฉพาะรอบย้อน)
2. **จบเพลง ‖ vs Fine** แยกชัดใน UI (§1.1) · ผู้ใช้เข้าใจว่าใส่อันไหนเมื่อไหร่
3. Segno/Coda/To-Coda/Fine = **v2 line item types** เข้าทาง Ctrl+K/⋮ (ไม่กินคีย์โน้ต) · ป้อนที่ caret ·
   dual-dispatch เดียวกับ `applySymbol`
4. D.C./D.S. อยู่ใน **Drawer โครงเพลง** ที่บล็อกท่อน · แสดงป้ายภาษาคน + "ดูลำดับเล่นจริง"
5. ผ่าน guard ครบ (mint/strip/orphan) — **paste ไม่ทำ id ซ้ำ · marker ถูกลบ→jump กำพร้าไม่เล่นมั่ว**
6. WCAG 2.2 AA · มือถือ bottom-sheet · light/dark · i18n-ready (`t()`)
7. อัปเดต `Guide.vue` (กฎ `pleng-guide-always-updated`) เมื่อทำจริง

---

## 6. ยังไม่พิสูจน์ / รอ (เขียนกำกับ — no silent gaps)

- ✅ **G Pro รอบ 2 เสร็จ** (chip ยืนยัน Pro · transcript `meetings/2026-07-24-dc-ds/04-reply-from-G-round2.md`) —
  ยืนยัน A1–A5 มี URL + surface Vamp/MultiCoda/Caesura + endorse preset-dropzone + breadcrumb. รอบ 1 = `02-reply-from-G.md`.
- 🔴 **ต้อง verify ตอน export (G ขัดกับที่ค้นเอง):** รอบ 2 อ้าง attribute **`play-repeats`** (`<sound>`, default no)
  สำหรับ "ข้ามซ้ำหลังย้อน" แต่ `repeat-flow-override.md` verify ไว้ว่าเป็น **`after-jump`** (`<repeat>`). **semantic ตรงกัน**
  (default = ไม่วนซ้ำหลัง D.C./D.S.) แต่ **ชื่อ attribute ต่างกัน** → เปิดสเปกจริงตัดสินตอนทำ MusicXML export (R6) · ไม่กระทบ design/engine playback.
- 🆕 **Vamp** (§1.2) — G ชี้ว่าพบบ่อยในนมัสการ แต่โมเดลยังไม่มี → **ต้องเคาะว่าอยู่ในสโคปรอบนี้ไหม**
- ⚠️ **known limit v1 (จาก dc-ds-jump-flow.md):** marker = line-level (mid-line = v2 · G ว่า "บ่อยพอสมควร") ·
  `‖: :‖` ในช่วงที่ถูกวิ่งย้อนจะเล่นซ้ำ (v1) — **ต้องเป็นการตัดสินใจของ P'Aim/PM ไม่ใช่ default เงียบ**
- ⏳ **UX flow-view + preset labels** ยังไม่ทำ mockup — รอเคาะทิศก่อน (ไม่ทำ mockup ทิ้ง ตาม SOP)
- ⏳ **iReal Pro / Sibelius / Flat.io** เทียบเพิ่ม (ถาม G รอบ 2 ข้อ B1) — MuseScore ครอบหลักแล้ว
