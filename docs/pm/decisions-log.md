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
- **songbook เนื้อล้วนไหลต่อเนื่อง (B120)** — DEFAULT ไม่มี toggle (พี่เปา) · ข้อ=ย่อหน้าใหม่ · ตัดที่จบวลี · คั่น=เว้นวรรค (ผู้สูงอายุ) · density=auto · ท่อนรับแยก+(รับ) · = หน้ากากโบสถ์ไทย · เริ่มได้ (editor merged แล้ว)
- **เลือกขนาดกระดาษพิมพ์ (B121)** · follow-up bugs B122-B125

## มติล็อกก่อนหน้า (ยกมาไว้อ่านครั้งเดียว)
- ⛔ **ห้าม re-import/bulk-write 120 เพลง** — ทีมแก้ live · migration ทำตอน app เสร็จ
- คง **Vue3+Vite** (ไม่ Nuxt/Tailwind) · คง bookshelf หน้าแรก · ripple default · backspace ลบชิด
- **แปล zh/en สุดท้าย** (หลัง string นิ่ง) · **ไม่ release จนเสร็จ** · **main = P'Aim สั่ง go เท่านั้น**
- font = **Hybrid Noto** · favorites/playlist **ไม่มี account** · **merge = PM เท่านั้น**
