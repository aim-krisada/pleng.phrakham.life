# Brief — บั๊ก 2 เรื่อง หน้าต่างลอย "ดูผลทั้งเพลง" (โหมดแก้ไข)

**สั่งโดย:** pm4 · **ฐาน:** `studio-shell-redesign` · **branch ใหม่:** `git switch -c fix-editor-preview-final studio-shell-redesign`
**หลักฐาน P'Aim:** `docs/pm/realuse-assets/bug-editor-preview-final.jpg` + `.txt` (เพลง "1. พระเจ้าเป็นความรัก" Key E)

## บริบท
หน้าต่างลอย "ดูผลทั้งเพลง" ในโหมดแก้ไข = `.ed-float` ใน `EditorMode.vue` (บรรทัด ~2107-2139) · body render `<SongSheet :content="resolvedPreview" mode="full" ...>` (บรรทัด 2125) · non-modal · ลาก/ปรับขนาดได้ · live-sync

## บั๊ก 1 — พรีวิวต้องล็อกการจัดบรรทัด ไม่ reflow เวลาย่อ/ขยาย
- **ปัญหา:** ตอนนี้ย่อ/ขยายหน้าต่าง (หรือหน้าจอ) แล้วห้อง (bar) reflow/ตัดบรรทัดใหม่ → เห็นการจัดบรรทัดไม่ตรงของจริง
- **ต้องการ (P'Aim):** พรีวิวโชว์ **ยึดตามบรรทัดข้อมูลจริง** (แต่ละ "บรรทัด" ในเพลง = 1 แถวเสมอ) — ย่อ/ขยายหน้าต่างแล้ว **บรรทัดต้องไม่เลื่อน/ไม่ wrap** เพื่อเช็กว่าหน้า final เพลงจัดบรรทัดถูกไหม
- **แนวทาง:** ทำ `.ed-float-body` (หรือ SongSheet ในบริบทนี้) เป็น **non-reflow**: แต่ละ song-line ไม่ห่อห้องขึ้นแถวใหม่ (`flex-wrap:nowrap`) + `overflow-x:auto` เมื่อหน้าต่างแคบกว่าบรรทัด (เลื่อนแนวนอนแทนการตัดบรรทัด) · **scope เฉพาะพรีวิวลอย** — อย่าเปลี่ยนพฤติกรรม SongSheet หน้าอื่น (แผ่นเพลง/ฝึกร้อง) · ทำใน `EditorMode.vue` scoped CSS ถ้าได้ (ถ้าต้อง prop ใหม่ที่ SongSheet เช่น `:nowrap` = แตะ SongSheet.vue ได้ แต่ต้อง opt-in ไม่กระทบ default)

## บั๊ก 2 — เส้น tie ซ้อนกัน 2 เส้น (ไทข้ามห้อง)
- **ที่:** บรรทัดแรก · ตัว "3" ท้ายห้องที่ 3 (ไทข้ามไปห้อง 4 "3 - -") · เห็นโค้ง **2 เส้นซ้อนกัน** = ผิด
- **ต้นตอ:** B069 (songsheet-finish) วาด **overlay ไทข้ามห้องระดับบรรทัดใน SongSheet** (SVG path พาดข้ามเส้นห้อง) + ซ่อนครึ่งโค้ง NoteRow ด้วย `:deep(.tie-end-arc){display:none}` — verify มาแค่ **โหมดแผ่นเพลง (Studio)** เพลง 100 · **ในหน้าต่างลอยของ EditorMode ยังซ้อน** (overlay วาด + NoteRow arc ไม่ถูกซ่อน / หรือ overlay วัด/วาดซ้ำในคอนเทนเนอร์นี้)
- **แก้:** ให้ไทข้ามห้องในพรีวิวลอย = **โค้งเดียว** เหมือนหน้าแผ่นเพลง (ตรวจว่า `:deep` hide + การวัดตำแหน่ง overlay ทำงานในคอนเทนเนอร์ `.ed-float`/`.sheet-panel` ด้วย · อาจเป็นเรื่อง scoping/timing/measure หลังเปิดหน้าต่าง) · แก้ที่ **`SongSheet.vue`** (logic overlay/hide) — **⛔ ไม่แตะ `NoteRow.vue`** (โค้งภายในห้อง within-segment ของ NoteRow ต้องคงเดิม)

## รั้ว
- **แตะได้:** `src/components/EditorMode.vue` (บั๊ก1 scoped) · `src/components/SongSheet.vue` (บั๊ก2 overlay + prop nowrap ถ้าจำเป็น)
- **⛔ ห้ามแตะ:** `NoteRow.vue` (ACC) · `styles.css` (สาย fix-favicon-footer ถือ · scope ใน component แทน) · `StudioDock.vue`/`SingTransport.vue`/`SongViewer.vue` (สาย dockkey) · `ShellBar.vue`/`App.vue`
- ⚠️ SongSheet ใช้หลายหน้า (แผ่นเพลง/ฝึกร้อง/พรีวิวแก้) — บั๊ก2 แก้ต้อง **ไม่ทำให้หน้าแผ่นเพลงเดิม (เพลง 100 ที่ P'Aim ผ่าน PDF แล้ว) พัง** · บั๊ก1 nowrap ต้อง opt-in เฉพาะพรีวิวลอย

## DoD + รายงาน
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` ผ่าน + `npm run build`
- dev server **`--host`** + **Network URL** ในรายงาน
- verify เบราว์เซอร์ (เพลง "1. พระเจ้าเป็นความรัก" หรือเพลงมีไทข้ามห้อง เช่น 100): บั๊ก1 = ย่อ/ขยายหน้าต่างลอย บรรทัดไม่ reflow (scroll แนวนอนแทน) · บั๊ก2 = ไทข้ามห้องโค้งเดียว ไม่ซ้อน · **เช็กหน้าแผ่นเพลงเพลง 100 ไม่ regress** · console 0
- รายงานกลับ (session-agnostic): (1) `docs/reports/fix-editor-preview-final.md` (2) บรรทัด board §📥 inbox (3) ping PM ปัจจุบัน = **`pm4`** · **⛔ ห้าม merge/deploy เอง**
