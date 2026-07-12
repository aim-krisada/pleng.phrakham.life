# B095 — เล่มเพลง 3 เล่ม canonical + ล็อกช่อง "หมวด" ในหน้าแก้ไข

**Branch:** `book-taxonomy-3` (แตกจาก `studio-shell-redesign`) · **ไฟล์ที่แตะ:** `src/lib/bookshelf.js` · `src/components/EditorMode.vue` · `docs/ds/home-redesign.md` (§Taxonomy) · เทสต์ `src/lib/bookshelf.test.js` (แก้) + `src/components/ComboSelect.lock.test.js` (ใหม่)

## สรุป (F60+)
เล่มเพลงมี **3 เล่ม canonical เป็นตัวเลือกหลัก: เล่มใหญ่ (`lem-yai`) · อนุชน (`anuchon`) · เด็กเล็ก (`dek-lek`)** — `yuwachon` (ยุวชน · 0 เพลง · ไม่เคยใช้จริง) ถูกแทนด้วย `dek-lek`. ช่อง "หมวด" ในหน้าแก้ไข **เสนอ 3 เล่มนี้เป็นตัวเลือก แต่ยังยืดหยุ่น ("เลี้ยงได้" · ไม่ล็อกแข็ง — P'Aim 12 ก.ค.)**: คง `allow-custom` ไว้ → พิมพ์/เพิ่มชื่อเองได้ถ้าจำเป็น (เปลี่ยนชื่อ/เพิ่มเล่มที่ 4 ไม่ต้องแก้โครง). 1 เพลงอยู่ได้เล่มเดียว (single-select เดิม). **ไม่มี DB migration** — `category` เป็นคอลัมน์ free-text · เพลงเด็กเล็กเพิ่มทีหลังตอน import ด้วยโค้ด `dek-lek` · เพลงเดิม (anuchon 122 · lem-yai 1) ไม่กระทบ. ยืนยันบนเบราว์เซอร์จริงกับ Supabase live 123 เพลง.

## 1. `src/lib/bookshelf.js` — 3 เล่ม
- `CATEGORY_ORDER = ['lem-yai', 'anuchon', 'dek-lek']` (ลำดับสัน) · `CATEGORY_NAMES` map `dek-lek`→"เด็กเล็ก" · **ลบ `yuwachon` ออกทั้งคู่**.
- คง behavior data-driven เดิมทุกอย่าง: โค้ด category แปลกที่ไม่อยู่ใน map ยังโชว์ raw (extra bucket) · เล่ม 0 เพลงซ่อน (เด็กเล็กจะไม่โผล่จนกว่ามีเพลงจริง) · fallback "อื่นๆ / ยังไม่จัดเล่ม" คงเดิม.
- แก้คอมเมนต์ที่อ้าง ยุวชน → เด็กเล็ก (2 จุด).

## 2. `src/components/EditorMode.vue` — หมวด (3 ตัวเลือก · ยืดหยุ่น)
- `CATEGORY_OPTIONS` (บรรทัด ~166) = 3 ตัวเลือก label ไทยอ่านง่าย: `เล่มใหญ่ / อนุชน / เด็กเล็ก` (เดิมมีตัวเดียว `anuchon`).
- **คง `allow-custom`** ที่ `<ComboSelect>` ช่องหมวด → เสนอ 3 เล่มเป็นตัวเลือกสะดวก แต่ยังพิมพ์/เพิ่มชื่อเองได้ (ไม่ล็อกแข็ง · "เลี้ยงได้") — P'Aim 12 ก.ค.
- **ไม่แตะ logic single-select** — `meta.category` เป็นค่าเดียวอยู่แล้ว = 1 เพลง 1 เล่ม · default `anuchon` คงไว้.

## 3. SA — โค้ดเด็กเล็ก + DS
- **โค้ด `dek-lek`** (SA เคาะ · เรื่องเทคนิค) — ตาม convention kebab เหมือน `lem-yai` · ชัด อ่านออก แมปชื่อไทยได้สะอาด.
- อัปเดต `docs/ds/home-redesign.md` §Taxonomy = 3 เล่ม canonical + note ว่า `yuwachon`(0 เพลง) ถูกแทนด้วย `dek-lek` + note ว่า "หมวด" ในหน้าแก้ไขล็อก 3 เล่ม (ตัด allow-custom).

## Verify (Tier-B · เบราว์เซอร์จริง · Claude Browser MCP · dev server worktree `--host --port 5395`)
หน้าแก้ไข (Studio) mount ให้ anon ได้ → ตรวจ UI จริงได้โดยไม่ต้องล็อกอิน (การล็อกอินกันแค่ตอน "บันทึก"):
- **(ก) ช่อง "หมวด" เสนอ 3 เล่มเป๊ะ:** เปิด dropdown จริง → `["เล่มใหญ่", "อนุชน", "เด็กเล็ก"]` ✅ (คง `allow-custom` = ยังพิมพ์/เพิ่มชื่อเองได้ · ไม่ล็อกแข็ง ตาม P'Aim 12 ก.ค.)
- **(ข) bookshelf เรนเดอร์ถูก (ต่อ Supabase live 123 เพลง):** `orderedBooks(ทั้ง 123)` = `เล่มใหญ่ (1) · อนุชน (122)` เรียงตาม CATEGORY_ORDER · **เด็กเล็กซ่อน** (0 เพลง · `dekLekHiddenWhenEmpty=true`) ✅ · raw category ในฐานจริงมีแค่ `anuchon`+`lem-yai` → ลบ `yuwachon` ไม่กระทบข้อมูลจริง ✅
- **หมายเหตุ public:** หน้าแรกแบบไม่ล็อกอินโชว์ "0 เล่ม" = GATE verified เดิม (123 เพลง verified=false) ไม่ใช่ผลจากงานนี้.

## Test / build
- `bookshelf.test.js` แก้อ้างอิง `yuwachon`→`dek-lek` (3 จุด) → **16 passed**.
- `ComboSelect.category.test.js` (ใหม่ · 3 tests) — พิสูจน์ intent ยืดหยุ่น: (1) เสนอ 3 ตัวเลือกเรียงถูก (2) เลือกแล้ว emit โค้ด (3) **พิมพ์ชื่อนอกลิสต์ยังติด** (allow-custom = "เลี้ยงได้" ไม่ล็อกแข็ง). → **3 passed**.
- **full suite: 374 passed** (เดิม 371 + 3 ใหม่) · **build ✅**.
- ⚠️ `notationLint.test.mjs` แสดง "1 failed file" = ของเดิมบนฐาน `studio-shell-redesign` (สคริปต์เรียก `process.exit` ที่บรรทัด 190 · logic ตัวมันเอง 72 passed 0 failed) · ไม่เกี่ยวงานนี้.

## ขอบเขต / กันชน
- แตะเฉพาะ `bookshelf.js` · `EditorMode.vue` (2 บรรทัด) · DS · เทสต์ 2 ไฟล์ · **ไม่แตะ model/DB/search/SongSheet** · ไม่มี migration.
- Refine ไม่รื้อ: ต่อยอด CATEGORY_OPTIONS/CATEGORY_ORDER ของเดิม.
- **รอ tester gate ก่อนเข้า PM DoD · อย่า merge เอง (PM merge).**
