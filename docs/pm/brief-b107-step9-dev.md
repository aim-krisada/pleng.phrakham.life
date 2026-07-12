# Brief — B107 step 9 dev: เสียบ 5 เครื่องดนตรี (เดี่ยว) + เปิด UI

**สาย:** dev · **branch:** `b107-step9-instruments` (off base `studio-shell-redesign` — base มี arranger + `public/samples/` ครบแล้ว)
**อย่า merge/deploy** (PM ทำ) · รัน server `--host` + Network URL ในรายงาน

## บริบท
B107 P2 arranger (เปียโน) + เสียง 5 เครื่อง self-host `public/samples/` merge เข้า base แล้ว (505 test เขียว). **P'Aim ต้องการเต็มสูบ: เล่นได้ทั้ง 5 เครื่อง.** งานนี้ = เสียบเครื่องให้ **เล่นเดี่ยว (solo) ได้ครบ** + เปิดปุ่มใน UI (เอา "เร็วๆนี้" ออกทีละเครื่องที่พร้อม). **ยังไม่ทำ "เต็มวง" (SA ออกแบบเสียงอยู่ · จ่ายแยก)** — แต่ interface ต้องเผื่อ (role-based §6a').

## SSOT
- code sketch เสียบ sampler ครบ: `docs/reports/cc-instrument-samples.md` (§integration · SAMPLE_HOSTS→`/samples/` · Soundfont/Sampler/felt-filter · SW precache)
- instrument module interface: `docs/ds/instrument-arranger-p2.md` §4B · manifest: `public/samples/manifest.json`

## ขอบเขต (เดี่ยว 5 เครื่อง · same-origin)
- `src/lib/sampler.js`: `SAMPLE_HOSTS`→`/samples/...` (same-origin · **ย้าย Grand จาก CDN มา `/samples/splendid-grand/` ด้วย** — PWA offline)
  - steel/string ensemble = `Soundfont({instrumentUrl:'/samples/FluidR3_GM/<patch>-mp3.js'})`
  - violin/cello/nylon = `Sampler({preset})` (fetch `/samples/CC0/<id>/preset.json` + `samples.baseUrl`)
  - felt = Grand + BiquadFilter lowpass ~2kHz
- instrument module ต่อเครื่อง (§4B) — เปียโน keyboard มีแล้ว · เพิ่ม bowed (violin/cello/string) + plucked (nylon) module (voicing/pattern เหมาะกับเครื่อง · เผื่อกีตาร์ strum ทีหลัง)
- **UI แกน "เครื่องดนตรี"** (ที่ตอนนี้ disabled "เร็วๆนี้"): เปิด **เปียโน · felt · ไวโอลิน · เชลโล · กีตาร์ไนลอน** ให้เลือกเล่นเดี่ยวได้จริง · steel/string pad = เก็บไว้เป็นเครื่องคลอ (เต็มวง) หรือเปิดด้วยก็ได้ · จำ localStorage
- **PWA:** service worker precache จาก `manifest.json` `precache[]` (115 same-origin URL) + smplr `CacheStorage` → **ทดสอบเล่นได้ตอน offline (DevTools offline)**

## Verify (audio gate = วัดจริง · บทเรียน B107)
- **real audio ต่อเครื่อง (OfflineAudioContext):** peak>0 ทุกเครื่อง (grand/felt/violin/cello/nylon) · ไม่ clip · velocity ตกใน layer ที่โหลด · balance ทำนองนำ
- **offline:** DevTools Network offline → เลือกเครื่อง + เล่น = ยังได้เสียง (external req=0 · precache ทำงาน)
- invariant test ต่อ instrument module · regression: เปียโน/สไตล์เดิม (บรรเลง/สงบ/ตรงโน้ต) ไม่พัง · `vitest` เขียว · build ผ่าน · sample = lazy (ไม่โตหน้าแรก)
- **UI completeness (§tester-gate-full-spec):** ทุกเครื่องที่เปิด = เลือกได้จริง+มีเสียง · เครื่องที่ยังไม่เปิด = disabled ชัดเจน

## รายงาน (session-agnostic)
`docs/reports/b107-step9-instruments.md` + board §📥 inbox + ping "PM ปัจจุบัน" (pm21)
