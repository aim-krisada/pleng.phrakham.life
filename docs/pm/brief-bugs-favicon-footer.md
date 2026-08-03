# Brief — บั๊ก 2 ตัว: ไอคอนแบรนด์ + footer ติดล่างสุด (dev)

**สั่งโดย:** pm4 · **ฐาน:** `studio-shell-redesign` (HEAD `83c0b4f`) · **branch ใหม่:** `git switch -c fix-favicon-footer studio-shell-redesign`
หลักฐานจริงจาก P'Aim: `docs/pm/realuse-assets/bug-favicon-brand-icon.png` + `.txt` · `docs/pm/realuse-assets/bug-footer-bottom.png` + `.txt`

## บั๊ก 1 — ไอคอนโลกในเมนูแบรนด์ → เปลี่ยนเป็นโลโก้ favicon
- **ที่ไหน:** `src/components/ShellBar.vue` เมนู "เพลง.พระคำ.ชีวิต ▾" → รายการลิงก์ไป phrakham.life
  บรรทัด ~35 (ปัจจุบัน): `<a href="https://phrakham.life" ...><Icon name="globe" /> พระคำ.ชีวิต <span class="sb-k">↗</span></a>`
- **แก้:** เปลี่ยน `<Icon name="globe" />` เป็นรูปโลโก้ favicon ของ phrakham → `<img src="favicon.ico" ... >` (ไฟล์มีอยู่แล้วที่ `public/favicon.ico` = favicon.ico ของ phrakham.life2 เป๊ะ · md5 ตรงกัน)
  - ขนาดให้เท่าไอคอนอื่นในเมนู (~16px) · จัด baseline ให้ตรงข้อความ · เพิ่ม `alt=""` (decorative) · `width/height` กัน layout shift
- **⛔ อย่าแตะ favicon ของแท็บเบราว์เซอร์** (index.html line 12 ถูกอยู่แล้ว) · อย่าแตะ globe ที่อื่นถ้ามี (เฉพาะรายการลิงก์ phrakham นี้)

## บั๊ก 2 — เส้น+ตัวหนังสือ footer ต้องติดล่างสุดจอเสมอ
- **หลักฐาน:** หน้าฝึกร้อง เนื้อสั้น → footer ("© 2026 เพลง.พระคำ.ชีวิต · …") **ลอยกลางจอ** ไม่ติดล่าง · P'Aim: "ทั้งเส้นและตัวหนังสือต้องอยู่ติดส่วนล่างสุดของ screen เสมอ"
- **บริบท:** B047 (`fddf918`) ทำ sticky footer แล้ว (`#app` flex column `min-height:100dvh` · `main.container flex:1 0 auto` · หน้าฝึกร้อง `footer.footer-dock-clear` margin-bottom:88px กัน dock บัง) — แต่หน้าฝึกร้องยัง**ไม่ติดล่างจริง** (dock สูงกว่า 88px / เนื้อสั้นดัน footer ไม่ถึงล่าง)
- **แก้:** ทำให้ footer ชิดล่างสุด viewport เสมอทุกหน้า รวมหน้าฝึกร้องที่มี music dock — เนื้อสั้นก็ต้องติดล่าง · เนื้อยาวเลื่อนปกติ · footer ไม่ถูก dock บัง (เว้นระยะให้พอดี dock จริง ไม่ทับ)
- **ที่ไหน:** `src/styles.css` (footer rules · B047 infra) + `src/App.vue` (class `footer-dock-clear`/`isStudio` ถ้าจำเป็น) · CSS ล้วน ไม่ hard-code สี
- **⚠️ ประสาน:** สาย DockKey กำลังทำ dock หน้าฝึกร้อง (อาจเปลี่ยนความสูง dock) — **สาย bug นี้เป็นเจ้าของ footer** · อย่าอิงความสูง dock แบบ magic number ตายตัวถ้าเลี่ยงได้ (ใช้ safe-area / วัดจริง / ค่าที่ยืดหยุ่น)

## รั้ว
- **แตะได้:** `ShellBar.vue` (บั๊ก1) · `styles.css` + `App.vue` (บั๊ก2)
- **⛔ ห้ามแตะ:** `StudioDock.vue`/`SingTransport.vue`/`SongViewer.vue` (สาย DockKey) · `NoteRow.vue` · `store.js` · index.html favicon แท็บ

## DoD + รายงาน
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` ผ่าน (ฐาน 264 · notationLint fail=ของเดิม) + `npm run build` ผ่าน
- dev server **`--host`** + **Network URL** ในรายงาน
- verify เบราว์เซอร์ 3 breakpoint (375/768/1280): บั๊ก1 = โลโก้แทนโลก · บั๊ก2 = footer ติดล่างสุดทั้งเนื้อสั้น(ฝึกร้อง/about)+เนื้อยาว(รายการเพลง) · ไม่โดน dock บัง · console 0
- **รายงานกลับ (session-agnostic):** (1) `docs/reports/fix-favicon-footer.md` (2) บรรทัดใน board §📥 inbox (3) ping PM ปัจจุบัน = **`pm4`**
- **⛔ ห้าม merge/deploy เอง**
