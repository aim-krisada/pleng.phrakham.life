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

**ผู้ใช้เห็นอะไร (P'Aim เคาะ · 2 แกน):** แยก **(A) ระดับลูกเล่น 4 โหมด** — ทำนองอย่างเดียว · คอร์ดอย่างเดียว · **ทำนอง+คอร์ด ธรรมดา (ไม่มีลูกเล่น = ตรวจโน้ต พี่เป้า)** · **จัดเต็ม (arranger เต็ม + humanize · "น้อยแต่ได้มาก")** — ออกจาก **(B) เครื่องดนตรี** (เปียโน/ไวโอลิน+เปียโน/เต็มวง/กีตาร์). โหมด 1–3 ต่อยอด 3 sound modes เดิม (B104).

**เผื่อกีตาร์ตั้งแต่ออกแบบ (P'Aim สั่ง):** ลูกเล่นแต่ละเครื่องไม่เหมือนกัน → แยก **แกนกลางร่วม (harmony/humanize/dynamics = สากล) + โมดูลต่อเครื่อง (pattern/voicing/feel = เฉพาะเครื่อง)**. เปียโน = arp/block; กีตาร์ = strum/fingerpick/รูปคอร์ดเฟร็ตจริง. เพิ่มเครื่อง = plug-in โมดูล ไม่รื้อแกน (§4B).

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
  presets.js          นิยาม โหมด/flavor (§6) → cfg object
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

**ผลต่อสถาปัตย์:** เพิ่มกีตาร์/ออร์แกน/ฟลูต ภายหลัง = เขียน `InstrumentModule` 1 ตัว (voicing + patterns + feel + sample) → เสียบเข้า registry. **แกน core (harmony/dynamics/humanize-vel) + PerfEvent + scheduler + presets ไม่แตะ.** = plug-in.

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
| **Ensemble blend** | melInst ≠ chordInst · แยกย่านความถี่ (melody=เปียโน · chord=สตริง) | ใหม่ P2 |
| **Stereo spread / pan** | `StereoPannerNode`: bass กลาง · up แผ่ L/R เล็กน้อย · melody กลาง | ใหม่ P2 |

### เครื่องดนตรี (registry ใน `sampler.js`) — host-agnostic + CC0/CC-BY เท่านั้น
| เครื่อง | source | ลิขสิทธิ์ | ใช้ใน preset | หมายเหตุ |
|---|---|---|---|---|
| **grand** (Splendid Grand) | smplr / danigb (Akai) | **PD** ✓ | ทุก preset เปียโน · default | มี P1 (~2–3 MB, PP layer) |
| **felt** (soft/felt piano) | Pianobook / .sf2 CC0 | CC0 ต้องหา sample | preset สงบ/ใคร่ครวญ | **ต้อง source sample** (งานย่อย) |
| **violin** | tonejs-instruments (Iowa/Philharmonia) | **CC-BY 3.0** ✓ (เครดิต) | ไวโอลินคลอเปียโน | ~3.6 MB |
| **cello** | เดียวกัน | CC-BY 3.0 ✓ | เต็มวง (เบสสาย) | ~0.75 MB |
| **strings** (ensemble) | เดียวกัน / string_ensemble | CC-BY 3.0 ✓ | เต็มวง (pad) | แบ่งย่าน |
| **guitar** (acoustic/nylon) | หา CC0/CC-BY (FreePats / .sf2) | CC0/CC-BY ✓ (ต้อง source) | flavor กีตาร์ | **โมดูล idiomatic §4B** (voicing เฟร็ต + strum/Travis · ไม่ยืมของเปียโน) |

> เครื่องที่เป็น **โมดูล idiomatic (§4B)** — ตอนนี้ = กีตาร์ (voicing/pattern/feel ต่างจากเปียโน). เปียโน/felt = โมดูล "keyboard" ร่วม voicing/patterns เดียวกัน (ต่างแค่ sample/timbre). สตริง/ไวโอลิน/เชลโล = โมดูล "bowed" (pattern = pad/sustain/swell, ไม่มี arp/strum). เพิ่มเครื่อง = เพิ่มโมดูล 1 ตัว.

**host-agnostic:** ทุกเครื่องเพิ่มใน `SAMPLE_HOSTS` (knob เดียว). P2 ชี้ upstream CDN เพื่อ ship + วัดโหลดมือถือ → production mirror มาที่เราคุมเอง (PM เคาะ host). **CC-BY ต้องแสดงเครดิต** ในหน้า About/Guide (งานย่อย).
**AC:** เพิ่มเครื่องใหม่ = แก้ registry เท่านั้น (ไม่แตะ arranger/scheduler) · fallback synth ยังทำงานถ้าโหลด fail · reverb ต่อได้ทั้ง live + OfflineAudioContext.

---

## 6. Presets — สิ่งที่ผู้ใช้เห็น (โครง 4 โหมด · P'Aim เคาะ)

**หลัก (P'Aim 12 ก.ค.):** แยก UI เป็น **2 แกนอิสระ** ให้เข้าใจง่าย — **(แกน A) ระดับลูกเล่น** ≠ **(แกน B) เครื่องดนตรี**. ผู้ใช้ไม่เห็นปุ่มดิบ (SA curate ให้).

### 6a. แกน A — ระดับลูกเล่น (4 โหมด · ต่อยอด 3 sound modes เดิม B104)

| โหมด | = | arranger | เหมาะกับ |
|---|---|---|---|
| **1. ทำนองอย่างเดียว** | `voices:'melody'` | OFF | ฟังทำนอง/ร้องตาม |
| **2. คอร์ดอย่างเดียว** | `voices:'chords'` | OFF | ฟังคอร์ด/ฝึกคลอ |
| **3. ★ ทำนอง+คอร์ด ธรรมดา (ไม่มีลูกเล่น)** | `voices:'both'` | **OFF** (literal) | **ฝึกเล่นตามง่าย / ตรวจโน้ต — พี่เป้า** (§6c) |
| **4. ★ จัดเต็ม (ลูกเล่นครบ + humanize)** | `voices:'both'` | **ON (full)** | "น้อยแต่ได้มาก" · ฟังเพราะเหมือนคนบรรเลง |

- **1–3 = ตระกูล "ธรรมดา"** — คือ 3 sound modes เดิม (B104) ที่ arranger ปิด → โน้ตตรงพิมพ์ (voice-leading เลือกอ็อกเทฟคอร์ดได้ แต่ไม่มี dynamics/pattern/embellish/humanize). โหมด 3 = "ธรรมดา/ตรวจโน้ต" first-class (§6c).
- **4 = จัดเต็ม** — เปิด auto-arranger เต็ม 3 ชั้น (humanize + voicing + patterns + dynamics + embellish). = คันเดียว เปิด "ความเป็นคนเล่น".
- แกน A **แยกจากเครื่องดนตรี** — เลือก "จัดเต็ม" แล้วยังเลือกได้ว่าเป็นเปียโน/ไวโอลิน+เปียโน/เต็มวง/กีตาร์.

### 6b. แกน B — เครื่องดนตรี / สไตล์ (เฉพาะโหมด "จัดเต็ม" · SA curate)

โหมด "จัดเต็ม" มี **flavor สำเร็จรูป** (= instrument module + preset config รวมมา) ให้เลือก 1 อัน:

| flavor (label) | melInst | chordInst | voicing | pattern | dynamics | reverb | bpm | ทำไมเพราะ |
|---|---|---|---|---|---|---|---|---|
| **เปียโนสงบ** (default) | grand | grand | pedal(sustain-root) | sustained | humanize + rubato + section | church | 64 | *น้อยแต่มาก* · Sacred Space · เบสค้างลุ่มลึก |
| **เปียโนบรรเลง** (มือซ้ายไหล) | grand | grand | drop2 | **arp** | humanize + accent + contour | room | 72 | มือซ้ายไหลใต้ทำนอง เหมือนคนเล่นจริง |
| **ไวโอลินคลอเปียโน** | **violin** | grand | drop2 | arp | humanize + contour + rubato | church | 69 | ไวโอลินร้องทำนอง เปียโนพยุง หวาน สง่า |
| **เต็มวง** (เปียโน+สตริง) | grand | **strings** | open + lush | **pad** (swell) | humanize + section + cresc | hall | 74 | คอร์ด/ประสานชัด อุ่น เต็ม · dynamic ตามท่อน |
| **กีตาร์** (โมดูล §4B · เผื่อไว้) | **guitar** | guitar | fret-playable | **strum / travis** | humanize + accent | room | 76 | รูดคอร์ด/เกากีตาร์ · สายเปล่ากังวาน (โมดูลกีตาร์ §4B) |

> ทั้งหมดใช้ **engine เดียว** — flavor = instrument module (§4B) + config เปิด/ปิด rule. **default โหมดจัดเต็ม = เปียโนสงบ** (CCM ร่วมสมัย · P'Aim ชี้). humanize เปิดทุก flavor.

### 6a′. โครง config (ต่อ flavor)

```js
const FLAVOR = {
  id, label,
  melInst, chordInst,                    // §4B instrument module id
  voicing:  { drop2, open, pedal, walking, lush },   // LAYER 1 flags (core หรือ override โดยโมดูล)
  dynamics: { accent, contour, section, cresc, rubato, humanizeVel, humanizeTime },  // LAYER 2 (core)
  pattern,                               // LAYER 3 — ชื่อ pattern ในโมดูลของเครื่องนั้น
  embellish,                             // LAYER 3 bool
  bpm, chordGain,                        // ค่าเสียง
  reverb,                                // LAYER 4 'none'|'room'|'church'|'hall'
  pan,                                   // LAYER 4 bool
}
// โหมด 1–3 (ธรรมดา) ไม่ใช่ flavor — เป็น { voices, arranger:false } ตรงๆ (ต่อ B104)
```

**UI ที่เสนอ:** คุม 2 ชั้น — (A) เลือกโหมด: ทำนอง / คอร์ด / ธรรมดา / **จัดเต็ม** · (B) ถ้า "จัดเต็ม" → เลือก flavor (เปียโนสงบ/บรรเลง/ไวโอลิน/เต็มวง/กีตาร์). จำค่าทั้งสอง (localStorage). **default หน้าเล่นเพลง = จัดเต็ม→เปียโนสงบ · default หน้าแก้ไข = ธรรมดา (โหมด 3)**.

### 6c. โหมด 3 "ทำนอง+คอร์ด ธรรมดา / ตรวจโน้ต" — first-class (พี่เป้า ผ่าน P'Aim) — ข้อกำหนดบังคับ
- **arranger OFF สนิท:** ทำนอง = โน้ตตามพิมพ์เป๊ะ · gain คงที่ · **ไม่มี** humanize/dynamics/embellish/pattern/rubato/pan/reverb.
- **คอร์ด:** block ค้างตาม pitch-class ที่แผ่นสั่ง (voice-leading เลือกอ็อกเทฟให้ไม่ทับทำนองได้ **แต่ไม่มีลูกเล่นอื่น**). โหมด 1 (ทำนองอย่างเดียว) = ตรวจโน้ตทำนองแท้สุด.
- **UI:** เลือกง่ายในหน้าแก้ไข (เป็น default ที่นั่น) · **โหมด "จัดเต็ม" (arranger เต็ม) ห้ามบังคับใส่แทนโหมดนี้** — โหมด 1–3 ต้องคงเป็นตัวเลือกเสมอ.
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
- [ ] **โหมด 3 ธรรมดา:** melody = โน้ตพิมพ์ · timeShift 0 ทุกตัว · 0 emb · gain คงที่ (§6c).
- [ ] rubato: เวลารวมไม่ดริฟต์ (Σ timeShift รอบวลี ≈ 0).

### 7c. real audio output (บทเรียน B107 — วัดเสียงจริง ทุก preset)
- [ ] **peak > 0** ทุก preset (ไม่เงียบ) — วัดผ่าน OfflineAudioContext render 1 เพลงจริง.
- [ ] **balance:** melody peak > chord peak (ทำนองนำ) · เป้า chord ~−5 ถึง −9 dB ใต้ melody.
- [ ] **ไม่ clip:** peak รวม ≤ ~0.9 (both voices).
- [ ] **humanize ได้ผลจริง:** วัด onset ของ melody attack — **ไม่ตรงกริดเป๊ะ** (มี spread) เทียบโหมด 3 ธรรมดา ที่ตรงกริด. (พิสูจน์ว่า "หายแข็ง" วัดได้ ไม่ใช่แค่ฟัง.)
- [ ] reverb: มี tail หลังโน้ตจบ (decay > 0) เมื่อ reverb≠none.
- [ ] ทุก velocity ที่ fire ∈ layer ที่โหลด (0 โน้ตเงียบ).

### 7d. regression (ไม่พังของเดิม)
- [ ] เล่น/หยุด/resume/สลับโหมด(ทำนอง/คอร์ด/รวม)/ทรานสโพสกลางเล่น/loop ยังทำงาน.
- [ ] โหมด 1–3 ธรรมดา = พฤติกรรมโน้ตตรงเท่า P1 melody-only/รวม.
- [ ] `vitest run` เขียวหมด · `npm run build` ผ่าน · smplr/arranger = lazy chunk (ไม่โตหน้าแรก).
- [ ] มือถือ: humanize/pattern ไม่ทำ CPU พุ่งจนกระตุก (วัด — schedule ล่วงหน้า ไม่คำนวณใน callback).

### 7e. หูมนุษย์ (นอกเหนือเครื่องวัด)
- [ ] **P'Aim ฟังทุก preset** → "เป็นธรรมชาติ/ไม่แข็ง/เพราะ" (SA ปั้นกับ P'Aim ตรง). = gate สุดท้ายก่อน merge.

---

## 8. ลำดับ build ภายใน (ที่ปรึกษา: Humanize เป็นฐานก่อน)

**modular = ส่งครบชุด แต่ทำ+verify ทีละ step ได้.** แต่ละ step มี invariant test + วัด audio ก่อนไป step ถัดไป.

| step | ทำ | ทำไมลำดับนี้ | verify |
|---|---|---|---|
| **0** | **Refactor seam:** `arrange()` + `PerfEvent[]` + scheduler consume · **นิยาม `InstrumentModule` interface (§4B) + โมดูล keyboard (เปียโน) wrap ของเดิม** · โหมด 3 ธรรมดา = ผ่าน P1 behavior | สร้าง "ราง" + interface ให้ทุก rule/เครื่องเสียบ · ไม่เปลี่ยนเสียง (เท่ากับ P1) | โหมด 3 test = โน้ตตรง · เปียโน = โมดูล keyboard ผลเท่าเดิม · audio peak เท่า P1 |
| **1** | **★ Humanize (R2.4 vel + R2.5 timing)** บน sustained | ที่ปรึกษา #1 · คุ้มสุด/แรงน้อยสุด · แก้ "แข็ง" ทันที | onset spread วัดได้ · vel ยังใน layer · P'Aim ฟัง "หายหุ่นยนต์" |
| **2** | **Drop-2 / open voicing (R1.4/R1.5)** | ที่ปรึกษา #2 · เคลียร์ย่าน | pitch-class เท่าเดิม + กว้างขึ้น + audio ไม่ทับ |
| **3** | **Pedal bass (R1.7 sustain-root)** | ที่ปรึกษา #3 · depth | เบสในย่าน · audio เบสต่อเนื่อง |
| **4** | **Rubato (R2.8) + accent/contour/section (R2.2/2.3/2.6)** | ที่ปรึกษา + เติมชีวิต | ไม่ดริฟต์ · downbeat/peak เด่น |
| **5** | **Patterns: arp → roll → pad → waltz (P3.2–5)** + embellish | ตัวสร้าง "ต่างที่หูจับได้" | hit count · emb ปิดได้ · audio ต่อ pattern |
| **6** | **Walking bass (R1.8)** + alberti/fingerpick | ต้อง lookahead · เพลงจังหวะ | approach ≤2 · ในย่าน |
| **7** | **Mix: reverb (M4.5) → pan (M4.8) → multi-velocity (M4.6)** | เนื้อเสียง/มิติ | reverb tail · offline ผ่าน |
| **8** | **Presets wiring (§6)** + editor โหมด 3 ธรรมดา first-class + จำค่า | ประกอบเป็นสิ่งที่ผู้ใช้เห็น | 4 flavor จัดเต็ม โหลด+เล่นครบ · โหมดธรรมดาเลือกง่าย |
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
| Presets / โหมด | **4 โหมด (ทำนอง/คอร์ด/ธรรมดา/จัดเต็ม) แยกจากเครื่องดนตรี** · ธรรมดา = first-class · จัดเต็ม 5 flavor | §6 |
| Fidelity | sheet=SSOT · 3 sound modes · repeat/volta · transpose · **MP3 P3** | §1 กติกา · §9 |

**ครบทุกเทคนิคใน catalog + 2 requirement ใหม่จาก P'Aim** (โครง 4 โหมด §6 · instrument module เผื่อกีตาร์ §4B) — จัดเป็นระบบ modular ที่ build ทีละตัวได้ (§8), verify ด้วย invariant + real audio (§7), เชื่อม MP3 (§9), และ productize เป็นโหมดที่ผู้ใช้เลือกง่าย (§6) โดยคง "ธรรมดา/ตรวจโน้ต" เป็น first-class.

---

## 11. สิ่งที่ต้องให้ P'Aim ปั้นเสียงกับ SA (ก่อน dev ลุย)

รสนิยม/เสียง = P'Aim↔SA ตรง (memory `feedback_paim_direct_sa_creative`). จุดที่อยากให้ฟัง+เคาะ:
1. **ปริมาณ humanize** — ±10ms/±5% "กำลังดี" หรืออยากมาก/น้อยกว่า? (ฟัง step 1)
2. **default โหมดจัดเต็ม** — เปียโนสงบ ใช่ไหม? (CCM ร่วมสมัย)
3. **reverb โบสถ์** — church/hall แค่ไหนถึง "อยู่ในโบสถ์" ไม่ "ฟุ้งจนเบลอ"?
4. **flavor จัดเต็ม** — 5 อัน (เปียโนสงบ/บรรเลง/ไวโอลิน/เต็มวง/กีตาร์) พอไหม · อยากได้เครื่องอื่น (เชลโล/ฟลูต/ออร์แกน)?
5. **drop-2 vs open** ต่อ flavor — ฟังคู่ไหนเพราะกว่า.
6. **กีตาร์** — อยากได้ acoustic หรือ nylon (คลาสสิก)? · สไตล์เด่น = strum (รูด) หรือ fingerpick (เกา)? (โมดูล §4B build ทีหลังได้ · แต่ปั้น feel ล่วงหน้าได้)

**ขั้นตอนถัดไป:** SA ทำ spike เดโม step 1 (humanize บนเปียโนจริง) ให้ P'Aim ฟัง → ปั้นค่าจนพอใจ → SA ping PM (pm11) → PM จ่าย dev implement ตาม §8 + tester (วัด real audio §7c) + P'Aim ฟังก่อน deploy. **ไม่แตะ prod src · ไม่ deploy** ในงานออกแบบนี้.
