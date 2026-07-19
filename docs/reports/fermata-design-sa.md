# SA design — เฟอร์มาต้า: หน่วงเสียงตั้งค่าได้ (data model + feasibility)

**brief:** `docs/us/fermata-hold.md` · **design-first · ⛔ ไม่เขียนโค้ด/ไม่ merge** · P'Aim เคาะก่อน build
**verify โค้ดจริง** (`midi.js`/`notation.js`/`songModel.js`/`SongSheet.vue`/`EditorMode.vue`) base รอบ 30 · SA 2026-07-18
**note:** playback ซื่อสัตย์ต่อโน้ต ([[feedback-audio-honest-to-sheet]]) · v2 = 1 พยางค์/attack ([[pleng-render-data-gaps]])

---

## 0 · สรุป — ฟันธง data model + correctness (SA อ่านมาตรฐานเอง · ไม่ปรึกษา G)

| | |
|---|---|
| **เก็บค่า hold เป็นอะไร** | ✅ **จำนวนบีตสัมบูรณ์ที่โน้ตดัง (absolute) — ไม่ใช่ formula สด** · แก้ได้ต่อโน้ต (ตรง MuseScore "Time stretch") (§3) |
| **เก็บที่ไหน** | ✅ **ฟิลด์ `holds` แยกบน segment (key = index โน้ต)** — **ไม่ยัดใน note string** (string = สัญลักษณ์ `^` jianpu SSOT · §3) |
| **playback** | ✅ note ดัง = hold beats (แทน ×1.75) · **อยู่นอก bar-math** (ห้องยังนับตามที่เขียน = ที่แก้ "ห้องถัดไปหลุด") |
| **sheet ซ่อนตัวเลข** | ✅ **ฟรีโดยดีไซน์** + **ยืนยันถูกหลักสากล** (Gould "Behind Bars" · §6) |
| **default auto-suggest** | ✅ **"เติมจนจบห้องของโน้ตนั้น"** — SA วินิจฉัยว่าถูกสำหรับ pleng (ลงดาวน์บีตถัดไป = แก้ "หลุด") · fallback ~2× ถ้าไม่ใช่โน้ตท้ายห้อง (§5-6) |
| **UI ตั้งค่า hold** | → **UX** (4 แนวทาง · §7) · SA ยืนยัน feasible ทุกแบบ |

---

## 1 · กลไกปัจจุบัน (verify) + ทำไมเพี้ยน

- **model:** fermata = **boolean** ฝังใน note string เป็นตัวอักษร **`^`** (`notation.js:65-68` · `5^` = โน้ต 5 มีเฟอร์มาต้า) · parse → `token.fermata=true`
- **playback (`midi.js`):** `FERMATA_FACTOR = 1.75` **คงที่** · `d *= 1.75` (`:71`) + ครอบ '-' extension (`:199`) · **คอมเมนต์ `:71` "playback only; bar counting ignores it"**
- **bar-math (`beatCount`):** ใช้ `DOT_FACTOR` แต่ **ไม่แตะ fermata** → **ห้องนับบีตโดยไม่รวม hold** (ถูกต้อง · sheet/validation แม่น)
- **sheet:** เรนเดอร์ `^` เป็นสัญลักษณ์เฟอร์มาต้า (มาจาก string) — ไม่มีตัวเลข

**🔎 ทำไม "ห้องถัดไปหลุด/น่าทิ่ม":** ×1.75 = **ค่าเดาคงที่** ไม่ตรงใจคนเล่น · scheduler เลื่อนโน้ตถัดไปตาม duration ที่ยืด (ถูกต้องเชิงกลไก — เฟอร์มาต้าควรหน่วงของถัดไป) → **ปัญหาคือ "ค่า" ไม่ใช่ "กลไก"** · แก้ = ให้ค่าปรับได้/แนะนำอัตโนมัติ **ไม่ต้องแก้ scheduler**

---

## 2 · โครง v2 (ยืนยันว่าเก็บ hold ได้)

stanza line = array ของ `{ type:'segment', note:'5^ 3 2', chord }` · **`note` เป็น string** (jianpu SSOT) · 1 segment มีได้หลายโน้ต · fermata `^` อยู่ในโน้ตตัวใดตัวหนึ่ง → **hold ต้อง key ต่อโน้ตในเซกเมนต์** (ไม่ใช่ระดับ segment รวม)

---

## 3 · ฟันธง data model (SA — งานผมโดยตรง)

### 3.1 ค่า hold = **บีตสัมบูรณ์ที่เพิ่ม** (ไม่ใช่ตัวคูณ · ไม่ใช่ formula สด)
- ✅ **intuitive:** "ลากเพิ่มอีก N บีต" เข้าใจง่ายกว่า "×1.75"
- ✅ **honest-to-sheet:** ค่าที่เก็บ = ค่าที่เล่นเป๊ะ (ไม่มี formula/mask ซ่อน) · MP3==live (deterministic ไม่สุ่ม)
- ✅ **editable:** ผู้ใช้บวก/ลบได้ตรง ๆ
- ⚖️ **absolute vs ตัวคูณ (MuseScore ใช้ตัวคูณ "Time stretch"):** มาตรฐานเก็บเป็น**ตัวคูณ** (§6) · แต่ **pleng เลือก absolute beats** เพราะ (1) default = "เติมจนจบห้อง" เป็นค่า absolute โดยธรรมชาติ (2) ผู้ใช้ไม่เป็นดนตรี "ค้าง N บีต" ง่ายกว่า "×2" (3) honest-to-sheet เท่ากัน — **ทั้งคู่แทนการค้างเสียงเดียวกัน · absolute = เหมาะ pleng** (trade-off: ถ้าเปลี่ยนค่าโน้ตฐานทีหลัง hold ไม่ auto-scale — เฟอร์มาต้าแก้ไม่บ่อย · re-tune ได้)
- ❌ **formula สด** "เติมจนจบห้อง" ตอน play = แก้เองไม่ได้/ไม่โชว์ค่า → **materialize เป็นเลขจริงตอนใส่** (คำนวณครั้งเดียว → เก็บเลข → แก้ได้)

### 3.2 เก็บที่ **`holds` แยกบน segment · key = index โน้ตในเซกเมนต์** (ไม่ยัดใน string)
```jsonc
{ "type":"segment", "note":"5^ 3 2", "chord":"G", "holds": { "0": 2 } }
//  โน้ตตัวที่ 0 (5^) หน่วงเพิ่ม 2 บีต · โน้ตอื่นไม่มี = เล่นปกติ
```
- **ทำไมไม่ยัดใน note string:** ลอง `5^2` → parser อ่าน `2` เป็น**โน้ตตัวถัดไป** (ชนกับลำดับโน้ตจริง `5^ 2` = เฟอร์มาต้า5 + โน้ต2) → **string syntax ชนแน่ · ทิ้ง** · string = สัญลักษณ์ jianpu (SSOT) · hold = พารามิเตอร์ performance (คนละชั้น · ตรง mission "string=ความจริงโน้ต · เครื่องมือช่วยเป็นชั้นบน")
- **sheet ซ่อนเลขได้ฟรี:** เลขไม่อยู่ใน string → sheet เรนเดอร์ `^` เป็นสัญลักษณ์เหมือนเดิม ไม่เห็นเลข ✅
- **backward-compat:** เพลงเก่ามี `^` แต่ไม่มี `holds` → ใช้ auto-suggest (materialize ตอนแก้ครั้งแรก) · ไม่ต้อง migrate ทั้งคลัง

### 3.3 playback = นอก bar-math (ตัวแก้ "ห้องหลุด")
- note duration = `baseBeats + holds[i]` (แทน `×1.75`) · **`beatCount`/bar-status ไม่แตะ hold** (ห้องยังนับตามโน้ตที่เขียน) → sheet+validation แม่น · playback หน่วงตามค่าที่ตั้ง

---

## 4 · feasibility ต่อไฟล์ (จุดต่อ · ยังไม่เขียน)

| ไฟล์ | เปลี่ยนอะไร | ขนาด |
|---|---|---|
| `notation.js` | **ไม่แตะ fermata parse** (`^` คงเดิม) | 0 |
| `midi.js` | แทน `if(t.fermata) d*=1.75` → `d = base + holdFor(seg, tokenIdx)` (default = auto-suggest ถ้าไม่มีค่า) · thread `holds` เข้า build loop (มี li/bi/si แล้ว) | เล็ก-กลาง |
| `songModel.js` | ยอมรับ `holds` optional บน segment (additive · v1 ไม่มี = ปกติ) | เล็ก |
| `EditorMode.vue` | โชว์+แก้ค่า hold ต่อโน้ตเฟอร์มาต้า (UI = UX) | กลาง (UX นำ) |
| `SongSheet.vue` | **ไม่แตะ** (สัญลักษณ์อยู่แล้ว · เลขไม่เข้า string) | 0 |
| migration | **ไม่ต้อง** (`holds` optional · auto-suggest เติมตอนแก้) | 0 |

**สรุป feasibility:** ✅ **refine · จุดต่อชัด · ไม่รื้อ model/scheduler** · sheet+migration = ฟรี

---

## 5 · auto-suggest default (SA วินิจฉัยเอง)

**default = "เติมจนจบห้องของโน้ตเฟอร์มาต้า"** (`expectedBeats(bar) − beatsBefore` = โน้ตดังจนสุดห้อง) → เก็บเป็นเลข (materialize · แก้ได้)
- **ทำไมถูกสำหรับ pleng (ไม่ใช่กฎเฟอร์มาต้าทั่วไป แต่ถูกในบริบทนี้):** ปัญหาจริง = "ห้องถัดไปหลุด/น่าทิ่ม" · pleng เล่นโน้ต**เรียงตามเวลาสะสม** → ถ้า hold = เติมจนจบห้อง **โน้ตถัดไปเริ่มที่ดาวน์บีตห้องถัดไปพอดี** = กลุ่มร้องกลับเข้าพร้อมกัน (congregational restart) = **แก้อาการตรงจุด** โดยไม่ต้องแตะ scheduler
- **🔴 edge case (SA flag):** ถ้าเฟอร์มาต้า **ไม่ใช่โน้ตท้ายห้อง** → "เติมจนจบห้อง" จะกลืนโน้ตที่เหลือในห้อง → **fallback = ~2× ค่าโน้ต** (มาตรฐาน "twice as long" · §6) หรือเติมถึงโน้ตถัดไป · dev ต้องเช็ก position ก่อนใช้ heuristic
- มี `expectedBeats`/`beatCount` แล้ว → ทำได้

---

## 6 · ⭐ SA correctness ruling — อ่านมาตรฐานเอง (ไม่ outsource · `feedback_never_ask_user_what_is_correct`)

**เปิดมาตรฐานจริง 2026-07-18 · ทุกข้อมีอ้างอิง:**

1. **โปรแกรมมาตรฐานจัดการ duration เฟอร์มาต้ายังไง → แก้ได้ต่อโน้ต (ยืนยันทิศ):**
   **MuseScore 4** มี property **"Time stretch" แก้ได้ต่อเฟอร์มาต้า** (Properties → Playback) · **default = 2.0× (200%)** (MS3 เดิม = 100% · เปลี่ยนใน MS4) · หลายเครื่องมือพร้อมกัน = เอา**ยาวสุด** → **"ค่าแก้ได้" = ถูกตามมาตรฐาน · ของเดิม pleng (1.75 ตายตัว แก้ไม่ได้) = ผิด** [MuseScore handbook/forum]

2. **default ที่ถูกหลักดนตรี:** เฟอร์มาต้า = **"ค้างตามใจคนเล่น/วาทยกร · แต่ ~2 เท่าเป็นค่าที่พบบ่อย"** (discretionary · no fixed value) [Wikipedia · Ultimate Music Theory] → **~2× = default มาตรฐานสากล** · **แต่ pleng เลือก "เติมจนจบห้อง" เป็น default เพราะบริบทเฉพาะ** (sequential playback + กลุ่มร้องกลับเข้าดาวน์บีต · §5) — ทั้งคู่ยอมรับได้ · SA แนะ: **default = เติมจนจบห้อง (โน้ตท้ายห้อง) · ~2× (โน้ตกลางห้อง) · เสมอแก้ได้**

3. **แผ่นพิมพ์โชว์สัญลักษณ์ล้วน ไม่มีตัวเลข = ถูกหลักสากล (ยืนยัน):** duration ของเฟอร์มาต้า**เป็นดุลพินิจคนเล่น ไม่เขียนเป็นตัวเลขบนสกอร์** · engraving (Gould **"Behind Bars"**) กำหนดแค่ **บีตที่ pause ตกต้องตรงกันทุกแนว** ไม่ใช่เขียนค่าเวลา → **sheet โชว์ 𝄐 อย่างเดียว = ถูก** (ตัวเลขในหน้าแก้ไข = เครื่องมือ ไม่ใช่ notation) [Gould "Behind Bars" · Wikipedia]

4. **ค่า hold ควรเป็นจังหวะกลม:** default "เติมจนจบห้อง" ให้ค่าเป็นเศษบีตลงตัวอยู่แล้ว · แนะ **สเต็ป 0.5 บีต** (ครึ่ง/เต็ม) — เป็นธรรมชาติ + UI ง่าย + ตรงกับ bar-fill math (ไม่ต้องอิสระ)

**Sources:** [MuseScore — Fermata time stretch](https://musescore.org/en/node/276202) · [MuseScore — Default time stretch 200% MS4](https://github.com/musescore/MuseScore/issues/15569) · [Wikipedia — Fermata](https://en.wikipedia.org/wiki/Fermata) · [Ultimate Music Theory — Fermata](https://ultimatemusictheory.com/articulation-fermata/) · Gould, Elaine — *Behind Bars* (engraving reference · pause = symbol placement, no written duration)

---

## 7 · ประเด็นให้ UX (UI ตั้งค่า hold · §B ใน brief)

SA ยืนยัน **ทั้ง 4 แนวทาง feasible** (ทุกแบบแค่ set เลข `holds[i]`) → UX เลือก/จัดอันดับ:
- ก. ลากยืดเห็นภาพ · ข. สั้น/กลาง/ยาว (preset) · ค. ค่าแนะนำ + ▲▼ · ง. ฟังแล้วปรับ · (brief ลีน ก+ง)
- **⚠️ ข้อจำกัดที่ UX ต้องรับ (ต่อ editor-redesign):** มือถือ/จอสัมผัส (พี่เปา) · **⛔ ตัวตั้งค่าห้ามบังโน้ต/คอร์ดที่กำลังดู** · ปุ่ม ≥44px · ตั้งค่าแล้ว **ฟังทันที** (ง) เข้ากับ playback ที่ผูกค่าใหม่
- SA ตรวจ feasibility คู่ตอน UX เสนอ UI

---

## 8 · ⛔ ที่ยังไม่ทำ
- ไม่เขียนโค้ด/ไม่ merge · รอ P'Aim เคาะ design (SA data-model + correctness ใบนี้ + UX UI) 1 ครั้ง → dev build (branch จากรอบ 30 `2f4177e`)
- **ไม่ปรึกษา Gemini** (P'Aim สั่ง · SA อ่านมาตรฐานเองแล้ว §6)

---

*design-first · verify โค้ดจริง 2026-07-18 · SA · base `studio-shell-redesign` (รอบ 30)*
