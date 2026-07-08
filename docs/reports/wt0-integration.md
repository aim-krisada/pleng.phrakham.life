# รายงาน — wt0-integration (WT-0 integration/polish)

**รอบ:** รอบแรก — US-I2 + US-I3 + US-I4 (ชุด "ทำได้เลย" ไม่แตะ EditorMode)
**สถานะ:** เสร็จ

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
- `src/views/Studio.vue` — ส่ง `:song-title="titleText"` เข้า `SongSheet` (โหมดแผ่น)
- `src/styles.css` — `@page` margin + `@bottom-center` counter (print)
- `src/views/Guide.vue` — ลิสต์ 4 ขั้น C03 + TODO อีเมลทีม
- `src/lib/songName.test.js` — อัปเดต test `songBasename` เป็น format ใหม่ + test `SITE_NAME`
- `src/lib/jsonIO.test.js` — อัปเดต test `songFilename` ให้ตรง SSOT ใหม่
- `src/views/Studio.mode.test.js` — เพิ่ม test โหมดแผ่นส่ง prop `song-title` ถูกค่า

## ผลทดสอบ
- **unit:** ผ่านทั้งหมด **64/64** (`npm test`) — ครอบ AC ครบ: `songBasename` = "เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก" · ตัด `/ : * ?` · title ว่าง → "…- แผ่นเพลง" · `title_en` ไม่ใช้ตั้งชื่อไฟล์ · `songName` ยังได้ "N. ชื่อ" · โหมดแผ่นส่ง `songTitle` = "7. เพลงทดสอบ"
- **พิสูจน์บนเว็บสด (port 5301):**
  - US-I2 เพลงจริง #1 → display `1. พระเจ้าเป็นความรัก` · PDF/JSON = `เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก(.json)` · ตรงกัน
  - US-I3 โหมดแผ่น: `SongSheet.songTitle = "1. พระเจ้าเป็นความรัก"` · กฎ `@page … @bottom-center { content: "หน้า " counter(page) " ของ " counter(pages) }` โหลดอยู่ใน stylesheet จริง
  - US-I4 หน้าคู่มือ: เห็นลิสต์ 4 ขั้นครบ
  - ไม่มี console error
- **วิธี tester ลอง (ต้องดูด้วยตาในกล่องพิมพ์จริง):**
  1. เปิด <http://localhost:5301> → เลือกเพลง
  2. **US-I2:** ปุ่มดาวน์โหลด (มุมขวาบน) → "ดาวน์โหลด JSON" และ "บันทึกเป็น PDF" → ชื่อไฟล์ควรตรงกัน = `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>`
  3. **US-I3:** โหมด "แผ่นเพลง" → กด "พิมพ์" → ในกล่องพิมพ์ **ปิด "Headers and footers"** (Chrome/Edge) → footer ล่าง: ซ้าย=`เพลง.พระคำ.ชีวิต` · กลาง=`หน้า X ของ Y` · ขวา=ชื่อเพลง · เนื้อไม่ทับ footer ตอนหลายหน้า
  4. **US-I4:** เมนู "คู่มือ" → หัวข้อ "คีย์เพลงใหม่ (ห้องทำเพลง)" → เห็นลิสต์ 4 ขั้นใต้ "ไม่มีบัญชีก็ช่วยได้"

## ข้อสังเกต / คำถามถึง SA
- **อีเมลทีม (US-I4)** ยังเป็น TODO — รอ P'Aim ให้อีเมลจริง แล้วแทนคำว่า "ส่งอีเมลถึงทีม" ด้วยอีเมลที่ระบุได้ (คอมเมนต์ `TODO(P'Aim)` ฝังไว้ที่ `Guide.vue`)
- **SITE_NAME ซ้ำที่ `SongSheet.vue`** — `SongSheet.vue` ยัง hardcode `const SITE = 'เพลง.พระคำ.ชีวิต'` (footer print ซ้าย). เป็นไฟล์ WT-B (นอกขอบเขต DS-I2 ที่ให้แตะแค่ `songName.js` + `DownloadTool.vue`) จึงไม่แก้. ถ้าจะให้ SSOT จริง 100% แนะนำงานต่อไปให้ `SongSheet` `import { SITE_NAME }` — เสนอเป็น backlog เล็ก
- `DownloadTool.vue` ไม่ต้องแก้ (มันเรียก `songBasename` อยู่แล้วทั้ง PDF และ JSON) — การแก้ core lib จึงพอ

## พร้อม merge ไหม
**ใช่** — AC ครบทั้ง 3 US, unit 64/64 ผ่าน, ไฟล์ที่แตะไม่ทับ worktree อื่น (US-I5/EditorMode ไม่แตะ)
เหลือแค่ P'Aim เคาะอีเมลทีมของ US-I4 (เติมได้ทีหลัง ไม่บล็อก merge)

**URL ตรวจงาน:** <http://localhost:5301> (dev server ค้างรันไว้)
