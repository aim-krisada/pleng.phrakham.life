# US-I5 — ต่อ JSON ในโหมดแก้ (upload validate + downloadJson + ตัดเมนูซ้ำ)

**Worktree:** WT-0 integration · **Branch:** `wt0-integration` · **Port:** 5301 · **คู่ DS:** `ds/wt0-integration/DS-I5-editor-json-wiring.md`
**สถานะ:** spec · **พร้อมทำ — WT-D merged แล้ว (`EditorMode` ว่าง)** · **ที่มา:** report WT-C ข้อ 2ข + B003

## User Story
**ในฐานะ** คนทำเพลงในโหมดแก้
**ฉันต้องการ** เวลาอัปโหลด JSON ถ้าไฟล์เสียให้บอกสาเหตุภาษาคน · ดาวน์โหลด JSON ได้ชื่อไฟล์มาตรฐาน · ไม่มีเมนูเปิดเพลงซ้ำ
**เพื่อ** โหมดแก้ทำงานสอดคล้องกับส่วนอื่น ไม่งง

## Acceptance Criteria
- [ ] `manageUpload` เรียก `jsonIO.importSong(file)` → ถ้า `!ok` แสดง `error` (ภาษาคน, validate + v1→v2) แทน `JSON.parse` เดิม
- [ ] `EditorMode.downloadJson` ใช้ `songBasename` (US-I2) แทนตั้งชื่อเอง
- [ ] **B003:** ตัดเมนู "เลือกเพลงเพื่อแก้…" ออกจากเมนู "เพลง" ของ editor (shell มี "เปิดเพลง" ทุกโหมดแล้ว = ซ้ำ)

## นอกขอบเขต
- —
