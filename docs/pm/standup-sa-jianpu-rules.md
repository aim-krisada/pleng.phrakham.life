# Standup — sa-jianpu-rules

สายงาน: sa-jianpu-rules · สถานะล่าสุด: **ออกแบบเสร็จ (design-ready) · approved · รอ build ps4 · ยังไม่ dev**
อัปเดตล่าสุด: 2026-07-08 โดย session รอบที่ 1

## 1. คุณคือใคร
SA สาย **"กฎทำเพลง" (jianpu rules)** — กฎตรวจโน้ต (lint) + ความสามารถของโน้ต (notation) · ขอบเขต = algorithm/ระบบโน้ตเท่านั้น · UI/editor/shell = ของ ps3sa

## 2. ตอนนี้ทำอะไรอยู่
เสร็จ 2 งาน (design-ready + P'Aim approved) · **ยังไม่ dev** (P'Aim สั่งให้หยุดที่ design ก่อน) · รอบนี้ = ตอบ PM audit + เขียน standup

## 3. ถึงไหนแล้ว / เหลืออะไร
- **B026 กฎ lint (7 กฎ)** — US/DS เสร็จ · **spike R1-R3 อยู่บน main** (natural-no-effect · beats · unreadable) · เหลือ **R4-R7 + ต่อเข้า editor = ทำตอน ps4**
- **B027 โน้ตจุดคู่ `5..` (×1.75)** — US/DS เสร็จ · เหลือ **build ทั้งหมด = ps4** (แตะ notation/midi/NoteRow/Guide)

## 4. ไฟล์รายละเอียดอยู่ไหน
- สเปก: `docs/us|ds/ps3-editor-rules.md` · `docs/us|ds/ps3-double-dot.md`
- ประสานสาย: `docs/sa-jianpu-rules.md` (แบ่งงาน + handshake)
- โค้ด spike: `src/lib/notationLint.js` + `src/lib/notationLint.test.mjs` — **อยู่บน `main`** (ยังไม่อยู่ในฐาน)
- backlog: แถว **B026 · B027**

## 5. คุณเป็นเจ้าของไฟล์ไหน
ไฟล์ข้อ 4 ทั้งหมด + `docs/pm/standup-sa-jianpu-rules.md` (ไฟล์นี้) · branch = `studio-shell-redesign` · **ยังไม่มี port** (ยังไม่ dev)

## 6. ติด / รออะไรอยู่
- **รอ P'Aim สั่ง dev** — ตอนนี้ freeze ที่ design ตามคำสั่ง "ยังไม่ dev" · ไม่มี blocker เชิงเทคนิค

## 7. จุดต่อกับคนอื่น
- **handshake กับ ps3sa ยืนยันแล้ว** — ขอบเขตไม่ทับ (บันทึกใน `sa-jianpu-rules.md`)
- **ps4 build:** B027 (จุดคู่) จะแตะโค้ด shared `notation.js`·`midi.js`·`NoteRow.vue`·`Guide.vue` → ทับงาน editor ของ ps3sa ได้ · ต้องนัดลำดับ/แยก worktree ตอนลงมือ build (เฟส design ตอนนี้ยังไม่ชน)

---

## ⚠️ จุดที่เอกสารไม่ตรงกับของจริง (audit 2026-07-08)
ตรวจของจริงเทียบเอกสารแล้ว — **ตรงทุกข้อ:**
- ✅ US/DS มีจริง (5 ไฟล์) · backlog B026/B027 มีจริง
- ✅ spike มี **R1-R3 จริง** (grep เจอ 3 code: natural-no-effect/beats/unreadable · ไม่มี R4-R7 = ตรงตามแผน)
- ✅ **เทสต์รันจริง = 21 passed, 0 failed** (ตรงกับที่เอกสารเคลม "เทสต์ 21 ผ่าน")
- ✅ traceability ครบ: B026/B027 → US(SI.2) → DS(SI.3) → code spike(SI.4 · R1-R3)

**ข้อควรรู้ (config-management · ไม่ใช่เอกสารผิด แต่ PM ควรทราบ):**
- `notationLint.js` + เทสต์ อยู่ **บน `main` เท่านั้น** · ฐาน `studio-shell-redesign` (ที่ ps4 จะ build) **ยังไม่มีไฟล์นี้** (base ตามหลัง main 7 commit ที่รวม lint spike + production hotfixes อื่น)
- → ตอน ps4 ต้อง**เอา notationLint เข้าฐานก่อน** (merge `main`→base หรือ cherry-pick) ไม่งั้น editor build จะไม่เจอไฟล์
- เอกสารเขียน "spike บน main" **ถูกต้อง** — แค่คนละ branch กับที่จะ build เท่านั้น
