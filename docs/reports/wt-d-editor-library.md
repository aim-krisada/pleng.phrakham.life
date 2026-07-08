# รายงาน — wt-d-editor-library (WT-D ทำเพลง→คลัง)

**รอบ:** 1 — US-D01 (ทำ/แก้เพลง บันทึกร่างในระบบ)
**สถานะ:** เสร็จ · พร้อมให้ SA review + merge

## ทำอะไรไปบ้าง (ต่อ US)
- **US-D01: ✅**
  - AC1 โหมดแก้ (`EditorMode`) ทำเพลง/แก้ได้ — ✅ มีอยู่แล้ว (ยกมาจาก WT-0) · ไม่แตะ internals
  - AC2 บันทึกร่าง (draft) ลงระบบ ผ่าน `save('draft')` ตาม contract — ✅ มีอยู่แล้ว + **จัดโครงตาม DS-D01**: ย้ายตัว "เขียน draft ลง Supabase" ออกมาเป็น **store action เดียว** (`saveDraftRow`) แทนที่จะฝังใน component → คุม 1 ที่ + ทดสอบง่าย. contract เดิม (`emit('save','draft')`) คงไว้ครบ
  - AC3 เปิดร่างเดิมมาทำต่อได้ — ✅ ผ่าน `loadDraft()` + พาเนล "งานร่าง / รอตรวจ" (เมนู จัดการ) · โหลดเนื้อ/คีย์/ชื่อกลับเข้ามาแก้ต่อ ตั้ง `currentDraftId`/`editingId` ให้บันทึกทับร่างเดิม

> พฤติกรรมส่วนใหญ่มีอยู่แล้วจากฐาน WT-0 — งานรอบนี้คือ **จัดโครงให้ตรง DS-D01 (store owns the write) + เขียน unit test ตาม AC** เพื่อยืนยันว่าครบจริง

## ไฟล์ที่แก้ (เฉพาะไฟล์ที่ WT-D เป็นเจ้าของ)
- `src/store.js` — เพิ่ม action `saveDraftRow(row, existingId)` (insert เมื่อร่างใหม่ / update เมื่อร่างเดิม · คืน `{id, error}`)
- `src/components/EditorMode.vue` — `saveDraft()` เรียก `saveDraftRow` แทน insert/update ตรงๆ (ลดโค้ดซ้ำ · พฤติกรรมเท่าเดิม) · เพิ่ม `defineExpose` (`saveDraft`/`loadDraft`/`meta`/`editingId`/`currentDraftId`/`previewContent`) ให้ unit test เข้าถึง AC ได้โดยไม่ต้องไล่ผ่าน chrome ที่ teleport
- `src/store.draft.test.js` — **ใหม่** · unit ของ store action
- `src/components/EditorMode.draft.test.js` — **ใหม่** · unit ระดับ component (save draft + reopen)

*ไม่แตะ `Studio.vue` · ไม่แตะ `songModel.js` (สงวนไว้รอบ US-D04 หมวด+เลข)*

## ผลทดสอบ
- **unit: ผ่าน 16/16** (เดิม 12 + ใหม่ 4) · `npm test`
  - `store.saveDraftRow`: ร่างใหม่ → insert row `status:'draft'` + คืน id ใหม่ · ร่างเดิม → update ที่ id เดิม ไม่ insert ซ้ำ (ตรงเกณฑ์ DS-D01 "save draft → มี row สถานะ draft")
  - `EditorMode`: `save('draft')` ยิง event ตาม contract + ตั้ง `currentDraftId` จาก id ที่ store คืน · `loadDraft()` โหลดร่างเดิม (ชื่อ/คีย์/song_id/draft_id) กลับมาแก้ต่อ
- **build: ผ่าน** · `npm run build` (104 modules ✓)
- **วิธี tester ลอง (port 5305, บัญชี editor):**
  1. เข้าโหมดแก้ → พิมพ์ชื่อเพลง + ทำนอง
  2. Dock → **บันทึกร่าง** → ขึ้น "💾 บันทึกร่างแล้ว (ยังไม่เผยแพร่)"
  3. เมนู **จัดการ → งานร่าง / รอตรวจ** → เห็นร่างใน "📝 งานร่างของฉัน" → คลิกเปิด → เนื้อกลับมาแก้ต่อ
  4. แก้เพิ่มแล้วบันทึกร่างซ้ำ → ทับร่างเดิม (ไม่เกิดร่างซ้ำ)

## ข้อสังเกต / คำถามถึง SA
- DS-D01 ระบุ "ไฟล์ที่แตะ: store.js (action บันทึกร่าง)" → ทำตามด้วยการแยก `saveDraftRow` เป็น store action. ถ้า SA อยากให้ `saveDirect`/`approve`/`reject` ใช้ pattern store-action เดียวกันด้วย บอกได้ — รอบนี้จำกัดขอบเขตแค่ draft ตาม US-D01 (พฤติกรรมของ publish/approve คงเดิมทั้งหมด)
- US-D02/D03/D04 ยังไม่ทำ (จะทำต่อในสาขาเดียวกันรอบถัดไป)

## พร้อม merge ไหม
**ใช่** — AC ครบ · unit 16/16 · build ผ่าน · ไม่ชนไฟล์ worktree อื่น (แตะ store.js ซึ่ง WT-D เป็น epic เดียวที่แตะ workflow บน store)

## URL ตรวจงาน
http://localhost:5305
