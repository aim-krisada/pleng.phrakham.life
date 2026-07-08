# US-01 — surface เดียว 3 มุมมอง (ดู / แผ่น / แก้)

**Worktree:** WT-0 · **Branch:** `wt0-foundation` · **คู่ DS:** `ds/wt0-foundation/DS-01-single-song-surface.md`
**สถานะ:** spec (รอ dev)
**โยง mission:** ผู้ใช้ทุกกลุ่มใช้ surface เดียว · Google-Docs-clean

## Story
ในฐานะ **ผู้ใช้คนใดก็ได้** ฉันต้องการเปิดเพลงแล้วสลับ **ดู (คาราโอเกะ) / แผ่นเพลง / แก้ไข** ได้ในที่เดียว เพื่อไม่ต้องเรียนรู้หลายหน้า

## Acceptance Criteria
- [ ] เปิด `/song/:id` เข้า Studio, ค่าเริ่มต้น = โหมดดู/แผ่น *(มีแล้ว — ยืนยัน)*
- [ ] `Studio.vue` แค่เลือกโหมด + mount component; โค้ดแต่ละโหมดอยู่คนละไฟล์ (`SongViewer` / `SongSheet` / `EditorMode`)
- [ ] สลับโหมดแล้วเพลงที่กำลังทำ **ไม่หาย** (state คงอยู่)

## นอกขอบเขต
- ลูกเล่นภายในแต่ละโหมด (เป็นของ WT-A/B/C/D)
