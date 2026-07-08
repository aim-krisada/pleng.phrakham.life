# รายงาน — wt0-integration (WT-0 integration/polish)

**รอบ:** US-I2/I3/I4 → รอบ 2 (print-polish) → **รอบ 3: รื้อ print ใหม่จาก PDF จริง (P'Aim)**
**สถานะ:** เสร็จ · **✅ P'Aim พิมพ์ PDF จริงยืนยันแล้ว (8 ก.ค. 69)** — header ว่าง · ชื่อเพลงกลางบน · footer 3 ช่องขนาด/ระนาบเดียวกัน · ชื่อไฟล์ถูก

## รอบ 3 — รื้อระบบพิมพ์ ตาม PDF จริงที่ P'Aim ส่งมา
เปิด PDF จริงแล้วเห็น 3 ปัญหา (เช็คจากหน้าจอไม่เจอ — ต้องดูไฟล์พิมพ์):
- (1) **มี header ของ browser** (วันที่บนซ้าย + ชื่อเว็บบนกลาง) · (2) **ไม่มีชื่อเพลงเหนือเนื้อ** (P'Aim พิมพ์จากโหมด "ดู" ซึ่งเดิมไม่มี title ตอนพิมพ์) · (3) **footer ตัวหนังสือคนละขนาด/คนละระนาบ** (เลขหน้าเป็น `@page` counter แต่ site+วันที่เป็น div `position:fixed` = คนละกลไก)

**วิธีแก้ (ออกแบบใหม่ให้ footer เป็นกลไกเดียว + title พิมพ์ได้ทุกโหมด):**
- **footer = `@page` margin box ทั้ง 3 ช่อง** → `src/lib/printChrome.js` (ใหม่) inject `<style>` ตอน `beforeprint`: `@bottom-left`=ชื่อเว็บ (SSOT) · `@bottom-center`=`หน้า X ของ Y` (counter) · `@bottom-right`=`พิมพ์เมื่อ …` · **font-size 9pt เท่ากันทั้ง 3 → ระนาบเดียว ขนาดเท่ากัน** (แก้ปัญหา 3) · ลบ div `position:fixed` ใน SongSheet ทิ้ง · init ครั้งเดียวใน `App.vue` → **ใช้ได้ทั้งปุ่มพิมพ์และ Ctrl+P**
- **ชื่อเพลงเหนือเนื้อ** — ย้ายมาไว้ใน `SongSheet` (`h1.sheet-print-title` print-only) รับ prop `songTitle` · ส่งจากทั้ง `Studio` (โหมดแผ่น) และ `SongViewer` (โหมดดู) → **พิมพ์จากโหมดไหนก็มีชื่อเพลง** (แก้ปัญหา 2) · h2 บนจอในโหมดแผ่นตั้ง `no-print` กันซ้ำ
- **ชื่อไฟล์** — `Studio` ตั้ง `document.title = songBasename(song)` ตั้งแต่ตอนโหลดเพลง (คืนค่าเว็บตอนออก) → **Ctrl+P ก็ได้ชื่อไฟล์ถูก** ไม่ต้องกดผ่านปุ่มเรา (รอบ 2 แก้เฉพาะปุ่ม → P'Aim กด Ctrl+P เลยยังได้ชื่อเว็บ)
- **header (ปัญหา 1)** — ส่วนบน (วันที่/ชื่อเว็บ) = **header ของ browser เอง** เว็บสั่งปิดด้วย CSS ไม่ได้ · ต้อง **ปิด "หัวกระดาษและท้ายกระดาษ" (Headers and footers)** ในกล่องพิมพ์ (บอกในคู่มือแล้ว) · เมื่อปิดแล้ว บนสุดจะเหลือแค่ชื่อเพลง

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

## ไฟล์ที่แก้ (รวมทุกรอบ)
- `src/lib/songName.js` — `SITE_NAME` + `songBasename` SSOT (ไม่มีเลข)
- `src/lib/printChrome.js` **(ใหม่)** — running footer เป็น `@page` margin box (inject ตอนพิมพ์) + `thaiPrintDate`
- `src/App.vue` — `initPrintChrome()` ครั้งเดียว (ทำงานทั้งปุ่มพิมพ์ + Ctrl+P)
- `src/views/Studio.vue` — `document.title = songBasename(song)` ตอนโหลดเพลง (แก้ชื่อไฟล์ทุกทาง) · ส่ง `:song-title` เข้า SongSheet · h2 บนจอ `no-print`
- `src/components/SongSheet.vue` — `h1.sheet-print-title` (ชื่อเพลง print-only เหนือเนื้อ) · ลบ div footer `position:fixed` ทิ้ง (ย้ายไป printChrome)
- `src/components/SongViewer.vue` — ส่ง `:song-title` เข้า SongSheet → โหมด "ดู" พิมพ์แล้วมีชื่อเพลง
- `src/styles.css` — `@page margin 15/16/16mm` (footer content ย้ายไป printChrome)
- `src/views/Guide.vue` — ลิสต์ 4 ขั้น C03 + tip ปิด Headers and footers
- tests: `songName.test.js` · `jsonIO.test.js` · `printChrome.test.js` (ใหม่) · `SongSheet.test.js` · `Studio.mode.test.js`

## ผลทดสอบ
- **unit:** ผ่าน **68/68** (`npm test`) — รวม `thaiPrintDate` = "พิมพ์เมื่อ 8 ก.ค. 69" · `footerCss` มี 3 margin box + counter + font-size 9pt ×3 · SongSheet พิมพ์ชื่อเพลงเป็นหัว · ไม่มี div footer แล้ว · `songBasename` SSOT ครบ
- **พิสูจน์บนเว็บสด (port 5301):**
  - **ชื่อไฟล์** โหลดเพลง #1 → `document.title = "เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก"` ทันที (Ctrl+P ก็ได้ชื่อถูก)
  - **ชื่อเพลงเหนือเนื้อ** โหมด "ดู": `.sheet-print-title` = "1. พระเจ้าเป็นความรัก" (print-only, บนจอ `display:none`)
  - **footer** dispatch `beforeprint` → inject `<style>` มี `@bottom-left/center/right` · `font-size:9pt` ×3 (เท่ากัน) · counter + วันที่ + ชื่อเว็บครบ · `afterprint` → ลบออก
  - ไม่มี console error
- **⚠️ ยังพิสูจน์ตัวพิมพ์จริงบนกระดาษไม่ได้** (preview screenshot โหมด print ไม่ได้) — ต้องให้ P'Aim/tester พิมพ์จริง
- **วิธี tester ลอง (ในกล่องพิมพ์จริง):**
  1. เปิด <http://localhost:5301> → เลือกเพลง → กด "พิมพ์" (หรือ Ctrl+P)
  2. **ปิด "หัวกระดาษและท้ายกระดาษ" (Headers and footers)** ในกล่องพิมพ์ ← สำคัญ (ลบ header วันที่/ชื่อเว็บของ browser)
  3. ตรวจ: บนสุด=ชื่อเพลงกลาง · ล่างซ้าย=`เพลง.พระคำ.ชีวิต` · ล่างกลาง=`หน้า X ของ Y` · ล่างขวา=`พิมพ์เมื่อ 8 ก.ค. 69` (3 อันขนาด/ระนาบเดียวกัน) · ชื่อไฟล์ตอน Save PDF = `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>`
  4. **US-I4:** เมนู "คู่มือ" → "คีย์เพลงใหม่ (ห้องทำเพลง)" → ลิสต์ 4 ขั้น + tip พิมพ์

## ข้อสังเกต / คำถามถึง SA
- **อีเมลทีม (US-I4)** ยังเป็น TODO — รอ P'Aim ให้อีเมลจริง (คอมเมนต์ `TODO(P'Aim)` ฝังใน `Guide.vue`)
- **header ของ browser (วันที่/ชื่อเว็บ บนสุด)** — เว็บสั่งปิดด้วย CSS ไม่ได้ (browser feature) · ต้องปิด "Headers and footers" ในกล่องพิมพ์ · แต่ตอนนี้ตั้ง `document.title` เป็นชื่อเพลงแล้ว ถึงเผลอไม่ปิด header กลางบนก็เป็นชื่อเพลง (ไม่ใช่ "คลังเพลงนมัสการ")
- **แตะไฟล์ WT-A (`SongViewer.vue`) + WT-B (`SongSheet.vue`)** — ปิดงาน merged แล้ว ไม่มี session อื่นจับ · P'Aim สั่ง print layout ใหม่ตรงๆ

## พร้อม merge ไหม
**ใช่** — unit 68/68 ผ่าน · **P'Aim ยืนยัน PDF จริงแล้ว** (header ว่าง · ชื่อเพลงกลางบน · footer เท่ากัน · ชื่อไฟล์ถูก) · ไฟล์ไม่ทับ worktree อื่น (US-I5/EditorMode ไม่แตะ)
เหลือ US-I4 อีเมลทีม (TODO รอ P'Aim ให้อีเมลจริง — เติมทีหลังได้ ไม่บล็อก merge)

**URL ตรวจงาน:** <http://localhost:5301> (dev server ค้างรันไว้)
