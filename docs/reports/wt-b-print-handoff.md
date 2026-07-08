# WT-B พิมพ์แผ่นเพลง — สรุปส่งมอบ + งานที่ต้องจ่ายต่อ (สำหรับ SA)

Branch: `wt-b-print` (จาก `studio-shell-redesign`) · Port ตรวจงาน: **http://localhost:5303**
รายงาน dev เต็ม (มี snippet โค้ดพร้อมก๊อป): `docs/reports/wt-b-print.md`

## สถานะ
| US | งาน | สถานะ |
|---|---|:--:|
| US-B01 | ดูแผ่นเพลงเต็ม (โน้ต+คอร์ด+เนื้อ เรียงลำดับร้อง · อ่านอย่างเดียว) | ✅ เสร็จ |
| US-B02 | พิมพ์ A4 + footer/หัวกระดาษ | ✅ เสร็จ **เฉพาะส่วนที่อยู่ในไฟล์ WT-B** |

- แตะไฟล์เดียว: `src/components/SongSheet.vue` (+ test) — **ไม่ชนกับ worktree อื่น**
- unit test 20/20 · `npm run build` ผ่าน · **พร้อม merge**

## ทำเสร็จแล้วใน branch นี้
- แผ่นเพลงเต็ม เรียงตามลำดับการร้อง · อ่านอย่างเดียว
- footer พิมพ์ (print-only, ซ้ำทุกหน้า): ซ้าย = `เพลง.พระคำ.ชีวิต` · ขวา = ชื่อเพลง (รอ prop `songTitle`) · ห่างขอบ `bottom 10mm / left-right 16mm`
- เอา **หัวกลางด้านบนออก** (ตามที่พี่เอมสั่ง)
- **ไม่ตัดกลางท่อน** (`.song-section` + `break-inside: avoid` เฉพาะตอนพิมพ์ · บนจอไม่เปลี่ยน)
- ยืนยัน: ตอนพิมพ์ ShellBar/ปุ่มโหมดถูกซ่อนหมด (เหลือแต่แผ่นเพลง)

## ต้องจ่ายต่อ — อยู่นอกไฟล์ WT-B (SA เคาะ/จ่ายให้ WT-A / WT-0)
1. **ชื่อไฟล์ PDF = `เพลง.พระคำ.ชีวิต — <ชื่อเพลง>.pdf`** — ชื่อไฟล์ที่เบราว์เซอร์ตั้ง = `document.title` (ค้างที่ค่า index.html) · แก้ที่ **ตัวสั่งพิมพ์** `SongViewer.printSheet()` (WT-A):
   ```js
   function printSheet() {
     const prev = document.title
     document.title = 'เพลง.พระคำ.ชีวิต — ' + (props.song.title_th || 'แผ่นเพลง')
     addEventListener('afterprint', () => (document.title = prev), { once: true })
     window.print()
   }
   ```
2. **ให้ชื่อเพลงโผล่ที่ footer** — ตัวที่ mount `SongSheet` ตอนพิมพ์ต้องส่ง prop:
   - `SongViewer.vue` (WT-A) → `<SongSheet … :song-title="song.title_th" />`
   - `Studio.vue` โหมดแผ่น (WT-0) → `<SongSheet … :song-title="titleText" />`
   - หมายเหตุ: `currentSong` (store) ในสาขานี้ไม่ถูก set ที่ไหนเลย → ส่งผ่าน prop เท่านั้น
3. **`หน้า X ของ Y` (ช่องกลาง footer) + กันเนื้อทับ footer หลายหน้า** — ต้องใช้ `@page` margin box (`counter(page)`/`counter(pages)`) + ตั้ง `@page { margin }` ในไฟล์กลาง `src/styles.css` (WT-0) · in-component ทำไม่ได้ · เงื่อนไข: พิมพ์ด้วย Chrome/Edge + ปิด "Headers and footers" ในกล่องพิมพ์
4. **โครงโหมด (design decision)** — จะให้ "เลือกคีย์ในโหมดแผ่น" ไหม / วางปุ่มพิมพ์ที่ไหน (US-06) / ให้ "คีย์ที่เลือก" ใช้ร่วมทั้ง 3 โหมด (ดู/แผ่น/แก้) เพื่อให้โหมดแผ่นพรีวิวตรงกับที่พิมพ์ · **แนะนำ:** พิมพ์จากโหมด "ดู" (ตัวเลือกครบที่เดียวแล้ว) + ทำให้โหมดแผ่นสะท้อนคีย์ที่เลือก · ควรเคาะพร้อม US-06

## ขอ SA
1. review + **merge `wt-b-print` → `studio-shell-redesign`**
2. จ่ายข้อ 1–3 ให้ WT-A/WT-0 · เคาะข้อ 4 พร้อม US-06
