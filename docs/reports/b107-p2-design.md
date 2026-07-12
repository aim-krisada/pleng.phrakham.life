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
