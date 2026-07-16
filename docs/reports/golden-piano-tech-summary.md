# สรุปเชิงเทคนิค — "เปียโนทอง" (golden-piano) เครื่องยนต์เรียบเรียงเปียโนเดี่ยว

เอกสารนี้สรุปงานเทคนิคที่ทำกับระบบเล่นเสียงเปียโนอัตโนมัติของ pleng.phrakham.life (คลังเพลงนมัสการ) — ขึ้น production แล้ว (deploy รอบ 27, commit `ad63021`) ใช้กับเพลงบรรเลงทั้งคลัง (~400+ เพลง)

---

## 1. เป้าหมาย
เปลี่ยนจาก "เล่นโน้ตตามชีตเฉยๆ (แข็ง/เหมือนออร์แกน)" → **เรียบเรียงเปียโนเดี่ยวให้ไพเราะอัตโนมัติจากข้อมูลโน้ต** (โน้ตตัวเลข + คอร์ดรายห้อง + ป้ายท่อน) โดยไม่แต่งทำนองใหม่ (ทำนองมือขวา = โน้ตบนชีต ตายตัว).

## 2. สถาปัตยกรรมหลัก
- **`arrange()` = ฟังก์ชัน pure** (ไม่มี AudioContext): `notes[] + chordEvents[] → PerfEvent[]` (ข้อมูลบรรยายว่าจะเล่นอะไร: role/pitch/beat/gain/timing). Headless → unit-test ได้ และ**ใช้ร่วมทั้ง live playback และ MP3 export** → เสียง 2 ทางตรงกันเสมอ.
- **Pipeline:** LAYER 1 voicing → LAYER 3 pattern (comp มือขวา + bass มือซ้าย + embellish + fills) → LAYER 2 dynamics → **REFEREE** (ชั้นคุมท้ายสุด).
- **Deterministic:** สุ่มทุกอย่างผ่าน seeded RNG (mulberry32) ต่อ (เพลง, รอบ) → MP3 == live, ทำซ้ำได้.
- **เสียงเปียโน:** Splendid Grand Piano (AKAI · Public Domain) **self-host 5 ชั้น velocity** (PPP/PP/MP/MF/FF) เล่นออฟไลน์ได้ (PWA).

## 3. สิ่งที่ทำ (เชิงเทคนิค)

### 3.1 REFEREE layer — ชั้น "วาทยกร + ยาม" (นวัตกรรมหลัก)
ปัญหา: ลูกเล่นแต่ละตัว (dynamics/embellish/fills) ถูกจูนแยกกัน → เปิดพร้อมกันแล้ว**ชนกัน** (ornament ทับโน้ตทำนอง) หรือ**กลบทำนอง**. แก้ด้วย 2 pure pass ท้าย pipeline:
- **Conductor (no-clash):** สร้าง melody-onset timeline แล้วกรอง event ประเภท embellishment/fill ให้เล่นได้เฉพาะใน "ช่องว่างทำนอง" (ห่างจาก melody attack ≥ 0.4 beat ทั้งสองข้าง). ทำนองวิ่งถี่ → ลูกเล่นเงียบอัตโนมัติ.
- **Balance guard (floor):** รันหลัง gain ทุกตัวคำนวณเสร็จ — clamp ทุก voice ที่ไม่ใช่ทำนอง ให้ ≤ (gain ทำนองที่ดังจริง ณ บีตนั้น) × 0.8 = **มือขวานำ ≥20% เสมอ** + มี audible floor กันสูตรลดน้ำหนักหลายชั้นคูณกันจน voice เงียบหาย.

### 3.2 การปรับตามโครงเพลง (section-adaptive) + fallback
- **บั๊กที่แก้:** `sectionBeatRanges()` อ่าน `content.lines` แต่เพลง model v2 เก็บใน `stanzas/arrangement` → คืน section ว่าง → dynamics/rubato ตายเงียบกับเพลงจริงเกือบทั้งคลัง. แก้ = `resolveContent()` ก่อนเสมอ.
- **Fallback:** เพลงไม่มีป้ายท่อน → `phraseSectionsFromMelody()` เดา phrase จากรูปทำนอง (โน้ตลากยาว = จบวรรค · ช่วงโน้ตถี่กว่า median×1.5 = ท่อนเข้ม/รับ) → rubato + ความแน่นปรับได้ทุกเพลง.

### 3.3 Dynamics / expression (LAYER 2)
`humanizeVel` (±6% seeded), `humanizeTime` (melody ±12ms, chord voices ×0.35 เพื่อยังอ่านเป็นคอร์ดเดียว), `metricAccent` (เน้น downbeat ช่วง [0.8–0.92]), `melodicContour` (ทำนองไต่ขึ้นดังขึ้น/วรรคจบผ่อน), `sectionDynamics` (verse เบา/refrain เต็ม), `rubato` (หายใจปลายวรรค: โน้ตสุดท้ายของท่อน ×1.12 + โน้ตแรกท่อนใหม่เข้าช้านิด), `easeUnderHold` (บางลงใต้โน้ตค้าง + half-note pulse กันเสียงโหวง), `clampAll` (velocity-in-layer safety).

### 3.4 มือซ้าย / เบส
โหมด root / pedal (sustain-root "อุ้ม") / walking / pedalWalk (root ค้าง + passing note เดินเข้าคอร์ดถัดไป) · slash chord = ลง root ก่อนแล้วย้ายไป bass ที่ระบุ · **legato** (ปิดรอยต่อ "ฟันหลอ" ให้เสียงลากต่อเนื่อง).

### 3.5 Embellishment + fills (chord-tone-safe · seeded)
`sparkle` (ประกายอ็อกเทฟบน · ผูกความดังกับ fraction ของทำนอง), `chromaticApproach`, `gapFill`, `answerFills` (มือซ้ายตอบทำนองในช่องว่าง · ใช้ chord tone), `applySusCadence` (sus4 → คลี่คลายที่คอร์ดพัก). ทุกตัวเพิ่มเฉพาะ chord tone / approach ที่ปลอดภัย ไม่ขัด harmony บนชีต.

### 3.6 MP3 export = เสียง Grand จริง (offline sampler)
- เดิม MP3 ข้าม `arrange()` (เมโลดี้+คอร์ดดิบ) → route ให้ผ่าน `arrange()` ตัวเดียวกับ live → ไฟล์ที่โหลด = arrangement ครบ.
- **กับดัก offline:** `smplr` default scheduler คิวโน้ตเกิน lookahead 200ms ไปรอ `setInterval` ที่**ไม่เดินใน `OfflineAudioContext`** → โน้ตหลัง ~200ms เงียบ (RMS=0). แก้ = inject `Scheduler(ctx, {lookaheadMs: 1e7})` เฉพาะ offline (realtime คงเดิม) → dispatch ทุก BufferSource ทันที · โหลด Grand เป็น Sampler บน offline ctx · route ผ่าน reverb/chord-bus เดียวกับ live · **fallback → synth voice ถ้าโหลด sample พลาด** (export ไม่ล้ม).
- ผล: MP3 == live ทุกดีเทลรวม timbre · verify RMS ทั้งเพลง (ไม่มีช่วงเงียบ).

## 4. หลักการ/บทเรียน (สำหรับที่ปรึกษา)
- **แยก generate ออกจาก referee:** ลูกเล่นสร้างอิสระ แล้วมี "ผู้ตัดสิน" คุม clash + balance ท้ายสุด = คุมคุณภาพรวมได้โดยไม่ต้องจูนทุก knob ให้เข้ากันเอง.
- **โน้ต "เล่นได้จริง":** ข้อมูลชีตเดียวป้อนทั้งการแสดงผลและการเล่น → การเขียนโน้ตส่งผลต่อทั้งแผ่นและเสียง (มีหน้า "มาตรฐานการเขียนโน้ต" อธิบาย input→ผล).
- **งาน aesthetic-audio ต้องใช้หูคน:** ระบบ verify ได้แค่ invariant เชิงตัวเลข (peak>0, ratio 2 มือ, no-clash, timing spread) — "เพราะ" ตัดสินด้วยหู PO ทุกสเต็ป (ไม่วนเดา).
- **ตรงต่อชีต (honest-to-sheet):** ไม่ auto-lift octave เพลงเสียงต่ำ (แม้ฟังคล้ายออร์แกน) — เสียงต้องตรงโน้ตบนแผ่น; ถ้าเสียงเพี้ยน = ตรวจว่าข้อมูล octave ตรงต้นฉบับไหม (data accuracy) ไม่ใช่แต่งกลบ.

## 5. ขอบเขต / ที่ยังไม่ทำ
- **เปียโนเดี่ยว = สำเร็จ** (PO ยืนยัน "เพราะ" · ใช้ live ทั้งคลัง).
- **ไวโอลิน / เชลโล = พัก:** sample ฟรี (mono, single-dynamic) + การเรียบเรียงที่ประเมินด้วยหูไม่ได้ → เสียง "ไม่เข้ากัน/หวูดเรือ" · รอ sample คุณภาพหลาย dynamic หรือคนเรียบเรียงมาร์ก phrase.
- **UI knob:** ตัดสวิตช์ "เน้นจังหวะแรก" ออกจากเมนูผู้ใช้ (กันสับสน) — เสียง default คงไว้ตามที่ PO เคาะ.

## 6. ไฟล์อ้างอิงในซอร์สโค้ด (GPL v3 · public repo)
`src/lib/arranger/` — `index.js` (arrange), `referee.js` (conductor+balance), `dynamics.js`, `bass.js`, `embellish.js`, `fills.js`, `presets.js`, `techniques.js` · `src/lib/midi.js` (playSong, resolveSections), `src/lib/audioExport.js` (renderSongToBuffer), `src/lib/sampler.js` (Grand offline). รายงานเชิงลึก: `docs/reports/golden-piano.md`.
