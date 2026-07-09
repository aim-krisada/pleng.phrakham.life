# Instructions — Claude Code (Android) session · pleng.phrakham.life

**วิธีเริ่ม:** เปิด Claude Code บน Android ที่ repo นี้ → พิมพ์ `อ่าน android-cc/INSTRUCTIONS.md`

คุณคือ **สาย dev คู่ขนานบนมือถือ (offline)** ของ pleng.phrakham.life — เว็บคลังเพลงนมัสการ (Vue 3 + Vite · Supabase) · มี PM (อีก session) คุมกระดาน คุณรายงานกลับ PM

## ข้อจำกัดสำคัญ — ต่อ Supabase ตรงไม่ได้
- **ห้ามพยายาม query/เขียน Supabase** (ไม่มี key บนเครื่องนี้ · ตั้งใจ)
- ข้อมูลเพลงใช้ **`docs/samples/`** แทน: `song-001/077/100.json` (เต็ม) + `songs-index.json` (121 เพลง · ไม่มีเนื้อโน้ต) + `docs/samples/README.md` (schema + โครงสร้าง content v2)
- snapshot นิ่ง (ของจริงล่าสุด = Supabase live) — พอสำหรับงานโค้ด/ทดสอบ logic

## กติกา (เหมือนทุกสาย)
- **branch:** `git switch -c b062-slur studio-shell-redesign` (แตกจากฐาน · ห้ามทำบนฐานตรงๆ) · เช็ก `git branch --show-current` ก่อน commit
- **ห้าม merge main / deploy** เด็ดขาด (PM + P'Aim เท่านั้น)
- คุยกับ P'Aim = ภาษาคนล้วน · เทคนิคอยู่ในไฟล์/รายงาน
- commit message = อังกฤษ · commit เจาะจง (`git add <file>`)
- **กันชน:** สาย DA กำลังทำ **B068 (ใส่ข้อมูลเส้นเอื้อนใน data/SQL)** ขนานกัน → **คุณแตะแค่ `src/components/NoteRow.vue`** (โค้ด render) · อย่าแตะ data/SQL/parser → ไม่ชน

## งานที่ได้รับ — B062: วาดเส้นเอื้อน (slur/tie) เป็นเส้นโค้งต่อเนื่อง
**อาการ:** เส้นเอื้อน/ไท ที่ลากยาวข้ามหลายโน้ต/หลายห้อง **ขาดเป็นท่อนสั้นๆ** (ภาพ `docs/backlog-assets/B062-slur-curve-wrong.jpg` = แอปเรา · `-correct.jpg` = ต้นฉบับถูก เพลง 100)
**ต้นตอ:** `.g-slur::before` ใน `NoteRow.vue` = CSS arc ผูกกับ **กลุ่มเดียว** → ยาวข้ามกลุ่ม/ห้องไม่ได้
**แก้:** วาด slur/tie เป็น **SVG path โค้งเรียบต่อเนื่อง** คลุมช่วงจริง (ทุกความยาว) แทน CSS pseudo-arc

### เจ้าของการวาดเส้น = สายนี้เจ้าเดียว
**เฉพาะสาย Android เท่านั้นที่แตะ `NoteRow.vue`/การวาดเส้น** · สาย DA (B068) ทำแค่ *ข้อมูล* (`( )`/`~` ใน content) — ไม่วาด · ถ้าเห็นว่ามีใครแก้ render อยู่ = แจ้ง PM (เคย drift มาแล้ว 10 ก.ค.)

### หมายเหตุ engraving (ไอเดียส่งต่อจากสาย DA — ทำให้เส้นสวยถูกหลัก)
- เส้นเอื้อนที่ถูกหลัก engraving = **รูปทรงเติมสี (filled path) ปลายเรียว หนากลาง** (ไม่ใช่เส้น stroke หนาเท่ากันทั้งเส้น) → ใช้ SVG `<path fill>` โค้ง 2 ขอบมาบรรจบ
- ปลายโค้งเริ่ม/จบเหนือหัวโน้ตตัวแรก/ตัวสุดท้ายของช่วง · สูงพองามไม่ชนเลขโน้ต

### ของที่ parser มีให้แล้ว (ไม่ต้องแก้ parser)
- `src/lib/notation.js` — `( )` = token `{type:'open'/'close', group:'slur'}` · `~` นำหน้าโน้ต → `t.tieStart`/`t.tieEnd`
- `NoteRow.vue` — มี class เดิม `.g-slur` (slur group) · `.nt.tie-start`/`.nt.tie-end` (half-arc ข้ามห้อง) → เปลี่ยนตรงนี้เป็น SVG
- `NoteRow.vue` เป็น **shared** (ใช้ทั้งฝึกร้อง/แผ่นเพลง/แก้ไข) → เช็กว่าโค้งถูกทุกโหมด

### verify แบบ offline (ทำได้บนมือถือ)
- **0/120 เพลงจริงมี tie/slur** (นั่นคืองาน DA B068 ที่ทำขนาน) → บนเครื่องนี้ **ทดสอบด้วยโน้ตจำลอง** เช่น `(1 2 3 4)`, `6~6`, ข้ามห้อง `1 2 | ~2 3`
- เขียน unit test (vitest) ใส่ token เอง → เช็กว่าเกิด SVG path เดียวยาวคลุมช่วง (ไม่ใช่หลาย arc)
- ถ้ารัน `npm` บนเครื่องไม่ได้ → เขียนโค้ด + เทสต์ให้ครบ แล้วบอกในรายงานว่า "ยังไม่ได้รัน" → PM/desktop รันยืนยัน
- ⚠️ **print PDF จริง = ยัง verify บนมือถือไม่ได้** → เป็น gate สุดท้ายของ P'Aim (อย่าเคลม "เสร็จ" จากภาพบนจอ)

## รายงานกลับ (session-agnostic — อย่า hardcode ชื่อ PM)
(1) เขียน `docs/reports/b062-slur.md` (ทำอะไร · ไฟล์ · เทสต์ · รันแล้ว/ยัง) · (2) เพิ่มบรรทัดใน `docs/pm/board.md` §📥 inbox · (3) ping "PM session ปัจจุบัน" ตาม `docs/pm/board.md` §🎯 (ตอนนี้ = `PM รอบ 10 ก.ค. (a)`)

> งานนี้ PM ตั้งไว้ตามคำแนะนำ (offline-friendly · ไม่ชน DA) — ถ้า P'Aim เปลี่ยนงาน ให้แก้ section "งานที่ได้รับ" ก่อนเริ่ม
