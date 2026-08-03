# Brief — แก้ป้ายปุ่มคอร์ดให้ตรงระบบ (โรมัน I IV V)

**สายงาน slug:** `chord-roman-label` · **branch:** fork ใหม่จากฐาน `studio-shell-redesign`
**PM ปัจจุบัน:** `pm27` · **ห้าม merge/deploy เอง** · refine ไม่ redesign

## ปัญหา (P'Aim เคาะ 15 ก.ค. = ใช้ระบบ "โรมัน I IV V")
ป้าย/badge ปุ่มสลับคอร์ด**เขียนผิดระบบ** — บอกเป็นนัชวิลล์ แต่ของจริงเรนเดอร์โรมัน:
- `src/views/Studio.vue:150` → `{ value: 'roman', label: 'เลขนัชวิลล์ (1 4 5)' }`
- `src/components/SongViewer.vue:48` → `{ value: 'roman', label: 'เลขนัชวิลล์ (1 4 5)' }`
- `src/components/SongViewer.vue:504` → `CHORD_BADGE = { letter: 'ABC', roman: '145', hidden: '—' }`
- ของจริง: internal value `'roman'` · `chords.js chordToRoman()` เรนเดอร์ **I / IV / V / vi / vii°** · คู่มือ ① เขียน "คอร์ดโรมัน" ถูกอยู่แล้ว (rationale: ใช้โรมันเพื่อไม่ปนกับเลขโน้ตทำนอง 1-7)

## งาน (align ทุกจุดให้เป็น "โรมัน")
1. แก้ label 2 จุด (`Studio.vue:150` + `SongViewer.vue:48`): `'เลขนัชวิลล์ (1 4 5)'` → **`'คอร์ดโรมัน (I IV V)'`** (ให้ตรงคู่มือ)
2. แก้ badge (`SongViewer.vue:504`): `roman: '145'` → สัญลักษณ์ที่สื่อ "เลขโรมัน" ชัดและอ่านง่ายในพื้นที่แคบ (เสนอ `'I·V'` — เลือกให้อ่านออกไม่กำกวมกับ "4/5"; อย่าใช้ `'IV'` เดี่ยวเพราะอ่านเป็น "สี่")
3. **⛔ ไม่แตะ output/logic** — `chordToRoman()` ถูกอยู่แล้ว (เรนเดอร์โรมัน) · แค่แก้ข้อความป้าย/badge
4. **⛔ ไม่แตะ `Guide.vue`/`About.vue`** (สาย `guide-update` ถืออยู่ · ยังไม่ merge) — คู่มือ ① เขียน "คอร์ดโรมัน" ถูกแล้ว · ② ของ guide-update PM จะดูตอน merge ให้สอดคล้อง
5. **⛔ ไม่แตะ ShellBar/drawer** (สาย `pwa-install` ถืออยู่)

## DoD
- ป้าย 2 จุด + badge = "โรมัน" ตรงกัน · เปิดปุ่มในหน้าเพลง + ห้องทำเพลง เห็นตรงทั้งคู่ · คอร์ดเรนเดอร์ I/IV/V เหมือนเดิม (ไม่เปลี่ยน output)
- grep ทั้ง repo ไม่เหลือคำ "นัชวิลล์" ที่ค้าง (ยกเว้นในไฟล์ที่สายอื่นถือ — flag มา PM)
- `npm test` เขียว (แก้ test ที่ assert label เดิมถ้ามี) + `vite build` ผ่าน + live เห็นป้ายใหม่ 0 console error

## Setup + รายงานกลับ
- verify fork ถูกฐาน `studio-shell-redesign` · ผิด → `git switch -c chord-roman-label studio-shell-redesign`
- `npm install` → dev `--host` → Network URL
- รายงาน: `docs/reports/chord-roman-label.md` + board §📥 inbox + ping **pm27**
