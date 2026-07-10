# Brief — DockKey phase 2: แผ่นเพลง + แก้ไข + เสียบ MP3 (dev = สาย dockkey-dev เดิม)

**สั่งโดย:** pm4 (P'Aim เคาะ 10 ก.ค.) · **ต่อจาก:** สาย dockkey-dev (เจ้าของ DockKey.vue engine)
**P'Aim ยืนยัน:** (1) หน้าฝึกร้อง DockKey ตัวล่าสุด (fit-content 383px) **OK** (2) approve design ครบ 3 หน้า (3) **เอา MP3 ใส่ใน DockKey ใหม่** (ไม่ใช่ dock เดิม)

## สถานะตั้งต้น
- **หน้าฝึกร้อง DockKey = build เสร็จ + P'Aim accept** (branch `dockkey-dev` · `3d44d94` fit-content)
- **แผ่นเพลง + แก้ไข = design เสร็จ (approve) ยังไม่ build** → spec = `docs/ds/dockkey-print-edit.md` (ITEMS_PRINT / ITEMS_EDIT descriptor · อยู่ในฐานแล้ว)
- **audioExport lib merged เข้าฐานแล้ว** (`fb10927` · `audioExport.songToMp3Blob(content,{onProgress})` + `estimateMp3`) — เรียกได้ทันที

## งาน (ทำบน branch `dockkey-dev` ต่อ · sync ฐานล่าสุดก่อน)
0. **sync ฐานล่าสุด** (`studio-shell-redesign` HEAD ปัจจุบัน มี audioExport + fixes เยอะ) เข้า branch — merge/rebase ตามถนัด · แก้ conflict (SongViewer/EditorMode/SongSheet ที่ฐานขยับ) · รัน test ให้เขียวก่อนเริ่มของใหม่
1. **หน้าแผ่นเพลง (แผ่นเพลง):** เสียบ DockKey เข้า `Studio.vue` (หน้าพิมพ์) ป้อน **ITEMS_PRINT** (จาก DS) → row1 Grip·พิมพ์·Aa·⚙ + ตัวเลือกแผ่นเพลง/คอร์ด/คีย์/ดาวน์โหลดใน ⚙
2. **หน้าแก้ไข (แก้ไข):** เสียบ DockKey เข้า `EditorMode.vue` แทน StudioDock เดิม ป้อน **ITEMS_EDIT** (จาก DS) → รวม schema ext E1–E3 (band แป้นโน้ต `kind:'keys'` · ปุ่มหลัก `prime` · gating `showWhen:'loggedIn'`) · **ระวังของเดิมพัง:** undo/redo(B075) · beat-check(B073) · preview(pip) · แป้นโน้ต insert · อย่าให้ regress
3. **เสียบ MP3 เข้า DockKey (ทั้ง 3 หน้าที่มีเมนู download/export):** เมนู export เดียว **PDF/JSON/MP3** ใน ⚙ (หรือ item ที่เหมาะ) → MP3 เรียก `audioExport.songToMp3Blob` + **progress %/ETA** (reuse แพตเทิร์นใน `DownloadTool.vue`) · ชื่อไฟล์=ชื่อเพลง.mp3
4. **เอกภาพ 3 หน้า:** dock เดียวกัน (fit-content · grip ซ้าย · ⚙ ขวา) ต่างแค่รายการปุ่ม · หลังเสร็จ **ปลด StudioDock เดิม** ได้ (ถ้าไม่มีใครใช้แล้ว)

## รั้ว
- **แตะได้:** `DockKey.vue` · `SingTransport.vue` · `SongViewer.vue` · `Studio.vue` · `EditorMode.vue` · `StudioDock.vue`(ถอด) · descriptor · (import `audioExport` ที่ merged)
- **⛔ ห้ามแตะ:** `styles.css` (สาย favicon-footer) · `ShellBar.vue`/`App.vue` (favicon-footer) · `songSearch.js` (search-555) · `NoteRow.vue`
- ⚠️ **สาย favicon-footer + search-555 กำลังวิ่ง** (คนละไฟล์) · **สาย mp3-dock-wire = ยกเลิก** (ยกงานเสียบ MP3 มาที่นี่แทน · audioExport เป็น lib กลางแล้ว)

## DoD + รายงาน
- vitest ผ่าน (`--exclude '**/.claude/**' --exclude '**/node_modules/**'`) + build · dev **`--host`** + **Network URL**
- verify เบราว์เซอร์ **3 หน้า (ฝึกร้อง/แผ่นเพลง/แก้ไข)** dock เหมือนกัน + ปุ่มครบ + MP3 โหลดได้จริง (progress เห็น) + ของเดิมหน้าแก้ไขไม่ regress (undo/beat/preview/แป้นโน้ต) · console 0
- **P'Aim gate:** LAN ลอง 3 หน้าจริงก่อน merge (โดยเฉพาะหน้าแก้ไข = ซับซ้อนสุด)
- รายงานกลับ: (1) `docs/reports/dockkey-phase2.md` (2) board §📥 inbox (3) ping **pm4** · ⛔ ห้าม merge/deploy เอง
