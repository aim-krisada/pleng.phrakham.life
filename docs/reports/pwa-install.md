# Report — PWA: ปุ่ม "ติดตั้งแอพ" ให้คนเห็น (สาย `pwa-install`)

**branch:** `pwa-install` (fork จาก `studio-shell-redesign` · merge-base `ae7f287` ตรงฐาน)
**PM:** pm27 · **ยังไม่ merge/ยังไม่ deploy** (รอ PM gate)
**Preview (P'Aim ลองมือถือได้):** `http://10.189.195.98:5387/` (vite preview = โปรดักชันจริง มี SW+manifest)

---

## ทำอะไรไป
เพลง**เป็น PWA ครบอยู่แล้ว** (manifest + sw precache ~10.6MB เล่นออฟไลน์) แต่**ไม่มีปุ่มให้คนเห็นว่าติดตั้งได้** — งานนี้เพิ่มแค่ affordance ที่มองเห็น **ไม่แตะ manifest/sw ของเดิมเลย**:

1. **Android/Chrome/Edge/desktop** — ดัก `beforeinstallprompt`, โชว์ปุ่ม **"ติดตั้งแอพ"** ในเมนู ☰ (หมวดเครื่องมือ) · กดแล้วเรียก `prompt()` ของเบราว์เซอร์ · เลือกเสร็จปุ่มหายเอง (event ใช้ครั้งเดียว)
2. **iOS Safari** (ไม่มี event นั้น) — โชว์คำแนะนำสั้น **"แตะปุ่มแชร์ ⎙ → เพิ่มไปยังหน้าจอหลัก"** · ปิดได้ (จำใน localStorage ไม่เตือนซ้ำ)
3. **ติดตั้งแล้ว / เปิดแบบ standalone** — ไม่โชว์อะไรเลย (ทั้งปุ่มและคำแนะนำ)
4. a11y: ปุ่มเป็น `<button>` โฟกัสได้ · สูง 48px (≥44) · × ปิดคำแนะนำ 44px · ตำแหน่งตาม DS `menu-drawer-spec.md §3` (action = แถว icon+ชื่อ)

## ไฟล์ที่แตะ (scope สะอาด · ไม่ชนสายอื่น)
- ใหม่ `src/lib/pwaInstall.js` — state + ดัก event (import ใน main.js ตั้งแต่ต้น กัน event ยิงก่อน Vue mount)
- ใหม่ `src/components/InstallAppTool.vue` — ปุ่ม/คำแนะนำ (self-contained · โชว์เองตามเงื่อนไข)
- ใหม่ `src/components/InstallAppTool.test.js` — 10 เทสต์
- แก้ `src/components/Icon.vue` — เพิ่มไอคอน `smartphone` + `share`
- แก้ `src/components/ShellBar.vue` — วาง `<InstallAppTool/>` ในหมวดเครื่องมือของ drawer
- แก้ `src/main.js` — import ตัว listener ให้ทำงานตั้งแต่ boot
- **ไม่แตะ** `About.vue`/`Guide.vue`/`Studio.vue`/`SongViewer.vue` (สายอื่นถือ) · **ไม่แตะ** `public/site.webmanifest`/`public/sw.js`

## verify แล้ว
- `npm test` — 658 ผ่าน (รวม 10 เทสต์ใหม่) · 1 suite fail = `notationLint.test.mjs` **พังอยู่ก่อนแล้ว** (มัน `process.exit(0)` — ยืนยันบน base สะอาดก็ fail เหมือนกัน · ไม่เกี่ยวงานนี้)
- `vite build` — ผ่าน
- **localhost preview (secure context · in-app Chromium):** SW active + manifest + secure ✓ · ยิง `beforeinstallprompt` (จำลอง) → ปุ่ม "ติดตั้งแอพ" โผล่ในเครื่องมือ (สูง 48px · สีแบรนด์ · มีไอคอน) · กด → `prompt()` ถูกเรียก 1 ครั้ง → ปุ่มหาย ✓
- **no-overflow มือถือจริง:** ปุ่มอยู่ในกรอบ drawer · ไม่ล้นจอ ที่ **360px** (right 309 ≤ panel 310) และ **412px** (right 353 ≤ 354) · โฟกัสคีย์บอร์ดเข้าปุ่มได้ ✓
- **0 console error** · manifest/sw/preview ตอบ 200 ครบ (ของเดิมไม่พัง)

## ⚠️ ข้อจำกัด verify (ต้องอ่านก่อน gate)
- **ปุ่ม Android บนมือถือจริงต้องเป็น HTTPS** — Chrome ยิง `beforeinstallprompt` เฉพาะ secure context (localhost หรือ https) · เปิด preview ผ่าน LAN `http://10.189.195.98:5387` บนมือถือ **ปุ่มจะไม่โผล่** (http ไม่ secure) แม้โค้ดถูก · ตรวจปุ่ม Android จริงได้ 2 ทาง: (ก) หลัง PM merge+deploy ขึ้น live https แล้วลองบนมือถือ · (ข) ถ้าอยากลองก่อน merge = ผมตั้ง https tunnel ชั่วคราวให้ (ต้องขอ P'Aim อนุมัติใช้บริการภายนอก) · **บน localhost (secure) ยืนยันครบแล้วว่าทำงาน**
- **iOS Safari:** logic ครอบด้วย unit test (โชว์คำแนะนำ · ข้อความ · ปิด+จำ) · in-app browser เป็น Chromium ไม่ใช่ iOS จึงโชว์คำแนะนำจริงบนเครื่อง iOS เท่านั้น — **ขอ P'Aim ลองบน iPhone/iPad จริง** (คำแนะนำ iOS ทำงานผ่าน LAN http ได้ ไม่ติด secure-context)
- **screenshot:** preview screenshot ค้าง timeout (แท็บฝังไม่ paint — เป็นอาการ flaky ที่บันทึกไว้แล้วใน CLAUDE.md) จึงใช้หลักฐาน DOM/geometry (ตัวเลขด้านบน) แทน

## รอ PM
- gate report + brief · แล้วตัดสิน merge → `studio-shell-redesign` · deploy รอ P'Aim go
- ถ้าจะให้ P'Aim ตรวจปุ่ม Android จริงก่อน merge → บอกมา ผมตั้ง https tunnel ให้
