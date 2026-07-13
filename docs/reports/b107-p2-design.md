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

## รอบ 13 — เต็มวง Option 1: call-and-response + countermelody (13 ก.ค. · SA session ใหม่)
P'Aim เคาะ **Option 1** แก้ "เต็มวงจืด+เหมือนออร์แกน" (ต้นเหตุ = ไวโอลิน solo ถูกลากยาวเป็น pad). แนวคิด = เปลี่ยนไวโอลินจาก "แผ่นเสียงค้าง" → **"นักดนตรีคนที่ 2 ที่โต้ตอบ"**. ทำ **เดโมใหม่** `docs/spikes/ensemble-callresp-demo.html` รันกฎ 3 ข้อ:
1. **ตัด pad สายค้างหมด** — ไม่มีไวโอลิน/สตริงลากคอร์ดพื้นหลังเลย (กำจัดต้นเหตุออร์แกน). เต็มวง = เปียโน (ทำนอง+arp) + เชลโลเบส + ไวโอลิน "สอดรับ".
2. **Call-and-Response (`violinFill`)** — ไวโอลิน**เงียบสนิท**ตอนเปียโนเดินทำนอง. detector หา **"ช่องว่าง" = โน้ตทำนองยาว b≥2.5** (ปลายวรรค 7 จุดในเพลง) → ไวโอลินสีลูกเล่นสั้น (turn 3 โน้ต · ครึ่งหลังของช่องว่าง หลังเปียโนพูดจบ) เติมเข้าไป = โต้ตอบกัน. ย่านเสียง fill = MIDI 71–86 (เหนือทำนองเปียโน top=73 → **ไม่ทับ frequency**).
3. **Countermelody ฮุก (`violinCounter`)** — เฉพาะท่อน chorus: ไวโอลินเล่นเส้นประสาน**เข้าจังหวะยก (offbeat) + มีที่พัก (ไม่ค้างเป็น pad) + ย่าน 74–86 (เหนือเปียโน)**. คอร์ดยาว = 2 โน้ตขยับ (เป็นเส้น ไม่ใช่แผ่น). ตัด counter ทิ้งบนคอร์ดที่มี fill อยู่แล้ว (คุยกันชัด ไม่รก).
- **section dynamics คงไว้** (verse ×0.7 → chorus ×1.0). balance/reverb เดิม (เปียโนหน้า near-reverb · สาย far-reverb หลัง).
- **verify (SA):** โหลดเสียงจริง 3 เครื่องผ่าน · scheduling call-response + counter รันครบไม่ error (console 0 error · วัด gap/register ด้วย node: fill 71–85 · counter 75–85 · ล้วนเหนือ 73 ยืนยัน register แยกจริง).
- **UI เดโม:** toggle "สอดรับ" เปิด/ปิด + toggle "countermelody" เปิด/ปิด (แยกฟังทีละกฎ) + สไลเดอร์ "🎻 ไวโอลินสอดรับ".
- **balance (วัดจริง AnalyserNode ต่อ role):** เดิมไวโอลิน −13.3 (แค่ 7.4 ใต้เปียโน) → P'Aim ว่า "ดังไปนิดนึง". **หลักการ:** bowed สอดรับดังกว่าตัวเลข peak (sustain+vibrato+ย่านสูง) → ต้อง ~10–13 dB ใต้ lead · counter duck ลึกกว่า fill. trim fill 0.30→0.21, counter 0.24→0.14 → วัดใหม่ ไวโอลิน −16.6 (9.3 ใต้เปียโน).
- **✅ สถานะ: P'Aim sign-off 13 ก.ค. "ดีพอสำหรับ 1st release"** → ล็อกสูตรใน spec §6b.2 (LOCKED block) → ping PM จ่าย dev อัปเต็มวง (b107-step9-instruments). เดโม ref = `ensemble-callresp-demo.html` · `window.__peaks()` = เครื่องวัด balance ให้ dev/tester.

## สิ่งที่ทำในสเปก (ชี้จุดเด่น)

1. **สถาปัตย์ arranger 3 ชั้น + รายการเสียงกลาง `PerfEvent[]`** (§1) — ต่อยอดโค้ดจริง P1 (`songToNotes`→`buildChordVoice`→`playSong`/`sampler.fire`). แยกโฟลเดอร์ `src/lib/arranger/` (เพราะ `midi.js` โต 524 บรรทัดแล้ว).
2. **rule ทุกตัวเขียน input→output + เหตุผลดนตรี + AC** (§2–5) — ยกอัลกอริทึมที่เดโมพิสูจน์แล้ว (accent/contour/jitter/arp/roll/waltz/embellish) มาเป็นสเปก production พร้อม guard.
3. **แก้ 3 ข้อจำกัดเชิงเทคนิคจาก P1** (§0): sampler ทรานสโพส=reschedule · **velocity ต้องตกใน layer ที่โหลด** (invariant บังคับ — บทเรียน "เปียโนเงียบ") · **สุ่มต้อง seeded (ไม่ใช้ Math.random)** เพื่อ MP3 deterministic + เทสซ้ำได้ + 2 passes ต่างจริง.
4. **preset 5 ตัว** (§6) — สงบ/บรรเลง/ไวโอลิน/เต็มวง + **#0 ธรรมดา/ตรวจโน้ต (arranger OFF)** มี invariant test บังคับว่า "ตรวจโน้ตไม่ถูกแตะ".
5. **AC ครบ + วิธี verify** (§7) — invariant tests ต่อ rule (**ดักของจริง เช่น vel-in-layer** ไม่ใช่แค่ math) + **วัด real audio output ทุก preset** (peak>0 · balance · ไม่ clip · humanize spread วัดได้) + P'Aim ฟัง.
6. **ลำดับ build ภายใน** (§8) — Humanize step 1 (ฐาน) · แต่ละ step มี checkpoint ฟัง.
7. **MP3 (P3) hook** (§9) — arranger เดียว → live=MP3 · seed เดียว · reverb/pan ทำงานใน OfflineAudioContext.

## รอบ 2 — เพิ่มตาม input P'Aim (ผ่าน PM · 12 ก.ค.)
1. **โครง 4 โหมด (2 แกน · §6):** แยก **(A) ระดับลูกเล่น** — ทำนอง / คอร์ด / **ธรรมดา (ไม่มีลูกเล่น = ตรวจโน้ต)** / **จัดเต็ม (arranger เต็ม)** — ออกจาก **(B) เครื่องดนตรี**. โหมด 1–3 ต่อยอด 3 sound modes เดิม B104. "จัดเต็ม" มี 5 flavor (เปียโนสงบ/บรรเลง/ไวโอลิน/เต็มวง/กีตาร์). UI เข้าใจง่าย: ระดับลูกเล่น ≠ เครื่องดนตรี.
2. **Instrument module — เผื่อกีตาร์ตั้งแต่ออกแบบ (§4B):** แยก **แกนกลางร่วม (harmony/voice-leading/humanize/dynamics = instrument-agnostic)** + **โมดูลต่อเครื่อง (voicing constraints/patterns/humanize feel/sample = idiomatic)**. นิยาม `InstrumentModule` interface + worked example กีตาร์ (strum/Travis · รูปคอร์ดเฟร็ตจริง · strum-stagger 15–30ms · ไม่ยืม wide-voicing เปียโน). เพิ่มเครื่อง = plug-in โมดูล 1 ตัว ไม่แตะแกน. build order เพิ่ม step 10 (โมดูลกีตาร์) + AC + folder `arranger/instruments/`.

## รอบ 3 — consolidate หลังคุย P'Aim + ที่ปรึกษา + ผลวิจัย sample (12 ก.ค.)
- **ชุดเสียงล็อก 5 เครื่อง** (§5): Grand · **Felt (กรอง grand เดิม = 0 sample/license ใหม่ → P2 buildable!)** · Nylon Guitar · Solo Violin · Cello/String Pad. map ครบ role (cello=เบส). อ้าง `docs/reports/cc-instrument-samples.md` (Tier-1 `FluidR3_GM` CC-BY → Tier-2 CC0 เฉพาะ lead เดี่ยว). lazy-load per-preset.
- **UI 3 แกน** (§6a · P'Aim เคาะ): (1) เล่นอะไร (ทำนอง/คอร์ด/รวม) × (2) เสียงเครื่อง (เดี่ยวอิสระ + วงรวม curated) × (3) toggle ลูกเล่น (ธรรมดา/มีลูกเล่น). เครื่องเดี่ยว=เสรีปลอดภัย · วงรวม=ล็อกสูตรกันย่านชนนัว.
- **กฎ tempo→pattern** (§6d · ที่ปรึกษา): ช้า→Arpeggio · เร็ว→sustain/ย่ำ (threshold ~92 bpm · จูนกับ P'Aim).
- **2 default UI (P'Aim เคาะแล้ว):** ลูกเล่น toggle (แก้ไข=ธรรมดา/เล่น=มีลูกเล่น) · เครื่องยังไม่มี sample = ปุ่มจาง "เร็ว ๆ นี้".
- **P2 = เปียโนก่อน** (เปียโนสงบ=felt + เปียโนบรรเลง=arp buildable เลย) · อีก 3 preset slot ทีหลังไม่ต้องรื้อ (§12).

## รอบ 13 — ปั้นเต็มวง "หายออร์แกน" + Handoff เซสชันใหม่ (13 ก.ค.)
- **เต็มวงสายเหมือนออร์แกน** → ไล่แก้: vibrato (LFO→detune) · swell arc (เบา→ดังกลาง→ผ่อนท้าย) · legato tail · bow attack นุ่ม · pad บาง 1 โน้ต · ที่ปรึกษายืนยันทิศ.
- **P'Aim เลือก "ทาง 1": ตัด pad สายค้างออกหมด** → เต็มวง = เปียโนทริโอ (เปียโน+เชลโล) + ไวโอลินเป็นเส้นทำนองอย่างเดียว. เดโม `ensemble-real-demo.html` อัปแล้ว.
- **ค้าง:** รอ P'Aim ฟัง (ตัด pad) ว่าหายออร์แกน/โดนไหม → ลงตัวแล้วล็อกสูตร + ping PM.
- **Handoff → `docs/reports/b107-p2-sa-handoff.md`** (เซสชันใกล้เต็ม · SA ใหม่อ่านไฟล์นี้ต่อได้).

## รอบ 12 — ที่ปรึกษาให้ feedback เอกสารวิเคราะห์ → P'Aim เคาะทำ "สีเขียว" 2 ตัว (13 ก.ค.)
- **ที่ปรึกษาชม spec + ให้ 4 จุดปรับ** (role-prominence · rubato · section dynamics · crossfade pad + guitar voicing + gain-clamp reminder).
- **SA ประเมินซื่อ ๆ** แบ่ง 🟢คุ้ม-ง่าย / 🟡คุ้ม-ระวัง / 🔴ช่วยบางส่วน + แย้ง 2 จุด (crossfade ไม่แก้ต้นตอ=ไวโอลิน solo เป็น pad → ควรซ้อนไวโอลินหนา · เพดานเต็มวงจำกัดที่ sample คนละค่าย) + flag ต้องใช้ข้อมูลท่อนจริง.
- **P'Aim เคาะ: เอาแค่ 🟢 ก่อน** = **(1) section dynamics** (master gain verse 0.7→chorus 1.0) + **(2) role-prominence** (ทำนองเร็ว→หรี่คลอ −3dB · ทำนองยาว→เปียโนแทรก fill). ล็อกสูตรใน spec §6b.2.
- **พักไว้:** rubato · crossfade pad · guitar fret-voicing. gain-clamp มีอยู่แล้ว.
- เอกสารวิเคราะห์ให้ที่ปรึกษา = `docs/reports/b107-p2-sound-analysis.md`.

## รอบ 11 — ✅ เต็มวงเสียงจริง + balance วัดแล้ว → P'Aim เคาะนำขึ้นครบ 3 โหมด (13 ก.ค.)
- **ทำเดโมเต็มวงเสียงจริงทั้งวง** `ensemble-real-demo.html` (Splendid Grand + เชลโล/ไวโอลิน CC จริง · ตัด GM ทิ้ง · P'Aim: "ต้องใช้ CC จริง").
- **จับบั๊ก + fix ด้วยเครื่องวัด (AnalyserNode):** เปียโนเงียบ 0 = arg-shift bug (MIDI ไปช่องเวลา) + velocity นอก layer → แก้ (PP layer + gain→vel + makeup ×2.6) · เชลโล/ไวโอลิน baked +9/+10dB ดังเกิน → หั่น gain. **วัดหลังแก้: เปียโน −5.6dB (นำ) · เชลโล −16.8 · ไวโอลิน −26.7** = ทำนองนำ สายอยู่ใต้/หลัง.
- **P'Aim เคาะ: "นำขึ้นได้ piano, guitar, รวมวง"** → **launch = 3 โหมดครบ** · default = รวมวง เปียโนนำ.
- **params ล็อกลงสเปก** (§Launch scope + §6b.2): balance + piano PP-layer/makeup + string gain + กฎ 3 ชั้น + lead เปียโน/ไวโอลิน · dev ชี้ grand → self-host.

## รอบ 10 — 🆕 เต็มวงเข้า launch ด้วย (3 โหมด · P'Aim เคาะ 13 ก.ค.)
- **P'Aim ฟัง `ensemble-rules-demo.html` (A/B กฎ 3 ชั้น):** "ดีขึ้น ไม่จืด แต่น่าจะดีกว่านี้ได้ · **ยอมให้ขึ้น full ได้ เป็น 3 อย่าง piano/guitar/รวม · แต่ต้อง tune อีกเยอะ**".
- **Launch scope = 3 โหมด:** เปียโนเดี่ยว + กีตาร์เดี่ยว + **เต็มวง(รวม)** · default = เต็มวง (เพราะสุด).
- **เต็มวงใช้ "กฎ 3 Sonic Layers" (§6b.2)** แทนเวอร์ชันจืดเดิม: per-role reverb หน้า/หลัง + section density (verse/chorus) + role-prominence + arp motion (ไม่ pad นิ่ง). reference = `ensemble-rules-demo.html`.
- **ต้อง tune SA↔P'Aim ต่ออีกเยอะ** ก่อน final เต็มวง (ทิศถูกแล้ว).
- **นัย:** violin/cello/string sample ต้องพร้อม launch (เป็น role ในวง) · แต่ "เดี่ยว" ของ felt/violin/cello = ยังหลัง launch.

## รอบ 9 — 🎸 กีตาร์ผ่าน (P'Aim เคาะ 13 ก.ค.) · ค่าพารามิเตอร์ล็อกให้ dev
- **P'Aim ฟังกีตาร์ (ไฟล์ไนลอนจริง + รูด/เกา/rasgueado/slide) → OK · แจ้ง PM เอง.** เดี่ยว-จัดเต็มกีตาร์ผ่าน creative gate.
- **ล็อกค่าพารามิเตอร์กีตาร์ลงสเปก (§Launch scope)** = SSOT ให้ dev: strum D-DU-UDU (down 26ms/up 20ms rake · gain 0.30/0.18) · travis (thumb+i-m-a) · rasgueado (4-flick) · slide-in grace · default = strum. dev อ่าน + เดโม `guitar-solo-demo.html` เป็น reference.
- **สถานะ:** grand + guitar เคาะเสียงครบ → รอ PM จ่าย dev implement guitar module + tester → deploy 2 เครื่อง.
- **นอกเหนือ launch:** ทำเดโมทดลอง `ensemble-rules-demo.html` (A/B กฎ 3 ชั้น ช่วยเต็มวงยังไง · P'Aim ขอดู · ไม่ release) + bank กฎเต็มวง §6b.2.

## รอบ 8 — 🚀 Launch scope: ขึ้น live แค่ Grand + Guitar (P'Aim เคาะ 13 ก.ค.)
**P'Aim:** "เอาขึ้นแค่ 2 อย่าง grand piano + guitar ก่อน · ที่เหลือ tune อีกเยอะ · อยากให้ go live ได้แล้ว 2 อย่างนี้."
- **Launch = 2 เครื่อง เดี่ยว-จัดเต็ม:** 🎹 Grand (พิสูจน์แล้ว) + 🎸 Guitar nylon (เดโมไฟล์จริง + รูด/เกา/rasgueado/slide ผ่าน).
- **หลัง launch (ยัง tune):** felt · violin · cello · string · เต็มวง — architecture/sample/recipe/เดโม คงไว้ครบ เสียบทีหลังไม่รื้อ.
- **guitar module reference สำหรับ dev = `docs/spikes/guitar-solo-demo.html`** (นylon จริง · Travis PIMA / strum D-DU-UDU / rasgueado / slide-in · custom buffer sampler + soundfont fallback).
- **→ ส่ง PM (pm21):** จ่าย dev ทำ (1) grand solo-จัดเต็ม (2) guitar solo module (จากเดโม) → tester real-audio 2 เครื่อง → P'Aim ฟัง final → **deploy 2 เครื่อง**.

## รอบ 7 — P'Aim ฟังเต็มวง → pivot: "เดี่ยว-จัดเต็มสุด ๆ ต่อเครื่อง = หัวใจ" (12 ก.ค. ค่ำ)
**P'Aim ฟังเดโมเต็มวง:** ยังไม่เพราะเท่าเดี่ยว-จัดเต็ม (จืด — สาเหตุ: comp เป็น pad static + limiter squash dynamics · แก้เดโมแล้ว: arp movement + gentle limiter · แต่ยังไม่เท่าเดี่ยว). → **เคาะทิศ: เน้นทำเครื่องเดี่ยว ลูกเล่นแต่ละเครื่องจัดเต็ม = เพราะกว่า + เสี่ยงน้อยกว่ามิกซ์วง.**
- **หัวใจ P2 = "เดี่ยว-จัดเต็ม สุด ๆ ต่อเครื่อง" (§4B.4 ใหม่):** เปียโน/felt (RH+LH arp+pedal+sparkle ✅) · nylon (fingerpick Travis+harp roll) · violin (mono ลากยาว+double-stop+swell) · cello (ทุ้มลึก+re-bow). แต่ละ module มี pattern set 'solo-rich'.
- **เต็มวง = คงไว้ตามที่ทำ (P'Aim: "ไหน ๆ ทำแล้วก็คงไว้") · ยังไม่ปั้น · balance ทีหลัง · ไม่ลบ `presets.js`** (§6b.1 คง · เดโม working).
- **next:** ทำเดโม solo-รวย ต่อเครื่อง (sample พร้อมบน base) ให้ P'Aim ปั้นทีละตัว → dev โฟกัสโมดูลเดี่ยว.

## รอบ 6 — เต็มวง (Lead-driven) รูปธรรม + เดโม (สโคปใหม่: รอครบ 5 เครื่อง ขึ้น live ทีเดียว)
**สโคป (P'Aim ค่ำ 12 ก.ค. ผ่าน PM):** ไม่ deploy เปียโนอย่างเดียว — รอครบ 5 เครื่อง + เต็มวง แล้ว live ทีเดียว · sample 5 เครื่อง self-host `public/samples/` ครบ + arranger role-based อยู่บน base แล้ว (dev สร้างตามสเปกเป๊ะ) → เต็มวง = ทำจริงใน P2.
- **3 recipe เต็มวงรูปธรรม (§6b.1 · dev wire เข้า `presets.js`):** 🎹 เปียโนนำ (grand+string pad+cello · default) · 🎻 ไวโอลินนำ (violin+grand arp+cello) · 🎸 กีตาร์นำ (nylon+grand+cello) — แต่ละ role แยก register กันนัว · humanize/dynamics = แกนกลาง.
- **balance เริ่ม:** ทำนอง 1.0 · คลอ ~0.62 (−4dB) · เบส ~0.78 · reverb church ~0.30 (จูนกับ P'Aim ในเดโม).
- **verify เต็มวง (§7c):** วัดแยก 3 role peak>0 · ทำนองนำ · ไม่ล้น/นัว · offline.
- **เดโมเลือกพระเอก:** `docs/spikes/ensemble-demo.html` (เลือกพระเอก + สไลเดอร์ balance/reverb/bpm · humanize auto) — P'Aim ฟังปั้นได้.
- default เต็มวง = เปียโนนำ (เพราะสุดก่อน).

## รอบ 5 — P'Aim ฟังเดโม + เคาะเสียง (12 ก.ค. · sign-off)
- **humanize เคาะแล้ว: ±12ms / ±6%** (P'Aim ฟังเดโม `humanize-timbre-demo.html`: "เกินคาด · อย่าเพิ่มอีก" = sweet spot · ล็อกเป็น default สเปก).
- **default เล่น = เต็มวง + ลูกเล่นเต็ม (เพราะสุดก่อน)** · โหมดฝึก/ตรวจโน้ต = opt-in · **จำค่า localStorage** (คนตั้งโหมดฝึกไว้ = sticky → default เพราะสุดไม่ชนตรวจโน้ต). P2: default = เปียโนจัดเต็ม จนกว่า sample วงมา.
- **เดโม v2** = UI จริง (เลือกเครื่อง + โหมด + สวิตช์ลูกเล่น · humanize อัตโนมัติ · pedal bass + arp บนเปียโนจริง) — P'Aim ผ่าน.
- 🟢 **design + เสียงหลัก sign-off → ส่ง PM (pm12) จ่าย dev.**

## รอบ 4 — UX final (P'Aim ↔ ที่ปรึกษา · lock blueprint)
- **UI = 2 แกน + สวิตช์เงื่อนไข** (§6a · แทน 3-แกนเดิม): **แกน 1 เสียง = เดี่ยว / นำวง** (นำวง = เลือกพระเอก → ระบบเติมเครื่องคลอเอง) · **แกน 2 = ทำนอง/คอร์ด/ทำนอง+คอร์ด** · **สวิตช์ "ใส่ลูกเล่น"** โผล่เฉพาะ "ทำนอง+คอร์ด × เดี่ยว".
- **ตรรกะลูกเล่น (If-Else ให้ dev):** ทำนอง/คอร์ดล้วน = ปิดอัตโนมัติ (โน้ตตรง แกะโน้ต) · ทำนอง+คอร์ดเดี่ยว = ผู้ใช้สวิตช์ (ปิด=block/sustain ตรวจโน้ต พี่เป้า · เปิด=arranger เต็ม) · นำวง = เปิดเสมอ.
- **โหมดเดี่ยว ≠ โน้ตทื่อ** (§4B): เดี่ยว+ลูกเล่นเปิด = เทคนิคขั้นสูงของเครื่องนั้น (เปียโน solo RH+LH arp+pedal · กีตาร์ fingerpick+roll · ไวโอลิน mono+embellish).
- **ไวโอลิน/bowed เล่นคอร์ดหนาไม่ได้** → double-stop / คู่ 3-6 (กฎในโมดูล bowed §4B).
- "ลูกเล่นปิด (ตรวจโน้ต)" = first-class (§6c · ครอบ 3 เคส).

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
