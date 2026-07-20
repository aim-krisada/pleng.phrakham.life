# Brief — "เน้นจังหวะแรก" เบาลง + ปรับได้เอง (สไลเดอร์ · default ต่ำลง)

**สายงาน slug:** `accent-soften` · **branch:** fork ฐานล่าสุด `studio-shell-redesign`
**PM ปัจจุบัน:** `pm26` · **ห้าม merge/deploy เอง** · **งานเสียง — P'Aim iterate ตรงกับสายได้ (creative/audio)** · PM gate ตอนจบ

## โจทย์ (P'Aim ฟัง live รอบ 27 · 16 ก.ค.)
"เน้นจังหวะแรก" (metric accent) **กระแทกแรงไป** — อยากให้เบาลง · ทางที่เลือก = **ทำเป็นสไลเดอร์ปรับได้เอง + ตั้ง default ให้เบากว่าที่เป็นอยู่** (ได้ทั้งเบาลงทันทีสำหรับคนทั่วไป + คนอยากปรับก็ได้)

## ของเดิม (verify ก่อนแก้)
- `src/lib/arranger/dynamics.js` `metricAccent()` — downbeat×0.92 · mid×0.86 · beat อื่น×0.82 · off-beat×0.8 (spread [0.8,0.92] · เคยแคบลงแล้วรอบ 14 ก.ค. แต่ P'Aim ยังว่าแรง)
- `src/lib/arranger/techniques.js` — entry `key:'accent'` เป็น **toggle** (เปิด/ปิด · `dynamics.accent`)
- เมนู "ปรับละเอียด" (viewer) render จาก TECHNIQUES

## งาน
1. **ทำ accent ปรับความแรงได้ (level):** เพิ่ม cfg param (เช่น `dynamics.accentLevel` 0..1) ให้ `metricAccent` สเกล**ระยะห่างจาก 1.0** ตาม level — `0` = ไม่เน้นเลย (แบน ทุกบีต×1.0) · `100%` = spread เต็ม · **default ตั้งต่ำลงกว่าปัจจุบัน** (เสนอ ~35-45% = เบากว่าที่ได้ยินตอนนี้ชัด · SA/P'Aim จูนด้วยหู)
2. **เปลี่ยน entry `accent` ใน techniques.js: toggle → slider** (0-100% · step 10 · 0=ปิด) feed `accentLevel` · label/hint เดิม ("เน้นจังหวะแรก") ปรับ hint บอกปรับความแรงได้
3. **default preset** ("บรรเลง"/ที่ใช้จริง): ตั้ง accentLevel เริ่มต้นให้เบาลง (ค่าที่ P'Aim เคาะด้วยหู)
4. เป็น pure ใน arranger → live กับ MP3 ตรงกัน (ตามแพทเทิร์น golden-piano)

## verify + DoD
- ปรับสไลเดอร์แล้วได้ยินความแรง accent เปลี่ยนจริง (0=แบน · สูง=เน้นชัด) · **default เบากว่าเดิมชัดด้วยหู** (P'Aim ฟันธง)
- unit: accentLevel 0 → ทุกบีต factor=1.0 (ไม่มี accent) · level สูง → downbeat เด่นสุด · persist ค่าเหมือน technique อื่น
- `npm test` เขียว + `vite build` · **P'Aim ฟัง live เคาะ default final**
- ⚠️ **ไม่ชน:** แตะ `dynamics.js` + `techniques.js` (+preset) เท่านั้น · ไม่แตะ styles/icons/Guide/ShellBar (สาย cleanup-round ถือ)

## Setup + รายงานกลับ
- verify fork ฐานล่าสุด `studio-shell-redesign` (`git merge-base`) · ผิด → `git switch -c accent-soften studio-shell-redesign`
- `npm install` → dev `--host` → **Network URL (clickable)** ให้ P'Aim ฟัง+ลากสไลเดอร์
- **ห้าม merge/deploy เอง** · รายงาน: `docs/reports/accent-soften.md` + board §📥 inbox + ping **pm26**
