# Report — B047 sticky footer ทั่วทุกหน้า

**สาย:** dev (Surface) · **branch:** `b047-sticky-footer` (from `studio-shell-redesign`) · **ห้าม merge main/deploy**
**Network URL (LAN · มือถือจริง):** `http://10.215.141.98:5347` (dev server `--host`, port 5347)
**ไฟล์ที่แตะ:** `src/styles.css` (layout/footer rules) · `src/App.vue` (คลาส footer 1 บรรทัด) · `.claude/launch.json` (เพิ่ม config `b047`) — **ไม่แตะ EditorMode / NoteRow / logic ใดๆ · CSS/layout ล้วน · ไม่ hard-code สี**

---

## 1. ปัญหา (B047)

Footer ติดล่างจอเฉพาะหน้ารายการเพลง (B023 · เนื้อยาวพอดันลง). หน้าอื่น (ฝึกร้อง/แผ่นเพลง/แก้ไข/guide/about) เนื้อสั้น → footer ลอยกลางจอ มีที่ว่างขาวใต้เยอะ. ไม่มี sticky-footer infra กลาง (ไม่มี `min-height:100vh`/`#app` flex ที่ไหนเลย).

## 2. แก้ — sticky footer pattern มาตรฐาน (ทุกหน้าในครั้งเดียว)

| จุด | เดิม | ใหม่ | ผล |
|---|---|---|---|
| `#app` (mount root · หุ้ม ShellBar+main+footer) | block ธรรมดา | `display:flex; flex-direction:column; min-height:100vh; min-height:100dvh` | คอลัมน์เต็มความสูงจอ (`dvh` = แม่นบนมือถือ) |
| `main.container` | ไม่มี flex | `flex: 1 0 auto` | เนื้อดูดที่ว่างในคอลัมน์ → ดัน footer ลงล่าง · `shrink 0` = เนื้อยาวไม่ถูกบีบ (เลื่อนปกติ) |
| `footer.site-footer.footer-dock-clear` | — | `margin-bottom: calc(88px + env(safe-area-inset-bottom,0px))` | เว้นแถบล่างให้ footer พ้น music dock (fixed) บนหน้า Studio |

- **88px = ค่าเดียวกับ `.sheet-workspace` clearance เดิม** (`Studio.vue:434`) — ระยะที่โปรเจกต์ใช้กันไม่ให้ dock บังบรรทัดสุดท้ายอยู่แล้ว.
- **คลาส `footer-dock-clear` ผูกกับ route Studio** — `App.vue` มี `isStudio` (`/studio` + `/song/:id`) อยู่แล้ว → `<SiteFooter :class="{ 'footer-dock-clear': isStudio }" />` (Vue single-root inherit attrs). หน้าอื่นไม่มี dock = ไม่มี margin ส่วนเกิน.
- **ไม่ hard-code สี · ไม่มี token ใหม่** (มี `--sp-*` แต่ clearance ผูกกับ dock height เฉพาะ = คงตัวเลข 88 ให้ตรง SSOT เดิม).

## 3. Verify (worktree serve จริง · curl ยืนยัน `footer-dock-clear` ใน bundle)

> หมายเหตุ preview: viewport ของ preview browser คืน `innerHeight=0` → `100dvh` ยุบเป็น 0 วัดการเติมเต็มจอตรงๆ ไม่ได้ (ข้อจำกัดที่รู้กันของ preview). จึงพิสูจน์กลไก sticky ด้วยการ **บังคับ `#app` สูงคงที่ (4000px/3000px) แทนจอจริง** — ถ้า footer ถูกดันไปล่างสุดของกล่อง = pattern ทำงาน (บนจอจริง `dvh` จ่ายความสูงแทน 4000 ให้ผลเดียวกัน).

**Computed styles (viewport-independent) — wiring ถูกครบ:**
- `#app`: `display:flex` · `flex-direction:column` ✅
- `main.container`: `flex-grow:1 · flex-shrink:0 · flex-basis:auto` ✅
- footer หน้า home (`/guide`,`/about`,`/`): ไม่มีคลาส · `margin-bottom:0` ✅
- footer หน้า `/studio`: มี `footer-dock-clear` · `margin-bottom:88px` ✅ · `.sd-wrap` dock present ✅

**3 สถานการณ์ (ทดสอบ desktop 1280 + mobile 375 · ผลตรงกันทั้ง 2 กว้าง — กฎไม่ผูก breakpoint):**

| สถานการณ์ | วิธีวัด | ผล |
|---|---|---|
| **หน้าเนื้อสั้น → footer ล่างจอ** (about · เนื้อ 2426px < กล่อง 4000) | force `#app`=4000 | main โตเติมเต็ม · `footer.bottom=4000` = **pinned ล่างสุด** (ไม่ลอยกลาง) ✅ |
| **หน้าฝึกร้อง → footer ไม่ชน dock** (studio · dock `.sd-wrap` fixed) | force `#app`=4000 | `footer.bottom=3912` = **เว้น 88px** ให้ dock พอดี ✅ |
| **เนื้อยาว → เลื่อนปกติ** (songlist scrollH 25k) | วัด scroll | `shrink:0` → main คงความสูงเนื้อ · footer อยู่ท้าย · เลื่อนถึงได้ปกติ ✅ |
| **mobile 375** (about/studio) | force `#app`=3000 | about pinned (gap 0) · studio pinned + gap 88 · `flex-direction:column` คง ✅ |

- **console:** 0 error / 0 warning (preview_console_logs)
- **unit:** `vitest run` → **239 passed** (suite `notationLint.test.mjs` fail = ของเดิมบนฐาน · `process.exit` ใน standalone script · ไม่เกี่ยว CSS)
- **build:** ✅ `built in 2.17s` (font warnings = ของเดิม · runtime-resolved)

## 4. ขอบเขต / กันชน (ยึดตาม brief)

- แตะเฉพาะ `App.vue` (1 บรรทัด class binding) + `styles.css` (layout/footer) + `launch.json`.
- ⛔ **ไม่แตะ `EditorMode.vue`** (สาย refine ถือ) · ⛔ **ไม่แตะ `NoteRow.vue`** · ไม่แตะ logic.
- **ประสาน:** ไม่ชน S0/S1/S4 responsive (คนละ selector · S0 วาง token/base · sticky footer เป็น layout ระดับ `#app` ที่ไม่มีสายไหนแตะ). ถ้า S0 merge ก่อน = แค่ context lines รอบ `.container` (rebase ง่าย).

## 5. ค้าง / ฝาก PM

- **P'Aim verify LAN 5347 บนมือถือจริง** — เปิด ฝึกร้อง/แผ่นเพลง/guide/about ที่เนื้อสั้น ดู footer ติดล่างจอ (ไม่ลอยกลาง) และหน้าฝึกร้อง footer ไม่ถูก dock บัง.
- **88px clearance** = ค่ากลาง (dock sing/sheet). โหมดแก้ไข dock อาจสูงกว่า (มีแป้นโน้ต) — แต่ EditorMode นอกสโคปสายนี้ · ถ้า P'Aim เห็น footer เบียด dock ในโหมดแก้ไข ค่อยจูน follow-up.
