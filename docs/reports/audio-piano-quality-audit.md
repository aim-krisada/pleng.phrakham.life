# Audit — เปียโนเดี่ยว "ทำเพลงให้เพราะ" เทียบ checklist P'Aim

**สาย:** SA/audio · **branch:** `claude/blissful-rosalind-613f3e` (fork จาก `studio-shell-redesign` · verify merge-base ✓)
**วิธี audit:** อ่านโค้ด arranger ทั้งชั้น (`src/lib/arranger/*` + `midi.js` scheduler + `sampler.js` + `SongViewer.vue` wiring) แล้วเทียบทีละข้อ · **ยังไม่ได้แก้โค้ด** — รอ P'Aim เคาะก่อน (ข้อ B) · real-audio measure จะทำตอน iterate

> **F60+ (อ่าน 30 วิ):** โครง 3 ชั้นมีครบ + "ความสมจริงของมือคน" (ข้อ 2) **ล็อกครบเป๊ะ** ตามที่พี่เอมเคาะ (±6%/±12ms + เน้นบีตแรก + ไต่ขึ้นดังขึ้น). แต่ **3 ใน 4 เทคนิคยัง "มีเครื่องมือแต่ยังไม่สั่งการล่วงหน้าให้ตรงเจตนา"**:
> - **① เดินมือซ้ายอัตโนมัติตาม BPM** — ฟังก์ชันเลือกตาม BPM *เขียนไว้แล้วแต่ไม่มีใครเรียกใช้* (ผู้ใช้ต้องเลือกสไตล์เอง)
> - **③ Sparkle เบากว่าทำนอง 30%** — มี sparkle แต่ความดัง *อิงคอร์ด ไม่ได้อิงทำนอง* → ยังไม่ได้ล็อกที่ −30%
> - **④ Rubato ปลายท่อน** — มี rubato แต่ *ทริกจากโน้ตยาว ไม่ใช่ปลายท่อน* และ *แค่หน่วงจังหวะ ไม่ได้ยืดโน้ต 10–15%* ตามที่ขอ

---

## ตารางสรุป 4 เทคนิค (Feed-Forward)

| # | เทคนิค | สถานะ | หัวใจที่ขาด |
|---|---|---|---|
| 1 | Smart Left-Hand Motion (เดินคอร์ดตาม BPM) | 🟡 **มีของ ยังไม่เสียบสาย** | ฟังก์ชันเลือกตาม BPM ไม่ถูกเรียกใช้จริง |
| 2 | Pulse & Contour Invariant (มือคนจริง) | 🟢 **ครบ + ล็อกแล้ว** | — (สมบูรณ์) |
| 3 | Generative Gap-Filling / Sparkle | 🟡 **มี แต่ระดับเสียงไม่ล็อก** | sparkle อิง chord ไม่อิงทำนอง → ยังไม่ −30% |
| 4 | Structural Rubato (หน่วงปลายท่อน) | 🟡 **มีชื่อ แต่ยังไม่ตรงเจตนา** | ไม่ผูกปลายท่อน + ไม่ยืดโน้ต 10–15% |

🟢 ครบ · 🟡 มีบางส่วน/ต้องแก้ · 🔴 ยังไม่มี

---

## ① Smart Left-Hand Motion — เดินคอร์ดมือซ้ายอัตโนมัติตาม BPM

**มีอะไรแล้ว:**
- รูปแบบเดินมือซ้ายครบ: `arpeggio` (กระจายพลิ้ว), `alberti` (คลาสสิก), `sustained` (กดค้าง), `harpRoll`, `waltz`, `fingerpick` — [patterns.js](src/lib/arranger/patterns.js:22)
- **ตัวเลือกอัตโนมัติตาม BPM เขียนไว้ครบ + ตรรกะถูก:** `recommendRecipe(features)` → `bpm < 92 ? 'piano-arrangement' (arpeggio) : 'piano-calm' (sustained)` — [presets.js:73](src/lib/arranger/presets.js:73). ตรงเจตนาพี่เอมเป๊ะ (ช้า→กระจายพลิ้ว · เร็ว→กดค้างบาง)
- `songFeatures(content)` ดึง BPM/timeSignature ได้ — [presets.js:61](src/lib/arranger/presets.js:61)

**ช่องว่าง (GAP):**
- 🔴 **`recommendRecipe` / `songFeatures` ไม่ถูกเรียกใช้ที่ไหนเลยในแอปจริง** (grep เจอเฉพาะในไฟล์ test). หน้าเล่นเพลง [SongViewer.vue:62](src/components/SongViewer.vue:62) ใช้ `playStyle` ที่ **ผู้ใช้เลือกเอง** (บรรเลง/สงบ/ตรงโน้ต) แล้วแมปตายตัว — ไม่มีการดู BPM ของเพลงแล้วสลับสไตล์ให้อัตโนมัติ
- 🟡 `alberti` มี pattern แต่ **ไม่ถูกใช้ใน preset ใดเลย** (preset ใช้แค่ arpeggio/sustained) — [presets.js:24-46](src/lib/arranger/presets.js:24)

**สรุป:** เครื่องมือพร้อม 100% แต่ **"สมองที่สั่งเดินตาม BPM ล่วงหน้า" ยังไม่ต่อสายเข้าหน้าเล่นจริง** — ต้องเรียก `recommendRecipe(songFeatures(content))` เป็นค่า default เมื่อผู้ใช้ยังไม่เลือกเอง (เคาะกับ P'Aim: ให้ auto เป็น default แล้วผู้ใช้ override ได้ไหม)

---

## ② Pulse & Contour Invariant — น้ำหนัก + ชีพจรคนเล่นจริง 🟢

**ครบทุกข้อ + ล็อกเปิดเสมอ:**
- ✅ **Humanize Velocity ±6%** — `humanizeVel(events, rng, 0.06)` [dynamics.js:15](src/lib/arranger/dynamics.js:15) · ค่า lock ที่ module [keyboard.js:32](src/lib/arranger/instruments/keyboard.js:32) `velJitter: 0.06`
- ✅ **Micro-timing ±12ms** — `humanizeTime(events, rng, 0.012)` [dynamics.js:33](src/lib/arranger/dynamics.js:33) · lock [keyboard.js:32](src/lib/arranger/instruments/keyboard.js:32) `sigma: 0.012` · คอร์ดกระจายแคบกว่าทำนอง (`CHORD_TIME_RATIO 0.35`) = ยังได้ยินเป็นคอร์ดเดียว
- ✅ **เน้นบีตแรกของห้อง** — `metricAccent` [dynamics.js:46](src/lib/arranger/dynamics.js:46): บีต1 ×1.0 · กลางห้อง ×0.9 · บีตอ่อน ×0.8 · off-beat ×0.72
- ✅ **ไต่ทำนองขึ้น = ดังขึ้น + ปลายวรรคผ่อน** — `melodicContour` [dynamics.js:63](src/lib/arranger/dynamics.js:63): ขึ้น +6% · ยอด local +6% · โน้ตยาว(≥3บีต) −6%
- ✅ **ล็อกเป็น invariant จริง:** humanizeVel/Time ถูกเรียก **ทุกครั้งที่ arranger เปิด ไม่มีสวิตช์ปิด** — [index.js:137](src/lib/arranger/index.js:137) · accent/contour เปิด default (ปิดได้เฉพาะตั้งใจ `dyn.accent:false`) และ preset ตั้ง true ทั้งคู่ — [presets.js:26](src/lib/arranger/presets.js:26)
- ✅ **guard velocity-in-layer** — หลังคูณทุกอย่างแล้ว `clampGainToLayer` กันโน้ตเงียบ (บทเรียน P1) [dynamics.js:18](src/lib/arranger/dynamics.js:18) + `clampAll` [index.js:139](src/lib/arranger/index.js:139)

**สรุป:** หมวดนี้ **ไม่มี gap** — พร้อมใช้ · เหลือแค่ P'Aim ฟังยืนยันว่าค่ารู้สึก "พอดี" ตอน iterate (ตัวเลขปรับสดผ่าน `window.__peaks()`/cfg ได้)

---

## ③ Generative Gap-Filling — หยอดลูกเล่นในช่องว่าง (Sparkle)

**มีอะไรแล้ว:**
- ✅ **Sparkle** (ประกายอ็อกเทฟสูง) — [embellish.js:16](src/lib/arranger/embellish.js:16): โอกาส ~16%, เพดาน MIDI 86 (ไม่แหลมเกิน)
- ✅ **gapFill** (เติมโน้ตในช่องคอร์ดยาว ≥3บีต) — [embellish.js:31](src/lib/arranger/embellish.js:31): โอกาส ~33%
- ✅ สุ่มแบบคุมได้ (seeded rng) → 2 รอบเล่นต่างกันจริงแต่ซ้ำผลได้ · เปิดในโหมดบรรเลง `embellish: ['sparkle','gapFill']` [presets.js:44](src/lib/arranger/presets.js:44) (โหมดสงบปิด)

**ช่องว่าง (GAP):**
- 🟡 **ยังไม่ได้ล็อก "เบากว่าทำนองหลัก 30% เสมอ"** ตามที่พี่เอมสั่ง. ตอนนี้ความดัง sparkle = `chordGain(0.055) × 0.8 ≈ 0.044` — **อิงระดับคอร์ด ไม่ได้อิงระดับทำนอง** (ทำนอง = 0.35) — [embellish.js:21](src/lib/arranger/embellish.js:21). ผลคือ sparkle **เบากว่าทำนองราว 87% ไม่ใช่ 30%** → อาจจมหายจนแทบไม่ได้ยิน
- ต้องเพิ่มกฎ: sparkle/gapFill gain = **0.7 × ระดับทำนอง** (สัมพัทธ์กับ melody 0.35 ไม่ใช่ chord) เพื่อให้ "หยอดพลิ้ว ๆ ได้ยินจริง แต่ไม่แย่งซีน" ตามเจตนา

**สรุป:** กลไกหยอดมีครบ + ปลอดภัย (chord-tone เท่านั้น) แต่ **สูตรความดังยังไม่ตรงตัวเลขที่พี่เอมล็อก (−30% เทียบทำนอง)** → เคาะ: จะยึด −30% เทียบทำนองใช่ไหม (ข้อ B)

---

## ④ Structural Rubato — หน่วงจังหวะดึงอารมณ์ปลายท่อน

**มีอะไรแล้ว:**
- ✅ มีฟังก์ชัน `rubato` เปิดใน preset ทั้งคู่ (`dynamics.rubato: true`) — [dynamics.js:107](src/lib/arranger/dynamics.js:107)
- ✅ ออกแบบ push-pull (หน่วงแล้วคืน) กันเวลาเพลงดริฟต์สะสม (Σ timeShift = 0)

**ช่องว่าง (GAP) — 2 จุด ยังไม่ตรงเจตนา:**
- 🟡 **ทริกผิดที่:** ปัจจุบันหน่วงที่ **โน้ตยาว (beats ≥ 3) ทุกที่ในเพลง** — [dynamics.js:110](src/lib/arranger/dynamics.js:110) · ไม่ใช่ "ห้องสุดท้ายก่อนเปลี่ยนท่อน / ท่อนจบ" ตามที่พี่เอมขอ. `rubato()` **ไม่รับข้อมูล section เลย** — [index.js:136](src/lib/arranger/index.js:136) เรียก `rubato(events)` ไม่ส่ง `meta.sections` เข้าไป (ทั้งที่ arranger รู้ขอบท่อนอยู่แล้ว ใช้ใน `sectionDynamics`)
- 🟡 **กลไกไม่ตรง:** ปัจจุบัน **แค่หน่วง onset ~30ms** ไม่ได้ **ยืดความยาวโน้ต 10–15%** (`beats *= 1.10–1.15`) ตามที่พี่เอมสั่ง (สเปก DS §R2.8 เองก็เขียนให้ยืด beats แต่โค้ดจริงยังไม่ทำ — ทำแค่ push-pull เวลา)

**สรุป:** มีโครง rubato แต่ยัง **(ก) ไม่ผูกกับปลายท่อนจริง (ข) ไม่ยืดโน้ตออก** → ต้อง iterate. **ต้องเคาะ approach ก่อนทำ (ข้อ B):** การยืด duration จริงจะเลื่อน startBeat ของทั้งเพลง (cumulative drift) — DS เตือนไว้ — ต้องออกแบบให้ยืดเฉพาะปลายท่อนแล้ว "คืนเวลา" ที่ต้นท่อนถัดไป (localized ไม่สะสม)

---

## เพิ่มเติม (checklist A เดิม ที่ไม่อยู่ใน 4 เทคนิคหลัก)

| ข้อ | สถานะ | หมายเหตุ (ไฟล์:บรรทัด) |
|---|---|---|
| **Pedal Bass** (เบสมือซ้ายลากยาวโอบอุ้ม) | 🟢 มี · 🟡 เปิดเฉพาะโหมดสงบ | `pedal` mode [bass.js:32](src/lib/arranger/bass.js:32) · เปิดใน `piano-calm` (`bass:'pedal'`) แต่ `piano-arrangement` ใช้ `bass:'root'` [presets.js:39](src/lib/arranger/presets.js:39) → เคาะ: โหมดบรรเลงควรใช้ pedal ด้วยไหม |
| **Felt Piano low-pass ~1.5kHz** | 🟡 มีกลไก · ค่าไม่ตรง · ยังปิดใช้ | lpf wiring [sampler.js:161](src/lib/sampler.js:161) แต่ cutoff = **2000Hz ไม่ใช่ 1.5kHz** [sampler.js:46](src/lib/sampler.js:46) · แถม felt ยัง **disabled ใน UI** [soundOptions.js:26](src/lib/soundOptions.js:26) |
| **ปุ่มเปิด-ปิดลูกเล่นตามโหมด** | 🟢 ครบ | `plain` → `arranger:false` (ตรงโน้ตทื่อ · ปิดลูกเล่น) · `calm`/`arrangement` → เปิด — [SongViewer.vue:62](src/components/SongViewer.vue:62) + STYLE_OPTS [soundOptions.js:32](src/lib/soundOptions.js:32) · เมื่อปิด: ไม่มี humanize/embellish/dynamics เลย (โน้ตตรงเป๊ะ) — [index.js:96-140](src/lib/arranger/index.js:96) |

---

## ข้อ B (ไอเดียใหม่) — สถานะ + รอ P'Aim เคาะก่อนทำ

| ไอเดีย | มีในโค้ดแล้ว? |
|---|---|
| Generative embellishment (sparkle/gap-fill) | ✅ มี (ดูข้อ ③ · เหลือจูนระดับเสียง −30%) |
| Added Tension (add9/maj7 อัตโนมัติ) | 🔴 ยังไม่มี — DS §R1.6 ออกแบบ flag `lush` ไว้ แต่ **ยังไม่ implement** ใน voicing.js (มีแค่ drop2/open) |
| Rubato "ลมหายใจ" ปลายท่อน | 🟡 มีโครง แต่ยังไม่ตรง (ดูข้อ ④) |

---

## ข้อเสนอลำดับทำ (รอ P'Aim เคาะ)

เรียงตาม "คุ้มสุด/เจ็บน้อยสุดก่อน":
1. **①-fix เสียบสาย BPM→pattern** (เล็ก · เรียก `recommendRecipe` เป็น default) — ได้ผลทันทีทุกเพลง
2. **③-fix ล็อก sparkle/gap −30% เทียบทำนอง** (เล็ก · แก้ฐาน gain ใน embellish.js) — เคาะตัวเลขก่อน
3. **④ rubato ปลายท่อนจริง** (กลาง · ต้องผูก section + ยืด duration แบบ localized) — เคาะ approach ก่อน (drift)
4. **Felt 1.5kHz + เปิดใช้** / **pedal ในโหมดบรรเลง** / **add9 lush** — ตามที่พี่เอมอยากได้เพิ่ม

**วัดผลทุกก้าว:** OfflineAudioContext/AnalyserNode peak ต่อ role + พี่เอมฟังบนมือถือจริง (จะเปิด server `--host` + ส่ง Network URL) — ไม่เชื่อ "fire ไม่ error"

---

## ✅ IMPLEMENTED (branch `claude/blissful-rosalind-613f3e` · P'Aim เคาะ "ทำเลย ให้จบ" · Grand-only focus)

ทำ **ด่าน 1 + ด่าน 2 ครบ** · verify แล้ว (unit + real-audio AnalyserNode) · **ยังไม่ merge/deploy — รอ P'Aim ฟัง**

| เทคนิค | ทำแล้ว | ไฟล์:บรรทัด |
|---|---|---|
| ① BPM-auto style | เปิดเพลงครั้งแรก auto เลือก บรรเลง(<92)/สงบ(≥92) ตาม BPM + ไฮไลต์ปุ่มให้ตรง · กดเองทับได้ (styleAuto) | [store.js](../../src/store.js) · [SongViewer.vue](../../src/components/SongViewer.vue) (effectiveStyle) |
| ② Pulse & Contour | มีอยู่แล้ว (คงเดิม) | dynamics.js |
| ③ Sparkle −30% + slider | gain ผูกทำนอง `MEL_BASE(0.35)×level` (default 0.7 = −30%, เดิม −87%) · สไลเดอร์สด 30–90% โผล่เฉพาะ "บรรเลง" | [embellish.js:17](../../src/lib/arranger/embellish.js) · [SoundControl.vue](../../src/components/SoundControl.vue) · [SingTransport.vue](../../src/components/SingTransport.vue) |
| ④ Structural Rubato | ยืดโน้ตปลายท่อน `beats×1.12` + หายใจเข้าท่อนใหม่ +60ms · grid ไม่ดริฟต์ · ใช้ section จริง (`sectionBeatRanges` เสียบเข้า solo path) | [dynamics.js](../../src/lib/arranger/dynamics.js) (rubato) · [midi.js](../../src/lib/midi.js) |
| ของแถม Pedal Bass | โหมดบรรเลง bass root→pedal (เบสอุ้มลากยาว ลุ่มลึก) | [presets.js](../../src/lib/arranger/presets.js) |

**Verify:** 140+ unit tests เขียว (arranger 48 + midi/viewer/export 92) · pure-logic (sparkle 30%-under / BPM<92→arpeggio / rubato stretch 1.12+grid untouched / pedal set) · browser real-audio: บรรเลง peak 0.334 · สงบ+rubato peak 0.247 · ไม่มี console error · สไลเดอร์โผล่เฉพาะบรรเลง (70% default)

**+ เทคนิคที่ 5 (P'Aim ขอเพิ่ม): ท่อนรับแตกคอร์ด** — refrain เล่น `arpeggioDense` (2 hits/beat) ถี่กว่าท่อนร้อง · จับท่อนรับจากป้าย "รับ"/`***` (`sectionBeatRanges.isRefrain`) · เฉพาะบรรเลง · [patterns.js](../../src/lib/arranger/patterns.js) `arpeggioDense` + [index.js](../../src/lib/arranger/index.js) `inRefrain`. **Tester gate 🟢 PASS ทุก AC** (`docs/reports/tester-audio-piano-qa.md` · 569 tests · real-audio ทุกโหมด audible · ท่อนรับ 1.93× ถี่จริง) · **P'Aim ฟัง + เคาะ "deploy ชุดนี้ก่อน" (14 ก.ค.)** → รอบนี้จบ · PM คุม merge (sync fork → FF) + deploy

---

## 📋 ROUND 2 BACKLOG — "แพ็กเกจร่างทอง" (P'Aim 14 ก.ค. · ทำหลัง deploy รอบนี้)

P'Aim เลือก **deploy ชุดรอบ 1 ก่อน → ทำรอบ 2 ทีละขั้น**. ลำดับที่ SA เสนอ (สมองคุมก่อน → เทคนิคปลอดภัย → harmony เสี่ยงทีหลัง):

**กลุ่ม A — "สมองเลือกเทคนิค" (Context & Intensity · ทำก่อน = หัวใจ):**
1. **Section-Based Intelligence** — verse เรียบ (เบสอุ้ม+passing) · chorus เปิด (arpeggio+sparkle · มีแล้วบางส่วน) · outro (rubato+sus). ต่อยอด `sectionBeatRanges` (มี isRefrain/level) + เพิ่ม detect outro (ท่อนสุดท้าย). map เทคนิค→บทบาทท่อน.
2. **Density Control (ไม่รก)** — วัดความหนาแน่นทำนอง (มี `melStats`/BPM hook) → ทำนองถี่/เร็ว = ลด embellish+arp · ช้ามีช่องว่าง = เพิ่ม. รวม tempo + time-signature เข้าเกณฑ์ (P'Aim ย้ำ).
3. **Variability** — สุ่มสไตล์ต่อ "การกดเล่น" ไม่ใช่แค่ pass (มี seeded rng ต่อ songId/pass แล้ว). ⚠️ **caveat: ขัด MP3 determinism (P3)** — live=สุ่ม, MP3=ล็อก seed · ต้องแยกตอนทำ P3.

**กลุ่ม B — เทคนิคปลอดภัย/เกือบมีของ:**
4. **Passing bass + inversion** — `walking` mode **มีแล้ว** (bass.js) แค่เปิดใช้+จูน. **Slash chord (G/B) = ใหม่** (เลือก bass note เชื่อมขั้น) — แตะการเรียงเสียง ต้อง guard voice-leading + test เยอะ.
5. **Left/Right balance** — ยกมือซ้าย (คอร์ด/เบส) ให้ balance ดีขึ้น. ⚠️ **caveat (SA ค้าน): "เบากว่า 15-20%" ตายตัวจะกลบทำนอง** (คอร์ด=stack หลายโน้ต · ทำนอง=โน้ตเดียว · ปัจจุบัน melody vel 67 vs chord 41). **ทำเป็นปุ่มหมุน "สมดุลซ้าย-ขวา" จูนด้วยหูเหมือน Sparkle — อย่าล็อก 15-20%**.

**กลุ่ม C — แตะ harmony เสี่ยงสุด (ทำท้าย · guard เยอะ):**
6. **Suspension (Sus4/Sus2)** — จบประโยคก่อนคอร์ดหลัก หยอด sus → resolve. เปลี่ยนโน้ตในคอร์ด → **guard: sus เฉพาะเมื่อทำนองจังหวะนั้นไม่ใช่ 3rd/ตัวที่ชน** (สืบ golden rule แผ่น=SSOT). opt-in embellishment.

**หลักที่ P'Aim ย้ำ:** ระบบต้อง "รู้จักกาลเทศะ" — วิเคราะห์ tempo + time-signature + โครงท่อน + density ก่อนเลือกใส่เทคนิค · ไม่ใส่ทุกอย่างทุกเพลง.

**กลุ่ม D — UX/UI (P'Aim 14 ก.ค. · ทำจริง ไม่ใช่แค่ dev tool):**
7. **เมนูเลือกเทคนิคละเอียด** — ทุกเทคนิค: **ใช้/ไม่ใช้ (toggle) + เยอะ/น้อย (intensity)** · คอมพ์ตั้ง default ให้ก่อน · **มีคำอธิบายสั้นต่อเทคนิค** (ให้ผู้ใช้ที่ไม่รู้ดนตรีเลือกเองได้ + เรียนรู้). แยก 2 ชั้น: ผู้ใช้ทั่วไปเห็น preset ง่าย / "ปรับละเอียด" ซ่อนไว้กางทุกเทคนิค. **จุดประโยชน์: ให้ P'Aim ชี้ชัดว่าเสียงไหนคืออะไร** (เช่น "เดินทำนองไปเรื่อย ๆ" = arpeggio ไม่ใช่ sparkle).
8. **ปุ่ม Remix** — สุ่มสูตรใหม่ (เปลี่ยน seed) + **ล็อกสูตรที่ชอบ → download MP3 ตรงกับที่ฟัง** (แก้ปัญหา MP3 + แทน auto-variability ข้อ 3). **ต้องมี UX/UI designer ออกแบบให้ดูดี มาตรฐานสากล ใช้ง่าย** (P'Aim สั่ง).
9. **แสดงเวลาปัจจุบัน/รวม** — ตอนนี้มีแถบ progress + เวลารวม (`.st-time` "1:20") แต่ไม่มีวินาทีปัจจุบัน → เพิ่ม `0:12 / 1:20` + แตะแถบ seek ไปวินาทีที่ต้องการ. ช่วยทั้ง feedback loop (อ้างอิงเวลาบอกจุดที่ชอบ/ไม่ชอบ) + ผู้ใช้รู้ตำแหน่งเพลง.

**⚠️ เสียงปัจจุบัน (ก่อน deploy รอบ 1) — P'Aim feedback 14 ก.ค.:** (ก) เปียโน "กระแทก" หนักไป → จูนให้นุ่ม (ลดการเน้นบีตแรก + ระดับเสียงที่ตั้งไว้สู้วง) (ข) "เดินทำนองตึ้งตึ่ง" = arpeggio (ยืนยันแล้วว่าไม่ใช่ sparkle — ปรับสไลเดอร์ไม่เปลี่ยน).
