# BRIEF (Dev) — ป้ายสถานะ "ตรวจแล้ว/ยังไม่ตรวจ" ในรายการเพลง (สำหรับทีม review)

**สาย:** Dev · **จ่ายโดย:** pm22 · 13 ก.ค. · **ฐาน:** `studio-shell-redesign` (ปัจจุบัน · มี parity+header merge แล้ว)

## Objective (คำ P'Aim)
หลังล็อกอิน อยากให้**พี่เปา/ทีม เห็นง่ายๆ ว่าเพลงไหนตรวจผ่านแล้ว (verified) หรือยัง** — เพื่อ review 122 เพลงได้สะดวก (ตรง GATE: ปลดล็อกให้ public เห็นเพลง)

## requirement
- ในหน้า **รายการเพลง (SongList)** แสดง **ป้ายสถานะต่อเพลง**: **✓ ตรวจแล้ว** (verified=true) vs **ยังไม่ตรวจ** (verified=false) — ชัด อ่านง่าย ใช้โทเคนสีเดิม (เขียว/เทา หรือ brand — เลือกที่ contrast ผ่าน + ไม่ขัด warm theme)
- **แสดงเฉพาะตอนล็อกอินทีม** (public ไม่เห็นป้าย · public เห็นแต่เพลง verified อยู่แล้ว) — เช็ก auth/isTeam จาก store เดิม
- **นับ progress** (เช่น "ตรวจแล้ว X / ทั้งหมด Y" หรือกรอง "ยังไม่ตรวจ") ถ้าทำได้ไม่ยาก — ช่วยพี่เปาเห็นภาพรวม (optional แต่มีประโยชน์)

## routing (ตรวจก่อน)
- `src/views/SongList.vue` (แสดงป้าย) · verified field มาจาก `songs` (store/supabase — field มีอยู่แล้ว ใช้กั้น public) · auth/isTeam จาก store เดิม (`EditorMode.markVerified` เป็นตัว set)
- **refine เพิ่มป้าย ไม่รื้อ list logic** · ไม่แตะ gate/RLS · ไม่แตะ header/dock/แผ่นเพลง

## setup + verify
- worktree branch ใหม่จากฐาน **studio-shell-redesign** · **verify fork base เอง** `git merge-base --is-ancestor studio-shell-redesign HEAD`
- **Supabase env + ล็อกอิน team** (public เห็น 0/verified เท่านั้น) → เห็นเพลงครบ + ป้ายถูกต้อง · ล็อกอินไม่ได้ → ping PM · dev server **`--host`** + Network URL
- verify: (1) ล็อกอิน = เห็นป้าย ✓/ยัง ตรงกับ verified จริง (2) **ไม่ล็อกอิน = ไม่เห็นป้าย** + เห็นแต่ verified (3) count ถูก (4) มือถือ 360/412 ป้ายไม่ทำ layout พัง · screenshot ทั้ง 2 สถานะ

## รายงานกลับ (session-agnostic)
`docs/reports/review-status-badge.md` + screenshot (team/public) + Network URL · §📥 inbox `docs/pm/board.md` + ping "PM ปัจจุบัน" (board §🎯 — อย่า hardcode ชื่อสาย) · **ไม่ merge/deploy**
