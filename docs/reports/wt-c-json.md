# รายงาน — wt-c-json (WT-C JSON พกพา)
**รอบ:** 4 — WT-C ครบทุก US: C01 ดาวน์โหลด · C02 อัปโหลด · C03 ส่งอีเมลขออนุมัติ · C04 validate (+ ชื่อไฟล์ JSON=PDF)
**สถานะ:** lib + ปุ่มใน DownloadTool เสร็จครบ C01–C04 · การต่อสายในโหมดแก้ไข (manageUpload / currentSong) รอ WT-0

## ทำอะไรไปบ้าง (ต่อ US)
- **US-C01 ดาวน์โหลดเพลงเป็น JSON: ✅**
  - รวม logic "เพลง ↔ ไฟล์ JSON" ไว้ที่ `src/lib/jsonIO.js` (ใหม่): `exportSong` (เฉพาะฟิลด์พกพา `number/title_th/title_en/content` ตัดฟิลด์ของ viewer เช่น `id` → round-trip ครบ), `downloadSong` (Blob + ดาวน์โหลด)
  - ต่อสาย `DownloadTool.vue` ให้เรียก `downloadSong`
- **เพิ่ม (คำขอพี่เอม รอบนี้): ชื่อไฟล์ JSON = รูปแบบเดียวกับ PDF**
  - แยก "แกนตั้งชื่อเพลง" ออกเป็น core lib ใหม่ `src/lib/songName.js` — `songName(song)` = `"12. ชื่อเพลง"` (รูปแบบเดียวกับที่หน้ารายการเพลงแสดง), `songBasename(song)` = ตัวเดียวกันแต่ตัดอักขระที่ตั้งชื่อไฟล์ไม่ได้ออก
  - ดาวน์โหลด JSON → ใช้ `songBasename(song) + '.json'`
  - บันทึกเป็น PDF → `printPdf()` เซ็ต `document.title = songBasename(song)` ก่อน `window.print()` (เบราว์เซอร์ใช้ค่านี้เป็นชื่อไฟล์ที่แนะนำในกล่องบันทึก) แล้วคืนชื่อเว็บกลับตอน `afterprint`
  - ผล (โครงสร้าง): JSON กับ PDF ใช้ฐานชื่อเดียวกันจาก lib เดียว — ✅ กลไก reuse ทำงาน
  - ⚠️ **แต่ format ที่ dev ใส่ (`"12. ชื่อเพลง"`) ผิด** — พี่เอมต้องการ `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>` · format จริงยกให้ SA ออกแบบ (ดูหัวข้อข้อเสนอแนะ) · ยังไม่ finalize
- **US-C02 อัปโหลด JSON มาเปิด (on-demand): ✅ (lib)** — `importSong(file)` / `parseSongText(text)` / `validateSong(obj)` ใน `jsonIO.js` · อ่านไฟล์ → validate → คืน song object · **ไม่เรียก store/DB** (pure logic, on-demand ล้วน) · round-trip กับ C01 ครบ
- **US-C04 ตรวจไฟล์ก่อนเปิด: ✅ (lib · มาคู่ C02)** — validate โครงเพลง (v1/v2) ก่อนเปิด · v1 → แปลงเป็น v2 อัตโนมัติ (ผ่าน `songModel.migrateToV2` เรียกใช้เฉย ไม่แก้) · ไฟล์เสีย/ไม่ใช่เพลง → คืน `error` เป็นข้อความภาษาคน ไม่ throw/crash
- **การต่อสาย UI อัปโหลด = รอ WT-0** — เมนู "จัดการ → อัปโหลด JSON" (`manageUpload`) อยู่ใน `EditorMode.vue` (ไฟล์ WT-0) ยังใช้ parse inline เดิม (error รวมๆ ว่า "ไฟล์ JSON ไม่ถูกต้อง") · ขอ WT-0 เปลี่ยนมาเรียก `jsonIO.importSong` จะได้ validate + error ภาษาคนตาม C04 (ดูข้อสังเกต)
- **US-C03 ส่งเพลงขออนุมัติทางอีเมล: ✅** — เพิ่มปุ่ม "✉️ ส่งเพลงนี้ขออนุมัติเข้าคลัง" ใน DownloadTool · กดแล้ว (1) ดาวน์โหลด JSON ให้ (2) เปิดอีเมล (`mailto:`) ถึงทีม พร้อมหัวข้อ/เนื้อความตั้งต้น + คำเตือน "กรุณาแนบไฟล์ที่เพิ่งดาวน์โหลด" (mailto แนบไฟล์เองไม่ได้) · **ไม่เก็บอะไรในระบบ** · อีเมลทีม = ค่าคงที่ `TEAM_EMAIL` จุดเดียว (ตอนนี้ `pleng@phrakham.life` — ⚠️ รอพี่เอมยืนยันอีเมลจริง)

## ไฟล์ที่แก้ (อยู่ในขอบเขต DS-C01–C04 + core lib ใหม่)
- `src/lib/songName.js` — **ใหม่** · core lib ตั้งชื่อเพลง (reuse ได้)
- `src/lib/jsonIO.js` — **ใหม่** · export/download (C01) + import/validate (C02/C04) + submit-email (C03) · pure ไม่แตะ store/DB (ยกเว้นตัวสั่งงานที่เปิด mailto/ดาวน์โหลด)
- `src/components/DownloadTool.vue` — 3 ปุ่ม: ดาวน์โหลด JSON · พิมพ์ PDF (ตั้งชื่อด้วย `songBasename`) · ส่งขออนุมัติ (`submitForApproval`)
- `src/lib/songName.test.js`, `src/lib/jsonIO.test.js` — **ใหม่** · unit test

## ผลทดสอบ
- **unit:** ทั้งชุด 36/36 ผ่าน (songName 5 · jsonIO 19 [export/filename/validate/parse/import/mailto] · ที่มีอยู่เดิม 12) · `npm run build` ผ่าน
- **end-to-end (จริงบนแอปที่รัน · import lib จริงในบันเดิล):**
  - C01: กดดาวน์โหลด JSON → ไฟล์ `12. พระเจ้าดีต่อฉัน.json` · กดพิมพ์ → `document.title` = `12. พระเจ้าดีต่อฉัน` ตอน print แล้วคืนชื่อเว็บ
  - C02 round-trip: `exportSong` → text → `parseSongText` → ได้เพลงเดิมเป๊ะ
  - C04: ไฟล์ v1 → แปลงเป็น v2 (`isV2` = true) · JSON เสีย → `"ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้ (โครงสร้างเสีย)"` · JSON ไม่ใช่เพลง → `"ไฟล์นี้ไม่มีเนื้อเพลง/ทำนอง..."` · ไม่มีไฟล์ → `"ไม่พบไฟล์"` (ทุกเคสไม่ crash)
  - C03: เมนู DownloadTool มีปุ่ม "✉️ ส่งเพลงนี้ขออนุมัติเข้าคลัง" · `buildSubmitMailto` → `mailto:pleng@phrakham.life` หัวข้อ "ขอเสนอเพลงเข้าคลัง: <ชื่อ>" เนื้อความมีชื่อเพลง + ชื่อไฟล์ `.json` + คำเตือนแนบไฟล์ · *การเปิดโปรแกรมอีเมลจริง = ทดสอบด้วยมือ (ตาม DS-C03)*
- **วิธี tester ลอง:** เปิด `http://localhost:5304` → โหมดแก้ไข เมนู "จัดการ → ดาวน์โหลด JSON" (ดูชื่อไฟล์) → "อัปโหลด JSON" เอาไฟล์กลับมาเปิด · refresh แล้วหาย (ยืนยันไม่เก็บ) · *หมายเหตุ: ปุ่มอัปโหลดตอนนี้ยังใช้โค้ดเดิมของ WT-0 · lib validate ใหม่จะเห็นผลเมื่อ WT-0 ต่อสาย*

## ⚠️ ข้อเสนอแนะถึง SA — ออกแบบ library กลางตั้งชื่อไฟล์ (คำขอพี่เอม)
**พี่เอมแก้: รูปแบบชื่อไฟล์ที่ถูกต้องคือ** `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>`
เช่น `เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก` (ชื่อเว็บ + " - " + ชื่อเพลง) — **ไม่ใช่** `"12. ชื่อเพลง"` ที่ dev เดาไว้รอบนี้
**สถานะ format ตอนนี้ = ชั่วคราว/ผิด** — โค้ดในสาขานี้ยังใช้ `"12. ชื่อเพลง"` (interim) รอ SA ออกแบบ format จริง ยังไม่ finalize

**สิ่งที่ขอ SA วิเคราะห์/ออกแบบ (พี่เอมมอบให้ SA):**
1. **format มาตรฐาน** — ยืนยัน `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>` · ใส่เลขเพลงไหม · เว้นวรรค/ขีดแบบไหน (`-` หรือ `—`) · ตัดอักขระต้องห้ามยังไง
2. **โครง library กลาง** — วางไว้ที่ไหน (dev เริ่มไว้ที่ `src/lib/songName.js` เป็นตุ๊กตา) · ใครเป็นเจ้าของ (ข้ามหลาย worktree) · ชื่อเว็บ ("เพลง.พระคำ.ชีวิต") ดึงมาจาก config/constant ตัวไหน (อย่า hardcode ซ้ำ)
3. **จุดที่ต้องมา reuse** (ตอนนี้ต่างคนต่างตั้งชื่อ):
   - `DownloadTool.vue` (WT-C) — ดาวน์โหลด JSON + ตั้งชื่อ PDF (ทำผ่าน `document.title`)
   - `EditorMode.vue` (WT-0) — `downloadJson` inline (`title + '.json'`)
   - โหมดพิมพ์แผ่น (WT-B) / export ของ WT-D ถ้ามี
4. **สั่ง WT-0** ให้ `EditorMode` มาเรียก lib กลาง (เป็นไฟล์ WT-0 dev WT-C แตะไม่ได้)

**ทำไมต้อง lib เดียว:** ดาวน์โหลด JSON กับบันทึก PDF ของเพลงเดียวกัน ต้องได้ชื่อไฟล์เหมือนกัน · แก้ format ที่เดียวมีผลทุกปุ่ม · กันชื่อเพี้ยนกันหลายที่

## ข้อสังเกตอื่น (ฝากถึง WT-0 — จุดต่อ UI ที่ dev WT-C แตะไฟล์ไม่ได้)
- **ต่อสายอัปโหลดให้ใช้ `jsonIO.importSong` (C02/C04):** `manageUpload` ใน `EditorMode.vue` (WT-0) ยัง `JSON.parse` เอง + error รวมๆ ("ไฟล์ JSON ไม่ถูกต้อง") · เปลี่ยนเป็น `const r = await importSong(file); if(!r.ok) แสดง r.error; else applyRow(r.song)` จะได้ validate โครงเพลง + แปลง v1→v2 + ข้อความบอกสาเหตุภาษาคน (ตาม C04) ฟรี
- **ปุ่มดาวน์โหลดบน navbar (DownloadTool) ยังไม่โผล่เองในเชลล์** เพราะ `store.currentSong` ไม่เคยถูกเซ็ต (ไม่มี `currentSong.value = …` ในโค้ด) → `v-if` เป็น false เสมอ · จุดต่อนี้เป็นของ **WT-0** (DS-C01 ระบุไว้) · ผมทดสอบโดยเซ็ต currentSong เอง ปุ่มทำงานถูก · ขอ WT-0 ต่อสายตอนเปิดเพลง ปุ่ม navbar ถึงใช้ได้จริง · ระหว่างนี้ทางที่ใช้ได้คือเมนู "จัดการ" ในโหมดแก้ไข
- **infra:** เจอ vite ค้าง (orphan) ของ session อื่นจองพอร์ต `[::1]:5304` ทำให้ `localhost:5304` วิ่งผิดเซิร์ฟเวอร์ — เคลียร์แล้ว 5304 เป็นของ WT-C ตัวเดียว

## พร้อม merge ไหม
**พร้อม** — WT-C ครบทั้ง 4 US (C01–C04) · ไฟล์ทั้งหมดอยู่ในขอบเขต (jsonIO.js + songName.js + DownloadTool.vue) ไม่ชน worktree อื่น · unit 36/36 + build + end-to-end ผ่าน
- ค้างรอ **พี่เอม:** ยืนยันอีเมลทีมจริง (`TEAM_EMAIL` ใน jsonIO.js · ตอนนี้ `pleng@phrakham.life`) — แก้บรรทัดเดียว
- ค้างรอ **WT-0** 2 จุด (ไม่บล็อก merge โค้ด WT-C): ต่อสาย `importSong` เข้า `manageUpload` · เซ็ต `currentSong` ให้ปุ่ม navbar (ดาวน์โหลด/ส่งขออนุมัติ) โผล่
- ค้างรอ **SA** เคาะ format + โครง library กลางตั้งชื่อไฟล์ (หัวข้อ ⚠️ ด้านบน)

**URL ตรวจงาน:** http://localhost:5304 (ค้าง server ไว้ให้แล้ว)
