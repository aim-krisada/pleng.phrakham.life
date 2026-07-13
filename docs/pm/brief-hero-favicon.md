# BRIEF (Dev) — ติดตั้ง hero image + favicon/PWA icon + ไอคอนมุมซ้ายบน (แบบพระคำ)

**สาย:** Dev · **จ่ายโดย:** pm22 · 13 ก.ค. 2026 · **ฐาน:** `studio-shell-redesign`
**หมายเหตุ:** P'Aim ทำ asset เสร็จเองแล้ว — **งานนี้ = integrate ไฟล์ที่มี ไม่ต้องสร้าง/ตัดแต่งรูปใหม่**

## Source assets (P'Aim เตรียมไว้)
โฟลเดอร์: **`C:\Users\aimkr\Downloads\เพลง hero-favicon\`**
- `pleng-hero.png` (6.5MB · ต้นฉบับ) + **`pleng-hero.webp` (180KB · ใช้ตัวนี้เป็นหลักเพื่อ perf)** — รูปหนังสือเปิดมีโน้ตทองลอยขึ้น (ธีมอุ่น ตรง Warm Study Room)
- `favicon_io/` = ชุด favicon มาตรฐาน (favicon.io): `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest` — ไอคอน = หนังสือเรืองแสง (แบบเดียวกับ hero + เข้ากับพระคำ)

## งาน (3 ส่วน)
### 1) Favicon + PWA icon
- copy ชุด favicon เข้า `public/` (pleng deploy GitHub Pages · asset ใน public/ เสิร์ฟที่ราก)
- wire `index.html`: `<link rel="icon" ...16/32>`, `<link rel="apple-touch-icon" ...>`, ico fallback
- **⚠️ pleng เป็น PWA อยู่แล้ว (`public/sw.js` + manifest จาก B107):** **อย่าทับ manifest ดื้อๆ** — merge icons 192/512 (maskable ถ้าตั้งได้) เข้า manifest เดิมของ pleng · คง name/theme/start_url/display เดิม · เช็ก `sw.js` cache list ครอบ icon ใหม่ (offline install ได้)
### 2) Hero image
- หา/วางที่หน้า landing (น่าจะ `SongList` บนสุด · ถ้าไม่มี hero เดิมให้เสนอตำแหน่งที่เนียน — เหนือรายการเพลง) หรือ About · **ใช้ `.webp` + fallback `.png`** · `max-width:100%` responsive · alt text ไทย · lazy ตามเหมาะ
- **ห้ามดัน layout จนแผ่นเพลง/dock เพี้ยน** · เทียบ perf (webp เบา)
### 3) ไอคอนมุมซ้ายบน (แบบพระคำ mobile)
- วางไอคอนหนังสือ (จากชุด favicon เช่น 192 หรือ svg) ที่ **ซ้ายสุดของ shell-bar** (ก่อนชื่อ "เพลง...") — เหมือนพระคำมีไอคอน app มุมซ้ายบน
- ขนาดพอดี header (สูง ~ตัวอักษรแบรนด์) · กลม/มุมโค้งเข้าชุด · **ห้ามแตะสีพื้น shell-bar** (`#f8f9fa` — B-2 P'Aim เคาะคงเดิม) · ไม่ทำ brand text ล้น/ดันปุ่มขวาหลุด (เช็กมือถือ 360/412)

## scope guards
- integrate อย่างเดียว · ไม่แก้ logic เพลง/dock/editor · ไม่แตะโทเคนสี · KISS
- ระวัง PWA: merge manifest ไม่ทับ · sw.js ยัง cache ครบ (test install ไม่พัง)

## setup + verify
- worktree branch ใหม่จากฐาน **studio-shell-redesign** · **verify fork base เอง** (`git merge-base --is-ancestor studio-shell-redesign HEAD`) ก่อนลงมือ (spawn worktree อาจ fork ผิด)
- dev server **`--host`** ใส่ **Network URL** ในรายงาน (พี่เอม/พี่เปาดูมือถือ)
- self-verify: favicon โชว์บนแท็บ · `<link>` ถูก · manifest icons 192/512 valid (DevTools Application) · PWA install ยังได้ · hero โหลด (.webp) ไม่ดัน layout · ไอคอนมุมซ้ายบนเรนเดอร์ทุก viewport 360/412/desktop ไม่ทำปุ่มขวาหลุด · console ไม่มี error

## รายงานกลับ (session-agnostic)
`docs/reports/hero-favicon.md` (ทำอะไร + screenshot tab favicon + header icon + hero + PWA manifest proof + Network URL) · §📥 inbox board + ping "PM ปัจจุบัน" (board §🎯 — อย่า hardcode ชื่อสาย) · **ไม่ merge/deploy** — PM gate + P'Aim ดูของจริงก่อน
