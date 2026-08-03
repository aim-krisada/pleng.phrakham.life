# Brief — B102 (SA design): ท่อนสร้อยโชว์ครั้งเดียวถูก แต่ "ฝึกร้อง" ไม่ร้องซ้ำ

**ฐาน:** `studio-shell-redesign` · **worktree/branch ใหม่:** `b102-sa-chorus-repeat` (SA design เท่านั้น — ไม่แก้ src)
**สั่งโดย:** PM (pm11) · ที่มา: P'Aim 12 ก.ค. · **บทบาท = SA (วิเคราะห์+ออกแบบ) ไม่ใช่ dev**

## อาการ (P'Aim)
- **แผ่นเพลง (music sheet) แสดงถูกต้อง** — ท่อนสร้อย (chorus/refrain) โชว์ **ครั้งเดียว** (deduped · ถูกสำหรับการอ่าน)
- **แต่เวลา "ฝึกร้อง" (practice singing / playback timeline)** ท่อนสร้อยที่โชว์ครั้งเดียวนั้น **ร้องซ้ำไม่ถูก** — ควรร้องซ้ำตามจำนวนจริงในเพลง แต่ไม่ซ้ำ

## เป้าหมายของงาน SA นี้
- **วิเคราะห์** โมเดล arrangement/repeat + ระบบ sing-timeline (ฝึกร้อง) ว่าทำไมท่อนสร้อยที่ dedup ไว้ตอนแสดงผล ถึงร้องซ้ำไม่ครบตอนฝึกร้อง
- **ออกแบบ** ให้ **แผ่นเพลงยังโชว์ครั้งเดียว (คงเดิม)** แต่ **การฝึกร้อง/เล่น ต้องร้องซ้ำท่อนสร้อยตามจำนวนจริง** — แยก "การแสดงผล (deduped)" ออกจาก "ลำดับการเล่นจริง (expanded)"
- ระบุจุดแก้ในระดับ concept + ไฟล์ที่เกี่ยว (pointer: sing/ฝึกร้อง timeline · arrangement model · เกี่ยว B067 refrain-dedup — ดู memory `pleng-render-data-gaps`) + คำถามที่ต้องให้ P'Aim เคาะ (ถ้ามี)

## Deliverable (SA)
- เขียน **design spec `docs/ds/sing-chorus-repeat.md`**: อาการ · root cause (วิเคราะห์จริงจากโค้ด/ข้อมูล) · แนวทางแก้ที่ KISS (แสดงผล dedup ↔ playback expand) · ผลกระทบ/ไฟล์ · AC ที่ dev จะ implement ได้ · คำถามค้าง
- **ไม่แก้ src · ไม่ deploy** — ส่ง design กลับ PM แล้ว PM จ่าย dev ต่อ (+ tester)

## รายงาน (session-agnostic)
- report/spec ลง branch ตัวเอง (`docs/ds/sing-chorus-repeat.md` + `docs/reports/b102-sa-chorus-repeat.md`) · เพิ่มบรรทัด `board.md` §📥 inbox · ping **PM ปัจจุบัน §🎯 (pm11)** · **ไม่ commit ลง base**
- ถ้าเจอว่าเป็นบั๊กเล็ก fix จุดเดียว = ระบุใน spec ให้ PM จ่าย dev ตรงได้เลย
