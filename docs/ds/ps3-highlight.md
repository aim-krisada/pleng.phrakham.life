# DS — ps3 Epic 4: ไฮไลต์รายโน้ต/พยางค์ (B006)

US: `docs/us/ps3-highlight.md` · แผน step 3 ใน `docs/song-model-v2.md`

## ไฟล์
- `src/lib/midi.js` — `songToNotes`/`onNote` ส่ง **global syllable index** ต่อโน้ตที่เล่น (attack order 1:1 กับ `syllableSlots` — de-risked แล้ว)
- `src/components/SongSheet.vue` (+`NoteRow.vue`) — render **per-syllable span** ที่ address ด้วย index → ใส่คลาส highlight ทีละอัน
- ⚠️ ไฟล์ render กลาง (ร่วม viewer/print/editor) → ทำใน worktree แยก คุมการชน

## โครง
- attack-note order จาก `songToNotes` เรียง 1:1 กับ `syllableSlots(stanza)` → ต้องการแค่ (1) global index บนโน้ตที่เล่น (2) per-syllable span ใน SongSheet
- v1 fallback = segment-level (v1 segment เก็บ lyric string เดียว address รายพยางค์ไม่ได้) — ตรวจ version แล้วเลือก path
- ทำ **ก่อน** batch-key เพลง YS 2014 (เลี่ยง re-key)

## ยึด
- ผูก v2 · อย่าแตะจังหวะแยก · ทดสอบด้วยหู (report: heard-bugs prove by ear)
