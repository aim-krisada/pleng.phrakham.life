# Brief — B099: เส้นโค้ง slur/ไท เหนือโน้ต วาดขาด (ควรต่อเป็นเส้นเดียว)

**ฐาน:** `studio-shell-redesign` · **worktree/branch ใหม่:** `b099-slur-curve` (แตกจากฐาน · เช็ก `git branch --show-current` ก่อน commit)
**สั่งโดย:** PM (pm11) · ที่มา: P'Aim 12 ก.ค. (ภาพ `docs/pm/realuse-assets/B099-slur-broken-bowtie.jpg`)

## อาการ (P'Aim รายงาน + ภาพ)
เส้นโค้ง slur/ไท เหนือโน้ต (เช่น `1 . 1`) วาดออกมาเป็น **2 ครึ่งไขว้กันตรงกลางเป็นรูปโบว์ (bowtie)** — ไม่ต่อเป็นเส้นเดียว. P'Aim: **"ควรต่อแต่ไม่ต่อ"** → ต้องเป็น **เส้นโค้งเดียวต่อเนื่อง** เชื่อมจากโน้ตแรกไปโน้ตหลังอย่างลื่น (ดูภาพประกอบ)

## สิ่งที่ต้องได้
- เส้นโค้ง slur/ไท เหนือกลุ่มโน้ต = **arc เดียว โค้งลื่น** (ไม่ขาด ไม่ไขว้ ไม่เป็นโบว์) เชื่อมโน้ตต้น→ปลายของ slur
- ครอบทุกที่ที่วาดเส้นนี้: หน้าแก้ไข (ตามภาพ) + แผ่นเพลง/พรีวิว/พิมพ์ ถ้าใช้ตัววาดเดียวกัน

## ขอบเขต (สายที่รับ = วิเคราะห์เอง+แก้+verify)
- ไปหาว่าเส้นโค้งนี้วาดที่ไหน (pointer: `src/components/NoteRow.vue` และ/หรือ `SongSheet.vue` มี slur/arc/path · เกี่ยวงานเดิม B076 slur / `brief-slur-bezier.md`) แล้วแก้ path ให้เป็น arc เดียวต่อเนื่อง
- **KISS — ซ่อมของเดิม ไม่รื้อ** · ถ้าเจอว่ารากปัญหาลามไปโครงสร้าง ping PM ก่อน
- ตาม `docs/ui-standards.md`

## DoD + รายงาน (session-agnostic)
- `npx vitest run` เขียว (`notationLint` quirk เดิม ไม่นับ) + `npm run build` ผ่าน · เพิ่ม/ปรับ test ถ้าเส้นวาดจาก logic ที่ test ได้
- dev server **`--host`** + **Network URL** ในรายงาน
- **verify เบราว์เซอร์จริง:** เปิดเคสที่มี slur/ไท (เช่น `1 . 1` มีเส้นโค้ง) → เส้นเป็น **arc เดียวลื่น ไม่เป็นโบว์** · เทียบก่อน/หลัง แนบภาพ
- รายงาน: `docs/reports/b099-slur-curve.md` + บรรทัดใน `board.md` §📥 inbox + ping **PM ปัจจุบันใน `board.md` §🎯 (pm11)** · **เขียน report ลง branch ตัวเอง ไม่ commit ลง base**
- ⛔ **ห้าม self-merge เข้าฐาน / ห้าม deploy** — tester gate ก่อน แล้ว PM cherry-pick + deploy
