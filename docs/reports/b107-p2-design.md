# Report — B107 P2 (SA design): auto-arranger + presets + ทุกเทคนิค (ออกแบบครบทีเดียว)

**branch:** `b107-p2-design` (base `studio-shell-redesign`) · **บทบาท:** SA (audio design) · **สั่งโดย:** PM (pm11)
**สถานะ:** 🟢 **spec เสร็จ (ออกแบบครบทั้งระบบ 1 ชุด) → รอ P'Aim ปั้นเสียงกับ SA → แล้ว SA ping PM จ่าย dev**
**Deliverable:** `docs/ds/instrument-arranger-p2.md` · **ไม่แตะ prod src · ไม่ deploy**

---

## สรุปสั้น (F60+)

P'Aim สั่ง (12 ก.ค.) "รวมทุกเทคนิคที่คุยกัน ทำทีเดียวจบ" → ออกแบบ **auto-arranger ครบทั้งระบบในสเปกเดียว** `docs/ds/instrument-arranger-p2.md`.

**แก่นออกแบบ:** ใส่ **"ตัวเรียบเรียงอัตโนมัติ"** คั่นระหว่างโน้ตบนแผ่นกับการเล่นเสียง — เป็น **ชุดกฎ 3 ชั้น** (เลือกโน้ต → หนัก-เบา+จังหวะ → ลูกเล่น) + ชั้นมิกซ์. ทุกกฎเป็น **โมดูลแยก (pure function แปลงรายการเสียง)** → build/test/verify ทีละตัวได้แม้ส่งครบ. arranger คืน **"รายการเสียง" เป็นข้อมูลล้วน** → เทส headless ได้ + ใช้ตัวเดียวกันทั้งเล่นสด+MP3.

**ครบทุกเทคนิคใน catalog:** voice-leading/drop-2/open/pedal/walking (voicing) · accent/contour/**humanize**/section/cresc/rubato (dynamics) · sustained/arp/roll/pad/waltz/alberti/fingerpick + embellish (patterns) · reverb/multi-velocity/ensemble/pan (mix) · grand/felt/violin/cello/strings (เครื่อง) · presets รวม **"ธรรมดา/ตรวจโน้ต" first-class** (พี่เป้า).

**ลำดับ build (ที่ปรึกษา):** Humanize เป็นฐานก่อน → drop-2/open → pedal → rubato/dynamics → patterns → walking → มิกซ์ → presets → เครื่องเพิ่ม → MP3 (P3).

---

## สิ่งที่ทำในสเปก (ชี้จุดเด่น)

1. **สถาปัตย์ arranger 3 ชั้น + รายการเสียงกลาง `PerfEvent[]`** (§1) — ต่อยอดโค้ดจริง P1 (`songToNotes`→`buildChordVoice`→`playSong`/`sampler.fire`). แยกโฟลเดอร์ `src/lib/arranger/` (เพราะ `midi.js` โต 524 บรรทัดแล้ว).
2. **rule ทุกตัวเขียน input→output + เหตุผลดนตรี + AC** (§2–5) — ยกอัลกอริทึมที่เดโมพิสูจน์แล้ว (accent/contour/jitter/arp/roll/waltz/embellish) มาเป็นสเปก production พร้อม guard.
3. **แก้ 3 ข้อจำกัดเชิงเทคนิคจาก P1** (§0): sampler ทรานสโพส=reschedule · **velocity ต้องตกใน layer ที่โหลด** (invariant บังคับ — บทเรียน "เปียโนเงียบ") · **สุ่มต้อง seeded (ไม่ใช้ Math.random)** เพื่อ MP3 deterministic + เทสซ้ำได้ + 2 passes ต่างจริง.
4. **preset 5 ตัว** (§6) — สงบ/บรรเลง/ไวโอลิน/เต็มวง + **#0 ธรรมดา/ตรวจโน้ต (arranger OFF)** มี invariant test บังคับว่า "ตรวจโน้ตไม่ถูกแตะ".
5. **AC ครบ + วิธี verify** (§7) — invariant tests ต่อ rule (**ดักของจริง เช่น vel-in-layer** ไม่ใช่แค่ math) + **วัด real audio output ทุก preset** (peak>0 · balance · ไม่ clip · humanize spread วัดได้) + P'Aim ฟัง.
6. **ลำดับ build ภายใน** (§8) — Humanize step 1 (ฐาน) · แต่ละ step มี checkpoint ฟัง.
7. **MP3 (P3) hook** (§9) — arranger เดียว → live=MP3 · seed เดียว · reverb/pan ทำงานใน OfflineAudioContext.

## รอบ 2 — เพิ่มตาม input P'Aim (ผ่าน PM · 12 ก.ค.)
1. **โครง 4 โหมด (2 แกน · §6):** แยก **(A) ระดับลูกเล่น** — ทำนอง / คอร์ด / **ธรรมดา (ไม่มีลูกเล่น = ตรวจโน้ต)** / **จัดเต็ม (arranger เต็ม)** — ออกจาก **(B) เครื่องดนตรี**. โหมด 1–3 ต่อยอด 3 sound modes เดิม B104. "จัดเต็ม" มี 5 flavor (เปียโนสงบ/บรรเลง/ไวโอลิน/เต็มวง/กีตาร์). UI เข้าใจง่าย: ระดับลูกเล่น ≠ เครื่องดนตรี.
2. **Instrument module — เผื่อกีตาร์ตั้งแต่ออกแบบ (§4B):** แยก **แกนกลางร่วม (harmony/voice-leading/humanize/dynamics = instrument-agnostic)** + **โมดูลต่อเครื่อง (voicing constraints/patterns/humanize feel/sample = idiomatic)**. นิยาม `InstrumentModule` interface + worked example กีตาร์ (strum/Travis · รูปคอร์ดเฟร็ตจริง · strum-stagger 15–30ms · ไม่ยืม wide-voicing เปียโน). เพิ่มเครื่อง = plug-in โมดูล 1 ตัว ไม่แตะแกน. build order เพิ่ม step 10 (โมดูลกีตาร์) + AC + folder `arranger/instruments/`.

## รอบ 3 — consolidate หลังคุย P'Aim + ที่ปรึกษา + ผลวิจัย sample (12 ก.ค.)
- **ชุดเสียงล็อก 5 เครื่อง** (§5): Grand · **Felt (กรอง grand เดิม = 0 sample/license ใหม่ → P2 buildable!)** · Nylon Guitar · Solo Violin · Cello/String Pad. map ครบ role (cello=เบส). อ้าง `docs/reports/cc-instrument-samples.md` (Tier-1 `FluidR3_GM` CC-BY → Tier-2 CC0 เฉพาะ lead เดี่ยว). lazy-load per-preset.
- **UI 3 แกน** (§6a · P'Aim เคาะ): (1) เล่นอะไร (ทำนอง/คอร์ด/รวม) × (2) เสียงเครื่อง (เดี่ยวอิสระ + วงรวม curated) × (3) toggle ลูกเล่น (ธรรมดา/มีลูกเล่น). เครื่องเดี่ยว=เสรีปลอดภัย · วงรวม=ล็อกสูตรกันย่านชนนัว.
- **กฎ tempo→pattern** (§6d · ที่ปรึกษา): ช้า→Arpeggio · เร็ว→sustain/ย่ำ (threshold ~92 bpm · จูนกับ P'Aim).
- **2 default UI (P'Aim เคาะแล้ว):** ลูกเล่น toggle (แก้ไข=ธรรมดา/เล่น=มีลูกเล่น) · เครื่องยังไม่มี sample = ปุ่มจาง "เร็ว ๆ นี้".
- **P2 = เปียโนก่อน** (เปียโนสงบ=felt + เปียโนบรรเลง=arp buildable เลย) · อีก 3 preset slot ทีหลังไม่ต้องรื้อ (§12).

## รอบ 5 — P'Aim ฟังเดโม + เคาะเสียง (12 ก.ค. · sign-off)
- **humanize เคาะแล้ว: ±12ms / ±6%** (P'Aim ฟังเดโม `humanize-timbre-demo.html`: "เกินคาด · อย่าเพิ่มอีก" = sweet spot · ล็อกเป็น default สเปก).
- **default เล่น = เต็มวง + ลูกเล่นเต็ม (เพราะสุดก่อน)** · โหมดฝึก/ตรวจโน้ต = opt-in · **จำค่า localStorage** (คนตั้งโหมดฝึกไว้ = sticky → default เพราะสุดไม่ชนตรวจโน้ต). P2: default = เปียโนจัดเต็ม จนกว่า sample วงมา.
- **เดโม v2** = UI จริง (เลือกเครื่อง + โหมด + สวิตช์ลูกเล่น · humanize อัตโนมัติ · pedal bass + arp บนเปียโนจริง) — P'Aim ผ่าน.
- 🟢 **design + เสียงหลัก sign-off → ส่ง PM (pm12) จ่าย dev.**

## รอบ 4 — UX final (P'Aim ↔ ที่ปรึกษา · lock blueprint)
- **UI = 2 แกน + สวิตช์เงื่อนไข** (§6a · แทน 3-แกนเดิม): **แกน 1 เสียง = เดี่ยว / นำวง** (นำวง = เลือกพระเอก → ระบบเติมเครื่องคลอเอง) · **แกน 2 = ทำนอง/คอร์ด/ทำนอง+คอร์ด** · **สวิตช์ "ใส่ลูกเล่น"** โผล่เฉพาะ "ทำนอง+คอร์ด × เดี่ยว".
- **ตรรกะลูกเล่น (If-Else ให้ dev):** ทำนอง/คอร์ดล้วน = ปิดอัตโนมัติ (โน้ตตรง แกะโน้ต) · ทำนอง+คอร์ดเดี่ยว = ผู้ใช้สวิตช์ (ปิด=block/sustain ตรวจโน้ต พี่เป้า · เปิด=arranger เต็ม) · นำวง = เปิดเสมอ.
- **โหมดเดี่ยว ≠ โน้ตทื่อ** (§4B): เดี่ยว+ลูกเล่นเปิด = เทคนิคขั้นสูงของเครื่องนั้น (เปียโน solo RH+LH arp+pedal · กีตาร์ fingerpick+roll · ไวโอลิน mono+embellish).
- **ไวโอลิน/bowed เล่นคอร์ดหนาไม่ได้** → double-stop / คู่ 3-6 (กฎในโมดูล bowed §4B).
- "ลูกเล่นปิด (ตรวจโน้ต)" = first-class (§6c · ครอบ 3 เคส).

## ที่ตัดสินใจเชิงออกแบบ (flag ได้ถ้าไม่เห็นด้วย)
- **แยกโฟลเดอร์ `arranger/`** แทนยัดใน `midi.js` (ขนาด).
- **`PerfEvent` มีฟิลด์ `timeShift` (วินาที)** สำหรับ humanize/rubato — ไม่ยัดใน `startBeat` (beat) เพราะ ±10ms คือ ±10ms ไม่ขึ้น bpm.
- **seeded PRNG (mulberry32)** ไม่ใช้ Math.random — จำเป็นต่อ MP3 deterministic.
- **default หน้าเล่น = เปียโนสงบ · default หน้าแก้ไข = ธรรมดา**.

## ยังไม่ทำ (ตามขอบเขต)
- **ไม่แตะ prod src · ไม่ deploy** — เป็นงานออกแบบ. dev implement ทีหลัง (PM จ่ายตาม §8).
- **spike เดโม step 1 (humanize)** — SA จะทำให้ P'Aim ฟัง+ปั้นค่าก่อน ping PM (ยังไม่ทำในรอบนี้ · เป็นขั้นถัดไป).
- source sample felt piano (CC0) — งานย่อยตอนถึง step 9.

## ขั้นถัดไป
1. **P'Aim ปั้นเสียงกับ SA** (§11: ปริมาณ humanize · default · reverb · preset · drop-2 vs open) — SA ทำ spike humanize ให้ฟัง.
2. ได้ข้อสรุป → **SA ping PM (pm11)** → PM จ่าย dev implement §8 + tester (real audio §7c) + P'Aim ฟังก่อน deploy.
