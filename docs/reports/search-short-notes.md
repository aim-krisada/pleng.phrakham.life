# Report — B074 ค้น "555" ไม่เจอเพลงทำนอง (เลขล้วนสั้นค้นโน้ตได้)

**สาย:** `search-short-notes` (ฐาน `studio-shell-redesign`) · **worktree:** `pleng-search-short` · **สั่งโดย:** pm4
**backlog:** B074 · **หลักฐาน:** `docs/backlog-assets/B074-search-555-not-found.png`

## อาการ
พิมพ์ค้น `555` → 0 เพลง ทั้งที่เพลง 1 (พระเจ้าเป็นความรัก) ขึ้นต้นทำนอง 5 5 5 6…

## ต้นเหตุ
`src/lib/songSearch.js` — `isNoteQuery(q)` ตั้งเกณฑ์ "เลขล้วนไม่เว้นวรรค = โน้ต" ที่ **≥4 หลัก**
(`q.replace(/[^0-7]/g,'').length >= 4`) เพื่อกันเลขเพลง 3 หลัก (100/117). ผลคือ `555` (3 หลัก)
ไม่เข้า note-path เลย → ตกไปหาเป็น "เลขเพลง 555" (ไม่มี) → 0 เพลง.

## การแก้ (แตะ 2 ไฟล์เท่านั้น)
`src/lib/songSearch.js` + `src/lib/songSearch.test.js` — ไม่แตะ SongList/EditorMode/NoteRow/SongSheet/midi/notation/UI

1. **ลดเกณฑ์ note ของเลขล้วนจาก ≥4 → ≥3 หลัก** — `555`/`100`/`117` กลายเป็น note query
2. **ทำ scoreSong เป็น UNION (ไม่ใช่สลับทางเดียว)** — สำหรับ note query:
   - เจอ exact ที่ **เลขเพลง / ชื่อ / เนื้อ** (ผ่าน `hay.includes(q)` เดิม) → score `0` (rank ก่อน)
   - ไม่เจอ → เช็ค **ลำดับโน้ตต่อเนื่อง** (`notesCompact`) → score `NOTE_SEQ_SCORE = 0.5` (rank ตามหลัง)
   - ไม่เจอทั้งคู่ → ไม่แมตช์
3. คง **exact-sequence** (ไม่ fuzzy) ของ note-path เดิม (ต่อยอด note-search-verify) — โน้ตผิดตัวเดียวไม่แมตช์
4. คงเลขล้วน **≤2 หลัก (`1`,`42`) = เลขเพลงอย่างเดียว** (ค้นโน้ต 1–2 ตัว = รกทุกเพลง)

### ทำไม union ไม่ทำ 100/117 หาย
`100` = note query แล้วก็จริง แต่ tier-1 `hay.includes("100")` ยังจับ **เลขเพลง 100** ได้ก่อน (score 0)
แล้วเพลงที่ทำนองมี 1-0-0 ตามหลัง (0.5). เลขเพลงจึง rank ก่อนเสมอ — ไม่ต้องพึ่ง catalog order.

### มี/ไม่มี space ตรงกัน
`555` และ `5 5 5` เจอเพลงเดียวกัน (compact/notesCompact ตัด space ทั้งคู่) — ผลลัพธ์ตรง.

## ผลทดสอบ (worktree `pleng-search-short`)
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**' src/lib/songSearch.test.js` → **55/55 ผ่าน**
- full suite → **273/273 ผ่าน** (ไฟล์ `notationLint.test.mjs` ขึ้น FAIL เพราะสคริปต์เรียก `process.exit(0)` เอง — **มีมาก่อน ไม่เกี่ยวสายนี้** · ยืนยันด้วยการรันบนฐานที่ยังไม่แก้แล้ว fail เหมือนกัน · ไม่ได้แตะ notation)
- `npm run build` → ผ่าน (built in ~1.5s)

### เคสที่ครอบใน unit test (B074 block ใหม่)
- `555` → เจอเพลงทำนอง 5-5-5 (เพลง 1) ✓ (เดิม 0 เพลง)
- `5 5 5` = `555` → เพลงเดียวกัน ✓
- `100` → เพลงเลข 100 มาก่อน แล้วเพลงทำนอง 1-0-0 ตามหลัง (`searchSongs` → `[100, 7]`) ✓
- `117` → เลขเพลง 117 ก่อน ทำนอง 1-1-7 ตาม ✓
- `1`/`42` → เลขเพลงอย่างเดียว (ไม่โดน melody noise) ✓
- ค้นเนื้อ/ชื่อ/เลขหนังสือเก่า (B053)/exact-sequence (note-search-verify) — ชุดเดิมยังผ่านครบ ✓

## รั้ว (ทำตาม)
- แตะเฉพาะ `src/lib/songSearch.js` (+ `.test.js`) · ⛔ ไม่แตะ SongList/EditorMode/NoteRow/SongSheet/midi.js/notation/UI
- ⛔ ไม่ merge / ไม่ deploy — รอ PM (pm4) ตรวจ DoD

## หมายเหตุการทำงาน (shared-dir hazard)
main dir ถูกอีก session สลับ branch ทับระหว่างทำงาน (จาก `search-short-notes` → `studio-shell-redesign`)
ตามที่ memory เตือน. แก้โดยดึง diff เฉพาะ 2 ไฟล์ของสายนี้ออก → revert รอยใน main dir → สร้าง worktree
แยก `pleng-search-short` แล้ว apply + commit ที่นั่น. `board.md`/pptx ที่ค้างใน main dir เป็นของ session อื่น ไม่ได้แตะ.

## ❓ คำถามถึง P'Aim (ไม่บล็อก · default ใช้ไปแล้ว)
ตอน union เช่น `100`: **default = เลขเพลง 100 มาก่อน** แล้วค่อยเพลงที่ทำนองมี 1-0-0.
ถ้าอยากให้ "ทำนอง" ขึ้นก่อนในบางเคส บอกได้ — ตอนนี้ยึด "คนพิมพ์เลขล้วน = ตั้งใจหาเลขเพลงมากกว่า".
