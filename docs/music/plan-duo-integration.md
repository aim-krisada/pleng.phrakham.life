# แผน — Piano + Cello "ร่างทอง" Duo (เป้าหมายสูงสุด P'Aim)

**เป้าหมาย (P'Aim 18 ก.ค.):** ในแอปเหลือ **2 เสียงเท่านั้น** — `🎹 Piano` (golden เดิม) และ `🎹🎻 Piano + Cello duo`
(ตัดเสียงอื่นออกหมด) · เชลโล = สูตรกลางที่จูนผ่านหูแล้ว

---

## สถานะ: เสียงเสร็จ · ที่เหลือคือ "integration"
- ✅ **เทคนิคเชลโล + ค่าที่ผ่านหู = เสร็จ** (spike `celloBakeoff.js renderClip` · verify หลายเพลง)
- ❌ **ยังอยู่ในแล็บ** — spike แยกจากเครื่องยนต์จริง (`midi.js` เล่นสด · `audioExport.js` โหลด MP3) ที่ผู้ใช้ใช้
- **โจทย์จริง = ย้ายเทคนิคเข้า path จริง โดย (ก) ไม่พังเปียโนที่ deploy แล้ว (ข) MP3 == เล่นสด (ค) เป็นสูตรกลางทุกเพลง**

## 🏛 การตัดสินใจสถาปัตย์ (สำคัญสุด · แนะนำ)
**ทำ "โมดูลเชลโลกลาง" ตัวเดียว** (`src/lib/arranger/cello.js` หรือคล้าย) ที่ **ทั้ง spike และแอปจริง import ตัวเดียวกัน**
- เหมือน `arrange()` (golden piano) ที่ใช้ร่วม live + MP3 = source เดียว ไม่ดริฟต์
- แล็บ (Sound Lab backlog) กับแอปจริงเรียกโค้ดเดียวกัน = จูนที่เดียว มีผลทุกที่
- ⛔ อย่า copy โค้ด spike ไปแปะใน `midi.js`/`audioExport.js` (จะดริฟต์ · แก้ 2 ที่)

โมดูลนี้รับ `PerfEvent[]` (จาก `arrange()`) + AudioContext → เล่น voice melody ด้วย sampler เชลโล พร้อมเทคนิคครบ
(marcato head · negative delay · per-file normalize · shift-based treble tame · tail darkening · dynamics compressor · vibrato auto-rule · chamber reverb ถ้าเอา) ด้วย **ค่า default ที่ผ่านหู** (ฝังตายตัว — ผู้ใช้ไม่เห็นปุ่ม)

## เฟส

### เฟส 0 — Music seat (ผม · เตรียมของให้ dev graft ได้)
1. **ล็อกค่า preset สุดท้าย** ของ Piano+Cello duo (จากที่ผ่านหู) เป็นชุดค่าคงที่ 1 ชุด
2. **แยกเทคนิคออกจาก spike → โมดูลกลาง** (pure-ish · รับ ctx+perf+cfg) ที่ spike เดิมก็เรียก
3. **Ship sample เชลโล** — commit `p` body + `mp` staccato head (Karoryfer **CC0** ปลอดภัย · ~1-1.3 MB) เข้า `public/samples/` + lazy-load (โหลดตอนเลือก duo เท่านั้น) + เช็ก PWA precache
4. **ส่งมอบ:** โมดูล + preset + sample + เอกสาร "จุดต่อ" ให้ dev

### เฟส 1 — Dev + PM (ต่อเข้าเครื่องยนต์จริง)
5. เรียกโมดูลเชลโลใน **`midi.js` (เล่นสด)** + **`audioExport.js` (MP3)** — หลัง `arrange()` เดิม เพิ่ม cello voice บน melody
6. **`soundOptions.js`** = เหลือ 2 ตัวเลือก (Piano / Piano+Cello) · ปลด `disabled:true`
7. ⚠️ **ห้ามแตะการเล่นเปียโนเดิม** — เพิ่ม cello เป็น layer เสริม เปียโนต้องเหมือน deploy เป๊ะเมื่อเลือก "Piano"
8. verify **MP3 == live** (deterministic · seeded) · verify เปียโน "Piano" ไม่เปลี่ยน

### เฟส 2 — UX + Dev (หน้าเลือกเสียง)
9. ปุ่มเลือกเสียงใน SongView = 2 ตัวเลือกสะอาด (`SoundControl.vue`) · ตัด option อื่นทิ้ง
10. default = ? (ดูการตัดสินใจข้างล่าง)

### เฟส 3 — Tester + PM → Deploy
11. QA ทั้งคลัง (สุ่มหลายเพลง) + หลาย device · เชลโล lazy-load ทำงาน · ไม่มี regression เปียโน
12. P'Aim ฟัง sign-off ในแอปจริง (ไม่ใช่แล็บ) → **P'Aim สั่ง deploy** (ห้าม deploy เอง)

## 🔸 การตัดสินใจ (P'Aim เคาะแล้ว 18 ก.ค.)
1. ✅ **default = Piano** (Duo เป็นตัวเลือก · กันเน็ตช้าโหลด sample โดยไม่ตั้งใจ)
2. ✅ **มี duo ทุกเพลง** (สูตรกลาง)
3. ✅ **ซ่อนเสียงอื่นไว้ก่อน ไม่ลบ** — soundOptions ใส่ flag `hidden` (ไม่แสดงใน UI) แต่โค้ด/preset ยังอยู่ เผื่ออยากเอากลับมา (⛔ อย่า delete)
4. **chamber reverb** — ยังไม่เคาะ · **P'Aim ขอฟัง cello เดี่ยวให้มั่นใจก่อน (ก่อน ensemble)** → เลื่อนไปเคาะตอน sign-off

## ⭐ ก่อน integration: P'Aim ขอฟัง "เชลโลเดี่ยว" ให้มั่นใจก่อนรวมวง (18 ก.ค.)
เพิ่มปุ่ม **🎻 เชลโลเดี่ยว (ไม่มีเปียโน)** ในหน้าฟัง (`cello-listen.html`) แล้ว · ฟังเชลโลล้วนทุกเพลง + จูนได้ · **ต้องผ่านหูเดี่ยวก่อน แล้วค่อยเดินเฟส 0**

## 🖥 Dashboard/แล็บจูนเสียง (admin/editor เท่านั้น) = ต่อยอด Sound Lab
P'Aim อยากมี dashboard จูน cello สำหรับ editor/admin → ตรงกับ backlog `backlog-sound-lab.md` (team-only) · **โมดูลเชลโลกลาง (เฟส 0) = ใช้ทั้ง dashboard และแอปจริง ตัวเดียวกัน** = ทำเฟส 0 ได้ทั้ง 2 ทางพร้อมกัน

## ความเสี่ยง
- **แตะเปียโน deploy** = เสี่ยงสุด → โมดูลเชลโลต้อง "บวกเพิ่ม" ไม่ใช่ "แก้ arrange" · gate ด้วย test เปียโน byte-identical
- **ขนาด sample / PWA offline** → lazy-load + วัดขนาดจริง
- **cross-team** = PM ต้องคุมคิว (music→dev→ux→tester) · music seat ทำเฟส 0 แล้วส่งไม้

## อ้างอิง
`docs/reports/cello-tech-summary.md` (เทคนิค) · `docs/music/board.md` (สถานะ) · `docs/music/backlog-sound-lab.md` (แล็บ = reuse โมดูลเดียวกัน)
