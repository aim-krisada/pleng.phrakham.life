# Report — editor song-picker GATE leak fix

**Branch:** `claude/eloquent-swanson-1ce028` (fork of `studio-shell-redesign`)
**Scope:** `src/components/EditorMode.vue` (+ new test) — no other lane touched.

## Bug (P'Aim, 14 ก.ค.)
หน้าแก้ไข → ปุ่ม "เพลง" → "เปิดเพลงที่มีอยู่" (ตัวเลือกเพลง) โชว์เพลง **ทั้งหมด** แม้ไม่ล็อกอิน
→ คนทั่วไปเห็นเพลงที่ยังไม่ verified. หน้ารายการเพลง (SongList) กรองถูกแล้ว แต่ picker นี้ไม่กรอง
= ผิด GATE (public visibility gate).

## Root cause
`loadSongList()` ดึง `songs` ทั้งหมดโดยไม่มี filter, และ `pickerOptions` map ทั้ง list โดยไม่ผ่าน
`visibleSongs()` — helper GATE เดียวกับที่ `SongList`/`bookshelf.js` ใช้ (single source of truth).
`loadSongList()` ยังไม่ได้ select คอลัมน์ `verified` ด้วย → ไม่มีข้อมูลให้กรอง.

## Fix (KISS · reuse ของเดิม)
1. `import { visibleSongs } from '../lib/bookshelf.js'`
2. เพิ่ม `verified` ใน select ของ `loadSongList()`
3. กรองใน `pickerOptions` computed: `visibleSongs(songList.value, loggedIn.value)` แล้วค่อย map
   — computed บน `loggedIn` → re-filter ตอน login/logout ทันที **โดยไม่ reload list**

ไม่แตะ audio / notation / shell. `loggedIn` เดิม derive จาก `props.tier` (single gating source).

## Verify — real browser (live Supabase, anon)
เสิร์ฟ worktree จริงที่พอร์ต 5428 (config `gate` · `--host`), อ่าน `pickerOptions` สดจาก Vue instance:

| อ่านจากแอปจริง (anon) | ค่า |
|---|---|
| เพลงทั้งหมดใน DB (`songList`) | **124** |
| verified = true | **8** |
| unverified = false | **116** |
| เพลงใน picker (ตัด "— เพลงใหม่ —") | **8** |
| unverified ที่รั่วเข้า label **หรือ** search haystack | **0** |

- 8 เพลงใน picker ตรงกับหน้ารายการเพลง (อนุชน 1/4/7/9/11/13/14/16) — ตรง board §GATE เป๊ะ
- ทดสอบชื่อ unverified จริง (`ของขวัญ`, `ในโลกนี้`, `ดอกไม้ในป่า`) → ไม่โผล่ใน label/ค้นหา (AC #3)

## Tests
- ใหม่ `src/components/EditorMode.picker-gate.test.js` (4 เคส): anon = verified-only · editor = ครบทุกเพลง ·
  re-filter reactive ตอน login/logout (setProps ไม่ reload) · search haystack ก็ถูก gate
- ชุดเต็ม **604/604 ผ่าน** + `npm run build` ผ่าน
  (`notationLint.test.mjs` = standalone script เรียก `process.exit` → vitest flag ทุกครั้ง · ไม่เกี่ยว · ไม่ได้แตะ)

## AC — ครบทั้ง 4
1. ✅ anon → picker เห็นเฉพาะ verified (= 8, ตรงหน้ารายการเพลง) — verified live
2. ✅ logged-in team → เห็นครบทุกเพลง — unit test (editor)
3. ✅ ค้นหาใน picker กรองตามสถานะเดียวกัน — verified live + unit test
4. ✅ unit test: anon ไม่มี unverified · loggedIn ครบ

## Test / verify URLs (dev server ยังรัน)
- Local: http://localhost:5428/#/studio
- Network (มือถือ LAN): http://192.168.1.124:5428/#/studio

## PM gate
**ยังไม่ merge / deploy** — รอ PM. เสนอ batch เข้า deploy รอบถัดไปพร้อม lane อื่น
(GATE เป็นเรื่องใหญ่สุดของ board — leak นี้เป็นช่องเดียวที่ SongList กรองแต่ editor picker ไม่กรอง).

อ้างอิง: `docs/reports/check-role-permission.md` (จุด 3 · client-side filter = แนวที่ P'Aim รับความเสี่ยงไว้ · board §1.3).
