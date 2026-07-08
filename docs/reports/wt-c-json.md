# รายงาน — wt-c-json (WT-C JSON พกพา)
**รอบ:** 1 — เริ่ม epic WT-C จาก US-C01
**สถานะ:** เสร็จ (เฉพาะ US-C01)

## ทำอะไรไปบ้าง (ต่อ US)
- **US-C01 ดาวน์โหลดเพลงเป็น JSON: ✅**
  - รวม logic การแปลง "เพลง ↔ ไฟล์ JSON" ไว้ที่ `src/lib/jsonIO.js` (ไฟล์ใหม่) ตาม DS-C01
  - `exportSong(song)` → คืน object เฉพาะฟิลด์พกพา (`number/title_th/title_en/content`) ตัด field ที่เป็นของ viewer เท่านั้น (เช่น `id`) ออก → round-trip ครบ (คู่กับ US-C02)
  - `songFilename(song)` → ชื่อไฟล์สื่อความ: มีเลขเพลงนำหน้า + ชื่อไทย (fallback ชื่ออังกฤษ → `song`), ตัดอักขระที่ Windows ห้ามในชื่อไฟล์ (`\ / : * ? " < > |`)
  - `downloadSong(song)` → สร้าง Blob + ดาวน์โหลด (ห่อ DOM ไว้บาง ๆ, logic ที่เทสต์ได้อยู่ใน exportSong/songFilename)
  - ต่อสาย `DownloadTool.vue` (ปุ่มดาวน์โหลดบน navbar) ให้เรียก `downloadSong` แทนโค้ด inline เดิม
- US-C02 / C03 / C04: ⬜ (ยังไม่เริ่ม — จะทำต่อในรอบถัดไป)

## ไฟล์ที่แก้ (อยู่ในขอบเขต DS-C01 เท่านั้น)
- `src/lib/jsonIO.js` — **ใหม่** · โมดูลกลาง export/download (+ ที่ US-C02/C04 จะเติม import/validate)
- `src/lib/jsonIO.test.js` — **ใหม่** · unit test
- `src/components/DownloadTool.vue` — เปลี่ยน `downloadJson()` จาก inline มาเรียก `jsonIO.downloadSong` (ปุ่ม/UI เหมือนเดิม)

## ผลทดสอบ
- **unit:** ผ่าน — `jsonIO.test.js` 7 เคส (round-trip, เก็บเฉพาะ field พกพา, normalize เพลงว่างเป็น null/'' ไม่ใช่ undefined, ชื่อไฟล์ 4 เคส) · ชุดรวมทั้งโปรเจกต์ 19/19 ผ่าน · `npm run build` ผ่าน
- **end-to-end (จริงบนแอปที่รัน):** กดปุ่มดาวน์โหลด JSON จริงบน DownloadTool → ได้ไฟล์ชื่อ `7 ทดสอบดาวน์โหลด.json` (มีเลขนำหน้า, ตัด `/` ออกแล้ว), เนื้อในมีแค่ field พกพา, ตัด `id` ออก, parse กลับได้เท่าเดิม
- **วิธี tester ลอง:** เปิด `http://localhost:5304` → เปิดเพลง → เมนู "จัดการ → ดาวน์โหลด JSON" (โหมดแก้ไข) → เปิดไฟล์ที่ได้ เห็นข้อมูลครบ ชื่อไฟล์อิงชื่อเพลง

## ข้อสังเกต / คำถามถึง SA
- **ปุ่มดาวน์โหลดบน navbar (DownloadTool) ยังไม่โผล่เองในเชลล์** เพราะ `store.currentSong` ไม่เคยถูกเซ็ตที่ไหนเลย (ไม่มีจุด `currentSong.value = …` ในโค้ด) → `v-if="currentSong"` เป็น false เสมอ. นี่คือ **จุดต่อของ WT-0** (DS-C01 ระบุว่า "mount ปุ่มที่ไหน = ของ WT-0", WT-C เป็นเจ้าของแค่เนื้อในปุ่ม). ผมทดสอบ end-to-end โดยเซ็ต `currentSong` เอง ปุ่มทำงานถูกต้อง. **ขอ WT-0 ต่อสาย `currentSong` ตอนเปิดเพลงในโหมดดู** ปุ่ม navbar ถึงจะใช้ได้จริงกับ tester. ระหว่างนี้ทางดาวน์โหลดที่ใช้ได้คือเมนู "จัดการ" ในโหมดแก้ไข (โค้ด inline ของ EditorMode ซึ่งเป็นไฟล์ของ WT-0 — ผมไม่แตะ)
- `EditorMode.vue` ก็มี `downloadJson` inline ของตัวเอง (เป็นไฟล์ WT-0). ถ้าอยากให้ทุกปุ่มใช้ `jsonIO` ชุดเดียว ให้ WT-0/WT-D เปลี่ยนมาเรียก `jsonIO.downloadSong` ด้วย (ผมไม่แตะไฟล์ worktree อื่น)
- **เรื่อง infra (ไม่เกี่ยวโค้ด):** พบ vite ค้าง (orphan) ของ session อื่นจองพอร์ต `[::1]:5304` (IPv6) อยู่ ทำให้ `localhost:5304` วิ่งไปเซิร์ฟเวอร์ผิด — เคลียร์ให้แล้ว ตอนนี้ 5304 เป็นของ WT-C ตัวเดียว

## พร้อม merge ไหม
**พร้อม** สำหรับ US-C01 (ไฟล์อยู่ในขอบเขต DS, ไม่ชนไฟล์ worktree อื่น, unit + build + end-to-end ผ่าน). แต่ปุ่ม navbar จะโชว์จริงต่อเมื่อ WT-0 ต่อสาย `currentSong` — ประเด็นนี้ฝากถึง WT-0 (ไม่บล็อกการ merge โค้ด WT-C)

**URL ตรวจงาน:** http://localhost:5304 (ค้าง server ไว้ให้แล้ว)
