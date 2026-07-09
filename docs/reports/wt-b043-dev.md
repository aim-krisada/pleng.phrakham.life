# Report — B043 dev · เฟส 1 (music dock + section repeat)

**branch:** `wt-b043-dev` (ฐาน `studio-shell-redesign`) · **สาย:** B043 dev
**server (`--host`):** Network URL = **http://10.215.141.98:5323/** (npx vite . --host --port 5323 --strictPort)
**สถานะ:** ✅ **เฟส 1 เสร็จ — รอ PM ตรวจ + merge ก่อนเริ่มเฟส 2** (A2 แผ่นย่อ + verify print PDF)

---

## ทำอะไรไป (เฟส 1)

ยกเครื่องหน้าฝึกร้องเป็น **music player** ที่แถบ dock ล่าง — ตัดการ์ดควบคุมบนหัวออกหมด ย้าย control ทั้งหมดลง dock ตามที่ P'Aim สั่ง (real-use 9 ก.ค.).

**สถาปัตยกรรม (ตามกติกาหลัก):** transport + ⚙ settings panel + selector = **core reusable ผ่าน D8** — ไม่ฝังใน SongViewer
- `StudioDock.vue` (dock-core) เพิ่ม **top-region** สำหรับ D8 custom control (`type:'custom', region:'top'`) → แถบเต็มกว้างเหนือแถวปุ่ม (เครื่องเล่นเพลงกว้างเกินกว่าจะยัดใน ⋯) · dock ยัง "ตาบอด" · หน้าไหนก็ reuse ได้ · comment D8 เดิมระบุ use case นี้ไว้แล้ว ("a whole transport bar, e.g. B043")
- `SingTransport.vue` (**ใหม่ · core component**) = ตัวเครื่องเล่น (progress+markers+transport+⚙panel+selector) · รับ state ทั้งหมดผ่าน props · SongViewer เป็นเจ้าของ state เท่านั้น
- `SongViewer.vue` ส่ง config `[{ id:'transport', type:'custom', region:'top', component: SingTransport, props }]` เข้า dock

**ครบตาม brief เฟส 1:**
1. **transport** — progress bar + marker ท่อน (จุด) + `⏮ ▶/⏸ ⏭` + 🔁 + scrub (ลาก) + แตะ marker = กระโดด occurrence นั้น · dot วิ่งตามโน้ตที่เล่นจริง
2. **⚙ settings panel** — บ้านของทุก control (แสดงผล/คอร์ด/คีย์/ความเร็ว/ฟอนต์/ดาวน์โหลด/พิมพ์) · ปรับ **inline** ได้แม้ไม่ปัก · 📌 ปัก/ถอน (persist localStorage `pleng.dock.sing.pins`) → ปักแล้วโผล่แถบลัด
3. **selector ท่อน** — ปุ่ม `☰ เลือกท่อน` → รายการ Gmail (checkbox + All/None · มือถือ = bottom sheet) · ไม่เลือก = ทั้งเพลง · เลือก = ▶/🔁 เฉพาะที่เลือก · C=ไม่จำ (เปลี่ยนเพลง = ล้าง)
4. **ตัดการ์ดควบคุมบน + `.section-bar` ออกจาก SongViewer** → controls ลง dock ครบ · download เข้า ⚙ panel
5. **B038** — auto-scroll เล็ง `[data-syl]` ของพยางค์ที่ร้อง (เดิมเล็ง `[data-seg]` ระดับ segment)
6. **B042** — ▶/⏸ เล่นต่อจากจุดเดิม · ⏮ จาก marker แรก = กลับต้น
7. **F=เงียบ** — เพลง v1 ไม่มีท่อน → ซ่อน ⏮/⏭ + selector + marker · เหลือ ▶ + 🔁 เล่น/วนทั้งเพลง
8. **ปุ่ม play/pause ไม่มี background** (icon-only) ✅

**engine (`midi.js`) — additive ไม่แตะจังหวะ/ทำนอง:**
- `effectiveOrder(sections, selectedNames)` — selection → play order (decision D: ตามลำดับเพลง + ยุบรอยต่อวนกลับ)
- `buildPlayNotes(content, {order, range})` — SSOT ของ note list ที่ทั้ง engine + dot/markers/scrub/⏮⏭ ใช้ร่วม
- `playSong` รับ `order` (หลายช่วง) · ไม่มี order = พฤติกรรมเดิมเป๊ะ (ไม่พัง v1/ทั้งเพลง)
- `sectionTags` — group occurrence ตาม label

## เทสต์ + build
- **npm test เขียว 134/134** (base 113 + midi.order 7 + SingTransport 13 + SongViewer.play rewrite 22 · เดิมมี viewer tests แต่เขียนใหม่ให้ตรง UI ใหม่)
- **build ผ่าน** (`vite build` · 113 modules · dist ok)

## พิสูจน์เล่นจริงในเบราว์เซอร์ (song 84 "ข้าจะยกยอสรรเสริญพระองค์" · มี 3 ท่อน · repeat)
เปิด `http://localhost:5325` (worktree dev) แล้วสั่งผ่าน DOM/eval — ยืนยัน:
- ▶ เล่นจริง: `posIndex` เดินหน้า (21→26 ใน 2 วิ) · dot/fill ขยับ (7.72%→9.56%) · **ไฮไลต์รายพยางค์เดินจริง** ("ปล่อย"→"มี"→"พิ"→"คืน") · marker ท่อนที่เล่น active
- ⏭/⏮ กระโดดตรง marker boundary เป๊ะ (104→167→204→167 · ทุกค่าอยู่ใน [0,67,101,167,204])
- scrub 50% → posIndex 136/273 (frac 0.50) ✅
- selector: เลือก "ร้อง 1" → order=[{ร้อง 1, li0-3}] · marker เหลือ 1 · totalNotes 273→133 (เล่นเฉพาะที่เลือกจริง)
- ⚙ panel: แสดงผล→เนื้อล้วน (showChord/showNote=false) · คีย์ C→Db (stepper) · 📌 pin คีย์ → chip โผล่ + persist
- v1 (เพลง 1) → ซ่อน selector/⏮/⏭/marker ถูกต้อง (F=เงียบ)
- dock: play button พื้นโปร่ง (icon-only) · customize ซ่อน (ไม่มี row tool) · blend (ความโปร่ง) ยังอยู่ · transport อยู่ใน `.sd-top` (D8 region:'top')

## หมายเหตุ / ที่ต้องให้ P'Aim ยืนยันบนมือถือจริง
- **B038 auto-scroll (เลื่อนจอตามพยางค์):** โค้ดเปลี่ยน target เป็น `[data-syl]` แล้ว (unit test ยืนยัน + ไฮไลต์เดินตรงพยางค์จริง) แต่ **preview renderer นี้ scroll แบบ programmatic ไม่ได้** (ทั้ง `scrollTo`/`scrollIntoView` ไม่ขยับ viewport) → การเลื่อนจอ "เห็นด้วยตา" ต้องทดสอบบนมือถือจริงผ่าน LAN URL (กลไก scrollIntoView เดิมที่ base ใช้อยู่แล้ว ผมแค่เปลี่ยน selector เป้าหมาย)
- **transparency:** ยังอยู่ที่ปุ่ม blend ของ dock (ทำงานได้) — ยังไม่ย้ายเข้า ⚙ panel เพราะ alpha เป็น state ของ StudioDock (custom control เอื้อมไม่ถึง) → ถ้าต้องการใน panel = งาน dock-core เล็ก (เปิด alpha ออกมาให้ page ขับ) ทำช่วง merge/เฟส 2 ได้
- **download navbar เดิม:** ยังโชว์ที่หัว (shared ทุกหน้า) + เพิ่มใน ⚙ panel ด้วย → ซ้ำเฉพาะ sing mode · ถ้าจะเอาออกจากหัวเฉพาะ studio = follow-up เล็ก

## ปรับ layout ตาม P'Aim art-direct (รอบ 2 · หลัง real-use)
P'Aim ลองแล้วบาร์โล่ง ("เหลือ ▶/🔁 · หา icon ไม่เจอ") + อยาก layout เครื่องเล่นเพลง 2 แถวชัด → ปรับ:
- **2 แถวชัด** (อ้าง `ref-music-player-play.jpg`): **แถวบน** (กรอบ) = ปุ่มหุบ/grip ซ้ายสุด + progress bar เต็มกว้าง + เวลา (+ ☰ เลือกท่อน) · **แถวล่าง** = **⚙ ซ้ายสุด** → ⏮ ▶/⏸ ⏭ → 🔁 → ปุ่มที่ปัก
- **default pin บนบาร์ (แก้บาร์โล่ง):** transport + **คีย์ + ความเร็ว + แสดงผล** (compact icon+badge · คีย์=stepper ◀E▶ · ความเร็ว/แสดงผล=เมนู badge+dropdown) · ที่เหลือ (คอร์ด/ฟอนต์/ดาวน์โหลด/พิมพ์/**ความโปร่ง**) อยู่ในแผง ⚙ ปรับ inline + ปักเพิ่มได้
- **ความโปร่ง (transparency) ย้ายเข้าแผง ⚙ แล้ว** — StudioDock ส่ง hook `dock-alpha`/`dock-collapse` ให้ top-region control (dock ยัง generic) · slider ในแผงขับ alpha ของ dock จริง (ยืนยัน 0.92→0.55)
- **หุบ/collapse** ย้ายมาที่ grip แถวบนของเครื่องเล่น (dock ซ่อนแถบ chrome เดิมของตัวเองเมื่อเป็น music dock ล้วน)
- verify เบราว์เซอร์: 2 แถวถูก · grip แถวบน · ⚙ ซ้ายสุด · default pin display/key/tempo โผล่บนบาร์ (มี badge ครบ/C/127) · dropdown ปุ่มปัก + เลือกได้ (display→เนื้อ) · transparency slider ขับ dock จริง · เล่นจริง dot/ไฮไลต์เดิน · ไม่มี console error
- test 138/138 · build ✅

## ปรับ rอบ 3 (P'Aim FINAL layout + font ย้าย + popup clamp)
1. **popup ห้ามหลุดขอบ (req A):** ยก viewport-clamp แบบ dock-polish มาใช้กับ popup ของ B043 ทุกตัว (แผง ⚙ · dropdown ปุ่มปัก · selector) → เปิดใกล้ขอบบน = เลื่อนกลับเข้าจอเต็มเสมอ · **verify:** จอสูง 300px แผง ⚙ ล้นบน 72px → clamp translate ลง → top=8 อยู่ในจอครบ
2. **ลำดับปุ่มบาร์ล่าง:** grip มุมซ้ายบน (แถว 1) · แถว 2 = ⚙ → ⏮ → ▶ → ⏭ → 🔁 → **คีย์ → ความเร็ว → แสดงผล** (แก้ pin order ให้เรียงตามลำดับปัก ไม่ใช่ลำดับ settings)
3. **font ย้ายออกจาก dock → top nav (ShellBar):** ปุ่ม **"Aa"** ใน top bar (โผล่เมื่อเปิดเพลง เหมือน download) → popup `A↓ [%] A↑` + "คืนค่าปกติ (100%)" แบบ phrakham.life · **fontScale เป็น global ใน `store.js`** (persist · ใช้ร่วม sing) · ลบ fdown/fup ออกจาก dock+แผง ⚙ หมด · popup ก็ clamp ไม่หลุดขอบ · ref จาก `phrakham.life2/assets/pk-navbar.js`
   - ไฟล์ใหม่: `FontTool.vue` · แก้ `ShellBar.vue` (+FontTool) · `store.js` (+readingFontScale/bump/reset) · `SongViewer.vue` (ถอด fontScale local → ใช้ store)
- verify เบราว์เซอร์: Aa อยู่ top nav · dock/แผง ⚙ ไม่มี font แล้ว · pin order = key/tempo/display · Aa popup ปรับ→sheet ขยาย (1→1.1rem, 110%) · แผง ⚙ clamp จอสั้น · เล่นจริง dot เดิน · (error ที่เห็นใน console = HMR hot-swap เท่านั้น `@vite/client queueUpdate` · โหลดสด/production ไม่มี · build สะอาด)
- test 142/142 · build ✅

## ค้าง → เฟส 2 / dock-core (P'Aim non-blocking · ไม่บล็อกปิดเฟส 1)
- **⚙ settings optional/auto-hide (config ที่ core):** โหมดปุ่มน้อย+ไม่มีของซ่อน → ไม่ต้องมี ⚙ (เช่นแผ่นเพลง print) · โหมดฝึกร้องปุ่มเยอะ → ⚙ ปกติ. **ทำเฟส 2:** เป็น dock-core config (กระทบ print/edit ที่ StudioDock chrome ด้วย · + ต้องเคาะว่า unpin ไปอยู่ไหนถ้า ⚙ หาย) — ยกทำตอน finalize ⚙ panel เป็น core จริง · P'Aim สั่งอย่าให้บล็อกเฟส 1 (layout+font+clamp จบแล้ว)
- B044 (spacing โน้ต↔เนื้อ) · B046 (title↔เนื้อ) = เฟส 2 SongSheet

## DoD เฟส 1
- [x] music dock ครบ (transport/scroll-target/selector/settings panel)
- [x] transport อยู่ใน StudioDock (core · D8 region:'top')
- [x] npm test เขียว · build ผ่าน
- [x] พิสูจน์เล่นจริงในเบราว์เซอร์ + Network URL
- [ ] **รอ:** P'Aim/พี่เปา ลองมือถือจริง (โดยเฉพาะ auto-scroll ตามพยางค์) → PM ตรวจ + merge → เริ่มเฟส 2 (A2 แผ่นย่อ + verify print PDF)
