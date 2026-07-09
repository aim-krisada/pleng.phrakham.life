# brief — edit-dev round 2 · c (B049) ตัดช่อง "ลำดับเพลง" ก้อนใหญ่

**สาย:** edit-dev · worktree `wt-edit-fix` (เดิม · commit ฐานล่าสุด merge `316d02d` เข้า `studio-shell-redesign` แล้ว)
**ขอบเขตไฟล์:** **แตะแค่ `src/components/EditorMode.vue`** (เหมือนรอบ 1 · ห้ามแตะไฟล์ B043: SongViewer/StudioDock/SingTransport/ShellBar/store/FontTool/SongSheet) → ไม่ชนสายอื่น merge อิสระได้

## โจทย์ (P'Aim เคาะแล้ว = B005 direction)
รอบ 1 dev รายงาน gap เอง (B049): หน้า "แก้ไข" ยังมี **ช่องพิมพ์ "ลำดับเพลง" ก้อนใหญ่ล่างเพจ** ที่ prototype ตัดออกไปแล้ว → ตอนนี้แก้เนื้อได้ 2 ที่ = สับสน

**ทำ:**
1. ❌ **ตัดช่อง/ตาราง "ลำดับเพลง" (raw arrangement textarea) ที่ล่างเพจออก** — อันที่ prototype ไม่มี
2. ✅ **คงกล่องรายพยางค์ใต้โน้ต** ไว้ (แก้เนื้อ+โน้ตรายพยางค์)
3. ✅ **คงพาเนล "พิมพ์เนื้อทั้งข้อ (ข้อที่เลือก)" แบบยุบ/กางได้** ไว้ (พิมพ์เร็วทั้งข้อ) — ถ้ายังไม่มีให้ทำตาม prototype
4. อ้าง prototype `features/ps2-studio-prototype.html` + US `docs/us/ps3-editor.md` E4 = SSOT ของ layout

**เจตนา:** เหลือวิธีแก้เนื้อ 2 แบบที่ไม่ตีกัน (รายพยางค์ละเอียด + ทั้งข้อรวดเดียว) · ไม่มีช่องซ้ำซ้อน

## กลยุทธ์ (สำคัญ)
- **desktop-first:** ทำให้นิ่งบน desktop ก่อน · **mobile (tablet/phone) เป็นรอบแยกทีหลัง** — รอบนี้ไม่ต้องเพอร์เฟกต์ responsive แต่ห้ามพัง layout เดิม
- **verify:** เปิด server `--host` · ใส่ **Network URL (`http://<IP>:<port>`)** ในรายงาน (พี่เอม/พี่เปาเทสต์มือถือจริงได้) · unit ต้องเขียว + `npm run build` ผ่าน

## DoD
- [ ] ช่อง "ลำดับเพลง" ก้อนใหญ่หายไปจากหน้าแก้ไข · หน้าตาตรง prototype
- [ ] แก้เนื้อรายพยางค์ + พาเนลทั้งข้อ ยังทำงาน (พิสูจน์ในเบราว์เซอร์เพลงจริง)
- [ ] unit เขียว + build ผ่าน · ไม่มี console error
- [ ] ไม่แตะไฟล์นอก EditorMode.vue

## รายงานกลับ (session-agnostic — อย่า hardcode ชื่อ PM session)
1. เขียน/อัปเดต `docs/reports/wt-edit-fix.md` (เพิ่มหัวข้อ round 2 · c/B049)
2. เพิ่มบรรทัดใน `docs/pm/board.md` §📥 PM inbox
3. ping "PM session ปัจจุบัน" ตาม `docs/pm/board.md` §🎯 · ถ้า PM สายเปลี่ยน inbox/report จะไม่ตกหล่น
