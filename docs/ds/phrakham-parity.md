# DS — pleng look & feel parity กับ phrakham (Section B)

**สาย:** SA (`analyze-phrakham-style` · context ครบจากรอบวิเคราะห์) · **จ่ายโดย:** pm22 · 13 ก.ค. 2026
**brief:** `docs/pm/brief-phrakham-parity.md` · **SSOT วิเคราะห์:** `docs/reports/analyze-phrakham-style.md` (§B)
**ค่าอ้างอิง phrakham:** `C:\gl\krisada\phrakham.life2\theme.scss` + **วัดสดจาก live** (in-app browser · 13 ก.ค.)
**ปลายทางแก้:** `src/styles.css` (เว้น B-3 = Guide.vue/About.vue) · **สายนี้เขียน spec เท่านั้น ไม่แตะ src**

---

## 🔗 Shared-core — token แหล่งเดียว เพลง+พระคำ (ข้อกำหนดใหม่ P'Aim · เคาะก่อน B)

**เป้า P'Aim:** เพลง+พระคำใช้ token แหล่งเดียว **"แก้ที่เดียว ทั้งคู่ตาม"** · **ทิศทาง P'Aim: ยึดแพตเทิร์นเดิม** (พระคำ=SSOT · เพลงดึงมาใช้แบบ `pk-scrollnav.js`) — ไม่สร้างสถาปัตย์ใหม่

### แพตเทิร์นปัจจุบัน (verify จากโค้ดจริง 13 ก.ค. — ไม่อิง memory เก่า)
- **pk-scrollnav.js = ต้นแบบ "shared framework-free asset":** SSOT = `phrakham.life2/assets/pk-scrollnav.js` (พระคำเจ้าของ) · เพลงถือ **copy verbatim** `src/lib/pk-scrollnav.js` (diff = ต่างแค่ CRLF/LF · เนื้อหาเท่ากัน) · import `src/main.js:7` · สคริปต์อ่านสีผ่าน `var(--pk-accent, #8B4513)` (มี fallback) · เพลง alias `--pk-accent: var(--brand)` (`styles.css:17`) · **พระคำไม่ define --pk-accent → ใช้ fallback ในสคริปต์**
- **Token ตอนนี้ซ้ำ 2 ที่จริง (ที่ P'Aim อยากเลิก):** พระคำ `theme.scss` (SCSS `$body-color:#2D2A26`/`$link-color:#8B4513`/`$font-size-base:1.06rem` + hex ฝัง ~30 จุด) · เพลง `styles.css:3-11` (`--brand:#8b4513` ฯลฯ) — **ค่าตรงกันเป๊ะทั้งคู่** แค่ต้องแก้ 2 ที่ · **พระคำยังไม่มีไฟล์ token CSS-var** (grep `:root/--pk-` assets/*.css = ไม่เจอ · มีแค่ `--pk-navh`/`--pk-fs` runtime)

### ขยายแพตเทิร์นเดิม → design tokens (เปลี่ยนแค่ .js เป็น .css)
1. **สร้าง SSOT ที่พระคำ:** `phrakham.life2/assets/pk-tokens.css` (framework-free CSS custom properties):
   ```css
   :root{ --pk-brand:#8B4513; --pk-ink:#2D2A26; --pk-muted:#757575;
     --pk-cream:#FAF6F0; --pk-cream-hi:#FCFAF6; --pk-line:#E0D6C8;
     --pk-footer:#7A6A4E; --pk-stamp:#827356;
     --pk-lh-loose:1.8; --pk-radius-card:14px; --pk-radius-pill:20px;
     --pk-shadow-menu:0 8px 24px rgba(0,0,0,.16); }
   ```
2. **พระคำใช้เอง:** เพิ่มใน `_quarto.yml` include-in-header (มี hook อยู่แล้ว :80) + resources · theme.scss เปลี่ยน hex ฝัง → `var(--pk-brand)` (งานฝั่งพระคำ · ประสาน pk pm4 · ยังไม่ทำ = คงค่าเดิม เท่าไฟล์ ไม่มี diff)
3. **เพลงดึงมา (เหมือน pk-scrollnav):** copy `pk-tokens.css` → `src/pk-tokens.css` (sync header) · import ก่อน styles.css · ใน styles.css เปลี่ยน `--brand:#8b4513` → **`--brand: var(--pk-brand)`** (map บางๆ · โค้ดเพลงเดิมที่ใช้ `--brand` ทำงานต่อ ไม่ต้องแก้ที่อื่น)
4. **ผล:** แก้สีที่ `pk-tokens.css` → พระคำตามทันที + copy ไฟล์ไปเพลง → เพลงตาม · **ระเบียบ sync เดียวกับ pk-scrollnav**

### feasibility — ตรงๆ (KISS)
| share ได้ ✅ | share ไม่ได้ ❌ |
|---|---|
| Design tokens เป็น CSS var: **สี · radius · shadow · line-height** (runtime · framework-free) | Vue component ↔ Quarto/.qmd · Bootstrap/Quarto layout (คนละ framework) |

**ข้อจำกัดที่ต้องรู้:**
- **ตัวหนังสือฐาน (B-1) แชร์ยาก → เก็บ local** — พระคำได้ 18px จาก **root 17px** (`--bs-root-font-size`) ×1.06rem · เพลง root 16px · `--pk-fs-base` ตัวเดียวให้ 18px ทั้งคู่ไม่ได้ (root ต่าง) · ถ้าเพลงตั้ง root 17px จะ**รั่วเข้าแผ่นเพลง** (sheet rem อิง root · SongViewer.vue:544) → font-size ให้เพลงชดเชย local ตาม B-1
- **พระคำมี SCSS `$`-vars ป้อน Bootstrap** — SCSS อ่าน CSS var ตอน compile ไม่ได้ → พระคำเก็บ `$`-var ชุดเล็ก (3-4 ตัว) mirror pk-tokens.css (คอมเมนต์กำกับ)
- **Deploy แยก repo** (Pages คนละ build) → ไฟล์ต้องอยู่แต่ละ repo → **copy-with-sync** (import ข้าม repo พังบน CI) = แพตเทิร์น pk-scrollnav เป๊ะ

### แนะนำ + phase (เสี่ยงต่ำ · ค่าตรงกันอยู่แล้ว = refactor เปล่า ไม่เปลี่ยนภาพ)
- **เอา:** `pk-tokens.css` SSOT ที่พระคำ · เพลง copy+alias · แชร์ **สี/radius/shadow/line-height** · **font-size เก็บ local** · **ไม่เอา submodule/monorepo/build tooling**
- **Phase 1 (เพลง · รอบนี้):** สร้าง pk-tokens.css + เพลง copy+alias `--brand:var(--pk-brand)` → verify ไม่มี diff ภาพ
- **Phase 2 (พระคำ · ประสาน pk pm4):** theme.scss hex → var(--pk-*) ให้พระคำ consume ไฟล์เดียวจริง
- B ที่เป็น token (B-4 radius · B-3 line-height) → ใส่ใน pk-tokens.css เลย ("แก้ที่เดียวตั้งแต่ต้น")

**→ รอ P'Aim เคาะ shared-core นี้ก่อน** แล้ว DS B-1..B-6 ด้านล่างอิง token layer นี้

---

## ✅ B-2 = DROPPED (P'Aim เคาะ 13 ก.ค. · หัวเว็บตรงพระคำแล้ว ไม่ทำ)

**P'Aim เคาะทางเลือก (ก): ตัด B-2 ทิ้ง** — header เพลง `#f8f9fa` = พระคำเป๊ะอยู่แล้ว "เหมือนพระคำ" = ไม่ต้องแก้ · **scope final = B-1, B-3, B-4, B-5, B-6**

หลักฐานที่ทำให้เคาะ (วัดสด live — B-2 ตามที่ brief สั่งจะทำให้ *ต่าง* จากพระคำ):

| | shell-bar / navbar background | brand text |
|---|---|---|
| pleng (`.shell-bar`) | **`#f8f9fa`** (rgb 248,249,250) | น้ำตาล `#8B4513` |
| phrakham (`.navbar`) | **`#f8f9fa`** (rgb 248,249,250) — วัดสด | น้ำตาล `#8B4513` (`.navbar-title`) |

รอบวิเคราะห์ (report §B) ผมสมมติจาก `theme.scss` ว่าพระคำเป็น "ครีมอุ่น" (เพราะ theme ตั้ง brand เป็นน้ำตาลแต่ไม่ override navbar bg) — **แต่ค่าจริงของ navbar = cosmo default `#f8f9fa` = เทาเย็นเท่า pleng เป๊ะ** · report ผมกับ brief จึง inherit สมมติที่ผิด

**✅ P'Aim เลือก (ก): ตัด B-2 ทิ้ง** (header ตรงพระคำแล้ว) · DS ด้านล่างสเปก B-1,3,4,5,6 เท่านั้น

---

## Scope guards (คัดจาก brief — ห้ามข้าม)
- **refine ไม่ redesign** — ปรับค่าที่มีอยู่ ไม่รื้อ component/logic
- **ห้ามแตะ:** line-height/ขนาดแผ่นเพลง (SongSheet/NoteRow/SongViewer — จงใจแน่นเพื่อโน้ต) · dock/editor logic · โทเคน**สี** (ตรงพระคำแล้ว) · stack (Vue คงเดิม)
- ทุกจุด = cosmetic/token เท่านั้น · ต้องผ่าน WCAG contrast เดิม (โทเคนสีไม่เปลี่ยน → contrast เดิมทั้งหมด)
- **ห้ามแตะไฟล์นอก scope** ที่ระบุต่อ B-x

---

## B-1 ⭐ — ขนาดตัวหนังสือฐาน (body 17→18px เท่าพระคำ)

- **ไฟล์/บรรทัด:** `src/styles.css:42`
- **ค่าเดิม → ค่าใหม่:** `--fs-base: 1.06rem;` → **`--fs-base: 1.125rem;`**
- **ทำไม 1.125:** root pleng = 16px (ค่าเบราว์เซอร์มาตรฐาน) · 16 × 1.125 = **18px** = body ของพระคำ (วัดสด 18.02px = root 17 × 1.06) · (brief เขียน 1.12rem = 17.92px — ใช้ **1.125rem** เพื่อชน 18px พอดี)
- **กระทบอะไร:** ทุกอย่างที่อ้าง `--fs-base` โตขึ้น ~6% พร้อมกัน (จงใจ — ทั้ง chrome ขยับเข้าหา rhythm พระคำ): `body` (:92), `button/.btn` (:396), `input/select/textarea` (:419), `.sb-brand` (:209), `.sb-text` (:237) · touch target เป็น px (44px) → เท่าเดิม ตัวหนังสือโตภายใน
- **✅ พิสูจน์แล้วว่าไม่รั่วเข้าแผ่นเพลง:** แผ่นเพลง font-size มาจาก `.sheet-scale :style="{ fontSize: readingFontScale + 'rem' }"` (`SongViewer.vue:544`) — **`rem` = อิง root (16px) ไม่ใช่ `--fs-base`** → เปลี่ยน `--fs-base` ไม่แตะแผ่นเพลง
- **before/after:** body computed 16.96px → **18px** · ปุ่ม/อินพุต/แบรนด์ โต ~6% · แผ่นเพลง = เท่าเดิม
- **AC (ตรวจได้):**
  - `getComputedStyle(document.body).fontSize` = **`18px`** (±0.2) ที่ zoom 100% / root 16px
  - เปิดหน้าแผ่นเพลง (ยังไม่แตะ ก−/ก+): ขนาดโน้ต/เนื้อ **เท่าเดิมกับก่อนแก้** (no regression)
  - ปุ่มใน shell-bar สูงยังคง ≥44px (touch target ไม่เสีย)
- **ขนาด:** S · **เสี่ยง logic:** ต่ำ (reflow เล็กน้อยจากตัวหนังสือโต · ตรวจ overflow มือถือ 360/412)

## B-2 ❌ DROPPED — ไม่ทำ (P'Aim เคาะ · หัวเว็บตรงพระคำแล้ว)

- `src/styles.css:196` `background: #f8f9fa;` = **เท่าพระคำเป๊ะ** (วัดสด phrakham navbar = `#f8f9fa`) → "เหมือนพระคำ" = **ไม่แตะ**
- **Dev: ห้ามแก้ shell-bar background** · **AC (regression):** header คง `#f8f9fa` เท่าเดิม

## B-3 — บรรทัดโปร่งเฉพาะหน้าอ่าน (Guide/About · 1.6→1.8)

- **ไฟล์:** `src/views/Guide.vue`, `src/views/About.vue` (+ 1 rule ใน `src/styles.css`)
- **ค่าเดิม:** หน้าอ่านสืบทอด body `line-height: var(--lh-normal)` = **1.6** (`styles.css:93`) · พระคำ prose = **1.8** (`theme.scss:13`, วัดสด body line-height 1.8)
- **วิธีทำ (scope ให้แคบ ไม่โดนแผ่นเพลง):**
  1. Guide.vue: root `<div>` (บนสุดของ `<template>`) → เพิ่ม `class="reading-page"`
  2. About.vue: root `<div>` (บรรทัด 2) → เพิ่ม `class="reading-page"`
  3. `src/styles.css` เพิ่ม rule ใหม่:
     ```css
     /* หน้าอ่าน (คู่มือ/เกี่ยวกับ) = prose rhythm โปร่งแบบ phrakham (1.8).
        ผูกกับหน้าอ่านเท่านั้น — ไม่แตะแผ่นเพลง (SongViewer จงใจแน่นเพื่อโน้ต). */
     .reading-page { line-height: var(--lh-loose); }   /* 1.8 */
     ```
- **ห้าม:** แตะ `--lh-normal`/body line-height (กระทบทั้งไซต์) · แตะ SongSheet/SongViewer
- **before/after:** ย่อหน้าใน คู่มือ/เกี่ยวกับ อากาศเยอะขึ้น (1.6→1.8) · หน้าอื่น + แผ่นเพลง = เท่าเดิม
- **AC:**
  - `getComputedStyle(document.querySelector('.reading-page')).lineHeight` ≈ 1.8 × font-size (เช่น 18px → ~32.4px)
  - หน้าแผ่นเพลง: `.song-line-lyrics` line-height ยัง = **1.35** (`SongSheet.vue:411/415` · no regression)
  - รายการเพลง (SongList) line-height = เท่าเดิม (ไม่ได้ใส่ `.reading-page`)
- **ขนาด:** S · **เสี่ยง:** ต่ำ (scope ที่ 2 view)

## B-4 — มุมโค้ง การ์ด/ชิป (นุ่มขึ้นแบบพระคำ)

- **การ์ด:** `src/styles.css:431` — `.card { … border-radius: 10px; }` → **`14px`** (พระคำ card/picker = 14px · `theme.scss:291`)
- **ชิปเลือกท่อน:** `src/styles.css:576` — `.section-chip { … border-radius: 16px; }` → **`20px`** (พระคำ pill/`.pk-study-ref` = 20px · `theme.scss:46`)
- **before/after:** การ์ดมุมนุ่มขึ้นเล็กน้อย · ชิปกลมขึ้นเป็น pill เต็มตัว
- **AC:**
  - `.card` border-radius computed = **`14px`**
  - `.section-chip` border-radius computed = **`20px`**
  - ไม่มี element อื่นเปลี่ยน radius (แก้แค่ 2 selector นี้)
- **ขนาด:** S · **เสี่ยง:** ไม่มี (cosmetic)

## B-5 — ปุ่มรองสไตล์ ghost (คงปุ่มหลักทึบ)

- **ไฟล์/บรรทัด:** `src/styles.css:390-415`
- **สถานะ:** ปุ่ม**หลัก** (default `button,.btn`) = ทึบน้ำตาล `background:var(--brand);color:#fff` (:391-392) · ปุ่ม**รอง** `.secondary` = **ghost อยู่แล้ว** (`background:var(--cream);color:var(--ink);border:1px solid var(--line)` :402)
- **phrakham ghost (`.pk-btn`/`.pk-tool-btn`):** พื้น `#FAF6F0`(=--cream) · ขอบ `#E0D6C8`(=--line) · ตัวอักษร ink · hover `#F0E7D8`(≈--cream-hover) · active/มีค่า = ขอบน้ำตาล (`theme.scss:191-195`)
- **สิ่งที่ต้อง refine (เล็ก · ให้ตรง phrakham):**
  1. **คงปุ่มหลักทึบไว้** (`button,.btn` :390-400) — ไม่แตะ
  2. `.secondary` hover: ให้ขอบเป็นน้ำตาลตอน hover (ล้อ phrakham `.pk-btn:hover`/`.has`) — เพิ่มใน `@media (hover:hover)` block (:406-414):
     ```css
     button.secondary:hover { background: var(--cream-hover); border-color: var(--brand); }
     ```
     (เดิม :408 มีแค่ `background:var(--cream-hover)` → เติม `border-color:var(--brand)`)
- **ห้าม:** เปลี่ยนปุ่มหลักเป็น ghost · เปลี่ยนสีปุ่ม danger · แตะปุ่มใน dock (`.dk-*` — คนละ scope, อยู่ DockKey.vue)
- **before/after:** ปุ่มรอง hover ขึ้นขอบน้ำตาล = อ่านเป็นชุดเดียวกับ phrakham · ปุ่มหลักเหมือนเดิม
- **AC:**
  - ปุ่มหลัก: `background-color` = `rgb(139,69,19)` (#8B4513), `color` = `rgb(255,255,255)` — **ไม่เปลี่ยน**
  - `.secondary`: bg = `#FAF6F0`(--cream), border = `#E0D6C8`(--line), text = ink — **ไม่เปลี่ยน** · hover: border-color = `#8B4513`
- **ขนาด:** M (แต่ diff จริงเล็ก) · **เสี่ยง:** ต่ำ · **หมายเหตุ:** ถ้า P'Aim อยากให้ต่างชัดกว่านี้ ค่อยว่าอีกรอบ — DS นี้ทำแบบ minimal/refine

## B-6 — จัดกึ่งกลาง+ความกว้างหน้าอ่าน (คอลัมน์แบบพระคำ)

- **ไฟล์/บรรทัด:** `src/styles.css` (`--container` :58 = 900px · `.container` :122-127) + `.reading-page` (จาก B-3)
- **phrakham:** คอลัมน์เนื้อหา `minmax(500px, calc(850px - 3em))` ≈ **~800px** จัดกึ่งกลาง อากาศซ้าย-ขวาเยอะ (`theme.scss:232`)
- **วิธีทำ (scope หน้าอ่านเท่านั้น — ไม่ย่อรายการเพลง/แผ่นเพลง):** ให้ `.reading-page` แคบลงจัดกึ่งกลางในกรอบ container:
  ```css
  .reading-page { max-width: 820px; margin-inline: auto; }   /* ~เท่าคอลัมน์ prose พระคำ */
  ```
- **ห้าม:** แตะ `--container`/`.container`/`.studio-wide` (กระทบรายการเพลง + studio) — ทำที่ `.reading-page` เท่านั้น
- **before/after:** คู่มือ/เกี่ยวกับ = คอลัมน์แคบลง ~820px จัดกึ่งกลาง อ่านสบายแบบพระคำ · หน้าอื่นเท่าเดิม
- **AC:**
  - `.reading-page` max-width computed = **`820px`**, จัดกึ่งกลาง (margin ซ้าย=ขวา ที่จอ >820+padding)
  - SongList / studio container = เท่าเดิม (900/1160px)
- **ขนาด:** M · **เสี่ยง:** ต่ำ (scope 2 view)

---

## สรุป change plan + ลำดับ (quick-win → M)

| # | เปลี่ยน | ไฟล์:บรรทัด | เดิม → ใหม่ | ขนาด | เสี่ยง | สถานะ |
|---|---|---|---|---|---|---|
| **B-1** ⭐ | ตัวหนังสือ 18px | `styles.css:42` | `--fs-base` 1.06→**1.125rem** | S | ต่ำ | พร้อม |
| **B-4** | มุมโค้ง | `styles.css:431,576` | card 10→**14** · chip 16→**20** | S | ไม่มี | พร้อม |
| **B-3** | บรรทัดโปร่งหน้าอ่าน | Guide/About + `styles.css` | 1.6→**1.8** (`.reading-page`) | S | ต่ำ | พร้อม |
| **B-6** | คอลัมน์หน้าอ่าน | `styles.css` (`.reading-page`) | +max-width **820px** กึ่งกลาง | M | ต่ำ | พร้อม |
| **B-5** | ปุ่มรอง ghost hover | `styles.css:408` | +`border-color:var(--brand)` hover | M | ต่ำ | พร้อม |
| **B-2** ❌ | สีหัวเว็บ | `styles.css:196` | (เท่าพระคำแล้ว) | — | — | **DROPPED (ไม่ทำ · P'Aim เคาะ)** |

**Scope final = B-1, B-3, B-4, B-5, B-6** (B-2 ตัดทิ้ง) · **ลำดับ (ผลเยอะ-งานน้อย):** B-1 → B-4 → B-3 → B-6 → B-5

**Dev หมายเหตุ:** เปิด dev server `--host` ใส่ Network URL (`http://<IP>:<port>`) ในรายงาน (พี่เอม/พี่เปาเทสมือถือ) · self-verify computed style ตรง AC ทุกข้อ + เทียบภาพเคียงพระคำ (โดยเฉพาะ B-1 ที่จอ 360/412 ว่าไม่ overflow)

## Tester gate (AC เต็มทุกข้อ)
ตรวจ computed style ทุก B-x ที่ทำจริง (ตาม AC ด้านบน) · ทุก viewport (360/412 + desktop) · **regression check:** หน้าแผ่นเพลง (ขนาด/บรรทัดโน้ต เท่าเดิม) · dock ทำงานปกติ · ปุ่มหลักยังทึบน้ำตาล · โทเคนสีไม่เปลี่ยน (contrast เดิม)
