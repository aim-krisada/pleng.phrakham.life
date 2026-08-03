# Brief — ชุดไอคอนใหม่ (favicon + PWA) กุญแจซอล+กางเขน ทอง/เทาเข้ม

**สายงาน slug:** `icon-refresh` · **branch:** fork **ฐานล่าสุด** `studio-shell-redesign`
**PM ปัจจุบัน:** `pm26` · **ห้าม merge/deploy เอง** · world-class · **P'Aim เคาะแล้ว**

## ต้นฉบับ + ปัญหา (วัดจริงแล้ว)
- source: **`docs/pm/icon-source/pleng-icon-source.png`** (745×743 · 32bpp ARGB) — กุญแจซอลทอง+กางเขน บนพื้นเทาเข้ม ทรงสี่เหลี่ยมมน
- **ปัญหา:** มุมทั้ง 4 **โปร่งใส (A0)** + baked มุมมนมาแล้ว + ไม่จตุรัสเป๊ะ → ใช้เป็น app icon แล้ว iOS/Android มนมุมซ้ำ → มุมดำ/ขาดๆ ("เศษขอบ" ที่ P'Aim เห็น)
- พื้นเทาเข้มวัดได้ **≈ #363636**

## เป้าหมาย (P'Aim เคาะ)
ทำชุดไอคอนใหม่ **full-bleed จตุรัส · พื้น #363636 เต็มขอบทั้ง 4 · กุญแจกลาง มี safe-zone** (ให้ระบบมนมุมเอง) — คม ไม่มีเศษ · ใช้เป็นทั้ง favicon แท็บ + apple-touch + ไอคอน PWA (แทนชุด "glowing-book" เดิม)

## งาน
1. **เตรียมภาพต้นแบบ full-bleed:** crop source เป็นจตุรัส · เอามุมโปร่ง+มุมมน baked ออก · **เติมพื้น #363636 เต็มทุกพิกเซลถึงขอบ** · วางกุญแจไว้กลาง **เว้น safe-zone (กุญแจอยู่ในกรอบกลาง ~80% ของด้าน)** เพื่อ maskable ไม่ตัดหัว/ท้ายกุญแจ · เก็บสีทองเดิม
2. **ออกไฟล์ (แทนของเดิมใน `public/`):**
   - `favicon.ico` (multi-res 16/32/48) · `favicon-16x16.png` · `favicon-32x32.png`
   - `apple-touch-icon.png` (180×180 · **ทึบเต็มขอบ** ไม่โปร่ง — iOS ต้องทึบ)
   - `android-chrome-192x192.png` · `android-chrome-512x512.png`
   - **`maskable-512.png`** (ใหม่ · full-bleed #363636 + กุญแจใน safe-zone)
3. **`public/site.webmanifest`:** icons ให้มี entry **`"purpose": "maskable"`** ชี้ `maskable-512.png` + คง entry `"any"` เดิม (192/512/180) · ไม่แตะ name/short_name (ไทยอยู่แล้ว)
4. **`index.html`:** คง `<link rel="icon"...>`/apple-touch เดิม (ชื่อไฟล์เดิม = แค่แทนรูป) · **⚠️ fork ฐานล่าสุด — คง meta `apple-mobile-web-app-title` "เพลง.พระคำ" (app-name f6641b8) ไว้ ห้ามลบ**
5. เก็บ hero/glowing-book เดิมไว้ (ไม่ลบ · แค่เปลี่ยน favicon set) — หรือถ้าซ้ำซ้อน flag PM ไม่ต้องลบเอง

## DoD (verify จริง)
- ทุกไฟล์ **full-bleed #363636 · จตุรัสเป๊ะ · ไม่มีมุมโปร่ง/เศษขอบ** (เปิดดูจริง + สุ่มพิกเซลมุม = ทึบ #363636)
- maskable: กุญแจอยู่ใน safe-zone (ลองครอปวงกลม 80% แล้วกุญแจไม่โดนตัด)
- favicon เห็นในแท็บเบราว์เซอร์ · apple-touch 180 ทึบ · android 192/512 ถูกขนาด · manifest มี maskable entry ถูก
- `vite build` ผ่าน · index.html คง meta app-name · **หลักฐาน:** เปิดภาพ 512 + maskable + screenshot favicon แท็บ ส่งให้ P'Aim
- ⚠️ **ไม่แตะไฟล์ ShellBar/Guide/router** (สาย notation-build ถือ) · แตะเฉพาะ public/ icons + site.webmanifest + index.html(icon links)

## Setup + รายงานกลับ
- verify fork ฐานล่าสุด `studio-shell-redesign` (`git merge-base` · มี app-name meta) · ผิด → `git switch -c icon-refresh studio-shell-redesign`
- เครื่องมือ: ImageMagick / sharp / PIL อะไรก็ได้ที่ออก PNG/ICO ได้ · `npm install` → dev `--host` → ส่ง Network URL (clickable)
- **ห้าม merge/deploy เอง** · รายงาน: `docs/reports/icon-refresh.md` + board §📥 inbox + ping **pm26**
