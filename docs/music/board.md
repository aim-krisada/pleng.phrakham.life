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

**🎧 คำถามที่รอหูพี่เอมเคาะ (ห้ามเดาแทน):**
1. เชลโลตอนนี้ (marcato + normalize + vibrato-โน้ตยาว) **"ไม่แสบแล้ว/ลื่นหูพอ"** หรือยัง? → ถ้าใช่ = **จบเชลโล** (เหลือแค่คุยเรื่องเอาเข้า SongView จริง)
2. arc (ความกว้างดัง-ค่อย) เปิดแล้วเพราะขึ้นหรือรก? เปียโนเปลี่ยนรับได้ไหม?
3. vibrato depth เท่าไรพอดี (เคยชอบ 22 cents แต่ว่า "ดังขึ้น + อย่าคงที่")

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
- **2026-07-18:** ตั้งที่นั่ง music composer · สร้าง worktree `music-standing` (fork `cello-vib-arc`) · เขียน `composer.md` + board นี้ · ยืนยัน sound source ย้ายมา OneDrive `sfz/` · แจ้ง PM
