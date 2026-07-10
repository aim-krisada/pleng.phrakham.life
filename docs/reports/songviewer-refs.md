# B053 (ต่อ) — แหล่งเพลง + scripture ในหน้าเพลงเดี่ยว (ฝึกร้อง / SongViewer)

**Branch:** `songviewer-refs` (แตกจาก `studio-shell-redesign`) · **ไฟล์ที่แตะ:** `src/components/SongViewer.vue` (render + scoped style) · `src/views/Studio.vue` (ส่ง `book_refs`+`scripture` ผ่าน `viewerSong`)

## สรุป (F60+)
B053 ทำการ์ดในหน้ารายการเพลงโชว์ "แหล่งเพลง" + `📖 scripture` ไปแล้ว แต่ **หน้าเพลงเดี่ยวยังไม่โชว์** (ฝากไว้ท้าย report b053 ข้อ 42) · งานนี้เติมให้ครบ: เปิดเพลงเดี่ยว (โหมด **ฝึกร้อง** = `SongViewer.vue`) ตอนนี้เห็น **"แหล่งเพลง: เล่มเล็ก 136"** + **"📖 มธ.11:28; ยฮ.4:14,8:12"** เป็น caption เล็กเหนือแผ่นเพลง · ใช้ helper `bookRefLabels()` ตัวเดียวกับการ์ด (SSOT ชื่อเล่มที่เดียว) · ยืนยันบนเบราว์เซอร์กับ Supabase จริง 121 เพลง.

## 1. ส่งข้อมูลผ่านถึงหน้าอ่าน (Studio.vue)
- `loadSong()` ใช้ `select('*')` อยู่แล้ว → `book_refs`+`scripture` มาอยู่ใน `loadedSong` ครบ (ไม่ต้องแก้ query / DB).
- `viewerSong` computed เดิมตัดเหลือ `{number,title_th,content}` → เพิ่ม `book_refs`+`scripture` (อ่านจาก `loadedSong` เพราะ 2 field นี้ไม่อยู่บน `liveSong` ที่เป็น shape สำหรับ edit).

## 2. render ในหน้าอ่าน (SongViewer.vue)
- import `bookRefLabels` จาก `lib/bookCodes.js` (helper เดียวกับ SongList · เปลี่ยนชื่อเล่มที่เดียวตามหมด).
- computed `refLabels = bookRefLabels(song.book_refs)`.
- template: บล็อก `.song-refs` เหนือ `.sheet-scale` — `v-if` โชว์เฉพาะเมื่อมี ref หรือ scripture:
  - `แหล่งเพลง: เล่มเล็ก 136` (join ` · ` · ซ่อนถ้าไม่มี ref)
  - `📖 <scripture>` (ซ่อนถ้า null)
- scoped style: caption `--fs-sm` สี muted (คลาส `.muted` global) · แต่ละอันคนละบรรทัด wrap ได้บนจอมือถือ · ใช้ token S0 ล้วน (`--sp-*`/`--fs-*`) ไม่ hard-code สี/token.

## Verify (เบราว์เซอร์จริง · Supabase live 121 · `--host`)
- **LAN:** `http://10.215.141.98:5310/` (`--host` · `--strictPort` · มือถือทดสอบได้)
- **หน้าเพลงเดี่ยว (DOM จริง):** เพลง "ข้าได้ยินเสียงพระเยซูตรัส" (`5c0e8f64…`) โหมดฝึกร้อง → `.song-refs` มี `แหล่งเพลง: เล่มเล็ก 136` + `📖 มธ.11:28; ยฮ.4:14,8:12` · อยู่**เหนือแผ่นเพลง** (compareDocumentPosition ยืนยัน) ✅
- **v-if ถูกต้อง:** เพลงที่มี scripture อย่างเดียว (ไม่มี book_ref) โชว์แค่ 📖 · ไม่มีทั้งคู่ = ไม่ render บล็อก ✅
- **console:** 0 error / 0 warn (เหลือแต่ `[vite] connecting/connected` DEBUG) ✅
- **unit:** เต็ม suite **256 passed** (ไม่แตะ logic → ไม่เพิ่มเทสต์) · **build ✅** (117 modules).
- ⚠️ `notationLint.test.mjs` fail = ของเดิมบนฐาน (สคริปต์ `process.exit(0)` · B057 · ไม่เกี่ยวสายนี้ · logic 256 vitest เขียวหมด).

## ขอบเขต / กันชน
- แตะเฉพาะ `SongViewer.vue` (render + scoped style) · `Studio.vue` (ส่ง prop ผ่าน `viewerSong` เท่านั้น · ไม่แตะ logic โหมด/dock).
- ⛔ ไม่แตะ `SongSheet.vue` (อีกสาย) · `NoteRow.vue` · `styles.css` · `SongList.vue` · token/สี.
- โชว์ในโหมด **ฝึกร้อง** (หน้าอ่านหลักที่เปิดเพลงเดี่ยว) · โหมด **แผ่นเพลง** (พิมพ์ A4) เจตนาไม่ใส่ — แผ่นพิมพ์ = SongSheet ของอีกสาย ไม่แตะ.
- ไม่ merge main · ไม่ deploy.
