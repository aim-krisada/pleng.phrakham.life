# รายงาน — DockKey core engine + หน้าฝึกร้อง (phase 1)

**สาย:** `dockkey-dev` (แตกจาก `studio-shell-redesign`) · **commit:** `778138a`
**ใบสั่ง:** `docs/pm/brief-dockkey-dev.md` (pm4) · **DS:** `docs/ds/dockkey-library.md` · **prototype:** `docs/design/dockkey-sing-prototype.html`

## ทำอะไรไป (F60+)
สร้าง **DockKey = core engine ตัวกลาง** ที่ทุกหน้าส่งแค่ "รายการปุ่ม" (descriptor) เข้ามา แล้ว engine จัดวาง/ยุบ/ลาก/ตั้งค่า/ปักปุ่ม/กันป๊อปอัพล้นขอบเองทั้งหมด · แล้วแปลง **หน้าฝึกร้อง** ให้ป้อน `ITEMS_SING` เข้า engine นี้เป็น reference หน้าแรก · แผ่นเพลง/แก้ไข = phase 2 (เสียบ descriptor ของ SA เข้า engine เดิม ไม่แก้ engine)

## ไฟล์
- **ใหม่ `src/components/DockKey.vue`** — engine กลาง (port ตรงจาก prototype: `buildRows`/`itemHtml`/`transitionInPlace`/drag/gear-panel/clampPops)
  - พิกัด row (ล่าง→บน) / col (ซ้าย→ขวา) + จัดลำดับ row1 ตาม anchor (`left`/`right`/`rightOf:`/`leftOf:`)
  - cap เติมเต็มความกว้าง (มือถือ 7 · เดสก์ท็อป 14) — ปุ่มปัก 📌 ล้น cap → ขึ้นแถวใหม่เหนือ row2
  - แถวล่าง (มี ⚙) กระจายเต็มกว้าง (space-between) · ปุ่มปักไม่แทรกแถวล่าง (I3)
  - **collapse-in-place**: แตะ grip = ย่อเป็น mini `[grip][⚙]` ที่ตำแหน่งเดิม (grip ไม่กระโดด · I7) · ลาก grip = ย้ายทั้ง dock (ทั้งย่อ+กาง · คุมในกรอบ)
  - เปิดป๊อปอัพทีละ 1 · Esc/แตะนอก = ปิด · **clamp ทุก `.dk-pop` ไม่ล้นขอบ +8px** (I5)
  - หน้า ⚙ Setting: ทุก item `inSetting`/`pinnable` → ไอคอน·ชื่อ·ตัวปรับ inline·▲▼·📌
  - kind ในตัว engine: grip/gear/play/btn/toggle/menu/slider · kind ที่หน้าเป็นคนวาด (ผ่าน slot `#cell-<id>` + `{open,toggle,close}`): timeline/sel/aa → หน้าอื่นเพิ่ม kind ของตัวเองได้โดยไม่แตะ engine
  - `v-model:alpha` โปร่งใส (persist ต่อ `storeKey`) · pins/collapsed persist ต่อ `storeKey` ด้วย
- **แก้ `src/components/SingTransport.vue`** — เลิกวาด chrome เอง · กลายเป็น **adapter หน้าฝึกร้อง**: สร้าง `ITEMS_SING` จาก state ของหน้า + เติม 3 เซลล์ที่หน้าเป็นคนวาด (ไทม์ไลน์ · เลือกท่อน · Aa)
  - Row 2: `[ไทม์ไลน์ col1-3][คีย์ col4][เลือกท่อน col5-6]` · Row 1: `[Grip][Back][Play][Fwd][Aa][⚙]`
  - ⚙ Setting: วนซ้ำ · คอร์ด · ความเร็ว · แสดงผล · โปร่งใส (คีย์อยู่บนแถบ row2 ไม่ใช่ใน Setting)
  - ไทม์ไลน์: แตะ/ลาก = วิ่งไปทันที · เส้นท่อน (เลือก=น้ำตาล/ไม่เลือก=เทา/หัวอยู่=หนา) · หัวสไลเดอร์วงกลมเดียว · แสดงเวลารวมอย่างเดียว
  - Aa = permanent · บนแถบโชว์แค่ "Aa" · % + ↺100% อยู่ในป๊อปอัพ (กันปุ่มกว้างดันหลุดขอบ)
- **แก้ `src/components/SongViewer.vue`** (sing mount เท่านั้น) — mount `<SingTransport>` ตรงๆ (fixed) แทนการ emit `@dock` เข้า StudioDock ร่วม · **StudioDock/Studio.vue/แก้ไข/พิมพ์ ไม่แตะ** (sing แค่เลิกใช้ StudioDock ร่วม · edit/print ยังใช้เหมือนเดิม)

## รั้ว — ยืนยันไม่ข้าม
แตะเฉพาะ `StudioDock.vue`(→ ตัดสินใจสร้าง engine แยกเป็น `DockKey.vue` แทนการยกเครื่อง StudioDock ที่ยัง shared 3 โหมด · ดู "หมายเหตุสถาปัตย์") · `SingTransport.vue` · `SongViewer.vue`(sing mount) · **ไม่แตะ** ShellBar.vue · styles.css · App.vue · footer · NoteRow.vue · EditorMode.vue · Studio.vue

## หมายเหตุสถาปัตย์ (ทำไม engine เป็นไฟล์ใหม่ ไม่ยกเครื่อง StudioDock)
`StudioDock.vue` เป็น **instance เดียวที่ Studio.vue mount ให้ 3 โหมดใช้ร่วม** (แก้ไข/ฝึกร้อง/พิมพ์ ผ่าน `activeDock`) · ถ้ายกเครื่อง API ของมันเป็น descriptor engine เลย จะพังหน้าแก้ไข/พิมพ์ + เทสต์ทันที (ผิด DoD 264 + ผิดรั้ว "ห้ามแตะ dock แก้ไข/พิมพ์") · ทางที่ปลอดภัย + ตรง DS = **engine อยู่ไฟล์ใหม่ `DockKey.vue`** (generic library) · หน้าฝึกร้อง mount ตรง · StudioDock ทำงานเดิมให้ edit/print ต่อไป · **phase 2 ค่อยย้าย edit/print มาบน DockKey แล้วปลด StudioDock** (ตรงตามคิว phase 2 ในบอร์ด: เสียบ ITEMS_PRINT/EDIT เข้า DockKey)

## DoD
- ✅ **vitest: 272 passed** (`npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'`) · ฐานเดิม 264 + DockKey.test.js 10 (net · coverage play logic เดิมครบ) · `notationLint.test.mjs` fail = ของเดิม (`process.exit(0)` ไม่เกี่ยว)
- ✅ **`npm run build` ผ่าน** (115 modules · 1.5s)
- ✅ **dev server `--host`** → **Network URL: `http://10.215.141.98:5315`** (พี่เอม/พี่เปาเทสต์มือถือจริงได้ · config `dock` · strictPort 5315)
- ✅ **verify เบราว์เซอร์** (DOM · viewport headless รายงาน 0×0 จึงเช็คเชิงโครงสร้าง/ตรรกะแทน screenshot ตามแนวทาง worktree):
  - dock ฝึกร้อง **2 แถว** · row2 `[timeslide,key,tuan]` · row1 spread `[grip,back,play,forward,scale,setting]` · badge คีย์ = `E` ✓
  - ⚙ Setting = `[repeat,chord,speed,layer,alpha]` + 📌 ✓
  - collapse-in-place → mini `[grip][gear]` · กางกลับได้ ✓
  - เลือกท่อน ↔ ไทม์ไลน์เชื่อมกัน (ติ๊กท่อน → เส้นเป็นน้ำตาล `st-seg on` · count `1/2`) ✓
  - console **0 error** ✓
  - clamp +8px: ตรรกะ `clampPops` มี + unit-tested · เช็คพิกัดจริงในเบราว์เซอร์นี้ไม่ได้ (viewport 0×0) → ฝากพี่เอม/พี่เปาลองบนมือถือจริงว่าป๊อปอัพไม่ล้นขอบ

## รอบแก้ 2 — dock = "กล่องเครื่องมือลอย" กว้างพอดีปุ่ม (P'Aim ผ่าน pm4)
P'Aim ย้ำ: **"พอดี" = พอดีปุ่มตามความกว้างจริง ไม่ใช่พอดีจอ** · dock กอดปุ่มแน่นเหมือนกล่องเครื่องมือ · ห้ามยืดตามจอ · ห้าม space-between ดันปุ่มติดขอบ · ปุ่มเกาะกลุ่มขนาดธรรมชาติ
- `.dk-dock` = **`width: fit-content`** ทุกขนาดจอ · `min-width: min(300px, 100vw−16)` · `max-width: min(700px, 100vw−16)` → dock กว้างตามแถวที่กว้างสุด (ไทม์ไลน์) แบบพอดี ไม่ยืดตามจอ (หดเข้ากรอบเฉพาะจอแคบมาก)
- row1 **แพ็คธรรมชาติ (flex-start)** — grip ซ้ายสุด · ปุ่มเกาะกลุ่มขนาดจริง · ⚙ อยู่ท้ายกลุ่ม · **ไม่มี `margin:auto`/`space-between`/`flex:1`** ที่ดันปุ่มติดขอบหรือยืด · **override DS "row1 กระจายเต็มกว้าง"** (real-use ชนะ spec ตามที่ pm4 สั่ง)
- ไทม์ไลน์ `min-width: 190px` (min ที่ยังใช้งานได้) — dock กว้างตามนี้พอดี ไม่เผื่อเกิน
- **verify:** วัดสด LAN ต้นรอบยืนยัน dock **fit-content 383px บนจอ 1265px** (ไม่เต็มจอ · toolboxNotScreen ✓) · หลังรอบแก้ 2 ยืนยัน computed style: `.dk-gear margin-left:0` (เลิกดันขอบ · ⚙ เกาะท้ายกลุ่มที่ x≈257) · `.dk-dock width:fit-content` + clamp `calc(100vw−16)` · vitest 53 (sing) เขียว · build ผ่าน · 0 console error
  - ⚠️ viewport ใน MCP browser รอบท้าย report `100vw=0` (headless artifact · ทำให้ clamp หด 0 เฉพาะที่นี่ — บนเครื่องจริง 100vw ปกติ → hug ~383px ตามที่วัดได้ต้นรอบ) → **ฝากพี่เอม/พี่เปายืนยัน "กล่องพอดีปุ่ม" บนมือถือจริงอีกที**
- ✅ P'Aim OK แล้ว (ไม่แก้): 🔁/ความเร็ว/แสดงผล เข้า ⚙ · Aa ไม่มี % กำกับ

## จุดที่อยากให้ PM/P'Aim เคาะ (ไม่ได้ทำรอบนี้ — นอกขอบเขต engine)
1. **default เลือกท่อน** — DS §3 อยากให้ "ติ๊กทุกท่อน" เป็น default · แต่ตอนนี้ SongViewer ใช้ semantics เดิม "ไม่เลือก = เล่นทั้งเพลง" (empty = whole song) ซึ่งผูกกับ play logic + `SongViewer.play.test.js` · การเปลี่ยน default = แตะ play-logic ของ SongViewer (นอกงาน dock engine) → **แยกเป็นงาน SongViewer ต่างหาก** ถ้าพี่เอมอยากได้
2. **download/print ใน Setting ฝึกร้อง** — DS §4 หมายเหตุ "รอ P'Aim เคาะ" · รอบนี้ **ไม่ใส่** (ตาม prototype) · ถ้าจะใส่ = เพิ่ม descriptor 2 ตัวใน adapter
3. **collapse บนมือถือ** — ทำเป็น mini `[grip][gear]` ในตำแหน่งเดิมทั้งมือถือ+เดสก์ท็อป (ตาม DS I7) · ต่างจาก StudioDock เดิมที่มือถือเลื่อนออก+แท็บดึงขึ้น — ถ้าพี่เอมชอบแบบเดิมบอกได้

## ห้าม merge/deploy เอง — รอ PM ตรวจ DoD
