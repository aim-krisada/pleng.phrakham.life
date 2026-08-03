# Dev brief — B043 build (music dock + section repeat + A2)

**ฐาน:** `studio-shell-redesign` (มี dock-core D8 + dock-polish แล้ว) · branch ใหม่ `wt-b043-dev`
**สเปกเต็ม (อ่านก่อน · อยู่ในฐานแล้ว):** `docs/ds/sing-repeat.md` + `docs/us/sing-repeat.md` + wireframe `docs/design/b043-sing-repeat.html` (เปิดดูได้)
**Decisions (เคาะครบ):** A2 (แผ่นย่อ) · B เอาป้ายรอบ · C ไม่จำ · D · E ตัด · F เงียบ · G ตามเสนอ · H ทั้งคู่ (scrub+แตะ)

## กติกาหลัก (ห้ามพลาด)
- **transport + ⚙ settings panel + selector = สร้างใน `StudioDock.vue` เป็น CORE reusable** (ผ่าน D8 `type:'custom'`) — **ไม่ฝังใน SongViewer** (P'Aim ย้ำ: play + dock functions = core library · หน้าอื่น reuse ได้)
- ปุ่ม play/pause **ไม่มี background** (icon-only เหมือน ⏮/⏭)
- ฐาน = studio-shell-redesign · ห้าม merge main · `--host` เสมอ + Network URL ในรายงาน

## เฟส 1 — Music dock (controls) · build ได้เลย · ไม่แตะ SongSheet
ทำงานบนแผ่นเพลงแบบ **แผ่เต็มเดิม (A1-style)** ไปก่อน — ยังไม่ย่อ
1. **transport** (core ใน StudioDock): progress bar + marker ท่อน (จุด) + `⏮ ▶/⏸ ⏭` + scrub (ลากหาตำแหน่ง · H) + แตะ marker=กระโดด · `onProgress`/`onNote` ที่มีใน playSong ขับ dot
2. **⚙ settings panel** (core ใน StudioDock · §4c): ทุก control อยู่ในแผง ปรับ **inline** ได้แม้ไม่ปักบนแถบ (slider ความโปร่ง/แสดงผล/คอร์ด/คีย์/ความเร็ว/ฟอนต์/download/พิมพ์) · 📌 ปัก/ถอน · pin state ต่อโหมด (localStorage · ต่อยอด D6)
3. **selector ท่อน** (§3d): ปุ่ม `☰ เลือกท่อน` → รายการเลื่อนแบบ Gmail (checkbox + All/None · มือถือ=bottom sheet) · **C=ไม่จำ** (เปลี่ยนเพลง=ล้าง) · ไม่เลือก=เล่นทั้งเพลง · เลือก=▶/🔁 เฉพาะที่เลือก
4. **sing config:** ลบการ์ดควบคุมบน + `.section-bar` ออกจาก `SongViewer.vue` → controls ทั้งหมดลง dock (music player) · download เข้า dock
5. **B038** (scroll ตรงพยางค์): follow-along เล็ง `[data-syl]` ของพยางค์ที่ร้อง (มี selector แล้ว) — **พิสูจน์ด้วยการเล่นจริง ไม่ใช่ DOM proxy**
6. **B042** (เล่นต่อ/เริ่มใหม่): ยุบเป็น ▶/⏸ (เล่นต่อ) + ⏮ (กลับต้น) ใน transport
- **ไฟล์:** `StudioDock.vue` (core) · `SongViewer.vue` · `DownloadTool.vue`
- **F เงียบ:** เพลง v1 ไม่มีท่อน = ไม่มี marker/selector = เล่นทั้งเพลงปกติ (ไม่มีคำใบ้)

## เฟส 2 — A2 แผ่นย่อ (หลังเฟส 1 ทำงาน) · แตะ SongSheet (ร่วมพิมพ์)
- SongSheet render **ย่อ** (รับโชว์ครั้งเดียว · stack by section ตาม song-model-v2) + anchor ไฮไลต์ด้วย `(sectionKey, slot)` (บล็อกเดียวเล่นหลายรอบ) + ป้าย **"รอบ N"** (B)
- **⚠️ verify พิมพ์ PDF จริง** — Read ไฟล์ PDF ที่พิมพ์ออกมา (บทเรียน: อย่าเช็กจาก DOM/screenshot · SongSheet ใช้ร่วมโหมดพิมพ์)
- **ไฟล์:** `SongSheet.vue` · `midi.js` (sectionKey/slot บนโน้ต)

## DoD
- เฟส 1: music dock ทำงานครบ (transport/scroll/selector/settings panel) · transport อยู่ใน StudioDock (core · เช็ก D8) · npm test เขียว · build · พิสูจน์เล่นจริงในเบราว์เซอร์ + Network URL
- เฟส 2: แผ่นย่อ + ไฮไลต์รอบซ้ำถูกพยางค์ · **พิมพ์ PDF จริงผ่าน** · test/build
- report `docs/reports/wt-b043-dev.md` + board §📥 inbox + ping PM ปัจจุบัน "debug pl2 round 1" (จบเฟส 1 บอก PM ตรวจ+merge ก่อนเริ่มเฟส 2 ได้)

## Setup
```
git switch -c wt-b043-dev studio-shell-redesign
npx vite . --host --port 5323 --strictPort
```
