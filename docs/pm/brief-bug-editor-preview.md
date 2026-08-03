# BRIEF (Dev) — บั๊ก: "ดูผลทั้งเพลง" ในหน้าแก้ไข โชว์ไม่เหมือนหน้าแผ่นเพลง (พี่เปา issues3)

**สาย:** Dev · **จ่ายโดย:** pm22 · 13 ก.ค. 2026 · **ฐาน:** `studio-shell-redesign`
**ที่มา:** พี่เปา `pleng2-pow-bug-report/issues3/` (`new 1.txt` + `20260713-165349.png`) · เพลง = "3. ในโลกนี้"

## อาการ (คำพี่เปา)
"หน้าแก้ไข · ปุ่ม **ดูผลเพลงทั้งเพลง** โชว์ไม่เหมือนหน้าแผ่นเพลง **บรรทัดตก** ต้องแก้ให้โชว์เหมือนหน้าแผ่นเพลง"
→ พาเนล preview "ดูผลทั้งเพลง" (ในหน้าแก้ไข) จัดบรรทัด/ตัดคำ **ไม่ตรงกับหน้าแผ่นเพลงจริง** (SongView) · บรรทัดตก/เบียด

## requirement
พาเนล "ดูผลทั้งเพลง" ต้อง render **เหมือนหน้าแผ่นเพลง (SongView/SongSheet) เป๊ะ** — บรรทัด/การตัดห้อง/สเกล ตรงกัน (ให้ผู้ใช้เห็น preview = ผลจริง)

## routing (ตรวจก่อน — อย่าเดา)
- หา component ของ preview "ดูผลทั้งเพลง" (น่าจะใน `EditorMode.vue` หรือ preview modal) · เทียบ path การ render กับหน้า `SongView`/`SongSheet.vue`
- น่าจะต่างที่ **ความกว้าง container / scale / reuse component คนละตัว** → ทำให้ preview reuse SongSheet ด้วย width เดียวกับหน้าจริง
- **⚠️ COLLISION NOTE:** มีอีกสาย (tie Dev) กำลังแก้ `SongSheet.vue`/`NoteRow.vue` (บั๊ก tie/triplet) พร้อมกัน → **ถ้างานคุณต้องแตะ SongSheet.vue ให้ ping PM ก่อน** · PM จะ merge tie Dev เข้า base ก่อน แล้วให้คุณ rebase (เลี่ยง conflict) · ถ้าแก้ได้ที่ preview wrapper/container โดยไม่แตะ SongSheet core = ดีสุด

## setup + verify
- worktree branch ใหม่จากฐาน **studio-shell-redesign** · **verify fork base เอง** (`git merge-base --is-ancestor studio-shell-redesign HEAD`)
- **Supabase env + ล็อกอิน team** เปิดเพลง "ในโลกนี้" หน้าแก้ไข (public 0 เพลง) · ล็อกอินไม่ได้ → ping PM · dev server **`--host`** + Network URL
- **verify เห็นจริง:** เปิด "ดูผลทั้งเพลง" เทียบกับหน้าแผ่นเพลงจริงของเพลงเดียวกัน → บรรทัด/ตัดห้อง ตรงกัน (screenshot คู่) · no-regression หน้าแก้ไข/แผ่นเพลง

## รายงานกลับ (session-agnostic)
`docs/reports/bug-editor-preview.md` + screenshot preview-vs-sheet + Network URL · §📥 inbox `docs/pm/board.md` + ping "PM ปัจจุบัน" · **ไม่ merge/deploy**
