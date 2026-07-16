# Brief — ไอคอน v2: พื้นขาว + กุญแจทองอุ่น (อ่อนลง)

**สายงาน slug:** `icon-v2` · **branch:** fork ฐานล่าสุด `studio-shell-redesign`
**PM ปัจจุบัน:** `pm26` · **ห้าม merge/deploy เอง** · **P'Aim iterate โทนทองตรงได้ (visual)** · แทนชุดไอคอน #363636 (icon-refresh) ที่ merge ไปแล้ว

## โจทย์ (P'Aim 16 ก.ค. · ส่งภาพอ้างอิงกุญแจทองบนพื้นขาว)
เปลี่ยนไอคอน/favicon จาก **พื้นเทาเข้ม #363636 → พื้นขาว** (P'Aim ว่ากุญแจทองเด่นสวยกว่า · เข้ากับธีมเว็บที่สว่างอยู่แล้ว) · **โทนทอง = อุ่น อ่อนลงกว่าปัจจุบันนิดนึง** (เหมือนตอนแรกที่เห็น)

## ทำ
1. **พื้น = ขาว `#ffffff` full-bleed ทึบ** (opaque — apple-touch/maskable ต้องทึบ ไม่โปร่ง) เต็มขอบทั้ง 4 (ให้ระบบมนมุมเอง)
2. **กุญแจ = ทองอุ่น อ่อนลง** กว่าทองเข้มปัจจุบัน (เสนอโทน ~goldenrod อุ่น เช่น `#CBA04A`/`#D0A54F` · **P'Aim ฟันธงโทนด้วยตา** — เปิดให้ดูหลายเฉด)
3. **ที่มาของรูปกุญแจ:** ใช้รูปทรงกุญแจจาก source เดิม `docs/pm/icon-source/pleng-icon-source.png` (แยกกุญแจออกจากพื้นเทา → เปลี่ยนสีเป็นทองอุ่น → วางบนพื้นขาว) · ถ้าต้องการ P'Aim จะส่งไฟล์ต้นฉบับพื้นขาวเพิ่ม (แต่ทำจาก source เดิมได้)
4. **แยก any จาก maskable (ตามที่ P'Aim เคาะก่อนหน้า):**
   - `favicon.ico`(16/32/48)·`favicon-16/32`·`apple-touch-180`·`android-192/512` (any) = **กุญแจเต็มขอบกว่า** (พื้นขาว)
   - `maskable-512.png` = กุญแจใน safe-zone ~80% (พื้นขาวเต็ม)
5. `site.webmanifest`: คง 2 entry (any + maskable) ชี้ไฟล์ถูก · **ไม่แตะ name/short_name** (ไทยอยู่แล้ว)
6. `index.html`: **ไม่แตะ** (ชื่อไฟล์เดิม · คง meta `apple-mobile-web-app-title "เพลง.พระคำ"`)

## ⚠️ caveat ที่ต้องรู้ (แจ้งไว้ · P'Aim รับทราบแล้ว)
favicon พื้นขาวบนแท็บเบราว์เซอร์สีขาว/สว่าง = กลืนขอบนิดนึง (เห็นแค่กุญแจทองลอย) — เป็นเรื่องปกติของไอคอนแบรนด์สว่าง · ให้กุญแจ **คมชัด เส้นหนาพอ** ที่ 16px จะได้ไม่จาง

## DoD (verify จริง)
- ทุกไฟล์พื้นขาวทึบเต็มขอบ · จตุรัส · any กุญแจเต็ม / maskable กุญแจใน safe-zone (ไม่โดนตัดในวง 80%) · โทนทองอุ่นตาม P'Aim เคาะ
- favicon เห็นในแท็บ (กุญแจคม) · apple-touch ทึบ · manifest ถูก · `vite build` ผ่าน + dist ครบ · index.html คง meta app-name
- **หลักฐาน:** เปิดภาพ any + maskable หลายเฉดทอง + screenshot favicon แท็บ ส่ง P'Aim เลือกโทน

## Setup + รายงานกลับ
- verify fork ฐานล่าสุด `studio-shell-redesign` (`git merge-base`) · ผิด → `git switch -c icon-v2 studio-shell-redesign`
- **⚠️ ไม่ชน:** แตะเฉพาะ public/icons + site.webmanifest · สาย cleanup-round ถูกสั่งไม่แตะไอคอน/manifest แล้ว
- เครื่องมือ ImageMagick/sharp/PIL · `npm install` → dev `--host` → **Network URL (clickable)**
- **ห้าม merge/deploy เอง** · รายงาน: `docs/reports/icon-v2.md` + board §📥 inbox + ping **pm26**
