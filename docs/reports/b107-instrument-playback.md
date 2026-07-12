# Report — B107 (dev): ระบบเสียงเครื่องดนตรีจริง (sampler + presets + auto-arranger)

**branch:** `b107-instrument-playback` (base `studio-shell-redesign` · มี B104+B105) · **บทบาท:** dev
**SSOT สเปก:** `docs/ds/chord-voicing-quality.md` (รอบ 0–6) · **เดโมพิสูจน์แล้ว:** `docs/spikes/chord-voicing-demo.html`
**สถานะ:** 🟢 **P1 เสร็จ (dev self-verify ในเบราว์เซอร์จริงผ่าน) → ขอ tester gate** · PM เคาะ gate แล้ว (host-agnostic+jsDelivr · Grand default+fallback)

---

## ✅ P1 — เสร็จแล้ว (commits บน branch นี้ · ยังไม่ merge/deploy)

**ทำอะไร:** แทนเสียง synth ของ B104 ด้วย **เปียโน Grand จริง (เสียงอัด)** บนการเล่นสด + **แก้ "คอร์ดดังไป" (voice-leading + บัส gain)** กลืนในตัว + **fallback synth เล่นทันทีระหว่างโหลด**.

**dev self-verify ในเบราว์เซอร์จริง (worktree dev server · วัดจริง):**
| เช็ก | ผล |
|---|---|
| โหลดเปียโน Grand จริง | ✅ 30 ไฟล์ ogg · **3.23 MB** · โหลดเย็น ~4 วิ (warm cache ~0.5 วิ) · 1 ชั้น velocity (ไม่ใช่ 17 MB) |
| host + ลิขสิทธิ์ | ✅ `smpldsnds.github.io` (Splendid Grand · **Public Domain**) — host-agnostic ผ่าน `SAMPLE_HOSTS.grand` |
| lifecycle | ✅ not-ready → โหลด → ready (getReadyInstrument sync → เล่นไม่ต้องรอ) |
| เล่นโน้ต (ทำนอง/คอร์ด/ทรานสโพส) | ✅ fire ครบ ไม่ error · ctx running · balance ทำนอง vel 116 / คอร์ด 33 (คอร์ดเบากว่าชัด) |
| console error | ✅ 0 |
| test + build | ✅ `vitest run` 436 ผ่าน (เหลือ notationLint process.exit quirk เดิม) · `npm run build` ผ่าน · smplr = lazy chunk (~9.5KB gz · ไม่อยู่ใน bundle หน้าแรก) |

**⚠️ ที่ dev เห็น/ยืนยันไม่ได้ (= งาน tester + P'Aim):**
- **"เพราะไหม/ถูกไหม" ด้วยหู** — dev ไม่มีหู · ต้อง tester/P'Aim ฟังจริง
- **เล่นในหน้า SongViewer จริง** — anonymous ติด GATE (เห็น 0 เพลง) → **tester ต้องล็อกอินทีมแล้วเปิดเพลงจริง** (dev ทดสอบ pipeline ตรง ๆ ผ่านโมดูลจริงในเบราว์เซอร์ ไม่ผ่าน UI)
- **เวลาโหลด+fallback บนมือถือ/3G จริง** — วัดบน desktop ~4 วิ · **Network URL ให้ลองบนมือถือ:** `http://10.152.249.98:5307/` (dev server ของ session นี้ · tester รันเองก็ได้)

**สำคัญ — สิ่งที่เปลี่ยนสำหรับผู้ใช้ทุกคน:** เสียงเล่น (ทำนอง+คอร์ด) เปลี่ยนจาก synth เป็น **เปียโนจริง** โดย default → tester **อย่าตีเป็น regression ว่า "เสียงเปลี่ยน"** (= ฟีเจอร์ที่ P'Aim เคาะ) · regression ที่ต้องเช็ก = เล่น/หยุด/สลับโหมด(ทำนอง/คอร์ด/รวม)/ทรานสโพส/MP3 ยังทำงาน + fallback ไม่ค้างบนมือถือ.

**P1 ยังไม่รวม (= P2/P3):** MP3 ยังใช้ **synth ที่แก้แล้ว** (voice-leading+gain · ไม่ใช่เปียโนจริง — real-instrument MP3 = P3) · presets/เลือกเครื่อง + auto-arranger 3 ชั้น = **P2** · mirror ไฟล์เสียงมา host เราเอง = ก่อน production เต็ม (PM เงื่อนไข).

---

---

## สรุปสั้น (F60+)

งานนี้เปลี่ยน "สถาปัตยกรรมเสียง" ทั้งเส้น (แทน oscillator สังเคราะห์ ด้วย **ตัวอย่างเสียงเครื่องจริง**).
ตามที่ brief สั่ง — **ก่อนลุยส่วนที่ย้อนยาก ผมวัดความเสี่ยงหลัก (ขนาดไฟล์เสียง + เวลาโหลดมือถือ) และเสนอแผน 3 เฟส + วิธี host ให้ PM เคาะก่อน.**
ข่าวดี: เดโม (SA) พิสูจน์แล้วว่าเล่นได้จริงในเบราว์เซอร์ + ทรานสโพสได้ · ตัวอย่างเสียงถูกลิขสิทธิ์ (PD/CC-BY) host ซ้ำได้.
ความเสี่ยงเดียวที่ต้องตัดสิน = **ต้องโหลดไฟล์เสียง ~2–3 MB ครั้งแรก (เปียโน) → เวลาโหลดบนมือถือ/เน็ตช้า.**

---

## 1. วัดความเสี่ยงหลัก — ขนาดไฟล์เสียง + เวลาโหลด (วัดจริง)

| ชุดเสียง | แหล่ง | ลิขสิทธิ์ | ขนาดจริง (วัดแล้ว) |
|---|---|---|---|
| **เปียโน Splendid Grand** (smplr) | danigb/samples (Akai) | **Public Domain** ✅ host ซ้ำได้ | **default = 303 sample ≈ 17 MB** (โหลดครบ 5 ชั้น velocity) |
| ↳ **จำกัด 1 ชั้น velocity + 4 อ็อกเทฟ** | เดียวกัน | เดียวกัน | **~2.0–3.4 MB** (ogg · จูนได้ด้วย notesToLoad) |
| **สตริง = ไวโอลิน+เชลโล** (tonejs-instruments) | nbrosowsky (Iowa/Philharmonia) | **CC-BY 3.0** ✅ host ซ้ำได้ (ต้องเครดิต) | ไวโอลิน 11 ไฟล์ ×~330 KB ≈ **3.6 MB** + เชลโล 10 ×~75 KB ≈ **0.75 MB** = **~4.4 MB** |

**บทเรียนสำคัญ:** smplr โหลดเปียโน **ครบ 5 ชั้น velocity = ~17 MB** ถ้าไม่จำกัด → **ห้ามใช้ default** · ต้องสั่ง `notesToLoad` (1 ชั้น + ช่วงโน้ตที่ใช้จริง) ให้เหลือ ~2–3 MB.

**ประเมินเวลาโหลด (ครั้งแรก/เครื่อง · หลังจากนั้น cache):**
- WiFi/4G (~10 Mbps): เปียโน 3 MB ≈ **2–3 วินาที** · เต็มวง +สตริง ≈ +3–4 วินาที
- 3G ช้า (~0.4 Mbps): เปียโน 3 MB ≈ **~60 วินาที** ⚠️ — นี่คือเคสที่ต้องมีทางหนี (fallback synth ทันที + indicator)

---

## 2. แผน 3 เฟส (เสนอ · ปรับจาก brief)

> หลักออกแบบที่ทำให้ host **ไม่ block การเขียนโค้ด:** ทำ **baseUrl เป็น config ค่าเดียว** — ย้ายที่ host ทีหลังแก้บรรทัดเดียว. ดังนั้นเริ่มเขียนได้เลย แม้ PM ยังไม่เคาะ host สุดท้าย.

**สถาปัตยกรรม (ตัดสินใจ dev · flag ได้ถ้า PM ไม่เห็นด้วย):** ใช้ **smplr ตัวเดียว** ทั้งเปียโนและสตริง (smplr `Sampler` โหลด note→url เองได้) → **ไม่ต้องพึ่ง Tone.js** (เดโมใช้ Tone แค่ตอน R&D) → bundle เล็กลง + code path เดียว. `scheduleNote` (B104 แยกไว้ให้ realtime+MP3 ใช้ร่วม) กลายเป็น "จุดสลับเครื่องดนตรี": route โน้ตไป sampler แทน oscillator.

| เฟส | ทำอะไร | ไฟล์ (fence) | ย้อนยากไหม |
|---|---|---|---|
| **P1 — sampler infra + Grand default (แทนเสียง B104)** | โมดูล `sampler.js` ครอบ smplr · abstraction เครื่องดนตรี · เปียโน Grand = default · **กลืน gain/voice-leading fix (คอร์ดไม่ดังไปแล้ว)** · lazy-load ตอนกดเล่นครั้งแรก · **fallback = synth เดิม** ถ้าโหลดพลาด/ออฟไลน์ · host-agnostic baseUrl | `sampler.js`(ใหม่) · `midi.js` · viewer selector | **นี่คือแกนหลัก · ship + tester gate ที่นี่** |
| **P2 — presets + auto-arranger** | preset selector (Grand default · Felt · #2 เปียโน arp · #3 ไวโอลิน+เปียโน · #4 เต็มวง) + **arranger 3 ชั้น** (voice-leading → dynamics → embellishments) ย้ายจากเดโมเข้า `src/lib` | `arranger.js`(ใหม่) · `midi.js` · viewer | กลาง |
| **P3 — MP3 rework** | `audioExport.js` render ผ่าน sampler เดียวกันบน OfflineAudioContext | `audioExport.js` | ⚠️ ต้อง spike: sampler render ใน OfflineAudioContext ได้ไหม (decode ต้องเสร็จก่อน render) |

**สิ่งที่ P1 ปิดจบพร้อมกัน** (ตามที่ P'Aim เคาะ "กลืน gain/voicing ในนี้"): (1) เสียงจริง (2) แก้ "คอร์ดดังไป" (§1 spec) (3) voice-leading (§2 spec). → tester gate ที่ P1 ครอบ regression: playback/มือถือ/สลับโหมด/MP3-เดิม-ไม่พัง.

---

## 3. ตัวเลือก host ไฟล์เสียง (ให้ PM เคาะ)

| | A. jsDelivr จาก repo ต้นทาง | B. self-host ใน repo เรา (`public/samples/`) | C. repo assets แยก → GH Pages/jsDelivr |
|---|---|---|---|
| งานตอนนี้ | 0 (ชี้ URL) | ก๊อป ~7 MB เข้า repo | ตั้ง repo ใหม่ + push |
| repo เราบวม | ไม่ | **+7 MB** (clone หนักทุก session parallel) | ไม่ |
| เราคุมเอง/ออฟไลน์ | ❌ พึ่ง 3rd-party | ✅ | ✅ |
| CC ถูกต้อง (redistribute) | ผ่าน (jsDelivr mirror) | ✅ ชัดสุด | ✅ ชัดสุด |
| เร็วสุดที่จะ ship | ✅ | กลาง | ช้าสุด |

**คำแนะนำ dev:** เขียนแบบ **host-agnostic** (baseUrl ค่าเดียว) → **P1 ชี้ jsDelivr ต้นทาง (A) เพื่อ ship + วัดเวลาโหลดมือถือจริง** → รู้ตัวเลขจริงแล้วค่อย mirror มาที่เราคุมเอง (C) ใน P2/P3. ได้ทั้งเร็ว + ไม่ล็อกตัวเอง + ไม่บวม repo ตอนต้น.

---

## 4. 2 เรื่องที่ต้องให้ PM/P'Aim เคาะก่อนผมลุย P1 หนัก

1. **Host:** เอาแนวทาง host-agnostic + P1 ผ่าน jsDelivr แล้ว mirror ทีหลัง (คำแนะนำผม) ✅ หรืออยาก self-host ใน repo เลย?
2. **น้ำหนักโหลด default:** Grand = default แปลว่า **โหลด ~2–3 MB ครั้งแรกตอนกดเล่น**. เอาแบบ:
   - (ก) **Grand default + fallback synth เล่นทันทีระหว่างโหลด + indicator "กำลังโหลดเสียงจริง…"** (คำแนะนำผม — ผู้ใช้ไม่รอหน้าจอค้าง) หรือ
   - (ข) synth = default (0 download) · เสียงจริง = ปุ่ม "อัปเกรดเสียง" opt-in (เบาสุดต่อมือถือ แต่คนส่วนใหญ่ไม่กด = ไม่ได้ยินของเพราะ)

**ระหว่างรอ:** ผมเริ่มโครง `sampler.js` (host-agnostic · ย้อนได้ · ยังไม่ commit ไฟล์เสียง MB ลง repo) ได้เลยโดยไม่ผูกการตัดสิน host.

---

## 4b. ยืนยันเชิงเทคนิค (ทดสอบแล้วบน branch นี้)
- **smplr 1.0.0 ติดตั้ง+ import ผ่าน** (`SplendidGrandPiano` · generic `Sampler` · `CacheStorage` สำหรับออฟไลน์). ไม่ต้องใช้ Tone.js.
- **จำกัดขนาดเปียโนได้จริง:** velocity layer ของ smplr = PPP[1-40] PP[41-67] **MP[68-84]** MF[85-100] FF[101-127]. สั่ง `notesToLoad{velocityRange:[68,84], notes:[…ช่วงที่ใช้]}` → โหลดชั้น MP ชั้นเดียว (~62 sample เต็มชั้น ≈ 4.3 MB · จำกัดช่วงโน้ต ~40 ตัว ≈ **2.8 MB**). default ไม่จำกัด = 5 ชั้น ≈ 17 MB.
- **สตริง:** generic `Sampler({ buffers:{ "C4":url, … } })` — ให้ note→url แบบห่าง ๆ แล้ว smplr pitch-shift เติมเอง (ไวโอลิน+เชลโล จาก jsDelivr).
- **routing เข้าบัสคอร์ด (§1 spec)** ทำได้: Sampler รับ `destination` + `lpfCutoffHz` → ต่อ low-pass/compressor ได้ตามสเปก.
- **2 จุดที่ต้องระวัง (ใส่ในแผน · ไม่ block):**
  1. **ทรานสโพสสด (setTranspose กลางเพลง):** oscillator เดิม re-tune ด้วย detune ได้ทันที · sampler = voice เป็นก้อน → เปลี่ยนคีย์กลางเล่นต้อง **reschedule** (เหมือน B105 ที่ reschedule ตอนสลับโหมด). ทรานสโพส "ก่อนเล่น" = ส่ง MIDI ที่บวก offset แล้ว → ได้เลย. → P1 จัดการเหมือน B105.
  2. **MP3 export (P3):** sampler ต้อง render ใน OfflineAudioContext (decode sample ให้เสร็จก่อน render) — **เป็น spike ที่ต้องพิสูจน์ใน P3** ก่อนสรุปว่า "engine เดียวทั้ง live+MP3". ถ้าไม่ได้ → fallback: MP3 ใช้ synth เดิม (ยอมรับได้ชั่วคราว).

## 5. ยังไม่ทำ / ยังไม่ deploy
- **ไม่ merge เข้า base · ไม่ deploy** — PM cherry-pick หลัง tester gate (regression: playback/มือถือ/MP3).
- เสียง/รสนิยม (preset ไหนเพราะ · จังหวะ · บาลานซ์) = **P'Aim↔SA ตรง** — ผม implement ตาม spec/เดโม.
