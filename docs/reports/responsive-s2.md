# Report — S2 Responsive polish (หน้ารายการเพลง / SongList)

**สาย:** dev (Surface) · **branch:** `responsive-s2` (from `studio-shell-redesign`) · **ห้าม merge / deploy**
**Network URL (LAN · มือถือจริง):** `http://10.215.141.98:5332` (dev server `--host`, port 5332)
**ไฟล์ที่แตะ:** `src/views/SongList.vue` (template + `<style scoped>` เท่านั้น) · `.claude/launch.json` (เพิ่ม config `s2`)
**ไม่แตะ:** logic / query / `songSearch.js` / `styles.css` / token ใหม่ / NoteRow

---

## 1. ทำอะไร (polish ตาม design system S0)

ยึด token ที่ S0 วางจริงใน `src/styles.css` (`--sp-*` `--fs-*` `--lh-*` `--touch-min`) — แทนค่า hard-code ทุกจุดในหน้ารายการเพลง:

| จุด | ก่อน | หลัง |
|---|---|---|
| **การ์ดเพลง** | stack เต็มความกว้าง 1 คอลัมน์ทุกจอ (เดสก์ท็อปเลื่อนยาว) | **responsive grid** — มือถือ 1 คอลัมน์ · ≥640px 2 คอลัมน์ · gap `--sp-3` (12px) |
| ช่องค้นหา | `min-height:48 font-size:1.02rem padding:10/14 (px)` | `--touch-min` (44) · `--fs-base` (16.96px, กัน iOS zoom) · pad `--sp-3/--sp-4` |
| filter chip "ยังไม่ตรวจ" | `min-height:40 font:0.92rem` (แตะเล็ก) | `--touch-min` (44) · `--fs-base` · pad `--sp-2/--sp-4` |
| dropdown ธีม | `min-height:40 font:0.92rem` (แตะเล็ก + iOS zoom) | `--touch-min` (44) · `--fs-base` (≥16px กัน zoom) |
| ชื่อเพลง | `1.05rem` | `--fs-lg` (18.4px) + `--lh-snug` — ลำดับชั้นชัดขึ้น |
| ป้าย ⚠️/✓ · key-chip · theme-tag | font/padding เป็น px | `--fs-xs` + pad `--sp-*` |
| inline `style=` 2 จุด (margin) | ฝังใน template | ย้ายเป็น class + token (`--sp-4`, `--sp-2`) |

**หลักที่ยึด:** ทุก focusable control ≥ `--fs-base` (16.96px) → iOS Safari ไม่ zoom-on-focus · ทุก control สูง ≥ `--touch-min` (44px, WCAG 2.5.5) · rhythm ทุกจุดเป็นตัวคูณ 4px grid.

## 2. Verify (preview_resize 3 breakpoint + วัดค่าจริงด้วย preview_inspect/DOM)

| เช็ก | desktop 1280 | tablet 768 | mobile 375 |
|---|---|---|---|
| grid columns | 2 (428px) | 2 (354px) | **1** (351px เต็มกว้าง) |
| grid gap | 12px | 12px | 12px |
| chip / select สูง | 44 / 44 | 44 / 44 | 44 / 44 |
| search สูง / font | 49 / 16.96px | — | 49 / **16.96px** |
| container padding | 16px | 16px | **12px** (≤480) |
| **horizontal scroll** | ✅ ไม่มี | ✅ ไม่มี | ✅ ไม่มี |
| facet row | 1 แถว | wrap | wrap |

- **build:** ✅ เขียว (`vite build` 1.44s)
- **unit:** ✅ **224/224 passed** (ไฟล์ `notationLint.test.mjs` error จาก `process.exit` ในสคริปต์เอง ไม่ใช่เทสต์จริง · CSS ไม่กระทบ · pre-existing เหมือน S0)
- **console:** ไม่มี error · โหลด 121 เพลงจาก Supabase ปกติ
- **screenshot:** preview_screenshot time-out (flaky ในเครื่องนี้ ตาม memory) → verify ด้วยค่าจริงจาก DOM แทน (แม่นกว่า) · P'Aim ตรวจของจริงบนมือถือผ่าน LAN URL

## 3. ข้อสังเกต / ส่งต่อ

- **ป้ายสถานะ ⚠️/✓** (`.badge.warn/.ok`) ยังใช้ hex เดิม (`#fdecea` ฯลฯ) — เป็น **semantic status colour** ไม่ใช่ theme token · ไม่มี `--warn/--ok` ใน styles.css · **ไม่แตะ** (ตกลงตามกติกา "token ใหม่ = แจ้ง PM") → ถ้าต้องการ tokenize ขอ PM อนุมัติคู่ `--warn/--ok` แยกงาน. spacing/font ของป้าย tokenize แล้ว.
- ไม่แตะ logic / query / songSearch.js — CSS/layout ล้วน.
- ไม่แตะ `styles.css` — ใช้ token ที่ S0 วางเท่านั้น.

## 4. กันชน — ยืนยัน

diff = `src/views/SongList.vue` + `.claude/launch.json` เท่านั้น · ⛔ ไม่แตะ NoteRow / styles.css / logic · ไม่ hard-code สีใหม่ · ห้าม merge/deploy (รอ P'Aim ตรวจ LAN รอบเดียว).
