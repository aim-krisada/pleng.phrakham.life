# Brief — SA (session ใหม่): เต็มวง Option 1 (ตัด pad + call-response + countermelody)

**สาย:** SA (audio design · creative · P'Aim↔SA ตรง) · **branch เดิม `b107-p2-design`** (design docs + เดโม · **ไม่ merge base · ไม่ deploy · ไม่แตะ prod src**)
**อ่านก่อน:** `docs/reports/b107-p2-sa-handoff.md` (state/ไฟล์/infra/บทเรียนครบ · ต่อได้ทันที) · spec `docs/ds/instrument-arranger-p2.md` §6b.2

## บริบท
เต็มวงยัง "จืด + เหมือนออร์แกน" — ต้นเหตุ = ไวโอลิน solo sample เอามาลากยาวเป็น pad. **P'Aim เคาะ Option 1** (ตัด pad + ใส่ระบบสอดรับ) เป็นแนวทางหลัก. เปียโนเดี่ยว/กีตาร์เดี่ยว = ล็อกแล้ว (ไม่แตะ) · งานนี้ = **เต็มวง (ensemble) mode เท่านั้น**.

## 🎯 กฎ 3 ข้อ (P'Aim สั่ง 13 ก.ค.)

**1. ตัดไลน์สายค้าง (Remove String Pad):** ตัดฟังก์ชันไวโอลินสีลากยาวเป็นแผ่นคอร์ดพื้นหลัง (pad) ออกทั้งหมด = กำจัดต้นเหตุเสียงออร์แกนแข็งทื่อ

**2. ระบบสอดรับ Call-and-Response (time-based prominence):** ไวโอลินเปลี่ยนจาก pad → "ตัวสอดรับ"
- **The Call (ท่อนส่ง):** เปียโนเป็นพระเอก เล่นทำนองหลัก + arpeggio นำ · **ไวโอลินเงียบ** เปิดพื้นที่หายใจ
- **The Response (ท่อนรับ):** เปียโนจบวรรค → เกิด **"ช่องว่าง (Gap)"** ก่อนขึ้นประโยคใหม่ → ไวโอลิน **สีลูกเล่นสวน (fill-in)** เติมช่องว่างนั้น = นักดนตรี 2 คนโต้ตอบกัน

**3. Countermelody ท่อนฮุก (Chorus):** เข้า chorus อารมณ์เอ่อ → ไวโอลินเล่น **ไลน์ประสานสอดรับ (countermelody)** ขนานกับทำนองเปียโน
- **เทคนิค:** โน้ตไวโอลิน **สลับจังหวะ + หลบย่านเสียง (ไม่ frequency-clash)** กับเปียโน → มิติ duo/trio อบอุ่นแน่น แทน pad ลากยาว

## deliverable (SA)
- ทำ **เดโมเต็มวงตัวใหม่** (`docs/spikes/ensemble-real-demo.html` หรือใหม่) รันตามกฎ 3 ข้อ → **P'Aim ฟัง+เคาะรสชาติ** (server `--host` · IP ล่าสุด `10.152.249.98` · เช็ก vite Network line)
- P'Aim ลงตัว → **ล็อกสูตรเต็มวงสุดท้ายใน spec §6b.2** (pad ออก · call-response · countermelody · ค่าที่จูน) → **ping PM** → PM จ่าย dev อัปสูตรเต็มวง (b107-step9-instruments · pad ออก = simpler)
- เปียโน/กีตาร์เดี่ยว = ไม่แตะ (ล็อกแล้ว)

## รายงาน (session-agnostic)
อัป `docs/reports/b107-p2-design.md` + `b107-p2-sa-handoff.md` (ให้ session ถัดไปต่อได้) + board §📥 inbox + ping "PM ปัจจุบัน" (pm21) พร้อม Network URL เดโม
