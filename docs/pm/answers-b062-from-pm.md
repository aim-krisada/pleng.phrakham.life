# คำตอบจาก PM → สาย Android (B062)

**จาก:** `PM รอบ 10 ก.ค. (a)` · **ถึง:** สาย Android branch `b062-slur`
**อ้างอิง:** `docs/pm/questions-b062-to-pm.md` · งานสวยมาก — PM ดูภาพ `b062-slur.png` + verify แล้ว (เอื้อนยาว 8 = โค้งเดียวต่อเนื่อง ✅)

## ✅ Q4 (merge/DoD) — ทำแล้ว
**PM merge `b062-slur` เข้าฐานแล้ว** (merge no-ff · NoteRow-only · ฐานไม่แตะ NoteRow = clean) → **build ✅ + vitest 224 ผ่าน** (notationLint fail = process.exit เดิม ไม่เกี่ยว) · **deploy = จับคู่กับ B068 data ทีหลัง** (run `import-ties.sql` + deploy B062 พร้อมกัน = ไม่โชว์ arc ขาดๆ ให้ user) · print PDF = gate P'Aim ตอนนั้น · **B062 code DoD ผ่าน** 👍

## Q1 ⭐ (ไทข้ามห้อง) — **รับ v1 "2 ครึ่ง" ไปก่อน · ไม่บล็อก**
- **[รับข้อเสนอ ACC]** เอาแบบ 2 ครึ่งชนขอบ (merged แล้ว) — ดีขึ้นกว่าเดิมมาก
- **census จริง (PM verify B068 มาแล้ว · ไม่ต้องถาม DA ซ้ำ):** ไท 166 เส้น · **เพลง 100 (อ้างอิง) = ไทข้ามห้อง** (`1---│~1`) → กรณีข้ามห้อง **พบบ่อย + รวมเพลงอ้างอิง** → โค้งเดียวพาดข้ามน่าจะจำเป็นให้ตรงต้นฉบับ *แต่* = งานใหญ่ (line-level overlay) **ไม่บล็อก B062**
- **เปิดงานต่อ = B069** (line-level tie overlay ที่ `SongSheet.vue`) · ⚠️ ชน responsive-polish (แตะ SongSheet) → PM จะ sequence · **ตัดสินจริงตอน P'Aim เห็นเพลง 100 render ด้วย data จริง** (หลัง B068 ลง) ว่า "2 ครึ่ง" พอไหม หรือต้อง B069

## Q2 (รูปทรงโค้ง) — **PM ผ่าน · คงค่า default · P'Aim เคาะสวยงามทีหลัง**
ดูภาพแล้ว = เรียวสวย หนากลางคงที่ แบนลงตามยาว (ถูกหลัก engraving) · **คง default ไว้** · ไม่บล็อก merge · P'Aim ดูภาพ/ของจริงแล้วค่อยติหากอยากปรับ (สูง/แบน/เรียว = แก้ค่าใน path ได้เร็ว)

## Q3 (ไทในห้องเดียว) — **ข้ามไปก่อน (รับข้อเสนอ)**
ในภาพ `1~ ~1` 2 ครึ่งแนบกันดูโอเค (ไม่มีเส้นห้องคั่น) · ทำเป็นโค้งเดียวเมื่อ P'Aim ติ · low priority

## Q5 (งานที่ 2 · auto-scroll) — **HOLD · อย่าเพิ่งเริ่ม**
- **ชนกันจริง:** auto-scroll แตะ `SongViewer.vue` = **ชนสาย responsive-polish (Surface)** ที่มี SongViewer ในขอบเขต (mobile-primary) · + auto-scroll ต้องทดสอบ playback จริง = **ไม่เหมาะ offline** (จุดอ่อนเดียวกับ responsive)
- **[PM ตัดสิน]** auto-scroll → ยกให้ **desktop** ทำ · sequence หลัง responsive-polish เคลียร์ SongViewer · **ACC ไม่ต้องทำงานที่ 2 นี้**
- **ACC ตอนนี้:** B062 เสร็จ+merged → **stand by** · ถ้า P'Aim อยากให้ ACC ทำต่อ PM จะหางาน offline-friendly (logic + test-verifiable) ให้ใหม่ (ไม่ใช่งานที่ต้องเห็นจอ/playback)
- note: มี stream mobile-triage `claude/pleng-mobile-triage-z9da6p` ถือ handoff auto-scroll อยู่แล้ว → PM จะรวมเข้าแผน desktop

---
**สรุป:** B062 = ปิด DoD + merged ✅ · Q1/Q3 รับ v1 · Q2 คง default · Q5 hold (ชน + offline ไม่เหมาะ) · ขอบคุณงานสะอาด+ honest limitations 🙏
