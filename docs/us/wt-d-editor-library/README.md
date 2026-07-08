# WT-D ทำเพลง→คลัง — user stories

**Branch:** `wt-d-editor-library` (จาก `studio-shell-redesign`) · **Port:** 5305 · **DS:** `docs/ds/wt-d-editor-library/`
**ขึ้นกับ:** WT-0 merge ก่อน (โดยเฉพาะ `EditorMode` ที่ WT-0 แกะออกมา — WT-D รับช่วงเป็นเจ้าของต่อ)

**ภาพรวม:** งานของ "คนทำเพลงของ คจ." — ทำ/แก้เพลงแล้วเก็บเข้าระบบอย่างเป็นระบบ. workflow ร่าง→ส่งตรวจ→อนุมัติ build ไว้แล้ว. งานเพิ่มใหม่ = หมวด+เลขในหมวด (per-category number — เป็น data-model change)

> **หมายเหตุ collision:** WT-D แตะ `store.js` (ร่วมกับ WT-0) และ `songModel.js` (ร่วมกับ WT-C ที่เรียกใช้) → WT-D ทำ **หลัง** WT-0 merge และเป็น epic เดียวที่แตะ store workflow (A/B/C ไม่แตะ) จึงยังปลอดภัย

## US
- `US-D01-save-draft.md` — ทำ/แก้เพลง บันทึกร่างในระบบ
- `US-D02-submit-review.md` — ส่งเพลงให้ตรวจ
- `US-D03-approve-manage.md` — อนุมัติ/ตีกลับ/ลบ/ย้อน (ผู้อนุมัติ)
- `US-D04-category-number.md` — จัดเก็บเป็นระบบ: หมวด + เลขในหมวด
