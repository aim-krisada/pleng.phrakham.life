# pleng — SOP / คู่มือกระบวนการ (SSOT)

**ผู้คุม:** PM (Claude) · **เจ้าของผลิตภัณฑ์ (PO):** P'Aim · **อัปเดตล่าสุด:** git log
คู่มือนี้ = วิธีที่ทีม pleng ทำงานให้ได้คุณภาพตามมาตรฐาน โดย **P'Aim ตรวจแค่งานที่เกือบ 100% แล้ว**
มาตรฐาน UI/quality รายละเอียด → `docs/ui-standards.md` · การ resume PM → `docs/pm/pm.md` · สถานะสด → `docs/pm/board.md`

---

## 1 · Operating model (P'Aim 2026-07-11)
1. **P'Aim คุยกับ PM คนเดียว** — PM = หน้าด่านเดียว · dev/SA/tester/DA ไม่คุยกับ P'Aim ตรง · ทุกสายรายงานเข้า PM · PM คัด+รวบ+เสนอ
2. **PM คุมงานให้ได้มาตรฐาน** — ISO/IEC 29110-5-4 + มาตรฐานสากล (`docs/ui-standards.md`) + เครื่องมือที่เลือก (Claude Code · axe-core · vitest · git worktree · Supabase)
3. **ส่งเฉพาะงาน ~100%** ให้ P'Aim ตรวจ (ผ่าน gate ครบก่อน) · P'Aim ตรวจทิศทาง/ยกตัวอย่าง ไม่ใช่ QA
4. **ทุก defect/ตัวอย่างของ P'Aim → ยกระดับ SOP/มาตรฐาน/automation** ให้ดักครั้งหน้า (แก้ที่ process ไม่โทษคน)

## 2 · Roles
| Role | หน้าที่ |
|---|---|
| **P'Aim (PO)** | จัดลำดับความสำคัญ · เคาะ mockup/design · ตรวจงานเกือบ 100% · สั่ง deploy |
| **PM (Claude)** | หน้าด่านเดียว · แตกงาน+จ่าย (collision-aware) · เขียน brief อ้างมาตรฐาน · คุม gate/DoD · merge · deploy เมื่อ PO สั่ง · ดูแล SOP/board/มาตรฐาน · **ไม่ code เอง** |
| **SA** | ออกแบบ US/DS + mockup ตามมาตรฐาน (docs only) |
| **dev** | สร้างตาม DS+prototype+มาตรฐาน · เขียน test · ไม่ merge เอง |
| **tester** | **gate ของทุก UI ก่อน P'Aim** — automate (axe/no-scroll/target-size) + ตรวจ checklist+ui-standards · เซ็นหลักฐาน |
| **DA** | นำเข้า/จัดข้อมูลเพลง (SQL ให้ PO run) |
| **พี่เปา** | tester ดนตรี (ฟังเสียง/จังหวะ · review เพลง) |

## 3 · Workflow + gates (ISO 29110-5-4 SI mapping)
```
idea (backlog.md · SI.2)
  → SA: US(docs/us) + DS(docs/ds) + mockup(docs/design)   [SI.2 req · SI.3 design]
  → 🚦 GATE 1: P'Aim เคาะ mockup/design
  → dev: build ตาม DS+prototype+ui-standards + test        [SI.4 construction]
  → 🚦 GATE 2 (TESTER · บังคับทุก UI): axe-core + no-scroll + target-size (automate)
            + ตรวจ checklist ฟีเจอร์ + ui-standards ทุกข้อ → เซ็น `*-tester.md` (✓/✗)
            ✗ Tier-A (axe/tests) = **auto-loop `fix-verify-loop` (workflow · ≤3 รอบ · กัน infinite)** วนแก้-ตรวจเอง
                · ครบ 3 ยังไม่ผ่าน = escalate PM · Tier-B (จอจริง: no-scroll/target/contrast) = gate มือท้าย (subagent ไม่มีเบราว์เซอร์)
            ✓ ครบ = ส่ง PM
  → 🚦 GATE 3 (PM · DoD): git-verify scope/fence · test เขียว · build · checklist ครบ
  → 🚦 GATE 4: P'Aim ตรวจ (เกือบ 100% แล้ว · แค่ทิศทาง)                [SI.5 test/review]
  → PM merge เข้า base (studio-shell-redesign)              [SI.6 config/integration]
  → 🚦 GATE 5: P'Aim สั่ง "go" → PM deploy (main auto-deploy) [SI.6 delivery]
```
**กฎเหล็ก:** ไม่มี UI ถึง P'Aim โดยไม่ผ่าน tester (GATE 2) · ไม่ deploy จน P'Aim สั่ง go ชัดต่อรอบ

## 4 · Standards binding
- **ISO/IEC 29110-5-4:2025** (Agile VSE) — traceability `backlog id → US → DS → code → tester report → deploy` · DoD gate · config mgmt (base branch · main deploy-on-go) · หลักฐานทุก gate commit ไว้
- **UI/a11y:** `docs/ui-standards.md` = SSOT (WCAG 2.2 AA · WAI-ARIA APG · Apple HIG/Material 3 · NN/g · Fitts) + UI invariants
- **การบังคับใช้ (แข็ง→อ่อน):** (1) automate ใน `npm test`/CI (2) tester เซ็น checklist (3) brief อ้างมาตรฐาน+DoD (4) PM gate
- **เครื่องมือ:** Claude Code (sessions/worktree) · vitest+axe-core (test) · git worktree (1 งาน=1 branch=1 port · collision-aware) · Supabase (RLS · writes = PO run SQL) · GitHub Actions (deploy)

## 5 · Conventions
- **branch:** งานจาก `studio-shell-redesign` · 1 งาน = 1 branch = 1 dev-server port · dev รัน `--host` + ให้ Network URL (มือถือทดสอบ)
- **รายงาน (session-agnostic):** dev/SA/tester → (1) `docs/reports/<branch>.md` (2) บรรทัด board §📥 inbox (3) ping "PM ปัจจุบัน" (board §🎯) · **อย่า hardcode ชื่อ PM session**
- **PM session:** ชื่อ = เลข sprint/deploy รอบ (pm7 = รอบ 7) · เช็ก `git branch --show-current` ก่อน commit เสมอ
- **collision-aware dispatch:** 2 session แตะไฟล์เดียว = คิวเดียว/เรียง merge · คนละไฟล์ = ขนาน
- **selective-merge:** merge feature = git-verify commit จริง (`git show --stat`) → checkout เฉพาะไฟล์จริง → test → commit (กัน two-dot phantom deletion)

## 6 · การปรับปรุง SOP (ต่อเนื่อง)
เจอปัญหา/ตัวอย่างจาก P'Aim → ถามว่า "process ตรงไหนปล่อยหลุด" → เพิ่มกฎใน `ui-standards`/checklist หรือ automate → SOP คมขึ้นทุกรอบ (ไม่แก้แค่จุดเดียว · ไม่โทษคน). ดู memory `feedback_pm_process_not_output` · `feedback_pm_sole_interface`.
