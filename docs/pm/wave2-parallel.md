# คลื่น 2 (ขนาน) — build 3 epic พร้อมกัน · สั่งโดย PM (ตามแผน SA · `status.md` ps4)

**กติกากลาง (ทุกสายอ่าน):**
- แต่ละสาย = **worktree + branch + port ของตัวเอง** (แยกกัน ทำพร้อมกันไม่ชน) · แตกจากฐาน `studio-shell-redesign` (คลื่น 1 merged แล้ว)
- **commit ในสาขาตัวเอง · ห้าม merge / ห้ามแตะ main / ห้าม deploy** — PM รวม+เคลียร์ conflict ให้เช้าพรุ่งนี้ (คลื่น 3 = รวม+ทดสอบ)
- เปิด dev server **`--host`** (พอร์ตของตัวเอง) ค้างไว้ ให้ P'Aim/พี่เปา ลองบนมือถือได้ (`http://<PC-IP>:<port>`)
- ทำ **unit test** ให้เขียว · เขียนรายงาน `docs/reports/wt-<x>.md` · **เจอทางแยกดีไซน์ที่ไม่ชัด → เลือกทางที่ตรง prototype ที่สุด + จดไว้ให้ P'Aim (อย่าค้าง)**
- setup: `git worktree add ../pleng-<x> -b wt-<x> studio-shell-redesign` → `cd ../pleng-<x>` → `npm install` → `npm run dev -- --host --port <port> --strictPort`
- **ไฟล์ร่วม (StudioDock.vue · NoteRow.vue · Studio.vue · styles.css · midi.js) อาจโดนหลายสาย** → ถ้าจำเป็นต้องแตะ ให้แก้ **น้อย+เฉพาะจุด** (PM เคลียร์ตอน merge)

---

## สาย E — Editor (port 5312 · branch `wt-editor`)
**รื้อหน้าแก้ไขให้ตรงดีไซน์** · อ่าน `docs/us/ps3-editor.md` + `docs/ds/ps3-editor.md` + prototype `docs/design/ps2-studio-prototype.html` (คือ "ที่ควรเป็น") + `ps3-shell` S2
- **B035** รื้อ UI editor ตาม prototype (rail "องค์ประกอบเพลง" · ห้องการ์ด · header: ดูผลทั้งเพลง/คัดลอก/ลบ/วนซ้ำ · toggle "1 ห้อง/แถว")
- **B032** ปุ่มลบท่อน (ทำนอง/ข้อ) · **B031+B003** แถบบน edit ให้เหมือนโหมดอื่น (unify "เพลง ▾" + ตัดเมนูซ้ำ) · **I5** editor JSON wiring
- **ไฟล์ของสาย:** `EditorMode.vue` + editor internals (`NoteBoxes.vue · NoteRow.vue · ComboSelect.vue`) + teleport แก้ไขใน `Studio.vue`
- ⚠️ **design-heavy** — ยึด prototype เป็นหลัก · งานย่อยในนี้ทำเรียงกัน (ไฟล์เดียว)

## สาย V — Viewer (port 5313 · branch `wt-viewer`)
**control bar ฝึกร้อง** · อ่าน `docs/us/ps3-viewer.md` + `docs/ds/ps3-viewer.md` + `ps3-dock` D2/D6/D7
- **B024** control bar: dropdown แสดงผล / คอร์ด / คีย์(โชว์ค่า) / ความเร็ว(ศัพท์ดนตรี) + customizable (reuse deck-key)
- **B016** เล่นแล้ว auto-scroll พัก 3.5s + ปุ่มหยุด sticky
- **ไฟล์ของสาย:** `SongViewer.vue` + `midi.js` (ส่วน viewer)
- ⚠️ control bar ใช้ dock ร่วม → **consume `StudioDock` เฉยๆ อย่ารื้อโครงมัน**

## สาย H — Highlight (port 5314 · branch `wt-highlight`)
**ไฮไลต์คาราโอเกะรายพยางค์/โน้ต** · อ่าน `docs/us/ps3-highlight.md` + `docs/ds/ps3-highlight.md` + `docs/song-model-v2.md`
- **B006 / B029** ไฮไลต์ไล่รายโน้ต/พยางค์ (v2 = 1 พยางค์/โน้ต) · แตะโน้ต=กระโดด
- **ไฟล์ของสาย:** `midi.js` (จับจังหวะรายโน้ต) + render ใน `SongSheet.vue`/`NoteRow.vue`
- ⚠️ ผูกโมเดล v2 · `NoteRow.vue` ใช้ร่วมกับสาย E → แก้ **น้อย+เฉพาะจุด**

---

## เลื่อนไปคลื่น 3 (เช้า · PM ทำตอนรวม)
- **B030** ยก `StudioDock` ขึ้นระดับ `Studio` + mount ให้ครบทุกโหมด (ฝึกร้อง/แผ่นเพลง) + แก้ N1 (dock ซ้อน)
- รวม 3 สาย + เคลียร์ conflict ไฟล์ร่วม + ทดสอบรวม → merge เข้าฐาน (ยังไม่แตะ main)

## วิธีเปิด (P'Aim)
เปิด 1 หน้าต่าง/สาย (bypass mode) วางบรรทัดเดียว:
`อ่าน docs/pm/wave2-parallel.md · คุณคือสาย <E-editor | V-viewer | H-highlight> · setup worktree แล้วทำตามส่วนของคุณ`
