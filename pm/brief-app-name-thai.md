# Brief — ชื่อแอพ PWA เป็นภาษาไทย (iOS home-screen)

**สายงาน slug:** `app-name-thai` · **branch:** fork ใหม่จากฐาน `studio-shell-redesign`
**PM ปัจจุบัน:** `pm27` · **ห้าม merge/deploy เอง** · งานเล็ก 1 ไฟล์

## ปัญหา (P'Aim 16 ก.ค.)
ติดตั้งแอพเพลงบน iOS แล้วชื่อไอคอนขึ้นเป็น **"pleng.phrakham.life" (อังกฤษ)** อยากให้เป็น **ไทย "เพลง.พระคำ"** เหมือนพระคำ.

## ต้นเหตุ (verify แล้ว)
`index.html` มี `<title>` + `site.webmanifest` short_name เป็นไทยอยู่แล้ว **แต่ขาด `apple-mobile-web-app-title`** — iOS "Add to Home Screen" ใช้ meta ตัวนี้เป็นชื่อไอคอน ถ้าไม่มีจะ fallback ไปที่ URL (อังกฤษ). พระคำ (`phrakham.life2`) ตั้งไว้: `<meta name="apple-mobile-web-app-title" content="พระคำ.ชีวิต">` + `<meta name="apple-mobile-web-app-capable" content="yes">`.

## งาน (แก้ `index.html` `<head>` เท่านั้น)
เติม meta ให้ครบ (วางใกล้ `<meta name="theme-color">` / `<title>`):
```html
<meta name="apple-mobile-web-app-title" content="เพลง.พระคำ" />
<meta name="application-name" content="เพลง.พระคำ" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
```
- ชื่อ = **"เพลง.พระคำ"** (ตรงกับ manifest short_name · ขนานกับพระคำ "พระคำ.ชีวิต")
- **⛔ ไม่แตะอย่างอื่น** ใน index.html · ไม่แตะ manifest/sw (short_name ไทยอยู่แล้ว) · ไม่แตะไฟล์อื่น

## DoD
- index.html มี 4 meta ครบ · `vite build` ผ่าน (meta คงอยู่ใน dist/index.html — grep ยืนยัน) · `npm test` เขียว
- **verify iOS = post-deploy** (ต้อง iPhone จริง + Add to Home Screen ใหม่ → ชื่อขึ้น "เพลง.พระคำ") · ผู้ที่เคยติดตั้งไว้ต้องลบไอคอนเก่าแล้วติดตั้งใหม่ (ชื่อเก่าค้างในไอคอนเดิม)
- Android: manifest short_name ไทยอยู่แล้ว → โอเค

## Setup + รายงานกลับ
- verify fork ถูกฐาน `studio-shell-redesign` · ผิด → `git switch -c app-name-thai studio-shell-redesign`
- `npm install` → dev `--host` → ส่ง Network URL (clickable)
- รายงาน: `docs/reports/app-name-thai.md` + board §📥 inbox + ping **pm27**
