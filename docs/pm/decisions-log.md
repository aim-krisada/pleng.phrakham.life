# Decisions log — เพลง.พระคำ.ชีวิต (append-only · ทีละบรรทัด · ที่มาที่ไปแบบอ่านครั้งเดียวจบ)

> มติ + เหตุผล ทีละบรรทัด (ใหม่สุดล่างสุด) · แทน transcript · PM/พี่ใดก็อ่านที่มาที่ไปได้โดยไม่รื้อประวัติ

## รูปแบบ: `YYYY-MM-DD · มติ — เพราะ`

- 2026-07-22 · **home/nav (สาย 2) merge เข้า base** — gate ผ่าน (759 เทสต์ · verify live ธีม/footer/i18n · อยู่ในเลน)
- 2026-07-22 · editor merge target = **`editor-usability`** ไม่ใช่ `claude/peaceful-bhaskara` — อันหลังเป็น docs เก่าไม่มี impl
- 2026-07-23 · lyric-align **ไม่รื้อ SongSheet ใหม่** (musical-moment) — ปรึกษา G + scoping พบว่าจะพัง beam/slur ที่ ship แล้ว (B110/B118) เสี่ยงสูง คุ้มน้อย
- 2026-07-23 · **P0 grid align** (pin คำใต้โน้ต) ทำแล้ว `a343571` — reuse ~45 บรรทัด ไม่แตะ `.note-row`
- 2026-07-23 · **P2 melisma slur = ทำ** — โน้ตว่าง=held ต้องมีเส้นโค้ง (มาตรฐาน jianpu · G ยืนยัน) · reuse engine B062/B118 · **derive จาก blank-run ก่อน · ⛔ ไม่ re-import**
- 2026-07-23 · **คอร์ดเข้าชุด alignment** — pin เหนือโน้ต ชิดซ้าย (มุมซ้าย=โน้ตที่เริ่มคอร์ด · เพราะคอร์ดยาว C#dim/G7 จัดกลางเบี้ยว)
- 2026-07-23 · **songbook เนื้อล้วน = ไหลต่อเนื่อง DEFAULT ไม่มี toggle** (พี่เปายืนยัน) — ข้อ=ย่อหน้าใหม่ · ตัดที่จบวลี · คั่น=เว้นวรรค (ผู้สูงอายุตาไม่ดี) · density=auto · ท่อนรับแยก+(รับ) · = หน้ากากแบบโบสถ์ไทย
- 2026-07-23 · **สถาปัตย์ = SSOT สากล + output ≥2 format** (สากล / โบสถ์ไทย) — ยืนยันจาก `บทวิเคราะห์-สถาปัตยกรรม.md` (พี่+G ตกผลึก)
- 2026-07-23 · **เลือกขนาดกระดาษพิมพ์ได้** (B121)
- 2026-07-23 · **PM mode = จ่ายงาน+อ่านสรุปเท่านั้น** · สมอง PM บน disk (`docs/pm/`) · re-spawnable · verify จ่าย Tester
- 2026-07-23 · **backlog คงที่ `docs/backlog.md`** (กล่องกลาง shared) · สมอง PM → `docs/pm/` — ไม่ย้าย backlog เข้า work/ (ผิด flow + คนอื่นหาไม่เจอ)
- 2026-07-23 · **เปิด Tester session ประจำ** (spun) รับงาน verify → verdict 4 บรรทัด · read-only · PM ไม่ verify เอง
- 2026-07-23 · **PM operating model เข้า memory** (`feedback_pm_brain_on_disk` · ⭐⭐) ใช้ทุก PM ทุกโปรเจกต์ · แจ้ง pk pm ทำเหมือนกัน (พระคำ)
- 2026-07-23 · **alignment 3 จุด (คำ/melisma/คอร์ด) PASS** บน `editor-usability` `8c508be` — Tester verify geometry จริง (คอร์ด 0.05px · คำ/เส้น 0.1px · 792 เทสต์) · pre-merge เหลือ: กวาดคลัง over-draw + P'Aim พิมพ์ PDF จริง
- 2026-07-23 · **Tester #2 กวาดคลัง 149 เพลง — ไม่มี over-draw ยักษ์** (98% melisma 2 โน้ตปกติ) · alignment PASS ทุก breakpoint · เจอ artifact `"` 1 จุด + 5 เพลง judgment + 2 minor (B122 arcPlan≥3บรรทัด · B123 shell h-scroll 8px)
- 2026-07-23 · P'Aim เคาะ **(ก) แก้ artifact `"` ก่อน แล้ว merge** — จ่าย editor แก้ render-side (ไม่แตะ DB)
- 2026-07-23 · **พี่เปา: current editor ใส่ไม่ได้ทุกคอร์ด → จ่าย hotfix** (branch `chords-all-standard` จาก main) — engine (`parseChord`) รองรับครบแล้ว แก้แค่ input UI · branch จาก main (base ยังไม่ release · พี่เปาใช้เลย) · deploy รอ P'Aim go + port base
- 2026-07-23 · **render/screenshot SSOT = `C:\gl\CLAUDE.md §4`** (Chromium headless+CDP · ห้าม Edge) — โหลดทุก session ทุกโปรเจกต์ · **ไม่เก็บ memory ซ้ำ** (กัน drift) · 2 PM (pl+pk) ยืนยันปิดเคส
- 2026-07-23 · **5-song melisma eyeball (P'Aim/พี่เปา): 1-3 เอื้อนถูก · 4=เส้นซ้อน(dedup bug) · 5="แห่ง"→โน้ต2 เกิน** → derive ~ดีแต่มี false-positive · จ่าย editor แก้ #4 dedup + #5 (ไม่ลบเส้นถูก 1-3) ก่อน merge

## มติล็อกก่อนหน้า (ยกมาไว้อ่านครั้งเดียว)
- ⛔ **ห้าม re-import/bulk-write 120 เพลง** — ทีมแก้ live อยู่ · migration ทำตอน app เสร็จ
- คง **Vue3+Vite** (ไม่ Nuxt/Tailwind) · คง bookshelf หน้าแรก · ripple default · backspace ลบชิด
- **แปล zh/en สุดท้าย** (หลัง string นิ่ง) · **ไม่ release จนเสร็จ** · **main = P'Aim สั่ง go เท่านั้น**
- font = **Hybrid Noto** (UI self-host+subset · เนื้อจีน system CJK) · favorites/playlist **ไม่มี account** · **merge = PM เท่านั้น**
