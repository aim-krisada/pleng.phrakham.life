# DS-D01 — บันทึกร่างในระบบ

**คู่กับ:** `us/wt-d-editor-library/US-D01-save-draft.md`

## ไฟล์ที่แตะ
- `src/components/EditorMode.vue` (จาก WT-0) · `src/store.js` (action บันทึกร่าง)

## จุดเสี่ยงชนกับ worktree อื่น
- `store.js` เป็นของ WT-0 ด้วย → **WT-D ทำหลัง WT-0 merge** และเป็น epic เดียวที่ต่อ workflow บน store (A/B/C ไม่แตะ store)

## design
- `EditorMode` emit `save('draft')` → store action บันทึก draft (Supabase) ตาม contract WT-0

## test
- **unit:** save draft → มี row สถานะ draft
- **tester:** port 5305 (บัญชี editor) บันทึกร่าง → เปิดกลับมาได้
