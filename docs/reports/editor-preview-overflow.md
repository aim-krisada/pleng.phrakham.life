# Report — B081 พรีวิว "ดูผลทั้งเพลง" กระดาษล้น/เลื่อนมั่ว (สาย B)

**สาย:** `fix-editor-preview-overflow` (ฐาน `studio-shell-redesign` รอบ 7 `71b8d8f`) · **brief:** `docs/pm/brief-editor-preview-overflow.md` · **สั่งโดย:** pm7
**ที่มา:** พี่เปา 11 ก.ค. · img `docs/backlog-assets/B081-editor-preview-paper-overflow.jpg`
**แตะไฟล์เดียว:** `src/components/EditorMode.vue` (+28/−12) · ⛔ ไม่แตะ `SongSheet.vue` (สาย A)

---

## ต้นเหตุจริง
หน้าต่างพรีวิวลอย (`.ed-float`) มี CSS เดิม `.ed-float-body :deep(.sheet-root){width:max-content} :deep(.song-line){flex-wrap:nowrap}` (มาจาก fix รอบก่อน "ล็อกบรรทัด nowrap") — บังคับแต่ละบรรทัด = แถวเดียวยาว → **ล้นขวา + scroll แนวนอน + คอลัมน์ขวาโดนตัด** (ตรงกับที่พี่เปาเห็น). nowrap ให้ P'Aim เช็ก line-break ได้ก็จริง แต่ผลลัพธ์ใช้จริงไม่ได้ (เลื่อนมั่ว/ตัดคอลัมน์). B081 = เปลี่ยนเป็น **พรีวิว = กระดาษจริง**.

## วิธีแก้ — render ที่สัดส่วนกระดาษ A4 จริง แล้วย่อพอดีหน้าต่าง (ด้วย font-size ไม่ใช่ transform)
- **สัดส่วน print:** กระดาษ A4 พิมพ์ได้ = 210mm − ขอบ 16mm×2 = **178mm** (`@page margin:15mm 16mm 16mm`) · ฟอนต์ฐาน print = 1rem (`.sheet-read-scale{font-size:1rem}`) → อัตราส่วน width:font = 672.76px : 16px = **42.05**
- **template:** ห่อ `<SongSheet>` ใน `.ed-float-page`
- **CSS:**
  ```css
  .ed-float-body { …; container-type: inline-size; scrollbar-gutter: stable; }
  .ed-float-page { width: 100cqw; max-width: 100%; font-size: calc(100cqw / 42.05); }
  ```
  - `100cqw` = ความกว้างเนื้อในของ body → หน้ากระดาษกว้างเท่าหน้าต่างพอดี → **ไม่มี h-scroll**
  - `font-size = 100cqw/42.05` รักษาอัตราส่วน width:font ของ print เป๊ะ · เพราะแผ่นเพลงเป็น em ทั้งหมด → ย่อฟอนต์ = ย่อทั้งห้องเท่ากัน → **ห้อง wrap ตรงจุดเดียวกับ print ทุกความกว้างหน้าต่าง**
  - ใช้ **font-size ย่อ ไม่ใช่ `transform:scale`/`zoom`** → overlay ไทข้ามห้อง (B069 ใน SongSheet ที่วัด `getBoundingClientRect`) วัด px จริง ไม่เพี้ยน (scale/zoom จะ double-apply พังเส้นไท)
  - `scrollbar-gutter:stable` กันสกอลบาร์แนวตั้งดันให้ cqw กว้างเกิน (เศษ ~15px h-scroll หายไป)
- **float กว้างขึ้น** `min(720px, 100vw−32)` → เดสก์ท็อปโชว์ A4 ~1:1 (พิกเซลตรง print) · จอเล็กย่อลงตามสัดส่วน
- global `.song-line{flex-wrap:wrap}` (styles.css) จึง wrap เหมือนกระดาษ (ไม่ต้องแตะ styles.css)

## AC ครบ (verify Browser MCP จริง · เพลง 1 + เพลง 4)
| AC | ผล |
|---|---|
| 1. เท่ากระดาษ · wrap เหมือน print · ไม่มี h-scroll · ไม่ตัดคอลัมน์ | ✅ เดสก์ท็อป (float 720): body scrollWidth==clientWidth (703==703) · page 679px @ font 16.15px (ratio 42.04) · เนื้ออยู่ในขอบ (−42px) · บาร์ wrap 2 แถว |
| 2. พรีวิว = ผล print | ✅ อัตราส่วน width:font = 42.04 ≈ print 42.05 ทุกความกว้าง → line-break ตรง print by construction · เดสก์ท็อป ≈1:1 พิกเซลตรง · **PDF จริง = P'Aim เคาะ** (ดูล่าง) |
| 3. มือถือ/จอเล็ก = ย่อ+เลื่อนแนวตั้ง ไม่ใช่แนวนอนมั่ว | ✅ float 360px: no h-scroll · page 319px @ font 7.59px (ratio 42.05 คงเดิม) · wrap เหมือนเดิม · เลื่อนแนวตั้งได้ |
| 4. ไม่ regress พรีวิวต่อห้อง (B050) + test เดิม | ✅ per-bar preview ยัง render (22 sheet-root) · **317 test เขียว** · console 0 |
| + B069 ไทข้ามห้องในพรีวิว | ✅ 3 overlay arc ตรงตำแหน่งโน้ต (arcsMatchTies) · ครึ่ง NoteRow ซ่อนหมด (ไม่ซ้อน) แม้ย่อ font 7.6px |

## DoD
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` → **317 passed** (1 "failed file" = `notationLint.test.mjs` process.exit เดิม · pre-existing)
- `npm run build` → ✅
- dev `--host`: **Network `http://192.168.1.124:5411/`** (port 5411)

## ⚠️ ค้าง — print PDF จริง (P'Aim gate)
สัดส่วน 42.05 พิสูจน์ทาง DOM+เลขว่า wrap = print (เดสก์ท็อป ~1:1). ตาม standing rule (`feedback_verify_print_from_pdf`) **ไม่เคลม print-verified จาก DOM** — ขอ P'Aim print เพลง (เช่นเพลง 4 ที่พี่เปาแจ้ง) เป็น PDF จริงเทียบว่าพรีวิว = กระดาษ ก่อนปิด AC2.

## หมายเหตุถึง PM (ข้อสังเกต ไม่ใช่งานสาย B)
- ฐานรอบ 7 นี้: ไทข้ามห้องในพรีวิวลอย **render โค้งเดียวถูกแล้ว** (ครึ่ง start+end ของ NoteRow ซ่อนครบ · 0 doubled) — B069 ในบริบทพรีวิวดูสะอาด · เผื่อเป็นข้อมูลให้สาย A (B082/B069 SongSheet)
- ⛔ ยังไม่ merge/deploy — รอ pm7 → tester
