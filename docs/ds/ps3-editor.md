# DS — ps3 Epic 2: โต๊ะแก้ไข (③)

US: `docs/us/ps3-editor.md` · Visual = prototype `ps2-studio-prototype.html` (โหมดแก้ไข)

## ไฟล์ที่เป็นเจ้าของ (คอขวด — สายเดียว)
- `src/components/EditorMode.vue` — **ไฟล์เดียวที่ ③ + I5 + WT-D รอบ2 แตะ** → ทำเรียงกัน ห้ามแยก worktree ขนานกันบนไฟล์นี้
- editor internals: `NoteBoxes.vue` · `NoteRow.vue` · `ComboSelect.vue` (คอร์ด picker) — ยกทั้งก้อน
- `lib/notation.js` (parse/render jianpu) · `lib/songModel.js` (v2 · อ่านก่อนแตะ)

## โครง
- **Layout:** `.studio` = flex [rail 220px sticky top≈76 / drawer mobile] + content · max-width ~1240
- **rail ↔ content sync:** state `curMel`/`curVerse` (single source) · เลือกที่ rail → rebuild bars (ทำนองจาก stanza + คำจาก verse) → re-render · breadcrumb + rail highlight ตาม
- **note cell:** ต่อช่อง = chord picker (บน) / jianpu glyph (render จาก `notation.js`) / code input / word input · glyph อัปเดต on-input
- **ดูผล toggle:** per-bar replace (edit grid ⇄ clean render) · whole-song = set ทุก bar (authoritative, ป้ายสะท้อน `allShown()`)
- **โครงเพลง:** UI ระดับบรรทัด · **serialize ยัง map ราย ห้อง** (`repeat-start`/`repeat-end`/`volta`/`end` tokens) — v2 มีแล้ว (ps1), UI แค่ set บรรทัด → กระจายลงห้องที่เกี่ยว
- **แก้เนื้อ (B005):** ช่องคำรายพยางค์ (มีอยู่) + พาเนลย่อหน้า two-way sync (`splitSyllables`/`joinSyllables`) · ตัด textarea ใน arrangement
- **auto-save:** debounce → store action (บันทึกร่าง มีจาก WT-D รอบ1) · status pill sticky · ปุ่ม action (download/ส่งตรวจ/อนุมัติ) = ใน dock/ตาม tier
- **ลบบรรทัด/ลบเพลง:** confirm dialog (component ร่วมกับ shell)

## ยึด / ระวัง
- **model ห้ามลดรูป** — เก็บละเอียดกว่า UI (bar-capable) เพื่อ future-proof
- jianpu render = ไฟล์/คลาสร่วมกับ SongSheet (viewer/print) — ประสาน epic 3/4 ก่อนแตะ render ร่วม
- WCAG 2.2 AA · Google-Docs-clean
