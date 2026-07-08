# รายงาน — wt0-integration (WT-0 integration/polish)

**รอบ:** รอบแรก US-I2/I3/I4 + **รอบ 2: print-polish ตาม feedback P'Aim (จาก PDF จริง)**
**สถานะ:** เสร็จ

## รอบ 2 — แก้ PDF ตามที่ P'Aim สั่ง (8 ก.ค. 69)
P'Aim ทดสอบพิมพ์ PDF จริงแล้วเจอ: (ก) ชื่อไฟล์ยังผิด (ได้ชื่อเว็บ "คลังเพลงนมัสการ" แทนชื่อเพลง) เพราะปุ่ม "พิมพ์" ในโหมดแผ่นไม่ได้ตั้ง `document.title` · (ข) ฟอนต์ footer คนละขนาด · (ค) สั่ง layout ใหม่ 4 ข้อ

- **ชื่อไฟล์ (แก้บั๊ก):** `Studio.printSheet()` เดิมเรียก `window.print()` เฉยๆ → ตอนนี้ตั้ง `document.title = songBasename(liveSong)` ก่อนพิมพ์ แล้ว restore หลัง `afterprint` (แบบเดียวกับปุ่ม navbar) → PDF ได้ชื่อ `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>` (พิสูจน์สด: `เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก`)
- **layout ใหม่ (ตาม 4 ข้อ):**
  1. **ชื่อเพลงกลางบนเหนือโน้ต/เนื้อ** — `.sheet-title` (h2) `text-align:center` (ไม่อยู่ header)
  2. **"เพลง.พระคำ.ชีวิต" มุมซ้ายล่าง** — footer `pf-left` (ใช้ `SITE_NAME` import จาก `songName.js` = SSOT จริง เลิก hardcode ใน SongSheet)
  3. **"หน้า X ของ Y" กลางล่าง** — `@page @bottom-center` counter
  4. **วันที่ย้ายจาก header (บนซ้าย) ไปมุมขวาล่าง** รูปแบบไทย "พิมพ์เมื่อ 8 ก.ค. 69" (พ.ศ. 2 หลักท้าย) — footer `pf-right` คำนวณสดใน SongSheet (refresh ตอน `beforeprint`)
- **ฟอนต์เท่ากัน:** ตั้ง `font-size:9pt` + สีเทา + ฟอนต์ Noto ให้ทั้ง footer (fixed div) และ counter (`@page` margin box) → footer อ่านเป็นบรรทัดเดียวกัน (เดิม counter ใหญ่กว่าเพราะ margin box ใช้ฟอนต์ default)
- **คู่มือ:** เพิ่มบรรทัดบอกให้ **ปิด "หัวกระดาษและท้ายกระดาษ" (Headers and footers)** ในกล่องพิมพ์ — เพราะเว็บวาดหัว/ท้าย/เลขหน้า/วันที่เองครบแล้ว (ถ้าไม่ปิด browser จะใส่ header ของมันซ้อน = ที่ P'Aim เจอ)
- **ปรับ margin หน้า:** `@page margin: 16mm 16mm 20mm` (ล่าง 20mm เผื่อที่ footer · ทุกหน้า)

**หมายเหตุ design:** `SongSheet.vue` เดิมเป็นไฟล์ WT-B (merged/closed) — รอบนี้แตะเพราะ P'Aim สั่ง layout footer ใหม่โดยตรง และไม่มี worktree อื่นจับ · การเปลี่ยน: เลิกใช้ prop `songTitle` (footer ไม่โชว์ชื่อเพลงแล้ว), footer ขวา = วันที่แทน

## ทำอะไรไปบ้าง (ต่อ US)
- **US-I2** ✅ SSOT ชื่อไฟล์ = `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>`
  - เพิ่ม `export const SITE_NAME = 'เพลง.พระคำ.ชีวิต'` ใน `songName.js`
  - เขียน `songBasename()` ใหม่ = `` `${SITE_NAME} - ${title_th || 'แผ่นเพลง'}` `` → ตัดอักขระต้องห้าม + รวบช่องว่าง · **ไม่มีเลขเพลง**
  - `songName()` (list "N. ชื่อ") **คงเดิม** — แยกจากชื่อไฟล์ (dev รอบก่อนเอาเลขมาปนชื่อไฟล์ = แก้แล้ว)
  - JSON (`jsonIO.songFilename`) และ PDF (`DownloadTool` → `document.title`) เรียก `songBasename` ตัวเดียวกัน → ชื่อไฟล์ตรงกัน (พิสูจน์บนเว็บสด: ตรงกัน `match: true`)
- **US-I3** ✅ print-polish: footer ชื่อเพลง + "หน้า X ของ Y"
  - `Studio.vue` โหมดแผ่นส่ง `:song-title="titleText"` เข้า `SongSheet` → ชื่อเพลงโผล่มุมขวาของ footer
  - `styles.css`: `@page` ตั้ง margin `14mm 16mm 18mm` (แทน `margin:0` + body padding ที่กันเนื้อทับ footer ได้แค่หน้าแรก/หน้าสุดท้าย) + `@bottom-center` วาด "หน้า X ของ Y" ด้วย `counter(page)/counter(pages)`
- **US-I4** ✅ คู่มือ C03 (คนนอกเสนอเพลงเข้าคลัง) ใน `Guide.vue`
  - ขยายบรรทัด "ไม่มีบัญชีก็ช่วยได้" เป็นลิสต์ 4 ขั้น (คีย์เพลง → ดาวน์โหลด JSON → ส่งอีเมลแนบไฟล์ → ทีมตรวจนำขึ้นคลัง)
  - อีเมลทีม = ยังไม่ hardcode · ใส่ `<!-- TODO(P'Aim) -->` ไว้ตรงขั้นส่งอีเมล รอ P'Aim ให้อีเมลจริง

## ไฟล์ที่แก้
- `src/lib/songName.js` — เพิ่ม `SITE_NAME`, เขียน `songBasename` ใหม่ (SSOT, ไม่มีเลข)
- `src/views/Studio.vue` — `printSheet()` ตั้ง `document.title = songBasename` (แก้ชื่อไฟล์) · `.sheet-title` กลาง · (เลิกส่ง `:song-title` แล้ว — ชื่อเพลงอยู่ในเนื้อ)
- `src/components/SongSheet.vue` — footer ใหม่: ซ้าย=`SITE_NAME` (import) · ขวา="พิมพ์เมื่อ …" (วันที่ไทย) · เลิกใช้ prop `songTitle`
- `src/styles.css` — `@page margin 16/16/20mm` + `@bottom-center` counter สไตล์ 9pt (font เท่ากับ footer)
- `src/views/Guide.vue` — ลิสต์ 4 ขั้น C03 + TODO อีเมลทีม · เพิ่ม tip ปิด Headers and footers
- `src/lib/songName.test.js` — test `songBasename` format ใหม่ + `SITE_NAME`
- `src/lib/jsonIO.test.js` — test `songFilename` ตรง SSOT ใหม่
- `src/views/Studio.mode.test.js` — test โหมดแผ่นโชว์ชื่อเพลงกลางบน (`.sheet-title`)
- `src/components/SongSheet.test.js` — test footer ใหม่ (site ซ้าย · "พิมพ์เมื่อ…" ขวา · ชื่อเพลงไม่อยู่ footer)

## ผลทดสอบ
- **unit:** ผ่านทั้งหมด **61/61** (`npm test`) — ครอบ AC: `songBasename` = "เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก" · ตัด `/ : * ?` · title ว่าง → "…- แผ่นเพลง" · `title_en` ไม่ใช้ตั้งชื่อไฟล์ · `songName` ยังได้ "N. ชื่อ" · footer ขวา = "พิมพ์เมื่อ …" (regex) · ชื่อเพลงไม่อยู่ footer · โหมดแผ่นโชว์ชื่อเพลงกลางบน
- **พิสูจน์บนเว็บสด (port 5301):**
  - **ชื่อไฟล์** เพลงจริง #1: ปุ่มพิมพ์โหมดแผ่นตั้ง `document.title = "เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก"` แล้ว restore กลับหลังพิมพ์ · JSON = ชื่อเดียวกัน + `.json`
  - **ชื่อเพลงกลางบน:** `.sheet-title` = "1. พระเจ้าเป็นความรัก" · `text-align: center`
  - **footer:** ซ้าย="เพลง.พระคำ.ชีวิต" · กลาง=ว่าง (counter เติม) · ขวา="พิมพ์เมื่อ 8 ก.ค. 69"
  - **counter:** กฎ `@page @bottom-center` + `font-size:9pt` โหลดใน stylesheet จริง
  - US-I4 หน้าคู่มือ: ลิสต์ 4 ขั้น + tip Headers/footers
  - ไม่มี console error
- **วิธี tester ลอง (ดูด้วยตาในกล่องพิมพ์จริง):**
  1. เปิด <http://localhost:5301> → เลือกเพลง → โหมด "แผ่นเพลง" → กด "พิมพ์"
  2. ในกล่องพิมพ์ **ปิด "Headers and footers"** (Chrome/Edge)
  3. ตรวจ: ชื่อเพลงกลาง-บนเหนือโน้ต · ล่างซ้าย=`เพลง.พระคำ.ชีวิต` · ล่างกลาง=`หน้า X ของ Y` · ล่างขวา=`พิมพ์เมื่อ 8 ก.ค. 69` · ฟอนต์ footer เท่ากันทั้ง 3 · ชื่อไฟล์ตอน Save PDF = `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>` · เนื้อไม่ทับ footer เวลาหลายหน้า
  4. **US-I4:** เมนู "คู่มือ" → "คีย์เพลงใหม่ (ห้องทำเพลง)" → ลิสต์ 4 ขั้น + tip พิมพ์

## ข้อสังเกต / คำถามถึง SA
- **อีเมลทีม (US-I4)** ยังเป็น TODO — รอ P'Aim ให้อีเมลจริง (คอมเมนต์ `TODO(P'Aim)` ฝังใน `Guide.vue`)
- **วันที่พิมพ์** อ่านจากนาฬิกาเครื่อง (refresh ตอน `beforeprint`) — ตรงกับวันที่พิมพ์จริงเสมอ
- **ต้องปิด "Headers and footers"** ในกล่องพิมพ์ (browser วาด header ของมันเองซ้อนไม่ได้) — ใส่ไว้ในคู่มือแล้ว · เป็นข้อจำกัดของ browser คุมจาก CSS ไม่ได้
- **แตะ `SongSheet.vue`** (ไฟล์ WT-B ที่ปิดงานแล้ว) เพราะ P'Aim สั่ง layout footer ใหม่ตรงๆ — ตอนนี้ SSOT ชื่อเว็บใช้ `SITE_NAME` จาก `songName.js` แล้ว (เลิก hardcode)

## พร้อม merge ไหม
**ใช่** — AC ครบ + feedback P'Aim จบ, unit 61/61 ผ่าน, ไฟล์ไม่ทับ worktree อื่น (US-I5/EditorMode ไม่แตะ)
เหลือแค่ P'Aim เคาะอีเมลทีมของ US-I4 (เติมทีหลังได้ ไม่บล็อก merge) และลองพิมพ์จริงยืนยันหน้าตา

**URL ตรวจงาน:** <http://localhost:5301> (dev server ค้างรันไว้)
