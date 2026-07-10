# รายงาน — songsheet-finish (สาย dev · เก็บงานแผ่นเพลง)

**Branch:** `songsheet-finish` (แตกจาก `studio-shell-redesign`) · commit `48b6f64`
**แตะไฟล์:** `src/components/SongSheet.vue` · `src/components/SongSheet.test.js` · `.claude/launch.json` (port 5369)
**⛔ ไม่แตะ:** `NoteRow.vue` · `SongViewer.vue` · `EditorMode.vue` · `styles.css` (ไม่ต้องแก้ — ดู B004/B044 ด้านล่าง)
**ห้าม merge/deploy** — รอ PM ตรวจ DoD + P'Aim ยืนยัน

---

## ⭐ B069 — ไทข้ามห้องเป็นโค้งเดียวต่อเนื่อง (follow-up B062) ✅ ทำแล้ว

**ปัญหาเดิม:** ไทที่ข้ามเส้นห้อง (โน้ตต้นทางในห้องหนึ่ง → `~` โน้ตปลายทางในห้องถัดไป) โน้ตอยู่คนละ
segment/NoteRow มี `.bar-line` คั่น → NoteRow วาดได้แค่ครึ่งเดียวชนขอบห้อง มีช่องโหว่ตรงเส้นห้อง
(ตรงกับข้อค้าง B062 ที่ฝากไว้ให้ "overlay ระดับ line" = PM เคาะ)

**แก้:** วาด **SVG overlay ระดับบรรทัด ใน `SongSheet.vue`** — โค้งเดียวพาดจากหางโน้ตต้นทาง
ข้ามเส้นห้อง ไปถึงโน้ต `~` ปลายทาง
- **วัดตำแหน่งโน้ตจริง** (`getBoundingClientRect`) แล้วสร้าง `<path>` เป็น px map 1:1 กับ viewBox —
  รองรับความกว้างจอ/การ wrap/สเกลฟอนต์ (Aa)
- **re-measure** เมื่อ resize + `beforeprint` + เปลี่ยนเนื้อหา/เลเยอร์/คีย์ · debounce ด้วย `setTimeout`
  (ไม่ใช้ `requestAnimationFrame` — rAF ถูกหยุดในแท็บที่ไม่ paint/headless → วัดไม่ทำงาน)
- **NoteRow ไม่แตะ** — ซ่อนครึ่งโค้งเดิมของ NoteRow **เฉพาะไทข้ามห้อง** (โน้ต `~` ที่เป็นตัวแรกของ
  segment) ด้วย scoped `:deep()` CSS · ไทในห้องเดียวกัน (within-segment) ยังใช้ NoteRow เหมือนเดิม
- **สไตล์ engraving เดียวกับ NoteRow** — filled lens ปลายเรียว หนากลาง · สีจาก token `--note-blue`
  (ไม่ hard-code)
- ไทที่ wrap คนละแถว/ตำแหน่งย้อน = ข้าม (ไม่วาดโค้งเฉียงพัง) — degrade สวย

## verify (เพลง 100 = อ้างอิง · มี tie `~` ข้ามห้องใน DB จริง 3 จุด)

เสิร์ฟ worktree จริงที่ port 5369 (`--host`) · เปิด `#/song/4c2d14bc-…` (เพลง 100) โหมด **แผ่นเพลง**:

- **โค้งเดียวต่อเนื่อง:** overlay เรนเดอร์ **3 path** (ตรงกับ 3 ไทของเพลง 100) · จุดตรวจ path แรก:
  ปลายซ้าย x=260 (หางโน้ต `1 - - -`) · ปลายขวา x=305 (โน้ต `~1`) · **เส้นห้องอยู่ที่ x=285 = อยู่ใต้โค้ง
  พอดี** → โค้งพาดข้ามเส้นห้องเป็นเส้นเดียว ✅
- **ครึ่งโค้ง NoteRow ถูกซ่อน:** `.tie-end-arc` ของโน้ต `~` = `display:none` (ไม่วาดซ้อน) ✅
- **วางเหนือตัวเลข:** ปลายโค้ง y=403 · ยอด y=398 · ตัวเลขเริ่ม y=406 → โค้งลอยเหนือ digit ในย่าน
  จุดออกเทฟ ✅
- **3 breakpoint:** desktop/tablet โค้งครบ 3 · แคบลงจน bar wrap → ไทที่ตกคนละแถวถูกข้าม (ไม่มีเส้นเฉียง)

> ⚠️ **ข้อจำกัด preview MCP:** แท็บ headless ทำ `requestAnimationFrame` ไม่ยิง + `innerWidth`
> เพี้ยน + screenshot timeout — จึงยืนยันด้วย **DOM geometry (พิกัด path/เส้นห้อง/ตัวเลข)** ตาม
> convention worktree แทน screenshot (แม่นกว่า)

---

## B004 — print polish ✅ มีครบแล้วในฐาน (ไม่มีอะไรต้องเพิ่มในไฟล์ที่ได้รับอนุญาต)

ตรวจแล้วทั้ง 3 จุดถูก build ไปก่อนหน้าโดยสายอื่น (Studio.vue / DownloadTool.vue / printChrome.js /
styles.css) — **ไม่มีส่วนไหนที่ต้องแก้ใน `SongSheet.vue`/`styles.css` เพิ่ม**:

1. **ชื่อไฟล์ PDF = ชื่อเพลง** — ✅ `Studio.vue` ตั้ง `document.title = songBasename(s)` ตอนเปิดเพลง
   (ยืนยันบน `#/song/100`: `document.title = "เพลง.พระคำ.ชีวิต - ขอสรรเสริญพระเจ้าโดยไม่หยุดยั้ง"`)
2. **song-title บนแผ่น** — ✅ `SongSheet` เรนเดอร์ `.sheet-print-title` กลางหัวกระดาษ (print-only)
   (ยืนยัน: "100. ขอสรรเสริญพระเจ้าโดยไม่หยุดยั้ง") · footer 3 ช่องเป็น `@page` margin box
   (site · **หน้า X ของ Y** · วันที่) จาก `printChrome.js` แล้ว
3. **หน้า X ของ Y + margin** — ✅ `counter(page)/counter(pages)` ใน `printChrome.js` +
   `@page { margin: 15mm 16mm 16mm }` ใน `styles.css` (แถบล่างกันชน footer หลายหน้า)

> ⚠️ **gate P'Aim (ตาม memory "verify print from PDF"):** DOM ยืนยันได้แค่โค้ดโหลดถูก — ขอ P'Aim
> **สั่งพิมพ์ PDF จริงเพลง 100** ยืนยันชื่อไฟล์ + หัว + footer + margin ก่อนปิด DoD (อย่าเคลมจาก DOM)

---

## B044 — จับคู่โน้ต–เนื้อให้แน่น + เว้นระหว่างบรรทัดให้กว้าง ✅ ทำแล้ว (PM ยืนยัน P'Aim เห็นจากภาพจริง)

**เจอต้นตอจริง:** comment เดิมที่พูดถึง "note-row margin-bottom 20px" = **stale** — ปัจจุบันช่องว่างมาจาก
`.segment .note` block สูงเกิน (55px) เพราะ block พก line-height ของ inline note-row + `&nbsp;` ท้าย →
**เนื้อลอยห่างจากตัวเลข ~31px** (วัดจริงเพลง 100 · digit bottom → word top)

**แก้ (scoped ใน `SongSheet.vue` — ครอบทุก render: แผ่นเพลง + ฝึกร้อง + พรีวิวหน้าแก้ที่ reuse SongSheet):**
- **(ก) in-block แคบ:** `.sheet-root .segment .note { line-height: 0 }` → block ยุบเหลือเท่าความสูง
  note-row → **เนื้ออยู่ใต้โน้ต ~7px** (แค่ย่านจุดออกเทฟล่างที่จองไว้) = โน้ต+คำเป็นก้อนเดียว
  (NoteRow คุม line-height ตัวเองอยู่แล้ว ตัวเลขไม่กระทบ)
- **(ข) between-block กว้าง:** `.sheet-root .song-line:not(.song-line-lyrics) { margin-bottom: 16px }`
  → บรรทัด/ท่อนแยกชัด · **ยกเว้นบรรทัดเนื้อล้วน songbook** (คง 2px เดิม ไม่พัง)

**verify (เพลง 100 · HMR ค่าจริงหลังบันทึก):** in-block digit→word **7px** · between-block **16px** =
contrast ชัด (7 vs 16) · songbook lyrics-only ยัง 2px · B069 tie overlay ยัง 3 path (ไม่กระทบกัน) ·
**พรีวิวหน้าแก้:** `EditorMode.vue` เรนเดอร์ `<SongSheet>` (บรรทัด 1883/1941/2125/2147) → scoped fix
ครอบอัตโนมัติ (ตามที่ PM ขอ "fix ทั้งแผ่นเพลง + พรีวิวหน้าแก้พร้อมกัน")

> **ทำไม scoped ไม่แตะ `styles.css`:** in-block/between-block เป็น spacing ของ SongSheet เท่านั้น →
> scoped override ครอบ 3 โหมดพร้อมกัน + ไม่ชน `.song-line`/token ของ S0 (global) หรือ B043 เฟส 2

## B046 — ระยะชื่อเพลง ↔ เนื้อ (แผ่นเพลง)

`.sheet-print-title` margin-bottom 6mm (print-only) มีช่องหัวเอกสารอยู่แล้ว — ไม่แตะเพิ่ม ·
ถ้า P'Aim เห็น PDF จริงแล้วอยากห่างขึ้น = tweak ค่า 6mm ง่ายทีหลัง (ยังไม่มีสัญญาณว่าเพี้ยน)

---

## ผลทดสอบ
- **vitest:** 258 passed (เดิม 256 + **2 lock test B069**: overlay host + tie-end มีจริง · degrade เมื่อ
  ไม่มี layout ไม่ throw) · `notationLint.test.mjs` fail = **ของเดิม** (เป็น node lint script เรียก
  `process.exit` → รันเดี่ยว = **72 passed 0 failed**)
- **build:** ✅ ผ่าน

## URL ตรวจ
worktree serve เอง (config `b069` · `--host`):
- **Local:** `http://localhost:5369`
- **Network (LAN · มือถือ/พี่เปา):** `http://10.215.141.98:5369`

เพลง 100 = `#/song/4c2d14bc-68be-4e69-9b1e-480a2c148886` โหมด **แผ่นเพลง**
