# Brief — PWA: เพิ่มปุ่ม "ติดตั้งแอพ" ให้คนเห็น + verify มือถือจริง

**สายงาน slug:** `pwa-install` · **branch:** fork ใหม่จากฐาน `studio-shell-redesign`
**PM ปัจจุบัน:** `pm27` · **ห้าม merge/deploy เอง — PM gate เท่านั้น** · world-class by default

## บริบท (สำคัญ — อย่าทำซ้ำของที่มี)
เพลง **เป็น PWA ครบแล้ว** และ live ใช้งานได้จริง: `public/site.webmanifest` (standalone + ไอคอน 192/512/180) · `public/sw.js` (precache samples ~10.6MB + app-shell → เล่นออฟไลน์) · register ใน `src/main.js` · verify live 200 ทั้ง manifest/sw/samples manifest.
**ปัญหาจริง = ไม่มีปุ่ม/คำแนะนำ "ติดตั้งแอพ" ในหน้า** → คนไม่รู้ว่าติดตั้งได้ (Android ซ่อนในเมนู ⋮ · iOS ต้อง Share→Add to Home Screen เอง). **งานนี้ = เพิ่ม affordance ให้เห็น + verify ติดตั้งจริง — ไม่แตะ manifest/sw ที่ทำงานดีอยู่แล้ว** (ยกเว้นจำเป็นจริง)

## ขอบเขต
1. **จับ `beforeinstallprompt`** (Android/Chrome/Edge/desktop): เก็บ event ไว้ → โชว์ปุ่ม **"ติดตั้งแอพ"** → คลิกเรียก `prompt()` → หลังเลือกแล้วซ่อนปุ่ม · ถ้าเปิดในโหมดติดตั้งแล้ว (`display-mode: standalone`) หรือ event ไม่เคยยิง → ไม่โชว์ปุ่ม
2. **iOS Safari** (ไม่มี `beforeinstallprompt`): ตรวจ iOS + ยังไม่ standalone → โชว์คำแนะนำสั้น **"แตะปุ่มแชร์ ⎙ → เพิ่มไปยังหน้าจอหลัก"** (ข้อความ + ไอคอนเล็ก · ปิดได้)
3. **ตำแหน่ง (world-class · discoverable ไม่รบกวน):** เสนอไว้ใน **เมนู ☰ (drawer)** เป็นรายการ "ติดตั้งแอพ" + อาจมี hint แบบปิดได้ครั้งเดียว — เลือกตาม Material/HIG · **⛔ อย่าวางใน `src/views/About.vue`** (สายอื่น `guide-update` กำลังแก้ไฟล์นั้น ยังไม่ merge → กันชน) · **อย่าแตะ `Guide.vue`/`About.vue`/`Studio.vue`/`SongViewer.vue`** (สายอื่นถืออยู่)
4. เก็บ state (dismiss hint) ใน localStorage · a11y (ปุ่ม/aria ครบ · โฟกัสได้) · แตะ ≥44px

## DoD (world-class · verify จริงบนมือถือ ไม่ใช่แค่โค้ดรัน)
- **Android (Chrome จริง):** ปุ่ม "ติดตั้งแอพ" โผล่ → กดแล้วติดตั้งลงหน้าจอหลัก → เปิดเป็นแอพ standalone (ไม่มีแถบเบราว์เซอร์)
- **iOS (Safari จริง):** คำแนะนำโผล่ → ทำตามแล้วได้ไอคอนบนหน้าจอหลัก → เปิด standalone
- **ออฟไลน์:** เปิดแอพที่ติดตั้ง → ปิดเน็ต → ยังเปิด+เล่นเพลงได้ (sw ยังทำงาน — ยืนยันไม่พังของเดิม)
- ปุ่มไม่โผล่ซ้ำเมื่อติดตั้งแล้ว · `npm test` เขียว + `vite build` ผ่าน · 0 console error
- **หลักฐาน:** screenshot ติดตั้งบน Android + iOS (หรือ emulate ที่ใกล้จริงสุด + อธิบายข้อจำกัด)

## Setup + รายงานกลับ
- verify fork ถูกฐาน `studio-shell-redesign` (`git merge-base`) · ผิด → `git switch -c pwa-install studio-shell-redesign`
- `npm install` → dev **`--host`** → ส่ง Network URL (ให้ P'Aim ลองติดตั้งบนมือถือจริง)
- รายงาน: `docs/reports/pwa-install.md` + board §📥 inbox + ping **pm27**
