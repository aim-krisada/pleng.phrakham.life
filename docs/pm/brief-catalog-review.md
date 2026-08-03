# brief — catalog + review UI (ด่วน · B053 + B054) ให้พี่เปาเริ่มเกลา 120 เพลง

**สาย:** dev · worktree ใหม่จากฐาน `studio-shell-redesign` · 1 worktree = 1 branch = 1 port
**ที่มา:** P'Aim 9 ก.ค. — คลัง 120 เพลง live แล้ว · พี่เปาต้อง review 41 เพลงติดธง · ตอนนี้หน้ารายการโชว์อะไรไม่ได้

## โจทย์ (3 ส่วน)
### 1. หน้ารายการ (`src/views/SongList.vue`) — filter + ป้าย
- **ดึง field เพิ่ม:** ตอนนี้ select แค่ `id,number,title_th,title_en,content` → เพิ่ม **`theme, verified, book_refs`** (มีใน DB แล้วจาก import)
- **filter:** (ก) **"ยังไม่ตรวจ"** (verified=false) (ข) **ธีม** (อนุชน › 8 ธีม: กิตติคุณ/คริสตจักร/รักปรารถนา/ประสบการณ์/พระคัมภีร์/อาณาจักร/มอบถวาย/ความสุขแห่งความรอด · map ชื่อ `docs/pm/book-codes.md`)
- **ป้าย ⚠️** บนการ์ดเพลงที่ **DA ติดธง** (repeat ต้องตั้ง / lint แดง / เนื้อ≠โน้ต) — อ่านจาก field ที่ DA เก็บ (`review_flags` · **สาย DA ทำคู่กัน** · ถ้ายังไม่มี field ให้ทำ filter/toggle ก่อน แล้ว wire ป้ายทีหลัง)
- **ป้าย "ตรวจแล้ว ✓"** บนเพลง verified=true

### 2. หน้าแก้ไข (`src/components/EditorMode.vue`) — ปุ่มติ๊ก "ตรวจแล้ว"
- ปุ่ม/checkbox **"✓ ตรวจแล้ว"** → set `verified=true` ใน DB (RLS team write · ต้อง login) · toggle กลับได้
- พี่เปาแก้เพลงเสร็จ → ติ๊ก → เพลงหลุดจาก filter "ยังไม่ตรวจ"

### 3. หมายเหตุ warning ในแอป
- **ในหน้าแก้ไข lint/beat warning โผล่อยู่แล้ว** (notationLint + B055 · deploy แล้ว) → พี่เปาเปิดเพลงติดธงจะเห็นปัญหาเอง · งานนี้แค่ทำให้ **หน้ารายการชี้ว่าเพลงไหนต้องเปิดดู**

## ขอบเขต (กันชน)
- แตะ `SongList.vue` + `EditorMode.vue` (+ `store.js`/`supabase` ถ้าจำเป็นสำหรับ update verified) · ⛔ **ห้ามแตะ `songSearch.js`** (สาย B058 note-search ทำ) · ⚠️ EditorMode.vue = ระวังถ้า mobile pass เริ่ม (แจ้ง PM)
- **พึ่ง DA:** ป้าย ⚠️ อ่าน field flags ที่ DA เก็บ — ประสาน (ทำ filter/toggle ได้เลย · ป้าย wire เมื่อ field พร้อม)

## Verify
- เบราว์เซอร์ (`--host` + Network URL): filter "ยังไม่ตรวจ" เห็น 120 เพลง · filter ธีม · เปิดเพลง ติ๊กตรวจแล้ว → verified=true ใน DB → กลับมาหน้ารายการเพลงมีป้าย ✓ + หลุด filter · unit + build เขียว

## รายงานกลับ (session-agnostic)
`docs/reports/wt-catalog.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy · เช็ก branch ก่อน commit
