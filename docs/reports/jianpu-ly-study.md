# Research — jianpu-ly เอามาใช้กับ pleng ได้อะไรบ้าง

**สั่งโดย:** pm7 · **research only · read-only · ไม่แตะโค้ด pleng · ไม่ install LilyPond**
**แหล่ง:** `OneDrive/4 Personal/pleng.phrakham.life/jianpu-ly-master/` (jianpu-ly โดย Silas S. Brown)
**เทียบกับ:** `src/lib/notation.js` · `NoteRow.vue`/`SongSheet.vue` · `docs/song-model-v2.md` · B062/B069

---

## (ก) jianpu-ly คืออะไร ทำงานยังไง

**jianpu-ly** = โปรแกรม Python ตัวเดียว (`jianpu-ly.py`, ~111 KB, Python 2/3) ของ Silas S. Brown
ที่แปลง **ไฟล์ข้อความ syntax โน้ตตัวเลข → โค้ด LilyPond** แล้ว LilyPond typeset ออกมาเป็น PDF โน้ตตัวเลข
(jianpu) คุณภาพระดับสิ่งพิมพ์.

**Pipeline:**
```
text (1 2 3 4  L: lyrics …)  →  jianpu-ly.py  →  .ly file  →  LilyPond (native)  →  PDF / MIDI
```

จุดสำคัญเชิงสถาปัตยกรรม:
- มันเป็น **preprocessor** ไม่ใช่ renderer เอง — งาน engraving จริง (วางเส้นเอื้อน คาน beam ระยะ spacing)
  เป็นของ **LilyPond** ทั้งหมด. jianpu-ly แค่เขียน "stave ดัดแปลง" (ซ่อนเส้น 5 เส้น เหลือหัวโน้ตเป็นตัวเลข)
  แล้วปล่อยให้ LilyPond จัดหน้าเหมือน typeset โน้ตสากลปกติ.
- **Dependency หนัก:** ต้องมี **GNU LilyPond 2.20/2.22/2.24** ติดตั้งบนเครื่อง (เป็น native binary หลายร้อย MB,
  รันบน desktop/server) + Python. **ไม่มีทางรันใน browser (client-side) ได้** — ผิดคนละโลกกับ pleng ที่ render
  เป็น SVG/HTML ใน JS ล้วน.
- รองรับ syntax กว้างมาก (ดูตารางข้อ ข): octave/accidental/duration/dot/tuplet/tie/slur/repeat/volta/
  DC-DS-Coda/grace/tremolo/dynamics/multi-part/multi-voice/lyrics หลาย verse/คอร์ดกีตาร์/เฟรตไดอะแกรม/
  Western staff คู่/MIDI export/**MusicXML import (experimental)**.
- **License = Apache 2.0** (ไม่ใช่ GPL) — ระบุใน `LICENSE` + ท้าย `README.md`.

---

## (ข) ตารางโอกาส — หัวข้อ · คุณค่าต่อ pleng · ความคุ้ม/ข้อจำกัด · client-side ได้ไหม

| # | โอกาส | คุณค่าต่อ pleng | ความคุ้ม / ข้อจำกัด | client-side ได้ไหม |
|---|---|---|---|---|
| 1 | **Print/Export PDF คุณภาพสูงผ่าน LilyPond** | โน้ต/เส้นเอื้อน/beam/ระยะ สวยระดับสิ่งพิมพ์ กว่า browser มาก | ❌ **ไม่คุ้มตอนนี้** — ต้องมี LilyPond native บน server (offline หาย, ค่า server, ความซับซ้อน deploy) หักล้างจุดขายของ pleng (เว็บล้วน ฟรี ออฟไลน์ได้) | ❌ ไม่ได้ (native binary) |
| 2 | **บทเรียน syntax โน้ตตัวเลข** (edge cases) | เอามาเช็ก parser เราว่าครอบคลุมพอสำหรับเพลงนมัสการไหม | ✅ **คุ้มมาก & ฟรี** — แค่อ่าน ไม่ต้องพึ่ง LilyPond. เป็นเช็กลิสต์ให้ `notation.js` | ✅ (เป็นความรู้ ไม่ใช่โค้ด) |
| 3 | **กฎ engraving เส้นเอื้อน/ไท/beam** (B062/B069) | อ้างอิงวิธี LilyPond วางเส้น เพื่อปรับ SVG เรา | 🟡 **คุ้มบางส่วน** — หลักการดี แต่ LilyPond คำนวณด้วย Scheme/grob คนละกลไกกับ SVG เรา ลอกตรงๆ ไม่ได้ เอาได้แค่ "แนวคิด" | 🟡 (แนวคิด ไม่ใช่โค้ด) |
| 4 | **MusicXML import** ช่วย DA นำเข้าเพลง | ถ้ามีโน้ตเป็น MusicXML แปลงเป็นโน้ตตัวเลขอัตโนมัติได้ | ❌ **ไม่ตรงงาน DA** — DA นำเข้าจาก DOCX+PDF (ไม่มี MusicXML) + import นี้ **ไม่ดึงเนื้อร้อง/พยางค์** (หัวใจ v2) + ผู้เขียนระบุเองว่า "ไม่ได้ผลกับทุกเพลง" | ❌ (รัน Python) |
| 5 | **ไอเดียอื่น** (shortcut 8/9, MIDI, Western staff คู่, angka) | จุกจิกที่อาจต่อยอด | 🟡 ดูข้อ (จ) | — |
| 6 | **License** Apache 2.0 vs pleng GPL v3 | อ้าง/ลอกโค้ดได้แค่ไหน | ✅ Apache 2.0 → รวมเข้า GPL v3 ได้ (ทางเดียว) ดูข้อ (ง) | — |

---

## รายละเอียดต่อประเด็น

### 1) Print/Export PDF ผ่าน LilyPond — **ไม่แนะนำตอนนี้**

**ทำไม LilyPond สวยกว่า:** LilyPond มี engine จัด spacing/beam/slur ระดับมืออาชีพ (คำนวณจุดควบคุมเส้นโค้งตาม
ความกว้าง หลบชนหัวโน้ต) — ของที่ SVG เราต้องเขียนเองทีละเส้น.

**แต่ trade-off ขัดกับตัวตน pleng:**
- LilyPond = **native binary** (ต้องลงบน server) — pleng ตอนนี้ **client-side ล้วน** (Vue + print ผ่าน `@page`
  ของ browser), ฟรี, ออฟไลน์ได้, ไม่มี backend ประมวลผล. เอา LilyPond เข้ามา = ต้องมี server รัน + จ่ายค่า host
  + ออฟไลน์หาย + deploy ซับซ้อนขึ้นมาก.
- ผู้ใช้เป้าหมาย = คริสตจักรไทย ต้องการพิมพ์ A4 เร็วๆ จากมือถือ/เว็บ. คุณภาพ browser-print ที่มีตอนนี้ "พอ".

**ทางเลือกถ้าอยากได้ PDF สวยจริงในอนาคต (เรียงจากเบา→หนัก):**
1. **ปรับ SVG/CSS print ของเราให้ดีขึ้นก่อน** (ถูกสุด, client-side, ไม่พึ่งใคร) — ปัจจุบันคือทางที่ถูกต้อง.
2. **ปุ่ม "ดาวน์โหลด .ly"** — pleng แปลงเพลงเป็น syntax jianpu-ly/LilyPond ให้ผู้ใช้ที่อยากได้คุณภาพสูงสุด
   เอาไปรัน LilyPond เอง. (pleng ไม่ต้องมี server — ผลักภาระ engraving ให้ผู้ใช้ขั้นสูง.) เป็น "ทางออกกลาง"
   ที่รักษาความ client-side ไว้.
3. **micro-service render แยก** (LilyPond บน server เล็กๆ เรียกเฉพาะตอนกด export PDF) — หนักสุด, มีค่า host,
   ควรทำต่อเมื่อมี demand จริงและมีงบ.

> สรุป: **อย่าเพิ่งทำ** LilyPond export. โฟกัสปรับ SVG print ให้ดีขึ้นก่อน. เก็บ "ปุ่มดาวน์โหลด .ly" ไว้เป็น
> backlog ต้นทุนต่ำถ้ามีผู้ใช้ขอคุณภาพสิ่งพิมพ์.

### 2) Edge case syntax ที่ parser เราอาจพลาด — **เช็กลิสต์ (ของฟรี ควรเก็บเกี่ยว)**

parser เรา (`notation.js`) รองรับ: accidental `#/b/n` · octave (`.` ล่าง / `'` บน) · underline (เขบ็ต 1–2 ชั้น)
· augmentation dot (1–2) · extension `-` · rest `0` · slur `( )` · triplet `{ }` · tie `~` · fermata `^`.

jianpu-ly มีมากกว่า — ที่ **เกี่ยวกับเพลงนมัสการไทยและเราอาจเจอ:**

| syntax jianpu-ly | ความหมาย | pleng รองรับ? | ควรทำไหม |
|---|---|---|---|
| `s1`/`q1` (prefix duration) | 16th/8th ด้วยตัวอักษรนำ | ❌ (เราใช้ `_` ต่อท้าย) | ไม่ต้อง — คนละ convention, ของเราชัดกว่าสำหรับผู้ใช้ไทย |
| `d1` `h1` (32nd/64th) | เขบ็ต 3–4 ชั้น | ❌ (cap 2 ชั้น) | 🟡 เพลงนมัสการแทบไม่ใช้ — เฝ้าดู ถ้ามีเพลงจริงค่อยเพิ่ม |
| `8` `9` | ย่อของ `1'` `2'` (สูงอ็อกเทฟ) | ❌ | 🟡 พิจารณาเป็น shortcut ตอนพิมพ์ (แต่ชนกับเลข 8/9 ที่ไม่มีใน pentatonic — ของเราใช้ 1–7) |
| `1 - -` / `1 - - -` | โน้ตขาว/กลม (2/4 บีต) ด้วย dash | ✅ (`-` = +1 บีต) | มีแล้ว |
| `4/4,8` | time sig + anacrusis (ห้องยก) | ❌ inline | 🟡 pleng เก็บ timeSignature แยก field — ห้องยกยังไม่มี concept |
| `KeepLength` | duration ติดหนึบ (sticky) | ❌ | ไม่ต้อง — เราระบุทุกโน้ต |
| `R{ } A{ }` | ซ้ำ + ending 1/2 (volta) | ❌ | 🟡 เพลงนมัสการมี refrain/ซ้ำเยอะ — v2 ใช้ playOrder แทน (ดีกว่า) |
| `DC/DS/Fine/Coda` | ย้อนต้น/segno/coda | ❌ | 🟡 บางเพลงมี — อาจเป็น marker ในอนาคต |
| `,135` (chord) | คอร์ดซ้อน (หลายเสียงในโน้ตเดียว) | ❌ | ไม่ต้อง — pleng melody เดี่ยว |
| grace `g[..]` / tremolo `///` | โน้ตประดับ/รัว | ❌ | ไม่ต้อง — เกินความจำเป็นเพลงนมัสการ |

**ข้อค้นพบสำคัญ:** จุดที่ต่างจริงคือ **การซ้ำ/ending/DC-DS** — jianpu-ly ทำในระดับ notation, แต่ **v2 ของเรา
แก้ปัญหานี้ดีกว่าด้วย `playOrder`** (link stanza + ลำดับเล่น) ไม่ต้องยัด volta ลง notation. → ยืนยันว่าทิศ v2 ถูก.
ส่วน **เขบ็ต 3 ชั้น (32nd)** เป็น gap เล็กๆ ที่ควร "เฝ้าดู" ไม่ต้องรีบทำ.

### 3) กฎ engraving เส้นเอื้อน/ไท/beam (B062/B069) — **เอาได้แค่แนวคิด**

pleng วาดเส้นเอื้อน/ไท ด้วย **SVG path filled lens** (สองเส้น Bézier ประกบ ปลายเรียวหนากลาง) + `preserveAspectRatio="none"`
ยืดตามความกว้างกลุ่ม (NoteRow.vue). ปัญหาที่รู้กันคือ **ยืดแล้วเส้นบิดเบี้ยว** (ปลาย/ความหนาผิดสัดส่วนเมื่อกลุ่มยาว).

LilyPond ใน jianpu-ly ทำต่างออกไป:
- **ไม่ยืดรูปสำเร็จรูป** — LilyPond คำนวณจุดควบคุมเส้นโค้ง (slur) ตามระยะจริง หัว-ท้าย + ความสูง apex แยกทุกครั้ง
  → ไม่มีปัญหาบิด.
- ควบคุมด้วย override เชิงตัวเลข เช่น `\override Tie #'staff-position = #2.5`, `\tieUp`, beam
  `beam-thickness = #0.1`, `length-fraction = #0.5`, และ trick พลิกคาน (`flip-beams`) เพื่อวางคานใต้ตัวเลข
  (jianpu วางคานใต้โน้ต ไม่เหมือนสากล).

**บทเรียนเอามาปรับ B062/B069:**
- **แทนที่จะยืด path เดียวด้วย `preserveAspectRatio="none"`** ให้ **คำนวณ path ตามความกว้างจริง** (สร้าง `d`
  ของ Bézier จาก group width ด้วย JS) — ความหนาปลาย/apex คงที่ ไม่บิด. นี่คือหลักการเดียวกับที่ LilyPond ใช้
  และแก้อาการบิดที่เรารู้ว่ามีอยู่.
- **ค่าตั้ง (แนวทาง):** apex สูง ~1/8–1/6 ของความกว้าง, ปลายเรียวเข้าหาหัวโน้ต, tie สั้นกว่า slur.
- ⚠️ **แค่แนวคิด ลอกโค้ดตรงไม่ได้** — LilyPond เป็น Scheme/grob บน stave 5 เส้น คนละ rendering model กับ SVG เรา.

### 4) MusicXML import ช่วย DA ไหม — **ไม่ตรงงาน**

`xml2jianpu()` (jianpu-ly.py:1090) parse MusicXML → แปลงเป็น **ข้อความ syntax jianpu** (ไม่ใช่ LilyPond ตรงๆ).
ดึงได้: title, composer, key/time sig, tempo, note step/octave/accidental/type/dot, **slur, tie, tuplet, chord,
grace, articulation/dynamics**.

**แต่ไม่เหมาะกับ DA เพราะ:**
- **ไม่ดึงเนื้อร้อง/พยางค์** — ไม่มี handler สำหรับ `<lyric>`. หัวใจ v2 คือ **การจับพยางค์ไทย↔โน้ต** ซึ่ง import นี้
  ทำไม่ได้เลย. (มันจับแค่ `<words>` = ข้อความ direction เหนือโน้ต ไม่ใช่ lyric line.)
- **แหล่งของ DA = DOCX ไทย + PDF geometry** (ดู memory `pleng-da-import-parser`) — **ไม่มี MusicXML** ให้ import
  ตั้งแต่แรก.
- ผู้เขียนระบุเอง: *"experimental … does not work for all pieces"*.

> สรุป: MusicXML import **ไม่ช่วย DA**. งาน DA คือ Thai DOCX/PDF → v2 ซึ่งมี parser เฉพาะ (`tools/parse_song.py`)
> อยู่แล้ว และต้องการ syllable alignment ที่ MusicXML import ไม่ให้.

### 5) ไอเดียอื่น

- **`8`/`9` = ย่อสูงอ็อกเทฟ:** shortcut พิมพ์เร็ว. แต่ pleng ใช้เลข 1–7 (pentatonic/heptatonic) — `8/9` ว่างพอจะ
  reuse ได้ ถ้าจะทำ input shortcut. คุ้มต่ำ, พิจารณาตอนทำ editor UX.
- **Western staff คู่ (`WithStaff`) / MIDI export:** pleng มี `midi.js` เล่นเสียงอยู่แล้ว. LilyPond MIDI ไม่จำเป็น.
- **`angka` (Indonesian not-angka style):** ต่างแค่ทิศก้าน/จุด — ไม่เกี่ยว.
- **แนวคิด "modified stave" ที่ปล่อยให้ engine จัด spacing เอง** = ยืนยันหลักการข้อ 3: อย่า hardcode รูปเส้น
  ให้คำนวณจาก layout จริง.

---

## (ค) คำแนะนำ 2–3 ข้อ

1. **✅ ทำ (ฟรี, client-side):** ใช้ตารางข้อ (ข) เป็น **เช็กลิสต์ตรวจ `notation.js`** — ยืนยันว่าครอบคลุมเพลง
   นมัสการ. gap ที่ควร "เฝ้าดู" (ไม่รีบ): เขบ็ต 3 ชั้น (32nd), ห้องยก (anacrusis), marker DC/Coda. ยืนยันว่า
   **v2 playOrder แก้ปัญหาการซ้ำได้ดีกว่า volta ของ jianpu-ly**.
2. **✅ ทำ (ปรับปรุง B062/B069):** เปลี่ยนจาก **ยืด SVG path เดียวด้วย `preserveAspectRatio="none"`** →
   **คำนวณ Bézier `d` จากความกว้างกลุ่มจริง** เพื่อกันเส้นเอื้อน/ไทบิด. เอาแค่ *หลักการ* จาก LilyPond
   (คำนวณตามระยะ ไม่ยืดรูปสำเร็จ) — โค้ดลอกไม่ได้.
3. **❌ อย่าเพิ่งทำ:** LilyPond export PDF (พังความ client-side/ฟรี/ออฟไลน์) และ MusicXML import (ไม่ตรงงาน DA,
   ไม่ดึงพยางค์). ถ้าอยากได้ PDF สวยขึ้น → ปรับ SVG/CSS print เองก่อน; เก็บ "ปุ่มดาวน์โหลด .ly" เป็น backlog
   ต้นทุนต่ำ.

## (ง) License verdict

- **jianpu-ly = Apache License 2.0.** pleng = **GPL v3.**
- **ความเข้ากันได้:** Apache 2.0 → **GPL v3 เข้ากันได้ (ทางเดียว)** — เอาโค้ด Apache 2.0 มารวมในโปรเจกต์ GPL v3 ได้
  (ผลรวมกลายเป็น GPL v3). **แต่ทางกลับไม่ได้** (เอาโค้ด GPL v3 ไปใส่โปรเจกต์ Apache ไม่ได้).
- **ถ้าจะลอกโค้ดจริง** (เช่น ตรรกะ parse/engraving): ต้อง **เก็บ NOTICE/attribution ของ Silas S. Brown +
  สำเนา Apache 2.0** ตามเงื่อนไข Apache §4, และ pleng ยังคงเป็น GPL v3 ได้.
- **แต่ในทางปฏิบัติ** ข้อเสนอในรายงานนี้ = เอา **"แนวคิด/บทเรียน"** ไม่ใช่ลอก source (โค้ด jianpu-ly เป็น
  Python เขียน LilyPond คนละภาษา/สถาปัตยกรรมกับ Vue/SVG ของเรา) → **ไม่มีประเด็น license** เพราะไม่ได้ลอกโค้ด.
  แนวคิด/ข้อเท็จจริงไม่ติดลิขสิทธิ์.

---

## สรุปภาษาคน (ให้ P'Aim · ม.ต้น)

**jianpu-ly คืออะไร:** โปรแกรมฟรีตัวหนึ่ง เขียนโน้ตตัวเลขเป็นข้อความ แล้วให้โปรแกรมพิมพ์โน้ตชื่อ "LilyPond"
แปลงเป็น PDF สวยๆ. มันเก่งเรื่องความสวยของหน้ากระดาษมาก.

**เอามาใช้กับ pleng ได้ไหม — 3 ข้อสั้นๆ:**

1. **PDF สวยผ่าน LilyPond — ยังไม่คุ้ม.** เพราะ LilyPond ต้องลงบน "server" (เครื่องแม่ข่าย) ไม่ใช่รันในเว็บ
   เหมือน pleng ทุกวันนี้. ถ้าเอามาใช้ = เสียจุดเด่นของเรา (ฟรี รันในเว็บ ไม่ต้องมีเครื่องแม่ข่าย ออฟไลน์ได้).
   **ทางที่ถูก = ปรับหน้าพิมพ์ที่เรามีอยู่ให้สวยขึ้นเองก่อน.**

2. **ได้ของฟรี 2 อย่างที่ควรเก็บ:**
   - **เช็กลิสต์** — เขาผ่านการใช้จริงมานาน เลยรู้ว่าโน้ตตัวเลขมีลูกเล่นอะไรบ้าง. เอามาเทียบว่าโปรแกรมอ่านโน้ต
     ของเราครบไหม (ครบเกือบหมดสำหรับเพลงนมัสการ — ที่ขาดเป็นของหายากที่ยังไม่ต้องรีบ).
   - **วิธีวาดเส้นเอื้อน** — เขาไม่ "ยืดรูปสำเร็จ" แบบเรา (ที่ทำให้เส้นบิด) แต่ "คำนวณเส้นใหม่ตามความยาวจริง".
     เอาหลักการนี้มาแก้เส้นเอื้อน/ไทของเรา (B062/B069) ให้ไม่บิดได้.

3. **การนำเข้าเพลง (MusicXML) — ไม่ช่วยงานเรา.** เพราะเพลงที่เรานำเข้ามาจากไฟล์ Word/PDF ไม่ใช่ไฟล์โน้ต, และ
   ตัวนำเข้าของเขา **ไม่ดึงเนื้อร้อง** ซึ่งเป็นหัวใจของเรา.

**เรื่องลิขสิทธิ์:** ใช้ได้สบายใจ. เราเอาแค่ "แนวคิด" ไม่ได้ก๊อปโค้ด และถึงจะก๊อป กฎหมายก็ยอมให้เอาของเขา
(Apache) มารวมกับของเรา (GPL v3) ได้ ขอแค่ให้เครดิตเจ้าของ.

**สิ่งที่ควรทำต่อ:** (1) ปรับหน้าพิมพ์ SVG เองก่อน (ไม่ใช้ LilyPond) (2) แก้เส้นเอื้อน B062/B069 ด้วยวิธีคำนวณ
เส้นตามความยาวจริง. **ไม่ควรทำ:** LilyPond บน server และ MusicXML import.
