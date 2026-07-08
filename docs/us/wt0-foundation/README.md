# WT-0 ฐาน (foundation) — user stories

**Branch:** `wt0-foundation` (จาก `studio-shell-redesign`) · **Port:** 5301 · **DS:** `docs/ds/wt0-foundation/`

**ภาพรวม:** shell ส่วนใหญ่ build แล้วบน `studio-shell-redesign` — งานจริง = แกะ `EditorMode` ออกเป็นไฟล์ · รวม gating เป็นจุดเดียว · เขียน contract ให้ชัด (ไม่รื้อของเดิม)

**สำคัญ (กันเข้าใจผิด):** ทั้ง 4 US แตะ `Studio.vue`/`store.js` ร่วมกัน → **dev คนเดียวสร้างทั้ง 4 ใน worktree เดียว**. ที่แยกไฟล์ US ไว้ = เพื่อ **track / ปิด sprint ทีละใบ** ไม่ใช่แยก worktree (1 story ≠ 1 worktree ในกรณีนี้)

## user stories (1 story = 1 ไฟล์)
- `US-01-single-song-surface.md` — surface เดียว 3 มุมมอง
- `US-02-store-permission.md` — สิทธิ์อยู่ที่ "การเก็บ"
- `US-03-invite-only-auth.md` — เข้าระบบแบบเชิญเท่านั้น
- `US-04-mode-contract.md` — สัญญาจุดต่อ (contract) = "กำแพง+ประตู" ทำให้ครบ A/B/C/D ถึงขนานได้

**US-01..04 = เสร็จ + merge แล้ว** (`9a60886`, 2026-07-08). follow-up จาก review (branch `wt0-followups` · port 5301):
- `US-05-open-song-shell.md` — เปิด/เลือกเพลงได้ทุกโหมด (review #3)
- `US-06-sheet-print-button.md` — ปุ่มพิมพ์ในโหมดแผ่น (review #4)
