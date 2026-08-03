# BRIEF (Dev) — บั๊กโหมด repeat: กดคำ = seek เท่านั้น (ไม่เปลี่ยนลูป) · พี่เปา

**สาย:** Dev · **จ่ายโดย:** pm22 · 13 ก.ค. 2026 · **ฐาน:** `studio-shell-redesign`
**ที่มา:** พี่เปาแจ้งผ่าน P'Aim (ปากเปล่า) + รูป `pleng2-pow-bug-report/issues4/20260713-170932.png` (หน้าแผ่นเพลง "พระเยซูเข้าสู่ใจข้า" + แถบเล่นเพลง = หน้าที่เกิดบั๊ก)

## อาการ (ผิดตอนนี้)
เปิดเล่นเพลง (มีการเลือกท่อน/วนไว้) → **คลิกที่คำ/โน้ตจุดหนึ่ง** → เพลงเล่นจากจุดนั้นไปจน**จบเพลง** แล้ว**วนกลับมาเริ่มที่จุดที่คลิก**ซ้ำๆ (การคลิก "ยึด" ลูปใหม่เป็น จุดคลิก→จบเพลง)

## พฤติกรรมที่ถูก (requirement · คำ P'Aim ยืนยัน)
- **เมนู "เลือกท่อน" = SSOT ของลำดับ/การวนการเล่น** → playback เล่น + วน **ตามที่กำหนดในเมนูเสมอ**
- **คลิกเลือกคำ = "seek/เลื่อนหัวเล่น" ไปที่คำนั้นอย่างเดียว** (เหมือนลาก playhead บน timeline แต่ชี้ด้วยคำ) → **ไม่แตะ/ไม่เขียนทับ ลูปหรือลำดับ**
- หลัง seek: เล่นต่อไปตามลำดับ/ลูปที่เมนูกำหนด (พอถึงปลายท่อนที่กำหนด → วนกลับ "ต้นท่อนที่กำหนด" ไม่ใช่จุดคลิก ไม่ใช่ต้นเพลง)

## routing (ตรวจก่อน — อย่าเดา)
- หา logic playback loop / play-order (เกี่ยว **B102 play-order resolver** · memory `pleng-repeat-symbols-b102`) + ตัว handler ตอน **คลิกคำ/โน้ต** ระหว่างเล่น
- แก้ให้ **click → set playhead position (seek) เท่านั้น** · **ไม่ set loop start/end** · loop start/end มาจาก "เลือกท่อน" resolver เท่านั้น
- **⚠️ COLLISION:** click handler อาจอยู่ใน `SongSheet.vue`/`NoteRow.vue` (สาย tie Dev + issues3 Dev แตะอยู่) → **ถ้าต้องแตะ 2 ไฟล์นี้ = ping PM** (จัดลำดับ merge/rebase) · ถ้าแก้ได้ที่ transport/playback controller ล้วน = ดีสุด

## setup + verify (audio/playback bug = พิสูจน์ด้วยหู + playhead จริง ไม่ใช่ proxy)
- worktree branch ใหม่จากฐาน **studio-shell-redesign** · **verify fork base เอง** `git merge-base --is-ancestor studio-shell-redesign HEAD`
- **Supabase env `SUPABASE_*_PLENG` + ล็อกอิน team** เปิดเพลงจริง (public 0 เพลง) · ล็อกอินไม่ได้ → ping PM · dev server **`--host`** + Network URL
- **verify (memory `feedback_heard_bugs_prove_by_ear`):** ตั้งเลือกท่อน/วน → เล่น → คลิกคำกลางเพลง → ยืนยันว่า (1) หัวเล่นกระโดดไปคำนั้น (2) **เล่นต่อ+วนตามท่อนที่กำหนด ไม่ใช่ จุดคลิก→จบ** · พิสูจน์ด้วยเสียงจริง + playhead indicator (ไม่ใช่เดาจากโค้ด)

## รายงานกลับ (session-agnostic)
`docs/reports/bug-repeat-seek.md` (root cause + fix + วิธี verify ด้วยหู/playhead + Network URL) · §📥 inbox `docs/pm/board.md` + ping "PM ปัจจุบัน" (board §🎯 — อย่า hardcode ชื่อสาย) · **ไม่ merge/deploy**
