# brief — B059 (ด่วน) แผ่นเพลงแบบหนังสือเพลงจริง (โน้ตครั้งเดียว · ข้อซ้ำเป็นเนื้อล้วน)

**สาย:** dev · worktree ใหม่จากฐาน `studio-shell-redesign` · 1 worktree = 1 branch = 1 port
**ที่มา:** P'Aim 9 ก.ค. — คลัง 120 เพลง live · อยากให้แผ่นเพลงดูเหมือนหนังสือเพลง

## โจทย์
**หน้าฝึกร้อง (sing):** คงเดิม — โน้ต + เนื้อ + คาราโอเกะ ทุกข้อ (ไว้ฝึกร้อง)
**หน้าแผ่นเพลง (sheet):** แสดงแบบ **หนังสือเพลงจริง** —
- **โน้ตแสดงครั้งเดียวต่อทำนอง (stanza)** — พิมพ์ทำนอง + เนื้อข้อแรกที่ใช้ทำนองนั้น
- **ข้ออื่นที่ใช้ทำนองซ้ำ = เนื้อล้วน** (ย่อหน้าข้อความ · เลขข้อ · ไม่ต้องพิมพ์โน้ตซ้ำ)
- = ตรงกับ v2 พอดี (ทำนอง = stanza · arrangement มีหลายข้อ reuse stanza)

**ตัวอย่าง (เพลง 77 · 3 ข้อ+2 รับ · 2 ทำนอง):** แผ่นเพลงพิมพ์ทำนองข้อ (โน้ต+เนื้อร้อง1) ครั้งเดียว · ทำนองรับ (โน้ต+เนื้อ) ครั้งเดียว · แล้ว **ร้อง 2/3 = เนื้อล้วน · รับ 2 = เนื้อล้วน**

## จุดในโค้ด (จุดเริ่มสอบ)
- `src/components/SongViewer.vue` — โหมด "แสดงผล" (`display` · line ~34-54) · `sheetMode` = 'full' | 'lyrics' (ตอนนี้ all-or-nothing) · ส่ง `mode` เข้า `SongSheet`
- `src/components/SongSheet.vue` — render note+lyric · resolveContent (v2 expand arrangement → รู้ว่าแถวไหนใช้ stanza ไหน)
- **แนวทาง:** เพิ่มโหมด/พฤติกรรม sheet = **"songbook"** — แถว arrangement ที่เป็น *ครั้งแรก* ของ stanza → โชว์โน้ต · แถวที่ stanza นั้น *ซ้ำ* → เนื้อล้วน (ต้อง track stanza-first-seen ตอน render)

## ขอบเขต (กันชน)
- แตะ `SongSheet.vue` + `SongViewer.vue` (โหมด sheet) · ⛔ ห้ามแตะ SongList/EditorMode (สาย catalog) · songSearch (สาย B058) · **หน้าฝึกร้อง (sing mode) ต้องไม่เปลี่ยน** (โน้ต+คาราโอเกะทุกข้อคงเดิม)
- ⚠️ SongSheet = ไฟล์ที่ B043 เฟส 2 (A2/print) + B044/B046 (spacing) จะแตะ → **ถ้าว่าง สายนี้เก็บ B044/B046 spacing ด้วยได้** (real-use: โน้ต-เนื้อแคบลง · ระหว่างบรรทัดกว้างขึ้น · ชื่อ↔เนื้อ B046) แต่โฟกัส B059 ก่อน · แจ้ง PM ถ้าจะทำ

## Verify
- เบราว์เซอร์ (`--host` + Network URL): เพลงหลายข้อ (77/57) โหมดแผ่นเพลง → โน้ตครั้งเดียว + ข้อ 2/3 เนื้อล้วน · หน้าฝึกร้อง = ยังโน้ตทุกข้อ · **print/PDF จริง** (get P'Aim print → ดู PDF · ไม่ใช่แค่ DOM) · unit + build เขียว

## รายงานกลับ (session-agnostic)
`docs/reports/wt-songbook.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy · เช็ก branch ก่อน commit
