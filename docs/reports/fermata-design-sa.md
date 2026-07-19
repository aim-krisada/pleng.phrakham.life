# SA design — เฟอร์มาต้า: หน่วงเสียงตั้งค่าได้ (data model + feasibility)

**brief:** `docs/us/fermata-hold.md` · **design-first · ⛔ ไม่เขียนโค้ด/ไม่ merge** · P'Aim เคาะก่อน build
**verify โค้ดจริง** (`midi.js`/`notation.js`/`songModel.js`/`SongSheet.vue`/`EditorMode.vue`) base รอบ 30 · SA 2026-07-18
**note:** playback ซื่อสัตย์ต่อโน้ต ([[feedback-audio-honest-to-sheet]]) · v2 = 1 พยางค์/attack ([[pleng-render-data-gaps]])

---

## 0 · สรุป — ฟันธง data model (SA) + แยกส่วนที่ต้อง Gemini

| | |
|---|---|
| **เก็บค่า hold เป็นอะไร** | ✅ **จำนวนบีตสัมบูรณ์ที่ "เพิ่ม" (absolute added beats)** — ไม่ใช่ตัวคูณ ไม่ใช่ formula สด (SA ฟันธง · §3) |
| **เก็บที่ไหน** | ✅ **ฟิลด์ `holds` แยกบน segment (key = index โน้ตในเซกเมนต์)** — **ไม่ยัดใน note string** (string เก็บสัญลักษณ์ `^` เป็น jianpu SSOT · §3) |
| **playback** | ✅ note ดัง = baseBeats + hold (แทน ×1.75) · **อยู่นอก bar-math** (ห้องยังนับ 4 บีตเท่าเดิม = ที่แก้ "ห้องถัดไปหลุด") |
| **sheet ซ่อนตัวเลข** | ✅ **ฟรีโดยดีไซน์** — เลขอยู่นอก string · sheet เรนเดอร์ `^` เป็นสัญลักษณ์อยู่แล้ว ไม่เห็นเลข |
| **auto-suggest "เติมจนจบห้อง"** | 🟡 **ต้อง Gemini ยืนยันหลักดนตรี** (§5-6) · SA ทำได้แต่ correctness = ดนตรี |
| **UI ตั้งค่า hold** | → **UX** (4 แนวทาง · §7) · SA ยืนยัน feasible ทุกแบบ (แค่ set ตัวเลข) |

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
- ❌ ตัวคูณ (ของเดิม) = ตัวที่ unintuitive + ผิด · ❌ formula สด "เติมจนจบห้อง" ตอน play = แก้เองไม่ได้/ไม่โชว์ค่า → **materialize เป็นเลขจริงตอนใส่** (auto-suggest คำนวณครั้งเดียว → เก็บเป็นเลข → แก้ได้)

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

## 5 · auto-suggest "เติมจนจบห้อง" (SA เสนอ · Gemini ยืนยันหลักดนตรี)

**ข้อเสนอ SA:** ตอนใส่ `^` → คำนวณ hold ให้ **โน้ต(+hold) ยืดจนถึงบีตที่ห้องคาดหวัง** (`expectedBeats(bar) − beatsBefore − baseBeats` ของโน้ตนั้น) = "เติมช่องว่างที่เหลือในห้อง" → เก็บเป็นเลข
- ✅ ทำได้ (มี `expectedBeats`/`beatCount` แล้ว)
- 🟡 **แต่ "ถูกหลักดนตรีไหม" = Gemini** — เฟอร์มาต้ามาตรฐานไม่ผูกกับ "จบห้อง" เสมอ (มันคือ "ค้างตามใจคนเล่น") · อาจมี default ที่ดีกว่า (เช่น ×คงที่ · หรือ +ครึ่งของค่าโน้ต) → ถาม Gemini ก่อนล็อก heuristic

---

## 6 · คำถาม Gemini (correctness ดนตรี — แยกจากที่ SA ฟันธงเอง)

**SA ฟันธงเองแล้ว (ไม่ต้องถาม):** ค่า=บีตสัมบูรณ์ · เก็บ `holds` แยก string · playback นอก bar-math · sheet ซ่อนเลขโดยดีไซน์ · feasibility

**ต้องถาม Gemini (G-URL เฟอร์มาต้า `.../e492655ece30f5d2` · P'Aim เปิด Chromium+login เอง):**
1. MuseScore/Sibelius/Finale จัดการ **ระยะเวลาเล่นเฟอร์มาต้า** อย่างไร — ตัวคูณคงที่ หรือ **แก้ได้ต่อโน้ต**? (ยืนยันทิศ "ค่าแก้ได้")
2. **auto-suggest ที่ถูกหลักดนตรี** — "เติมจนจบห้อง" ใช่ไหม หรือมี default มาตรฐานกว่า (×คงที่ / เท่าตัว / ตามบริบท)? สำหรับผู้ใช้ **ไม่เป็นดนตรี**
3. ยืนยัน: **แผ่นพิมพ์โชว์แค่สัญลักษณ์ 𝄐 ไม่โชว้ตัวเลข** = หลักสากล engraving?
4. (เสริม) ค่า hold ควร **เป็นจังหวะกลม (ครึ่ง/เต็มบีต)** หรือ **อิสระ** เพื่อความเป็นธรรมชาติ?

---

## 7 · ประเด็นให้ UX (UI ตั้งค่า hold · §B ใน brief)

SA ยืนยัน **ทั้ง 4 แนวทาง feasible** (ทุกแบบแค่ set เลข `holds[i]`) → UX เลือก/จัดอันดับ:
- ก. ลากยืดเห็นภาพ · ข. สั้น/กลาง/ยาว (preset) · ค. ค่าแนะนำ + ▲▼ · ง. ฟังแล้วปรับ · (brief ลีน ก+ง)
- **⚠️ ข้อจำกัดที่ UX ต้องรับ (ต่อ editor-redesign):** มือถือ/จอสัมผัส (พี่เปา) · **⛔ ตัวตั้งค่าห้ามบังโน้ต/คอร์ดที่กำลังดู** · ปุ่ม ≥44px · ตั้งค่าแล้ว **ฟังทันที** (ง) เข้ากับ playback ที่ผูกค่าใหม่
- SA ตรวจ feasibility คู่ตอน UX เสนอ UI

---

## 8 · ⛔ ที่ยังไม่ทำ
- ไม่เขียนโค้ด/ไม่ merge · รอ P'Aim เคาะ design (SA data-model + UX UI + Gemini correctness) 1 ครั้ง → dev build (branch จากรอบ 30 `2f4177e`)

---

*design-first · verify โค้ดจริง 2026-07-18 · SA · base `studio-shell-redesign` (รอบ 30)*
