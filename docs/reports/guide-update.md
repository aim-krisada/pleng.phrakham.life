# Report — guide-update (คู่มือตรงฟีเจอร์จริง + ไอคอนภาพรวม + เครดิตแหล่งที่มา)

**Branch:** `guide-update` (fork ถูกฐาน `studio-shell-redesign` · verify แล้ว merge-base = f7093af = tip)
**Scope:** content/UX · refine ไม่ redesign · 2 ไฟล์ view เท่านั้น
**Status:** เสร็จ · test เขียว · build ผ่าน · verify live แล้ว · **รอ P'Aim ดูของจริง (ถ้อยคำให้เกียรติคน) → PM gate** (ห้าม merge/deploy เอง)

## ทำอะไรไปบ้าง

### A. `src/views/Guide.vue` ② "วิธีใช้เว็บนี้" — ยกเครื่องให้ตรง UI จริง
- เขียน section "อ่านและฟังเพลง" ใหม่ให้ตรงของจริง (verify จาก source จริง: `SongViewer.vue` · `SingTransport.vue` · `ExportTool.vue` · `soundOptions.js`):
  - อธิบาย **แถบเครื่องเล่น** ล่างจอ + ปุ่ม **⚙ ตั้งค่า** (เปิดรายการปุ่ม + ปักปุ่มขึ้นแถบ)
  - **เมนู "เสียงดนตรี"** = 1 หัวข้อ (ไอคอน `volume-2`) แล้วอธิบายใต้หัวข้อว่ามีอะไร ตรงกับ `soundOptions.js` จริง: เสียงที่เล่น (ทำนอง/คอร์ด/รวม) · การบรรเลง (เดี่ยว/เต็มวง เปียโนนำ) · เครื่องดนตรี (เปียโน/กีตาร์ · อื่นทยอยเปิด) · อารมณ์-สไตล์ (บรรเลง/สงบ/ตรงโน้ต) · ปรับละเอียด (เปียโนเท่านั้น)
  - **ปุ่ม A/B "วาทยกร" — ไม่เขียนถึง** (ถอดออกแล้ว เปิดตลอด · ยืนยันจาก comment `SongViewer.vue:526`)
  - **เปียโนบรรเลง (golden-piano)** — เล่ากว้างๆ (เรียบเรียงอัตโนมัติ · เล่นทำนอง+คลอ+หายใจ)
  - **▶ ฟังทำนอง** — ความเร็ว · วนซ้ำ · **คาราโอเกะไฮไลต์ทีละพยางค์** · แถบเวลา seek · เลือกท่อน
  - คีย์ย้าย · **คอร์ดเป็นตัวเลข** · เนื้อร้องล้วน · **ขนาดตัวอักษร (Aa)**
  - **ดาวน์โหลด/พิมพ์** — ตรงเมนู ExportTool จริง 3 แบบ: พิมพ์/บันทึก PDF (A4) · ข้อมูลเพลง (JSON) · **ไฟล์เสียง MP3 (เสียงเปียโนจริง)**
  - **ป้าย "✓ ตรวจแล้ว"** — เขียนให้ตรงความจริง: badge เป็น QA marker ของ **ทีมที่ล็อกอิน** เท่านั้น (public เห็นแต่เพลงที่ตรวจแล้วอยู่แล้ว · ที่มา `bookshelf.js:39-43`) → คู่มือจึงบอก "ทุกเพลงในคลังผ่านการตรวจแล้ว" เป็นหลัก แล้ววงเล็บอธิบายป้าย
  - เพิ่มโน้ตต้นข้อ ② เรื่องเมนู ☰ (มือถือ) + สลับ **ตัวอักษรไทย** (มีหัว/ไม่มีหัว) — ตรง `ShellBar.vue`
- **ไอคอนภาพรวม** (ตาม brief: 1 ไอคอน/หัวข้อใหญ่ + เมนูเสียงดนตรี เท่านั้น · ไม่ใส่ทุก bullet):
  - H3 หาเพลง = `list-music` · H3 อ่าน/ฟัง = `circle-play` · H4 เสียงดนตรี = `volume-2` · H3 ห้องทำเพลง = `file-plus`
  - ทุกไอคอนมีใน `Icon.vue` อยู่แล้ว → **ไม่ต้องเพิ่ม path ใหม่** · ใช้ `<Icon>` เดิม · `aria-hidden` baked ใน component · สี inherit `currentColor` (H3 = --brand ตามธีม)

### B. `src/views/About.vue` — เพิ่มการ์ด "ขอบคุณ & แหล่งที่มา" (ไอคอน `book-open`)
verify กับไฟล์ที่อ้าง · ไม่แต่งเกิน:
- **โน้ต/เนื้อเพลง** (`docs/pm/book-codes.md`): ต้นทางหลัก = ไทยอนุชน 120 (~120 เพลง) + เทียบข้าม 8 เล่ม (เล่มเล็ก/เยอรมัน/เยอรมันอนุชน Yuko/มงคลสมรส/สิงคโปร์/สิงคโปร์อนุชน/อังกฤษ Hymn/ไว้อาลัย) + บทเพลงสรรเสริญ · โทน = ขอบคุณ/ให้เกียรติ
- **เครดิต sample** (`public/samples/README.md` = SSOT · ไม่คัดเกิน): Splendid Grand (PD) · FreePats Spanish Classical กีตาร์ (CC0) · Bigcat เชลโล (CC0) · VSCO-2-CE Violin (CC0) · **FluidR3_GM © Frank Wen — CC-BY 3.0** (อันเดียวที่บังคับเครดิต · ระบุตรงตาม README)
- **เทคนิคเรียบเรียง** เล่ากว้างๆ ภาษาคน (วาทยกร/เน้นมือขวา/หายใจปลายวรรค/humanize/เพดัล) + ปิดท้ายชี้ดูซอร์สโค้ด GPL v3 ที่ GitHub
- **ไม่ซ้ำ license** — การ์ด #license เดิมพูดเรื่องลิขสิทธิ์เนื้อ/ทำนอง + GPL ไปแล้ว การ์ดใหม่แค่ชี้ + ขอบคุณ ไม่ทวน

## Verify (จาก worktree · dev `--host` port 5310)
- `npm test` → **649 passed** (62 suites) · 1 suite `notationLint.test.mjs` รายงาน fail แต่เป็น false-positive ของ vitest (สคริปต์เรียก `process.exit(0)` = lint **ผ่าน**) · ไม่เกี่ยวไฟล์ที่แก้
- `vite build` → **ผ่าน** (145 modules · chunk-size warning เดิม ไม่เกี่ยว)
- live (browser จริงชี้ที่ dev server worktree):
  - Guide: 9 ไอคอน · **0 ว่าง** · ทุก H3/H4 มีไอคอน (path children 5/2/3/4) · heading ไม่ล้นกล่อง · badge ตัวอย่าง = เขียว #1d7a54 · 0 overflow (layout viewport)
  - About: heading `book-open` สี --brand · Frank Wen/CC-BY 3.0/GPL v3/แหล่งเพลง/เทคนิค ครบ · 5 ไอคอน 0 ว่าง · **0 overflow ที่ 360 จริง**
  - console error = 0
- **หมายเหตุ mobile:** emulator cap layout viewport ของหน้า Guide ไว้ 482 (จำกัดของ tool) → verify 0 overflow ที่ 482 + About ยืนยัน 0 overflow ที่ 360 จริง · เนื้อหาใหม่เป็น text/list/flex-heading เหมือนกัน · **P'Aim ทดสอบมือถือจริงผ่าน Network URL = gate สุดท้าย**

## 🚩 เจอระหว่างทำ — ส่งต่อ PM (นอก scope · ไม่แก้)
1. **label vs behavior เพี้ยนของ toggle คอร์ดตัวเลข** — เมนูตอนนี้ label ว่า **"เลขนัชวิลล์ (1 4 5)"** (`SongViewer.vue:48`, `Studio.vue:150`) แต่ `chordToRoman()` (`chords.js`) เรนเดอร์เป็น **เลขโรมัน I/IV/V/vii°** จริง (case-sensitive) · badge = '145' · **② คู่มือเดิมเคยเขียน "คอร์ดโรมัน → I V VIm"** · ผมเลี่ยงกับดักนี้โดยเขียนกลางๆ ("คอร์ดเป็นตัวเลข") ไม่ผูกชื่อ · **ยังมีความไม่ตรงกันในโค้ด (Nashville label ↔ Roman output) + ① notation card ยังเรียก "คอร์ดโรมัน"** → เสนอ PM ตั้งงานแยกให้ SA เคาะว่าจะเอา "โรมัน" หรือ "นัชวิลล์" แล้ว sync label/badge/output/คู่มือ ① ให้ตรงกันทั้งหมด
2. **"✓ ตรวจแล้ว" เป็น team-only** — brief วางเป็นฟีเจอร์ public แต่จริง public ไม่เห็น (เห็นแต่เพลง verified) · ผมเขียนให้ตรงความจริงแล้ว · แจ้งเผื่อ P'Aim อยากปรับถ้อยคำ

## Next
- P'Aim เปิด Network URL ดูของจริง (โดยเฉพาะถ้อยคำการ์ด "ขอบคุณ & แหล่งที่มา" = ให้เกียรติคน) → เคาะถ้อยคำ → PM gate → merge base → deploy
- ไฟล์แก้: `src/views/Guide.vue` · `src/views/About.vue` (+ ไม่แตะ `Icon.vue` · ไอคอนมีครบ)
