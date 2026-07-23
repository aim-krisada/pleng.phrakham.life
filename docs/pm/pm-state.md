# PM state — เพลง.พระคำ.ชีวิต (อ่านไฟล์เดียวนี้ = rehydrate PM ได้ทันที)

> **สมอง PM อยู่บน disk ไม่ใช่ใน context** → PM ตายแล้วเกิดใหม่ได้ (อ่านไฟล์นี้ + `decisions-log.md` พอ ไม่ต้องรื้อ transcript)
> คู่กับ `decisions-log.md` (มติทีละบรรทัด). อัปเดตไฟล์นี้ทุกครั้งที่สถานะเปลี่ยน · เก็บให้ **สั้น** (index ไม่ใช่ prose).

## PM operating model (ตกลง 23 ก.ค.)
- **PM = จ่ายงาน + อ่านสรุป + เคาะ gate เท่านั้น** — ไม่อ่านไฟล์ยาว/รันเทสต์/เปิด PDF เอง (กิน context)
- **P'Aim คุยกับ PM คนเดียว** (single interface) · PM คุย P'Aim ภาษาคนล้วน
- **verify = จ่าย Tester** → รับ verdict 4 บรรทัด (STEP / หลักฐาน+path / ยังไม่พิสูจน์ / ผ่านไหม)
- worker ทุก session รายงานฟอร์แมตสั้นคงที่ · อ่าน artifact ครั้งเดียว บันทึก verdict แล้วไม่เปิดซ้ำ
- **merge = PM เท่านั้น** (สายไม่ merge เอง) · **main = P'Aim สั่ง go เท่านั้น** (auto-deploy)

## Self-maintenance (กัน pm-state บวม — สมอง PM ต้องเล็กเสมอ)
- **อัตโนมัติ (ไม่ต้องสั่ง):** ทุกครั้งที่ **ปิด gate / merge สายเสร็จ** → (ก) ตัดรายการที่เสร็จออกจากตารางสถานะ+gate ของไฟล์นี้ ย่อเป็น 1 บรรทัดใน `decisions-log.md` · (ข) commit · (ค) sync memory ขึ้น OneDrive
- **decisions-log ยาวเกิน** → ย้ายมติเก่าที่ resolved แล้วไป `decisions-archive.md` (rehydrate อ่านแค่ `pm-state` + `decisions-log` ล่าสุด · ไม่อ่าน archive)
- **คำสั่งจากพี่ (จำง่าย):**
  - **"PM เก็บงาน"** = ทำ self-maintenance เดี๋ยวนี้ (prune + archive + commit + sync)
  - **"PM ต่อ"** = (session ใหม่/context หนัก) อ่าน `pm-state`+`decisions-log` = rehydrate แล้วทำต่อ

## SSOT pointers (รายละเอียดอยู่ที่นี่ — อย่า duplicate)
- ideas ทั้งหมด: `docs/backlog.md` (B001–B121)
- ดีไซน์ล็อก: `work/ปรับ pl edit ui/ux-groundup-design.md`
- สถาปัตย์ 2 format: `work/ปรับ pl edit ui/บทวิเคราะห์-สถาปัตยกรรม.md` ("สมองสากล + หน้ากาก 2 แบบ")
- แผน merge: `work/ปรับ pl edit ui/integration-merge-plan.md`
- สถานะ 3 สายละเอียด: `work/ปรับ pl edit ui/RESUME-state.md`

## หลักสถาปัตย์ที่ยึด
score = **SSOT สากล 1 ชุด (v2, MusicXML-like)** → output ได้หลาย format: (1) มาตรฐานสากล (2) แบบโบสถ์ไทย · alignment = format-agnostic (core) · masks = display layer

## สถานะปัจจุบัน (23 ก.ค.)
| งาน | สถานะ | รออะไร |
|---|---|---|
| home/nav (สาย 2) | ✅ merged เข้า base `studio-shell-redesign` | — |
| alignment set (คำ/คอร์ด/melisma) | 🔨 session ทำ (branch `editor-usability`) | หลักฐาน PDF+PNG เพลง 141 → dispatch Tester gate |
| editor keyboard editor | ✅ 224 เทสต์ (บน `editor-usability`) | merge สุดท้าย (PM) |
| songbook Thai-flow (B120) | 📋 queue หลัง alignment | — |
| เลือกขนาดกระดาษ (B121) | 📋 queue | — |
| international mask + MusicXML export | 🔭 epic ถัดไป (SA) | — |
| zh/en แปล · dark mode | ⏸ post-merge | — |

## Sessions map
- editor/alignment (spun): `local_57dcffe1` · branch `editor-usability` · worktree `pleng-editor-ux` :531x
- **Tester ประจำ (spun 23 ก.ค.):** รับงาน verify จาก PM → verdict 4 บรรทัด · read-only · first job = alignment 3 จุด เพลง 141
- home/nav (สาย 2, done): `local_56f8e1b6` · branch `claude/eloquent-elion-ad2051`
- meeting-tool/pk pm: `local_f5c76942`
- ⚠️ editor merge target = **`editor-usability`** (ไม่ใช่ `claude/peaceful-bhaskara` = docs เก่า)

## Gate ที่เปิดค้าง (PM ต้องปิด)
- [ ] alignment 3 จุด เพลง 141 — **จ่าย Tester แล้ว** · รอ verdict (P0 มี evidence · P2/คอร์ด รอ editor commit) ก่อนกวาดทั้งคลัง + ก่อน merge

## กติกาถาวร
⛔ ห้าม re-import 120 เพลง (ทีมแก้ live) · reuse engine (ไม่รื้อ SongSheet) · Vue3+Vite (ไม่ Nuxt/Tailwind) · แปล zh/en สุดท้าย · ไม่ release จนเสร็จ
