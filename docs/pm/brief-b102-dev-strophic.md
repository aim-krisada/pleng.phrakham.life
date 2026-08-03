# Brief — B102 (dev · Phase 1): "ร้องรับทุกข้อ" (strophic) — ฝึกร้องเล่นรับซ้ำครบ

**ฐาน:** `studio-shell-redesign` · **branch ใหม่:** `b102-dev-strophic` · **สั่งโดย:** PM (pm11)
**อ่านสเปกก่อน (SSOT):** `docs/ds/sing-chorus-repeat.md` (SA ออกแบบครบ) · report `docs/reports/b102-sa-chorus-repeat.md`

## P'Aim เคาะขอบเขต (12 ก.ค. ผ่าน PM)
**ทำ "ร้องรับทุกข้อ" (strophic) ก่อน = Phase 1** · **สัญลักษณ์กระโดด D.C./D.S./Coda/Segno = Phase 2 แยก** (เล่มอนุชนยังไม่มีเพลงใช้ · เผื่ออนาคต) — **อย่าเพิ่งทำ Phase 2**

## บั๊ก (ยืนยันแล้ว)
เพลง 141 ร้อง "รับหลังทุกข้อ" แต่ arrangement ใส่ท่อนรับ **ครั้งเดียว** → playback เล่นรับ 1 ครั้ง (156 โน้ต) · **แผ่นพิมพ์ถูกอยู่แล้ว** (รับโชว์ครั้งเดียว) → **แก้ที่ playback เท่านั้น**

## สิ่งที่ต้องทำ (Phase 1 · ตามสเปก §4.3–4.4)
- **แยก play-order ออกจาก display-order** — วางโครง **play-order resolver** (สเปก §4.3): display (`resolveContent`) คงรับเขียนครั้งเดียว (แผ่นพิมพ์ไม่แตะ) · playback อ่าน directive แล้ว "กาง" ลำดับเล่นจริง → `songToNotes`/`buildPlayNotes` · **ทำโครงให้ Phase 2 (สัญลักษณ์กระโดด) เสียบเพิ่มได้** (resolver แบบ dispatch ตามชนิด)
- **directive strophic "รับทุกข้อ"** ในโมเดล (`songModel.js`) บนท่อนรับ (เช่น `afterEachVerse`) — เก็บใน `content` (SSOT · download JSON เห็น)
- **playback กาง:** หลังแต่ละข้อ (ทำนองเดียวกับข้อ1) → แทรกท่อนรับ → 141 เล่นรับ 4 ครั้ง (252 โน้ต) · ไทม์ไลน์ dot รับ 4 จุด · karaoke ไฮไลต์ทุกรอบ (โน้ตถือ `li` เดิม เหมือนกลไก `‖: :‖`)
- **checkbox "ร้องรับทุกข้อ"** ที่ท่อนรับ (`EditorMode.vue`) = ตัวช่วยเขียน/ลบ directive (คนไม่ต้องรู้ศัพท์) · undo/redo ครอบ · บันทึก/เปิดใหม่คงอยู่
- **แผ่นเพลง (`SongSheet.vue`):** rubric "(ร้องรับทุกข้อ)" โชว์ 1 จุด · **รับยังโชว์ครั้งเดียว (ไม่แตะ dedup เดิม)**

## รั้ว / ระวัง
- `songModel.js` · `midi.js` · `SongViewer.vue` · `SongSheet.vue` · `EditorMode.vue` + test · **ไม่ทำสัญลักษณ์กระโดด (Phase 2)**
- **ไม่ regress:** `‖: :‖`/volta เดิม (100/99) · เพลง 77 (รับ 2 entry เนื้อต่าง) · เพลงทั่วไปไม่มี directive = เหมือนเดิมเป๊ะ

## DoD + รายงาน (session-agnostic)
- `npx vitest run` เขียว (`notationLint` quirk) + `npm run build` · test: 141 strophic→รับ 4 ครั้ง (`midi.order` node-verified) · display/print รับครั้งเดียว · round-trip directive · regress ชุดเดิม (AC-1/AC-5/AC-7 ในสเปก)
- dev server `--host` + Network URL · **verify by ear เบราว์เซอร์จริง:** 141 ติ๊ก "ร้องรับทุกข้อ" → ฝึกร้องได้ยินรับ 4 รอบ · แผ่นพิมพ์รับครั้งเดียว
- รายงาน `docs/reports/b102-dev-strophic.md` + §📥 inbox + ping PM (pm11) · **ไม่ commit ลง base** · ⛔ ไม่ merge/deploy — tester gate ก่อน
