# Brief — dev: build โหมดแก้ไข "โครงเพลง" (จัดลำดับ/ชื่อท่อนง่ายขึ้น) — ห้ามกระทบของเดิม

**สั่งโดย:** pm4 (P'Aim เคาะ mockup แล้ว 10 ก.ค. · "ok ไปแล้ว dev เลย") · **branch:** `git switch -c editor-section-ux-dev studio-shell-redesign`

## สเปก (approve แล้ว)
- **DS:** `docs/ds/editor-section-ux.md` · **US:** `docs/us/editor-section-ux.md` · **mockup คลิกได้:** `docs/design/editor-section-ux.html` (เปิดดูให้ตรงก่อน build)
- SA report: `docs/reports/sa-editor-section-ux.md` (audit 8 ข้อ + เหตุผล)

## แก่นงาน = "จัดเปลือก" ให้ง่ายขึ้น (ตาม mockup)
ยุบ 3 รายการ (ทำนอง/เนื้อร้อง/ลำดับเพลง) เหลือ **รายการเดียว "โครงเพลง"** · **คลิกชื่อท่อนแก้ inline** · **ลากจัดลำดับ (รองรับนิ้ว touch + เมาส์)** · ปุ่ม ▲▼ ที่หัวท่อนที่แก้ · **ตัดบล็อก "📜 ลำดับเพลง" ล่างทิ้ง** · ทำนอง = ป้ายเล็กที่ท่อน · เลิกคำ "ขั้นสูง" (ตาม DS)

## ⚠️⚠️ ข้อสำคัญที่สุด (P'Aim เน้น เน้น): "ใช้งานได้เหมือนเดิม แต่ง่ายขึ้น"
**นี่คือการเปลี่ยนแค่เปลือก UI ของการจัดการท่อน/ลำดับ — ฟังก์ชันแก้ไขเดิมทั้งหมดต้องทำงานเหมือนเดิมเป๊ะ ห้าม regress:**
- โมเดล v2 (stanza ทำนอง ↔ arrangement ข้อ) **ไม่เปลี่ยน** — เปลี่ยนแค่หน้าตา/วิธีจับ
- **แก้โน้ต** (ช่องโน้ต/คอร์ด/แป้นโน้ต insert) เหมือนเดิม
- **แก้เนื้อ** (รายพยางค์ใต้โน้ต + แผง "📝 แก้เนื้อแบบย่อหน้า" + เลือกข้อด้วย ✎/lens) เหมือนเดิม
- **นับจังหวะ B073** (ห้องต่อกัน/pickup) · **undo/redo B075** (Ctrl+Z leading-edge) · **พรีวิว** (ตัวอย่างสด per-bar + หน้าต่างลอย pip nowrap) · **ตั้งค่าเพลง inline** (การ์ด ⚙) · **verified toggle** — ทุกอย่างทำงานครบเหมือนเดิม
- เลือก/เปลี่ยน "ท่อนทำนอง" ต่อข้อ (เดิมอยู่บล็อกลำดับเพลง) = ต้องยังทำได้ (ย้ายไป UI ใหม่ · ไม่หายไป)
- **เพิ่มเทสต์ยืนยันของเดิมไม่พัง** (รันชุดเดิมของ EditorMode ต้องเขียวครบ + เพิ่มเคสจัดลำดับ/rename ใหม่)

## รั้ว (สำคัญ — กันชน DockKey phase 2 ที่แตะ EditorMode.vue เหมือนกัน)
- **แตะได้:** `src/components/EditorMode.vue` **เฉพาะส่วนแถบข้าง "ส่วนของเพลง" (rail) + บล็อก "ลำดับเพลง" (arrangement) + logic rename/reorder ที่เกี่ยว** (+ test)
- **⛔ ห้ามแตะส่วน DOCK / แถบเครื่องมือล่าง / DOCK_DEFAULT / editDockTools / PALETTE** — **DockKey phase 2 (สาย dockkey-dev) เป็นเจ้าของ dock หน้าแก้ไข** · ชนกันไม่ได้
- **⛔ ห้ามแตะ:** `NoteRow.vue` · `SongSheet.vue` · `styles.css` (สาย favicon merged แต่เลี่ยง churn — scope ใน component) · `ShellBar.vue`/`App.vue` · `songSearch.js` · `StudioDock.vue`/`DockKey.vue`/`SingTransport.vue`/`SongViewer.vue`
- **PM จะเรียงคิว merge** editor-section-ux ↔ DockKey phase 2 (ไฟล์เดียวกัน) — รายงานให้ไว PM จะจัดลำดับ resolve

## DoD + รายงาน
- vitest ผ่าน (`--exclude '**/.claude/**' --exclude '**/node_modules/**'` · ฐาน 288) + build · dev **`--host`** + **Network URL**
- **verify เบราว์เซอร์ (เน้น):** (1) จัดลำดับท่อน = ลากได้บนนิ้ว+เมาส์ · rename inline · ▲▼ (2) **ของเดิมครบ:** แก้โน้ต/เนื้อ/นับจังหวะ/undo/พรีวิว/เลือกทำนองต่อข้อ ทำงานเหมือนเดิม (3) มือถือ+PC · console 0
- **P'Aim gate: LAN ลองจริงก่อน merge** (เทียบว่าเดิมทำอะไรได้ ตอนนี้ยังทำได้หมด + ง่ายขึ้น)
- รายงานกลับ: (1) `docs/reports/editor-section-ux-dev.md` (2) board §📥 inbox (3) ping **pm4** · ⛔ ห้าม merge/deploy เอง
