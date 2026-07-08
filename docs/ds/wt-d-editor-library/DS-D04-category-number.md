# DS-D04 — หมวด + เลขในหมวด (data-model change)

**คู่กับ:** `us/wt-d-editor-library/US-D04-category-number.md`

## ไฟล์ที่แตะ
- `src/lib/songModel.js` (เพิ่ม `categories`) · `src/store.js` · `src/views/SongList.vue` (เรียงตามเลข) · Properties panel (ใน `EditorMode`/Studio)

## จุดเสี่ยงชนกับ worktree อื่น
- **`songModel.js` เป็น model กลาง** — อ่าน `docs/song-model-v2.md` ก่อนแก้ · ต้อง round-trip ได้ · **กระทบ import/export ของ WT-C (`jsonIO`)** → ประสาน WT-C ให้ validate รองรับ `categories`
- ทำหลังสุดในลำดับ WT-D (เป็นการเปลี่ยน model)

## design
- `song.categories = [{name, number}]` (เพลงเดียวอยู่ได้หลายหมวด)
- Properties: เพิ่ม/ลบแถว หมวด+เลข · `SongList` sort ตามเลขในหมวดที่เลือก · เตือนถ้าเลขซ้ำในหมวดเดียวกัน

## test
- **unit:** เลขซ้ำในหมวด → เตือน · sort ตามเลขถูก · round-trip JSON (มี categories)
- **tester:** ตั้ง 2 หมวด (คนละเลข) → รายการเรียงถูกในแต่ละหมวด

## a11y
- ฟอร์มหมวด/เลข มี label ชัด
