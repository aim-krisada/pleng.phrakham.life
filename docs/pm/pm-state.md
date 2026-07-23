# PM state — เพลง.พระคำ.ชีวิต (อ่านไฟล์เดียวนี้ = rehydrate PM ได้ทันที)

> **สมอง PM อยู่บน disk** → PM ตายเกิดใหม่ได้ (อ่านไฟล์นี้ + `decisions-log.md` พอ) · เก็บให้ **สั้น** (index) · รายละเอียด/มติ → `decisions-log.md` · resolved เก่า → `decisions-archive.md`

## ▶ pl pm 40 เริ่มที่นี่ (handoff 23 ก.ค. ค่ำ)
- **ไม่มี gate เปิดค้าง** · วันนี้ปิด 2 gate: editor redesign merged base (`3a3e618`) + คอร์ด hotfix LIVE production (`5661068`)
- **base = แอปใหม่ทั้งชุด (ยังไม่ deploy)** · main = ตัวเก่า+คอร์ด · ⚠️ 2 สาย diverged (port chord เข้า base ก่อน full deploy)
- **ถัดไป (queue · P'Aim เลือก):** songbook B120 (spec ครบ เริ่มได้) · แปล zh/en · เลือกกระดาษ B121 · หรือ P'Aim review base · international mask (epic)
- Tester ประจำ `local_de5a3459` standby · P'Aim คุย PM คนเดียว

## PM operating model (ตกลง 23 ก.ค.)
- **PM = จ่ายงาน + อ่านสรุป + เคาะ gate เท่านั้น** — ไม่อ่านไฟล์ยาว/รันเทสต์/เปิด PDF เอง (กิน context)
- **P'Aim คุยกับ PM คนเดียว** (single interface) · PM คุย P'Aim ภาษาคนล้วน
- **verify = จ่าย Tester** → รับ verdict 4 บรรทัด (STEP / หลักฐาน+path / ยังไม่พิสูจน์ / ผ่านไหม)
- worker ทุก session รายงานฟอร์แมตสั้นคงที่ · อ่าน artifact ครั้งเดียว บันทึก verdict แล้วไม่เปิดซ้ำ
- **merge = PM เท่านั้น** (สายไม่ merge เอง) · **main = P'Aim สั่ง go เท่านั้น** (auto-deploy)

## Self-maintenance (กัน pm-state บวม — สมอง PM ต้องเล็กเสมอ)
- **pm-state = เฉพาะของที่ยัง "มีชีวิต" (pending/live) เท่านั้น** — อะไรเก่า+จบแล้ว **ตัดออกทันที** (ประวัติอยู่ `decisions-log`) · **ไม่ค้าง done ใน .md** (P'Aim 23 ก.ค.)
- **อัตโนมัติ (ไม่ต้องสั่ง):** ทุกครั้งที่ **ปิด gate / merge สายเสร็จ** → (ก) ตัดรายการที่เสร็จออกจากตารางสถานะ+gate ย่อเป็น 1 บรรทัดใน `decisions-log.md` · (ข) commit · (ค) sync memory ขึ้น OneDrive
- **decisions-log ยาวเกิน** → ย้ายมติเก่าที่ resolved แล้วไป `decisions-archive.md` (rehydrate อ่านแค่ `pm-state` + `decisions-log` ล่าสุด · ไม่อ่าน archive)
- **คำสั่งจากพี่ (จำง่าย):**
  - **"PM เก็บงาน"** = ทำ self-maintenance เดี๋ยวนี้ (prune + archive + commit + sync)
  - **"PM ต่อ"** = (session ใหม่/context หนัก) อ่าน `pm-state`+`decisions-log` = rehydrate แล้วทำต่อ

## SSOT pointers (รายละเอียดอยู่ที่นี่ — อย่า duplicate)
- ideas ทั้งหมด: `docs/backlog.md` (ล่าสุด B125)
- ดีไซน์ล็อก: `work/ปรับ pl edit ui/ux-groundup-design.md`
- สถาปัตย์ 2 format: `work/ปรับ pl edit ui/บทวิเคราะห์-สถาปัตยกรรม.md` ("สมองสากล + หน้ากาก 2 แบบ")
- แผน merge: `work/ปรับ pl edit ui/integration-merge-plan.md`
- สถานะ 3 สายละเอียด: `work/ปรับ pl edit ui/RESUME-state.md`

## หลักสถาปัตย์ที่ยึด
score = **SSOT สากล 1 ชุด (v2, MusicXML-like)** → output ได้หลาย format: (1) มาตรฐานสากล (2) แบบโบสถ์ไทย · alignment = format-agnostic (core) · masks = display layer

## สถานะปัจจุบัน (live เท่านั้น · จบแล้วดู decisions-log)
| งาน | สถานะ | รออะไร |
|---|---|---|
| **คอร์ด hotfix (พี่เปา)** | ✅ **LIVE บน production** (`5661068` · FF-push main · verify: bundle มี commit+placeholder) · 809 เทสต์ · ENTER-เลือกคอร์ด รวมแล้ว | ⚠️ **ต้อง port เข้า base** ก่อน full deploy ครั้งหน้า (base inline editor reuse ComboSelect allow-custom) · caveat B124/B125 |
| songbook (B120) | ⛔ **สเปกที่บันทึกไว้ผิด** (เขียนว่า "เนื้อล้วน" · จริง = **ต้องมีโน้ต** เหมือนหนังสือเพลง คจ.) | P'Aim ยืนยันรายละเอียดก่อนจ่ายงาน |
| **หน้าแก้เพลง (editor) — ยังไม่ครบ** | 🔄 base merge = ฐานให้ P'Aim ลองต่อ · **ไม่ใช่ว่าจบ** | P'Aim ลองแล้วบอกว่าขาดอะไร → PM ตั้งคิวรอบถัดไป |
| เลือกขนาดกระดาษ (B121) | 📋 queue | — |
| international mask + MusicXML export | 🔭 epic ถัดไป (SA) | — |
| zh/en แปล · dark mode | ⏸ post-merge | — |

## Sessions map (live)
- **Tester ประจำ `local_de5a3459`** — standby · จ่าย verify → verdict 4 บรรทัด · read-only (สูตร render §4 · port ≠9222)
- **pk pm `local_02613ef8`** (pk pm 13) — phrakham PM
- editor `local_57dcffe1` (`editor-usability`) + chord `local_1c34cb9b` (`chords-all-standard`) = **งานจบ ปิดได้** (merged/deployed แล้ว)
- ℹ️ branch: base=`studio-shell-redesign` (merged 3a3e618) · main=`5661068` (chord live) · editor code = `editor-usability` (merged แล้ว)

## Gate ที่เปิดค้าง (PM ต้องปิด · เฉพาะที่ยังไม่ปิด)
- ✅ **ทั้ง 2 gate ปิดแล้ว** (23 ก.ค.): editor→base merge (`3a3e618` job D PASS) · chord hotfix LIVE production (`5661068`) → decisions-log
- ⚠️ **follow-up (ก่อน full deploy base→main ครั้งหน้า):** main(`5661068` chord) กับ base(`3a3e618` editor redesign) **diverged** → port chord fix เข้า base (inline editor reuse ComboSelect allow-custom) + reconcile divergence

## งานถัดไป (queue · ไม่มี gate เปิดค้าง)
- songbook Thai-flow (B120) · เลือกขนาดกระดาษ (B121) · zh/en แปล · international mask+MusicXML (epic) · dark mode
- follow-up bugs: B122 (arcPlan ≥3บรรทัด) · B123 (shell h-scroll) · B124 (slash-bass transpose) · B125 (chord suffix validation)

## กติกาถาวร
⛔ ห้าม re-import 120 เพลง (ทีมแก้ live) · reuse engine (ไม่รื้อ SongSheet) · Vue3+Vite (ไม่ Nuxt/Tailwind) · แปล zh/en สุดท้าย · ไม่ release จนเสร็จ
