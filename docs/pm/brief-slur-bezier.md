# Brief — B076: เส้นเอื้อน/ไทบิด → คำนวณ Bézier ตามความกว้างจริง (จาก jianpu-ly research)

**สั่งโดย:** pm7 (P'Aim 11 ก.ค. · เป้าหมายวันนี้ข้อ 3) · **branch:** `git switch -c slur-bezier studio-shell-redesign`
**ที่มา:** `docs/reports/jianpu-ly-study.md` ข้อ (ค)#2 — LilyPond ไม่ "ยืดรูปสำเร็จ" แต่ "คำนวณเส้นตามระยะจริง" → เอา *หลักการ* มาแก้ (ไม่ลอกโค้ด · Apache 2.0 ok)

## ปัญหา (ยืนยันในโค้ดแล้ว)
`src/components/NoteRow.vue`:
- **บรรทัด 34:** slur = `<svg viewBox="0 0 100 40" preserveAspectRatio="none">` + path ตายตัว `d="M5,33 C26,3 74,3 95,33 …"` → **`preserveAspectRatio="none"` ยืด path คงที่ให้เท่าความกว้าง group** → พอเอื้อนยาว (8+ โน้ต) เส้นถูกยืดแนวนอนจน **บิด/แบน/ผิดรูป** (ปลายไม่เรียว มุมเพี้ยน)
- **บรรทัด 48-55:** tie (`tie-start-arc`/`tie-end-arc`) ใช้ `preserveAspectRatio="none"` + path ตายตัวเหมือนกัน → บิดเมื่อยืด

## เป้าหมายแก้
เส้นเอื้อน/ไท = **โค้งรูปทรงคงที่สวยทุกความยาว** (สั้น 2 โน้ต ↔ ยาว 8+ โน้ต) — ปลายเรียว หนากลาง ไม่บิด/ไม่แบน
- **วิธี:** เลิกยืด path สำเร็จ → **คำนวณ `d` (จุดควบคุม Bézier) จากความกว้างจริงของ group** (px/หน่วยจริง) ให้จุดควบคุมสเกลตามสัดส่วน (ความสูงโค้ง ~คงที่ · ปลายเรียวคงที่ · ไม่ยืดตามแกน x อย่างเดียว) — เขียน `d` แบบ dynamic ตาม width หรือใช้ viewBox ที่ไม่ stretch + คำนวณ control points
- คงลักษณะ engraving เดิม (filled lens ปลายเรียว หนากลาง) แค่ทำให้ไม่บิด
- slur (ในกลุ่ม) + tie (2 ครึ่ง ในห้อง/ข้ามห้องฝั่ง NoteRow) ใช้หลักเดียวกัน

## รั้ว (กันชน)
- **แตะได้:** `src/components/NoteRow.vue` (+ `NoteRow.test.js`) เท่านั้น
- **⛔ ห้ามแตะ:** `SongSheet.vue` (DockKey phase2 ถืออยู่ + B069 cross-bar overlay = คนละกลไก · ถ้า B069 overlay บิดด้วย = **follow-up แยก** แจ้ง pm7 ไม่แก้ตอนนี้) · `DockKey.vue`/`EditorMode.vue`/`styles.css`/`ShellBar`/`songSearch`
- NoteRow ใช้ทั้ง ฝึกร้อง/แผ่นเพลง/แก้ไข → verify ว่าไม่พังหน้าไหน

## มาตรฐาน + DoD
- ยึด `docs/ui-standards.md` · **tester (`tester-qa`) จะตรวจ** — แต่นี่คือ render สายตา: dev verify + P'Aim/tester ดูรูปโค้งจริง
- **verify (เน้น):** slur สั้น (2-3 โน้ต) + **ยาว (เอื้อน 8 โน้ต `(1 2 3 4 5 6 7 1')`) = โค้งเดียวเรียบ ไม่บิด/ไม่แบน** · tie ในห้อง+ข้ามห้อง (ครึ่ง NoteRow) เรียบ · เทียบ before/after (แนบภาพ) · **print PDF** (เส้นบนกระดาษไม่บิด) · ไม่ regress 3 หน้า
- vitest + build · dev `--host` + Network URL · รายงาน `docs/reports/slur-bezier.md` + board §📥 inbox + ping **pm7** · ⛔ ห้าม merge/deploy
