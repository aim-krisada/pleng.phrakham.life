# brief — B058 (ด่วน) ค้นหาด้วยโน้ต v2

**สาย:** dev · worktree ใหม่จากฐาน `studio-shell-redesign` · 1 worktree = 1 branch = 1 port
**ที่มา:** P'Aim 9 ก.ค. ("อยากให้ search note ได้ด้วย · มีเลขอะไรเรียงกันก็หาได้")

## ปัญหา
กล่องค้นหาโฆษณาว่าค้นโน้ตได้ (placeholder "โน้ตตัวเลข เช่น 5 5 6 1") แต่ `notesText()` ใน `src/lib/songSearch.js` **อ่านแค่ v1** (`content.lines`) · **120 เพลงที่ import เป็น v2** (โน้ตอยู่ใน `content.stanzas[].lines[].segments[].note`) → ค้นโน้ตกับเพลงใหม่ไม่ได้

## โจทย์
ขยาย `notesText(content)` ให้อ่านโน้ต **v2** ด้วย (เดินใน `stanzas[].lines[].segments[].note` เก็บเลขโน้ต · strip สัญลักษณ์เหมือน v1 · เหมือน `lyricsText` ที่ทำ v2 แล้ว) → พิมพ์ "5 5 6 1" เจอเพลง v2 ที่มีโน้ตเรียงนั้น

## ขอบเขต (กันชน)
- **แตะแค่ `src/lib/songSearch.js`** (+ test) · ⛔ ห้ามแตะ SongList.vue / EditorMode.vue (สาย catalog/review ทำ)

## Verify
- unit test: เพลง v2 (มี stanzas) → notesText คืนสตริงโน้ต · ค้น "5 5 6 1" เจอ · v1 ยังทำงาน
- `vitest --exclude '**/.claude/**'` เขียว + build ผ่าน

## รายงานกลับ (session-agnostic)
`docs/reports/wt-b058.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy · เช็ก branch ก่อน commit · **อิสระ merge ได้เลย**
