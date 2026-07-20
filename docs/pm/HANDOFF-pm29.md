# HANDOFF — pm29 → pl pm ใหม่ (2026-07-20)

อ่านไฟล์นี้ + `docs/pm/pm.md` + `docs/pm/board.md` (▶ RESUME) แล้วทำต่อได้ทันที
**ตั้งชื่อตัวเอง `pm30`** แล้วอัป `board.md §🎯 PM session ปัจจุบัน`

---

## 1. LIVE / GIT (สำคัญสุด)
- **LIVE = รอบ 32 `047a7a7`** (`origin/main` · bundle `index-CYE2eUjR.js` · ยืนยันจาก bundle จริงแล้ว)
- ประกอบด้วย: **รอบ 31 `68b25ca` = fermata** + **รอบ 32 `047a7a7` = tablet drawer**
- deploy = push เข้า `main` → GH Actions auto (⚠️ 20 ก.ค. GitHub Actions ล่ม ~32 นาที run ค้าง "queued" — **ถ้าเจออีกให้รอ ไม่ต้องแก้อะไร** เช็ก githubstatus.com)
- **⛔ ห้าม merge main / deploy จน P'Aim สั่ง**
- base งานทั่วไป = `studio-shell-redesign` · **แต่ 2 ฟีเจอร์นี้แตกจาก main ตรง** (เลี่ยง dock-space ที่ทิ้ง) — ดูให้ดีก่อนเลือกฐาน

## 2. 🔴 งานค้างกลางอากาศ (เช็กก่อนอย่างอื่น)
**`guide-r33` — อัปคู่มือ (กำลังทำตอน pm29 ปิด session)**
- worktree `C:/gl/krisada/pleng-guide` · branch `guide-r33` (จากรอบ 32) · port 5370
- สั่งไป 2 อย่าง: (A) เขียนคู่มือให้ครอบ **fermata + tablet drawer** (B) **กู้ของจาก branch เก่า `guide-update`**
- ⚠️ **agent ตัวนี้ผูกกับ session pm29 — รายงานจะไม่ถึงสายใหม่** → สายใหม่ **ตรวจเองจาก branch:** `git log --oneline guide-r33` + `docs/reports/guide-r33.md` ใน worktree
- ถ้าเสร็จแล้ว: gate → ให้ P'Aim ดู → deploy รอบ 33 · ถ้ายังไม่เสร็จ/ไม่มีอะไร: สั่งใหม่ได้จาก brief เดิม

**`guide-update` (branch เก่า `1393eed`) — ห้ามลบ ห้าม force**
- ค้าง **116 commits** หลัง main · มีของจริง: Guide.vue refresh + **About.vue การ์ดเครดิต/แหล่งอ้างอิง**
- ⛔ **ห้าม full-merge** (จะ revert ของ live) — ให้ port ทีละส่วน (งานนี้มอบให้ `guide-r33` แล้ว)

## 3. 🙏 ค้างให้ P'Aim/พี่เปา ยืนยันบน live (ยังไม่ได้ยืนยัน)
1. แก้เพลง → ปิด → เปิดใหม่ **ค่า fermata ยังอยู่ไหม** (tester ขับ DB จริงไม่ได้ ไม่มี auth)
2. เปิด **เพลงเก่า** (มี `^` เดิม) เล่นได้ + โชว์ค่าไหม
3. 🔴 **Ctrl+P / PDF จริง — ต้องไม่มีตัวเลขบนแผ่น** (ตรวจจาก PDF จริง ไม่ใช่ DOM · `feedback_verify_print_from_pdf`)

## 4. 🔧 ค้างทำต่อ (ไม่บล็อก)
- **polish:** ชิป fermata อาจทับแป้นตอนโน้ตอยู่ล่างสุดจอเตี้ย (tester flag · positioning เดิม ไม่ใช่ regression)
- **DockKey ใหม่ยังไม่นิ่ง** — branch `dock-resize` `f8d77a3` ค้าง ไม่ deploy · **P'Aim: ไม่อยากใช้จนกว่าจะนิ่ง** · (DockKey = core แชร์พระคำ · ถ้าจะ deploy ต้อง gate 2-host ประสาน pk-PM)

## 5. 🆕 งานใหญ่ที่ P'Aim คุยกับ G ไว้ (ยังไม่ทำ · ควร file เข้า backlog ก่อนแตกงาน)
สรุป As-Is จากโค้ดจริงอยู่ใน **`docs/reports/current-editor-audit.md`** (ตอบ G ครบ 3 หัวข้อ) — ช่องว่างจริง:
- **ลูกคู่ (multi-voice) = ไม่มีในโมเดลเลย** (1 ห้อง = แนวเดียว) → งานขยายโมเดลใหญ่ ต้องถก scope ก่อน
- **D.C./D.S./Fine/Segno = เป็น text เฉย ๆ เล่นไม่กระโดด** (มี SA brief `docs/pm/brief-repeat-symbols-ui.md` แต่ยังไม่มี US/DS/โค้ด)
- measure grid · layer/track view · DockKey redesign (windowed + flat-list setting)
- ⚠️ อย่าให้บานปลาย — file เข้า backlog แล้วแตกทีละชิ้น

## 6. กระบวนการที่ใช้อยู่ (เวิร์กมาก รอบนี้)
- **PM สร้าง agent session เองได้** (P'Aim อนุมัติ 20 ก.ค. · memory `pleng-pm-spawns-agent-sessions`)
- **1 agent = 1 ฟีเจอร์ full-stack** (SA+UX+UI+dev) · **tester = agent แยกเสมอ** (คนสร้างห้าม gate งานตัวเอง)
- **M1 = ทำ "หน้าตา" บนโค้ดจริงแล้วหยุด → P'Aim ดู/เคาะ → M2 ต่อ logic** (ห้าม throwaway mockup) · resume agent เดิมด้วย `SendMessage`
- แต่ละ agent: **worktree + port ของตัวเอง** · `--host` + แจ้ง Network URL เสมอ
- **PM gate จากหลักฐาน tester** · PM ไม่ทดสอบพิกเซลเอง แต่ **ดูตาเปล่า sanity ก่อนส่ง P'Aim**

## 7. 🧹 ความสะอาด
- **ปิดแล้ว:** dev server :5350 (fermata) · :5360 (drawer)
- **worktree merged แล้ว ลบได้:** `pleng-fermata` · `pleng-drawer` (`git worktree remove ../pleng-fermata`)
- **worktree ที่ยังใช้:** `pleng-guide` (guide-r33 · port 5370)
- memory sync ขึ้น OneDrive แล้ว (177 ไฟล์)

---
*pm29 · 2026-07-20 · live รอบ 32 · fermata + tablet drawer ขึ้นแล้ว*
