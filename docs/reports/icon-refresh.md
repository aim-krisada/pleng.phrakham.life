# Report — icon-refresh (favicon + PWA icon set)

**Branch:** `icon-refresh` (fork ฐานล่าสุด `studio-shell-redesign` = `a11e1c6`) · **PM:** pm26
**สถานะ:** เสร็จ · verify จริงผ่านครบ · **รอ P'Aim เคาะ + PM merge** (ห้าม merge/deploy เอง)

## ทำอะไร
สร้างชุดไอคอนใหม่ (กุญแจซอลทอง + กางเขน บนพื้น #363636) แทนชุด glowing-book เดิม — **full-bleed จตุรัส · พื้น #363636 เต็มขอบทั้ง 4 · กุญแจกลาง safe-zone** เพื่อให้ระบบ (iOS/Android) มนมุมเองโดยไม่มีเศษขอบ/มุมโปร่ง.

## วิธีทำ (จากต้นฉบับ `docs/pm/icon-source/pleng-icon-source.png` 745×743)
1. **แยกกุญแจทองออกจากพื้น** ด้วย saturation (R−B ramp 20→110) — กันการเข้าใจผิดว่าพื้นเทาเข้ม (b ต่ำ) เป็นกุญแจ · ขอบ anti-alias เนียน · ตัดเงาอุ่นๆ ออก
2. กุญแจต้นฉบับ crop ได้ **272×663** (อยู่กลางภาพพอดี)
3. วางบน canvas จตุรัส **flat #363636** · สูง = **76% ของด้าน** (จุดไกลสุดของกุญแจ = 389px จากศูนย์ < 410px = รัศมี 40% → อยู่ในวง maskable 80% พอดี)
4. ย่อ LANCZOS ออกทุกขนาด · ทุกไฟล์ทึบ (RGB · ไม่มี alpha)

## ไฟล์ที่แตะ (เฉพาะที่ได้รับอนุญาต — ไม่แตะ ShellBar/Guide/router)
- แทน `public/`: `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180 ทึบ), `android-chrome-192x192.png`, `android-chrome-512x512.png`
- ใหม่: `public/maskable-512.png`
- `public/site.webmanifest`: เพิ่ม entry `"purpose":"maskable"` → `maskable-512.png` (คง 3 entry `"any"` เดิม · ไม่แตะ name/short_name)
- `index.html`: **ไม่แก้** — icon links + meta `apple-mobile-web-app-title "เพลง.พระคำ"` เดิมครบอยู่แล้ว (แค่แทนรูปชื่อไฟล์เดิม)

## DoD verify (จริง ไม่เดา)
| เช็ก | ผล |
|---|---|
| ทุกไฟล์ขนาดถูก + favicon.ico multi-res | ✅ 16/32/48 embedded |
| 4 มุมทุกไฟล์ทึบ #363636 (สุ่มพิกเซล) | ✅ ทุกไฟล์ = (54,54,54) |
| ไม่มีมุมโปร่ง/เศษขอบ/baked rounding | ✅ flat full-bleed |
| maskable กุญแจไม่โดนตัดในวง 80% | ✅ พิกเซลทองนอกวง = **0** (ไกลสุด 194.7 < 205) |
| `vite build` ผ่าน + dist มีไฟล์ครบ + manifest maskable | ✅ built 2.27s · dist ครบ |
| index.html คง meta app-name | ✅ preserved |
| favicon เสิร์ฟจริง (byte-match กับ file) | ✅ HTTP 200 · byte ตรงทุกไฟล์ |

## หลักฐาน
- render 512 + maskable-512 (พื้นเรียบ #363636 · กุญแจกลาง คม · ไม่มีเศษ) → ส่งใน chat
- favicon 32px ยังอ่านออกเป็นกุญแจ+กางเขน
- dev `--host`: **http://192.168.1.124:5316/** (ทดสอบบนมือถือได้)

## หมายเหตุ
- `android-chrome-512x512.png` กับ `maskable-512.png` เนื้อภาพเหมือนกัน (master เดียว safe-zone อยู่แล้ว) — ตามสเปก brief (1 master full-bleed ใช้ทุกไฟล์)
- hero/glowing-book (`pleng-hero.*`, `phrakham.ico`) **ไม่ลบ** — แตะเฉพาะ favicon set
