# brief — Responsive polish ทั้งแอป (ให้เนียนสวยที่สุด) · สาย Surface dev

**สาย:** dev (Surface · เห็นผล + เปิด LAN ให้ P'Aim ดูมือถือจริง) · worktree ใหม่จากฐาน `studio-shell-redesign`
**ที่มา:** P'Aim 10 ก.ค. — งานที่ต้องการมากที่สุด = **ปรับหน้าใช้งาน responsive ให้เนียนสวยที่สุด ทั้งแอปเป็นชุด** · จัดที่ Surface เพราะ loop เห็นผลแน่นสุด (HMR สด + พี่เอมตัดสินความสวยบนมือถือจริงผ่าน LAN)

## เป้าหมาย
ทุกหน้าดู **เนียน สมส่วน สวย** ทุกขนาดจอ (มือถือ → แท็บเล็ต → เดสก์ท็อป) — spacing/typography/ปุ่มกด/การจัดวาง ลื่นไหลไม่มีจุดสะดุด ล้นจอ หรือกดยากบนมือถือ

## ขอบเขต (ทั้งแอปเป็นชุด · CSS/layout ล้วน)
หน้า: `views/SongList.vue` · `SongViewer.vue` (อ่าน/ฝึกร้อง = **mobile-primary สำคัญสุด**) · `views/Studio.vue`+`EditorMode.vue` (แก้ไข) · `views/Guide.vue` · `views/About.vue`
ร่วม: `ShellBar.vue` · `SiteFooter.vue` · `StudioDock.vue`/`SingTransport.vue` · `SongSheet.vue` (container/spacing) · `ComboSelect.vue`/`FontTool.vue`/`ProfileTool.vue` · global `src/styles.css`

## ⛔ กันชน (สำคัญ — มีสายอื่นเดินขนาน)
- ⛔ **ห้ามแตะ `src/components/NoteRow.vue`** = สาย ACC/Android ทำ B062 (วาดเส้นเอื้อน) อยู่ · responsive จัดแค่ *กล่อง/ระยะรอบๆ* โน้ต ไม่แตะการ render โน้ตข้างใน · ถ้าจำเป็นต้องแตะ → แจ้ง PM ก่อน
- ⛔ **CSS/layout เท่านั้น — ห้ามเปลี่ยน logic/behavior/โมเดลข้อมูล** (กัน regression) · ถ้าเจอบั๊ก logic = แจ้ง PM แยกเป็น backlog
- สาย DA (B068) = data ล้วน ไม่ชนโค้ด

## กติกา UI (memory `pleng-ui-sop`)
- **theme tokens จาก `src/styles.css` เท่านั้น** — ห้าม hard-code สี (ต้องรองรับ dark/light + ธีมแบรนด์)
- **WCAG 2.2 AA:** contrast ผ่าน · **touch target ≥ 44×44px** · โฟกัสเห็นชัด
- ตาม responsive checklist ของ UI SOP · **discuss-before-build** (เสนอแผนก่อนลงมือหน้าใหญ่ · ไม่รื้อเงียบๆ)

## วิธีทำ (audit-first → P'Aim review → apply · เพราะ "สวย" ต้องตาพี่เอม)
1. **Phase 1 — Audit:** กวาดทุกหน้าที่ 3 breakpoint (มือถือ ~375 · แท็บเล็ต ~768 · เดสก์ท็อป) → ทำลิสต์ปัญหา responsive ต่อหน้า (ล้นจอ/ระยะเพี้ยน/ปุ่มเล็ก/typography/ตัดคำ) + **ภาพก่อน** + ข้อเสนอแก้ → รายงาน PM/P'Aim (ยังไม่แก้ใหญ่)
2. **P'Aim review บนมือถือจริง** (LAN) → เคาะว่าแก้อะไรก่อน
3. **Phase 2 — Apply ต่อหน้า:** แก้ตาม plan → เปิด LAN → พี่เอมดูมือถือ → feedback → ปรับ → หน้าถัดไป (ทีละหน้า เป็นชุดจนครบ)

## Verify (ข้อกำหนดถาวร)
- **เปิด server `--host` + ใส่ Network URL `http://<IP>:<port>` ในทุกรายงาน** ให้ P'Aim/พี่เปา ทดสอบมือถือจริง (memory `pleng-dev-mobile-test`)
- `preview_resize` เทียบ 3 breakpoint · `preview_inspect` เช็กค่าจริง (สี/ระยะ/touch-target) ไม่เดาจาก screenshot
- unit + build เขียว (CSS ไม่ควรกระทบ test · ถ้าแดง = ตรวจ)

## รายงานกลับ (session-agnostic)
(1) `docs/reports/responsive-polish.md` (audit + ต่อหน้า) · (2) บรรทัด `docs/pm/board.md` §📥 inbox · (3) ping PM ปัจจุบัน = `PM รอบ 10 ก.ค. (a)` · commit อังกฤษ · branch `responsive-polish` · เช็ก `git branch --show-current` ก่อน commit · **ห้าม merge main/deploy**
