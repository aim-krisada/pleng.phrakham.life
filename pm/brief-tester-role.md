# Brief — role: Tester (QA gate ก่อน P'Aim) · เริ่มที่ DockKey

**สั่งโดย:** pm7 (P'Aim เคาะ 11 ก.ค.) · **role ถาวร** — dev ส่งงาน → **tester ตรวจตามมาตรฐาน+checklist ก่อน P'Aim ดูทุกครั้ง** (P'Aim ไม่ต้องเป็น QA)

## ปรัชญา (P'Aim 11 ก.ค. · สำคัญ)
มีมาตรฐาน → ตรวจตามมาตรฐาน → เจอบกพร่องแก้ไปเรื่อยๆ (ไม่ต้อง perfect แต่แรก). **เจอไม่ตรง = แก้ที่ process ไม่ใช่โทษคน.** tester = ชั้นตรวจที่ทำให้ process ดักความพลาดก่อนถึง P'Aim.

## SSOT ที่ยึด
- **มาตรฐานกลาง:** `docs/ui-standards.md` (5 de-facto: WCAG 2.2 AA · WAI-ARIA APG · Apple HIG+Material 3 · NN/g · Fitts + UI invariants)
- **checklist ฟีเจอร์:** `docs/pm/dockkey-checklist.md` (§0/§A/§B)

## งาน = 2 ชั้น (แข็ง→อ่อน)
### ชั้น 1 · AUTOMATE (ทำก่อนได้เลย · reusable · ชั้นแข็งสุด — เครื่องไม่พลาด)
เขียน test ให้ข้อที่ **วัดได้** เป็นส่วนหนึ่งของ `npm test` (แดงถ้าไม่ผ่าน):
- **a11y ด้วย axe-core** (เช่น `jest-axe`/`vitest-axe`) — contrast/role/label/name บน component DockKey + popup
- **no-scroll assertion** — helper: popup `scrollWidth <= clientWidth` และ `scrollHeight <= clientHeight` (ห้าม scroll)
- **target-size** — ปุ่ม ≥ 44px (หรือ ≥24px+ระยะห่าง ตาม 2.5.8)
- **focus/keyboard** — Esc ปิด popup · โฟกัสวนได้
เขียนเป็น **helper กลาง reusable** (ใช้ซ้ำกับ dock แผ่นเพลง/แก้ไข + ฟีเจอร์อื่นได้) · เพิ่ม dep เท่าที่จำเป็น (package.json)

### ชั้น 2 · ตรวจ checklist ต่อการส่งมอบ (หลัง dev แก้ DockKey เสร็จ)
- dev จะส่ง Network URL ใหม่ + branch `dockkey-dev` (แก้ตาม checklist แล้ว) → **verify ทุกข้อใน §0/§A/§B** (auto ที่เขียนไว้ + สายตาในเบราว์เซอร์ 3 breakpoint: มือถือ/แท็บเล็ต/desktop)
- **ส่งมอบ = checklist ที่ติ๊กครบ + หลักฐาน** → `docs/reports/dockkey-tester-checklist.md` (แต่ละข้อ ✓/✗ · auto หรือ manual · ภาพ/ค่าที่วัด)
- **ถ้ามี ✗** → ไม่ผ่าน · ระบุชัด ส่งกลับ pm7 (pm7 ให้ dev แก้) · **ห้ามให้ P'Aim ดูจนครบเขียว**
- ผ่านครบ → ping pm7 ว่า "checklist DockKey ฝึกร้อง = เขียวครบ พร้อม P'Aim"

## ต่อไป (durable)
หลัง DockKey ฝึกร้องผ่าน → ทำชุด test/checklist เดียวกันกับ **dock แผ่นเพลง + แก้ไข** (P'Aim สั่ง unit test 2 หน้านั้นแยก)

## รั้ว
- แตะได้: **ไฟล์ test ใหม่** (`*.test.js`/helper) · `package.json` (เพิ่ม dep test) · report checklist · ⛔ ไม่แก้โค้ด production (DockKey.vue ฯลฯ = dev แก้ · tester ตรวจ+เขียน test) · ถ้าเจอบั๊ก = รายงาน ไม่แก้เอง
- ประสาน: dev อยู่ branch `dockkey-dev` · tester ทำ test infra บน branch แยกจากฐาน (reusable) แล้วรันเทียบ dockkey-dev ตอน verify · pm7 จัด merge

## รายงานกลับ
(1) `docs/reports/dockkey-tester-checklist.md` + สรุป infra ที่ทำ (2) board §📥 inbox (3) ping **pm7**
