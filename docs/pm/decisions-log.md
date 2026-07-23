# Decisions log — เพลง.พระคำ.ชีวิต (มติที่ยัง relevant · ใหม่สุดล่างสุด)

> มติ + เหตุผลทีละบรรทัด · แทน transcript · resolved/เก่า → `decisions-archive.md` · rehydrate อ่านไฟล์นี้ + `pm-state.md` พอ

## Milestones (สถานะสำคัญปัจจุบัน)
- 2026-07-22 · **home/nav (สาย 2) → base** (ธีมอุ่น+สดใส · ★favorites · i18n th · แชร์/QR/playlist · brand marigold)
- 2026-07-23 · **editor redesign ครบ → base `3a3e618`** (Tester job D PASS: build+804 เทสต์ · slur 3 ชนิดอยู่ร่วมกัน ≤0.06px · ไม่ regress) — inline editor + คำใต้โน้ต + melisma + คอร์ด + slur geometry · **base = แอปใหม่ทั้งชุด (ยังไม่ deploy)**
- 2026-07-23 · **คอร์ด hotfix → LIVE production `5661068`** (พี่เปาพิมพ์คอร์ดมาตรฐานครบ + ENTER เลือกคอร์ด · verify live bundle) · ⚠️ **main(chord) กับ base(editor redesign) diverged → port chord เข้า base + reconcile ก่อน full deploy ครั้งหน้า**

## สถาปัตย์ + กฎ (durable)
- **สถาปัตย์ = SSOT สากล 1 ชุด (v2, MusicXML-like) → output ≥2 format** (มาตรฐานสากล / แบบโบสถ์ไทย) · alignment = core format-agnostic · masks = display layer · ที่มา `บทวิเคราะห์-สถาปัตยกรรม.md`
- **PM operating model = กฎกลาง `C:\gl\CLAUDE.md §4.5`** (universal ทุกโปรเจกต์) · **browser/render isolation = §4** · SSOT เดียว ไม่ dupe memory · live state ต่อโปรเจกต์อยู่ `docs/pm/`
- **backlog = `docs/backlog.md`** (กล่องกลาง shared) · **สมอง PM = `docs/pm/`** (pm-state + decisions-log)
- **บทเรียน (จำ):** seat แก้ให้ถูกตามมาตรฐานเอง — ไม่โยน choice เรื่องความถูกต้องให้ P'Aim · ไม่ตีความคำติ "ตำแหน่ง/ยาวเกิน" เป็น "เอาออก" · อย่าป้อน claim ตัวเลขไม่แม่นให้ Tester · (รายละเอียด → archive)

## Queued (ตัดสินแล้ว · รอ build)
- **songbook (B120) = หน้ากาก "แบบอนุชน" (มีโน้ต) — P'Aim เคาะ 23 ก.ค.** · สเปกเดิมที่บันทึกว่า "เนื้อล้วน" = **บันทึกผิด/คนละเล่ม** → ย้ายเป็น **B126 เนื้อล้วน (แบบเล่มบทเพลง)** ทำทีหลัง
  - อ้างอิงของจริง: `OneDrive/1 Devotional/hymm/อนุชน 01-120 THEN…pdf` (jianpu + คอร์ดเหนือโน้ต · คีย์+จังหวะ+ข้อพระคัมภีร์ใต้ชื่อ · เนื้อใต้โน้ตเฉพาะข้อ 1 · ข้อ 2-4 ข้อความล้วน · ท่อนรับใช้วงเล็บ · 1 เพลง=2 หน้า ไทย/อังกฤษแยกหน้า)
  - "เล่มใหญ่" (รูปถ่าย 24 ใบใน `work/ปรับ pl edit ui/`) = กำลังวิเคราะห์เป็น reference เพิ่ม
  - ที่ยังยึดได้: DEFAULT ไม่มี toggle · ข้อ=ย่อหน้าใหม่ · ตัดที่จบวลี · density=auto
- **เลือกขนาดกระดาษพิมพ์ (B121)** · follow-up bugs B122-B125
- **2026-07-23 · release นี้ target = พี่เปา (ผู้ใช้จริง) ไม่ใช่สาธารณะ** — "ครบ" วัดที่พี่เปาใช้งานจริงได้จบ flow · zh/en · dark · B121 · B126 = เลื่อนหลัง release
- **2026-07-23 · "เล่มใหญ่" (P'Aim เคาะ): ⛔ ไม่ทำบรรทัด 5 เส้น / แนวเบส** — ใช้รูปแบบเดียวกับอนุชน (jianpu + คอร์ด + เนื้อใต้โน้ต) · **แต่ต้องรองรับ "การวนร้อง" หลากหลายแบบ** (D.C./D.S./Fine · 1st-2nd ending · `|: :|` · (รับ) · เลขกำกับซ้ำท่อน) — ทำตาม **มาตรฐานสากล** แล้วจะครอบคลุมเอง → ผูกกับ **B102 symbol-SSOT play-order resolver** (มีของอยู่แล้ว ต่อยอดได้) · ยังไม่รู้ความหมาย "(อ.NNN)" / "(=NNN)" ที่หัวเพลง (สงสัยว่า = ใช้ทำนองร่วมกับเพลงเลขนั้น) — ต้องถาม P'Aim ก่อนทำเล่มใหญ่จริง

## มติล็อกก่อนหน้า (ยกมาไว้อ่านครั้งเดียว)
- ⛔ **ห้าม re-import/bulk-write 120 เพลง** — ทีมแก้ live · migration ทำตอน app เสร็จ
- คง **Vue3+Vite** (ไม่ Nuxt/Tailwind) · คง bookshelf หน้าแรก · ripple default · backspace ลบชิด
- **แปล zh/en สุดท้าย** (หลัง string นิ่ง) · **ไม่ release จนเสร็จ** · **main = P'Aim สั่ง go เท่านั้น**
- font = **Hybrid Noto** · favorites/playlist **ไม่มี account** · **merge = PM เท่านั้น**
