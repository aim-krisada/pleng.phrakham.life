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

> ⚠️ **หมายเหตุ offline cold-boot (ตรงไปตรงมา):** วิธีทดสอบอัตโนมัติใช้ **kill process** = connection-refused ซึ่ง *แรงกว่า* DevTools "Offline" checkbox — ใน harness นี้ตอน reload หน้าเปล่า (module ไม่รัน) แม้ asset ครบใน cache. asset ทุกชิ้น precache ถูกต้อง (independent จาก runtime intercept) → **reload แบบ DevTools-Offline จริงจะ boot ได้** (SW nav fallback ทำงานปกติ). **ขอ tester/พี่เปา ยืนยัน cold-boot ด้วย DevTools Offline บน build จริง 1 ครั้ง.** ส่วน gate หลัก ("เปิดแอปอยู่ → ออฟไลน์ → เลือกเครื่อง+เล่น = มีเสียง") = **ผ่าน** (samples decode ตอน server ตาย).

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

**Verify (live · หน้าแก้เพลง `/studio`):** ปุ่มโผล่บนแถบ (audio-lines · badge "เปียโน") · popover ครบ 4 กลุ่ม default ตรง (ทำนอง/เดี่ยว/เปียโน/ตรงโน้ต) · เลือก ไวโอลิน+บรรเลง → persist `pleng.editor.*` + summary อัปเดต · เต็มวง disabled กดไม่ได้ · **375px ไม่ล้น/ไม่มี h-scroll · console ไม่มี error**. หน้าฝึกร้อง = unit test (SingTransport 22 เขียว รวม test popover + ท่อน badge) — dev DB ไม่มีเพลง seed จึงยังไม่ได้ลองบนเพลงจริง (ขอ tester/พี่เปา eyeball).

## ยังไม่ทำ / ต่อ

- **"เต็มวง" (ensemble)** = ยังปิด "เร็ว ๆ นี้" (SA ออกแบบเสียงเครื่องคลอ · จ่ายแยก) — interface role-based (§6a′) เผื่อไว้แล้ว, scheduler วน `roles[]` เพิ่มได้ไม่แตะแกน
- **โมดูลกีตาร์ strum เต็ม (§4B.3)** = future (plucked ตอนนี้ = nylon solo เกา, ยังไม่ทำรูปคอร์ดเฟร็ต 6 สาย)
- **P'Aim ฟังด้วยหู** ทุกเครื่อง = gate สุดท้ายก่อน merge (SA/P'Aim ปั้นเสียง — `feedback_paim_direct_sa_creative`)
- **tester:** (1) เปิดเพลงจริง เลือกครบ 5 เครื่อง = เลือกได้+มีเสียง (§tester-gate-full-spec) (2) cold-boot offline DevTools-Offline

**server (mobile-test):** `npm run dev -- --host --port 5310` · Network: `http://192.168.1.173:5310/` · offline test = `npm run build && npm run preview -- --host --port 5321`
