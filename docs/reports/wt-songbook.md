# wt-songbook — B059 แผ่นเพลงแบบหนังสือเพลง (โน้ตครั้งเดียว · ข้อซ้ำเนื้อล้วน)

**branch:** `wt-songbook` (ฐาน `studio-shell-redesign`) · **commit:** `73701d3` · **dev server:** `http://192.168.1.124:5380/` (LAN · `--host`)

## โจทย์ (จาก brief-b059)
- **แผ่นเพลง (sheet):** พิมพ์แบบหนังสือเพลง — โน้ต (+คอร์ด) แสดง **ครั้งเดียวต่อทำนอง (stanza)** ที่ข้อแรกที่ใช้ทำนองนั้น · ข้อถัดไปที่ **ใช้ทำนองซ้ำ = เนื้อล้วน** (เลขข้อ + คำร้องของข้อนั้น)
- **ฝึกร้อง (sing):** ไม่เปลี่ยน — โน้ต + คาราโอเกะ ทุกข้อ

## สิ่งที่ทำ (3 ไฟล์ code + 2 ไฟล์ test)
1. **`src/lib/songModel.js` — `resolveContent`**: ตอน expand arrangement → stanza เพิ่มแท็กรายบรรทัด `_stanza` + `_stanzaFirst` (จุดเดียวในระบบที่รู้ตัวตนของ stanza) · เป็น prop บน array แบบไม่ใช่ index → consumer เดิม (v1 render / midi / print) วน items เหมือนเดิม ไม่กระทบ
2. **`src/components/SongSheet.vue`**: prop ใหม่ `songbook` (default `false`)
   - per-line gate: บรรทัดที่ใช้ทำนองซ้ำ (`_stanzaFirst === false`) → ตัดแถวโน้ต + คอร์ด (รวม bar-line/repeat/volta/end) เหลือเนื้อ
   - เนื้อของบรรทัดซ้ำ fallback ไปใช้ joined lyric text (มีเว้นวรรคคำ) แทน syllable-span ที่กระจายใต้โน้ต → อ่านเป็นข้อความไหลแบบหนังสือเพลง
   - v1 / undefined → `first = true` เสมอ → โน้ตไม่หาย (songbook ตัดเฉพาะ stanza ที่ซ้ำจริง)
3. **`src/views/Studio.vue`**: หน้า **แผ่นเพลง** opt-in `songbook` (บรรทัดเดียว) · หน้าฝึกร้อง (SongViewer) + editor preview ไม่เคยส่ง → คงพฤติกรรมเดิม

> **หมายเหตุขอบเขต:** brief ระบุ "SongViewer.vue (โหมด sheet)" แต่จริงๆ หน้าแผ่นเพลง render `<SongSheet>` **ตรงใน `Studio.vue`** (SongViewer = หน้าฝึกร้องเท่านั้น · ไม่มีโหมด sheet) → จึงแตะ `Studio.vue` 1 บรรทัด (เปิด `songbook`) แทน · **ไม่แตะ SongList/EditorMode/songSearch**

## Verify
- **unit:** `songModel.test.js` (แท็ก stanza-first: first/reuse/v1) + `SongSheet.test.js` (songbook on = ทำนองครั้งเดียว · reuse เนื้อล้วน+เลขข้อ · songbook off = โน้ตทุกข้อ) · **`vitest run` = 206 passed** (`notationLint.test.mjs` fail = ของเดิมบนฐาน · `process.exit` · ไม่เกี่ยว)
- **build:** ✅ ผ่าน (`npm run build`)
- **เบราว์เซอร์ (LAN 5380 · จาก DOM จริง):**
  - **เพลง 77** (ร้อง1·รับ·ร้อง2·ร้อง3·รับ) โหมดแผ่นเพลง → ร้อง1 **มีโน้ต+คอร์ด** · รับ **มีโน้ต+คอร์ด** · ร้อง2/ร้อง3/รับ(ซ้ำ) = **เนื้อล้วน (notes=0)** พร้อมคำร้องของข้อนั้นเอง ✅
  - **เพลง 57** (ร้อง1·รับ·ร้อง2·ร้อง3) → ร้อง1+รับ มีโน้ต · ร้อง2+ร้อง3 เนื้อล้วน ✅
  - **ฝึกร้อง เพลง 57** → ร้อง1/รับ/ร้อง2/ร้อง3 **มีโน้ตครบทุกข้อ** (12/17/12/12) = ไม่เปลี่ยน ✅

## ค้าง — ต้อง P'Aim
- **print/PDF จริง:** ยังไม่ได้พิสูจน์จากไฟล์ PDF (ตาม lesson: ห้ามเคลม print เสร็จจาก DOM) → ขอ P'Aim สั่งพิมพ์หน้าแผ่นเพลง (เพลง 77) → เปิด PDF ดูว่าโน้ตครั้งเดียว + ข้อซ้ำเนื้อล้วน + ไม่ตัดกลางท่อน

## ประสาน (สำหรับ PM)
- SongSheet = ไฟล์เดียวกับ **B043 เฟส2 / B044 / B046** (spacing/A2/print) → ถ้าสายพวกนั้นจะเข้า ให้ merge sequence · การเปลี่ยนของ B059 = additive (prop ใหม่ + per-line gate) ไม่รื้อ layout เดิม
- **ยังไม่เก็บ B044/B046 spacing** (brief ให้แจ้งก่อนทำ) — โฟกัส B059 อย่างเดียว · ถ้า PM ต้องการรวม แจ้งได้
- ห้าม merge main/deploy (ตามกฎ) · รอ PM ตรวจ DoD + P'Aim accept (LAN + print PDF)
