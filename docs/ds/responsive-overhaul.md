# Responsive + UI/UX Overhaul — Design System + Parallel Plan

**เป้า (P'Aim 10 ก.ค.):** ทำหน้าใช้งานให้ **responsive เนียนสวย ระดับมาตรฐานเว็บแอปสากล ≥95%** ในรอบเดียว · AI ตัดสินใจดีไซน์เองตามมาตรฐาน · **P'Aim ตรวจตอนท้าย ไม่ต้องจูนทีละจุด**
**หลักคิด:** ตั้ง "มาตรฐานกลาง" (design tokens) ครั้งเดียวก่อน → ทุกหน้ายึดตัวเดียวกัน = เป็นระบบเดียว + ทำครั้งเดียวถูก (กันการทำซ้ำ)

---

## 1. Design tokens (SSOT = `src/styles.css` · custom properties)

### Typography scale (mobile-first · rem, base 16px)
`--fs-xs:.75rem` (12) · `--fs-sm:.875rem` (14) · `--fs-base:1rem` (16) · `--fs-lg:1.125rem` (18) · `--fs-xl:1.25rem` (20) · `--fs-2xl:1.5rem` (24) · `--fs-3xl:1.875rem` (30)
**line-height:** body/paragraph `1.5` (WCAG 1.4.12 min) · **บรรทัดเพลง (lyric+note stack) `1.3–1.4`** (แน่นอ่านง่าย) · หัวข้อ `1.2`

### Spacing scale (4px grid — แก้ปัญหาช่องว่างห่างเกิน)
`--sp-1:4px --sp-2:8px --sp-3:12px --sp-4:16px --sp-6:24px --sp-8:32px --sp-12:48px`
- **⭐ ปัญหาที่ P'Aim เห็น = ช่องว่างระหว่างบรรทัดเพลงห่างเกิน:** มาตรฐาน = ช่องไฟระหว่างบรรทัดเพลง **`--sp-2`→`--sp-3` (8–12px)** ไม่ใช่ 24–32px · ภายในบรรทัด (คอร์ด/โน้ต/เนื้อ ซ้อนกัน) แน่น `2–4px`
- ทุกระยะ = ตัวคูณของ 4/8 (vertical rhythm) ไม่ตั้งค่ามั่วรายจุด → ตาไม่ต้องกวาดขึ้นลงเยอะ

### Breakpoints
มือถือ `<640` · แท็บเล็ต `640–1024` · เดสก์ท็อป `>1024` (mobile-first · min-width queries)

### Touch targets + a11y (WCAG 2.2 AA)
ปุ่ม/ลิงก์กดได้ **≥44×44px** (WCAG 2.5.5) · contrast ตัวอักษร ≥4.5:1 · UI/ไอคอน ≥3:1 · focus เห็นชัด · ไม่มี horizontal scroll ที่ body

### Containers
เนื้อหาอ่าน (เพลง/Guide) max-width **`40–48rem`** จัดกลาง (อ่านสบายตา ไม่ยาวเกิน) · list = เต็มความกว้าง responsive grid

### สี
ใช้ theme token เดิมใน `styles.css` เท่านั้น (รองรับ dark/light) · ห้าม hard-code hex

---

## 2. แผนคู่ขนาน (collision-free · S0 ก่อน → S1–S4 ขนาน)

**ทำไมต้อง S0 ก่อน:** styles.css เป็นไฟล์กลางไฟล์เดียว — ถ้าหลายเซสชันแก้พร้อมกัน = ชน · S0 วาง token + base ให้เสร็จก่อน (เร็ว) แล้ว S1–S4 แตะแค่ `<style scoped>` ของ component ตัวเอง = **ไม่ชนกันเลย**

| เซสชัน | ขอบเขต (ไฟล์) | หมายเหตุ |
|---|---|---|
| **S0 — Foundation** 🚦*(ก่อน · บล็อก)* | `src/styles.css` (tokens ข้อ 1 + base type/rhythm = **แก้ช่องว่างบรรทัด global**) + `ShellBar.vue` + `SiteFooter.vue` (chrome) | เจ้าของไฟล์กลางคนเดียว · merge ก่อนค่อยปล่อย S1–S4 |
| **S1 — อ่าน/ฝึกร้อง** | `SongViewer.vue` (scoped) | **mobile-primary สำคัญสุด** · ⛔ ห้ามแตะ `NoteRow.vue` (ACC/B062) |
| **S2 — รายการเพลง** | `SongList.vue` (scoped) | grid/card/ค้นหา/filter responsive |
| **S3 — แก้ไข** | `Studio.vue` + `EditorMode.vue` (scoped) | หน้าทำเพลง · มือถือใช้ได้ |
| **S4 — แผ่นเพลง+dock** | `SongSheet.vue` + `StudioDock.vue` + `SingTransport.vue` (scoped) | ⛔ ห้ามแตะ `NoteRow.vue` (ACC) · dock ไม่บังเนื้อ |

*(S5 optional: `Guide.vue`+`About.vue` — หน้า static · จะยกให้ S0 หรือแยกก็ได้)*

**กันชนรวม:** ⛔ `NoteRow.vue` = ACC/B062 (S1/S4 ห้ามแตะ) · DA = data (ไม่ชนโค้ด) · **S1–S4 แตะแค่ scoped style ของตัวเอง ห้ามแก้ `styles.css`** (ถ้าต้อง token ใหม่ = แจ้ง PM) · B069 (tie ข้ามห้าม·SongSheet) sequence หลัง S4

## 3. DoD (reframe — ทำจบ P'Aim ตรวจท้าย)
แต่ละเซสชัน = **ทำ polish หน้าตัวเองให้ครบตามสเปกนี้ (≥95%) เอง** ไม่ถาม P'Aim รายจุด · self-verify: `preview_resize` 3 breakpoint + `preview_inspect` เทียบค่าจริงกับ token scale + touch-target ≥44 + ไม่มี h-scroll + WCAG AA · เปิด `--host` ใส่ Network URL · **P'Aim ตรวจหน้าที่เสร็จแล้วบนมือถือรอบเดียว** (ไม่ใช่ทีละ tweak) · unit+build เขียว

## 4. รายงานกลับ (session-agnostic)
`docs/reports/responsive-<area>.md` + board §📥 inbox + ping PM `PM รอบ 10 ก.ค. (a)` · commit อังกฤษ · **ห้าม merge main/deploy**
