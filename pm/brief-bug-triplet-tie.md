# BRIEF (Dev) — บั๊กเรนเดอร์โน้ต: triplet เลข 3 ชัด + เส้น tie โยงตัวเลข (พี่เปา issues1)

**สาย:** Dev · **จ่ายโดย:** pm22 · 13 ก.ค. 2026 · **ฐาน:** `studio-shell-redesign`
**ที่มา:** พี่เปา bug report `OneDrive/4 Personal/pleng.phrakham.life/pleng2-pow-bug-report/issues1/` (`new 1.txt` + `20260711-234408.png`) · เพลงตัวอย่าง = **"2. ของขวัญ"**

## อาการ (คำพี่เปา — verbatim)
1. **"เครื่องหมาย triplet ขอเลข 3 อ่านชัดกว่านี้ เวลาคนเล่นดนตรีจะได้ชัดเจน"** → เลข 3 บนวงเล็บ triplet (เช่นเหนือกลุ่ม `1 2 3`) เล็ก/จางไป อ่านยาก
2. **"เส้น tie 4 และ 6 ต้องต่อโยงจากตัวเลขไปตัวเลข ไม่เส้นขาดจากกัน เรื่องนี้บอกไปหลายทีแล้ว"** → เส้น tie/โยง (เอื้อน) ต้องต่อเนื่องจากเลขหนึ่งไปอีกเลข ไม่ขาดกลาง · **recurring — แจ้งหลายรอบ** (ดู screenshot พี่เปาเป็นเกณฑ์ว่าจุดไหนขาด)

## บริบทงาน tie เดิม (อย่าทำพัง)
tie รอบก่อนแก้ไปแล้วหลายเคส + ขึ้นแอปแล้ว: **ข้ามห้อง (B069)** · **ในห้องเดียวกันเป็นโบว์โค้งเดียว (รอบ 14)** → **นี่คือเคสที่ยังเหลือ/ยังขาด** · **ตรวจก่อนว่าเป็น data ไม่ได้ encode tie หรือ render ไม่ลากเส้น** (memory lane: DA encode ~/`( )` เข้า data · render ลาก SVG arc) — **เจ้าของงานนี้ owns end-to-end** (บั๊ก recurring เพราะเด้งไปมาระหว่าง lane · รอบนี้แก้ให้จบ ทั้ง data ถ้าจำเป็น + render)

## requirement
- เลข 3 ของ triplet: ใหญ่/เข้มขึ้น อ่านชัดสำหรับนักดนตรี (คงตำแหน่งเหนือวงเล็บ · ไม่ทำ layout เพี้ยน)
- เส้น tie: โค้งต่อเนื่อง **เลข→เลข** ไม่ขาด (ทั้งบนจอ + พิมพ์ PDF ถ้าเกี่ยว)

## routing (ไฟล์ที่น่าจะเกี่ยว)
`src/components/NoteRow.vue` · `src/components/NoteBoxes.vue` · `src/components/SongSheet.vue` · `src/lib/notation.js` (parse triplet/tie) · **แตะเฉพาะ render/parse โน้ต** ไม่ยุ่ง dock/editor logic/audio

## setup + verify (บั๊กภาพ = ต้อง render จริง เทียบ screenshot พี่เปา)
- worktree branch ใหม่จากฐาน **studio-shell-redesign** · **verify fork base เอง** (`git merge-base --is-ancestor studio-shell-redesign HEAD`) ก่อนเริ่ม
- **Supabase env `SUPABASE_*_PLENG` + ล็อกอิน team** (public เห็น 0 เพลง) → เปิดเพลง **"ของขวัญ"** จริง · ล็อกอินไม่ได้ → ping PM
- dev server **`--host`** ใส่ **Network URL** ในรายงาน
- **verify แบบเห็นจริง (ไม่เอา DOM proxy):** render "ของขวัญ" → screenshot เทียบ `issues1/20260711-234408.png` ว่า (1) เลข 3 ชัดขึ้นจริง (2) tie จุดที่พี่เปาชี้ ต่อเนื่องเลข→เลข ไม่ขาด · **ถ้าเกี่ยวการพิมพ์ → export PDF จริงเช็กด้วย** (memory: print bug พิสูจน์จาก PDF จริง) · เช็ก no-regression tie เคสเดิม (ข้ามห้อง/ในห้อง) ยังสวย

## รายงานกลับ (session-agnostic)
`docs/reports/bug-triplet-tie.md` + screenshot before/after (จอ + PDF ถ้าเกี่ยว) + Network URL · เพิ่ม §📥 inbox `docs/pm/board.md` + ping "PM ปัจจุบัน" (board §🎯 — อย่า hardcode ชื่อสาย) · **ไม่ merge/deploy** — PM gate + P'Aim/พี่เปา ดูก่อน
