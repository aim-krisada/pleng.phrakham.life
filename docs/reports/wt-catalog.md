# report — catalog review UI (B053) · `wt-catalog`

**branch:** `wt-catalog` (ฐาน `studio-shell-redesign` @ `3d6f607`) · **port:** 5370 (`--host`)
**LAN:** `http://192.168.1.124:5370/` (PC พี่เอมเปิด server + WiFi "3BB 3" · P'Aim/พี่เปา ทดสอบมือถือ)
**ไฟล์ที่แตะ:** `src/views/SongList.vue` **อย่างเดียว**

## Scope (ปรับตาม PM 9 ก.ค. — สายนี้ = SongList เท่านั้น)
- ปุ่ม verified toggle เดิมทำใน `EditorMode.vue` → **PM ย้ายไปสาย editor-ux** → **revert EditorMode กลับฐานแล้ว** (0 บรรทัดค้าง) เหลือแค่ SongList
- `review_flags` (jsonb · codes `repeat`/`lint`/`words`) + `verified`/`theme` **P'Aim run SQL ลงฐานแล้ว** → SongList อ่านมาโชว์ได้เต็ม

## ทำอะไรไป — `SongList.vue`
- **select เพิ่ม field:** `theme, verified, book_refs, review_flags`
- **filter "⚠️ เฉพาะที่ยังไม่ตรวจ"** (ปุ่ม chip · `verified=false`) — วางบน `filterSongs()` (ไม่แตะ `songSearch.js` · สาย B058)
- **filter ธีม** (dropdown) — ตัวเลือก derive จากธีมจริงในฐาน (distinct + sort ไทย) → 8 ธีมครบ
- **ป้าย ⚠️ ต้องตรวจ** อ่าน `review_flags` → โชว์ 41 เพลง · tooltip บอกชนิด (ตั้งจุดซ้ำ/โน้ตอาจผิด/เนื้อ≠โน้ต)
- **ป้าย ✓ ตรวจแล้ว** บน `verified=true`
- ป้ายธีมเล็กใต้การ์ด + ตัวนับจำนวนเพลง

## Verify
- **build เขียว** · **unit `vitest --exclude .claude/** = 196 passed** (1 failed suite = `notationLint.test.mjs` `process.exit` **ของเดิมบนฐาน** ไม่เกี่ยว)
- **เบราว์เซอร์จริง (127.0.0.1:5370 · Supabase live 121 เพลง):**
  - โหลด 121 เพลง · 8 ธีม + "ทุกธีม" · console error 0
  - **ป้าย ⚠️ = 41 เพลง** (ตรง DA: 16 repeat · 6 lint · 28 words) · เพลง 2 "ของขวัญ" tooltip = "ตั้งจุดซ้ำ (repeat) · เนื้อ≠โน้ต" ตรง `["repeat","words"]` ในฐาน
  - filter "ยังไม่ตรวจ" → 121 (ทุกเพลง verified=false) · filter ธีม "อาณาจักร" → 11 (ตรงฐาน) · reset → 121
  - ป้าย ✓ = 0 (ยังไม่มีเพลง verified — ปุ่มติ๊กอยู่สาย editor-ux)

## หมายเหตุ / ส่งต่อ
- **ป้าย ✓ verified จะโชว์เมื่อ** สาย editor-ux ทำปุ่มติ๊กเสร็จ + พี่เปาเริ่มเซ็น (SongList โหลด verified มาแล้ว รอข้อมูล)
- **ตัวเลือกเสริม (ยังไม่ทำ · รอ PM เคาะ):** เพิ่ม filter "เฉพาะเพลงติดธง ⚠️" ให้พี่เปาไล่ 41 เพลงตรงๆ (ตอนนี้ใช้ป้ายชี้ + filter ยังไม่ตรวจ) — ทำได้เร็วถ้าต้องการ
- merge อิสระได้ (SongList ไม่ชนใคร) · ห้าม merge main/deploy — รอ PM
