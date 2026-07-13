# DS — Auto-arranger เสียงบรรเลง (B107 P2 · ครบทั้งระบบ)

**Task:** B107 P2 (SA · audio design) · **base:** `studio-shell-redesign` · **branch:** `b107-p2-design` (ออกแบบเท่านั้น · ไม่แตะ prod src)
**ต่อจาก:** P1 = เปียโน Grand จริง + voice-leading + gain fix (`b107-instrument-playback`, ผ่าน gate แล้ว) · **SSOT เดิม:** `docs/ds/chord-voicing-quality.md` (รอบ 0–6) · `docs/reports/sound-techniques-summary.md` (catalog 6 หมวด) · เดโม `docs/spikes/chord-voicing-demo.html`
**P'Aim (12 ก.ค.):** "เริ่ม P2 design เลย รวมทุกเทคนิคที่คุยกัน ทำทีเดียวจบ" → เอกสารนี้ = สเปกครบชุด (ออกแบบทั้งระบบในทีเดียว · แต่ **build ทีละ rule ได้**)

> **คำย่อ (ครั้งแรก):** SA = Systems Analyst (นักวิเคราะห์ระบบ) · AC = Acceptance Criteria (เกณฑ์รับงาน) · DS = Design Spec · MP3 = ไฟล์เสียงดาวน์โหลด · IR = Impulse Response (ตัวอย่างเสียงก้องของห้อง ใช้ทำ reverb) · PRNG = ตัวสุ่มเลขแบบคุมได้ (seeded) · PD = Public Domain · CC0/CC-BY = สัญญาอนุญาตแบบแจกซ้ำได้

---

## สรุปสั้น (F60+) — อ่าน 1 นาทีเข้าใจทั้งเอกสาร

**สิ่งที่ P2 ทำ:** เปลี่ยนการเล่นเสียงตอนนี้ (เปียโนจริง แต่ยัง "ตอกโน้ตตรง ๆ เท่ากันหมด แข็งเหมือนหุ่นยนต์") ให้กลายเป็น **"มีคนบรรเลงจริง"** โดยอัตโนมัติทั้ง 400+ เพลง — ไม่ทำทีละเพลง.

**ทำได้ยังไง:** ใส่ **"ตัวเรียบเรียงอัตโนมัติ" (auto-arranger)** คั่นระหว่าง "โน้ตบนแผ่น" กับ "การเล่นเสียง". ตัวเรียบเรียง = **ชุดกฎ (rule) ที่รันตามลำดับ 3 ชั้น**:

```
โน้ตบนแผ่น (SSOT)  →  [ ชั้น 1 เลือกโน้ต ]  →  [ ชั้น 2 หนัก-เบา+จังหวะ ]  →  [ ชั้น 3 ลูกเล่น ]  →  รายการเสียงที่จะเล่น  →  [ ชั้น 4 มิกซ์+เครื่องดนตรี ]  →  ลำโพง / MP3
```

- **ชั้น 1 (เลือกโน้ต):** เรียงเสียงคอร์ดให้ลื่น ไม่ทับทำนอง — voice-leading (มีแล้ว) + drop-2/open voicing + เบสค้าง (pedal) + เบสเดิน (walking).
- **ชั้น 2 (หนัก-เบา + จังหวะ):** ทำให้ "ไม่แข็ง" — เน้นจังหวะตก · ไต่ทำนองดังขึ้น · **สุ่มความแรง+เวลานิดหน่อยให้เหมือนมือคน (humanize)** · เบา-เต็มตามท่อน · ยืดปลายวลี (rubato).
- **ชั้น 3 (ลูกเล่น):** วิธีตีคอร์ด — ค้าง / ไล่ (arp) / รูด (roll) / สตริงคลอ (pad) / ย่ำ (waltz) + ประดับเล็ก ๆ (ประกายอ็อกเทฟ · โน้ตนำ).
- **ชั้น 4 (มิกซ์+เครื่อง):** เสียงก้องโบสถ์ (reverb) · แผ่ซ้าย-ขวา · เลือกเครื่อง (เปียโน/ไวโอลิน/สตริง/felt).

**หัวใจของสถาปัตย์:** ทุกกฎเป็น **โมดูลแยก** — แต่ละตัวเป็นฟังก์ชันบริสุทธิ์ที่แปลง "รายการเสียง" (pure function) → **build/test/verify ทีละตัวได้** แม้ส่งครบชุด. ตัวเรียบเรียงคืน **"รายการเสียง" (performance events) เป็นข้อมูลล้วน** → เทสแบบ headless ได้ + ใช้ตัวเดียวกันทั้งเล่นสดและ MP3.

**ผู้ใช้เห็นอะไร (P'Aim + ที่ปรึกษาเคาะ · 2 แกน + สวิตช์):** **(แกน 1) เสียง** — เปียโน/Felt/กีตาร์/ไวโอลิน แต่ละตัวเลือก **เดี่ยว** (เครื่องเดียวทั้งเพลง) หรือ **นำวง** (เครื่องนำ + ระบบเติมเครื่องคลอเอง) · **(แกน 2) เล่นอะไร** — ทำนอง/คอร์ด/ทำนอง+คอร์ด · **+ สวิตช์ "ใส่ลูกเล่น"** ที่โผล่เฉพาะ "ทำนอง+คอร์ด × เดี่ยว" (ปิด=โน้ตตรงตรวจโน้ต พี่เป้า · เปิด=arranger เต็ม) · ทำนอง/คอร์ดล้วน=ปิดอัตโนมัติ · นำวง=เปิดเสมอ. **default (ครั้งแรก) = เต็มวง+ลูกเล่นเต็ม เพราะสุดก่อน · โหมดฝึก=opt-in · จำค่าใน localStorage** (P2: default=เปียโนจัดเต็ม จนกว่า sample วงจะมา).

**เผื่อกีตาร์ตั้งแต่ออกแบบ (P'Aim สั่ง):** ลูกเล่นแต่ละเครื่องไม่เหมือนกัน → แยก **แกนกลางร่วม (harmony/humanize/dynamics = สากล) + โมดูลต่อเครื่อง (pattern/voicing/feel = เฉพาะเครื่อง)**. เปียโน = arp/block; กีตาร์ = strum/fingerpick/รูปคอร์ดเฟร็ตจริง. เพิ่มเครื่อง = plug-in โมดูล ไม่รื้อแกน (§4B).

**Curated Orchestration (ที่ปรึกษา P'Aim):** ไม่ให้ผู้ใช้เลือกเครื่องดิบ ๆ (รก + เสี่ยงย่านเสียงชนนัว) → **ล็อกคู่เสียงเพราะสุดตามทฤษฎีเป็น preset "อารมณ์"** (สงบ/เต็มวง/คลาสสิก) แต่ละอันการันตี "เปิดเพลงไหนก็เพราะ". preset = **role-based recipe** (ทำนอง/คลอ/เบส เล่นเครื่องไหน+pattern+ย่านเสียง). **อนาคต:** โหมด "จัดเต็ม (อัตโนมัติ)" = ระบบดูลักษณะเพลงแล้วเลือก orchestration ให้เอง (§6d). **P2 = สร้างเปียโนก่อน · architecture เผื่อ future ไม่ต้องรื้อ (§12).**

**ลำดับ build (ที่ปรึกษาสั่ง):** **Humanize ก่อนเป็นฐาน** (แก้ความแข็งได้เยอะสุดต่อแรงลงน้อยสุด) → drop-2/open → pedal bass → rubato/dynamics → patterns → walking bass → มิกซ์ → presets → เครื่องเพิ่ม.

**Verify (บทเรียน B107 "เปียโนเงียบ"):** ทุกกฎมี invariant unit test (headless) + **วัด real audio output จริง** (OfflineAudioContext peak>0 · balance · ไม่ clip · velocity อยู่ใน layer) + **P'Aim ฟังด้วยหู**. ไม่เชื่อ "fire ไม่ error".

---

## 0. สถานะปัจจุบัน (P1) — เราต่อยอดจากอะไร

โค้ดจริงที่ P1 วางไว้ (อ้างชื่อจริงเพื่อให้ dev ต่อได้ทันที):

| ไฟล์ | ของเดิม (P1) | บทบาทใน P2 |
|---|---|---|
| `src/lib/midi.js` | `songToNotes(content)` → `notes[]` · `buildChordVoice(notes)` → chord events (voice-led) · `chordVoicing(chordStr, prevUp)` · `scheduleNote(...)` (synth) · `makeChordBus(...)` · `playSong(content, opts)` (scheduler) | **ที่ตั้งของ arranger** — เพิ่ม `arrange()` คั่น |
| `src/lib/sampler.js` | `loadInstrument` · `getReadyInstrument` · `isSampledInstrument` · `gainToVelocity` · `SAMPLE_HOSTS` · `wrap().fire(midi, startT, dur, gain)` | **ขยาย registry เครื่องดนตรี** + multi-layer |
| `src/lib/audioExport.js` | `renderSongToBuffer(content, opts)` (OfflineAudioContext → MP3) เรียก `scheduleNote`+`buildChordVoice` ตรง ๆ | **P3** — route ผ่าน `arrange()` ตัวเดียวกัน |

**ปัญหาที่ P1 เหลือไว้ให้ P2 แก้ (P'Aim ได้ยินเอง):** เปียโนจริงแล้ว แต่ **"ทุกโน้ตดังเท่ากัน ตรงเป๊ะเป็นกริด = แข็งเหมือนเครื่องจักร"**. `playSong` ยิง `sampler.fire(n.midi, t, soundDur, 0.35)` — gain คงที่ 0.35 ทุกโน้ต, เวลา `t` ตรงกริดเป๊ะ, คอร์ดเป็น sustained block เดียว. **ไม่มีชั้น dynamics/pattern/humanize เลย** = นี่คือช่องว่างที่ P2 เติม.

**ข้อจำกัดเชิงเทคนิคที่ต้องออกแบบรอบ (จาก P1):**
1. **sampler ทรานสโพสกลางเพลง = reschedule** (voice เป็นก้อน detune ไม่ได้เหมือน synth). arranger คืน "รายการเสียง" ต่อ pass → key change = สร้าง pass ใหม่ (เหมือน P1/B105). ไม่ใช่ปัญหาใหม่.
2. **smplr เลือก velocity layer ตาม velocity และไม่ fallback ข้าม layer** → **ทุก gain ที่ arranger คืน ต้อง map เข้า layer ที่โหลด** (P1 บทเรียน "เปียโนเงียบ"). humanize ที่คูณ gain ×0.5–1.2 ต้อง clamp ให้ `gainToVelocity` ยังตกใน `GRAND_LAYER`. → **AC บังคับ (§7)**.
3. **สุ่มต้องคุมได้ (seeded)** — ไม่ใช้ `Math.random()`. เพราะ (ก) MP3 ต้อง render ให้ได้เสียงเดียวกับที่ฟังสด (deterministic) (ข) เทสต้องซ้ำผลได้ (ค) "2 รอบเล่นต่างกันจริง" ทำได้ด้วย seed = (songId, passIndex). → ใช้ PRNG เล็ก ๆ (mulberry32) เอง.

---

## 1. สถาปัตยกรรม arranger — 3 ชั้น + รายการเสียงกลาง

### 1a. ภาพรวม pipeline (โค้ดจริง)

```
content
  │ songToNotes(content)                       ← มีแล้ว (P1)
  ▼
notes[] { midi, beats, li, bi, si, syk, chord, tieOpen, tieEnd }   ← "ข้อเท็จจริงจากแผ่น" = SSOT
  │ buildChordVoice(notes)                      ← มีแล้ว (P1 · voice-led)
  ▼
chordEvents[] { bass, up[], midiSet, startBeat, beats }
  │
  ▼  arrange(notes, chordEvents, cfg, meta)     ← ★ ใหม่ (P2) — หัวใจ
  │      LAYER 1 voicing   : เลือก/ปรับ pitch ของ chordEvents (drop-2/open/pedal/walking/tensions)
  │      LAYER 2 dynamics  : ให้ gain + timeShift ต่อ event (accent/contour/section/cresc/rubato/humanize)
  │      LAYER 3 pattern   : ขยาย chord event → hit ตามจังหวะ (sustain/arp/roll/pad/waltz/…) + embellish
  ▼
perfEvents[] { role, inst, midi, startBeat, beats, gain, attack, decayTo }   ← "รายการเสียงที่จะเล่น" = ข้อมูลล้วน
  │
  ▼  scheduler (playSong / renderSongToBuffer)  ← ปรับให้ consume perfEvents
  │      LAYER 4 mix/timbre: per-role bus · reverb (convolver) · pan · makeup · เลือกเครื่อง (grand/felt/violin/strings)
  ▼
sampler.fire(midi, startT, dur, gain)  |  scheduleNote(...)   → ลำโพง / OfflineAudioContext → MP3
```

**กติกาคงที่ทุกชั้น (สืบจาก B104): แผ่น = SSOT.** โน้ต/คอร์ด = ตามที่แผ่นแสดง. arranger **ปรุงการเล่น** (การเรียง/หนัก-เบา/จังหวะตี/เนื้อเสียง) แต่ **ไม่เปลี่ยนตัวโน้ตทำนอง** และ **ไม่เติมโน้ตนอกคอร์ด** ยกเว้น (ก) โน้ตประดับที่เป็น chord-tone/approach ที่ปลอดภัย (ชั้น 3, opt-in ตาม preset) (ข) added tension เมื่อ flag เปิด (§2, default ปิด).

**★ แกนกลางร่วม + โมดูลต่อเครื่อง (instrument-agnostic core + instrument-idiomatic modules) — P'Aim สั่งเผื่อกีตาร์:** ลูกเล่นของแต่ละเครื่อง **ไม่เหมือนกัน** (เปียโน arp ≠ กีตาร์ strum). ออกแบบให้แยก 2 ส่วนตั้งแต่ต้น เพื่อเพิ่มกีตาร์/เครื่องอื่นภายหลัง = plug-in ไม่รื้อแกน (§4B):
- **แกนกลางร่วม (ไม่ขึ้นกับเครื่อง):** harmony/voice-leading (ชั้น 1 คณิต) · dynamics/humanize/rubato/section (ชั้น 2 ทั้งหมด) — เหมือนกันทุกเครื่อง.
- **โมดูลต่อเครื่อง (idiomatic):** ข้อจำกัดการเรียงเสียง (voicing constraints) + รูปแบบการตี (patterns, ชั้น 3) + "ฟีล humanize" (เช่น strum stagger กีตาร์ ~15–30ms) + sample. → เปียโน = arp/Alberti/block/wide-voicing · กีตาร์ = strum/fingerpick(Travis)/รูปคอร์ด 6 สาย/สายเปล่า (เล่นได้จริงบนเฟร็ต).

### 1b. รายการเสียงกลาง — `PerfEvent` (สัญญา interface)

หน่วยข้อมูลที่ arranger คืน และ scheduler กิน. **เป็นข้อมูลล้วน → headless-testable + ใช้ร่วม live/MP3.**

```js
/** @typedef {Object} PerfEvent
 *  role     : 'melody' | 'bass' | 'inner' | 'emb'   // บทบาท (คุม mix/หน้าต่าง register)
 *  inst     : 'melody' | 'chord'                    // slot เครื่องดนตรี (→ preset.melInst / chordInst)
 *  midi     : number                                // pitch ก่อนทรานสโพส (scheduler บวก transpose เอง)
 *  startBeat: number                                // beat จากต้นเพลง (scheduler แปลงเป็นวินาที = t0 + startBeat*spb)
 *  beats    : number                                // ความยาว (beat)
 *  gain     : number                                // linear gain สเกลเดิม (melody ~0.35, chord ~0.055) ก่อน mix
 *  attack   : number                                // ramp ขึ้น (วินาที) — synth ใช้ตรง · sampler ใช้เป็น onset hint
 *  decayTo  : number | null                         // ยุบหลัง swell (คอร์ด ~0.7) — synth path
 */
```

- **ทำไมแยกเป็นรายการเสียง (ไม่ยิงตรง):** ทำให้ 3 ชั้นเป็น **ฟังก์ชันแปลง `PerfEvent[] → PerfEvent[]`** ได้ → โมดูลแยก · เทสได้โดยไม่ต้องมีเสียง · scheduler โง่ลง (แค่วน fire) · MP3 ใช้ arranger เดียวกัน.
- `startBeat` เป็น **beat ไม่ใช่วินาที** → tempo/rubato/humanize-timing ปรับได้ที่ชั้น dynamics โดย scheduler ไม่ต้องรู้.
- **หมายเหตุ humanize timing:** ชั้น 2 เขียน `timeShift` (วินาที) ลงใน event ผ่านการแปลง `startBeat` เป็น "startBeat + shift/spb" **ไม่ได้** (เพราะ shift เป็นเวลาสัมบูรณ์ ไม่ใช่ beat). ทางเลือกออกแบบ: เพิ่มฟิลด์ `timeShift: number` (วินาที) ใน PerfEvent → scheduler คำนวณ `startT = t0 + startBeat*spb + timeShift`. **เลือกอันนี้** (สะอาดกว่า, humanize timing ไม่ขึ้นกับ bpm ตามธรรมชาติ — ±10ms คือ ±10ms ไม่ว่าเพลงเร็วช้า).

### 1c. โครงโมดูล (ไฟล์)

```
src/lib/arranger/
  index.js            arrange(notes, chordEvents, cfg, meta) → PerfEvent[]   (ต่อ pipeline 3 ชั้น)
  voicing.js          LAYER 1 : drop2 · open · pedalBass · walkingBass · addTensions   (แต่ละตัว = 1 export)
  dynamics.js         LAYER 2 : metricAccent · melodicContour · sectionDynamics · crescendo · rubato · humanizeVel · humanizeTime
  patterns.js         LAYER 3 : sustained · arpeggio · harpRoll · stringPad · waltz · alberti · fingerpick
  embellish.js        LAYER 3 : sparkle · chromaticApproach · gapFill · octaveSwell   (probabilistic, seeded)
  rng.js              PRNG (mulberry32) + seedFor(songId, pass) — determinism
  presets.js          นิยาม โหมด + orchestration recipe (§6) → cfg object
  recommend.js        §6d auto-instrumentation (future) — songFeatures() + recommendRecipe()
  instruments/        §4B InstrumentModule ต่อเครื่อง (idiomatic)
    keyboard.js         เปียโน/felt — voicing (voice-leading) + patterns (§4) + independent-spread feel
    bowed.js            violin/cello/strings — pattern pad/sustain/swell + long-attack feel
    guitar.js           strum/Travis + fret-playable voicing + strum-stagger feel (เพิ่มทีหลัง · ไม่แตะแกน)
  arranger.test.js    invariant tests ต่อ rule + โมดูล (headless)
src/lib/sampler.js    (ขยาย) registry: grand · felt · violin · cello · strings ; multi-velocity option
src/lib/midi.js       (ปรับ) playSong ให้ consume perfEvents + LAYER 4 mix (reverb/pan bus)
src/lib/audioExport.js (P3) renderSongToBuffer ผ่าน arrange() ตัวเดียวกัน
```

> **ทำไมโฟลเดอร์แยก `arranger/`:** ตอนนี้ `midi.js` = 524 บรรทัดแล้ว. arranger 3 ชั้น + patterns จะโตอีกมาก → แยกโฟลเดอร์ให้ `midi.js` เหลือหน้าที่ "scheduler + สร้างโน้ต" ตามเดิม. `arrange()` import จาก `midi.js` (`buildChordVoice`, `chordVoicing`) ได้ปกติ.

---

## 2. LAYER 1 — Voicing / Harmony (เลือก/ปรับโน้ตคอร์ด)

ทุกกฎรับ `chordEvents[]` (จาก `buildChordVoice`) → คืน `chordEvents[]` ที่ปรับ `bass/up`. ทำงาน **ก่อน** ชั้น dynamics/pattern. **มีแล้ว (P1):** voice-leading + inversions + no-doubled-root + register window + 7th ตามชื่อคอร์ด. ด้านล่าง = ที่เพิ่มใน P2.

### R1.4 — Drop-2 voicing (คอร์ดกว้าง โปร่ง อิ่ม)
- **input:** `up[]` (เสียงบน close voicing, sorted น้อย→มาก, จาก voice-leading) · เงื่อนไข `up.length ≥ 3`
- **rule:** ดึงเสียง **ตัวที่ 2 จากบน** ลง 1 อ็อกเทฟ (`up[len-2] -= 12`) แล้ว re-sort. → เสียงกระจายกว้างขึ้น 1 อ็อกเทฟ ("แจ๊ส/นักเปียโน").
- **guard:** ตัวที่ดึงลงต้อง **ไม่ต่ำกว่า bass** (ถ้าชน bass → ข้าม drop-2 คอร์ดนั้น) และ **ผลรวมยังอยู่ในหน้าต่างรวม** (bass..melody). ถ้าดึงแล้วต่ำกว่า `UP_LO-12` (36) → ข้าม.
- **rationale:** close voicing (P1) แน่นในย่านแคบ = "ตัน". drop-2 เปิดช่องกลาง = โปร่งขึ้นโดยโน้ตเท่าเดิม (ตรงกับที่ปรึกษา "less is more, clears register").
- **AC:** output pitch-classes = input pitch-classes (แค่ย้ายอ็อกเทฟ) · ช่วงเสียงกว้างขึ้น · ไม่มีเสียงต่ำกว่า bass.

### R1.5 — Open voicing (กระจายห่าง โอ่อ่า)
- **rule:** ทางเลือกแทน drop-2 — จัด up[] แบบ 1-5-3-(7) กระจายข้ามอ็อกเทฟ (สลับ close/wide) แทนการเรียงชิด. อัลกอริทึม: หลัง voice-leading, ถ้าเสียง 2 ตัวติดกันห่าง < 3 semitone และมีที่ในหน้าต่าง → ยกตัวบนขึ้นอ็อกเทฟ.
- **guard:** เหมือน drop-2 (อยู่ในหน้าต่าง, ไม่ทับ melody).
- **rationale:** "โอ่อ่า/สง่า" สำหรับ preset เต็มวง. **drop-2 กับ open = เลือกอย่างใดอย่างหนึ่งต่อ preset** (ไม่ซ้อน).

### R1.7 — Pedal / drone bass (เบสค้าง ลุ่มลึก ฟีลออร์แกนโบสถ์) — ที่ปรึกษาจัดลำดับ #3
- **rule (2 โหมด, เลือกใน cfg):**
  1. **`sustain-root`** (ง่าย, แนะนำเริ่ม): เบสของแต่ละคอร์ด → ยืดเต็ม span คอร์ด + attack ยาว (~0.08s) + release ยาว + gain ต่ำ → เบสไม่ "ตอก" แต่ "อุ้ม" ต่อเนื่อง.
  2. **`tonic-pedal`** (ขั้นสูง): ปล่อย **เสียงค้างเดียว = โน้ตหลักของคีย์ (tonic)** ในย่านต่ำ ยาวตลอด **ทั้งวลี/ท่อน** ใต้คอร์ดที่ขยับ → ฟีล pipe-organ. ใช้เฉพาะช่วงคอร์ดที่ tonic เป็น chord-tone/ไม่กัด (เช็ค: tonic pc ∈ {chord pcs} หรือเป็น 5th ของคอร์ด → ปลอดภัย; ไม่งั้นข้ามคอร์ดนั้น ไม่ปล่อย pedal).
- **rationale:** ที่ปรึกษา "depth". เพลงนมัสการช้าได้ฟีลลึกจากเบสค้าง.
- **AC:** เบสอยู่ย่าน MIDI 36–51 · โหมด sustain-root: 1 เบส/คอร์ด beats=span · โหมด tonic-pedal: ปล่อย pedal เฉพาะเมื่อ tonic ปลอดภัย (มี test เคส tonic กัดคอร์ด → ไม่ปล่อย).

### R1.8 — Walking bass (เบสเดินเชื่อมคอร์ด) — ที่ปรึกษาจัดลำดับท้าย
- **input:** ต้อง **lookahead** คอร์ดถัดไป (`chordEvents[i+1].bass`) — arranger มีทั้ง list อยู่แล้ว → ง่าย.
- **rule:** แทนเบสค้างตัวเดียว → เดินเบส **1 โน้ต/บีต** จากรากคอร์ดปัจจุบัน ไต่ (diatonic ในสเกลคีย์ ปิดท้ายด้วย **chromatic approach** −1/+1) ไปหารากคอร์ดถัดไป. บีตสุดท้ายของคอร์ด = โน้ตที่ห่างรากถัดไป ≤ 2 semitone.
- **guard:** ทุกโน้ตอยู่ย่านเบส (36–51) · ถ้าคอร์ดยาว < 2 บีต → ไม่เดิน (เบสค้างปกติ).
- **rationale:** ชีวิต/ความต่อเนื่องแบบเพลงจังหวะ. **opt-in เฉพาะ preset ที่เหมาะ** (ไม่ใช่ default — เพลงช้าสงบไม่ต้องการ).
- **AC:** จำนวนเบส = จำนวนบีต (คอร์ด≥2บีต) · ทุกโน้ตในย่าน · โน้ตท้าย−รากถัดไป ≤ 2 · เดินอยู่ในสเกลคีย์ (ยกเว้นตัว approach).

### R1.6 — Added tensions (สีสัน · flag opt-in · default ปิด)
- **rule:** (ก) เล่น 7th/sus/maj7/6 **ตามที่ชื่อคอร์ดสั่ง** = มีแล้ว (P1, `chordToIntervals`). (ข) flag **`lush`**: เติม add9 บนคอร์ด major ที่ **ค้างยาว ≥ 3 บีต** เท่านั้น.
- **guard (บังคับ):** โน้ต tension ที่เติม **ต้องไม่ตรง pitch-class กับโน้ตทำนองที่ดังพร้อมกัน** (เช็คกับ `notes[]` ที่ overlap ช่วงเวลานั้น) → กันเสียดสี. ถ้าชน → ไม่เติม.
- **rationale + ทำไม default ปิด:** สืบหลัก "ได้ยินตามแผ่น" (B104). เติมเองเสี่ยงชนทำนอง. เก็บเป็น flag ให้ preset "เต็มวง/cinematic" เปิดได้ในอนาคต.
- **AC:** default ปิด → ไม่มีโน้ตนอกคอร์ด · เปิด lush → add9 เฉพาะ major ยาว + ไม่ชน pc ทำนอง (มี test เคสชน → ไม่เติม).

---

## 3. LAYER 2 — Dynamics / Expression (หนัก-เบา + จังหวะยืดหด)

รับ `PerfEvent[]` → คืน `PerfEvent[]` ที่ปรับ `gain` และเพิ่ม `timeShift`. **นี่คือชั้นที่แก้ "แข็งเหมือนหุ่นยนต์"** — และ **Humanize = ฐานที่ต้อง build ก่อน (ที่ปรึกษา #1).**

> อัลกอริทึมด้านล่าง **พิสูจน์ในเดโมแล้ว** (`chord-voicing-demo.html` `accent()`, `melDyn()`) — ยกมาเป็นสเปก production พร้อม guard.

### R2.2 — Metric accent (เน้นจังหวะตก)
- **rule:** คูณ gain ตามตำแหน่งบีตในห้อง (อ่าน beats/bar จาก `content.timeSignature`; default 4/4):
  `p = posBeat mod beatsPerBar` → บีต 1 = ×1.0 · บีต 3 (กลาง) = ×0.9 · บีต 2,4 = ×0.8 · เศษ/off-beat = ×0.72.
- **AC:** downbeat ดังกว่า off-beat เสมอ · ค่าอยู่ [0.72, 1.0].

### R2.3 — Melodic contour (ไต่ขึ้นดังขึ้น · จบวลีเบา)
- **rule (ต่อโน้ตทำนอง i):** เริ่ม `cont=1` · ขึ้นจากตัวก่อน `+0.06` · เป็นยอด local (`>prev && ≥next`) `+0.06` · ลง `−0.04` · โน้ตยาว/จบวลี (`beats≥3`) `−0.06`. clamp [0.5, 1.2].
- **AC:** โน้ตยอดดังกว่าโน้ตข้างเคียง · โน้ตจบวลียาวเบาลง.

### R2.4 — Humanize velocity (สุ่มความแรงนิดหน่อย) — ★ ฐาน #1
- **rule:** คูณ gain ด้วย `0.95 + rng()*0.10` (±5%) ต่อ attack. **ใช้ PRNG seeded** (ไม่ใช่ Math.random).
- **guard (บังคับ · บทเรียน P1):** หลังคูณ accent×contour×jitter แล้ว **clamp ให้ `gainToVelocity(gain)` ยังตกใน `GRAND_LAYER` [41,67]** (ทุก sampled instrument). = melody floor/ceiling อยู่ในเลเยอร์ที่โหลด.

### R2.5 — Humanize micro-timing (สุ่มเวลานิดหน่อย) — ★ ฐาน #1 (แก้ "แข็ง" ได้มากสุด)
- **rule:** เพิ่ม `timeShift` ต่อ attack:
  - **melody:** `(rng()-0.5) * 2 * σ_mel`, σ_mel ≈ **10ms** (ที่ปรึกษา ±5–15ms).
  - **chord stack (bass+inner ในคอร์ดเดียว):** spread เล็กกว่า `σ_ch ≈ 4ms` — ให้ "ไม่เป๊ะพร้อมกัน" เหมือนมือคน แต่ยัง **ได้ยินเป็นคอร์ดเดียว** (ไม่ใช่ arp).
  - **emb:** σ ตาม pattern.
- **seed:** `seedFor(songId, pass)` → event index → deterministic. **MP3 กับเสียงสด = seed เดียว = เสียงเดียวกัน** (ข้อกำหนด P3). 2 passes ของ loop = pass 0,1 → ต่างกันจริงแต่ซ้ำได้.
- **rationale:** หูจับ "ความเป๊ะเป็นกริด" ว่าเป็นเครื่องจักร. กระจาย onset ±10ms = สมองอ่านว่า "คนเล่น". **นี่คือกุญแจที่ที่ปรึกษาชี้ว่าคุ้มสุด** → build ก่อน + วัดผลก่อน.
- **AC:** onset ของ melody กระจายในช่วง [−σ, +σ] · deterministic ต่อ seed (รันซ้ำได้ค่าเดิม) · ไม่มี 2 attack เหลื่อมจนสลับลำดับ (shift < ครึ่งช่องบีตที่สั้นสุด) · chord spread < melody spread.

### R2.6 — Section / phrase dynamics (verse เบา → chorus เต็ม)
- **rule:** รู้โครง section อยู่แล้ว (`li` ranges / `sectionTags`). คูณ gain ทั้ง event ตามท่อน: verse ×0.85 · chorus/รับ ×1.0 · bridge ×0.9 (ค่าเริ่ม จูนด้วยหู). ระบุ mapping ใน cfg.
- **AC:** ทุก event ในท่อน verse < ท่อน chorus (ค่าเฉลี่ย) · ปิดได้ (preset "ธรรมดา").

### R2.7 — Crescendo / decrescendo (ค่อยดัง-เบาต่อเนื่อง)
- **rule:** ramp เชิงเส้นของ gain ข้ามช่วง (เช่น 4 ห้องสุดท้ายก่อน chorus = ×0.9→×1.05). กำหนดเป็น "hairpin" ต่อ phrase หรือ auto: build เข้าหาโน้ตยอดของ section.
- **AC:** gain เปลี่ยนแบบ monotonic ในช่วง hairpin · opt-in.

### R2.8 — Rubato ปลายวลี (ยืดจังหวะให้หายใจ) — ที่ปรึกษาสั่ง
- **rule:** ตรวจ "ปลายวลี" = โน้ตยาว (`beats≥3`) หรือ fermata หรือก่อนขอบ section. ที่ปลายวลี:
  - ยืดความยาวโน้ตสุดท้าย `beats *= 1.10–1.15`.
  - หน่วง onset 1–2 ตัวก่อนจบเล็กน้อย (`timeShift += ramp 0→~30ms`) = "ผ่อน" เข้าหาปลาย.
  - **ชดเชย:** เพราะ `startBeat` ของ event ถัดไปมาจาก cumulative beats — การยืด beats ของโน้ตปลายจะเลื่อนทั้งเพลง. ต้องออกแบบให้ rubato **ปรับ timeShift** (ไม่ปรับ startBeat) เพื่อ localize ที่ปลายวลี แล้ว "คืนเวลา" ที่ต้นวลีถัดไป (timeShift กลับเป็น 0). → rubato เป็น push-pull รอบ ๆ ปลายวลี ไม่ดริฟต์สะสม.
- **rationale:** เพลงนมัสการ "หายใจ" ที่ปลายวรรค — จังหวะเป๊ะทั้งเพลง = แข็ง.
- **AC:** เฉพาะปลายวลียืด · เวลารวมเพลงไม่ดริฟต์ (ผลรวม timeShift รอบวลี ≈ 0) · ปิดได้.

### R2.1 — Velocity map + balance (มีแล้ว P1)
melody 0.35 · chord bass ×1.45 · inner ×1.0 → `gainToVelocity` เข้า PP layer. **คงไว้เป็นฐาน gain ก่อนคูณ R2.2–2.8.**

---

## 4. LAYER 3 — Patterns + Embellishments (วิธีตีคอร์ด)

รับ 1 `chordEvent` (voiced + section gain) → **ขยายเป็นหลาย `PerfEvent`** ตาม pattern. อ่าน `beatsPerBar` จาก `content.timeSignature` (จำเป็นเฉพาะ arp/waltz/alberti). **พิสูจน์ในเดโมครบ** (`arp/roll/pad/waltz` + embellish).

| pattern | rule (ย่อ) | ผูกจังหวะ? | เหมาะกับ | สถานะ |
|---|---|---|---|---|
| **`sustained`** | 1 block ค้างเต็ม span (bass gain×1.45, up gain×1, decayTo 0.72) | ไม่ | default · เพลงช้า | มี (P1) |
| **`arpeggio`** | แตกเป็น hit/บีต: bass→5→3→5 · shape สลับต่อคอร์ด (embellish) · บีต 1 ดังกว่า | ใช่ | ช้า-กลาง · "เปียโนบรรเลง" | เดโม ✓ |
| **`harpRoll`** | ชุดเดียว onset เหลื่อม ~30ms ล่าง→บน (`startBeat` เท่ากัน, ใช้ `timeShift` i×0.03) | ไม่ | ช้า อ่อนหวาน | เดโม ✓ |
| **`stringPad`** | ค้าง + attack ยาว ~0.35s (swell) + release ยาว · optional octave swell | ไม่ | นมัสการช้า สงบ · เต็มวง | เดโม ✓ |
| **`waltz`** | เบสบีต 1 + up ย่ำบีต 2..N | ใช่ | 3/4 · เพลงจังหวะ | เดโม ✓ |
| **`alberti`** | ต่ำ-สูง-กลาง-สูง ต่อเนื่อง (เปียโนคลาสสิก) | ใช่ | กลาง | ใหม่ P2 |
| **`fingerpick`** | เบสบีต + รูดเบา up บน off-beat (ballad) | ใช่ | ballad | ใหม่ P2 |

**Embellishments (`embellish.js`, probabilistic seeded, ~10/40 คอร์ด — คง less-is-more):**
- `sparkle` — ประกายอ็อกเทฟบนบางดาวน์บีต (โอกาส ~16%, top ≤ MIDI 86)
- `chromaticApproach` — โน้ตนำเข้าเบส −1 semitone ก่อนคอร์ด (โอกาส ~28%)
- `gapFill` — เติมโน้ต up ในช่องคอร์ดยาว (บีตสุดท้าย, โอกาส ~33% เมื่อ beats≥3)
- `octaveSwell` — สตริง/pad: สเวลล์อ็อกเทฟบนบางคอร์ด (โอกาส ~22%)

**guard patterns:** ทุก hit อยู่ในหน้าต่าง register ของ role · โน้ตประดับต้องเป็น chord-tone หรือ chromatic-approach ที่ resolve · โอกาสเกิดคุมด้วย seeded rng (2 passes ต่างจริง · เทสได้).
**AC:** จำนวน hit ต่อ pattern ตรงสูตร (arp: nb=round(beats)) · embellish ปิดได้ (preset ธรรมดา = 0 embellish) · ทุกโน้ตประดับ ∈ chord-tone/approach · sparkle top ≤ 86.

---

## 4B. Instrument modules — แกนกลางร่วม + โมดูลต่อเครื่อง (เผื่อกีตาร์ · P'Aim สั่ง)

**โจทย์ (P'Aim):** "ลูกเล่นเปียโนกับกีตาร์เหมือนกันไหม → ไม่เหมือน". ถ้า hard-code pattern แบบเปียโนไว้กลาง arranger → เพิ่มกีตาร์ทีหลังต้องรื้อ. แก้ด้วยการนิยาม **"instrument module" เป็น interface** — แกน arranger เรียกผ่าน interface นี้ → เพิ่มเครื่อง = เขียนโมดูลใหม่ 1 ตัว ไม่แตะแกน.

### 4B.1 — เส้นแบ่ง core vs idiomatic

| | อยู่ที่ไหน | ตัวอย่าง | ขึ้นกับเครื่อง? |
|---|---|---|---|
| **แกนกลางร่วม (core)** | ชั้น 1 คณิต harmony + ชั้น 2 ทั้งหมด | voice-leading (เลือก pitch-class + อ็อกเทฟใกล้), metric accent, contour, section dynamics, cresc, rubato, humanize velocity | **ไม่** — เหมือนทุกเครื่อง |
| **โมดูลต่อเครื่อง (idiomatic)** | ชั้น 1 constraints + ชั้น 3 patterns + humanize feel + sample | รูปแบบตี (arp/strum), ข้อจำกัดการเรียง (เฟร็ตกีตาร์), stagger feel, ช่วง register, ชุดเสียง | **ใช่** |

**หลัก:** core คำนวณ "ฮาร์โมนีที่ถูกต้อง + ควรหนัก-เบายังไง" (สากล) → ส่งให้โมดูลเครื่อง "แปลงเป็นการเล่นจริงของเครื่องนั้น" (idiomatic). humanize velocity = core; humanize **timing feel** (เปียโน spread ±10ms อิสระ vs กีตาร์ strum stagger ล่าง→บน 15–30ms เป็นทิศทาง) = idiomatic.

### 4B.2 — Interface ของ instrument module

```js
/** @typedef {Object} InstrumentModule
 *  id            : 'grand' | 'felt' | 'violin' | 'cello' | 'strings' | 'guitar' | …
 *  sample        : registry entry ใน sampler.js (host, layer, ช่วงโหลด, ลิขสิทธิ์)   // LAYER 4
 *  role          : 'melody' | 'chord' | 'both'    // เล่นทำนอง / คอร์ด / ได้ทั้งคู่
 *  register      : { lo, hi }                      // ช่วง MIDI ที่เล่นได้จริงของเครื่อง
 *  voicing(chordEvent, prevUp, ctx) : { bass, up[] }
 *                  // ข้อจำกัดการเรียงเสียงเฉพาะเครื่อง — เปียโนใช้ core voice-leading ตรงๆ;
 *                  // กีตาร์ override ให้เป็นรูปคอร์ดที่กดได้จริงบน 6 สาย (fret-playable)
 *  patterns      : { [name]: (chordEvent, voiced, beatsPerBar, rng) => PerfEvent[] }
 *                  // รูปแบบตีของเครื่องนี้ (เปียโน: sustain/arp/roll/pad/alberti; กีตาร์: strum/travis/…)
 *  defaultPattern: string
 *  humanizeFeel  : { velJitter, timing }
 *                  // timing = {type:'independent', sigma} (เปียโน) | {type:'strum', span, dir} (กีตาร์)
 */
```

- **core arranger** เรียก `module.voicing(...)` แทน `chordVoicing(...)` ตรง ๆ, และเรียก `module.patterns[cfg.pattern](...)` แทน pattern กลาง. โมดูลเปียโนก็แค่ wrap ฟังก์ชันที่มีอยู่ (voice-leading + patterns §4) → **ไม่เปลี่ยนพฤติกรรมเปียโน**.
- humanize velocity (core, §R2.4) ทำเหมือนเดิมทุกเครื่อง; humanize **timing** (§R2.5) เรียก `module.humanizeFeel.timing` → เปียโน = independent spread, กีตาร์ = strum stagger.

### 4B.3 — โมดูลกีตาร์ (worked example · P'Aim อยากเห็นตั้งแต่ออกแบบ)

| ด้าน | เปียโน (มี) | **กีตาร์ (โมดูลใหม่)** |
|---|---|---|
| **voicing** | voice-leading อ็อกเทฟใกล้ (wide/close ได้อิสระ) | **รูปคอร์ดที่กดได้จริงบน 6 สาย** — map ราก→รูปคอร์ดมาตรฐาน (open/barre), เลือกสายเปล่า (open string) ให้กังวาน, ไม่ข้ามช่วงเกินมือเอื้อม (≤ ~4 เฟร็ต), ย่านกีตาร์ E2–E4 |
| **patterns** | sustain/arp/roll/pad/alberti/fingerpick | **strum** (รูดลง/ขึ้นทั้งคอร์ด) · **fingerpick (Travis)** (เบสสลับ p + i-m-a รูดบน) · **arpeggio สาย** · **block รูปคอร์ด** |
| **humanize feel** | independent spread ±10ms | **strum stagger 15–30ms** ล่าง→บน (ทิศตาม down/up-stroke), เร็วขึ้นเมื่อจังหวะเร็ว |
| **register** | 40–84 | **40–64** (E2–E4) |
| **sample** | Grand PD | acoustic/nylon guitar **CC0/CC-BY** (ต้อง source) |

**guard voicing กีตาร์ (AC):** ทุก voicing = รูปที่กดได้จริง (สาย ≤ 6, ช่วงมือ ≤ ~4 เฟร็ต, ไม่มีโน้ตซ้ำสายเดียวกัน) · ราก = สายเบสที่ถูก (E/A/D string) · **ไม่ยืม wide-voicing ของเปียโน**. strum = stagger ทิศเดียว (ไม่ใช่ spread สุ่มสองข้างแบบเปียโน).

**guard voicing ไวโอลิน/bowed เดี่ยว (AC · ที่ปรึกษา):** ไวโอลินเล่นคอร์ดหนา 3–4 เสียงพร้อมกัน**ไม่ได้** → โมดูล bowed เมื่อเล่น role คอร์ด/เดี่ยว **ลด voicing เหลือ double-stop (2 โน้ต) หรือคู่ 3/6 ที่จำเป็น** (mono + monophonic embellishment สำหรับทำนอง · ลากยาวมีอารมณ์). เชลโล = role เบส (เสียงเดียวย่านต่ำ). **ห้ามส่ง block 4 เสียงให้ bowed.**
**guard "ไม่ loop" ทุกเครื่อง (AC · จาก sample research · one-shot buffer):** เพดานค้าง = ความยาว sample (ไวโอลิน 14.1s · เชลโล 4.3s · grand 4.2s · GM string 3.1s · ไนลอน 2.4s) → (ก) **bowed 'pedal' = re-bow (re-attack) ต่อ ~3 บีต** ไม่ค้างยาวโน้ตเดียว (ข) **pad ค้างจริง = re-trigger/overlap (crossfade) ทุกเครื่อง** — แม้ GM string_ensemble ก็ตายที่ 3.1s (ค) **ไนลอน = arp/fingerpick เท่านั้น** (decay 2.4s · ห้าม pad ค้าง). จัด voicing ในช่วง sample จริง (เชลโล 24–72 · ไวโอลิน 55–96 · §6b.1) ไม่งั้นขอบ pitch-shift เพี้ยน. **บทเรียนเดโม:** comp เป็น pad static = จืด/ไม่มีลูกเล่น → **comp ควรเป็น arp (movement) + pad เป็นชั้นอุ่นเบา ๆ ใต้** (P'Aim: เต็มวงต้องมีลูกเล่น+หนักเบา เท่าเดี่ยว-จัดเต็ม ไม่ใช่จืดกว่า).

**★ manifest.json = SSOT ให้ dev อ่านอัตโนมัติ (`public/samples/manifest.json` · research session):** ต่อเครื่องมี — **`durationSec`** (เพดานค้าง → derive re-trigger interval: violin 14.1/cello 4.3/grand·felt 4.2/steel·string 3.1/nylon 2.4) · **`loops:false`** (ทุกเครื่อง) · **`bakedMakeupDb`** (gain ที่เบคในไฟล์แล้ว: nylon/GM/grand=0 · cello=10 · violin=9 — **ห้าม re-apply · level match แล้ว**) · **`sampledRange`[lo,hi]** (cello 24–72 · violin 55–96 · nylon 31–84 · grand 40–84 · GM 36–90) · top-level `notes` กฎ one-shot/makeup → dev ใช้เป็น SSOT ไม่ hardcode.

**★ โหมดเดี่ยว ≠ โน้ตทื่อ (ที่ปรึกษายืนยัน):** เลือกเครื่องเดี่ยว + "ลูกเล่นเปิด" → รัน arranger ด้วย **เทคนิคขั้นสูงของเครื่องนั้น** (เปียโนเดี่ยว = มือขวาทำนอง + มือซ้าย arp/broken + pedal bass + sparkle · กีตาร์เดี่ยว = fingerpick + harp roll · ไวโอลินเดี่ยว = mono embellishment + double-stop). "ลูกเล่นปิด" (§6a) = โน้ตตรงเท่านั้น. → module.patterns ต้องมีทั้ง "solo-rich" และ "plain" ต่อเครื่อง.

**ผลต่อสถาปัตย์:** เพิ่มกีตาร์/bowed/ออร์แกน/ฟลูต ภายหลัง = เขียน `InstrumentModule` 1 ตัว (voicing + patterns + feel + sample) → เสียบเข้า registry. **แกน core (harmony/dynamics/humanize-vel) + PerfEvent + scheduler + presets ไม่แตะ.** = plug-in.

### 🚀 Launch scope (P'Aim เคาะ 13 ก.ค. · อัปเดต): ขึ้น live **3 โหมด — เปียโนเดี่ยว + กีตาร์เดี่ยว + เต็มวง(รวม)**
- **✅ เปียโน solo** (พิสูจน์แล้ว `humanize-timbre-demo.html`) · **✅ กีตาร์ solo** (P'Aim เคาะ 13 ก.ค. · nylon จริง · param ด้านล่าง)
- **✅ เต็มวง (รวมวง) = P'Aim เคาะนำขึ้นแล้ว (13 ก.ค.)** — **เสียงจริงทั้งวง** (Splendid Grand + เชลโล/ไวโอลิน CC · ไม่มี GM) + **กฎ 3 ชั้น** · reference `ensemble-real-demo.html` · balance **วัดแล้ว: เปียโน −5.6dB (นำ) · เชลโล −16.8 · ไวโอลิน −26.7** (ทำนองนำ สายอยู่ใต้/หลัง) · เลือกพระเอก เปียโน/ไวโอลิน. **dev note:** เดโมโหลดเปียโนจาก smplr CDN → prod ชี้ `public/samples/splendid-grand` (ชุดเดียวกัน).
- เครื่องที่เหลือ (**felt · violin · cello · string** เป็น "เดี่ยว" แยก) = หลัง launch · แต่ **sample พวกนี้ถูกใช้ในเต็มวงแล้ว** (violin/cello/string = role ในวง) จึงต้องพร้อมสำหรับ launch.
- **default:** เปิดแอปครั้งแรก = **เต็มวง (เพราะสุด)** · เปียโนเดี่ยว/กีตาร์เดี่ยว = ตัวเลือก · โหมดฝึก opt-in · จำ localStorage (§6a).

**🎸 Guitar module — ค่าพารามิเตอร์ที่ P'Aim เคาะ (จากเดโม `guitar-solo-demo.html` · dev implement ตามนี้ = SSOT):**
- **sample:** nylon จาก `public/samples/CC0/nylon` (filename = MIDI pitch · bakedMakeup 0 · ไม่ loop 2.4s → ปล่อย ring ธรรมชาติ ไม่ต้อง re-trigger สำหรับ pluck) · voicing ในช่วง 31–84.
- **patterns (module.patterns):**
  - **`strum` (default):** จังหวะ **D _ D U _ U D U** (eighth positions barpos 0=D,1=D,1.5=U,2.5=U,3=D,3.5=U) · **down = rake ต่ำ→สูง ~26ms/โน้ต** (มีเบส · gain ~0.30) · **up = rake สูง→ต่ำ ~20ms/โน้ต** (ไม่มีเบส · gain ~0.18) · โน้ต ring ~2 บีต.
  - **`travis` (fingerpick):** thumb เบสสลับ ราก(บีตคู่)/คู่5(บีตคี่) gain ~0.30 · ตาม i-m-a ไล่ขึ้นชัด 3 โน้ตในบีต (offset +0.25/+0.47/+0.69 บีต) gain ~0.16.
  - **`rasgueado`:** ต้นคอร์ด กรีด 4 ที cascading (t+0/+38/+76/+114ms · rake 12ms · gain ไล่ 0.12→0.27) + strum body เบา.
- **melody:** พลัก nylon บนสุด · **slide-in grace** (โน้ต −2 semitone ~55ms ก่อนโน้ตยาว โอกาส ~22%) · humanize ±12ms/±6% + accent/contour (แกนกลาง).
- **mix:** gentle master limiter (thresh −2 · ratio 4 · ไม่บีบ dynamics) · reverb room เบา.
- default สไตล์กีตาร์ = **strum (รูดจังหวะ)**.

### 4B.4 — ★ หัวใจ P2: "เดี่ยว-จัดเต็ม" สุด ๆ ของเทคนิคแต่ละเครื่อง (P'Aim เคาะ 12 ก.ค. ค่ำ)

**ทิศทาง (P'Aim):** "เน้นทำเครื่องเดี่ยว แต่ลูกเล่นของแต่ละเครื่องจัดเต็ม น่าจะเพราะกว่า (วงรวม)". → **โฟกัส P2 = ปั้นเทคนิค idiomatic ของแต่ละเครื่องให้สุดทาง** (เครื่องเดียวทำเต็มที่สุด = เพราะกว่า + เสี่ยงน้อยกว่าการมิกซ์วงให้ไม่ขุ่น · ตรง "น้อยแต่มาก"). **เต็มวง (§6b.1) = คงไว้ตามที่ทำแล้ว · ยังไม่ปั้น · หา balance ทีหลัง** (ไม่ใช่ของหลัก P2).

แต่ละ instrument module (§4B) ต้องมี pattern set **"solo-rich"** (ลูกเล่นเปิด) = สุดทางของเครื่องนั้น:

| เครื่อง (module) | solo-rich = สุด ๆ ของเทคนิค (ลูกเล่นเปิด) | สถานะ |
|---|---|---|
| 🎹 **grand / felt** (keyboard) | มือขวาทำนอง voice-led + **มือซ้าย arp/Alberti broken-chord** + **pedal bass** (ค้าง/re-articulate) + drop-2/open voicing + **ประกายอ็อกเทฟสูง** (sparkle) + **เติมช่องคอร์ดยาว** (gapFill) + rubato ปลายวรรค + dynamics เต็ม (accent/contour/section/humanize) · felt = +low-pass อุ่น | ✅ พิสูจน์แล้ว (เดโม solo) |
| 🎸 **nylon** (guitar) | **fingerpick (Travis)** เบสสลับ (p) + treble (i-m-a) · **รูดคอร์ด (harp roll)** ต้นวรรค (stagger 15–30ms) · รูปคอร์ด **กดได้จริงบนเฟร็ต** + สายเปล่ากังวาน · **strum** ลง/ขึ้น · ปล่อยสายให้ decay (ไม่ค้าง · sample 2.4s) · humanize | 🔜 sample พร้อม (build) |
| 🎻 **violin** (bowed) | ทำนอง **mono ลากยาวพลิ้ว** (sustain 14s) · **double-stop** (คู่ 3/6) ตอนต้องประสาน · **สเวลล์ (cresc/decresc) ในโน้ตยาว** · slur เชื่อมวลี · **portamento/rubato ปลายวรรค** · vibrato feel | 🔜 sample พร้อม (build) |
| 🎻 **cello** (bowed) | เดี่ยวย่านทุ้ม-เทเนอร์ · สีลากยาวมีอารมณ์ + สเวลล์ · double-stop บาง ๆ · **re-bow** สำหรับค้างยาว (>4.3s) · ทำนองเบส/เทเนอร์ | 🔜 sample พร้อม (build) |

**build order ปรับ (§8):** หลัง core + humanize + เปียโน solo แล้ว → **ทำ solo-rich ของ nylon → violin → cello ทีละเครื่องให้สุด** (สำคัญกว่า wire เต็มวง) · แต่ละเครื่อง = P'Aim↔SA ปั้นเดโม solo ก่อนส่ง dev. เต็มวงคง `presets.js` เดิมไว้ (ไม่ลบ).

---

## 5. LAYER 4 — Mix / Timbre + เครื่องดนตรี (audio graph)

ชั้นนี้อยู่ที่ **scheduler** (`playSong` / `renderSongToBuffer`) — สร้าง audio graph แล้ว route `PerfEvent` ตาม `role`/`inst`.

| เทคนิค | rule | สถานะ |
|---|---|---|
| Envelope + anti-click | attack→hold→release ramp (ห้าม hard-jump 0) | มี P1 |
| Chord bus low-pass + compressor | `makeChordBus` (เฉพาะ **synth path** — sample จริงไม่ต้อง) | มี P1 |
| Makeup gain | ยก PP layer (~×2.3) | มี P1 |
| Per-role mix | melody / bass / inner คนละ gain (velocity) | มี P1 |
| **Reverb (มิติโบสถ์)** | `ConvolverNode` + **IR โบสถ์ CC0** · wet/dry send bus · ต่อทั้ง live + offline | ★ ใหม่ P2 — คุ้มสุดกับนมัสการ |
| **Multi-velocity layer** | โหลด ≥2 layer → smplr เลือก timbre ตาม velocity จริง (ไม่ใช่แค่ gain) | ใหม่ P2 (option/preset · +ขนาดโหลด) |
| **Ensemble blend + register bands** | หลาย role/เครื่อง (§6a′ recipe) · **แต่ละ role บีบให้อยู่ย่านของมัน** (เบสต่ำ · คลอกลาง · ทำนองบน) = หัวใจ orchestration กันเสียงนัว | ใหม่ P2 |
| **Stereo spread / pan** | `StereoPannerNode`: bass กลาง · up แผ่ L/R เล็กน้อย · melody กลาง | ใหม่ P2 |

### เครื่องดนตรี — ชุด **5 เสียง** ที่ล็อกแล้ว (ที่ปรึกษา P'Aim: "จุดตัดพอดี · น้อยแต่มาก")

**source/ลิขสิทธิ์:** อ้างผลวิจัย `docs/reports/cc-instrument-samples.md` (2 tier · ผ่าน smplr เดิม ไม่มี dependency ใหม่). ไม่เพิ่มเครื่องเป่า/กลอง (ขัด "น้อยแต่มาก").

| # | เสียง (registry id) | role หลัก | source (Tier 1 เริ่ม → Tier 2 อัป) | สถานะ P2 |
|---|---|---|---|---|
| 1 | **grand** (Grand Piano · สว่าง ชัด) | ทำนอง/คลอ · **ยืนพื้นฝึก** | Splendid Grand (**PD**) — มี P1 (~2–3 MB PP layer) | ✅ มีแล้ว |
| 2 | **felt** (Felt/Soft Piano · นุ่ม ทุ้ม) | ทำนอง/คลอ · โหมดสงบ | **กรอง grand เดิม (softest + low-pass) = 0 sample / 0 license ใหม่** (cc-samples §felt) | ✅ **P2 build ได้เลย** (ไม่ต้องรอ sample!) |
| 3 | **nylon** (Nylon Guitar · เกาอุ่น มน) | ทำนอง/คลอ (เกา) | Tier-1 `FluidR3_GM` nylon (**CC-BY**) → Tier-2 FreePats CC0 | 🔜 มี sample แล้ว slot |
| 4 | **violin** (Solo Violin · lead กินใจ) | **ทำนอง** (lead) | Tier-1 GM violin → Tier-2 VSCO2/Iowa CC0 (lead เดี่ยว) | 🔜 slot |
| 5 | **cello / strpad** (Cello + Chamber/Con-sordino String Pad · ทุ้ม ฟุ้ง) | **เบส/ฐานล่าง** + pad ลากยาว | Tier-1 GM cello + string-ensemble → Tier-2 VSCO2 CE / Iowa MIS (cello เดี่ยว) | 🔜 slot |

> **ครบทุก role:** ทำนอง = grand/felt/nylon/violin · คลอ = grand/nylon/string-pad · **เบส = cello** (เติมย่านต่ำจริงให้กฎ pedal/walking bass §2 แทนมือซ้ายเปียโน). **ฟอร์แมต** .sf2/.sfz (Tier-1) หรือ ogg (Tier-2 host เอง). ขนาดรวม Tier-1 5 ตัว ≈ 12.5 MB + Grand 3.23 — แต่ **lazy-load เฉพาะที่ preset ใช้ (2–4 ตัว)** ไม่โหลดทั้ง 5 พร้อมกัน.

**โมดูล idiomatic (§4B):** keyboard (grand/felt · voicing+patterns เปียโน) · guitar (nylon · เฟร็ต+strum/Travis) · bowed (violin/cello/strpad · pad/sustain/swell ไม่มี arp/strum). เพิ่มเครื่อง = เพิ่มโมดูล 1 ตัว.

**tier (เคาะกับ P'Aim ตอนเดโม · PM แนะ):** เริ่ม **Tier-1 GM** ให้ครบเครื่อง+ขึ้นเร็ว → อัป **Tier-2 CC0** เฉพาะ **lead ที่โชว์เดี่ยว** (violin/nylon solo) ที่คุณภาพสำคัญสุด. **host-agnostic** (`SAMPLE_HOSTS` knob เดียว) → P2 ชี้ CDN ต้นทาง ship+วัดมือถือ → mirror ทีหลัง. **CC-BY = เครดิต 1 บรรทัด** ใน About/Guide.
**AC:** เพิ่ม/สลับเสียง = แก้ registry เท่านั้น · fallback synth ถ้าโหลด fail · felt = filter-node ของ grand (ไม่ใช่ sample แยก) · reverb ต่อได้ทั้ง live + OfflineAudioContext.

---

## 6. Presets — สิ่งที่ผู้ใช้เห็น (UI 2 แกน + สวิตช์ · P'Aim + ที่ปรึกษาเคาะ final)

**หลัก:** ผู้ใช้ไม่เห็นปุ่มดิบ. คุมด้วย **2 แกน + 1 สวิตช์เงื่อนไข** —

### 6a. โครง UI + ตรรกะ "ลูกเล่น" (blueprint If-Else ให้ dev)

**แกน 1 — เสียง (เดี่ยว / นำวง):**
- **เดี่ยว (Solo):** เครื่องที่เลือกเล่นทั้งเพลง — แต่ **เปิดเทคนิคขั้นสูงของเครื่องนั้น** เมื่อลูกเล่นเปิด (เปียโน solo style · กีตาร์ fingerpick · ไวโอลิน mono+double-stop · §4B)
- **นำวง (Lead ensemble):** เครื่องที่เลือก = **พระเอกนำทำนอง** → ระบบเติมเครื่องคลอที่เข้ากันเอง (ไวโอลินนำ→เปียโนคลอ · กีตาร์นำ→เชลโล/แพดคลอ). ความเสี่ยงย่านชนนัวคุมที่นี่ (curated §6b).

**แกน 2 — เล่นอะไร:** ทำนอง · คอร์ด · **ทำนอง+คอร์ด** (= 3 sound modes เดิม B104)

**★ สวิตช์ "ใส่ลูกเล่น" — ตรรกะเปิด/ปิด (ที่ปรึกษา final · dev เขียน If-Else ตรงนี้):**

| แกน 2 (เล่นอะไร) | แกน 1 (เสียง) | สวิตช์ลูกเล่น | ระบบทำหลังบ้าน |
|---|---|---|---|
| ทำนองล้วน | เดี่ยว | **ปิดอัตโนมัติ** (ไม่โชว์สวิตช์) | โน้ตทำนองตรงแผ่น จังหวะเป๊ะ (แกะโน้ต/ร้องตาม) |
| คอร์ดล้วน | เดี่ยว | **ปิดอัตโนมัติ** (ไม่โชว์สวิตช์) | คอร์ด block ตรงแผ่น (คลอ/ฝึกเล่นตาม) |
| **ทำนอง+คอร์ด** | เดี่ยว | **ผู้ใช้เลือก (โชว์สวิตช์)** | ปิด=block/sustain ง่าย (ฝึก/ตรวจโน้ต — พี่เป้า) · เปิด=arranger เต็ม (เทคนิคเครื่องนั้น) |
| (ใด ๆ) | **นำวง / เต็มวง** | **เปิดเสมอ** (ไม่โชว์สวิตช์) | 3 ชั้นเต็ม + ระบบจับคู่เครื่องคลอเอง (โหมดฟัง/นมัสการ) |

- **สวิตช์โผล่เฉพาะ** "ทำนอง+คอร์ด × เดี่ยว" เท่านั้น — ที่เหลือระบบตัดสินให้ (ปุ่มไม่รก).
- **★ default (ครั้งแรก · P'Aim เคาะ 12 ก.ค.): เพราะที่สุดก่อน = เต็มวง + ลูกเล่นเต็ม** — กดเล่นปุ๊บได้เสียงบรรเลงเต็มที่สุดทันที. **โหมดฝึก/ตรวจโน้ต = opt-in** (คนอยากฝึกค่อยไปตั้งเอง).
  - ⚠️ **P2:** "เต็มวง" ต้อง sample เครื่องอื่น (ยังไม่มา) → **default P2 = เปียโน "จัดเต็ม" (ลูกเล่นเต็ม)** = เพราะสุดเท่าที่มี · เมื่อได้ sample วง → default เลื่อนเป็นเต็มวงอัตโนมัติ.
- **★ จำค่าใน localStorage (P'Aim เคาะ):** เก็บ {instrument, solo/ensemble, voices, embellish} ล่าสุด → เปิดครั้งหน้าได้ค่าเดิม. **นัยสำคัญ:** คนตั้ง "โหมดฝึก/ตรวจโน้ต" (พี่เป้า) ไว้ = sticky ไม่ต้องตั้งใหม่ทุกครั้ง → default เพราะสุด **ไม่ชน** ความต้องการตรวจโน้ต (ต่างคนต่างจำค่าตัวเอง).
- **เครื่องยังไม่มี sample (นอกจากเปียโน) ใน P2** = ปุ่มจาง "เร็ว ๆ นี้".

> **เหตุผล (User-Centered · 3 กลุ่มใช้งาน):** (1) แกะโน้ต/ซ้อม → ทำนอง/คอร์ดล้วน หรือ ทำนอง+คอร์ดลูกเล่นปิด = โน้ตนิ่งตรงแผ่น (2) ซ้อมมีสีสัน → ทำนอง+คอร์ด ลูกเล่นเปิด (3) ฟัง/นมัสการ → นำวง/เต็มวง กดปุ่มเดียวเพราะเลย.

### 6b. แกน 1 (เสียง) — เดี่ยว vs นำวง (Lead-driven Curated Orchestration)

**เดี่ยว (Solo)** = recipe ที่ **ทุก role = เครื่องเดียว** · **นำวง (Lead)** = เครื่องที่เลือก = พระเอกทำนอง → ระบบเติมเครื่องคลอที่เข้ากันเอง (ไม่ใช่ให้ผู้ใช้จิ้มผสม):

> **หลักการ (ที่ปรึกษา P'Aim): "Curated Orchestration" — ห้ามให้ผู้ใช้จิ้มผสมเครื่องเอง** (UI รก + เสี่ยงย่านชนนัว flute+violin สูง). → **เลือกพระเอก → ระบบล็อกคู่เสียงเพราะสุดตามทฤษฎีให้** · การันตี "เปิดเพลงไหนก็เพราะ".

**recipe (เดี่ยว + นำวง) = role-based** — กำหนด **แต่ละ role (ทำนอง/คลอ/เบส) เล่นเครื่องไหน + pattern + ย่านเสียง** (แบ่งย่านกันนัว) · layer บน "แกนกลาง + instrument module (§4B)". เดี่ยว = roles ทั้ง 3 = เครื่องเดียว (แต่ต่าง role ด้วย pattern เช่น มือขวาทำนอง/มือซ้าย arp/pedal bass).

**map "เลือกพระเอก → ระบบเติมคลอ" (นำวง):** ไวโอลินนำ → +เปียโนคลอ (Classical Elegance) · กีตาร์นำ → +เชลโล/แพดคลอ (Acoustic Intimate) · เปียโนนำ → +สตริงแพด (เต็มวงนมัสการ). ตารางด้านล่าง = recipe สำเร็จ (เดี่ยว 2 บน + นำวง 3 ล่าง):

| recipe (เดี่ยว/นำวง) | ทำนอง | คลอ/คอร์ด | เบส | pattern | reverb·bpm | ทำไมเพราะ (orchestration) | สถานะ |
|---|---|---|---|---|---|---|---|
| **★ เปียโนสงบ** (P2 default) | **felt** (กรอง grand) | felt | grand (pedal) | sustained + pedal bass | church·64 | เปียโนล้วน นุ่ม · *น้อยแต่มาก* · Sacred Space | **✅ P2 (felt = กรอง grand ฟรี → build ได้เลย)** |
| **เปียโนบรรเลง** | grand | grand (arp) | grand | arp + drop2 | room·72 | มือซ้ายไหลใต้ทำนอง เหมือนคนเล่นจริง | **✅ P2** |
| **🎹 เปียโนนำ — เต็มวงนมัสการ** | **grand** | **string pad** (sustained/swell) | **cello** (pedal) | pad + pedal | church·72 | เปียโนนำ · สตริงปูพื้น · เชลโลอุ้ม · อุ่น เต็ม | ✅ **sample พร้อม** (§6b.1) |
| **🎻 ไวโอลินนำ — คลาสสิก** | **violin** (mono+double-stop) | **grand** (arpeggio) | **cello** (pedal) | arp + pedal | church·66 | ไวโอลินสีทำนอง · เปียโนไล่คอร์ด · สง่า หวาน | ✅ **sample พร้อม** |
| **🎸 กีตาร์นำ — อะคูสติกอบอุ่น** | **nylon** (fingerpick) | **grand** (arpeggio เบา) | **cello** (pedal) | arp + pedal | room·72 | กีตาร์เกานำ · เปียโนคลอ · เชลโลต่ำ · ใกล้ชิด | ✅ **sample พร้อม** |

> **สโคป (P'Aim ค่ำ 12 ก.ค. · อัปเดตล่าสุด):** รอครบ 5 เครื่อง แล้วขึ้น live ทีเดียว (ไม่ deploy เปียโนอย่างเดียว) · sample 5 เครื่อง self-host ครบ. **แต่ P'Aim ฟังเดโมเต็มวงแล้ว = ยังไม่เพราะเท่าเดี่ยว-จัดเต็ม → เคาะ: หัวใจ = "เดี่ยว-จัดเต็ม สุด ๆ ต่อเครื่อง" (§4B.4) · เต็มวง (recipe/เดโมข้างล่าง) = คงไว้ตามที่ทำ · ยังไม่ปั้น · หา balance ทีหลัง (ไม่ใช่โฟกัส).** recipe เต็มวงคงไว้ใน `presets.js` (ไม่ลบ). **เดโมเต็มวง:** `docs/spikes/ensemble-demo.html` (working · ยังไม่ปั้น).

#### 6b.1 — Recipe เต็มวงรูปธรรม (นำวง · dev wire เข้า `presets.js` PRESETS)
เลือกพระเอก (แกน 1 = ensemble) → ระบบใช้ recipe ที่ล็อกคู่เสียงตามทฤษฎี · แต่ละ role แยกย่าน (register) กันนัว · humanize/dynamics = แกนกลาง (เหมือน preset เปียโน). ค่า `roles[]` + `cfg` ตามรูปแบบใน `presets.js` ที่ dev วางไว้แล้ว:

```js
// role = { role, inst, pattern, register:[lo,hi] } ; ทุก recipe: dynamics เปิดครบ · reverb ตามตาราง · humanize ±12ms/±6%
'ensemble-piano': {  // 🎹 เปียโนนำ = default เต็มวง (P'Aim: default เพราะสุด)
  label:'เต็มวงนมัสการ', mood:'เปียโนนำ · อุ่น เต็ม', lead:'grand',
  roles:[ {role:'melody', inst:'grand',  pattern:null,        register:[55,84]},
          {role:'comp',   inst:'grand',  pattern:'arpeggio',  register:[48,67]},   // ★ มือซ้ายไล่คอร์ด = ลูกเล่น (ไม่ใช่ pad นิ่ง)
          {role:'pad',    inst:'strpad', pattern:'pad-retrig',register:[52,72]},   // สตริงแพดอุ่น ใต้ (soft · re-trigger ≤3.1s)
          {role:'bass',   inst:'cello',  pattern:'pedal',     register:[36,52]} ],  // re-bow ~3 beat
  cfg:{ reverb:'church', bpm:72, pan:true, embellish:['sparkle'], dynamics:{accent:true,contour:true,rubato:true,section:true} } },
'ensemble-violin': { // 🎻 ไวโอลินนำ
  label:'คลาสสิก', mood:'ไวโอลินนำ · สง่า', lead:'violin',
  roles:[ {role:'melody', inst:'violin', pattern:null,        register:[55,88]},   // mono + double-stop (bowed module §4B)
          {role:'comp',   inst:'grand',  pattern:'arpeggio',  register:[48,67]},
          {role:'bass',   inst:'cello',  pattern:'pedal',     register:[36,52]} ],
  cfg:{ reverb:'church', bpm:66, pan:true, dynamics:{accent:true,contour:true,rubato:true,section:true} } },
'ensemble-guitar': { // 🎸 กีตาร์นำ
  label:'อะคูสติกอบอุ่น', mood:'กีตาร์นำ · ใกล้ชิด', lead:'nylon',
  roles:[ {role:'melody', inst:'nylon',  pattern:'fingerpick',register:[45,76]},
          {role:'comp',   inst:'grand',  pattern:'arpeggio',  register:[48,67]},
          {role:'bass',   inst:'cello',  pattern:'pedal',     register:[36,52]} ],
  cfg:{ reverb:'room', bpm:72, pan:true, dynamics:{accent:true,contour:true,rubato:true,section:true} } },
```

**balance เริ่ม (per-role gain · จูนกับ P'Aim ในเดโม · relative):** ทำนอง(นำ) **1.0** · คลอ **~0.62** (−4 dB ใต้ทำนอง · pad ต่ำกว่า arp นิด) · เบส(เชลโล) **~0.78** (อุ้มแต่ไม่กลบ) · reverb wet **~0.30** (church) — ให้ทำนองนำชัด ทุก role แยกย่าน ไม่ล้น.
**tempo→pattern (§6d):** comp pattern สลับตาม bpm — <92 = arpeggio/pad ไล่ · ≥92 = sustained pad นิ่ง (กันรก).
**default เต็มวง (P'Aim: เพราะสุดก่อน) = `ensemble-piano` (เปียโนนำ).** อีก 2 = ผู้ใช้เลือกพระเอกเอง.

**⚠️ ข้อจำกัด sample จริง (จาก research session · `public/samples/manifest.json` · dev ต้องทำตามไม่งั้นเพี้ยน/เละ):**
1. **ช่วง sample จริง — จัด voicing ในช่วงนี้ (นอกช่วง smplr pitch-shift ขอบเพี้ยน):** เชลโล MIDI **24–72 (C1–C5)** เก่งย่านต่ำ-กลาง → **เบส/ล่าง < ~C4** · ไวโอลิน **55–96 (G3–C7)** → **ทำนอง/เดสแคนต์ > ~C4** · ไนลอน **G1–C6** → arp/fingerpick กลาง **C3–C5** · string ensemble (GM) + grand/felt = เต็มช่วง.
2. **★ ไม่มีเครื่องไหน loop เลย (ทั้ง CC0 + GM = one-shot buffer · วัดด้วย ffprobe):** "เพดานเสียงค้าง" = ความยาว sample เอง/โน้ต — ไวโอลิน **14.1s** (ยาวสุด · ค้างได้จริง) · เชลโล **4.3s** · Grand **4.2s** · GM string_ensemble **3.1s** · GM steel 3.1s · ไนลอน **2.4s** (decay สั้น · ดีด/arp เท่านั้น). → **คอร์ดค้างยาว (pad จริง) = ต้อง re-trigger/overlap (crossfade) โน้ตซ้อน ทุกเครื่อง** — พึ่งโน้ตเดียวค้างยาวไม่ได้แม้แต่ GM string_ensemble (ตายที่ 3.1s). **bass เชลโล 'pedal' = re-bow (ยิงซ้ำ) ต่อ ~3 บีต** ไม่งั้นเบสหาย. **ไนลอน = arp/fingerpick เท่านั้น** (ห้าม pad). manifest ต่อเครื่อง (`durationSec`/`loops:false`) ใน `public/samples/manifest.json`.
3. **โซนทับ G3–C5:** เชลโลบนสุดเจอไวโอลินล่างสุด → **แยก register เด็ดขาด** (ไวโอลิน=ทำนองบน >C4 · เชลโล=เบส <C3–C4) กันเป็นโคลน — register ในตาราง §6b.1 คุมไว้แล้ว (cello[36–52] · violin[55–88] ไม่ทับ).
4. **level:** CC0 solo strings อัดเบากว่า GM/Grand ~10–13dB (research เบค makeup +10dB เชลโล/+9dB ไวโอลิน ในไฟล์แล้ว) · ในมิกซ์เต็มวง **GM pad ดังกว่าโดยธรรมชาติ → ดันไวโอลิน/พระเอกให้อยู่เหนือ pad + เบสเชลโลแยกชัด** (balance ข้างบนเป็นจุดเริ่ม · วัด 3-role §7c ยืนยันทำนองนำ).
5. **สูตร layer กันโคลน (low→high):** เบส เชลโล/pedal grand (<C3) → กลาง ไนลอน arp/เปียโน (C3–C4) → pad ค้าง GM string ensemble (คลุม) → ทำนองบนสุด ไวโอลิน (>C4).

#### 6b.2 — ★ กฎ "3 Sonic Layers" = วิธีทำเต็มวงให้เพราะ (**launch scope · P'Aim เคาะทิศแล้ว**)
**สถานะ:** เต็มวงเข้า launch (P'Aim ยอมขึ้น full) · เวอร์ชันจืดเดิม (comp pad นิ่ง + limiter กด dynamics) = **ทิ้ง** · ใช้ **3 กฎนี้แทน** — P'Aim ฟังเดโม `ensemble-rules-demo.html` (A/B กฎเปิด/ปิด) แล้วเคาะ **"ดีขึ้น ไม่จืด แต่น่าจะดีกว่านี้ได้"** → ทิศถูก · **ต้อง tune SA↔P'Aim ต่ออีกเยอะ** ก่อน final. dev implement 3 กฎนี้เข้า scheduler multi-role (บางส่วนมีแล้ว ✓):
1. **Guide layer (ทำนอง 1 ชิ้นเดียว):** ล็อกให้มี lead เล่นทำนอง **แค่เครื่องเดียว** · เครื่องอื่น**ห้ามเล่นโน้ตทำนองเดียวกัน** (กันชนย่าน/จืด) · lead ใส่ **swell ในโน้ตยาว + rubato ปลายวรรค** (✓ dynamics มี).
2. **Motion layer (ชีพจร):** เปียโน/กีตาร์ = **arpeggio เดินไลน์** (ไม่ตอกคอร์ดก้อนนิ่งพร้อมกัน) → โปร่ง มีที่ให้ทำนองหายใจ (✓ pattern arp มี · **บทเรียน: comp ต้อง movement ไม่ใช่ pad static**).
3. **Foundation layer (โอบอุ้ม):** เชลโล/string pad = voice-led ขยับน้อย · **gain ~−9 dB ใต้ทำนอง** + **reverb ผลักไป"ด้านหลัง"** (✓ voice-leading/balance มี · **เพิ่ม: per-role reverb depth — เปียโน/กีตาร์ dry อยู่หน้า · สาย wet อยู่หลัง** = มิติ).
- **★ Dynamic role-prominence (เพิ่ม):** ไม่ให้ทุกเครื่องเด่นเท่ากันตลอด — เมื่อ lead เด่น เครื่องอื่น **ลดบทบาท** (เปียโน→คอร์ดห่าง sustain · กีตาร์→arp เบา) เปิดที่ให้ lead (call-and-response ไม่แย่งซีน).
- **★ Section arrangement density (เพิ่ม · เหนือ section-gain เดิม):** **เพิ่ม/ลดจำนวนเครื่องตามท่อน** — verse = felt+กีตาร์เบา · chorus = ไวโอลิน+string เอ่อล้นเข้ามา (ไม่ใช่เปิดครบทุกเครื่องตั้งแต่โน้ตแรก). → ลบความจืด กินใจ.
> ทั้งหมด = **launch scope · P'Aim เคาะนำขึ้นแล้ว** · **reference = `ensemble-real-demo.html`** (เสียงจริงทั้งวง + กฎ 3 ชั้น). **ต้องใช้ sample จริง ไม่ใช่ GM** (P'Aim: GM แย่ · จริงดีขึ้นเยอะ). `ensemble-rules-demo.html` (GM A/B) = พิสูจน์แนวคิดเท่านั้น.

**🎼 Ensemble params (approved · dev implement · จาก `ensemble-real-demo.html` + วัดจริง):**
- **balance (วัดด้วย AnalyserNode · ทำนองนำ · สายอยู่ใต้/หลัง):** เปียโน(นำ) **−5.6 dB** · เชลโล(เบส) **−16.8 dB** · ไวโอลิน(pad/หลัง) **−26.7 dB**.
- **piano (grand):** โหลด PP layer [41,67] + map gain→velocity เข้า [41,67] (กันเงียบ · P1 lesson) + **makeup ×2.6** (สู้สาย CC ที่ baked +9/+10 dB).
- **เชลโล/ไวโอลิน CC:** baked makeup อยู่ในไฟล์ → **gain ต่ำ** (เชลโล ~0.11–0.14 · ไวโอลิน lead ~0.34 · pad ~0.05) · re-bow ~3 บีต · voicing ในช่วง sample (เชลโล 24–72 · ไวโอลิน 55–96).
- **กฎ 3 ชั้น:** เปียโน = near reverb (หน้า) · เชลโล/ไวโอลิน = far reverb ยาว (หลัง) · **section density:** verse = เปียโน+เชลโลโปร่ง · chorus = ไวโอลินสายเอ่อเข้ามา (14s sustain = pad จริง) · arp motion (ไม่ pad นิ่ง) · swell โน้ตยาว + humanize.
- **lead:** เปียโนนำ (default) หรือ ไวโอลินนำ (slide-in + ลากยาว) · **default เปิดแอป = รวมวง เปียโนนำ**.
- **dev note:** เดโมโหลด grand จาก smplr CDN → prod ชี้ `public/samples/splendid-grand`. ยัง tune balance/รสนิยม SA↔P'Aim ต่อได้ (มีเครื่องวัด peak ต่อ role ช่วย).

**🟢 Enhancements ที่ P'Aim เคาะทำ (13 ก.ค. · จากที่ปรึกษา · แก้ "จืด" — เอาแค่ 2 ตัวนี้ก่อน):**
1. **Section dynamics (master gain ตามท่อน)** — ล็อก master gain: **verse ×0.7 → chorus ×1.0** (ramp ที่ขอบท่อน) → ไดนามิกเติบโต. ใช้ **section จริงของเพลง** (song model มี sections/ท่อน · ไม่ใช่ % บีตแบบเดโม). ใช้ได้ทุกโหมด (เปียโน/กีตาร์/รวมวง).
2. **Role-prominence (หลบ-เติมพระเอก · call-and-response · หัวใจแก้เต็มวงจืด)** — ต่อ comp/bass event ดู **ความเคลื่อนไหวของทำนองในช่วงนั้น**:
   - ทำนอง**วิ่งเร็ว/โน้ตสั้นถี่** → **หรี่ comp+bass ~−3 dB อัตโนมัติ** (เปิดที่ให้พระเอก)
   - ทำนอง**ลากโน้ตยาว** (beats ≥ ~3) → **ให้เปียโนเล่น fill-in แทรก** (arp/sparkle) + comp ดังขึ้นนิด
   - สูตร: `melDensity` = จำนวน attack ทำนอง/บีต ในช่วง event → `compGain *= (busy ? 0.7 : 1.0)` · long-hold → trigger fill. **ค่า −3dB/threshold = จูนด้วยหู SA↔P'Aim**.
> **พักไว้ (ยังไม่ทำ · เหลือง/แดง):** rubato (ต้องข้อมูลปลายวรรคแม่น) · crossfade pad (แก้รอยต่อ แต่ไม่แก้ต้นตอ — ต้นตอ = ไวโอลิน solo แทน pad · ทางที่ดีกว่า = ซ้อนไวโอลิน 2-3 ตัว detune ให้หนา) · guitar fret-voicing (polish · กีตาร์ผ่านแล้ว). · **gain clamp = มีอยู่แล้ว** (velocity-in-layer §7b · ที่ปรึกษาย้ำถูก).

### 6a′. โครง config (orchestration recipe · role-based · scale ไป auto-instrumentation ได้)

```js
const PRESET = {
  id, label, mood,                        // "อารมณ์" ที่ผู้ใช้เห็น
  roles: [                                // ★ role-based (ไม่ hardcode 2 เครื่อง) → รองรับ 3+ เครื่อง
    { role:'melody', inst, pattern, register:[lo,hi], gain },
    { role:'comp',   inst, pattern, register:[lo,hi], gain,   // คอร์ด/คลอ
      voicing:{ drop2, open, lush } },
    { role:'bass',   inst, pattern:'pedal'|'walking'|'root', register:[lo,hi], gain },
  ],
  dynamics: { accent, contour, section, cresc, rubato, humanizeVel, humanizeTime },  // LAYER 2 core (ร่วมทุก role)
  embellish, bpm, reverb, pan,            // LAYER 3/4
}
// เดี่ยว+ลูกเล่นปิด ไม่ใช่ preset — เป็น { voices, arranger:false } ตรงๆ (ต่อ B104)
// เปียโนสงบ = roles ทั้ง 3 = grand (P2 buildable). Acoustic Intimate = 3 เครื่องต่าง role (future).
```

- **role-based** สำคัญ: ทำให้ preset ขยายจาก "2 เครื่อง (mel+chord)" → "3+ เครื่องต่อ role" (ทำนอง/คลอ/เบสคนละเครื่อง) โดย scheduler วน `roles[]` เรียก instrument module ของแต่ละตัว → **ไม่ hardcode เปียโน** · เพิ่ม role/เครื่อง = แก้ recipe ไม่แตะแกน.
- **register ต่อ role** = ที่ orchestration ใช้กันเสียงนัว (แบ่งย่าน) — scheduler/voicing บีบแต่ละ role ให้อยู่ในย่านของมัน.

### 6d. โหมด "จัดเต็ม (อัตโนมัติ)" = auto-instrumentation (★ future rule layer · design-for now)

**วิสัยทัศน์ P'Aim:** ผู้ใช้ไม่ต้องเลือกอารมณ์เองก็ได้ — เลือก **"จัดเต็ม (อัตโนมัติ)"** แล้ว **ระบบดูลักษณะเพลงแล้วเลือก orchestration ที่เพราะสุดให้เอง**.
- **rule layer แยก (เสียบทีหลัง · ไม่แตะแกน):** `recommendRecipe(songFeatures) → preset`
  - `songFeatures(content)` = detector อ่าน **tempo (bpm) · meter (timeSignature) · อารมณ์คร่าว ๆ (major/minor · ช่วงเสียง) · โครง section (จำนวน/ความยาว)**.
  - mapping เลือก "อารมณ์": ช้า/ใคร่ครวญ/ไมเนอร์ → **Acoustic Intimate / เปียโนสงบ + pedal** · เร็ว/สดใส/เมเจอร์ → **Modern Worship (guitar strum + walking bass)** · 3/4 สง่า → **Classical Elegance**.

**★ กฎ tempo → pattern (ที่ปรึกษา P'Aim · สวนสัญชาตญาณแต่ถูก):** ในโหมดวงรวม (และ auto) เลือก pattern คลอตามความเร็ว —
- **เพลงช้า → Arpeggio** (ไล่เสียงพลิ้ว · เติมช่องว่างให้หวาน โปร่ง — เพราะช้าถ้าค้างเฉย ๆ จะโหวง)
- **เพลงเร็ว → คลอค้าง (sustain) / ย่ำ (oom-pah)** (ไม่ให้โน้ตดีดรัวจนรกหู — เร็วต้อง "นิ่ง" ถึงสะอาด)
- threshold เริ่ม ~ 92 bpm (จูนกับ P'Aim) · เป็นกฎเดียวใช้ได้ทุก instrument module (เปียโน arp/sustain · กีตาร์ fingerpick/strum · สาย pad).

- **design-for now, build later:** P2 นิยาม **interface `recommendRecipe()` + `songFeatures()`** ไว้ (return preset id) · P2 implement เวอร์ชันง่าย (bpm threshold → เปียโน arp vs sustain ตามกฎบน) · เวอร์ชันเต็ม (เลือกข้าม orchestration ทั้งหมด) = future. **แกน arranger/preset ไม่ต้องรื้อ** เพราะ auto = "ตัวเลือก preset อัตโนมัติ" หัวทาง ไม่ใช่ pipeline ใหม่.

**UI:** ดู §6a (2 แกน + สวิตช์ลูกเล่น) — "วงรวม/นำวง" = แกน 1 ค่า ensemble ที่ auto-เลือก recipe ตาม tempo/mood.

### 6c. "ลูกเล่นปิด" = ตรวจโน้ต — first-class (พี่เป้า ผ่าน P'Aim) — ข้อกำหนดบังคับ
สถานะ "ลูกเล่นปิด" ครอบ 3 เคส (§6a): **ทำนองล้วน · คอร์ดล้วน · ทำนอง+คอร์ด(เดี่ยว)+สวิตช์ปิด** — ทั้งหมด = โน้ตตรงแผ่น:
- **arranger OFF สนิท:** ทำนอง = โน้ตตามพิมพ์เป๊ะ · gain คงที่ · **ไม่มี** humanize/dynamics/embellish/pattern/rubato/pan/reverb.
- **คอร์ด:** block ค้างตาม pitch-class ที่แผ่นสั่ง (voice-leading เลือกอ็อกเทฟให้ไม่ทับทำนองได้ **แต่ไม่มีลูกเล่นอื่น**).
- **UI:** default หน้าแก้ไข = ทำนอง+คอร์ด · ลูกเล่นปิด · **ห้ามบังคับเปิดลูกเล่น** — สถานะ "ปิด" ต้องคงเป็นตัวเลือกเสมอ (สวิตช์/โหมดล้วน).
- **invariant test บังคับ:** `arrange(notes, chordEvents, {arranger:false, voices:'both'})` → melody perfEvents มี `midi/startBeat/beats` = โน้ตพิมพ์ทุกตัว · `timeShift===0` ทุก event · ไม่มี event `role:'emb'` · gain melody คงที่. = พิสูจน์ "ตรวจโน้ตไม่ถูกแตะ".

---

## 7. Acceptance Criteria รวม (dev ทำตามได้ · tester วัดได้)

### 7a. โครงสร้าง (สถาปัตย์)
- [ ] `arrange(notes, chordEvents, cfg, meta)` เป็น **pure function** คืน `PerfEvent[]` — เรียกซ้ำด้วย input+seed เดิม = ผลเดิม (headless, ไม่มี AudioContext).
- [ ] แต่ละ rule = 1 export แยก, รับ+คืน event list → เปิด/ปิดต่อ rule ได้ตาม cfg (โมดูล).
- [ ] `playSong` และ `renderSongToBuffer` **consume `PerfEvent[]` ตัวเดียวกัน** (arranger เดียว → live = MP3).
- [ ] เพิ่มเครื่องดนตรี (sample ล้วน) = แก้ `sampler.js` registry เท่านั้น.
- [ ] **instrument module (§4B):** แกน arranger เรียก voicing/pattern ผ่าน interface โมดูล — เพิ่มเครื่อง idiomatic (กีตาร์) = เขียนโมดูล 1 ตัว ไม่แตะแกน core/PerfEvent/scheduler/presets. (มี test: เปียโน = โมดูล keyboard, ผลเท่าเดิม; guitar module เสียบได้.)

### 7b. invariant tests ต่อ rule (headless · vitest) — **ต้องดักของจริง ไม่ใช่แค่ math** (บทเรียน P1)
- [ ] **velocity-in-layer (บังคับ):** ทุก `PerfEvent.gain` หลัง dynamics → `gainToVelocity(gain) ∈ GRAND_LAYER` สำหรับทุก sampled instrument. (นี่คือ invariant ที่ P1 ไม่มี → เปียโนเงียบ.)
- [ ] humanize timing: onset spread ∈ [−σ, σ] · deterministic ต่อ seed · ไม่มี attack สลับลำดับ · chord spread < melody spread.
- [ ] humanize vel: หลัง clamp ค่าอยู่ในช่วง · downbeat > off-beat (accent) · โน้ตยอด > ข้างเคียง (contour).
- [ ] drop2/open: pitch-classes เท่าเดิม · กว้างขึ้น · ไม่ต่ำกว่า bass · ไม่ทับหน้าต่างทำนอง.
- [ ] walking bass: n เบส = n บีต · ทุกโน้ตในย่านเบส · ท้าย−รากถัดไป ≤ 2 · ในสเกล (ยกเว้น approach).
- [ ] pedal: sustain-root 1 เบส/คอร์ด · tonic-pedal ปล่อยเฉพาะ tonic ปลอดภัย.
- [ ] tensions: default = 0 โน้ตนอกคอร์ด · lush = ไม่ชน pc ทำนอง.
- [ ] embellish: ปิดได้ (0 emb) · ทุกโน้ต ∈ chord-tone/approach · โอกาสคุมด้วย seed.
- [ ] **guitar module (§4B):** ทุก voicing เล่นได้จริง (สาย ≤ 6 · ช่วงมือ ≤ ~4 เฟร็ต · ราก = สายเบสถูก · อยู่ย่าน 40–64) · strum = stagger ทิศเดียว 15–30ms (ไม่ใช่ spread สองข้าง) · ไม่ยืม wide-voicing เปียโน.
- [ ] **ลูกเล่นปิด (ตรวจโน้ต):** melody = โน้ตพิมพ์ · timeShift 0 ทุกตัว · 0 emb · gain คงที่ (§6c).
- [ ] rubato: เวลารวมไม่ดริฟต์ (Σ timeShift รอบวลี ≈ 0).

### 7c. real audio output (บทเรียน B107 — วัดเสียงจริง ทุก preset)
- [ ] **peak > 0** ทุก preset (ไม่เงียบ) — วัดผ่าน OfflineAudioContext render 1 เพลงจริง.
- [ ] **balance:** melody peak > chord peak (ทำนองนำ) · เป้า chord ~−5 ถึง −9 dB ใต้ melody.
- [ ] **ไม่ clip:** peak รวม ≤ ~0.9 (both voices).
- [ ] **humanize ได้ผลจริง:** วัด onset ของ melody attack — **ไม่ตรงกริดเป๊ะ** (มี spread) เทียบสถานะลูกเล่นปิด ที่ตรงกริด. (พิสูจน์ว่า "หายแข็ง" วัดได้ ไม่ใช่แค่ฟัง.)
- [ ] reverb: มี tail หลังโน้ตจบ (decay > 0) เมื่อ reverb≠none.
- [ ] ทุก velocity ที่ fire ∈ layer ที่โหลด (0 โน้ตเงียบ).
- [ ] **เต็มวง (§6b.1) — วัดแยก 3 role:** melody/comp/bass **peak > 0 ทั้งสาม** (ไม่มี role เงียบ · บทเรียนเปียโนเงียบ ต่อทุกเครื่อง) · **ทำนองนำ** (melody peak สูงสุด · comp ~−4dB · bass อุ้มแต่ < melody) · **ไม่ล้น/ไม่นัว** (peak รวม ≤ ~0.9 · แต่ละ role อยู่คนละย่าน register ตาม recipe) · offline render ผ่าน (MP3 P3).

### 7d. regression (ไม่พังของเดิม)
- [ ] เล่น/หยุด/resume/สลับโหมด(ทำนอง/คอร์ด/รวม)/ทรานสโพสกลางเล่น/loop ยังทำงาน.
- [ ] ลูกเล่นปิด = พฤติกรรมโน้ตตรงเท่า P1 melody-only/รวม.
- [ ] `vitest run` เขียวหมด · `npm run build` ผ่าน · smplr/arranger = lazy chunk (ไม่โตหน้าแรก).
- [ ] มือถือ: humanize/pattern ไม่ทำ CPU พุ่งจนกระตุก (วัด — schedule ล่วงหน้า ไม่คำนวณใน callback).

### 7e. หูมนุษย์ (นอกเหนือเครื่องวัด)
- [ ] **P'Aim ฟังทุก preset** → "เป็นธรรมชาติ/ไม่แข็ง/เพราะ" (SA ปั้นกับ P'Aim ตรง). = gate สุดท้ายก่อน merge.

---

## 8. ลำดับ build ภายใน (ที่ปรึกษา: Humanize เป็นฐานก่อน)

**modular = ส่งครบชุด แต่ทำ+verify ทีละ step ได้.** แต่ละ step มี invariant test + วัด audio ก่อนไป step ถัดไป.

| step | ทำ | ทำไมลำดับนี้ | verify |
|---|---|---|---|
| **0** | **Refactor seam:** `arrange()` + `PerfEvent[]` + scheduler consume · **นิยาม `InstrumentModule` interface (§4B) + โมดูล keyboard (เปียโน) wrap ของเดิม** · ลูกเล่นปิด = ผ่าน P1 behavior | สร้าง "ราง" + interface ให้ทุก rule/เครื่องเสียบ · ไม่เปลี่ยนเสียง (เท่ากับ P1) | ลูกเล่นปิด test = โน้ตตรง · เปียโน = โมดูล keyboard ผลเท่าเดิม · audio peak เท่า P1 |
| **1** | **★ Humanize (R2.4 vel + R2.5 timing)** บน sustained | ที่ปรึกษา #1 · คุ้มสุด/แรงน้อยสุด · แก้ "แข็ง" ทันที | onset spread วัดได้ · vel ยังใน layer · P'Aim ฟัง "หายหุ่นยนต์" |
| **2** | **Drop-2 / open voicing (R1.4/R1.5)** | ที่ปรึกษา #2 · เคลียร์ย่าน | pitch-class เท่าเดิม + กว้างขึ้น + audio ไม่ทับ |
| **3** | **Pedal bass (R1.7 sustain-root)** | ที่ปรึกษา #3 · depth | เบสในย่าน · audio เบสต่อเนื่อง |
| **4** | **Rubato (R2.8) + accent/contour/section (R2.2/2.3/2.6)** | ที่ปรึกษา + เติมชีวิต | ไม่ดริฟต์ · downbeat/peak เด่น |
| **5** | **Patterns: arp → roll → pad → waltz (P3.2–5)** + embellish | ตัวสร้าง "ต่างที่หูจับได้" | hit count · emb ปิดได้ · audio ต่อ pattern |
| **6** | **Walking bass (R1.8)** + alberti/fingerpick | ต้อง lookahead · เพลงจังหวะ | approach ≤2 · ในย่าน |
| **7** | **Mix: reverb (M4.5) → pan (M4.8) → multi-velocity (M4.6)** | เนื้อเสียง/มิติ | reverb tail · offline ผ่าน |
| **8** | **Presets wiring (§6):** role-based recipe + 2 preset เปียโนล้วน (สงบ/บรรเลง) + `recommendRecipe()` interface (เวอร์ชันง่าย) + editor สวิตช์ลูกเล่นปิด first-class + จำค่า | ประกอบเป็นสิ่งที่ผู้ใช้เห็น · เผื่อ recipe/auto ทีหลัง | 2 preset เปียโนโหลด+เล่นครบ · โหมดธรรมดาเลือกง่าย · recipe เพิ่มได้ไม่แตะแกน |
| **9** | **เครื่องเพิ่ม: felt · violin · cello · strings** (registry + credit) | ต้อง source sample CC | fallback synth · เครดิต CC-BY |
| **10** | **โมดูลกีตาร์ (§4B)** — voicing เฟร็ต + strum/Travis + strum-stagger feel + sample | plug-in ยืนยันว่า interface §4B ใช้ได้จริง (เครื่อง idiomatic ตัวแรก) | guitar AC (§7b) · ไม่แตะแกน core · P'Aim ฟัง |
| **P3** | **MP3 rework** — `renderSongToBuffer` ผ่าน `arrange()` + sampler บน OfflineAudioContext | เอกสารแยก | §9 |

> step 0–1 = "ฐาน" ที่ต้องมั่นก่อน (seam + humanize). ทำเสร็จ 2 step นี้แล้ว P'Aim ควรได้ยินความต่างชัด (เปียโนจริง + หายแข็ง) — เป็นจุด checkpoint ให้ฟังก่อนลุยที่เหลือ.

---

## 9. P3 hook — MP3 เสียงจริง (เชื่อมไว้ให้)

**หลัก:** `arrange()` เป็น context-agnostic (คืนข้อมูลล้วน) → **MP3 ใช้ arranger เดียวกับเล่นสด** → เสียงตรงกัน.
- `renderSongToBuffer(content, opts)` (มีอยู่) → เปลี่ยนจากเรียก `scheduleNote/buildChordVoice` ตรง ๆ → เรียก `arrange(...)` แล้ว schedule `PerfEvent[]` บน `OfflineAudioContext`.
- **spike ที่ต้องพิสูจน์ (P1 report ชี้):** sampler (smplr) render ใน `OfflineAudioContext` ได้ไหม — decode sample ต้องเสร็จก่อน render. ถ้าได้ = MP3 เสียงเปียโนจริง; ถ้าไม่ได้ = MP3 fallback synth (arranger เดียวกัน, timbre ต่าง — ยอมรับได้ชั่วคราว).
- **seed เดียวกัน (§R2.5):** MP3 กับปุ่มฟัง = seedFor(songId, pass) เดียว → humanize/embellish ออกมาเสียงเดียวกัน (ไม่ใช่สุ่มใหม่).
- reverb (`ConvolverNode`) + pan (`StereoPannerNode`) ทำงานใน OfflineAudioContext เช่นกัน → MP3 ได้มิติเท่าเสียงสด.

---

## 10. สรุปเทคนิคครบ (เทียบ catalog) — ครบทุกหมวดที่ P'Aim สั่ง "ทำทีเดียว"

| หมวด (จาก sound-techniques-summary) | เทคนิค | อยู่ที่ไหนในสเปกนี้ |
|---|---|---|
| Voicing/harmony | voice-leading · inversions · drop-2 · open · tensions · pedal · walking | §2 (R1.4–1.8) |
| Dynamics | velocity map · accent · contour · humanize(vel+time) · section · cresc · rubato | §3 (R2.1–2.8) |
| Patterns | sustained · arp · roll · pad · waltz · alberti · fingerpick + embellish | §4 |
| Mix/timbre | envelope · bus · makeup · per-role · **reverb** · multi-velocity · ensemble · pan | §5 |
| Instruments | grand · felt · violin · cello · strings · **guitar** (CC0/CC-BY · host-agnostic) | §5 |
| **Instrument modules** | core (harmony/dynamics/humanize) + idiomatic (voicing/pattern/feel ต่อเครื่อง · เผื่อกีตาร์) | §4B |
| Presets / โหมด | **UI 2 แกน: เสียง(เดี่ยว/นำวง) × เล่นอะไร + สวิตช์ลูกเล่น (If-Else §6a)** · ลูกเล่นปิด = ตรวจโน้ต first-class | §6 |
| **Curated Orchestration** | preset = role-based recipe (ทำนอง/คลอ/เบส × เครื่อง+pattern+ย่าน) · "อารมณ์" ล็อกคู่เสียงเพราะ · **auto-instrumentation (future)** | §6b·6d |
| **ขอบเขต P2 vs future** | build เปียโนก่อน · architecture เผื่อ (module/recipe/auto) ไม่ต้องรื้อ | §12 |
| Fidelity | sheet=SSOT · 3 sound modes · repeat/volta · transpose · **MP3 P3** | §1 กติกา · §9 |

**ครบทุกเทคนิคใน catalog + requirement UX จาก P'Aim** (UI 2 แกน+สวิตช์ §6 · instrument module เผื่อกีตาร์ §4B) — จัดเป็นระบบ modular ที่ build ทีละตัวได้ (§8), verify ด้วย invariant + real audio (§7), เชื่อม MP3 (§9), และ productize เป็นโหมดที่ผู้ใช้เลือกง่าย (§6) โดยคง "ธรรมดา/ตรวจโน้ต" เป็น first-class.

---

## 12. ขอบเขต P2 vs future (design-for now · build piano-first) — P'Aim + PM

**หลัก:** architecture เผื่อทุกอย่างตั้งแต่แรก (role-based recipe + instrument module + auto-instrumentation interface) **แต่ P2 สร้างเปียโนก่อน** — เพิ่มของ future ทีหลัง **ไม่ต้องรื้อ**.

| เรื่อง | **P2 (build เลย)** | **Future (design-for · เสียบทีหลัง)** |
|---|---|---|
| arranger 3 ชั้น + humanize | ✅ ครบ (§2–4) | — |
| instrument module interface (§4B) | ✅ นิยาม + โมดูล keyboard (เปียโน/felt) | โมดูล guitar (§4B.3) · bowed (violin/cello/strings) |
| orchestration recipe (role-based §6a′) | ✅ 2 preset เปียโน + **3 recipe เต็มวง (นำวง §6b.1: เปียโน/ไวโอลิน/กีตาร์นำ)** | — (auto-instrumentation ข้าม orchestration เต็ม = §6d future) |
| auto-instrumentation + tempo→pattern (§6d) | ✅ `recommendRecipe()` + กฎ tempo→pattern (ช้า=arp/เร็ว=sustain) | เลือกข้าม orchestration ทั้งหมดตาม mood/minor |
| เครื่อง/sample (5 เสียง) | ✅ **ครบ** — grand · felt(กรอง grand) · nylon · violin · cello · string-pad (self-host `public/samples/` · merge base แล้ว) | — |
| reverb · pan · multi-velocity | ✅ (§5) | — |
| MP3 เสียงจริง | 🔜 P3 (§9) | — |

**เงื่อนไขสถาปัตย์ (ยืนยัน):** เพิ่ม future ทุกตัว = (ก) เขียน instrument module 1 ตัว หรือ (ข) เพิ่ม orchestration recipe (config) หรือ (ค) เติม mapping ใน `recommendRecipe()` — **ไม่แตะ** แกน core (harmony/dynamics/humanize) · PerfEvent · scheduler · สถานะลูกเล่นปิด. = design-for ผ่าน.

---

## 11. สิ่งที่ต้องให้ P'Aim ปั้นเสียงกับ SA (ก่อน dev ลุย)

รสนิยม/เสียง = P'Aim↔SA ตรง (memory `feedback_paim_direct_sa_creative`). สถานะ (ฟังเดโม `humanize-timbre-demo.html` แล้ว):
1. ~~**ปริมาณ humanize**~~ — ✅ **เคาะแล้ว: ±12ms / ±6%** (P'Aim: "เกินคาด · อย่าเพิ่มอีก" — sweet spot).
2. ~~**default**~~ — ✅ **เคาะแล้ว: เต็มวง + ลูกเล่นเต็ม (เพราะสุดก่อน) · จำค่า localStorage · โหมดฝึก opt-in** · **tier เสียง:** Tier-1 GM ก่อน (ยังรอเคาะตอนได้ sample จริง · `cc-instrument-samples.md`)
3. **reverb โบสถ์** — church/hall แค่ไหนถึง "อยู่ในโบสถ์" ไม่ "ฟุ้งจนเบลอ"?
4. **orchestration recipe (อารมณ์)** — 3 สูตรที่ปรึกษา (Acoustic Intimate / Modern Worship / Classical Elegance) โดนใจไหม · อยากปรับคู่เครื่อง/pattern ตรงไหน? (P2 เริ่ม 2 preset เปียโน · ที่เหลือรอ sample)
5. **drop-2 vs open** ต่อ recipe — ฟังคู่ไหนเพราะกว่า.
6. **กีตาร์** — acoustic (steel) หรือ nylon (คลาสสิก)? · เด่น = strum (รูด) หรือ fingerpick (เกา)?
7. **auto-instrumentation (§6d)** — อยากให้ "จัดเต็มอัตโนมัติ" เลือกอารมณ์ตาม tempo/เมเจอร์-ไมเนอร์แบบไหน (ยืนยัน mapping ช้า→สงบ · เร็ว→เต็มวง)?

**ขั้นตอนถัดไป:** SA ทำ spike เดโม step 1 (humanize บนเปียโนจริง) ให้ P'Aim ฟัง → ปั้นค่าจนพอใจ → SA ping PM (pm11) → PM จ่าย dev implement ตาม §8 + tester (วัด real audio §7c) + P'Aim ฟังก่อน deploy. **ไม่แตะ prod src · ไม่ deploy** ในงานออกแบบนี้.
