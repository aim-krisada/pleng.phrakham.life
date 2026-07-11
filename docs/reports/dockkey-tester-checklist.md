# รายงาน — Tester (QA gate) · DockKey ฝึกร้อง

**สาย:** `tester-qa` (แตกจาก `studio-shell-redesign`) · infra reusable
**เทียบกับ:** `dockkey-dev` HEAD `7a09023` (phase 2 · 300 test เดิม)
**ผล verify branch:** `tester-verify-dockkey` (= dockkey-dev + tester infra · สิ่งที่ pm7 จะได้ตอน merge)

---

## สรุป F60+ (อ่าน 60 วิ)
- **ชั้น 1 (AUTOMATE) เสร็จ** — เขียน helper กลาง reusable (`src/test-utils/ui-invariants.js`) ฝังกฎ `docs/ui-standards.md` เป็นเทสต์ · self-test **เขียว 10/10** (บน `tester-qa`, มาตรฐานยืนได้เอง ไม่ผูก DockKey)
- **รัน spec กับ dockkey-dev HEAD `7a09023` → แดง 3 ข้อจริง** (เครื่องจับเอง ไม่ใช่ความเห็น):
  1. **[critical a11y] `aria-required-children`** — Setting `.dk-panel role="menu"` มีลูกเป็น `.dk-prow` (ไม่ใช่ `menuitem*`) ผิด WCAG 4.1.2 · **ข้อนี้ไม่อยู่ใน checklist ด้วยซ้ำ — automation เจอเพิ่ม**
  2. **B9 / §A** — ปุ่มคีย์ (kind `menu`) ยังมีลูกศร ▾ (`.dk-caret`) ทั้งที่กดแล้วเปิด popup อยู่แล้ว
  3. **B11 / §A** — หัว Setting popup ยังมีคำอธิบาย `⚙ ตั้งค่า — ปรับได้ที่นี่ · 📌 = ปักขึ้นแถบ`
- **VERDICT = ยังไม่ผ่าน** → ส่งกลับ pm7 · **P'Aim ยังไม่ควรดู**
- **สำคัญ:** dockkey-dev = งาน engine/phase-2 (print/edit/MP3) · **ยังไม่ได้ทำรอบแก้ checklist B1–B12** (3 แดงข้างบนยืนยัน) → นี่ยัง **ไม่ใช่ ชั้น-2 sign-off เต็ม** · เต็มต้องรอ dev รอบแก้ B1–B12 + Network URL ใหม่ แล้วผมตรวจ §0/§A/§B ครบ 3 breakpoint
- 3 แดงนี้ = **เป้า TDD ให้ dev** (แก้จนเทสต์เขียว) ไม่ใช่แค่ prose

---

## 1 · ชั้น 1 · Test infra (durable · reusable · ชั้นแข็งสุด)

**ไฟล์ (แตะเฉพาะ test + helper + package.json ตามรั้ว):**
- `src/test-utils/ui-invariants.js` — helper กลาง (component-agnostic · ใช้ซ้ำกับ dock แผ่นเพลง/แก้ไข + popup อื่น)
- `src/test-utils/ui-invariants.test.js` — self-test ของ helper (10/10 เขียว · พิสูจน์ helper ถูก โดยไม่ผูกกับ DockKey)
- `src/components/DockKey.invariants.test.js` — spec ใช้ helper กับ DockKey (อยู่บน `tester-verify-dockkey`; ให้ pm7 land คู่กับ dockkey-dev)
- `package.json` — เพิ่ม devDep `axe-core` เท่านั้น

**รัน:**
```sh
npx vitest run src/test-utils/ui-invariants.test.js            # helper self-test (tester-qa)
npx vitest run src/components/DockKey.invariants.test.js       # DockKey (บน verify branch)
```

**2 Tier — ตรงตามความจริงของ jsdom (สำคัญ · กันหลอกตัวเอง):**

| Tier | เช็ก | jsdom เชื่อได้ไหม | วิธี |
|---|---|---|---|
| **A** | axe a11y (role/name/label/aria) · popup เปิดทีละ 1 · ไม่มี caret บนปุ่มเปิด popup · ไม่มี prose ในหัว popup · Esc ปิด · focusable | ✅ เชื่อได้ | `npm test` (แดงถ้าไม่ผ่าน) |
| **B** | no-scroll (`scrollWidth≤clientWidth`) · target-size ≥44px · contrast | ❌ jsdom = layout 0×0 | ฟังก์ชันมีแล้ว แต่ **gate ด้วย `hasLayout()`** → jsdom คืน `available:false` (spec **skip** ไม่ใช่ผ่านหลอกๆ) · วัดจริงในเบราว์เซอร์ |

> ทำไมต้องแยก Tier: dev เดิมรายงานเองว่า "viewport MCP = 0×0 → clamp/ไม่ล้นขอบ เช็คไม่ได้ ฝากพี่เอม/พี่เปามือถือ" — Tier B คือช่องนั้น · helper ไม่ปล่อยให้ jsdom เขียวหลอกในข้อที่วัดไม่ได้

---

## 2 · ผล automate เทียบ dockkey-dev HEAD `7a09023`

`vitest run` (helper self-test + DockKey spec) = **17 tests · 14 ผ่าน · 3 แดง**

### 🔴 แดง (ต้องแก้ก่อน)
| # | ข้อ | หลักฐาน (จากเทสต์) | map checklist |
|---|---|---|---|
| 1 | a11y critical | `aria-required-children: .dk-pop` (Setting `.dk-panel role="menu"` ลูกไม่ใช่ menuitem) | WCAG 4.1.2 / §0.1 · **ใหม่ (ไม่อยู่ใน B1–B12)** |
| 2 | caret บนปุ่ม menu | `caretOnTriggerViolations = [ 'คีย์' ]` | **B9 / §A** |
| 3 | prose ในหัว popup | `popupHeaderProse = [ '⚙ ตั้งค่า — ปรับได้ที่นี่ · 📌 = ปักขึ้นแถบ' ]` | **B11 / §A** |

### 🟢 เขียว (engine ทำถูกแล้ว — ยืนยันไม่ regress)
- axe: dock ปิด = 0 violation · เมนู dropdown (`.dk-dd role=menu` + `menuitemradio`) = 0 violation
- popup เปิดทีละ 1 (เปิด Setting แล้วเปิดคีย์ → เหลือ 1)
- Esc ปิด popup ได้

**ข้อเสนอแก้ (ให้ dev):**
- #1 → `.dk-panel` ไม่ควรเป็น `role="menu"` (มันคือฟอร์มตั้งค่า ไม่ใช่เมนู) → ใช้ `role="group"`/`role="dialog"` + `aria-label` หรือเอา role ออก · แล้ว `.dk-dd` (dropdown จริง) คง `role=menu` ไว้
- #2 → เอา `<Icon name="chevron-down" class="dk-caret">` ออกจาก kind `menu` (§A: ทุกปุ่มเปิด popup อยู่แล้ว ▾ ซ้ำซ้อน)
- #3 → ลบ `.dk-ptitle` ข้อความ how-to (B11) — เหลือ UI self-evident

---

## 3 · Checklist §0/§A/§B — coverage map (สถานะ ณ dockkey-dev `7a09023`)

`A`=auto (npm test) · `V`=ต้องดูในเบราว์เซอร์ 3 breakpoint · `⏳`=รอ dev รอบแก้ B1–B12 ก่อนตรวจเต็ม

| ข้อ | วิธีตรวจ | สถานะตอนนี้ |
|---|---|---|
| §0.1 ไม่ตาม P'Aim อย่างเดียว | manual/process | — (ทำใน brief/report) |
| §A popup ชิดขวา จากขอบบน dock | V (position) | ⏳ Tier-B browser |
| §A ทุก popup ไม่มี scroll | A(Tier-B guard)+V | ⏳ วัดในเบราว์เซอร์ (jsdom วัดไม่ได้) |
| §A spacing สม่ำเสมอ | V | ⏳ browser |
| §A ไม่มี caret ▾ บนปุ่มเปิด popup (B9) | **A** | 🔴 **แดง** (`คีย์`) |
| §A ปุ่มแถบ = ไอคอนกระชับ (B7) | A(DOM)+V | ⏳ ตรวจตอน verify |
| §A ไม่มี prose ในหัว popup (B11/B12) | **A** | 🔴 **แดง** (Setting header) |
| §A button hierarchy (1 primary/บริบท) | V | ⏳ browser (ดูสีปุ่ม download/play) |
| B1/B6 timeline ไม่ซ้อนปุ่มคีย์ + margin | V | ⏳ browser |
| B2 เลือกท่อน sync timeline ถูก | A(logic)+V | ⏳ ตรวจตอน verify |
| B3 window เปิดเพิ่มชิดขวา | V(position) | ⏳ browser |
| B4 ตัด "ไม่เลือก = ทั้งเพลง" | A(DOM) | ⏳ (ตอนนี้ default = whole song ยังไม่เปลี่ยน — ดู dev report ข้อ 1) |
| B5 หัว popup ท่อน "จะซ้อม→จะฟัง" | A(DOM) | ⏳ ตรวจตอน verify |
| B7 ปุ่มดาวน์โหลด เหลือไอคอน | A(DOM)+V | ⏳ |
| B8 คลิก download แล้ว label หาย | A(logic)+V | ⏳ |
| B9 ปุ่มคีย์ ตัด ▾ | **A** | 🔴 **แดง** |
| B10 setting ไม่มี horizontal scroll | **A(Tier-B)**+V | ⏳ Tier-B browser |
| B11 ตัดหัว setting | **A** | 🔴 **แดง** |
| B12 margin ใน setting ดี | V | ⏳ browser |
| a11y aria-required-children (ใหม่) | **A** | 🔴 **แดง** |

> ข้อ ⏳ ยัง **ไม่ตรวจเต็ม** เพราะ B1–B12 ส่วนใหญ่ dev ยังไม่ได้แก้ (dockkey-dev = engine/phase-2) · เมื่อ dev ส่งรอบแก้ + Network URL ใหม่ → ผมรัน auto + สายตา 3 breakpoint ครบ แล้วอัปเดตไฟล์นี้

---

## 4 · Tier-B automation (no-scroll · target-size · contrast) — เสนอ pm7 เคาะ

jsdom วัด geometry ไม่ได้ · helper พร้อมแล้ว รอ "ที่วัดจริง" 2 ทาง:
- **(แนะนำตอนนี้)** tester รัน helper เดียวกันผ่าน **browser-MCP กับ dev server จริง 3 breakpoint** (มือถือ/แท็บเล็ต/desktop) ตอน verify — บันทึกค่าที่วัดลงไฟล์นี้ · ไม่เพิ่ม dep หนัก · ตรงกับที่ dev มี `--host` อยู่แล้ว
- **(ถ้าอยากบังคับใน CI)** เพิ่ม `@vitest/browser` + Playwright → no-scroll/target-size/contrast เป็นส่วนของ `npm test` เลย · **แต่ต้องโหลด Chromium (~130MB) + เสี่ยง flaky บน Windows** → เป็นการตัดสินใจ dep/CI · **ยังไม่ทำเองจนกว่าจะเคาะ**

**คำแนะนำผม:** ใช้ browser-MCP measured ตอน verify ก่อน (เบา · พอสำหรับ gate) · ค่อยยก @vitest/browser ถ้าเจอ regression geometry ซ้ำ

---

## 5 · Verdict + ขั้นต่อไป
- **NOT PASS** (3 แดง) → **ส่งกลับ pm7 → dev** · P'Aim ไม่ดูจนเขียวครบ
- dev รอบแก้ = แก้ #1–#3 (auto) + B1–B12 ที่เหลือ → ส่ง branch + Network URL ใหม่
- ผมกลับมา: รัน auto (ต้องเขียวหมด) + Tier-B/สายตา 3 breakpoint ครบทุกข้อ → อัปเดตไฟล์นี้ให้เขียวครบ → ping pm7 "พร้อม P'Aim"
- durable: เสร็จ DockKey ฝึกร้อง → ชุดเดียวกันกับ dock แผ่นเพลง + แก้ไข
