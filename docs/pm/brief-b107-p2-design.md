# Brief — B107 P2 (SA design): auto-arranger + presets + "ทุกเทคนิค" (ออกแบบครบทีเดียว)

**ฐาน:** `studio-shell-redesign` · **branch:** `b107-p2-design` (SA design เท่านั้น · ไม่แก้ src prod) · **สั่งโดย:** PM (pm11)
**P'Aim (12 ก.ค.):** "เริ่ม P2 design เลย **รวมทุกเทคนิคที่คุยกัน ทำทีเดียวจบ**" — ออกแบบครบชุดในสเปกเดียว (P1 เปียโน Grand ผ่าน gate แล้ว)

## SSOT / อ่านก่อน
- `docs/reports/sound-techniques-summary.md` (catalog 6 หมวด + สถานะ — ที่ให้ที่ปรึกษาดู)
- `docs/ds/chord-voicing-quality.md` (รอบ 0–6 · งาน SA เดิม + เดโม 6 สไตล์)
- **ที่ปรึกษา P'Aim จัดลำดับ (12 ก.ค.):** (1) **Humanize timing = ต้องมี** (แก้ความแข็งหุ่นยนต์ · micro-timing ±5-15ms + velocity jitter) → (2) **Drop-2 / open voicing** (เคลียร์ย่าน "น้อยแต่มาก") → (3) **Pedal bass** (ลุ่มลึก) → + **Rubato ปลายวลี** · **walking bass** · ทั้งหมด **rule-based อัตโนมัติ 400+ เพลง** (ตรงกับ auto-arranger 3 ชั้น)

## ขอบเขต P2 (ออกแบบให้ครบ · ส่งสเปกเดียว)
1. **สถาปัตย์ generator/arranger** — "auto-arranger 3 ชั้น" (voice-leading → dynamics → embellishments) เป็นชุดกฎ (rules) ที่รันอัตโนมัติทุกเพลง · **modular: แต่ละเทคนิค = 1 rule module** (build/test/verify ทีละตัวได้ แม้ส่งครบ)
2. **Voicing/harmony:** voice-leading (มี P1) · inversions · **drop-2** · **open voicing** · added tensions (7/9/sus · maj7/add9 flag) · **pedal/drone bass** · **walking bass**
3. **Dynamics/expression:** velocity map+balance (มี P1) · metric accent · melodic contour · **humanize (velocity + micro-timing)** · section/phrase dynamics · crescendo/decresc · **rubato ปลายวลี**
4. **Patterns:** sustained (มี) · arpeggio · harp roll · string pad+swell · waltz · Alberti · ballad fingerpick
5. **Mix/timbre + instruments:** reverb (มิติโบสถ์) · multi-velocity layer · ensemble blend (เปียโน+สตริง) · per-role mix · stereo/pan · เพิ่มเครื่อง (สตริง/ไวโอลิน/เชลโล · Felt piano)
6. **Presets (โหมดบรรเลง) คัดมา** — ผสม rules ข้างบนเป็นชุดที่ **พอดี ไม่รก**: เช่น เปียโนสงบ · เปียโนบรรเลง(arp) · ไวโอลินคลอเปียโน · เต็มวง · **+ "ธรรมดา/ตรวจโน้ต" (arranger OFF · โน้ตตรงๆ · พี่เป้า) = first-class เลือกง่ายในหน้าแก้ไข**

## Deliverable (SA)
- **สเปกเต็ม `docs/ds/instrument-arranger-p2.md`:** สถาปัตย์ generator · rule แต่ละตัว (กติกา input→output + เหตุผลดนตรี) · นิยาม preset (rule ไหนเปิด/ปิด/ค่า) · **ลำดับ build ภายใน (ตามที่ปรึกษา: Humanize เป็นฐานก่อน)** · AC ที่ dev ทำตามได้ · **วิธี verify = วัด real audio output + invariant test** (บทเรียน B107) · เชื่อม MP3 (P3)
- host-agnostic + sample CC0/CC-BY เดิม · **ไม่แตะ prod src** (spike ทดลอง/เดโมได้บน branch ตัวเอง)
- **P'Aim ปั้นรสนิยม/เสียงกับ SA ตรง** (memory `feedback_paim_direct_sa_creative`) → ได้ข้อสรุปแล้ว SA ping PM · PM จ่าย dev implement + tester (วัดเสียงจริง) + P'Aim ฟังก่อน deploy

## รายงาน
- spec + `docs/reports/b107-p2-design.md` ลง branch ตัวเอง · §📥 inbox + ping PM (pm11) · ไม่ commit ลง base · ไม่ deploy
