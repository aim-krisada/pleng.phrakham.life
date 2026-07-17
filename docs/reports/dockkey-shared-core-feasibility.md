# SA feasibility — DockKey ปรับแต่งได้ + คำถาม "core lib แชร์พระคำ↔เพลง"

**ประเภท:** SA feasibility (docs only · ⛔ ไม่แตะ `src/`) · **brief:** `docs/pm/brief-dockkey-config.md`
**โจทย์พี่เปา:** DockKey ปรับได้ (เลือกปุ่ม show/hide + ตำแหน่ง · resize · settings · toggle ชื่อ) · **P'Aim ย้ำ:** "ถ้าแก้ต้องแก้ core lib ที่ใช้ร่วมพระคำกับเพลง"
**verify ของจริง 2 repo:** pleng `sa-standing` · phrakham `phrakham.life2` (live · Quarto) — วัด/ diff จริง 2026-07-17 ไม่เดา
**UX นำ flow · ใบนี้ตอบ feasibility + สถาปัตยกรรม shared-core**

---

## 0 · สรุป 30 วิ (ตอบ 3 คำถาม PM)

| # | คำถาม | คำตอบฟันธง |
|---|---|---|
| **Q1** | อะไร shared core · อะไรเฉพาะ pleng · config ควรอยู่ชั้นไหน | **DockKey.vue = "core lib" แต่แชร์ข้าม 3 หน้าของ pleng เอง (ฝึกร้อง/แผ่นเพลง/แก้ไข) ไม่ใช่ข้าม 2 เว็บ** · config อยู่ในชั้น descriptor + Setting page ของ DockKey (มีโครงรองรับ ~80% แล้ว) |
| **Q2** | 🔴 แก้ครั้งเดียวได้ 2 เว็บจริงไหม | ❌ **ไม่จริงสำหรับ dock** — phrakham **ไม่มี dock เลย** (ใช้ `pk-navbar`) · dock ของ pleng (`DockKey.vue` Vue) กับสิ่งที่ phrakham มี **เป็นคนละ implementation คนละภาษา ไม่แชร์โค้ดสักบรรทัด** · 2 เว็บแชร์จริงแค่ `pk-scrollnav.js` (identical) — **ไม่เกี่ยวกับ dock** |
| **Q3** | persist ที่ไหน · resize primitive · id คงที่ · regression phrakham · กี่เฟส | persist=localStorage มีแล้ว (per-user-cross-device ต้อง profile=เฟสเสริม) · **id คงที่ต่อปุ่ม = มีอยู่แล้ว** · resize(ย้าย)มี / resize(ขนาด)ยังไม่มี · **regression phrakham = ศูนย์ (phrakham ไม่มี dock)** · 1–3 เฟส |

**ฟันธง SA:** งานนี้ **ทำใน `DockKey.vue` = pleng-only โดยธรรมชาติ และถูกต้อง** (พี่เปาใช้ pleng) · **engine รองรับ config อยู่แล้ว ~80%** (id คงที่ · `hidden` · `place` · pin/reorder · persist) → **refine ไม่ใช่ redesign** · **แต่ต้องค้าน premise:** "แก้ครั้งเดียวได้ 2 เว็บ" **เป็นไปไม่ได้กับ dock** เพราะ phrakham ไม่มี dock ให้รับ — อย่าผูกฟีเจอร์พี่เปาไว้กับ shared package ข้ามเว็บที่ยังไม่มีจริง

---

## 1 · Q1+Q2 · แผนที่ shared core จริง (verify 2 repo · ไม่เดา)

### สิ่งที่ "แชร์ข้าม 2 เว็บ" จริง ๆ (วัดแล้ว)
| ไฟล์ | pleng | phrakham (`phrakham.life2`) | สถานะจริง |
|---|---|---|---|
| **`pk-scrollnav.js`** | `src/lib/` (147 บรรทัด) | `assets/` (147 บรรทัด · git-tracked) | ✅ **identical เป๊ะ (diff = 0)** — แชร์แบบ **ก๊อป-verbatim** in-sync วันนี้ |
| **`pk-drawer.js`** | `src/lib/` (311 บรรทัด · ใช้จริงใน `ShellBar.vue` ☰) | **ไม่มีใน main tree · `git ls-files` ไม่ track** (มีแต่ใน `.claude/worktrees/*` + build dirs) | ⚠️ **pleng ใช้ฝ่ายเดียว** · header ไฟล์เคลม "phrakham AND pleng share this" = **aspirational/drift** — phrakham live ใช้ `pk-navbar` ไม่ใช่ drawer นี้ |
| **`DockKey.vue`** (dock) | `src/components/` (629 บรรทัด · Vue) | **ไม่มี · phrakham ไม่มี dock** (ใช้ `pk-navbar.html`+`pk-navbar.js`) | ❌ **ไม่แชร์เลย** — คนละ paradigm (pleng=dock · phrakham=navbar) |

> **แชร์แบบก๊อป-verbatim ไม่ใช่ shared package** — ไม่มี npm/submodule กลาง · sync ด้วยมือ (ก๊อปไฟล์) → **`pk-scrollnav` in-sync วันนี้แต่ drift ได้ทุกเมื่อ** · `pk-drawer` drift ไปแล้ว (phrakham ไม่ track) = ตรง memory [[pleng-shared-core-shell-deep]] เป๊ะ

### DockKey = "core lib" ของ pleng เอง (ไม่ใช่ของ 2 เว็บ)
`DockKey.vue` header: *"Every studio page (ฝึกร้อง · แผ่นเพลง · แก้ไข) hands it a list of button descriptors; the engine owns everything else. So the three pages share ONE engine."* → **shared ในความหมาย "3 หน้าใน pleng ใช้ engine เดียว"** · import แค่ `vue` + `Icon.vue` · **ไม่แตะ `pk-scrollnav`/`pk-drawer`** → แก้ DockKey **ไม่กระทบไฟล์ที่แชร์ 2 เว็บเลย**

### ⛔ ตอบ Q2 ตรง ๆ (ค้าน premise · ตัวเลข/โค้ดชนะ)
**"แก้ dock ครั้งเดียวได้ 2 เว็บ" = ทำไม่ได้บนสถาปัตยกรรมปัจจุบัน** เพราะ **phrakham ไม่มี dock** (มี navbar) → ไม่มีอะไรรับการแก้. ถ้า P'Aim อยากให้ config ไปโผล่ที่ phrakham ด้วยจริง ๆ ต้อง **(ก) phrakham เปลี่ยนจาก navbar → รับ dock** + **(ข) สกัด dock core ข้าม framework** (Vue host + Quarto/vanilla host กินได้) เป็น shared package = **โปรเจกต์ใหญ่แยกต่างหาก** ไม่ใช่ "เติม config ให้ DockKey". **อย่าบล็อกฟีเจอร์พี่เปาไว้กับงานนี้.**

---

## 2 · Q3 · feasibility ราย element (เปิด `DockKey.vue` วัดจริง)

| พี่เปาขอ | DockKey วันนี้มีไหม | ช่องว่าง / งานที่ต้องเติม |
|---|---|---|
| **id คงที่ต่อปุ่ม (ชื่ออ้างอิง)** | ✅ **มีแล้ว** — ทุก descriptor มี `id` · `byId(id)` · `:data-cell="it.id"` | **0 — มีอยู่แล้ว** (P'Aim ขอสิ่งที่ระบบมีแล้ว) |
| **show/hide ปุ่ม** | 🟡 กลไก `hidden` มีในโมเดล (`visible=filter(!hidden)`) **แต่วันนี้ "หน้า" ตั้ง ไม่ใช่ผู้ใช้** · Setting page ทำแค่ **pin/reorder** | เติม: Setting page + ชุด `hiddenOverride` ต่อผู้ใช้ (แพตเทิร์นเดียวกับ `pins` ที่ persist อยู่แล้ว) |
| **ตำแหน่ง/ลำดับ** | ✅ pin + reorder (`togglePin`/`movePin`) ใน Setting page · `place` เป็น declarative | ~มีแล้ว (reorder ใน pins) · ย้าย anchor อิสระ = เติมถ้า UX ต้องการ |
| **settings (⚙)** | ✅ มี Setting page (pin/reorder + transparency) | 0 — ต่อยอดหน้าเดิม |
| **resize** | 🟡 **ย้าย/ลาก dock ได้** (grip drag + clamp) + collapse + transparency slider · **ขนาด(width/height) ปรับไม่ได้** | ถ้า "resize"=ย้าย → มีแล้ว · ถ้า=ปรับขนาด → **เติม (additive)** · **UX ต้องนิยาม "resize" ให้ชัด** |
| **toggle ชื่อ (โชว์/ซ่อน label)** | ❌ ยังไม่มี toggle · `name` ต่อปุ่มมี | เติม: flag `showLabels` + persist + render `name` แบบมีเงื่อนไข (additive) |
| **persist ต่อผู้ใช้** | ✅ **localStorage** namespaced `pleng.dockkey.<storeKey>.pins/collapsed/alpha` | **per-device มีแล้ว** · **cross-device(ต่อ user จริง) = ต้อง Supabase profile** (เฟสเสริม · เฉพาะทีมล็อกอิน · Tier-0 anon ไม่มี profile) |

**regression phrakham:** **ศูนย์** — `DockKey.vue` เป็น pleng-only · phrakham ไม่มี dock/DockKey → **ฟีเจอร์นี้แตะ phrakham ไม่ได้แม้อยากแตะ** → **ความกลัว "แตะผิดพัง 2 เว็บ" ไม่เกิดกับ dock** (จะเกิดก็ต่อเมื่อไปแตะ `pk-scrollnav`/`pk-drawer` ซึ่งงานนี้ไม่แตะ)

---

## 3 · เฟส (ฟันธง · UX จัด flow ในกรอบ)

| เฟส | ทำ | แตะ | ขนาด | 2-เว็บ? |
|---|---|---|---|---|
| **1 · user config บน DockKey** ⭐ | Setting page เพิ่ม show/hide ต่อปุ่ม + toggle ชื่อ + (ตำแหน่งใช้ pin/reorder เดิม) · persist localStorage | `DockKey.vue` + ITEMS ของแต่ละหน้า | **เล็ก–กลาง** (engine รองรับ ~80%) | pleng-only |
| **2 · persist ต่อผู้ใช้ (cross-device)** | ย้าย/มิเรอร์ prefs → Supabase `profiles` (เฉพาะทีมล็อกอิน) + RLS | +DB column + `store.js` | กลาง | pleng-only |
| **3 · resize ขนาด dock** (ถ้า UX นิยามว่าต้อง) | เพิ่ม handle ปรับขนาด + clamp (มี clamp primitive แล้ว) | `DockKey.vue` | เล็ก–กลาง | pleng-only |

**go:** เฟส 1 ทำได้ทันที (pleng-only · engine พร้อม · refine) · เฟส 2–3 รอ UX/P'Aim นิยาม (persist ข้ามเครื่องเอาไหม · "resize"=อะไร)

---

## 4 · 🚩 เชิงรุก — 2 เรื่องที่ P'Aim ควรรู้ (ไม่รอถาม)

1. **"core lib แชร์ 2 เว็บ" ในหัว P'Aim ไม่ตรงของจริง (สำหรับ dock):** dock ไม่แชร์เลย · แชร์จริงแค่ `pk-scrollnav` (identical) · `pk-drawer` **drift ไปแล้ว** (phrakham ไม่ track ทั้งที่ header เคลมแชร์) → ถ้าอยากได้ "แก้ครั้งเดียว 2 เว็บ" จริง ต้องลงทุน **shared package ข้าม framework** ก่อน = งานสถาปัตยกรรมแยก ควรตัดสินใจแยกจากฟีเจอร์พี่เปา
2. **drift risk ที่ควรเก็บกวาด (แยกงาน):** `pk-scrollnav` in-sync วันนี้แต่กันด้วยมือ (ก๊อป) → มี test `pk-scrollnav.test.js` ใน pleng ช่วยจับ · `pk-drawer` header เคลมเท็จว่า "phrakham copies verbatim" ทั้งที่ phrakham ไม่ track → ควรแก้คอมเมนต์ให้ตรงจริง (pleng-only) กัน AI/คนรุ่นหลังเข้าใจผิด

---

## 5 · ที่ SA ไม่ตัดสินแทน — ส่ง UX + รอ PM/P'Aim

1. **นิยาม "resize"** (ย้าย vs ปรับขนาด) = UX เคาะ → กำหนดว่าเฟส 3 ต้องทำไหม
2. **persist ข้ามเครื่องเอาไหม** (localStorage พอ หรือ profile) = P'Aim เลือก (พี่เปาเครื่องเดียว localStorage พอ)
3. **จะลงทุน shared package ข้าม 2 เว็บไหม** = P'Aim ตัดสิน **แยกจากฟีเจอร์นี้** (อย่าบล็อกพี่เปา)
4. **ยังไม่ build** — UX ทำ flow/mockup (เลือกปุ่มไหน config ได้ · หน้าตา Setting) → ผมตรวจ feasibility คู่ → P'Aim เคาะ GATE 1 → DS + จ่าย dev

---

*verify 2 repo จริง 2026-07-17 · SA (feasibility) · pleng `studio-shell-redesign` · phrakham `phrakham.life2`*
