# BRIEF (SA → design spec) — เมนู pleng สไตล์เดียวกับ phrakham (desktop + mobile)

**สาย:** SA (design spec เท่านั้น ไม่แตะ src) · **จ่ายโดย:** pm22 · 13 ก.ค. 2026
**อ้างอิงภาพ:** `C:\Users\aimkr\Downloads\Screenshot_20260713_164458_Chrome.jpg` (เมนูมือถือพระคำ เปิดแฮมเบอร์เกอร์) + phrakham live https://phrakham.life + source `C:\gl\krisada\phrakham.life2` (`theme.scss`, `assets/pk-navbar.js`)

## Objective (คำ P'Aim)
"อยากให้เมนูของเพลงเป็นสไตล์เดียวกับพระคำ ทั้ง **desktop และ mobile view**" ตามภาพ

## phrakham menu มีอะไร (จากภาพ + verify source)
- **ไอคอนแอป (หนังสือ) มุมซ้ายบน** + ช่อง **ค้นหา 🔍** + **แฮมเบอร์เกอร์ ☰** มุมขวาบน
- เมนูดิ่ง: ลิงก์นำทาง (เล่าประสบการณ์ · ความรู้ประกอบ ▾ · เพลง · เกี่ยวกับเรา)
- เส้นคั่น → หมวด **"เครื่องมือ"** (หัวสีน้ำตาล) พร้อมไอคอน: **Aa ขนาดตัวอักษร · ⚙ ตั้งค่าการแสดงผล · ⬇ ดาวน์โหลด**
- นี่คือ core lib `assets/pk-navbar.js` (theme.scss:123 · reader font-scale `--pk-fs` = ตัว Aa) — **verify pattern จริงใน 2 repo**

## งาน SA = เขียน design spec `docs/ds/menu-parity.md`
1. **สำรวจเมนูปัจจุบันของ pleng** (`ShellBar`/nav component · `src/**`) — มีลิงก์อะไร, เครื่องมืออะไร (ขนาดตัวอักษร/ดาวน์โหลด/โปรไฟล์อยู่ไหน), desktop กับ mobile ต่างยังไง
2. **แมป → โครงแบบพระคำ** ที่เหมาะกับ pleng จริง (ใช้เพจ/เครื่องมือที่ pleng มี — คู่มือ/เพลง/เกี่ยวกับ/ล็อกอิน + เครื่องมือที่มีจริง) · **desktop** (nav แนวนอน?) + **mobile** (แฮมเบอร์เกอร์ drawer + หมวด "เครื่องมือ")
3. spec ละเอียด: โครงสร้าง, ไอคอน (Lucide id — memory `reference_lucide_icons`), สี/spacing/หัวข้อ "เครื่องมือ" (โทเคนที่ตรงพระคำอยู่แล้ว), พฤติกรรมแฮมเบอร์เกอร์/ค้นหา, ตำแหน่งไอคอนแอปซ้ายบน · **AC ตรวจได้** ต่อจุด
4. **refine ไม่ redesign** — ต่อยอด ShellBar เดิม ไม่รื้อ routing/logic · **shared-core (pk-navbar) ถูก defer** → pleng ทำเมนูสไตล์เดียวกันเอง (ไม่ import ข้าม repo รอบนี้)

## ⚠️ coordination (PM)
- ไอคอนแอปมุมซ้ายบน = สาย **hero/favicon กำลังทำอยู่** → spec ให้ "เมนูครอบไอคอนซ้ายบน" ต่อยอดจากที่ hero/favicon วางไว้ (อย่า spec ให้ทำไอคอนซ้ำ) · **Dev เมนูจะเริ่มหลัง hero/favicon merge** (กันชน shell-bar) — SA แค่เขียน spec ตอนนี้
- ระบุใน spec ว่าจุดไหนทับ shell-bar (ให้ PM จัดลำดับ merge)

## รายงานกลับ (session-agnostic)
`docs/ds/menu-parity.md` (spec + AC + จุดทับ shell-bar) · commit บน branch คุณ · §📥 inbox `docs/pm/board.md` + ping "PM ปัจจุบัน" · **ยังไม่ต้องแตะ src** — รอ P'Aim review spec ก่อนจ่าย Dev
