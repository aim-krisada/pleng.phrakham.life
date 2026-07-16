# Report — icon-v2 (ไอคอน/favicon: พื้นขาว + กุญแจทองอุ่น)

**สาย:** `icon-v2` · **PM:** pm26 · **branch worktree:** `claude/suspicious-jennings-d3d24e` (fork ฐานล่าสุด `studio-shell-redesign` — merge-base ✓)
**สถานะ:** เสร็จ · **P'Aim เคาะ "เอาตามที่แนะนำ" → build เฉด E `#C79A3E`** · รอ PM gate · **ยังไม่ merge/deploy** (ทำตามกฎ)

## ทำอะไร
เปลี่ยนชุดไอคอนจากพื้นเทาเข้ม #363636 (icon-refresh) → **พื้นขาว #ffffff ทึบเต็มขอบ + กุญแจทองอุ่นอ่อนลง** ตามที่ P'Aim เปลี่ยนใจ (16 ก.ค.)

## วิธีทำ (reproducible · self-contained)
สคริปต์ `docs/pm/icon-v2-proofs/build_icons.py` — ทำงานจาก source `docs/pm/icon-source/pleng-icon-source.png` โดยตรง (ไม่มี binary กลาง):
1. **แยกกุญแจ** ออกจากพื้นเทา = ใช้ค่าความแดง (bg R~54 vs gold R~207) เป็น coverage-alpha แบบ anti-aliased × alpha ต้นฉบับ → เก็บเฉพาะ blob ใหญ่สุด (ตัดขอบ bevel จางของ tile เดิมทิ้ง)
2. **รีคัลเลอร์** ทองอุ่น + วางบนพื้นขาวทึบ (composite `gold·α + white·(1−α)`, alpha=255 ทุกพิกเซล → ทึบจริง)
3. กุญแจอยู่กึ่งกลางเป๊ะ (bbox 268×660 · center ตรงกลางภาพ)

รัน: `py -3.14 docs/pm/icon-v2-proofs/build_icons.py build "#CBA04A"` (เปลี่ยนเฉดได้ทันที · deterministic — build ซ้ำได้ md5 เท่ากัน)

## เฉดทองให้ P'Aim เลือก (ฟันธงด้วยตา)
เปิดภาพ `docs/pm/icon-v2-proofs/shades-any.png` — 5 เฉด อ่อนลง/อุ่นขึ้นกว่าทองเดิม #CF9B07:

| code | hex | โทน |
|---|---|---|
| A | `#C9982F` | เข้มสุดในชุด (คมที่ favicon เล็ก) |
| B | `#CBA04A` | goldenrod อ่อนนุ่ม |
| C | `#D0A54F` | ทองอุ่น |
| D | `#D8B063` | honey (อ่อนสุด) |
| **E ← เลือก (P'Aim "ตามที่แนะนำ")** | `#C79A3E` | balanced — อ่อน/อุ่นลงกว่าปัจจุบัน + คมพอที่ favicon 32px |

## ⚠️ caveat favicon (P'Aim รับทราบแล้ว) — มีผลกับการเลือกเฉด
กุญแจซอล+กางเขน = รายละเอียดเยอะ · ที่ **16px กลืนเป็นก้อนจาง** ทุกเฉด (`favicon-16-shades.png`) — เลี่ยงไม่ได้กับโลโก้ละเอียดบนพื้นสว่าง
- แต่ **แท็บเบราว์เซอร์ยุค high-DPI ใช้ 32px** (`favicon-32-shades.png`) → เห็นกุญแจ+กางเขนชัด
- **เฉดเข้มขึ้น (A/E) คมกว่าที่ขนาดเล็ก** · เฉดอ่อน (D honey) สวยตอนใหญ่แต่จางสุดที่ favicon
- **PM ข้อเสนอ:** ถ้า P'Aim เน้นให้ favicon อ่านออก → เอน A/E · ถ้าเน้นความนุ่มตอนใหญ่ (apple-touch/PWA) → B/C

## any vs maskable (แยกตามที่เคาะ)
- **any** (favicon 16/32/48 · apple-touch-180 · android-192/512) = กุญแจสูง 84% ของกรอบ (เต็มขอบกว่า)
- **maskable-512** = กุญแจสูง 72% → อยู่ในวง safe-zone 80% ครบ ไม่โดนตัด (พิสูจน์ `maskable-proof.png` วงแดง = safe circle)
- ทุกไฟล์พื้นขาวทึบ · จตุรัส

## ไฟล์ที่แตะ (scope สะอาด — ไม่ชน cleanup-round)
- `public/` 7 ไฟล์: `favicon.ico` (multi-res 16/32/48 · 2946b) · `favicon-16x16.png` · `favicon-32x32.png` · `apple-touch-icon.png` · `android-chrome-192x192.png` · `android-chrome-512x512.png` · `maskable-512.png`
- **`site.webmanifest` ไม่ต้องแก้** — โครง 2-entry (any+maskable) + ชื่อไฟล์ถูกอยู่แล้ว · name/short_name ไทยคงเดิม
- **`index.html` ไม่แตะ** — meta `apple-mobile-web-app-title "เพลง.พระคำ"` คงเดิม (ยืนยัน git status สะอาด)
- (`docs/pm/icon-v2-proofs/` = สคริปต์ + proof images)

## DoD ✓
- ✓ พื้นขาวทึบเต็มขอบ · จตุรัส · any กุญแจเต็ม / maskable ในวง 80%
- ✓ `npm run build` ผ่าน · dist ครบ (icons md5 = public ตรงกัน) · index.html คง meta app-name
- ✓ favicon multi-res (16/32/48 ในไฟล์เดียว)
- ✓ หลักฐาน: `shades-any.png` · `favicon-16-shades.png` · `favicon-32-shades.png` · `maskable-proof.png`
- ✓ **build ด้วยเฉด E `#C79A3E`** (P'Aim เคาะ "ตามที่แนะนำ") · dist rebuild แล้ว (md5 = public) → **รอ PM gate → รอบ 29**

## ทดสอบมือถือ
dev server `--host` · **Network URL:** [http://192.168.1.124:5321/](http://192.168.1.124:5321/) (favicon เห็นในแท็บ · รูป 512: [/android-chrome-512x512.png](http://192.168.1.124:5321/android-chrome-512x512.png))
