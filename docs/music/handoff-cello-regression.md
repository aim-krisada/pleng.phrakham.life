# HANDOFF — ล่า regression "เชลโลเทปยืด" (P'Aim จะทำต่อ session ใหม่)

**สถานะ (18 ก.ค.):** เชลโลเคย **"เพราะ/นุ่มมาก"** (P'Aim ยืนยัน) แล้ว **regress เป็น "เทปยืด/บิด/ขาดๆ/เพี้ยน"**
ทั้ง **เดี่ยวและ duo · ทุกเพลง · ปุ่มทั้งหมดอยู่ default (trading/arc ซ้ายสุด)** · **นี่คือ regression ไม่ใช่เพดาน sample**
(P'Aim: "ถ้าเดี่ยวก็ต้องเพราะแบบเดี่ยวซึ่งทำได้ก่อนหน้านี้")

**แผนของ P'Aim (ทำ session ใหม่):** กลับไปจุดที่เพราะ → **เปิด-ปิดฟังก์ชันทีละอัน A/B ด้วยหู** หาตัวที่ทำเพี้ยน
(⚠️ **เครื่องวัดจับ "เทปยืด" ไม่ได้** — วัด pitch นิ่ง 0 cents แต่หู P'Aim ได้ยินจริง → **เชื่อหู ไม่เชื่อ metric** · memory `pleng-aesthetic-audio-needs-ear`)

---

## 🎯 จุดที่ "เพราะ" (known-good) = commit `52b659c`
P'Aim พูด "เสียงนุ่มมาก" (เพลง #1) ตอน state นี้. Default ตอนนั้น: **vibrato 22 · compressor(even) 0.5 · baseMakeup ×1 · balance 1 · trading/arc ไม่มี**
เครื่องยนต์ตอนนั้นมีครบแล้ว: shift-based tame · tail-darken (+0.3s hold) · chamber-knob · compressor · marcato · normalize

## 🔬 ตัดออกด้วย git แล้ว (อย่าไปเสียเวลาซ้ำ)
- **เครื่องยนต์ `celloBakeoff.js` ตั้งแต่ 52b659c = เปลี่ยนแค่ commit เดียว (`63fbf56` arc/trading)** · **และที่ trading=0 มันเป็น no-op พิสูจน์แล้ว** (mel/pianoEvents ได้ผลเหมือนเดิมเป๊ะ) → **เครื่องยนต์ที่ default = เหมือน known-good ทุกบิต**
- **ไฟล์ตัวอย่างดิบ pitch นิ่ง 0 cents · render ที่ vib=0 นิ่ง 0 cents** (วัดแล้ว หลายแบบ) → ไม่ใช่บั๊ก pitch เชิงเลข
- offline scheduler fix มีครบ · MP3 encode sample-rate ถูก

## 🕵️ Suspect ที่เหลือ (page-level · เรียงตามน่าจะเป็น)
1. **⭐ Default ถูกเปลี่ยน (ผมเปลี่ยนตอนไล่บั๊ก — น่าจะคือตัวการ):**
   - **vibrato 22 → 0** (`701b305`) · **compressor even 0.5 → 0** (`218d149`)
   - **สมมติฐานหลัก:** เสียง "นุ่มมาก" **พึ่ง vibrato 22 เป็นตัวให้ "ชีวิต"** · พอผมปิด vibrato (เพราะเข้าใจผิดว่ามันคือ "เทปยืด" ตอนฟังเดี่ยว) → เสียงกลายเป็น **"แช่แข็ง/ยืด/ตาย"** · **ลองเปิด vib กลับเป็น ~22 + even 0.5 ดูว่ากลับมานุ่มไหม** (ตอนนี้ restore เป็น default แล้ว)
   - ⚠️ ปม: ฟัง **เดี่ยว** ที่ vib 22 → P'Aim ได้ยิน wobble ±25 cents = "เทปยืด" จริง (วัดได้) · แต่ใน **duo** ตอน "นุ่มมาก" wobble ถูกกลบ + vibrato เติมความอุ่น · **นี่คือ 2 อาการคนละตัว** ("wobble ตอนเดี่ยว" vs "ตายตอนปิด vib") ที่ P'Aim เรียกรวมว่า "ยืด" → ต้องแยกให้ออกตอน A/B
2. **baseMakeup ×0.2** (`b6a5c09` · "แก้เชลโลกลบเปียโน") — **restore เป็น ×1 แล้ว** · ทฤษฎีบอกมันควร no-op ที่ even=0 (เป็น gain ล้วน · normalize หักล้าง) แต่**เก็บเป็น suspect** เผื่อ interact กับ compressor (compressor threshold absolute → ระดับเข้าต่างกัน = บีบต่างกัน) → ลอง A/B: balance knob ต่ำ (เชลโลเบา+normalize ดันขึ้น) vs balance 1
3. arc/trading engine (`63fbf56`) — no-op ที่ 0 แต่ถ้า P'Aim เผลอดันขึ้น: trading = เชลโลหายบางวรรค ("ขาดๆ" by design) · arc = พองดัง

## ✅ ทำให้แล้วสำหรับ handoff
- **restore default = known-good:** vib 22 · even 0.5 · baseMakeup ×1 · balance 1 (celloListenPage.js) → เปิดหน้ามาควรได้เสียง "นุ่มมาก" กลับ (ให้ P'Aim ยืนยันก่อนเริ่มไล่)
- ปุ่มทุกตัวเป็น knob/toggle อยู่แล้ว (vib · even · trading · arc · chamber · balance · head · shift · fileLevel · resonance · roundRobin) = A/B ได้ทันที

## 📋 โปรโตคอลไล่ (session ใหม่)
1. `cd C:\gl\krisada\pleng.phrakham.life-music` · `node_modules/.bin/vite --host --port 5470` (เช็ก Network IP) · sample `_spike` มีแล้ว
2. เปิด `/docs/spikes/cello-listen.html` → **ฟัง duo + เดี่ยว ที่ default (vib22/even0.5) → ยืนยันว่า "นุ่ม" กลับมาไหม**
   - ถ้า **กลับมานุ่ม** = ตัวการคือ default ที่เปลี่ยน (vib/even) → ปิด vib ทีละสเต็ปหา sweet spot (5-8?) + แก้ปัญหา "เดี่ยว wobble" แยก (ทำ vibrato ให้เร็ว 6Hz+ตื้น = ธรรมชาติ ไม่ใช่ 4Hz ลึก)
   - ถ้า **ยังยืด** = ตัวการอยู่ลึกกว่า → git bisect: `git checkout 52b659c -- src/spikes/celloBakeoff.js src/spikes/celloListenPage.js docs/spikes/cello-listen.html` → serve → ยืนยันนุ่ม → แล้ว re-apply ทีละ commit (b6a5c09 → 63fbf56) เทสต์แต่ละอัน หา commit แรกที่พัง → diff หาบรรทัด
3. เจอตัวการ → แก้เฉพาะจุด → ให้ P'Aim ยืนยันหู

## กติกา (เหมือนเดิม)
เชื่อหู P'Aim ไม่เชื่อ metric (metric จับ "ยืด" ไม่ได้) · deterministic · ไม่แตะโค้ด deploy · spike แยกไฟล์ · **ห้ามเดา loop** — A/B ทีละตัวแปร

## บริบทเสียง (ก่อน regression มาถึง)
เชลโลผ่านหูแล้วเรื่อง "แสบ/นุ่ม" (shift-based tame + tail-darken + normalize) · **ปัญหา "เพราะ/คุยกัน" (เส้นเดินทาง 13-15dB + หายใจร่วม) = ยังไม่แก้** (ดู `docs/reports/reference-track-analysis.md`) · แผน duo → `docs/music/plan-duo-integration.md`
