# brief — B052 ค้นหาจากเนื้อเพลง + fuzzy

**สาย:** dev (algorithm) · worktree ใหม่จากฐาน `studio-shell-redesign` · **1 worktree = 1 branch = 1 port**
**backlog:** B052 (พี่เปาขอ) — ดู `docs/backlog.md`

## โจทย์
กล่องค้นหาตอนนี้ค้นจาก**ชื่อเพลง**อย่างเดียว → ขยายให้ค้นจาก**เนื้อร้อง**ด้วย + **fuzzy** (พิมพ์ผิด/ไม่ครบก็เจอ)
เหตุ: พี่เปาจำชื่อเพลงไม่ได้ แต่จำเนื้อบางท่อนได้

## ขอบเขต (รอบนี้ = logic ล้วน)
- `src/lib/songSearch.js` — ขยาย index ให้รวม **เนื้อร้อง** (v2: รวม `arrangement[].syllables` เป็นข้อความค้นได้ · v1: จาก lines lyric) + เพิ่ม fuzzy match (เช่น ระยะ Levenshtein / normalize ภาษาไทย)
- เพิ่ม unit test: ค้นด้วยท่อนเนื้อ → เจอเพลงถูก · พิมพ์ผิด 1-2 ตัว → ยังเจอ · perf โอเคที่ 120 เพลง
- ⛔ **ห้ามแตะ** notation/lint/NoteRow/Guide (สายอื่น) · **กล่องค้นหา UI (SongList/เมนู "เพลง ▾") = งานต่อ** (กันชน mobile pass ที่อาจแตะ SongList) — รอบนี้ทำ lib + test ให้พร้อมก่อน

## Verify
- `npx vitest run --exclude '**/.claude/**'` เขียว + `npm run build` ผ่าน
- (ถ้าต่อ UI ในรอบนี้: เปิด `--host` ใส่ Network URL · ลองค้นด้วยเนื้อจริง)

## รายงานกลับ (session-agnostic)
`docs/reports/wt-b052.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy · **อิสระเต็มตัว ไม่ชนใคร merge ได้เลยเมื่อเสร็จ**
