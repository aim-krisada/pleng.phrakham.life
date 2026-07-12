# DS — หน้าแรกใหม่ แบบเลือกเล่ม (bookshelf) · B087

**คู่ US:** `docs/us/home-redesign.md` · **Mockup:** `docs/design/home-bookshelf.html`
**Reference:** phrakham picker `C:\gl\krisada\phrakham.life2\assets\pk-bookpicker.js` (หลักการ drill 2 ชั้น + breadcrumb) · `docs/ui-standards.md`

## ไฟล์ที่แตะ (dev รอบหลัง — ยังไม่แก้ตอนนี้)
- **`src/views/SongList.vue`** — จุดหลัก. เพิ่ม 3 "view state" ในหน้าเดิม (books · songs-in-book · search-results). ปัจจุบันมันโหลด `songs` + render `.song-grid` แบนอยู่แล้ว ([SongList.vue:44](../../src/views/SongList.vue) โหลด · [:92](../../src/views/SongList.vue) grid) — งานคือ **ปรับ (refine) การจัดวางผลลัพธ์** ไม่ใช่รื้อ data flow.
- **`src/lib/bookCodes.js`** — ใช้ `BOOK_NAMES` + `bookRefLabel` ตามเดิม ([bookCodes.js:6](../../src/lib/bookCodes.js)). **ไม่แก้** — แค่ import เพิ่ม.
- **`src/lib/songSearch.js`** — `filterSongs` ตามเดิม ([songSearch.js:224](../../src/lib/songSearch.js)). **ไม่แก้** (สาย search เป็นเจ้าของ · US-AC5).
- **`src/styles.css`** — ใช้ S0 tokens เดิม. สไตล์ใหม่ = scoped ใน SongList.vue. ไม่เพิ่ม token กลาง.

**จุดเสี่ยงชนกับ worktree อื่น:** SongList.vue มีสายอื่นแตะน้อย (search facets B058) — dev ควร rebase บนฐานล่าสุดก่อน. ไม่แตะ SongSheet/EditorMode/NoteRow → ไม่ชนสาย print/tie/section-ux.

## design — layout / states
หน้าเดียว (SongList) มี 3 สถานะ, ช่องค้นหาอยู่บนสุดตลอด (teleport ไม่ต้อง — อยู่ในหน้าเดียว):

```
level (state)     :  'books'  |  'songs'  |  'search'
```

- **`books` (landing, query ว่าง):**
  - ช่องค้นหา (คง `.song-search` เดิม + facets เดิมได้) → หัวข้อ "เลือกเล่ม"
  - `book-grid`: 1 คอลัมน์ (มือถือ) → 2 (≥480px) → 3 (≥768px). แต่ละใบ = ปุ่ม (`<button>`): สัน (โค้ดเล่ม) + ชื่อเล่ม + "N เพลง" + chevron.
  - รายการเล่ม = **derived จาก data**: นับเพลงต่อ `book_refs.book` (เพลงอยู่หลายเล่ม = นับทุกเล่มที่อ้าง). เรียงตามลำดับ 9 โค้ดที่กำหนด (`BOOK_ORDER`); เล่มที่ยังไม่มีข้อมูลไม่ต้องซ่อน (แสดง 0 ได้ หรือซ่อน — เลือกซ่อนถ้า 0 เพื่อความสะอาด, ยกเว้นเล่มใหม่ที่ import). ต่อท้ายด้วยใบ **"อื่นๆ / ยังไม่จัดเล่ม"** เมื่อมีเพลง `book_refs` ว่าง (US-AC6).
- **`songs` (เลือกเล่มแล้ว):**
  - breadcrumb "← เล่มทั้งหมด" (ปุ่ม กลับ `books`) → หัวข้อ = ชื่อเล่ม + "N เพลง"
  - `song-list`: แถวเดียว/เพลง (`.song-row`) = **เลข** (tabular-nums, ชิดขวา) + ชื่อ (truncate+ellipsis, ไม่ห่อ) + คีย์ (chip). เรียงตาม `no` ของเล่มนั้น (จาก `book_refs.find(r=>r.book===code).no`).
  - กดแถว → `router.push('/song/'+id)`.
- **`search` (query ไม่ว่าง, override ทุกชั้น):**
  - ใช้ `filterSongs(songs, query)` เดิม → การ์ดผลแบน (เหมือน `.song-card` ปัจจุบัน) ข้ามทุกเล่ม + บรรทัด "แหล่งเพลง: …" จาก `bookRefLabels` เดิม ([SongList.vue:105](../../src/views/SongList.vue)).
  - ล้างช่อง → กลับสถานะก่อนหน้า (`books` หรือ `songs`).

**pseudocode (Vue, ย่อ):**
```
const level = ref('books')           // 'books' | 'songs'
const activeBook = ref(null)         // code หรือ '__none__'
const bookCounts = computed(() => tally songs by each book_refs.book, + fallback)
const inBook = computed(() => songs sorted by no in activeBook)
const results = computed(() => filterSongs(songs, query))     // เดิม
// query ว่าง → แสดง level; query ไม่ว่าง → แสดง results (search overrides)
```

**ทำไมไม่ใช้ modal แบบ phrakham:** phrakham เป็นปุ่ม → เปิด modal picker เพราะ picker เป็น "เครื่องมือกระโดด" บนหน้าอ่าน. pleng ใช้ picker **เป็นตัว landing เอง** → วางเป็นหน้า inline (ไม่ใช่ modal) สะอาดกว่า + ไม่ต้อง trap focus. ยืม **หลักการ** (drill 2 ชั้น · breadcrumb · number grid) ไม่ยืม DOM.

## test — unit + วิธี tester
- **unit (`npm test`, pure logic):**
  - `bookCounts` นับถูก: เพลงที่มี 2 refs ถูกนับใน 2 เล่ม · เพลง `book_refs` ว่าง → เข้า fallback เท่านั้น.
  - `inBook('ทอ')` เรียงตาม `no` จากน้อยไปมาก · ดึง `no` ของเล่มนั้น (ไม่ใช่ `song.number`).
  - เล่มที่ไม่มีเพลง → นับ 0 (ไม่ throw).
  - search ไม่ถูกแตะ: `filterSongs` เดิมยังผ่านชุดเทสต์เดิม.
- **a11y (axe-core + ui-invariants):** book-card + song-row เป็น `<button>`/`role`, มี accessible name · target ≥ 44px · no-scroll (scrollWidth==clientWidth ที่ 375) · โฟกัสเห็นชัด.
- **tester (Browser MCP, Tier-B วัดจริง):** ที่ 375/768/1280 → กริดเล่ม reflow 1/2/3 คอลัมน์ · ไม่มี h-overflow · แถวเพลงบรรทัดเดียว (ไม่ห่อ, ชื่อยาวได้ ellipsis) · drill เข้า/ออก + ค้นหา override ทำงาน · กดเพลงไป `/song/:id`.

## a11y
- WCAG 2.2 AA: คอนทราสต์ ≥ 4.5:1 (ชื่อ brand บน cream ผ่าน) · target ≥ 44px (book-card/song-row/crumb ตั้ง `min-height:var(--touch-min)`) · โฟกัส `:focus-visible` เดิม · คีย์บอร์ดครบ (ทุกอย่างเป็น button/link).
- theme tokens เดิมทั้งหมด (`--brand/--cream/--line/--muted/--sp-*/--fs-*/--touch-min`) — ไม่ hard-code สี.
- `aria-live` ที่ตัวนับผล/แถวว่าง (ผลค้นหา) เพื่อแจ้ง dynamic.

## ✅ P'Aim เคาะแล้ว (11 ก.ค. · mockup approved)
- **เล่ม 0 เพลง = ซ่อน** (ไม่โชว์เล่มว่าง)
- **หน้าตาเล่ม = สัน + โค้ดเล่ม พอ** (KISS · ไม่ทำปก/ไอคอนต่อเล่ม)
- **PC = 3 คอลัมน์** (ตาม mockup) · มือถือตามที่ SA ออกแบบ
→ dev build ตาม US/DS + mockup · ปรับ `SongList.vue` ไม่รื้อ · data-driven จาก `book_refs` (รับ "เล่มใหญ่"/`lem-yai` เอง) · คง search เดิม · ไม่แตะ model/DB/SongSheet

## 🔄 Taxonomy REVISED (P'Aim 12 ก.ค. — final · B095)
- **เล่มจริง = 3 เล่ม canonical จัดด้วย `category`:** `lem-yai`→"เล่มใหญ่" · `anuchon`→"อนุชน" (ไทยอนุชน 120) · `dek-lek`→"เด็กเล็ก"
- **`yuwachon`(ยุวชน) ถูกแทนด้วย `dek-lek`(เด็กเล็ก)** — yuwachon มี 0 เพลง ไม่เคยใช้จริง · P'Aim 12 ก.ค. เคาะ 3 เล่มตายตัว: เล่มใหญ่/อนุชน/เด็กเล็ก · code `dek-lek` (SA เคาะ · ตาม convention kebab เหมือน `lem-yai`) · เพลงเด็กเล็ก import ทีหลังด้วย code นี้ (category = free-text column · ไม่มี DB migration)
- **ช่อง "หมวด" ในหน้าแก้ไข (EditorMode.vue) ล็อกเลือกได้เฉพาะ 3 เล่มนี้** — `CATEGORY_OPTIONS` = 3 ตัวเลือก · **ตัด `allow-custom`** ที่ ComboSelect (พิมพ์ code เองไม่ได้) · single-select เดิม = 1 เพลง 1 เล่ม
- **`book_refs` (ล/ย/ยอ/ม/ส/สอ/อ/ว/บพส/ฟ...) = tag อ้างอิงเท่านั้น** — โชว์บนการ์ดเพลง (เช่น "อยู่ในเล่มเล็ก 282") ไม่ใช่เล่มหลักในหน้าแรก · ค้นหายังหาเจอด้วย ref (songSearch เดิม)
- **หน้าแรก picker = 3 เล่ม (จาก category)** ไม่ใช่ 9 (จาก book_refs) · ซ่อนเล่มว่าง (เด็กเล็กยังไม่มีเพลง = ไม่โผล่จนกว่ามี) · เพลงอยู่ 1 เล่มหลัก (category) เท่านั้น = ไม่ซ้ำหลายเล่ม
- แก้ `bookshelf.js` ให้ group ด้วย `category` (map 3 ชื่อ) · book_refs → เป็น tag บนเพลง · **ไม่แตะ model/DB/search**
