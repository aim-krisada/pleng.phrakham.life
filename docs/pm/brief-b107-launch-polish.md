# Brief — B107 LAUNCH polish + bugfix (dev · ก่อน deploy)

**branch เดิม `b107-step9-instruments`** (ต่อจาก 3 โหมดที่ tester PASS) · **อย่า merge/deploy** · P'Aim เจอตอน confirm UI 13 ก.ค.

## 🔴 1. BUG (สำคัญสุด · blocking): เปลี่ยน option ตอนเล่น = เสียงซ้อน 2 ชั้น
**อาการ (P'Aim):** กำลังเล่นอยู่ → เปลี่ยน option ใน popover (เช่น อารมณ์ บรรเลง→สงบ · หรือเครื่อง/การบรรเลง) → **ไปเริ่ม playback ใหม่ทับ โดยไม่หยุดอันเก่า → ได้ยิน 2 เพลงซ้อนกัน**
**Root คาด:** เปลี่ยน option → reschedule playback ใหม่ แต่ไม่ cancel/stop oscillator+sampler voices ของ pass เดิมก่อน (B105 สลับโหมด real-time เคยจัดการ mode แต่ style/instrument switch อาจไม่ได้ stop)
**แก้:** เปลี่ยน sound option ใดๆ กลางเล่น → **หยุด/ยกเลิก playback ปัจจุบันให้หมด (ทุก scheduled voice)** ก่อน เริ่ม pass ใหม่ · เหลือเสียงเดียวเสมอ (เล่นต่อจากตำแหน่ง playhead เดิม)
**verify:** invariant/integration test — เปลี่ยน option ×N กลางเล่น → active voice count ไม่สะสม (ไม่มี overlap) · วัด LIVE: ไม่มี 2 ทำนองซ้อน · ลองจริงทุกกลุ่ม (เสียงที่เล่น/การบรรเลง/เครื่อง/สไตล์)

## 2. Default หน้าดู/ฝึกร้อง → "เปียโนเดี่ยว" (P'Aim เลือกจากภาพ)
เสียงที่เล่น=**รวม** · การบรรเลง=**เดี่ยว** · เครื่องดนตรี=**เปียโน** · อารมณ์/สไตล์=**บรรเลง** (เดิม default รวมวงเปียโนนำ → เปลี่ยนเป็นนี้) · หน้าแก้เพลง default plainest คงเดิม · จำ localStorage เหมือนเดิม

## 3. แถบ dock ล่าง — icon-only + กระชับ + สมมาตร
- **สไลเดอร์ (progress) แคบเข้า** → แถวบน (transport) ไม่ล้นจอ
- **เครื่องดนตรี + ท่อน = icon อย่างเดียว ไม่มี label** · จัด layout ให้สมมาตร/สมดุล
- **icon (Lucide · P'Aim เคาะ/PM เลือก):**
  - เปียโน = `piano` · กีตาร์ = `guitar` · รวมวง(เต็มวง) = `users`
  - felt/violin/cello (disabled "เร็วๆนี้") = `music` ทั่วไป (จาง · ยังไม่มี icon เฉพาะใน Lucide)
  - **ท่อน = `table-of-contents`** (PM แนะ · § obscure สำหรับผู้ใช้ทั่วไป) — **P'Aim อาจเปลี่ยนเป็น `section`(§) ได้** · **คง badge สถานะ ทั้งหมด/n·N ไว้** (ต้องรู้ว่าวนท่อนเดียวไหม)
- chip ที่ pin บนแถบ = โชว์ icon ตรงกับเครื่อง/โหมดที่เลือกอยู่

## verify + report
self-verify Browser MCP: บั๊กซ้อนหาย (เปลี่ยน option ไม่ซ้อน) + default ถูก + icon-only โผล่ทุกที่ + ไม่ล้น + สมมาตร · ทุก viewport (375/700/desktop) · vitest เขียว + build · **ping PM** → tester re-gate (บั๊กซ้อน + UI polish) → P'Aim final → deploy · report `docs/reports/b107-step9-instruments.md` + board §inbox
