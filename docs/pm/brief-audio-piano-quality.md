# Brief (SA · สายเสียง/arrangement) — "ทำเพลงให้เพราะ" เปียโนเดี่ยว (ต่อยอด B107)

**สาย:** SA/audio (งานสร้างสรรค์ · **P'Aim iterate ตรงกับ session นี้**) · **PM เกาะติด:** report เข้า board inbox ทุกครั้ง · **ฐาน:** `studio-shell-redesign`
**operating model:** งานเสียง/creative = P'Aim คุยตรงกับสายนี้ (memory `feedback_paim_direct_sa_creative`) · **PM เข้าตอน merge+publish+QA gate** · **ห้าม merge/deploy เอง**

## Objective (คำ P'Aim)
ปั้นเสียง **เปียโนเดี่ยว** ให้เพราะระดับพรีเมียม กินใจ ไม่น่าเบื่อ (playback ในแอป)

## SSOT อ่านก่อน
- `docs/ds/instrument-arranger-p2.md` (B107 P2 · arranger 3 ชั้น + instrument module) · handoff `docs/reports/b107-p2-sa-handoff.md`
- arranger code `src/lib/arranger/*` · memory `pleng-smplr-offline-render` (offline render + big-lookahead scheduler) · มี `window.__peaks()` สำหรับจูน (ค่าเป็น named const)

## ⭐ งานแรก — audit ของเดิมก่อน (เทียบ checklist P'Aim)
ตรวจว่า arranger เปียโนเดี่ยวปัจจุบัน **เปิดใช้จริงครบไหม** แล้วรายงาน gap (มี/ยังไม่มี ต่อข้อ · อ้างไฟล์:บรรทัด):

### A. ต้องมี + ล็อกเป็นมาตรฐาน (checklist เดิม P'Aim)
- [ ] **Dynamic Weight** — บีต 1 ของห้องเน้นหนักสุด บีตอื่นลดหลั่น (มีชีพจร ไม่ทื่อ)
- [ ] **Melodic Contour** — ทำนองไต่ขึ้น = ดังขึ้น · ปลายวรรค = ผ่อนเบา
- [ ] **Humanize** — สุ่มน้ำหนักนิ้ว **±6%** + หน่วงเวลา **±12ms** (พริ้วเหมือนคนเล่น) *(ค่าตั้งต้น — ยืนยัน/จูนกับ P'Aim)*
- [ ] **Pedal Bass** — เบสมือซ้ายลากยาวเต็มคอร์ด (โอบอุ้ม ลุ่มลึก)
- [ ] **Felt Piano (โหมดสงบ)** — low-pass ตัดแหลม **~1.5kHz** เสก Grand → ทุ้มนุ่ม (ท่อนอธิษฐาน · ไม่โหลดไฟล์ใหม่)
- [ ] **ปุ่มเปิด-ปิดลูกเล่นตามโหมด:** เดี่ยว/คอร์ดเดี่ยว = ตรงเป๊ะทื่อ (ปิดลูกเล่น · ฝึกแกะง่าย) · คอร์ด+ทำนอง = สวิตช์ปิด(นิ่ง)/เปิด(พลิ้ว)

### B. ไอเดียใหม่ (เพิ่มให้เป็นร่างทอง — เสนอ + คุย P'Aim ก่อนทำ)
- [ ] **Generative Embellishments** — สุ่ม "ประกายอ็อกเทฟสูง (sparkle)" + "เดินโน้ตส่งในช่องว่าง (gap-fill)" ~15-20% → ฟังแต่ละรอบไม่ซ้ำ เหมือนเล่นสด
- [ ] **Added Tension (CCM)** — โหมดลูกเล่นจัดเต็ม เติม add9/maj7 อัตโนมัติ → เนื้อเสียงอิ่ม หรูอุ่นแบบเพลงโบสถ์ร่วมสมัย
- [ ] **Rubato** — หน่วงบีตสุดท้ายของประโยค ~10% → "ลมหายใจ" ก่อนเปลี่ยนท่อน กินใจ

## วิธีทำงาน
1. **audit A ก่อน** → รายงาน gap เข้า board inbox + `docs/reports/audio-piano-quality-audit.md` (ให้ P'Aim + PM เห็นภาพว่ามีอะไรแล้ว/ขาดอะไร)
2. จากนั้น **iterate กับ P'Aim ตรงๆ** ทีละข้อ (B ก่อนทำต้องเคาะกับ P'Aim) · จูนด้วย `window.__peaks()`/หูฟัง
3. **audio = วัด output จริง** (AnalyserNode/OfflineAudioContext peak) + ฟังหู ไม่ใช่ "fire ไม่ error" (memory `feedback_heard_bugs_prove_by_ear`)
4. เปิด `--host` + Network URL ให้ P'Aim ฟังบนมือถือจริง · **ห้าม merge/deploy** — ping PM มา gate

## รายงานกลับ (session-agnostic — PM หมุน session อย่า hardcode ชื่อ)
`docs/reports/<branch>.md` + บรรทัดใต้ `## 📥 inbox → PM` ใน `docs/pm/board.md` + ping PM ปัจจุบัน (board §RESUME) ทุกครั้งที่มี milestone/decision — PM จะได้เกาะติดตามที่ P'Aim ต้องการ
