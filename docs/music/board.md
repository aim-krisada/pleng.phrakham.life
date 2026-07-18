# Music board — สถานะสด (ไม้ต่อ) · refreshed 2026-07-18

บ้าน: worktree `C:\gl\krisada\pleng.phrakham.life-music` · branch `music-standing` (fork จาก `cello-vib-arc` `d2a20a2`)
คู่กับ `docs/music/composer.md` (บทบาท/กติกา — อ่านก่อน) · รายละเอียดเทคนิค → `docs/reports/cello-marcato.md` + git log

---

## ▶ RESUME (อ่านก่อนทำต่อ)

**ที่นั่งนี้เพิ่งตั้ง (18 ก.ค.)** — พี่เอมให้เป็นสาย music composer คู่ขนาน · ทำต่อจาก **เปียโน (จบ) + เชลโล (ค้างที่ขั้น 5.3)**

**ก่อนฟังเชลโลได้ ต้อง build sample mirror ก่อน (gitignored · ไม่อยู่ใน repo):**
```bash
cd /c/gl/krisada/pleng.phrakham.life-music
KARORYFER="C:\Users\aimkr\OneDrive\4 Personal\pleng.phrakham.life\sfz\karoryfer-bigcat.cello-master" \
  py tools/prepare-cello-bakeoff.py     # → public/samples/_spike/karoryfer/*.ogg + preset.json
npm run dev -- --host                    # จด Network URL → เปิด /docs/spikes/cello-marcato.html
```
> **แหล่ง sound source ทั้งหมดย้ายมาที่** `C:\Users\aimkr\OneDrive\4 Personal\pleng.phrakham.life\sfz\` (18 ก.ค. · เดิมอยู่ Downloads)
> มี: `karoryfer-bigcat.cello-master` (เชลโล CC0 · sus 136 + staccato + pizzicato) · `SplendidGrandPiano-master` (เปียโน golden) · `SalamanderGrandPiano-master` (16 ชั้น · เคยพิจารณา ไม่เอา) · + GM banks/drums/templates อื่น ๆ

---

## 🎹 เปียโน "ร่างทอง" (golden piano) — ✅ จบ · ขึ้น production แล้ว

- **สถานะ:** deploy รอบ 27 (`ad63021`) + MP3 timbre จริง (branch `golden-piano` `341be4c`, deploy รอบ 30) · **พี่เอมยืนยัน "เพราะดี"**
- ใช้จริงทั้งคลัง ~400+ เพลง · Splendid Grand self-host 5 ชั้น velocity · `arrange()` = วาทยกร (voicing→pattern→dynamics→REFEREE) · MP3 == live (offline sampler)
- **ไม่มีงานค้าง** — เว้นแต่พี่เอมอยากยกระดับต่อ (ดู §ไอเดียเผื่ออนาคต)
- อ้างอิง: `docs/reports/golden-piano-tech-summary.md`

## 🎻 เชลโล (Karoryfer CC0) — 🔶 ค้างที่ขั้น 5.3 · รอหูพี่เอม

**เป้า (พี่เอม):** "รวมวง เปียโนร่างทอง + เชลโลที่ลื่นหู ไม่แสบแก้วหู เพราะระดับหนึ่ง พอแล้ว" · **ยังเป็น spike** (`soundOptions.js` เชลโล `disabled:true` — ยังไม่เข้าแอปจริง)

**ค่าที่พี่เอมเคาะแล้ว = default (ห้ามพัง):** หัวโน้ต **5%** · เลื่อนเวลา **10 ms** · ตัวลาก **`p`** · หัวโน้ต **`mp`**

**ทำมาแล้ว (ผ่านหูพี่เอมเป็นขั้น ๆ):**
- ✅ **ขั้น 1–3:** โหลดชั้น p/mp/mf/f (68 ไฟล์ · เดิมใช้ mf ชั้นเดียว = "แสบ") · marcato หัวสั้น+ตัวลาก `p` · ล็อกค่าที่พี่เอมหมุนเอง
- ✅ **5.1 คันชักคู่ (round-robin) = พักถาวร** (`50f4532`) — วัดแล้วเป็นบั๊กโครงสร้าง (t50 ต่าง median 200ms) สลับ 2 เทคไม่ได้ · ประหยัด 1.09 MB · ปุ่มปิด default
- ✅ **5.2 vibrato:** ปุ่มความลึก (ค่าจากคนอัด 2Hz+delay/fade) + **กฎอัตโนมัติ: สั่นเฉพาะโน้ตยาว** (`a4860a2`) · พี่เอมเคยว่า "มิติชัดขึ้น โหยหวนดีกว่า แต่ห้ามใส่คงที่ทุกโน้ต"
- ✅ **5.3 arc (ความกว้างดัง-ค่อย):** ทำเป็น overlay บน `arrange()` (ไม่แตะ `dynamics.js`) · เจอว่า **สมมติฐาน "arc แบน 1.41 dB" ไม่จริง** (`d74b9a2`)
- ✅ **บั๊ก "วินาที 14 ดังผิดปกติ" = แก้แล้ว (ไม่หมด)** (`3956a9d`/`d2a20a2`) — ต้นเหตุ: ไลบรารีมี level ซิกแซกระหว่างเทค (ไฟล์ 60 ดังกว่าเพื่อน ~15 dB) → normalize รายไฟล์ไปค่ากลางไลบรารี (−23.6 dB) · กระโดด 5.3→2.5 dB (ยังเหลือ 2.5 dB อธิบายไม่ได้)

**🎧 หน้าฟัง "ตัดสินใจ" (ใหม่ 18 ก.ค. · สำหรับพี่เอม — ไม่มีปุ่มปรับ):** `docs/spikes/cello-listen.html` + `src/spikes/celloListenPage.js`
เหตุผล: หน้า `cello-marcato.html` มีปุ่ม 6-7 อัน = หน้า debug ของ composer ไม่ใช่หน้าตัดสินใจของพี่เอม (พี่เอม 18 ก.ค. "ตัวเลือกเยอะเกินไป ไม่รู้จะเลือกยังไง") → ยุบเหลือ **3 ปุ่มใหญ่** ให้หูตัดสิน 2 คำถาม (เชลโลคุ้มไหม · เรียบหรือสั่นนิ้ว) · ค่าอื่นฝังไว้หมด (p/mp/5%/10ms + normalize) · vibrato preset = 22 cents + auto-rule โน้ตยาว
> ✅ **music worktree serve เองแล้ว** (`npm install` เสร็จ · `node_modules/.bin/vite --host --port 5470`) · URL ฟัง = `http://<IP>:5470/docs/spikes/cello-listen.html` (IP เช็ก vite Network line) · sample `_spike` copy มาจาก worktree เชลโลเดิมแล้ว (gitignored)

**🎧 คำถามที่รอหูพี่เอมเคาะ (ห้ามเดาแทน):**
1. เชลโลตอนนี้ (marcato + normalize + vibrato-โน้ตยาว) **"ไม่แสบแล้ว/ลื่นหูพอ"** หรือยัง? → ถ้าใช่ = **จบเชลโล** (เหลือแค่คุยเรื่องเอาเข้า SongView จริง)
2. arc (ความกว้างดัง-ค่อย) เปิดแล้วเพราะขึ้นหรือรก? เปียโนเปลี่ยนรับได้ไหม?
3. vibrato depth เท่าไรพอดี (เคยชอบ 22 cents แต่ว่า "ดังขึ้น + อย่าคงที่")

## 🔬 DIAGNOSIS 18 ก.ค. — "เพราะขึ้น แต่ตั้งแต่วินาที 8 ดังเกิน" (พี่เอมฟัง clip เชลโล+vibrato)
วัดจริง 4 รอบใน browser (`javascript_tool` import engine → render → per-0.5s RMS + high-band ratio):
- ✅ **ข้อ ก. = เชลโลคุ้ม** (พี่เอมยืนยัน "เพราะขึ้น")
- **"ดังเกิน" จริง ๆ = "แสบเกิน" (ย่านสูง):** (1) vibrato เพิ่มดัง ~0 dB = ไม่ใช่ตัวการ (2) เป็นเสียงเชลโลตอน**เล่นเดี่ยว** (เปียโนพัก · piano −10 dB ตรงนั้น) (3) **วินาที 8-8.5 = จุด brightness สูงสุดของทั้งคลิป** (−12.8 dB high-band) เพราะทำนอง**ไต่ขึ้นย่านสูงสุด** (midi 68→71→73) พอดี · วินาที 3.5 ดังกว่า (โน้ตยาว midi 64) **แต่ต่ำ=อุ่น** เลยไม่ถูกบ่น → **ปัญหา = brightness ของโน้ตสูง ไม่ใช่ level**
- ยืนยัน: loud humps = โน้ตยาว sustained ที่ gain ปกติ (**ไม่ใช่ hot file · ไม่ใช่ arranger ดัน**)
- **✅ พี่เอมเคาะ "ลด treble เฉพาะโน้ตสูง" (18 ก.ค.) → BUILT + A/B live:** param ใหม่ `trebleTameDb` ใน `renderClip` = high-shelf @2800Hz cut มากขึ้นตาม pitch (TAME_LO 62 → TAME_HI 74 · 0=off) · automate `gain.setValueAtTime` ต่อโน้ต (mono line · deterministic) · default A/B = 8 dB · **วัดยืนยัน: >2kHz band ลด ~1 dB เฉพาะช่วงไต่สูง sec 7-9 · โน้ตต่ำไม่แตะ** · **รอหูพี่เอม: แสบน้อยลงไหม + แรงพอ/มาก/น้อยไป (ปรับ trebleTameDb ได้)**

## ▶ Next actions (ตามลำดับ — ทีละก้าว หยุดรอหูพี่เอม)
- [ ] **rebuild sample mirror** (คำสั่งข้างบน) → serve → ส่ง Network URL + MP3 ให้พี่เอมฟังของล่าสุด (5.3 + normalize)
- [ ] พี่เอมเคาะคำถาม 1–3 ข้างบน → ล็อก/ปรับ/พัก ตามหู
- [ ] **ถ้าพี่เอมว่า "ยังไม่นุ่มพอ"** → ขั้นถัดไปที่ brief เผื่อไว้ (ยังไม่ทำจนสั่ง):
  - ขั้น 2: ขยับเชลโลให้ห่าง (ห้องเสียง/early reflections) — Karoryfer close-miked จ่อหู
  - ขั้น 3: EQ กดย่านแสบ (วัดเป้าจากแผ่นจริงที่พี่เอมชอบ · ใช้แค่ 50–70% ของส่วนต่าง)
  - ขั้น 4: สีเบา = เสียงทึบลง (brightness ตาม dynamics)

## 💤 พัก / นอก scope ตอนนี้
- round-robin คันชัก `_d`/`_g` (พักถาวร) · legato maps · crossfade 2 ชั้น (= "เชลโล 2 ตัว" ที่ทำ Iowa พัง) · ไวโอลิน (รอ sample ดีพอ) · เอาเชลโลเข้า SongView จริง (รอพี่เอมเคาะว่าเชลโลผ่าน)

## 💡 ไอเดียเผื่ออนาคต (ยังไม่จ่าย · รอพี่เอม)
- ดึงเทคนิคเปียโน golden ทำ preset "เปียโนบรรเลง" ให้เลือกใน SongView (memory `pleng-cello-piano-spike`)
- ในโฟลเดอร์ `sfz/` มี GM banks/drums/brass/trumpet เพิ่ม — เผื่อขยายเครื่องดนตรีในอนาคต (ประเมิน license + ขนาดก่อน)

---
## Log
- **2026-07-18 (ต่อ):** เชลโล+treble-tame = พี่เอมว่า "นุ่มขึ้นจริง แต่มีเสียงคล้ายกดแตร" → หน้าฟังเพิ่ม **นาฬิกา + ชื่อโน้ตที่กำลังเล่น** (setInterval · map midi→ชื่อโน้ต+ไฟล์ Karoryfer) ให้พี่เอมชี้เวลา artifact เจาะจง + **แถบ "ความนุ่ม" (trebleTameDb 0-16)** ให้พี่เอมหมุนเอง (re-render เฉพาะ cello clip) · รอ: (1) เลขความนุ่มที่พอดี (2) เวลา/โน้ตของ "เสียงกดแตร" → ตามไปวัดสเปกตรัมโน้ตนั้น
- **2026-07-18:** ตั้งที่นั่ง music composer · สร้าง worktree `music-standing` (fork `cello-vib-arc`) · เขียน `composer.md` + board นี้ · ยืนยัน sound source ย้ายมา OneDrive `sfz/` · แจ้ง PM
