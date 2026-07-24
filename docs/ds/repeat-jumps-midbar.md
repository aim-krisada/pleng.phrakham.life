# Mid-bar jumps — addendum to repeat-jumps.md (การกระโดด/วนร้อง "กลางห้อง")

**สโคป:** ปิดช่องว่าง **mid-bar** ที่ `repeat-jumps.md §6` + `dc-ds-jump-flow.md §known-limit-1` เลื่อนไว้เป็น v2.
**P'Aim ปรับทิศ 2026-07-24:** mid-bar jumps **อยู่ใน v1** — ต้นฉบับหนังสือเพลง (เล่มใหญ่/YS) + พี่เปายืนยันว่า
"กระโดดกลางห้อง" มีจริง ไม่ใช่เคสหายาก. addendum นี้ทำให้ Segno/Coda/Fine/To-Coda + จุดหมายกระโดด
**ลงกลางห้องได้เป็น first-class** ทั้ง (ก) โมเดล/resolver (ข) จังหวะห้องไม่เต็ม (ค) UX ป้อน.

**อ่านคู่:** `repeat-jumps.md` (design หลัก · merged) · `dc-ds-jump-flow.md` (resolver + W3C) ·
`editor-flow-polish.md §5–6` (caret/insert model · SSOT การป้อน) · **โค้ดจริงที่อ้างด้านล่างอ่านแล้ว
(spike branch `dc-ds-jumps`): `midi.js songToNotes/buildPlayNotes` · `songModel.js resolvePlayOrder`).**

---

## 0. ข้อค้นพบสถาปัตยกรรมที่ทำให้ mid-bar "เล็กกว่าที่กลัว" (อ่านโค้ดจริง ไม่เดา)

สามข้อนี้ตัดสินทั้ง addendum — verify จากซอร์สจริงบน branch `dc-ds-jumps`:

1. **โน้ตทุกตัวพก sub-line position อยู่แล้ว.** `songToNotes` (`midi.js:189`) แปะทุกโน้ตด้วย
   `{ midi, beats, li, bi, si, syk }` — `li`=บรรทัดแสดงผล (global) · `bi`=ห้อง**ภายในบรรทัด** (รีเซ็ต 0 ทุกบรรทัด) ·
   `si`=index ของ note-box **ในสตรีมของบรรทัดนั้น** (นับทุกกล่อง: โน้ต/rest/`-`) · `beats`=**ความยาวของโน้ตตัวนั้นเอง**.
   ⇒ ตำแหน่ง "กลางห้อง" ของโน้ตหนึ่ง ถูกระบุแม่นด้วย **(li, si)** ในข้อมูลอยู่แล้ว.

2. **"line-level" เป็นสมบัติของ RANGE ENDPOINT ไม่ใช่ของข้อมูล.** `resolvePlayOrder` คืน `[{fromLi,toLi}]`
   (`songModel.js:189`) แล้ว `buildPlayNotes` กรองด้วย `all.filter(n => n.li >= r.fromLi && n.li <= r.toLi)`
   (`midi.js:592`) — **หยาบระดับบรรทัดเพราะปลาย range เก็บแค่ `li`** ทั้งที่โน้ตมี `si` ครบ.
   ⇒ mid-bar = **ยกปลาย range จาก `li` → `(li, si)`** เท่านั้น. ข้อมูลไม่ต้องเปลี่ยนเลย.

3. **🔴 pleng ไม่มี meter / time-signature enforcement.** `songEdit.js` **ไม่มี** การนับ beat/ความจุห้อง/
   validate 4/4 เลย (grep = 0) · `content.timeSignature` ใช้ที่เดียวคือประเมิน fermata hold
   (`buildFermataHolds`). ห้อง = เส้นแบ่ง **อิสระ** `{type:'bar'}` · โน้ตแต่ละตัวถือ `beats` ของตัวเอง ·
   playback = บวก `beats` ไปเรื่อย ๆ ตามสตรีม.

   ⇒ **นี่คือจุดที่ทำให้ mid-bar ง่ายกว่าซอฟต์แวร์โน้ตทั่วไปมาก.** ใน MuseScore/Dorico การกระโดดลงกลางห้อง
   บังคับให้คิดเรื่อง **"ห้องแยก/anacrusis"** (เศษห้องหลังกระโดด + ห้อง pickup ต้องรวมกันได้ 1 ห้องเมตริก —
   engraver ต้องจับคู่ให้พอดี). **ใน pleng ไม่มี "ห้องที่ต้องเติมให้เต็ม"** — playback แค่บวก `beats` ของ
   แต่ละโน้ตตั้งแต่ marker เป็นต้นไป. ดังนั้น:

   > **mid-bar = เริ่ม/จบ range ที่ตำแหน่งโน้ต (li, si) แทนขอบบรรทัด — ไม่ต้องคำนวณ beat/เมตริกใหม่เลย.**

---

## 1. (ก) จุดหมาย/marker ลงกลางห้องยังไง — ระดับข้อมูล

Segno/Coda/Fine/To-Coda **เป็น item ในสตรีมของบรรทัดอยู่แล้ว** (`{type:'segno', id}` ฯลฯ) → มัน**นั่งตรงไหนก็ได้
ในสตรีม** รวมทั้ง "ระหว่างโน้ต 2 ตัวกลางห้อง". v1 resolver แค่ **สังเกตมันที่ขอบบรรทัด** (`scanFlowMarkers`
เก็บแค่ `li`). mid-bar = **สังเกตที่ตำแหน่งจริงในสตรีม**.

**anchor rule (นิยามให้ชัด — กันกำกวม):**

| marker | บทบาท | anchor = โน้ตตัวไหน |
|---|---|---|
| **Segno 𝄋 · Coda (target)** | จุด**เริ่ม**ของช่วง (เข้ามาเล่น) | โน้ต playable **ตัวแรกที่อยู่ที่/หลัง** marker item — เล่น**รวม**ตัวนี้ |
| **Fine · To-Coda (source)** | จุด**ออก**ของช่วง (เลิกเล่น) | โน้ต playable **ตัวสุดท้ายที่อยู่ก่อน** marker item — เล่นถึงตัวนี้แล้วหยุด/กระโดด (ไม่รวมโน้ตหลัง marker ในห้องนั้น) |

"playable" = โน้ต/rest/`-` ที่มี `si` (ไม่ใช่ bar `|` เอง). marker ที่วางกลางห้องจึงตัด "หัว/ท้ายช่วง" ลงกลางห้องได้
โดยตรง.

---

## 2. (ข) resolver เมื่อกระโดดเข้าห้องกลางคัน — จังหวะห้องไม่เต็ม (คำตอบตรง)

**resolver ไม่ re-time อะไรทั้งสิ้น.** เพราะไม่มีเมตริก (§0.3) มันเล่น `beats` ที่ encode ไว้ของแต่ละโน้ต
ตั้งแต่ marker เป็นต้นไป. "ห้องไม่เต็ม" = แค่ "โน้ตจาก marker ถึงเส้น `|` ถัดไป" แต่ละตัวถือ `beats` เดิม —
เหมือนที่ pleng เล่นทุกห้อง**วันนี้** อยู่แล้ว.

**🎯 ความถูกต้องของ "ห้องแยก" (split-bar) = ความรับผิดชอบของ DATA ไม่ใช่ของ engine**
(หลัก honest-to-the-sheet · memory `feedback-audio-honest-to-sheet`):
ถ้าต้นฉบับมี pickup bar ที่ durations ต้องรวมกับเศษท้ายห้องให้ครบ 1 ห้องเมตริก → **ผู้ใช้ encode duration ให้ถูก** ·
engine เล่นตามที่ encode. เหมือนที่ pleng ไม่เคยบังคับความยาวห้องอยู่แล้ว (ผู้ใช้พิมพ์ `-`/`~` เองเพื่อยืดเสียง).

**🔴 ผลข้างเคียงจริง (เขียนกำกับ — no silent gap · ✅G Pro รอบ mid-bar verify + surface เพิ่ม):**

- **(i) accidental ค้างในห้อง (barAlt) — ปลอดภัยโดยธรรมชาติ ✅.** `songToNotes` resolve `barAlt`
  (`#`/`b` ค้างทั้งห้อง) **ตอน pass แสดงผลครั้งเดียว ก่อน** buildPlayNotes จะกรอง — โน้ตทุกตัวถือ `midi` ที่
  **resolve เสร็จแล้ว** ตามบริบทห้องเดิมของมัน. รอบย้อนที่เริ่มกลางห้องจึงยังได้พิตช์ที่ถูก (ไม่ต้อง re-apply
  accidental). **ต้องมี unit test ยืนยันจุดนี้ใน Phase 2** (กระโดดเข้าห้องหลังโน้ตที่ตั้ง `#` → โน้ตหลัง marker
  ยัง `#` ถูก).
  - **⚖️ จุดที่ผมต่างจาก G:** G เสนอสร้าง **"State Recovery Module"** (ตอน jump ให้ re-scan ห้องเป้าหมายจาก
    bar-start→target เก็บ accidental/dynamics/pedal ล่าสุดก่อนส่งเสียง). **pleng ไม่ต้องมีสำหรับ accidental** —
    เพราะเรา **resolve-ก่อน-filter** (barAlt ลง midi ตั้งแต่ display pass) ไม่ใช่ **seek-แล้ว-เสีย-state** อย่าง
    engine ทั่วไป. recovery module จำเป็นเฉพาะสถาปัตยกรรมที่ seek raw event stream — pleng ปลอดภัยกว่าโดยดีไซน์.
- **(ii) tie/slur คร่อมจุดเข้า — กันด้วย snap-to-attack.** marker ตกระหว่าง tie-open กับ tie-end แล้วรอบย้อน
  เริ่มที่ tie-end (กล่อง `-`/`~` ต่อเสียง) = จะ **re-attack เสียงที่ควรลากค้าง** (ผิด · G: MIDI ไม่มี Note On
  ให้ยิง → เงียบ หรือ re-articulate ขัด Tie). **v1: marker เกาะ attack เท่านั้น** (ดู snap rule §3).
- **🆕 (iii) กระโดดกลาง `{}` tuplet (G surface · pleng มี `{}` 3-พยางค์ = จริง).** จุดเข้าตกกลางกลุ่ม tuplet →
  bracket `{}` ค้างเป็นเศษ (orphaned) + ถ้า ratio คิดต่อกลุ่ม จังหวะเพี้ยน. **snap rule §3 บังคับไม่ตัดกลาง `{}`**
  (snap ไปขอบกลุ่ม tuplet).
- **🆕 (iv) กระโดดกลาง melisma/เอื้อน (G surface · pleng มี slur `()` = "โน้ตโยงไม่กินพยางค์" = จริง).** คำร้อง
  พยางค์เดียวควบหลายโน้ต → เริ่มรอบย้อนกลางเอื้อน = highlight/karaoke หลง index พยางค์. **snap ไปโน้ตที่ "กินพยางค์"
  (มี `syk`) ตัวถัดไป** — ครอบด้วย snap rule เดียวกัน §3.
- **N/A v1 (forward-compat · G surface):** Dynamics wedge/hairpin (p/f) + Pedal — **pleng ยังไม่มีในโมเดล**
  (`song-model-v2`) → ไม่มีผล v1 · ถ้าเพิ่มภายหลังต้องกลับมาดูจุดกระโดดเข้ากลางเครื่องหมายพวกนี้ (state ค้าง).

**ตาราง range (ยก `dc-ds-jump-flow.md §สถาปัตยกรรม` จาก li → (li,si)):**

| เคส | ranges รอบย้อน (endpoint = (li,si)) |
|---|---|
| capo al Fine | `{(0,0) … (liFine, siFine)}` |
| segno al Fine | `{(liSegno, siSegno) … (liFine, siFine)}` |
| capo al Coda | `{(0,0) … (liToCoda, siToCoda)}` + `{(liCoda, siCoda) … (lastLi, ∞)}` |
| segno al Coda | `{(liSegno, siSegno) … (liToCoda, siToCoda)}` + `{(liCoda, siCoda) … (lastLi, ∞)}` |
| capo/segno เปล่า | `{(0,0) … (lastLi, ∞)}` / `{(liSegno, siSegno) … (lastLi, ∞)}` |

`siSegno/siCoda` = si ของ **โน้ต attack ตัวแรกที่/หลัง** marker (จุดเริ่ม รวมตัวนี้) ·
`siFine/siToCoda` = si ของ **โน้ต attack ตัวสุดท้ายก่อน** marker (จุดจบ รวมตัวนี้).

---

## 3. (ค) UX ป้อน marker กลางห้อง — เข้าชุด caret/symbol model (§5–6 editor-flow-polish)

**หลัก:** ไม่มีกลไกใหม่ — ใช้ caret model ที่ SA ล็อกไว้แล้ว.

- caret ปัจจุบัน (`editor-flow-polish §5`) เดินได้ **ทีละโน้ต ระหว่างโน้ตไหนก็ได้** (block/insert · `curIdx`).
  caret อยู่ **กลางห้องได้อยู่แล้ว** (ระหว่างโน้ต 2 ตัวใดก็ได้).
- marker = **v2 line item type** ป้อนผ่าน **Ctrl+K / ⋮ command palette ณ ตำแหน่ง caret** (`repeat-jumps §2.3`) —
  ไม่กินคีย์โน้ต. เลือก "วาง Segno/Coda/Fine" ตอน caret อยู่กลางห้อง → **แทรก marker item ตรง stream index นั้น =
  กลางห้องฟรี ๆ** ไม่ต้องเพิ่มกลไก.

**กฎ snap-to-clean-boundary (บังคับ · กัน §2 ii/iii/iv พร้อมกัน · ✅G verify snap-to-onset ถูก + Behind Bars):**
marker เกาะ **"โน้ต attack ที่กินพยางค์ (มี `syk`) และไม่อยู่กลาง `{}` tuplet"** เสมอ =
**"clean structural boundary"** — จุดเดียวครอบทุก pitfall:

| caret อยู่บน… | snap ไป |
|---|---|
| กล่องต่อเสียง `-`/`~` (tie/melisma continuation · ไม่มี `syk`) | โน้ต attack-มี-`syk` ใกล้สุด |
| กลางกลุ่ม `{}` tuplet | ขอบกลุ่ม tuplet (ไม่ตัดกลุ่ม) |
| โน้ต attack ปกติ | เกาะที่นั่นเลย |

จุดหมาย**เข้า** (Segno/Coda) เกาะ**หน้า**โน้ต clean-boundary ที่ caret · จุด**ออก** (Fine/To-Coda) เกาะ**หลัง**.
snap แล้ว **โชว์ anchor ที่ resolve ได้** (ผู้ใช้เห็นว่าเกาะตรงไหนจริง) — G ยืนยันแนวนี้ (bind-to-note ไม่ bind-to-barline)
คือทางระดับโลก (MuseScore เลือกโน้ตแล้วใส่ · Dorico popover ที่ caret).

**เห็นว่าเป็น "กลางห้อง" (ไม่งง):**
- glyph marker render **inline ระหว่างโน้ต 2 ตัวกลางห้อง** (เหมือน rehearsal mark กลางห้องในโน้ตจริง) —
  ไม่ดันไปหัว/ท้ายบรรทัด.
- breadcrumb "ลำดับเล่นจริง" (`repeat-jumps §2.4`) เขียนเป็นภาษาคนว่าเข้ากลางห้อง เช่น
  `… ➔ ข้อ1 (ย้อนจาก 𝄋 กลางห้อง 3) ➔ รับ …` → ผู้ใช้เห็นว่าจุดย้อนอยู่กลางห้อง ไม่ต้องเดา.

**มือถือ:** bottom-sheet palette เดิม (`§2.3`) · วาง caret ด้วยการแตะโน้ต (block) → "แทรกสัญลักษณ์" → เลือก marker ·
snap-to-attack เหมือนกัน · เป้ากด ≥24px (WCAG 2.5.8 AA).

---

## 4. delta ที่ engine ต้องแก้ (Phase 2 · พิสูจน์ feasible · ยังไม่ลงโค้ด)

| ฟังก์ชัน | เดิม (line-level) | แก้เป็น (mid-bar + canonical shape §7) |
|---|---|---|
| `resolveJumpOrder` (`songModel.js:295`) | หา arrangement entry ที่มี `flow.jump` | หา **jump line item** `{type:'jump',kind:'dc'\|'ds'}` แล้วยิงที่ **(li,si) ของมัน** (§7) — mid-bar native |
| `scanFlowMarkers` (`songModel.js:258`) | คืน `{liSegno,liFine,liToCoda,liCoda}` | คืน `(li,si)` ต่อ marker (anchor rule §1) — เดินโน้ตในบรรทัดหา si ของ attack ที่/ก่อน/หลัง marker |
| `returnRanges`/`entryRanges` | endpoint = `li` | endpoint = `{li,si}` · `cut`/`returnFrom` เป็น (li,si) |
| `buildPlayNotes` (`midi.js:592`) | `n.li>=fromLi && n.li<=toLi` | เทียบ composite `(n.li,n.si)` แบบ lexicographic · **back-compat: range ไม่มี si = ทั้งบรรทัด (si -∞..+∞)** |
| guards (mint/strip/orphan · `songFlow.js`) | คีย์ที่ id (มี segno/coda) | **เพิ่ม kind `jump`/`dc`/`ds`/`to-coda`/`fine`** ให้ mint id + strip ตอน paste + orphan-check (§7) |

**back-compat สำคัญ:** strophic order + jump ที่ตกขอบบรรทัดพอดี → si = ขอบ (0 หรือ ∞) → ผลลัพธ์เท่าเดิม byte-for-byte
กับ v1. mid-bar เป็น **superset**.

**หลักฐาน feasibility:** โน้ตพก `si` อยู่แล้ว (`midi.js:257/280/307`) · buildPlayNotes กรองบน array เดียว
(`all`) ที่ resolve midi/barAlt เสร็จก่อนแล้ว → เพิ่ม composite compare = แก้จุดเดียว ไม่กระทบ display pass.

---

## 5. AC เพิ่ม (ต่อจาก repeat-jumps.md §5)

8. **mid-bar target:** Segno/Coda วางกลางห้อง (ระหว่างโน้ต 2 ตัว) → รอบย้อน **เริ่มที่โน้ตนั้นจริง** (เล่นเศษห้อง
   จาก marker ถึง `|` ถัดไป · โน้ตก่อน marker ในห้องนั้น**ไม่เล่น**ในรอบย้อน)
9. **mid-bar exit:** Fine/To-Coda วางกลางห้อง → รอบย้อน **หยุด/กระโดดที่โน้ตนั้นจริง** (โน้ตหลัง marker ในห้อง
   นั้น**ไม่เล่น**)
10. **timing honest:** เล่น `beats` ที่ encode ของแต่ละโน้ตตั้งแต่ marker → ไม่มีการยืด/ตัด beat อัตโนมัติ ·
    split-bar ถูกเมื่อ data ถูก (ผู้ใช้ encode duration เอง)
11. **accidental ปลอดภัย:** กระโดดเข้าห้องหลังโน้ตที่ตั้ง `#`/`b` → โน้ตหลัง marker ในห้องนั้นยังพิตช์ถูก (barAlt
    resolve ก่อน filter)
12. **snap-to-clean-boundary:** วาง marker บนกล่องต่อเสียง (`-`/`~`) / กลาง `{}` tuplet / กลางเอื้อน → snap ไป
    โน้ต attack-มี-`syk` นอก tuplet ใกล้สุด · ไม่ re-attack เสียงลาก · ไม่ตัดกลุ่ม tuplet · ไม่หลง index พยางค์
13. **back-compat:** เพลงที่ marker ตกขอบบรรทัดพอดี → ลำดับเล่น**เท่าเดิม**กับ v1 line-level (regression 0)

---

## 6. หลักฐาน / ยังไม่พิสูจน์ / รอ (no silent gap)

- ✅ **G Pro รอบ mid-bar เสร็จ** (chip=Pro verify ผ่าน CDP + screenshot · transcript
  `meetings/2026-07-24-midbar/{01-sent-to-G,02-reply-from-G}.md` + `g-answer-chip-pro.png`):
  ยืนยัน Q1 (เล่น duration ตรง ไม่ metric completion) · Q2 (**split-bar = notation ไม่ใช่ playback · 100%**) ·
  Q4 (snap-to-onset ถูก · Behind Bars) · Q5 (bind-to-note = ทางระดับโลก) · **surface เพิ่ม 2 pitfall จริง**
  (tuplet-split · melisma/lyric-index) ที่ผมตกหล่น → fold เข้า §2(iii,iv)+§3 แล้ว.
- 🔎 **ต้องตรวจ URL เองตอนทำจริง:** G ให้ URL เป็น text link (href ตัดใน innerText) · claim หลักตรงกับที่รอบ D.C./D.S.
  verify กับ W3C แล้ว (`sound`/`measure`/`tuplet`/`wedge`/`pedal`) · UX citation (music21/Dorico Shift+R) = supporting
  ไม่ load-bearing.
- 🆕 **MusicXML export (R6):** `<measure implicit="yes">` = artifact มาตรฐานสำหรับ pickup/split bar (G ชี้) —
  ใช้ตอน export ห้องกลางที่ถูกกระโดดเข้า/ออก · ไม่กระทบ playback.
- ⚠️ **`‖: :‖` ในช่วงที่ถูกวิ่งย้อน** ยังวนซ้ำ (v1 · ไม่เกี่ยว mid-bar · ยกจาก `dc-ds-jump-flow.md §known-limit-2`).
- ⚠️ **nested mid-bar jump** = ยังใช้ข้อจำกัด v1 (รอบย้อนเดียว · `dc-ds-jump-flow.md §7`).
- 🔴 **accidental (§2 i) + tie (ii) + tuplet (iii) + melisma (iv)** = ต้องมี unit test พิสูจน์ใน Phase 2 (derive
  คาดหวังจากโมเดล ไม่ใช่สัญชาตญาณ · memory `pleng-compare-to-model-not-intuition`).

---

## 7. 🔴 Canonical marker data shape (cross-lane SSOT — engine + render + entry อ่านชุดเดียว)

PM 42: glyph-render lane merged base `7425b15` (`SongSheet.vue:64-105`) วาด glyph จาก **marker ที่เป็น item
ในบรรทัด** แต่ engine spike เก็บ jump ที่ `flow.jump` (ระดับ arrangement) = **2 โมเดล → drift เงียบ**. ผมเป็น
เจ้าของโมเดล → เคาะ **ชุดข้อมูล marker มาตรฐานชุดเดียว** ให้ทั้ง 3 lane อ่านตรงกัน. (design-only จน PM gate)

### 7.1 render lane ส่งอะไรมาแล้ว (อ่านของจริง `SongSheet.vue`)
render **normalize 3 รูป** ให้วาดเหมือนกัน + **positioned จาก item's own spot = mid-bar safe อยู่แล้ว**:
1. `{type:'jump', kind, al?}` ← **canonical**
2. type เฉพาะ: `{type:'segno'}` `{type:'coda'}` `{type:'to-coda'}` `{type:'dc'}` `{type:'ds'}` `{type:'fine'}`
3. generic `{type:'marker', kind}`
· `kind ∈ segno|coda|to-coda|dc|ds|fine` · `al` (เฉพาะ dc/ds) `∈ fine|coda` · final barline = `{type:'end'}` เดิม
· `{type:'marker', label}` (ไม่มี kind) = section marker ข้อความเดิม ไม่ยุ่ง

### 7.2 🎯 การตัดสินใจ: **ทุกสัญลักษณ์นำทาง = line item รูปเดียว** (superset ของ render's shape)

```jsonc
{ "type":"jump", "kind":"segno|coda|to-coda|dc|ds|fine", "al":"fine|coda"?, "id":"m1" }
{ "type":"end" }   // จบเพลง ‖ (final barline) — คงเดิม (145 เพลง)
```
- **kind vocab = ตรง render เป๊ะ** · **`al`** (dc/ds) = exit-target · **`id`** = ถาวร (มินต์) render มองข้ามได้ (ไม่ใช้วาด)
  → **superset ของรูปที่ render ship แล้ว = render ไม่ต้อง rework** (เขาบอกว่า normalise ให้ · แค่ id เป็น field เกิน)
- **pairing To-Coda ↔ Coda = `id` เดียวกัน + kind ต่างกัน** (`to-coda` = source · `coda` = target) — เลิกใช้ field
  `role` ของ spike (kind สื่อ role อยู่แล้ว · ตรง render vocab)
- **`al` แทน field `to`** ที่ handoff เสนอ (`{jump,to}`) — align ชื่อกับ render's `al` ที่ ship แล้ว กัน divergence
- รับ legacy 3 รูป (§7.1) แล้ว normalize เข้ารูป canonical ตอนอ่าน (เหมือน render ทำ) — ของเก่าไม่พัง

### 7.3 🔴 D.C./D.S. อยู่ที่ไหน — **line item (positioned) ไม่ใช่ flow directive** (เปลี่ยนจาก design ที่ merge)

**merged design (`repeat-jumps.md §2.3`) วาง D.C./D.S. = "directive ระดับท่อน" (`flow.jump`).**
**mid-bar บังคับให้เปลี่ยน:** `flow.jump` ระดับ entry ยิงได้แค่ "ท้าย entry" = line-level เท่านั้น · จะยิง**กลางห้อง**
ต้องมี**ตำแหน่ง** → D.C./D.S. ต้องเป็น **line item ที่ (li,si)** เหมือน Segno/Coda. + render ก็วาด dc/ds เป็น line
item อยู่แล้ว → **รวมเป็น line item ชุดเดียว = ตรงกันทั้ง 3 lane + mid-bar native + เลิก dual-model**.

| สัญลักษณ์ | เก็บที่ (canonical) | เหตุ |
|---|---|---|
| Segno · Coda · To-Coda · Fine · D.C. · D.S. · end | **line item** (SSOT · positioned (li,si)) | render+entry+resolver อ่านที่เดียว · mid-bar ได้ |
| **Drawer "🎼โครง" badge** ("↩ ย้อนต้น → Coda") | **projection** (สแกน lines ของ entry หา jump item) | โชว์ภาษาคน · ไม่ใช่ SSOT (กัน 2 ที่) |
| `flow.times`/`skip`/`skipSections`/`afterEachVerse` | **คงที่ arrangement** (ไม่แตะ) | per-verse melody-reuse ของจริง · คนละเรื่องกับ jump command |

⇒ resolver Phase-2 เปลี่ยนจาก "หา entry ที่มี `flow.jump`" → "หา jump line item แล้วยิงที่ (li,si) ของมัน".
`flow.jump` (spike) = deprecated · Drawer อ่านจาก line item แทน.

### 7.4 guards (บังคับ · `songFlow.js`)
- `mintMarkerIds` — มินต์ `id` ให้ **ทุก jump kind** (segno/coda/to-coda/dc/ds/fine · เดิมทำแค่ segno/coda)
- `stripEditorMarkerIds` — เคลียร์ id ตอน copy-paste ทุก kind (กัน 2 marker id ซ้ำ)
- `findOrphanFlows` — `ds` ไม่มี segno target / `to-coda` ไม่มี coda คู่ id = กำพร้า → เพิกเฉย เล่นตามเขียน ⛔ ไม่เดา

### 7.5 known-limit + สิ่งที่ต้องบอก P'Aim (no silent gap)
- ⚠️ **dc/ds/marker บน stanza ที่ถูกใช้ซ้ำหลายข้อ (strophic reuse)** → jump/marker ถูกเจอทุกครั้งที่ stanza เล่น.
  เคสจริง D.C./D.S. อยู่ท่อนปิดท้ายที่ไม่ reuse → ยิงครั้งเดียว ถูก · per-verse gating = forward-compat (defer).
  (เป็น family เดียวกับ marker-on-reused-stanza ที่ resolver เลือก first-occurrence อยู่แล้ว · `dc-ds-jump-flow.md §2`)
- 🔴 **เปลี่ยน design ที่ merge** (D.C./D.S. ย้ายจาก flow directive → line item) — **PM relay ให้ P'Aim** ว่านี่คือ
  refinement ที่ mid-bar + render-alignment บังคับ (ไม่ใช่เพิ่มของเล่น · ลด drift + ได้ mid-bar). Drawer UX ยังเห็น
  "ระดับท่อน" เหมือนเดิม (เป็น projection) — ผู้ใช้ไม่รู้สึกต่าง.
