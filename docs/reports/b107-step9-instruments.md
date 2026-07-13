# B107 step 9 — เสียบ 5 เครื่องดนตรี (เล่นเดี่ยว) + เปิด UI + PWA offline

**สาย:** dev · **branch:** `b107-step9-instruments` (off `studio-shell-redesign`) · **อย่า merge/deploy** (PM ทำ)
**brief:** `docs/pm/brief-b107-step9-dev.md` · **SSOT:** `docs/reports/cc-instrument-samples.md` · `docs/ds/instrument-arranger-p2.md` §4B/§5/§6 · `public/samples/manifest.json`

## สรุป (F60+)

เสียบเสียงจริง **5 เครื่องเล่นเดี่ยว** (เปียโน Grand · Felt · กีตาร์ Nylon · ไวโอลิน · เชลโล) + steel/string เป็นเครื่องคลอเผื่อเต็มวง — **self-host ทุกชิ้นจาก `/samples/` (same-origin · ไม่มี CDN)** ผ่าน smplr เดิม (ไม่มี dependency ใหม่). เปิดปุ่มแกน "เครื่องดนตรี" ให้เลือกเล่นเดี่ยวได้จริง (เอา "เร็ว ๆ นี้" ออก 5 เครื่อง · จำค่า localStorage). เพิ่ม **instrument module ต่อเครื่อง** (keyboard/bowed/plucked · §4B) ให้เสียงบรรเลงเข้ากับเครื่อง (ไวโอลิน/เชลโล = double-stop ลากยาว · กีตาร์ = เกา arp). เพิ่ม **PWA service worker** precache เสียง+แอปทั้งชุด → เล่นได้ตอนออฟไลน์. **"เต็มวง" ยังไม่ทำ** (SA ออกแบบเสียงอยู่) แต่ interface เผื่อ role-based ไว้แล้ว.

**Verify:** vitest **513 เขียว** (+ 9 sampler + 44 arranger invariant · 1 pre-existing `notationLint.mjs` process.exit quirk ไม่เกี่ยว) · build ผ่าน · smplr ยัง lazy chunk · **real audio ทุกเครื่อง peak>0 ไม่ clip · RMS level-match กับ Grand** · **offline: samples ทุกเครื่อง decode ได้ตอน server ตาย · external req = 0**.

---

## ไฟล์ที่แก้

| ไฟล์ | ทำอะไร |
|---|---|
| `src/lib/sampler.js` | **หัวใจ** — `SAMPLE_HOSTS` → same-origin `/samples/` (ย้าย Grand จาก CDN มา self-host ด้วย) · `REGISTRY` 7 เครื่อง (grand/felt/nylon/cello/violin/steel/string) · `createInstrument()` แยก loader: grand=SplendidGrandPiano · felt=grand+BiquadFilter lowpass 2kHz · steel/string=Soundfont(FluidR3_GM) · nylon/cello/violin=Sampler(CC0 preset) · per-instrument `velMap` + `makeup` gain · `gainToVelocityFull()` (สำหรับเครื่องไม่มี layer) · `isSampledInstrument` ครอบทุกเครื่อง · `SAMPLED_INSTRUMENTS` |
| `src/lib/arranger/instruments/bowed.js` | **ใหม่** — โมดูล violin/cello/string · voicing ลดเหลือ **double-stop (≤2 เสียง)** (§4B guard) · pattern เฉพาะ sustained/stringPad/harpRoll (ไม่มี arp) · feel ลากยาว attack ช้า |
| `src/lib/arranger/instruments/plucked.js` | **ใหม่** — โมดูล nylon · default `arpeggio` + `fingerpick` · register กีตาร์ · feel เกา |
| `src/lib/arranger/instruments/index.js` | **ใหม่** — `moduleForInstrument(id)` → keyboard/bowed/plucked (default keyboard) |
| `src/lib/midi.js` | `playSong` เลือก module จาก instrument (`moduleForInstrument`) แล้วส่งเข้า `arrange()` — solo ไวโอลิน = bowed, nylon = plucked, เปียโน = keyboard เดิม |
| `src/store.js` | `READY_INSTRUMENTS = [grand,felt,nylon,violin,cello]` (จากเดิมมีแต่ grand) |
| `src/components/SongViewer.vue` | เปิด 5 เครื่องใน picker (ลบ `disabled`+"เร็ว ๆ นี้") · playback ใช้ `leadInstrument.value` (จากเดิม hardcode 'grand') · watcher เปลี่ยนเครื่องกลางเพลง = reschedule · pill โหลดใช้ชื่อเครื่องที่เลือก |
| `public/sw.js` | **ใหม่** — service worker: install precache samples (จาก `manifest.precache`) + app shell + built assets (จาก `asset-manifest.json`) · fetch: `/samples/` cache-first · navigation network-first→cache · assets stale-while-revalidate |
| `src/main.js` | ลงทะเบียน SW (**PROD เท่านั้น** — กัน SW ชน Vite dev HMR) |
| `vite.config.js` | plugin `assetManifest()` → เขียน `dist/asset-manifest.json` (list built assets ให้ SW precache → offline cold-boot ได้) |
| `src/lib/sampler.test.js`, `src/lib/arranger/arranger.test.js` | เพิ่ม invariant: gainToVelocityFull monotonic+legal · registry ครบ · bowed double-stop · module resolver · melody=โน้ตพิมพ์ทุกเครื่อง |

---

## Verify — วัดจริง (audio gate · บทเรียน B107)

### 1. Real audio ต่อเครื่อง (OfflineAudioContext · ผ่าน `sampler.js` จริง)
วัดใน browser: `loadInstrument(name, offlineCtx)` → fire ทำนอง arp (gain 0.35) + คอร์ดค้าง (gain 0.055–0.08) → render 3 วิ → peak/rms:

| เครื่อง | peak | rms | หมายเหตุ |
|---|---|---|---|
| grand | 0.48 | 0.048 | ฐานอ้างอิง (เท่า P1) |
| felt | 0.50 | 0.049 | grand + lowpass 2kHz |
| nylon | 0.59 | 0.046 | pluck transient สูง แต่ rms ตรง |
| violin | 0.35 | 0.054 | |
| cello | 0.27 | 0.047 | |
| steel | 0.47 | 0.041 | เครื่องคลอ |
| string | 0.30 | 0.045 | เครื่องคลอ |

→ **ทุกเครื่อง peak > 0 (ไม่เงียบ) · ทุกเครื่อง ≤ 0.9 (ไม่ clip) · RMS 0.041–0.054 = level-match กับ Grand** (จูน `makeup` ต่อเครื่อง: violin 1.2→0.8, nylon 1.2→1.4, steel 1.5→1.3 หลังวัดรอบแรกที่ violin ดังเกิน/nylon เบาไป).
**velocity-in-layer** (grand/felt): unit test `gainToVelocity(FIRED_GAINS) ∈ [41,67]` เขียว. **balance melody>chord:** velMap monotonic (unit test).

### 2. Arranger module integration (ผ่าน `arrange()` pipeline จริง)
`arrange(notes, chords, {module})` ต่อเครื่อง → ทำนอง = โน้ตพิมพ์ทุกเครื่อง (golden rule) · **bowed (violin/cello) maxInnerStack = 2** (double-stop จริง · ไม่ส่ง block 4 เสียง) · keyboard/plucked ใช้ pattern ของตัว. (unit test + วัดใน browser ยืนยันตรงกัน)

### 3. Offline / PWA (build จริง · `vite preview`)
- SW register + active + control ✅ · caches: `pleng-samples-v1` = **116 entries** (115 precache URL + manifest) · `pleng-app-v1` = shell + **built assets ครบ** (entry + css + audioExport + smplr chunk)
- **external requests = 0** — network log ทั้งหมด same-origin `/samples/...` (ไม่มี gleitz/smpldsnds CDN) ✅
- **ทดสอบ offline จริง (kill server ให้ connection ตาย):** `serverDead=true` แล้ว → manifest + **เสียงทุกเครื่อง (grand/felt/nylon/violin/cello + steel/string) fetch + `decodeAudioData` สำเร็จเป็น AudioBuffer เล่นได้** ✅ · index.html + module script เสิร์ฟจาก cache MIME ถูก (`text/javascript`) ✅

> ✅ **offline cold-boot = แก้แล้ว (tester root-cause · 13 ก.ค.):** เดิม reload ตอน server ตาย = หน้าเปล่า. **สาเหตุจริง:** vite ใส่ `crossorigin` บน module script → browser ส่ง `Origin` header → asset ที่ cache มี `Vary: Origin` → SW `caches.match(req)` เคารพ Vary → **miss → ตกไป network(ตาย) → import() fail → ไม่ boot** (= สาเหตุจริงของ "connection-refused" ที่ผมเจอก่อนหน้าด้วย). **แก้:** `caches.match(req, { ignoreVary: true })` ทั้ง 3 handler ใน `public/sw.js`. **Verify (build+preview · kill server · reload):** `appMounted:true` · เนื้อแอปจริงขึ้น · violin sample decode ออฟไลน์ได้ → **cold-boot offline boot ได้แล้ว.**

### 4. Regression + build
- `vitest run` = **513 เขียว** (+ pre-existing `notationLint.test.mjs` process.exit(0) quirk = ไม่เกี่ยว/ไม่ได้แตะ)
- `npm run build` ผ่าน · **smplr ยัง lazy chunk** (70KB chunk แยก มี `gleitz` — ไม่อยู่ใน entry) · entry โต ~29KB จาก source ใหม่ (ไม่ใช่ smplr)
- UI: store รับครบ 5 เครื่อง + ปฏิเสธค่ามั่ว (verify ใน browser) · dev DB ไม่มีเพลง seed → picker บนเพลงจริง **รอ tester eyeball 1 ครั้ง**

---

## Dock UI — ปุ่ม "เสียงดนตรี" ปุ่มเดียว (P'Aim 13 ก.ค. · relay ผ่าน PM)

P'Aim เคาะสดกลางงาน: **อย่าแยก 4 คอนโทรลใน ⚙ pin ทีละอัน** → **รวมเป็นปุ่มเดียวบนแถบ dock ล่าง** ทั้งหน้าฝึกร้องและหน้าแก้เพลง.

- **`SoundControl.vue` (ใหม่)** — ปุ่ม trigger (icon **`audio-lines`** + badge เครื่องปัจจุบัน) → popover เล็ก รวม **4 กลุ่ม**: เสียงที่เล่น (ทำนอง/คอร์ด/รวม) · การบรรเลง (เดี่ยว/เต็มวง) · เครื่องดนตรี (5 เครื่อง) · อารมณ์/สไตล์ (บรรเลง/สงบ/ตรงโน้ต). เป็น presentational — แต่ละหน้าถือ state เอง (render ผ่าน DockKey slot · engine clamp ให้อยู่ในจอ).
- **`soundOptions.js` (ใหม่)** — option list 4 แกน = SSOT เดียว ใช้ทั้ง viewer + editor.
- **หน้าฝึกร้อง (SingTransport):** เอา 4 menu items ออก → เหลือปุ่ม `soundctl` เดียว (วางแถว 2 คู่กับ ท่อน เพื่อไม่ให้แถว transport แถว 1 ล้นจอมือถือ) · **ยุบปุ่ม "ท่อน" เหลือ icon + badge สถานะ** (ทั้งหมด vs subset "n/N" = ท่อนเดียว/วนซ้ำ · เน้นขอบเมื่อ subset).
- **หน้าแก้เพลง (EditorMode):** เดิม **ล็อกตรงโน้ต synth** → ตอนนี้มีปุ่มเดียวกัน เลือกเครื่อง/สไตล์ได้ · **default = plainest: Grand · เดี่ยว · ทำนองอย่างเดียว · ตรงโน้ต** (พี่เปาตรวจโน้ตดิบ) · `runPlay` ใช้เครื่อง/เสียง/สไตล์ที่เลือก.
- **จำ localStorage แยกหน้า:** editor ใช้ `pleng.editor.{sound,ensemble,instrument,style}` แยกจาก viewer (`pleng.{soundMode,ensembleMode,leadInstrument,playStyle}`) → ต่างคนต่างจำ (verified: เลือกใน editor ไม่แตะ key ของ viewer).

**🔴 Bug fix (P'Aim เจอ 13 ก.ค. · ~700px):** popover ทับแถบ transport (dock บวมเป็น ~400px). **สาเหตุ:** `.dk-pop` positioning ของ DockKey เป็น **scoped CSS** → ไม่ถึง element ของ SoundControl → popover เป็น `position:static` เลย render **in-flow ใน dock** ดันบวม. **แก้:** ประกาศ overlay CSS เต็ม (`position:absolute` + anchor เหนือ dock + bg/shadow/z-index) ใน `.sc-pop` ของ SoundControl เอง (คง class `dk-pop` ไว้ให้ clampPops หาเจอ) + **cap max-height min(56vh,360px) + scroll ในตัว + sticky header**. **Verify (หน้าดู/ฝึกร้องจริง via mock song + หน้าแก้เพลง · 375/760/1280):** popover=absolute · dock กลับความสูงจริง (sing 115px · editor 224px — เดิม 401/510) · เปิด **เหนือ dock ไม่ทับ** อยู่ในจอทุกขนาด · ปิดเมื่อคลิกนอก · เต็มวง disabled กดไม่ได้ · ไม่มี console error.

**Verify (live · หน้าแก้เพลง `/studio`):** ปุ่มโผล่บนแถบ (audio-lines · badge "เปียโน") · popover ครบ 4 กลุ่ม default ตรง (ทำนอง/เดี่ยว/เปียโน/ตรงโน้ต) · เลือก ไวโอลิน+บรรเลง → persist `pleng.editor.*` + summary อัปเดต · เต็มวง disabled กดไม่ได้ · **375px ไม่ล้น/ไม่มี h-scroll · console ไม่มี error**. หน้าฝึกร้อง = unit test (SingTransport 22 เขียว รวม test popover + ท่อน badge) — dev DB ไม่มีเพลง seed จึงยังไม่ได้ลองบนเพลงจริง (ขอ tester/พี่เปา eyeball).

## 🚀 LAUNCH scope — Grand + Guitar เท่านั้น (P'Aim 13 ก.ค.)

P'Aim เคาะขึ้น live **แค่ 2 เครื่อง: เปียโน (Grand) + กีตาร์ (Nylon)** (กีตาร์ฟังเดโมแล้วผ่าน). felt/violin/cello ต่อสายไว้แล้ว (self-host + เล่นได้) แต่ **จาง "เร็ว ๆ นี้" (กดไม่ได้)** จนกว่า P'Aim เคาะทีละตัว.

- **`guitar.js` (โมดูล §4B ใหม่ · port `docs/spikes/guitar-solo-demo.html` branch b107-p2-design):**
  - **strum** (default · D-DU-UDU) = รูดคอร์ดแบบมีทิศ (down ล่าง→บน รวมเบส · up บน→ล่าง ไม่มีเบส) — stagger 20–26ms **ได้ยินลายรูดจริง**
  - **travis** (PIMA) = เบสสลับ root/5th + ไล่นิ้ว i-m-a · **rasgueado** = กรีดรัว 4 ที + สตริมเบา · **sustained** = block เต็มคอร์ด (สำหรับ ตรงโน้ต)
  - **โมดูลถือ voicing ครบเอง** (ทุก pattern ดีดเบสเอง) → core ปิด bass ให้กีตาร์ (bassModes ทุกตัว→[]) → **preset bass ของเปียโนมาซ้อนเบสไม่ได้**
  - **melodyGrace** = สไลด์เข้าโน้ต (grace −2 semitone · seeded ~22% ของโน้ตยาว) · humanizeFeel = strum stagger
- **core arranger:** `melodyEvents` รับ module+rng → เครื่องเติม ornament ทำนองได้ (กีตาร์สไลด์) · **opt-in + เฉพาะตอน arranger ON** (เปียโน/ตรงโน้ต ไม่แตะ — golden rule เดิม)
- **โหมด "จัดเต็ม" เปียโน** = P2 arranger เดิม (arp+pedal+humanize · tester PASS แล้ว) — ยืนยันใช้ตัวนี้

**Verify audio (วัดผ่าน arrange→sampler จริง · OfflineAudioContext):**
- **กีตาร์ = 40 events** (เทียบเปียโน 20) · **เบสดีดเอง 7 + inner รูด 26** (ไม่ซ้อนเบส) · **gap 20–26ms ซ้ำ ๆ = รูดจริง** (ไม่ใช่ตอกคอร์ด) · ทำนอง = โน้ตพิมพ์ + สไลด์ 1 · **peak 0.50 ไม่ clip** · balance ทำนองนำ
- เปียโน "จัดเต็ม" = arp+pedal+humanize เดิม (peak 0.26)
- **UI `/studio`:** เปียโน+กีตาร์ active · felt/violin/cello disabled · ไม่มี console error · default editor = เปียโน·เดี่ยว·ทำนอง·ตรงโน้ต

**manifest metadata (PM ถามถึง durationSec/bakedMakeupDb/sampledRange):** nylon `sampledRange [31,84]` (G1–C6, 48 region) · samples **ดังเต็ม ~0.98 peak → bakedMakeupDb ≈ 0** (makeup runtime = 1.4 ใน sampler.js · vel curve คุมไม่ให้ clip) · ring 0.9–16s แล้วแต่ pitch. **loader ปัจจุบัน (sampler.js อ่าน preset.json) ไม่ต้องใช้ field พวกนี้** — ถ้าจะให้ manifest schema แบก ควรเติมใน `tools/assemble-samples-repo.mjs` (regenerated · manifest.json เป็น artifact) ไม่ hand-edit.

## 🔺 รวมวง (ensemble เสียงจริง) — โหมดที่ 3 · default หน้าดู (P'Aim 13 ก.ค. final)

LAUNCH = **3 โหมด: เปียโน + กีตาร์ + รวมวง** (P'Aim ฟังเดโมเต็มวงเสียงจริงแล้วเคาะนำขึ้น). SSOT = `docs/ds/instrument-arranger-p2.md §6b.2` + `docs/spikes/ensemble-real-demo.html` (branch b107-p2-design · SA `a3d220d`).

- **`midi.js playEnsemble()` (ใหม่):** เล่น **3 เครื่องจริงพร้อมกัน** (Splendid Grand + เชลโล/ไวโอลิน CC · **ไม่มี GM**) ผ่าน per-role mix graph (dry bus + near/far convolver sends — **เปียโนหน้า · สายหลัง**) + **กฎ 3 ชั้น:**
  - **GUIDE** (ทำนอง 1 เส้น): เปียโน หรือ ไวโอลิน ร้องทำนอง · swell โน้ตยาว · ไวโอลิน slide-in
  - **MOTION** (ชีพจร): เปียโน arpeggio หน้า (movement ไม่ pad นิ่ง)
  - **FOUNDATION** (โอบอุ้ม): เชลโลเบส **re-bow ทุก ~3 บีต** (one-shot sample ค้างไม่ได้ §6b.1) + ไวโอลิน wash **chorus only · ดันโน้ตเข้าช่วง sample (≥55)**
  - **section density:** verse โปร่ง → chorus สายเอ่อเข้ามา
  - แชร์ ctx/stop/note-SSOT กับ playSong · `stopPlayback` หยุดครบ 3 เครื่อง · **เปียโนเงียบไม่ได้** (PP layer [41,67] + gain→velocity ใน layer · บทเรียน P1)
- **UI:** เปิด "เต็มวง" (เดิม เร็วๆนี้) · **default หน้าดู `ensembleMode='ensemble'` (เปียโนนำ)** = เพราะสุดตอนเปิด · หน้าแก้เพลง default แยก (solo/plain) · SongViewer+EditorMode route ไป playEnsemble เมื่อเต็มวง · live เดี่ยว⇄เต็มวง + เปลี่ยนคีย์ = reschedule

**Verify (audio gate · วัด LIVE ต่อ role ด้วย AnalyserNode peak-hold):**
- **3 เครื่องได้ยินครบ** (เปียโน 0.405 · เชลโล 0.138 · ไวโอลิน 0.084) · **ทำนองนำ (เปียโนดังสุด)** · **ไม่ clip** (master 0.377) · balance เชลโล −9.4dB / ไวโอลิน −13.7dB ใต้ทำนอง (SA↔P'Aim จูนรสต่อ)
- **⚠️ artifact ที่เจอ+แก้แล้ว:** smplr Sampler โน้ตที่ schedule ไกล (~t>3s) เงียบใน **OfflineAudioContext** → **live ไม่เป็น** (ยืนยัน: fire +1.2s → เงียบตอน 0.15s ดังตอน 1.3s) → วัด ensemble ต้องวัด LIVE. เปียโน (SplendidGrandPiano) ไม่เป็น artifact นี้.
- vitest **517 เขียว** (+ test ensemble routing) · build ผ่าน · ไวโอลินนำ structured (`lead` param · default piano)

## 🔧 LAUNCH polish + bugfix (P'Aim confirm UI 13 ก.ค. · `brief-b107-launch-polish`)

- **🔴 BLOCKING — เปลี่ยน option ตอนเล่น = เสียงซ้อน 2 ชั้น (แก้แล้ว):** **สาเหตุจริง:** smplr `Sampler.stop()` (nylon/violin/cello) **ไม่ cancel โน้ตที่ schedule ไว้ล่วงหน้า** (มีแต่ SplendidGrandPiano ที่ cancel) → reschedule → โน้ต pass เก่าที่ค้าง queue ดังทับ pass ใหม่. **แก้:** wrapper เก็บ `StopFn` ที่ smplr `start()` คืนมาทุกโน้ต → `releaseAll()` เรียกทุกตัว = cancel ทั้ง future+sounding จริง. **Verify LIVE:** level 0 หลัง stop ทุกเครื่อง (grand/felt/nylon/violin/cello — เดิม sampler 0.08–0.18). `startPlay`→`stopPlayback`→`releaseAll` รันก่อนทุก pass ใหม่ = เหลือเสียงเดียว.
- **default หน้าดู → เปียโนเดี่ยว:** soundMode `both`(รวม) · ensembleMode `solo`(เดี่ยว) · เครื่อง grand · style arrangement. หน้าแก้เพลง plainest คงเดิม.
- **dock icon-only + สมมาตร:** ปุ่ม "เสียงดนตรี" = **icon อย่างเดียว · glyph ตามโหมด/เครื่องปัจจุบัน** (piano/guitar/users(เต็มวง)/music) ไม่มี label · ท่อน = `table-of-contents` + คง badge สถานะ · timeline แคบลง · เพิ่ม glyph piano/users/audio-lines/table-of-contents ใน Icon.vue.

**Verify (live · mock song):** default = รวม/เดี่ยว/เปียโน/บรรเลง · icon สลับ users/guitar/piano ตามที่เลือก · dock 2 แถว 341px เท่ากัน (สมมาตร) · 375px ไม่ล้น/ไม่มี h-scroll · popover ไม่ทับ · ไม่มี console error · vitest 517 เขียว · build ผ่าน.

## ยังไม่ทำ / ต่อ

- **"เต็มวง" (ensemble)** = ยังปิด "เร็ว ๆ นี้" (SA ออกแบบเสียงเครื่องคลอ · จ่ายแยก) — interface role-based (§6a′) เผื่อไว้แล้ว, scheduler วน `roles[]` เพิ่มได้ไม่แตะแกน
- **โมดูลกีตาร์ strum เต็ม (§4B.3)** = future (plucked ตอนนี้ = nylon solo เกา, ยังไม่ทำรูปคอร์ดเฟร็ต 6 สาย)
- **P'Aim ฟังด้วยหู** ทุกเครื่อง = gate สุดท้ายก่อน merge (SA/P'Aim ปั้นเสียง — `feedback_paim_direct_sa_creative`)
- **tester:** (1) เปิดเพลงจริง เลือกครบ 5 เครื่อง = เลือกได้+มีเสียง (§tester-gate-full-spec) (2) cold-boot offline DevTools-Offline

**server (mobile-test):** `npm run dev -- --host --port 5310` · Network: `http://192.168.1.173:5310/` · offline test = `npm run build && npm run preview -- --host --port 5321`
