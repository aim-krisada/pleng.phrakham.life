# B095 — เล่มเพลง 3 เล่ม canonical + ล็อกช่อง "หมวด" ในหน้าแก้ไข

**Branch:** เดิม `book-taxonomy-3` · **lock-fix (B095):** `b095-lock-fix` (แตกจาก `studio-shell-redesign`) · **ไฟล์ที่แตะ (lock-fix):** `src/components/EditorMode.vue` · `src/components/ComboSelect.category.test.js` (mount EditorMode) · docs 3 ไฟล์ (DS §Taxonomy · report นี้ · system-map §เล่มเพลง) · **ไม่แตะ `bookshelf.js`/DB** (3 เล่ม canonical + ซ่อนเด็กเล็กถูกอยู่แล้ว)

## สรุป (F60+)
เล่มเพลงมี **3 เล่ม canonical: เล่มใหญ่ (`lem-yai`) · อนุชน (`anuchon`) · เด็กเล็ก (`dek-lek`)** — `yuwachon` (ยุวชน · 0 เพลง · ไม่เคยใช้จริง) ถูกแทนด้วย `dek-lek`. ช่อง "หมวด" ในหน้าแก้ไข **ล็อก 3 เล่มนี้เท่านั้น (P'Aim 12 ก.ค. · ผ่าน PM)**: **ไม่มี `allow-custom`** → พิมพ์ค่านอกลิสต์ไม่ติด (เด้งกลับ 1 ใน 3). การเพิ่ม/เปลี่ยนชื่อเล่ม = งาน admin (B096 · deferred) ไม่ใช่ free-text ในหน้าแก้ไข. 1 เพลงอยู่ได้เล่มเดียว (single-select เดิม). **ไม่มี DB migration** — `category` เป็นคอลัมน์ free-text · เพลงเด็กเล็กเพิ่มทีหลังตอน import ด้วยโค้ด `dek-lek` · เพลงเดิม (anuchon 122 · lem-yai 1) ไม่กระทบ. ยืนยันบนเบราว์เซอร์จริงกับ Supabase live 123 เพลง.

> **หมายเหตุ (B095 lock-fix):** ก่อนหน้านี้ base หลุดเป็นเวอร์ชัน flexible (คง `allow-custom` · "เลี้ยงได้") ที่ self-merge เข้ามาโดยไม่ผ่าน PM = ไม่นับ. รายงานนี้ถูกแก้กลับเป็น "ล็อก 3 เล่ม" ตาม requirement ที่ P'Aim เคาะผ่าน PM.

## 1. `src/lib/bookshelf.js` — 3 เล่ม
- `CATEGORY_ORDER = ['lem-yai', 'anuchon', 'dek-lek']` (ลำดับสัน) · `CATEGORY_NAMES` map `dek-lek`→"เด็กเล็ก" · **ลบ `yuwachon` ออกทั้งคู่**.
- คง behavior data-driven เดิมทุกอย่าง: โค้ด category แปลกที่ไม่อยู่ใน map ยังโชว์ raw (extra bucket) · เล่ม 0 เพลงซ่อน (เด็กเล็กจะไม่โผล่จนกว่ามีเพลงจริง) · fallback "อื่นๆ / ยังไม่จัดเล่ม" คงเดิม.
- แก้คอมเมนต์ที่อ้าง ยุวชน → เด็กเล็ก (2 จุด).

## 2. `src/components/EditorMode.vue` — หมวด (ล็อก 3 เล่ม)
- `CATEGORY_OPTIONS` (บรรทัด ~167) = 3 ตัวเลือก label ไทยอ่านง่าย: `เล่มใหญ่ / อนุชน / เด็กเล็ก` (เดิมมีตัวเดียว `anuchon`).
- **ไม่มี `allow-custom`** ที่ `<ComboSelect>` ช่องหมวด → เลือกได้แค่ 3 เล่ม · พิมพ์ค่านอกลิสต์ไม่ติด (เด้งกลับ 1 ใน 3) — P'Aim 12 ก.ค. ผ่าน PM.
- **ไม่แตะ logic single-select** — `meta.category` เป็นค่าเดียวอยู่แล้ว = 1 เพลง 1 เล่ม · default `anuchon` คงไว้.

## 3. SA — โค้ดเด็กเล็ก + DS
- **โค้ด `dek-lek`** (SA เคาะ · เรื่องเทคนิค) — ตาม convention kebab เหมือน `lem-yai` · ชัด อ่านออก แมปชื่อไทยได้สะอาด.
- อัปเดต `docs/ds/home-redesign.md` §Taxonomy = 3 เล่ม canonical + note ว่า `yuwachon`(0 เพลง) ถูกแทนด้วย `dek-lek` + note ว่า "หมวด" ในหน้าแก้ไขล็อก 3 เล่ม (ตัด allow-custom).

## Verify (Tier-B · เบราว์เซอร์จริง · Claude Browser MCP · dev server worktree `--host --port 5395`)
หน้าแก้ไข (Studio) mount ให้ anon ได้ → ตรวจ UI จริงได้โดยไม่ต้องล็อกอิน (การล็อกอินกันแค่ตอน "บันทึก"):
- **(ก) ช่อง "หมวด" เสนอ 3 เล่มเป๊ะ:** เปิด dropdown จริง → `["เล่มใหญ่", "อนุชน", "เด็กเล็ก"]` ✅
- **(ก2) ล็อก — พิมพ์ค่านอกลิสต์ไม่ติด:** พิมพ์ "เยาวชน" แล้ว blur → เด้งกลับเป็น 1 ใน 3 (ไม่มี `allow-custom`) ✅ ตาม P'Aim 12 ก.ค. ผ่าน PM.
- **(ข) bookshelf เรนเดอร์ถูก (ต่อ Supabase live 123 เพลง):** `orderedBooks(ทั้ง 123)` = `เล่มใหญ่ (1) · อนุชน (122)` เรียงตาม CATEGORY_ORDER · **เด็กเล็กซ่อน** (0 เพลง · `dekLekHiddenWhenEmpty=true`) ✅ · raw category ในฐานจริงมีแค่ `anuchon`+`lem-yai` → ลบ `yuwachon` ไม่กระทบข้อมูลจริง ✅
- **หมายเหตุ public:** หน้าแรกแบบไม่ล็อกอินโชว์ "0 เล่ม" = GATE verified เดิม (123 เพลง verified=false) ไม่ใช่ผลจากงานนี้.

## Test / build
- `bookshelf.test.js` แก้อ้างอิง `yuwachon`→`dek-lek` (3 จุด) → **16 passed**.
- `ComboSelect.category.test.js` (mount `EditorMode` จริง · 3 tests) — พิสูจน์ lock: (1) เสนอ 3 ตัวเลือกเรียงถูก (2) เลือกแล้ว model = โค้ดเล่ม (3) **พิมพ์ชื่อนอกลิสต์ ("เยาวชน") ไม่ติด** — เด้งกลับ 1 ใน 3 (ไม่มี allow-custom). → **3 passed**.
- **full suite: 374 passed** (เดิม 371 + 3 ใหม่) · **build ✅**.
- ⚠️ `notationLint.test.mjs` แสดง "1 failed file" = ของเดิมบนฐาน `studio-shell-redesign` (สคริปต์เรียก `process.exit` ที่บรรทัด 190 · logic ตัวมันเอง 72 passed 0 failed) · ไม่เกี่ยวงานนี้.

## ขอบเขต / กันชน
- แตะเฉพาะ `bookshelf.js` · `EditorMode.vue` (2 บรรทัด) · DS · เทสต์ 2 ไฟล์ · **ไม่แตะ model/DB/search/SongSheet** · ไม่มี migration.
- Refine ไม่รื้อ: ต่อยอด CATEGORY_OPTIONS/CATEGORY_ORDER ของเดิม.
- **รอ tester gate ก่อนเข้า PM DoD · อย่า merge เอง (PM merge).**
