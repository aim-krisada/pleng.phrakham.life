# DS-I5 — ต่อ JSON ในโหมดแก้

**คู่กับ:** `us/wt0-integration/US-I5-editor-json-wiring.md`

## ไฟล์ที่แตะ
- `src/components/EditorMode.vue`

## จุดเสี่ยงชน (สำคัญ)
- `EditorMode.vue` = **ไฟล์ของ WT-D** → **ต้องทำหลัง WT-D merge** ไม่งั้นชน · เป็นเหตุผลที่ US-I5 แยกจาก I1–I4

## design
- `manageUpload`: `const r = await importSong(file); if(!r.ok){ แจ้ง r.error } else { applyRow(r.song) }`
- `downloadJson`: ใช้ `songBasename(song)+'.json'` จาก `lib/songName.js`
- B003: ลบรายการ "เลือกเพลงเพื่อแก้…" จากเมนู "เพลง"

## test
- **unit:** upload ไฟล์เสีย → error ภาษาคน · downloadJson ชื่อไฟล์ตาม format · เมนูเพลงไม่มี "เลือกเพลงเพื่อแก้…"
- **tester:** port 5301 โหมดแก้ อัปโหลดไฟล์มั่ว → เห็นสาเหตุ · ดาวน์โหลดได้ชื่อถูก
