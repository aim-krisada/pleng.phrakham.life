# Brief — B107 P2 dev: auto-arranger เสียงบรรเลง (เปียโนก่อน)

**สาย:** dev · **branch:** `b107-p2-arranger` (ตัด off `studio-shell-redesign` — base มีสเปก + โค้ด P1 ครบแล้ว)
**อย่าแตะ base โดยตรง · อย่า merge · อย่า deploy** (PM ทำเอง)

## SSOT (อ่านก่อนเขียนโค้ด)
- **สเปกเต็ม:** `docs/ds/instrument-arranger-p2.md` — โดยเฉพาะ **§8 ลำดับ build** · **§7 Acceptance Criteria** · §0 (จุดต่อจาก P1: `src/lib/midi.js` `sampler.js` `audioExport.js`) · §1 pipeline `arrange()` · §4B instrument module · §6 UI/preset
- **รายงานออกแบบ + P'Aim sign-off:** `docs/reports/b107-p2-design.md`
- **เดโมที่ P'Aim ฟังผ่านแล้ว:** `docs/spikes/humanize-timbre-demo.html`

## ขอบเขตงานรอบนี้ = §8 step 0–8 (เปียโนก่อน)
step 0 refactor seam (`arrange()` + `PerfEvent[]` + scheduler consume + `InstrumentModule` interface + โมดูล keyboard wrap P1) → 1 **humanize** → 2 drop-2/open → 3 pedal bass → 4 rubato/accent/contour/section → 5 patterns(arp/roll/pad/waltz)+embellish → 6 walking bass/alberti → 7 mix(reverb/pan/multi-vel) → 8 presets(2 เปียโน สงบ/บรรเลง)+editor สวิตช์ลูกเล่นปิด first-class+จำค่า localStorage
**ยังไม่ทำรอบนี้:** step 9 (เครื่องเพิ่ม felt/violin/cello — รอ sample) · step 10 (กีตาร์) · P3 (MP3) — แต่ interface ต้องเผื่อไว้ตาม §4B/§12 (เพิ่มทีหลังไม่รื้อแกน)

## ⛔ CHECKPOINT บังคับ — หยุดให้ P'Aim ฟังหลัง step 1
ทำ step 0–1 (seam + humanize บนเปียโนจริง) ให้เสร็จ+verify → **commit + รายงาน + หยุดรอ** ให้ P'Aim ฟัง "หายแข็ง" บนแอปจริงก่อน (gate หูมนุษย์ §7e = P'Aim↔SA) → PM ให้ไฟเขียว → ค่อยลุย step 2–8 ต่อ
(สเปก §8 ระบุ step 0–1 = "ฐาน" + จุด checkpoint ให้ฟังก่อนลุยที่เหลือ)

## ข้อบังคับเทคนิค (บทเรียน P1 — ห้ามพลาด)
- `arrange(notes, chordEvents, cfg, meta)` = **pure function** คืน `PerfEvent[]` (headless เทสได้ · ไม่มี AudioContext) · แต่ละ rule = 1 export แยก เปิด/ปิดได้ตาม cfg
- **velocity-in-layer (§7b บังคับ):** ทุก `PerfEvent.gain` หลัง dynamics → `gainToVelocity(gain)` ต้องตกใน layer ที่โหลด (นี่คือ invariant ที่ P1 ไม่มี → เปียโนเงียบ) · humanize คูณ gain ต้อง clamp
- **สุ่มต้อง seeded** (mulberry32 · ไม่ใช้ `Math.random()`) — MP3/เทส/“2 รอบต่างกัน” ต้อง deterministic
- **ลูกเล่นปิด (ตรวจโน้ต) = first-class:** melody โน้ตพิมพ์ · timeShift 0 · 0 emb · gain คงที่ (พี่เป้าใช้ตรวจโน้ต · จำค่า localStorage แยก ไม่ชน default เพราะ)

## Verify (audio feature = วัดของจริง ไม่ใช่ "fire ไม่ error")
- **invariant unit test ต่อ rule** (§7b) — ดักของจริง (รวม velocity-in-layer)
- **วัด real audio output** (§7c · OfflineAudioContext): peak>0 ทุก preset · melody peak>chord peak (~−5..−9dB) · ไม่ clip (≤~0.9) · **humanize spread วัดได้** (onset ไม่ตรงกริดเทียบลูกเล่นปิด)
- **regression (§7d):** เล่น/หยุด/resume/สลับโหมด(ทำนอง/คอร์ด/รวม)/ทรานสโพสกลางเล่น/loop ไม่พัง · ลูกเล่นปิด = พฤติกรรมเท่า P1 · `vitest run` เขียว · `npm run build` ผ่าน · arranger = lazy chunk
- tester สายแยกจะ re-gate อีกชั้น (วัด audio) — dev self-verify Tier-B ก่อนส่ง

## Server + report-back (session-agnostic — อย่า hardcode ชื่อ PM session)
- รัน dev server **`--host`** เสมอ + ใส่ **Network URL** (`http://<IP>:<port>`) ในรายงาน ให้ P'Aim/พี่เปา ทดสอบมือถือจริง
- รายงานกลับ 3 ทาง: (1) เขียน `docs/reports/b107-p2-arranger.md` · (2) เพิ่ม 1 บรรทัดใน `docs/pm/board.md` §📥 inbox · (3) ping "PM session ปัจจุบัน" ที่ระบุใน `board.md` (ตอนนี้ = **pm21**)
