# US-I2 — SSOT ชื่อไฟล์ = `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>`

**Worktree:** WT-0 integration · **Branch:** `wt0-integration` · **Port:** 5301 · **คู่ DS:** `ds/wt0-integration/DS-I2-filename-ssot.md`
**สถานะ:** spec (ทำได้เลย) · **ที่มา:** report WT-C ⚠️ (P'Aim เคาะ format)

## User Story
**ในฐานะ** คนที่ดาวน์โหลดเพลง (JSON หรือ PDF)
**ฉันต้องการ** ให้ชื่อไฟล์เป็นรูปแบบเดียวกันเสมอ = `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>`
**เพื่อ** ไฟล์เป็นระเบียบ รู้ทันทีว่ามาจากเว็บไหน เพลงอะไร

## Acceptance Criteria
- [ ] `songName.js` มี constant `SITE_NAME = 'เพลง.พระคำ.ชีวิต'` (แหล่งเดียว ไม่ hardcode ซ้ำ)
- [ ] `songBasename(song)` = `` `${SITE_NAME} - ${song.title_th || 'แผ่นเพลง'}` `` แล้วตัดอักขระต้องห้าม (`\ / : * ? " < > |`) + trim — **ไม่มีเลขเพลง**
- [ ] JSON (`DownloadTool`) และ PDF ใช้ `songBasename` ตัวเดียวกัน → ชื่อไฟล์ตรงกัน
- [ ] `songName(song)` (รูปแบบ list "N. ชื่อ") **แยกจากชื่อไฟล์** — คงไว้ให้หน้ารายการใช้ (dev รอบก่อนเอามาปนกับชื่อไฟล์ = แก้)

## นอกขอบเขต
- `EditorMode.downloadJson` ให้มาใช้ lib นี้ = US-I5 (รอ WT-D)
