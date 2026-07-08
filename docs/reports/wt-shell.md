# รายงาน — wt-shell (ps4 คลื่น 1: Shell + StudioDock)

**รอบ:** คลื่น 1 (โครงร่วมที่ทุกโหมดพึ่ง) · **สาขา:** `wt-shell` (ฐาน `studio-shell-redesign`)
**สถานะ:** เสร็จ — พร้อมให้ SA อ่าน + ตัดสิน merge

**ตรวจงานที่:** <http://localhost:5311>  (dev server ค้างไว้ที่พอร์ต 5311)

---

## ทำอะไรไปบ้าง (ต่อ US)

### ส่วนที่ 2 — StudioDock (US ps3-dock) — ยกเครื่องยนต์ dock ออกเป็นคอมโพเนนต์ร่วม
- **D1 (dock โครงเดียว):** ✅ สร้าง `StudioDock.vue` ใหม่ · รับ prop `mode` + `tools` (ชุดปุ่มต่อโหมด) + `paletteKeys` + `message` · EditorMode ส่งชุดปุ่มโหมด "edit" เข้าไป
- **D2 (ไอคอนล้วน + badge):** ✅ ปุ่มเป็นไอคอน Lucide ล้วน · tooltip (title) + aria-label ครบ · รองรับ badge (ไว้ให้ sing/print โชว์คีย์/BPM คลื่น 2)
- **D3 (dynamic overflow):** ✅ วัดความกว้างจริง (`Σ offsetWidth + gap·(n−1)`) · guard `clientWidth>50` (กันวัดตอนกว้าง 0) · ResizeObserver + fallback `window.resize` · ปุ่มที่เกินยุบเข้า **⋯** เป็น popover ลอยทับเนื้อ ไม่ดันเนื้อ · ไม่มี swipe
- **D4 (หุบ/กาง):** ✅ กดเองเท่านั้น · desktop = หุบเหลือแถบบาง คลิกกาง · mobile = เลื่อนพ้นจอ + โชว์ tab ริมล่าง · จำค่า `pleng.dock.collapsed.<mode>`
- **D5 (ความโปร่ง):** ✅ ปุ่ม blend เปิดสไลเดอร์เต็มกว้าง · เขียน `--dock-alpha` + `pleng.dock.alpha` (ร่วมทุกโหมด)
- **D6 (เลือกปุ่มเอง):** ✅ ปุ่ม sliders เปิดแผงเพิ่ม/เอาออก/เลื่อน · จำค่า `pleng.dock.<mode>.tools` แยกต่อโหมด · ปุ่มไม่เข้าสถานะ (หยุด/อนุมัติ) ซ่อนเองผ่าน `visible`
- **ลากย้าย (grip):** ✅ desktop ลากทั้งแถบด้วย `grip-vertical` (คงพฤติกรรมเดิม) · mobile ปักล่าง
- **คีย์โน้ต jianpu:** ✅ โชว์เฉพาะ `mode==='edit'` · ยืด/หดแชร์บรรทัดเดียว (flex, ไม่ตกบรรทัด)
- **registry โหมด edit:** ✅ undo · redo · ฟังท่อน · ฟังทั้งเพลง · หยุด · ส่งตรวจ/อนุมัติ · ดาวน์โหลด — ทำงานเหมือนเดิมทุกปุ่ม (default ตัด "บันทึกร่าง" ตาม DS · ยังเพิ่มกลับได้ในตั้งค่าปุ่ม · เพิ่ม "ฟังทั้งเพลง")
- **⚠️ ยังไม่ทำ (คลื่น 2 ตามสั่ง):** registry sing/print + เมนู dropdown (D7)

### ส่วนที่ 1 — Shell (US ps3-shell S1–S4 + I1)
- **S1 (แถบบนเดียว):** ✅ เมนูชื่อเว็บตัด "ทำเพลง" (B007) → เหลือ **รายการเพลง**(list-music) · คู่มือ(book-open) · เกี่ยวกับเรา(info) · พระคำ.ชีวิต↗(globe) · โหมดที่ใช้อยู่ = พื้นน้ำตาลเด่น (เดิม)
- **S1 ไอคอนโหมด:** ✅ ฝึกร้อง=**mic** · แผ่นเพลง=**music** · แก้ไข=**pencil**
- **S2 ("เพลง ▾" = สร้าง+ค้นหา+เปิด):** ✅ (โหมดอ่าน/แผ่น) ปุ่ม "เพลง ▾" แทน "เปิดเพลง" · panel: **＋สร้างเพลงใหม่ (บนสุด เด่น)** → เส้นคั่น "หรือเปิดเพลงที่มีอยู่" → ช่องค้นหา + รายการ · **จิ้มเพลง = เปิดเลย (ไม่มีปุ่ม OK)** · ↑↓/Enter/Esc (ComboSelect) · มือถือ panel เต็มจอ (B008/B018) · เปิดเพลง = คงโหมดเดิม (US-05)
- **S3 (ชื่อเพลงคลิกแก้ + เมนู):** ✅ บางส่วน — โหมดแก้ไข: ช่องชื่อพิมพ์แก้ inline ได้ (เดิม) + เมนู "จัดการ" มี ตั้งค่า/ออก/ลบ · โหมดอ่าน/แผ่นโชว์ชื่ออ่านอย่างเดียว (ยังไม่มี ▾ ข้างชื่อ — ดูข้อสังเกต)
- **S4 (มือถือ 2 แถว):** ✅ ไม่มี hamburger · แถว 1 = `เพลง.พระคำ.ชีวิต ▾ · ชื่อเพลง ▾ · 👤` · แถว 2 = เมนู (เพลง ▾ + โหมดไอคอนล้วน) เต็มกว้างใต้แถว 1 · login = ไอคอน circle-user บนมือถือ
- **I1 (currentSong เข้า navbar):** ✅ wire `store.currentSong` = เพลงที่เปิดอยู่ (ทุกโหมด + editor ป้อน) → ชื่อบนแถบ + DownloadTool อัปเดตตามเพลง

## ไฟล์ที่แก้ (เจ้าของ worktree นี้)
- `src/components/StudioDock.vue` — **ใหม่** · เครื่องยนต์ dock ร่วม (พอร์ตจาก ps3-dock-prototype)
- `src/components/EditorMode.vue` — **ถอด dock engine ออก** (~250 บรรทัด script+template+CSS) → เรียก `<StudioDock mode="edit" …>` · ไม่แตะ logic แก้เพลงอื่น
- `src/components/Icon.vue` — เพิ่มไอคอน Lucide ที่ dock/shell ใช้ (mic, circle-play, badge-check, ellipsis, blend, sliders-horizontal, grip-vertical, panel-top-close, panel-bottom-open) — additive
- `src/components/ShellBar.vue` — เมนูชื่อเว็บ (ตัดทำเพลง → รายการเพลง)
- `src/components/ProfileTool.vue` — login เป็นไอคอนบนมือถือ (เพิ่ม circle-user + ซ่อน label)
- `src/views/Studio.vue` — ไอคอนโหมด · "เพลง ▾" panel · createNew (remount editor) · openSong (click-to-open) · wire currentSong · `:key` remount
- `src/styles.css` — แถบบนมือถือ 2 แถว (@media 760)
- `src/components/StudioDock.test.js` **(ใหม่)** · `src/components/ShellBar.test.js` **(ใหม่)** · `src/views/Studio.followups.test.js` (อัปเดตให้ตรง flow ใหม่)

## ผลทดสอบ
- **unit:** ✅ ผ่านครบ **80/80** (14 ไฟล์) · เพิ่มใหม่ 10 เทสต์ (StudioDock 8 + ShellBar 2), อัปเดต followups 3 · `npm run build` ผ่าน
- **ตรวจในเบราว์เซอร์ (พอร์ต 5311) แล้ว:**
  - D3 overflow ทำงานจริง (บีบแถบแคบ → ปุ่มยุบเข้า ⋯ + popover โชว์ปุ่มที่ซ่อน)
  - D4 หุบ/กาง + จำค่า · D5 สไลเดอร์เขียน `--dock-alpha`+localStorage · D6 เพิ่ม/เอาออก + จำค่าต่อโหมด · คีย์ palette จิ้มแล้วแทรกลงช่องโน้ตที่โฟกัส
  - เมนูชื่อเว็บ = 4 รายการ ไม่มี "ทำเพลง" · ไอคอนโหมด mic/music/pencil ถูกต้อง
  - "เพลง ▾": ＋สร้างเพลงใหม่ + เส้นคั่น + ค้นหา · จิ้มเพลง = ไป /song/:id ทันที คงโหมด · สร้างใหม่ = editor เปล่า โหมดแก้ไข · โหมดแก้ไขไม่มีปุ่มซ้ำ (เหลือ เพลง/จัดการ ของ editor)
  - มือถือ: แถบ 2 แถว (แบรนด์+ชื่อ+👤 / เมนู) · login เป็นไอคอน

- **วิธี tester ลอง (เปิด <http://localhost:5311>):**
  1. หน้าแรก → กด ▾ ข้างชื่อเว็บ → เห็น รายการเพลง/คู่มือ/เกี่ยวกับเรา/พระคำ.ชีวิต (ไม่มี "ทำเพลง")
  2. เปิดเพลงสักเพลง → โหมด "ฝึกร้อง" → กด "เพลง ▾" → กด "＋สร้างเพลงใหม่" (ได้ editor เปล่า) หรือค้นหาแล้วจิ้มเพลง (เปิดทันที ไม่มีปุ่ม OK)
  3. โหมด "แก้ไข" → ลองแถบล่าง (dock): กด ⚙/sliders ตั้งค่าปุ่ม · ปุ่ม blend ปรับความโปร่ง · ปุ่มหุบแถบ · ลาก ⋮⋮ ย้ายแถบ · จิ้มคีย์ตัวเลขแทรกโน้ต
  4. ย่อจอ/เปิดบนมือถือ → แถบบนเป็น 2 แถว, login เป็นไอคอน, dock ปักล่าง (หุบแล้วมี tab ดึงกลับ)

## ข้อสังเกต / คำถามถึง SA
1. **ขอบเขต S2/S3 กับโหมดแก้ไข:** prompt สั่งแก้ `EditorMode.vue` "เฉพาะถอด dock engine" (editor rebase คลื่น 2) — ผมจึง **ไม่แตะเมนู teleport ของ editor**. ผลคือ:
   - "เพลง ▾" แบบรวม (สร้าง+ค้นหา) ทำครบใน **โหมดอ่าน/แผ่น**; ในโหมดแก้ไขยังใช้เมนู "เพลง"(New/Open/Properties/Close)+"จัดการ" เดิมของ editor. ผมให้ "เพลง ▾" หลบในโหมดแก้ไข → **ไม่มีปุ่มซ้ำ** และตัด "เปิดเพลง" ที่เคยซ้ำออกได้ (ขยับเข้าหา B003 แล้วบางส่วน)
   - **B003 ให้ครบ** (ลบ "เลือกเพลงเพื่อแก้…" ใน editor) + รวม "เพลง ▾" อันเดียวทุกโหมด = ต้องแก้ teleport ของ editor → **ฝากคลื่น 2 (editor rebase)** ตามที่ prompt กันไว้
   - **S3 ▾ ข้างชื่อ** (ตั้งค่า/ออก/ลบ เป็นเมนูเดียว): โหมดแก้ไขมีครบผ่านช่องชื่อ inline + เมนู "จัดการ" อยู่แล้ว · ปุ่ม ▾ เดี่ยวข้างชื่อในโหมดอ่าน/แผ่น (พร้อมลบ = ต้องให้ Studio มีสิทธิ์ลบ) — เสนอทำตอน editor rebase เพื่อไม่ให้ Studio ซ้อนงานลบกับ editor
   → **ถ้า SA อยากให้รวมให้สุดในคลื่นนี้** บอกได้ ผมแก้ teleport ของ editor เพิ่ม (แต่จะชนกับสาย editor คลื่น 2 ตอน merge)
2. **StudioDock เมาต์ที่ EditorMode (ไม่ใช่ Studio):** คลื่น 1 มีแค่โหมด edit ที่ใช้ dock จริง → ให้ EditorMode เรนเดอร์ `<StudioDock mode="edit">` (โหมดแก้ไขครบเหมือนเดิม, ไม่ต้องแตะ Studio). ตอนคลื่น 2 ทำ sing/print ค่อยยก StudioDock ขึ้นไปเมาต์ระดับ Studio ให้ทุกโหมดใช้ร่วม (โครง prop พร้อมแล้ว)
3. **preview ต้องมี launch config:** ผมเพิ่ม config `wt-shell` (`npx vite ../pleng-shell --port 5311 --strictPort`) ใน `.claude/launch.json` ของ **dir หลัก** (ที่ MCP รัน vite) — เป็นไฟล์ shared นอกสาขา ไม่ได้ commit เข้า `wt-shell` เพื่อกัน merge ชน · ถ้าจะเก็บถาวรค่อยเพิ่มเข้า repo
4. **ResizeObserver ในสภาพ headless ของ preview ไม่ fire** (ตรวจแล้ว) — ในเบราว์เซอร์จริงทำงาน · โค้ดมี fallback `window.resize` เรียก fit() อยู่แล้ว จึงไม่พึ่ง RO อย่างเดียว
5. **คีย์ jianpu 21 ตัวบนมือถือแคบ** จะเล็กมาก (ยืดแชร์บรรทัดเดียวตาม DS "ไม่ตกบรรทัด") — ถ้า P'Aim ว่าเล็กไป อาจต้องคุยเรื่องลดชุดคีย์เริ่มต้น (คนละเรื่องกับ dock engine)

## พร้อม merge ไหม
**พร้อม** — โครง Shell + StudioDock ทำครบ AC เท่าที่ขอบเขตคลื่น 1 (ไม่แตะ editor เกินถอด dock) ครอบได้ · unit 80/80 ผ่าน · ตรวจเบราว์เซอร์แล้ว · ไม่แตะไฟล์สาย B (notation/midi/NoteRow/SongSheet/viewer-print content)
ที่เหลือเป็นงาน **คลื่น 2 (editor rebase)** ตามที่ prompt กันไว้: registry sing/print + D7 · B003 ให้สุด · S3 ▾ เดี่ยวข้างชื่อในโหมดอ่าน
