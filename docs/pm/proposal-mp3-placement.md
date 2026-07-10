# ข้อเสนอถึง PM — จับ "ดาวน์โหลดเสียง MP3" ไว้ตรงไหน (B072)

**จาก:** SA (สาย `mp3-download`) · **ถึง:** pm4 · **ต้องการ:** เคาะตำแหน่ง UI + สั่งสายที่รับผิดชอบเสียบ
**ที่มา:** P'Aim ทดลอง MP3 แล้วใช้ได้ดีทั้งมือถือ+PC · ขอ (1) จับใส่ที่เหมาะสมอิง de-facto standard (2) ต้องมี progress feedback ระหว่าง encode

## F60 — สรุปสั้น
โค้ด MP3 + progress feedback **ทำเสร็จแล้ว** อยู่ใน `DownloadTool.vue` + `audioExport.js` (จุดต่อ · ยังไม่โผล่ UI จริงเพราะ DownloadTool ยัง orphan บนฐาน). เหลือ **decision เดียว: เอา MP3 ไปโผล่ที่เมนูไหน** — ข้อเสนอ: **รวมเข้าเมนู "ดาวน์โหลด/ส่งออก" อันเดียวกับ PDF + JSON ที่มีอยู่แล้ว** (de-facto: export ทุกฟอร์แมตอยู่ที่เดียว) ซึ่งหลัง DockKey เสร็จ = เสียบผ่าน descriptor เข้า dock — **ทับกับสาย `sa-dockkey-print-edit`** ต้องให้ PM สั่งสายนั้นรับไปเสียบ

## de-facto standard ที่อ้าง
1. **Export actions รวมที่เดียว** — Google Docs "ดาวน์โหลดเป็น ▸ PDF/Word/…", Canva/Figma "Export", YouTube/Spotify "Download" ล้วนเป็น *เมนูเดียว หลายฟอร์แมต* ไม่กระจายปุ่ม. แอปเรามีเมนูนี้อยู่แล้ว (พิมพ์ PDF · ดาวน์โหลด JSON) → MP3 = ฟอร์แมตที่ 3 ในเมนูเดิม ไม่ใช่ปุ่มใหม่ที่อื่น
2. **Progress สำหรับงาน >10 วิ ต้องเป็น determinate + ETA** (Nielsen Norman Group). งานนี้ encode หลายวิ → ทำแล้ว: ประมาณล่วงหน้า (ยาว/ขนาด) + progress bar % + ETA + staged (เรนเดอร์→บีบอัด→เสร็จ). กันเคส "นึกว่าค้าง แล้วกด refresh" ที่ P'Aim ห่วง
3. **ป้ายบอกฟอร์แมตชัด** — "⬇️ ดาวน์โหลดเสียง (MP3)" (ฟอร์แมตในวงเล็บ) เข้าชุดกับ "(JSON)" / "(A4)" เดิม

## ข้อเสนอ (แนะนำ)
| หัวข้อ | ข้อเสนอ |
|---|---|
| **ตำแหน่ง** | เมนู "ดาวน์โหลด/ส่งออก" เดียว — ลำดับ: 🖨️ พิมพ์ PDF (A4) · ⬇️ ข้อมูลเพลง (JSON) · ⬇️ เสียงทำนอง (MP3) |
| **ที่โผล่จริง** | หลัง DockKey เสร็จ เมนูนี้อยู่ใน **dock** (B045 ย้ายปุ่มดาวน์โหลดไป dock แล้ว) → เสียบ MP3 ผ่าน **descriptor** (สาย `sa-dockkey-print-edit` เป็นเจ้าของ ITEMS) ไม่ใช่ re-surface DownloadTool |
| **เจ้าของงานเสียบ** | สั่งสาย `sa-dockkey-print-edit` เพิ่ม MP3 item ลง descriptor · โค้ด `audioExport.songToMp3Blob(content, {onProgress})` พร้อมเรียกทันที |
| **progress UI** | ใช้แบบที่ทำแล้วใน DownloadTool (estimate + bar + ETA + staged) ยกไปเป็นแบบให้ dock item |

## จุดที่ PM ต้องตัดสิน
1. **เห็นด้วยกับ "รวมเมนูเดียว" ไหม** หรืออยากมีปุ่ม MP3 แยก (ไม่แนะนำ — ขัด de-facto)
2. **สั่งสายไหนเสียบ** — แนะนำ `sa-dockkey-print-edit` (เขาถือ descriptor อยู่แล้ว) · สาย mp3-download ส่งของ + spec ให้
3. **(ตัวเลือกเสริม) ย้าย encode ไป Web Worker ไหม** — ตอนนี้ใช้ chunked-yield (บีบอัดทีละก้อน + คืน main thread ให้ repaint) = UI ไม่ค้าง ตอบโจทย์ progress ครบแล้ว. Web Worker = ลื่นกว่าอีกขั้นบนเครื่องช้า/เพลงยาวมาก แต่เพิ่มความซับซ้อน (ส่ง PCM ข้าม worker + bundle worker). **แนะนำ: ยังไม่ต้อง** — เก็บเป็น backlog ถ้าเจอเครื่องกระตุกจริง

## ของที่ส่งมอบแล้ว (ให้สายที่เสียบใช้ต่อ)
- `audioExport.songToMp3Blob(content, { bpm, kbps, onProgress })` → `{ blob, seconds }`
- `audioExport.estimateMp3(content, { bpm, kbps })` → `{ seconds, bytes }` (คำนวณก่อน render สำหรับโชว์ล่วงหน้า)
- `onProgress({ stage:'render'|'encode'|'done', fraction })` — staged near-real-time
- ตัวอย่าง UI ครบใน `DownloadTool.vue` (label + `<progress>` + ETA + estimate)
- verify แล้ว เพลง 100: pitch 201/201, est error 0.025%, MP3 เล่นได้จริง (ดู `docs/reports/mp3-download.md`)
