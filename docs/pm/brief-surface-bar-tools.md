# ใบสั่ง (dev) — B092: เอาปุ่มห้อง (เลื่อน/สำเนา/ลบ) ออกนอกเมนู ⋯

**สั่งโดย:** pm7 · **ฐาน:** `studio-shell-redesign` · **branch: `surface-bar-tools`** · **ไฟล์: `EditorMode.vue`(+test)**
**ที่มา:** พี่เปา issue4 (img `docs/backlog-assets/B092-surface-bar-tools.png`) — "เครื่องมือเลื่อนห้องซ้ายขวา/สำเนา/ลบ เอามาไว้ด้านนอก กดสะดวก ไม่ต้องกด ⋯ ก่อน"

## ปัจจุบัน (ยืนยันในโค้ด)
- `.ed-bar-acts` (`:2284`) = ปุ่มที่โชว์อยู่แล้ว: ▶ ฟังห้อง · ♪ ดูผลห้อง
- `.ed-bar-more-wrap` ⋯ (`:2288`) เปิด popover `.ed-bar-menu` (`:2297`) มี:
  - **◀ ซ้าย / ขวา ▶** (`moveBar` · row `:2299-2300`) ← surface
  - **⧉ สำเนา / ✕ ลบห้อง** (`duplicateBar`/`removeBar` · `:2303-2304`) ← surface
  - checkbox: ↻ ห้องต่อกัน · ‖: เล่นซ้ำ · :‖ วนกลับ · ห้องจบ (volta) ← **คงไว้ใน ⋯** (ใช้น้อย)

## ต้องได้
- **ย้าย 4 ปุ่มบ่อย (◀ซ้าย · ขวา▶ · ⧉สำเนา · ✕ลบห้อง) ออกมาเป็นปุ่มตรง** (นอก ⋯ · กดได้เลย) — วางในแถบเครื่องมือห้อง (ต่อจาก/รวมกับ `ed-bar-acts` หรือแถวใหม่)
- **⋯ เหลือแค่ checkbox** (ห้องต่อกัน/เล่นซ้ำ/วนกลับ/ห้องจบ)
- คง disabled logic เดิม (ซ้ายสุด/ขวาสุด) · aria-label เดิม · ลบ = สี danger

## ⚠️ สำคัญ (mobile · ui-standards)
เพิ่ม 4 ปุ่ม/ห้อง × หลายห้อง = **เสี่ยงแน่นบนมือถือ** → **ต้องคุมพื้นที่:**
- ไอคอนล้วน + compact (target-size ≥ `--touch-min` ตาม ui-standards) · ไม่ล้น/ไม่ตัดโน้ต
- ถ้ามือถือแน่นจริง = พิจารณา responsive (เดสก์ท็อปโชว์ครบ · มือถือคงบางส่วนใน ⋯) **หรือ flag PM/SA ถ้าต้องออกแบบวางปุ่มก่อน** — อย่าให้แน่นจนพัง
- อ้าง `docs/ui-standards.md` (target-size · no-overflow · spacing)

## ตรวจเอง + report
- Browser MCP 3 จอ (375/768/1280): 4 ปุ่มกดตรงได้ · ⋯ เหลือ checkbox · ไม่ล้น/ไม่แน่นเกิน · move/copy/delete ยังทำงาน (+ B088 reslice ถ้า merge แล้ว) · vitest+build เขียว
- แตะเฉพาะ `EditorMode.vue`(+test) · เคารพ SX7 · เช็ก branch ก่อน commit
- เสร็จ: `docs/reports/surface-bar-tools.md` + board §📥 inbox + ping PM=pm7 · ⛔ ไม่ merge/deploy
