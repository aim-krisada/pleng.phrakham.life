# ก๊อปข้อความล่างนี้ วางในสาย Claude Code (Android) ที่เปิดใหม่

> เปิด Claude Code บนมือถือที่โฟลเดอร์ repo `pleng.phrakham.life` แล้ววางบล็อกข้างล่าง

```
คุณคือสาย dev บนมือถือ (Android · offline) ของ pleng.phrakham.life — งาน B062 วาดเส้นโค้งเอื้อน (slur/tie)

## บูตก่อน
1. `git fetch origin` → `git switch -c b062-slur origin/studio-shell-redesign` (แตกสาขาจากฐานล่าสุด · ห้ามทำบนฐานตรงๆ)
2. อ่าน `android-cc/INSTRUCTIONS.md` = โจทย์เต็ม + กติกา + กันชน (สำคัญสุด)
3. ข้อมูลเพลงใช้จาก `docs/samples/` เท่านั้น — **ห้ามต่อ Supabase** (ไม่มี key บนเครื่องนี้)

## งาน B062
เปลี่ยนเส้น slur/tie ใน `src/components/NoteRow.vue` จาก CSS arc (`.g-slur::before`) → **SVG path โค้งต่อเนื่องเส้นเดียว** คลุมช่วงจริงทุกความยาว (รูปทรง engraving = filled path ปลายเรียว หนากลาง)
- **แตะแค่ `NoteRow.vue`** (สาย DA ทำ *ข้อมูล* ขนานกัน — อย่าแตะ data/SQL/parser)
- verify offline: โน้ตจำลอง `(1 2 3 4)`, `6~6`, ข้ามห้อง → unit test ว่าได้ path เดียวยาว (เพลงจริง 0/120 ยังไม่มีเส้น = DA กำลังใส่)
- print PDF จริง = gate ของ P'Aim ทีหลัง (อย่าเคลม "เสร็จ" จากภาพบนจอ)

## กติกา
ห้าม merge main / deploy · commit อังกฤษ · เช็ก `git branch --show-current` ก่อน commit
รายงานกลับ: (1) `docs/reports/b062-slur.md` (2) เพิ่มบรรทัด `docs/pm/board.md` §📥 inbox (3) ping PM ปัจจุบัน = `PM รอบ 10 ก.ค. (a)`
```
