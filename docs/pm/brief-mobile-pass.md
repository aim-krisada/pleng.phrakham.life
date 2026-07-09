# brief — Mobile/Tablet pass (หลัง desktop นิ่ง)

**ทำบนไหน:** Claude Code **Android app** (Fold6) — พี่เอมทดสอบบนจอมือถือจริง + ถ่ายภาพส่งได้ในตัว (นี่คือเหตุผลที่แยกงานนี้มาทำบนมือถือ)
**สาย:** เป็น *สายทำงาน (dev/QA)* รายงานเข้า **PM เดียว** (board) — ไม่ใช่ PM ตัวที่ 2
**ฐาน:** `studio-shell-redesign` (มี a=B043 sing / b,c=editor / dock ครบแล้ว · 146/146)

## เป้าหมาย
desktop นิ่งแล้ว → ปรับให้ **tablet (จอหลัก · คนใช้ส่วนใหญ่)** และ **phone** ใช้ดี · **tablet มาก่อน phone**

## กติกา worktree (กันชน)
- **1 งาน = 1 worktree = 1 branch = 1 port** · แตกจาก `studio-shell-redesign`
  ```sh
  git worktree add ../pleng-mobile -b wt-mobile studio-shell-redesign
  npm run dev -- --host --port 5340
  ```
- เปิด `--host` เสมอ · ใส่ Network URL (`http://<IP>:5340`) — แต่บน Android เทสต์ในเครื่องเลยได้
- **ห้ามแตะไฟล์ที่สายอื่นกำลังทำ** — ถาม PM ก่อนถ้าจะเริ่มตอน B043 เฟส 2 รันอยู่ (แตะ SongSheet/SongViewer)

## วิธีทำ (KISS — สำรวจก่อน แล้วแก้ทีละจุด)
**รอบ 1 = triage (อย่าเพิ่งแก้):** เปิดทุกหน้าบน tablet + phone → ถ่ายภาพจุดที่เพี้ยน/อึดอัด → ทำ list สั้นๆ (หน้าไหน · อาการ · จอขนาดไหน) ส่ง PM ก่อน → PM + P'Aim จัดลำดับ แล้วค่อยแก้
**รอบ 2+ = แก้ทีละจุดตาม list** · แก้แล้วถ่ายภาพ before/after

## จุดที่ต้องเช็คเป็นพิเศษ (mobile-sensitive)
- **ฝึกร้อง (B043):** dock/transport บนจอเล็กล้นไหม · **auto-scroll ไล่ตามพยางค์** (ฟีเจอร์หัวใจ tablet — desktop พิสูจน์ไม่ได้ · ต้องเทสต์เครื่องจริงว่าจอเลื่อนตรงพยางค์ที่ร้อง) · ปุ่ม Aa (ฟอนต์) บน top nav · แตะปุ่มโดนไหม (นิ้วโป้ง)
- **แก้ไข:** แป้นโน้ตตัวเลข + กล่องพยางค์บนจอแคบ · แถวจัดลำดับ (dropdown/▲▼/✎) · พาเนล "พิมพ์เนื้อทั้งข้อ" · คีย์บอร์ดมือถือเด้งบังไหม
- **dock (ร่วม):** ลาก/ยุบ-กาง ด้วยนิ้ว (touch drag) · popup ไม่หลุดขอบ (มี viewport-clamp แล้ว — ยืนยันบนจอจริง) · fit-content ไม่ล้น
- **แผ่นเพลง / อ่าน:** อ่านง่ายบน tablet · โน้ต+เนื้อไม่ตกขอบ
- **รายการเพลง / เมนูบน:** 2 แถวไอคอนล้วน (ตาม B009) ใช้ดีบนมือถือ

## DoD
- [ ] triage list ครบทุกหน้า (tablet + phone) พร้อมภาพ
- [ ] จุดที่แก้: before/after ภาพจริงบนเครื่อง · desktop ไม่ regress (unit เขียว + build)
- [ ] auto-scroll ตามพยางค์ ทดสอบบน tablet จริง = ผ่าน (นี่คือ gate รับ B043 ที่ค้างจาก desktop)

## รายงานกลับ (session-agnostic)
1. `docs/reports/wt-mobile.md` (triage list + fixes)
2. board.md §📥 inbox
3. ping PM ตาม board.md §🎯

**หมายเหตุ:** ถ้าจะ deploy ขึ้น production ก่อน mobile เสร็จ → tablet ส่วนใหญ่จะเจอของยังไม่ปรับ · PM แนะทำ triage + fix รอบแรกก่อน แล้วค่อย deploy (ดู deploy-plan.md)
