# B107 P2 (SA audio design) — Handoff ให้เซสชัน SA ใหม่

**อ่านไฟล์นี้ก่อน → ต่อได้ทันที.** งาน = SA ปั้นเสียง auto-arranger กับ P'Aim ตรง (creative) · **branch `b107-p2-design`** (design docs + เดโม · **ไม่ merge base · ไม่ deploy · ไม่ commit ลง base**).

## 1. สถานะรวม (13 ก.ค.)
- **Launch = 3 โหมด (P'Aim เคาะแล้ว):** 🎹 เปียโนเดี่ยว (approved) · 🎸 กีตาร์เดี่ยว (approved · nylon จริง) · 🏛️ เต็มวง/รวมวง (approved · **ยัง tune เสียงอยู่**)
- **dev กำลังทำ** (PM pm21 จ่ายแล้ว · branch `b107-step9-instruments`): popover fix → 3 โหมด → tester real-audio → P'Aim ฟัง final → deploy
- **เดี่ยว felt/violin/cello + real string-ensemble pad = หลัง launch**

## 2. ★ จุดที่ค้างอยู่ตอน handoff (ทำต่อจากตรงนี้)
**เต็มวง "เสียงสายเหมือนออร์แกน"** — ไล่แก้มาหลายรอบ (vibrato · swell arc · legato · far reverb · role-prominence · pad บาง). ล่าสุด **P'Aim เลือก "ทาง 1" = ตัด pad สายค้างออกหมด** → เต็มวง = เปียโนทริโอ (เปียโน melody+arp + เชลโลเบส) + ไวโอลินเป็น **เส้นทำนองอย่างเดียว** (โหมดไวโอลินนำ).
- **รอ P'Aim ฟัง `ensemble-real-demo.html` (ตัด pad) แล้วบอกว่า "หายออร์แกน/โดนไหม"** ← นี่คือ next action
- ถ้า chorus โหวงไป → option: เติม **ไวโอลิน counter-melody เฉพาะ chorus** (ใช้แบบทำนอง ไม่ใช่ pad)
- พอลงตัว → ล็อกสูตรเต็มวงสุดท้ายใน spec §6b.2 + ping PM

## 3. ไฟล์สำคัญ
- **spec เต็ม:** `docs/ds/instrument-arranger-p2.md` (arranger 3 ชั้น · ทุกเทคนิค · §Launch scope + §6b.1/§6b.2 เต็มวง + guitar params)
- **report:** `docs/reports/b107-p2-design.md` (รอบ 1–12 ประวัติการตัดสินใจ)
- **วิเคราะห์เสียง (ส่งที่ปรึกษา):** `docs/reports/b107-p2-sound-analysis.md`
- **เดโม (docs/spikes/):**
  - `humanize-timbre-demo.html` — เปียโนเดี่ยว-จัดเต็ม (approved)
  - `guitar-solo-demo.html` — กีตาร์เดี่ยว · **nylon จริง** (strum D-DU-UDU / travis / rasgueado / slide · approved)
  - `ensemble-real-demo.html` — **เต็มวงเสียงจริง** (Splendid Grand + เชลโล/ไวโอลิน CC) + กฎ 3 ชั้น + toggle 2 กฎเขียว · **ตัวที่ปั้นอยู่**
  - `ensemble-rules-demo.html` — A/B กฎ 3 ชั้น (GM · พิสูจน์แนวคิด)

## 4. Infra (ต้องรู้ก่อนรันเดโม)
- **เดโมเสิร์ฟด้วย node:** `node <scratchpad>/serve.mjs "<worktree>/docs/spikes" 8107` (bind 0.0.0.0) · **background shell หยุดข้ามเทิร์นบ่อย → restart เมื่อ 8107 ตอบ 000**
- **IP เครื่องเปลี่ยนได้** (ล่าสุด `10.152.249.98` · เคย `192.168.1.173`) → เช็ก `ipconfig | grep IPv4` ทุกครั้งก่อนให้ URL มือถือ P'Aim · หรือใช้ `localhost:8107` บนเครื่องเดียวกัน
- **sample จริงถูก copy แบบ untracked** เข้า `docs/spikes/{nylon,cello,violin}/` (จาก `public/samples/CC0/*` บน base · filename=MIDI) — เดโม fetch relative · **อย่า git add** (บวม) · ถ้าหาย ให้ `git checkout studio-shell-redesign -- public/samples/CC0/<inst>` แล้ว cp เข้า docs/spikes + `git reset -- public/samples && rm -rf public/samples`
- **verify:** `mcp__Claude_Browser__preview_start` + `javascript_tool` · **วัด real audio ด้วย AnalyserNode ต่อ role** (บทเรียน B107 — วัด dB จริง ไม่เดา)

## 5. บทเรียนเสียง (อย่าลืม)
- **วัด peak/dB ต่อ role จริง** — จับบั๊ก "เปียโนเงียบ" (arg-shift) + วินิจฉัยออร์แกนได้เพราะวัด
- **ใช้ sample CC จริง ไม่ใช่ GM** (P'Aim: GM ทำให้แย่ · จริงดีขึ้นเยอะ · ทั้งกีตาร์+เต็มวง)
- **เปียโน smplr:** โหลด PP layer `[41,67]` + map gain→velocity เข้า layer + makeup ×2.6 (สู้สาย CC) — ไม่งั้นเงียบ (P1 lesson)
- **สาย CC baked +9/+10dB** → gain ต่ำ (เชลโล ~0.10 · ไวโอลิน lead ~0.34) · **ห้าม re-apply makeup**
- **bowed กันออร์แกน:** vibrato (LFO→detune · เชลโลเบา 9¢/ไวโอลิน 18¢) + swell arc (เบา→ดังกลาง→ผ่อนท้าย) + bow attack นุ่ม + **ไวโอลิน solo ≠ pad** (ตัด pad = ทางแก้จริง)
- balance เต็มวงที่วัดได้ (ก่อนตัด pad): เปียโน −5.6dB (นำ) · เชลโล −16.8 · ไวโอลิน −26.7

## 6. 2 กฎเขียว (dev ทำ · SA จูนค่า)
1. **Section dynamics** — master gain verse ×0.7 → chorus ×1.0 (ใช้ section จริง · v2 `content.arrangement` มี · arranger มี `sectionDynamics(meta.sections)` hook)
2. **Role-prominence** — ทำนองเร็ว→หรี่ comp+bass ~−3dB · ทำนองยาว→เปียโน fill · `melStats()` density/maxHold
- **ค่า (−3dB/threshold/0.7-1.0) = SA↔P'Aim จูนด้วยหูตอน P'Aim ฟัง final** · พักไว้: rubato · crossfade pad · guitar fret-voicing

## 7. การทำงาน / ติดต่อ
- **PM = pm21** (session `local_3c83e175-4c21-4041-b5c7-fe3dbe7fa20c` · title "🎷pl pm12") · ping ผ่าน `mcp__ccd_session_mgmt__send_message`
- **เสียง/รสนิยม = P'Aim↔SA ตรง** · settled แล้วค่อย ping PM · PM จ่าย dev + tester
- research session (หา sample) = ปิดจบแล้ว · manifest บน base (`public/samples/manifest.json`: durationSec/loops/bakedMakeupDb/sampledRange)
