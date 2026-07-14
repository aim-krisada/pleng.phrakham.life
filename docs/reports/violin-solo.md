# รายงาน — ไวโอลินเดี่ยว expressive (B107 P2 · §4B.4 solo-rich violin)

**branch:** `claude/charming-cori-25514b` · **base:** `studio-shell-redesign` (verify: base เป็น ancestor ของ HEAD · มี Grand 5-layer + audio round 2 + violin sample ครบแล้ว)
**สั่งโดย:** P'Aim (14 ก.ค.) — "ทำ Violin เดี่ยว ให้เหมือนเปียโน" = ยกระดับให้ถึงเกณฑ์เดียวกับ Grand (sample จริง + expressive + self-host offline) · P'Aim iterate เสียงกับ SA ตรง · PM gate ตอน merge/publish
**SSOT:** `docs/ds/instrument-arranger-p2.md` §4B.4 (violin solo-rich) · `docs/reports/cc-instrument-samples.md` · `public/samples/manifest.json`

---

## สรุป 1 นาที (F60+)

"เหมือนเปียโน" = **ระดับ/วิธีทำ** ไม่ใช่ก๊อปเทคนิคเปียโน. ไวโอลิน = เครื่องลากคันชักเล่นทำนอง → expressive คนละแบบ (ลากยาว · เชื่อมโน้ต · คันชักดัง-เบา · สั่นเสียง · สไลด์เข้าโน้ต) แต่ **มาตรฐานคุณภาพเท่า Grand**.

**พบว่า sample + registry + bowed module + ensemble path ของไวโอลิน "มีอยู่แล้ว" ในฐาน** (VSCO-2 Solo Violin CC0 · 15 pitch 55–96 · self-host `/samples/CC0/violin/` · 14.1s · baked +9dB). สิ่งที่ **ขาดจริง** มี 2 อย่าง:
1. **UI ยังปิดปุ่ม "ไวโอลิน"** (`disabled:true` ใน `soundOptions.js`)
2. **การเล่นเดี่ยวผ่าน `sampler.fire()` ยิง sample ทื่อ ๆ** — ไม่มี bow-attack, ไม่มีสเวลล์ในโน้ตยาว, ไม่เชื่อมโน้ต, ไม่มี vibrato/สไลด์. smplr's `Sampler.start()` **ไม่เปิดทาง** ใส่ envelope ต่อโน้ต → ต้องมี playback path ของ bowed แยก (custom buffer-source + GainNode ต่อโน้ต · เหมือนที่ guitar demo ทำกับไนลอน).

**รอบนี้ส่งมอบ:** เดโม solo violin (`docs/spikes/violin-solo-demo.html`) ที่ใช้ **เสียงไวโอลินจริง** เล่นทำนองทั้งเพลงด้วยลูกเล่นคันชักแท้ ๆ + เปิด/ปิดแต่ละลูกเล่นได้ ให้ P'Aim ฟัง+iterate บนมือถือก่อนส่ง dev (ตามธรรมเนียม §4B.4 "ปั้นเดโม solo ก่อนส่ง dev").

---

## เดโม (ให้ P'Aim ฟัง)

**ไฟล์:** `docs/spikes/violin-solo-demo.html`
**Network URL (มือถือ · LAN):** `http://192.168.1.124:5344/docs/spikes/violin-solo-demo.html`
_(IP เครื่องเปลี่ยนได้ · เช็ก `Get-NetIPAddress` ก่อนส่งซ้ำ · server = static `py -m http.server 5344` เสิร์ฟ worktree นี้ + junction `samples→public/samples`)_

**เพลง:** #1 "พระเจ้าเป็นความรัก" (ทำนองเดียวกับ guitar demo → P'Aim A/B เทียบ 2 เครื่องบนเพลงเดียวกันได้)

**สไตล์สำเร็จ 3 แบบ** (กดแล้วเล่นใหม่): ลากยาวพลิ้ว (cantabile · default) · สง่า (grand · +double-stop) · ตรงโน้ต (เรียบ · ไว้ A/B)

**ลูกเล่นคันชัก (เปิด/ปิดทีละอย่าง เพื่อหาว่าตัวไหนทำให้เพราะ):**
| ลูกเล่น | ทำอะไร |
|---|---|
| เชื่อมโน้ต (legato) | ปล่อยเสียงต่อเนื่อง โน้ตถัดไปเหลื่อมเข้ามา (คันชักไม่หยุด) |
| สเวลล์โน้ตยาว (messa di voce) | โน้ตยาว ≥1.5 บีต ค่อยดังขึ้นกลางโน้ตแล้วผ่อนลง = เอกลักษณ์คันชัก |
| สั่นเสียง (vibrato) | ~5.6 Hz เข้าหลัง onset ~0.28s (นักไวโอลินไม่สั่นทันที) · ปรับ cent ได้ |
| สไลด์เข้าโน้ต (portamento) | เริ่มต่ำ ~38 cent แล้วไต่เข้าพิตช์ ~75ms (บางโน้ตยาว) |
| หนัก-เบาตามวรรค (dynamics) | accent จังหวะตก × contour ไต่ทำนอง × humanize |
| ประสานคู่ (double-stop) | โน้ตยาว ≥2 บีต เติม chord-tone คู่ 3/6 ข้างล่าง (การประสานของไวโอลินเดี่ยว) |

**สไลเดอร์ปั้นเสียง:** ดังทำนอง · ความลึกสเวลล์ · ความแรง vibrato (cent) · ดังคู่ประสาน · เสียงก้องโบสถ์ · BPM.

---

## วิธีทำ (เทคนิค)

หัวใจ = **custom buffer-sampler ต่อโน้ต** (เหมือน guitar demo ทำกับไนลอน): fetch ogg (ชื่อไฟล์ = MIDI) → decode → `AudioBufferSourceNode` + `playbackRate` pitch-shift ไป sample ที่ใกล้สุด → **`GainNode` ต่อโน้ต** เป็น envelope คันชัก:
- **bow lean-in:** attack 0.05–0.16s (ยาวขึ้นตามความยาวโน้ต · ไม่ใช่ตอกกระแทก)
- **messa di voce:** โน้ต ≥1.5 บีต ramp ขึ้น ×(1+swell) ที่ 55% ของโน้ต แล้วผ่อนลง ×0.82 ก่อน release
- **legato ring:** ปล่อยหางเลย slot ให้โน้ตถัดไปเหลื่อม (คันชักต่อเนื่อง)
- **vibrato:** OscillatorNode → GainNode(cent) → `src.detune` · fade-in หลัง onset
- **portamento:** `src.detune` ramp −38→0 cent ใน 75ms
- **dynamics:** accent × contour × humanize (สูตรเดียวกับ piano/guitar demo)

**ทำไมต้อง path แยก (ไม่ใช้ smplr):** smplr `Sampler.start({note,time,duration,velocity})` ให้แค่ velocity คงที่ต่อโน้ต — **ทำ envelope/สเวลล์/vibrato ต่อโน้ตไม่ได้**. ไวโอลิน expressive ต้องคุม gain envelope เอง → buffer-source path (ตรงกับ P3 download spike ที่ก็ render ผ่าน buffer เอง).

---

## Verify (วัด output จริง ตามกติกา audio · §กติกา PM)

- **live:** เปิดผ่าน server จริง → status = "✅ เล่นด้วยไฟล์ไวโอลินจริง (VSCO-2 Solo Violin · CC0)" (ไม่ fallback) · ตั้งเวลาโน้ตครบทั้งเพลง · **console 0 error** · ปุ่ม/สไตล์/toggle ทำงาน
- **offline (OfflineAudioContext peak):** decode sample จริง (13.42s ยาวจริง) + render 3 โน้ต (สั้น / ยาว+สเวลล์+vibrato / double-stop pitch-shift) → **peak = 0.226 (>0.01 ✅) · RMS 0.030** → ทุกลูกเล่นออกเสียงจริง · **ไม่ติดปัญหา smplr scheduler lookahead** (memory `pleng-smplr-offline-render`) เพราะเป็น buffer-source เอง = โน้ตยาว render ได้ปกติ
- **ฟังหู:** = งาน P'Aim บนมือถือ (Network URL) → iterate ค่าต่อ

---

## ต่อไป (รอ P'Aim iterate → แล้วส่ง dev · PM gate)

1. **P'Aim ฟัง + เคาะค่า** (สไตล์/สเวลล์/vibrato/BPM/สมดุล) — ปั้นให้ "เพราะระดับโลก" ก่อน
2. **wire เข้าแอปจริง (หลัง P'Aim เคาะ):**
   - เพิ่ม **bowed playback path** ใน scheduler (buffer-source + envelope) — ทางเลือก: ให้ `sampler.js` มี wrapper แบบ envelope สำหรับเครื่อง bowed, หรือ `playSong` แตกสาขา bowed. โน้ต param จากเดโม = SSOT
   - เปิดปุ่ม: `soundOptions.js` `violin` → เอา `disabled:true` ออก + เพิ่ม `'violin'` ใน `READY_INSTRUMENTS` (`store.js`)
   - อัปเดต `bowed.js` module (patterns/humanizeFeel/melody-envelope hook) ให้ตรงค่าที่เคาะ
3. **Tester gate เต็ม spec** → PM merge → deploy

**ขอบเขตชัด:** รอบนี้ **ยังไม่แตะ prod src** (`src/`) — เดโม + รายงานเท่านั้น (creative iterate ก่อน · ตรง §4B.4). ยังไม่ merge/deploy — PM gate.
