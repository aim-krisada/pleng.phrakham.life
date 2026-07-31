# Report — app-name-thai (ชื่อแอพ PWA เป็นภาษาไทยบน iOS)

**สายงาน:** `app-name-thai` · **branch:** `app-name-thai` (fork จาก `studio-shell-redesign` @ `7081b19`)
**commit:** `0b2f9bb` · **PM:** pm27 · **สถานะ:** ✅ เสร็จ · รอ gate

## ทำอะไร
เติม 4 meta ใน `index.html` `<head>` (วางใต้ `theme-color`, เหนือ `<title>`):
```html
<meta name="apple-mobile-web-app-title" content="เพลง.พระคำ" />
<meta name="application-name" content="เพลง.พระคำ" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
```
ชื่อ = **"เพลง.พระคำ"** ตรงกับ manifest `short_name` (verify แล้ว: `public/site.webmanifest:3`) และขนานกับพระคำ "พระคำ.ชีวิต".

## ทำไม
iOS "Add to Home Screen" ใช้ `apple-mobile-web-app-title` เป็นชื่อไอคอน · ไม่มี → fallback ไปที่ URL ("pleng.phrakham.life" อังกฤษ). manifest `short_name` + `<title>` เป็นไทยอยู่แล้ว แต่ iOS ไม่อ่าน `short_name` ตอน Add to Home Screen.

## Scope
- **แตะไฟล์เดียว:** `index.html` (+7 บรรทัด รวม comment) · `git status` = ` M index.html` เท่านั้น
- **ไม่แตะ:** manifest, sw, ไฟล์อื่น ✅

## DoD
- ✅ 4 meta ครบใน `index.html`
- ✅ `vite build` ผ่าน (built in 2.29s)
- ✅ grep ยืนยัน 4 meta คงอยู่ใน `dist/index.html` (บรรทัด 22–25)
- ✅ `npm test` — **658 tests passed** (63/64 suites). 1 suite `notationLint.test.mjs` รายงาน "Failed Suite" = **pre-existing harness quirk** (ไฟล์เรียก `process.exit(0)` เอง ซึ่ง vitest flag · internal fail = 0 · ไม่เกี่ยวกับงานนี้ที่แตะแค่ index.html)
- ✅ dev server serve 4 meta ถูกต้อง (curl 127.0.0.1:5329)

## หมายเหตุ verify iOS = post-deploy
verify จริงต้อง iPhone จริง: หลัง deploy → Add to Home Screen ใหม่ → ชื่อไอคอนต้องขึ้น **"เพลง.พระคำ"**.
⚠️ ผู้ที่ **เคยติดตั้งไอคอนเก่าไว้** ต้อง **ลบไอคอนเดิมแล้วติดตั้งใหม่** — ชื่อเก่า (URL) ค้างอยู่ในไอคอนเดิม.
Android: manifest `short_name` ไทยอยู่แล้ว → ไม่กระทบ.

## Dev server (สำหรับ P'Aim/พี่เปา ทดสอบมือถือ)
- Network: http://10.189.195.98:5329/
- (meta อยู่ใน `<head>` — ตรวจได้ที่ View Source หรือ post-deploy install จริง)

## git
- base `studio-shell-redesign` @ `7081b19` (ตอน fork) → ตอนนี้ SSR advanced เป็น `4647589` (pm28 board update) · **`7081b19` = ancestor ของ `4647589` → FF-able ไม่ diverged**
- **ไม่ merge/deploy เอง** — รอ PM gate + deploy รอบ 29
