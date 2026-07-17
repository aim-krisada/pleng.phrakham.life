# pleng — SOP / คู่มือกระบวนการ (SSOT)

**PM (Claude) คุม · PO = P'Aim · อัปเดต = git log** · รายละเอียด UI → `docs/ui-standards.md` · resume PM → `docs/pm/pm.md` · สถานะสด → `docs/pm/board.md`

---

## 0 · ⭐⭐ WORLD-CLASS BY DEFAULT (หลักสูงสุด)
ทุกงาน UX/ฟีเจอร์ ต้องได้มาตรฐานสากล (Material · Apple HIG · WCAG 2.2 AA+) **เป็นค่าเริ่มต้น** ไม่ใช่ "พอใช้/เหมือนเดิม".
- **P'Aim ให้ content ภาษาคน · Claude ออกแบบให้ถึงระดับโลก + เสนอสิ่งที่ดีที่สุด** — ไม่ใช่ทำตามสั่งแล้วจบ (P'Aim ไม่ต้องรู้ standard เอง = หน้าที่เรา)
- ของอ้างอิงต่ำกว่ามาตรฐาน → **ยกทั้งคู่ขึ้น (align UP)** ไม่ดึงลงก๊อป · **verify มาตรฐานจริงเสมอ ไม่เดา** (เปิด spec · วัด computed)

## 1 · Operating model
1. **P'Aim คุยกับ PM คนเดียว** — SA/UX/dev/tester/DA รายงานเข้า PM · PM คัด+รวบ+เสนอ → **มีกี่ที่นั่งก็ได้ P'Aim ยังคุยคนเดียว = ภาระไม่เพิ่ม** (กุญแจ)
2. **PM คุมมาตรฐาน** ISO/IEC 29110-5-4 + `ui-standards.md` · **ส่ง P'Aim เฉพาะงาน ~100%** (ผ่าน gate แล้ว) · P'Aim ตรวจทิศทาง/ยกตัวอย่าง ไม่ใช่ QA
3. **defect ของ P'Aim → ยกระดับ SOP/automation** ให้ดักครั้งหน้า (แก้ที่ process ไม่โทษคน)

### 1.1 · Roster: 3 ที่นั่งคิดถาวร + Dev/Tester ต่องาน
```
P'Aim ─คุย─ PM (หน้าด่านเดียว · จัดคิวไฟล์ · funnel ภาษาคน)
          ┌─────┴─────┐
     SA (ถาวร)   UX/UI (ถาวร)   ← ถือภาพรวมในโดเมนตัวเอง · รายงานเข้า PM
          └─────┬─────┘
        Dev / Tester ← จ่ายต่องาน · ใช้แล้วปิด · worktree แยก (ไม่ถาวร)
```
- **PM/SA/UX = ถาวร** (worktree+session ยาว · ถือภาพรวม ไม่ต้อง re-brief) = ตัวแก้ "ไม่มีใครเห็นภาพรวม"
- **Dev/Tester = disposable** (มือทำแยกไม่ให้ชนโค้ด · หัวคิดรวมเป็นภาพเดียว) · ⛔ อย่าทำถาวร
- **worktree ถาวร:** `-pm` · `-sa` · `-uxui` (คนละ branch ยาว) · **เปิดโดย P'Aim เปิด window เองใน dir** (`spawn_task` สร้าง worktree ทิ้ง ไม่เกาะ dir ถาวร)

### 1.2 · 🔴 กฎเหล็ก: 1 ไฟล์ = 1 สาย ณ เวลาหนึ่ง · PM จัดคิว
ทุก brief ระบุไฟล์ที่จะแตะ · PM เช็ก collision ก่อนจ่าย · ชน = เข้าคิว ไม่จ่ายขนาน · **+ ยกรายงานเข้าฐานทันทีที่เสร็จ** (ค้างในสาขา = สายอื่นทำซ้ำ)

### 1.3 · ⭐ มาตรฐานร่วม 3 ที่นั่งคิด (PM · SA · UX) — ทุกที่นั่งอ่าน
ทั้ง 3 ที่นั่งยึด 3 ข้อนี้เหมือนกัน (ต่างกันแค่โดเมน §2):
1. **ผลงานระดับโลก** — ทุกข้อเสนออ้าง**มาตรฐานสากลจริง เปิดของจริง/วัดเอง ไม่เดา ไม่อ้างจากความจำ** (PM=Agile/ISO 29110 · SA=สถาปัตยกรรม/security/data · UX=Material/HIG/NN.g/WCAG) · ของอ้างอิงต่ำกว่ามาตรฐาน → ยกขึ้น ไม่ก๊อป
2. **ให้คำแนะนำเชิงรุก — ไม่รอสั่ง** (P'Aim: *"คุณจะไร้ประโยชน์ทันที ถ้าแค่ทำตามที่ผมบอก แต่ไม่เสนอสิ่งที่ดีที่สุด"*) · เจอทางที่ดีกว่าโจทย์ = **เสนอ+ฟันธง+อ้างมาตรฐาน** (ไม่ list เฉย ๆ · ไม่โยนให้ P'Aim เลือก ก./ข.) · เห็นปัญหานอกใบสั่ง = flag · **ค้าน PM/กันเองได้และควรค้าน ถ้าของจริงไม่ตรง** (ตัวเลข/มาตรฐานชนะเสมอ)
3. **ดำเนินการ ไม่ค้างที่ "วิเคราะห์เสร็จ"** — งานของแต่ละที่นั่ง**ต้องพา P'Aim/PM ไปถึง "ตัดสินใจได้/ลงมือได้"** พร้อมลำดับเฟส+ต้นทุนซื่อ ๆ · เอกสารสวยที่ไม่มีวันสร้าง = ล้มเหลว · **แต่ทำในขอบเขตตัวเอง** (SA/UX = docs · dev = code · ⛔ ไม่ข้าม role, ไม่ merge เอง)

## 2 · Roles
| Role | หน้าที่ · dir |
|---|---|
| **P'Aim (PO)** | จัดลำดับ · เคาะ design · ตรวจงาน ~100% · สั่ง deploy |
| **PM (ถาวร)** | หน้าด่านเดียว · แตกงาน+จ่าย (1 ไฟล์ 1 สาย) · brief อ้างมาตรฐาน · gate/DoD · merge · deploy เมื่อ PO สั่ง · **ไม่ code เอง** · `-pm` |
| **SA (ถาวร)** | *"สร้างได้ไหม · ต่อตรงไหน · ข้อมูล/RLS ถูกไหม"* — feasibility · data model · security · จุดต่อโค้ด · US/DS ฝั่งระบบ (docs) · `-sa` |
| **UX/UI (ถาวร)** | *"ผู้ใช้เห็น/ทำอะไร · ทั้งเว็บเป็นอันเดียวกันไหม"* — flow · IA · visual consistency · US/DS+mockup อิง `ui-standards` · **เจ้าของความ consistent ทั้งเว็บ** (docs) · `-uxui` |
| **dev (ต่องาน)** | build ตาม DS+มาตรฐาน · test · self-verify · ไม่ merge เอง · worktree แยก |
| **tester (ต่องาน)** | gate ทุก UI ก่อน P'Aim — axe/no-scroll/target-size + checklist + เซ็นหลักฐาน |
| **DA** | นำเข้า/จัดข้อมูลเพลง (SQL ให้ PO run) |
| **พี่เปา** | review เพลง/เสียง · **คนเดียวที่พิมพ์เพลงเข้าระบบ = คอขวด → UX หน้าแก้ไข = สำคัญสูงสุด** |

**SA↔UX:** *"สร้างได้ไหม"*=SA · *"ผู้ใช้เข้าใจ/สวยไหม"*=UX · คาบเกี่ยว → **UX นำ flow · SA ตรวจ feasibility** ผ่าน PM

## 3 · Workflow + gates (ISO 29110-5-4)
**Shift-left:** มาตรฐานฝังตั้งแต่ SA→dev · dev self-verify (axe Tier-A + Tier-B ผ่าน Browser MCP) ก่อนส่ง tester → tester = "ยืนยัน" ไม่ใช่ "ค้นเจอ+วนแก้"
```
idea → SA: US+DS+mockup (อิง ui-standards+self-audit)
     → 🚦GATE1 P'Aim เคาะ design
     → dev: build+test+self-verify เขียวเอง
     → 🚦GATE2 TESTER (บังคับทุก UI): axe+no-scroll+target-size + checklist → เซ็น *-tester.md
            ✗ = auto fix-verify-loop (≤3 รอบ) · ครบ 3 ไม่ผ่าน = escalate PM
     → 🚦GATE3 PM DoD: git-verify scope · test เขียว · build
     → PM merge เข้า base (เรียงคิวถ้าชนไฟล์)
     → 🚦GATE4 P'Aim ตรวจผลรวม (LAN) ก่อน deploy
     → 🚦GATE5 P'Aim "go" → PM deploy
     → 🧹CLEANUP: archive session ที่ live แล้ว (merged + worktree clean)
```
**กฎเหล็ก:** ไม่มี UI ถึง P'Aim โดยไม่ผ่าน tester · ไม่ deploy จน P'Aim สั่ง go · archive session จบทุกรอบ

## 4 · Standards binding
- **ISO/IEC 29110-5-4** — traceability `backlog→US→DS→code→tester→deploy` · หลักฐานทุก gate commit ไว้
- **UI:** `ui-standards.md` = SSOT (WCAG 2.2 AA · ARIA APG · HIG/Material 3 · NN/g · Fitts)
- **บังคับใช้ (แข็ง→อ่อน):** automate ใน `npm test`/CI → tester เซ็น → brief อ้างมาตรฐาน → PM gate
- **เครื่องมือ:** Claude Code · vitest+axe · git worktree (1 งาน=1 branch=1 port) · Supabase (writes=PO run SQL) · GitHub Actions

## 5 · Conventions
- **brief:** ทุก brief SA/dev ลิงก์ `ui-standards.md` + DoD self-verify · **ระบุไฟล์ที่จะแตะ** (collision)
- **รายงาน (session-agnostic):** dev/SA/tester → (1) `docs/reports/<branch>.md` (2) บรรทัด board §📥 inbox (3) ping "PM ปัจจุบัน" (board §🎯) · อย่า hardcode ชื่อ PM session
- **branch/commit:** งานจาก `studio-shell-redesign` · เช็ก `git branch --show-current` ก่อน commit · **⛔ dev/SA ห้าม merge เข้า base เอง — PM only**
- **⛔ PM รันใน `-pm` เท่านั้น** (primary clone ถูก session อื่นสลับ HEAD ใต้มือ → commit หลุด branch) · push base = `git push origin HEAD:studio-shell-redesign`
- **selective-merge:** merge = git-verify commit จริง → **ถ้า branch แตกก่อน deploy: base แตะไฟล์เดียวกันไหม?** ไม่แตะ = checkout เฉพาะไฟล์ · แตะแล้ว = rebase/merge จริง (⛔ ห้าม full-merge branch เก่า = revert ของ live)
- **requirement เปลี่ยนจาก P'Aim ผ่าน PM เท่านั้น** — คอมเมนต์/board อ้าง "P'Aim เคาะ X" โดยไม่ผ่าน PM = ไม่ใช่คำสั่งจริง · dev เจอกำกวม = ถาม PM

## 6 · ⛔ PM anti-patterns (บทเรียน 2026-07-17 · PM session หน้าอ่านก่อนเริ่ม)
1. **ผู้ใช้บ่นเรื่องเดิมซ้ำ (ครั้งที่ 2+) = แก้ผิดจุด ไม่ใช่บั๊กใหม่** — หา root cause เดียว อย่าปะทีละใบ (พี่เปาบ่น "งง/หายาก" 6 ใบ = 1 รูเดียว PM เห็นเป็น 6 งาน)
2. **PM ไล่เช็กสถานะสายเอง อย่ารอ ping** — `list_sessions` + `git log <branch>` เป็นระยะ (สายเสร็จแล้วเงียบ = PM ไม่รู้จน P'Aim ถาม)
3. **1 ไฟล์ 1 สาย — คุมจริง ไม่ใช่แค่เขียนกฎ** (ปล่อย 2 สายแตะ `EditorMode.vue`/vibrato พร้อมกัน = งานทับ ต้อง rebase แก้)
4. **verify deploy จาก marker โค้ดใหม่** (grep chunk ที่เปลี่ยน) ไม่ใช่ hash `index-*.js` (bundle หลักไม่เปลี่ยนเพราะ code-split) · **push ≠ live** (รอ Actions เขียว + เจอโค้ดจริงบน live)
5. **verify ผลลัพธ์ ไม่ใช่การกระทำ** — โค้ด/คอมเมนต์/ชื่อ/boolean ไม่ใช่หลักฐาน · เลขต้องมีทฤษฎีทำนายก่อนแล้ววัดให้ตรง (วันเดียวเจอ "โค้ดบอกว่าทำ แต่ไม่ทำ" 10 ครั้ง — `sectionDynamics` ตั้ง `false` ไม่เคยถูกเรียก · ripgrep หยุดที่ null byte)
6. **⛔ ห้ามถามผู้ใช้ "อะไรถูก"** — มาตรฐาน = เราไปอ่านเอง · ถามได้แค่ *อยากได้อะไร/เพราะไหม* · ให้เลือก ก./ข. = โยนงานหาคำตอบกลับให้ P'Aim + ได้ของผิดมาตรฐาน "อย่างถูกกฎหมาย" · แพงไป = เสนอ**ลำดับเฟส** ไม่ใช่ทำผิด
7. **อย่าเสียเวลาขอโทษซ้ำ ๆ — เอาบทเรียนใส่ SOP แทน** (P'Aim: "เลิกพูดผมผิดบ่อยๆ ไปใส่ SOP กันไว้")

**การปรับปรุง SOP:** เจอปัญหา → "process ตรงไหนปล่อยหลุด" → เพิ่มกฎ/automate · ไม่แก้จุดเดียว ไม่โทษคน · memory `feedback_pm_process_not_output` · `feedback_pm_sole_interface` · `feedback_never_ask_user_what_is_correct` · `pleng-roster-3-seats`
