# รายงาน — wt-dock (dock-core: ปุ่มลอย FAB + รวม dock เป็นตัวเดียว / N1)

**สาขา:** `wt-dock` (ฐาน `studio-shell-redesign`) · **brief:** `docs/pm/brief-dock-core.md`
**ขอบเขตรอบนี้:** **desktop ก่อน** (ให้ core นิ่ง) · มือถือคงพฤติกรรมเดิม (slide-off + tab) ไว้ fast-follow

**ทดสอบสด (มือถือจริงได้):** <http://10.215.141.98:5315>  (dev `--host` ค้างไว้พอร์ต 5315)
**ภาพ 2 สถานะ (ยุบ/กาง):** เปิด `docs/reports/assets/wt-dock-states.html` ในเบราว์เซอร์

---

## สรุปให้ P'Aim (ภาษาคน)

1. **ตอนหุบ dock แล้ว** — เมื่อก่อนเหลือ "แถบยาวๆ ว่างเปล่า" ตอนนี้เหลือ **ปุ่มกลมลอยปุ่มเดียว** (แบบปุ่มช่วยเหลือลอยๆ ของ iPhone)
   - **แตะ** = กางกลับ
   - **กดค้างแล้วลาก** = ย้ายปุ่มไปวางตรงไหนก็ได้ · จำตำแหน่งไว้
2. **ตอนกางอยู่** — มีปุ่มจับ (จุด 6 จุด + ลูกศร) ที่มุมซ้ายของแถบ
   - **แตะ** = หุบ
   - **กดค้างแล้วลาก** = ย้ายทั้งแถบ (เหมือนเดิมจาก B037)
3. **แตะ ≠ ลาก** — ถ้านิ้วขยับเกิน ~5px ถือว่า "ลาก" (ไม่หุบ/กางโดยไม่ตั้งใจ) · ขยับนิดเดียวถือว่า "แตะ"
4. **ไอคอนปุ่ม** = จุดจับ (บอก "ลากได้") + ลูกศร (บอกสถานะ) หลอมเป็นรูปเดียว
   - หุบอยู่ → ลูกศรกางออก (↕ ชี้ออก) = กดเพื่อกาง
   - กางอยู่ → ลูกศรหุบเข้า (↕ ชี้เข้า) = กดเพื่อหุบ
5. **dock เหลือตัวเดียว** — เมื่อก่อน dock ถูกสร้าง 2 ที่แยกกัน (โหมดแก้ไข กับ โหมดฝึกร้อง) ต่างคนต่างจำ ทำให้พฤติกรรมไม่ตรงกัน · ตอนนี้ **มีตัวเดียว** สร้างที่ Studio · **สลับโหมดแล้ว หุบ/ตำแหน่ง เหมือนกันหมด**

---

## ทำอะไรไปบ้าง

### Scope A — ปุ่มลอย FAB + ไอคอนหลอม (แบบ B)
- ลบ UI เดิมตอนหุบ (แถบบาง `.sd-collapsed` + `.sd-tab`) บน **desktop** → แทนด้วย **ปุ่มกลม 48px** (`.sd-fab`, `border-radius:50%`, เงา, `position:fixed`)
- **แตะ vs ลาก** ด้วย pointer events + threshold 5px:
  - `pointerdown` เก็บจุดจับ (offset) ทันที → grab point อยู่ใต้นิ้วตลอด (ไม่กระตุกตอนเริ่มลาก)
  - ขยับเกิน 5px → เป็น "ลาก" (ไม่ toggle) · ไม่เกิน → `pointerup` = "แตะ" (toggle กาง/หุบ)
- **ปุ่มหลอม (fused glyph)** เพิ่มใน `Icon.vue` 2 ตัว: `dock-grip-collapse` (กางอยู่ = grip + chevrons-down-up) · `dock-grip-expand` (หุบอยู่ = grip + chevrons-up-down) · viewBox กว้าง `0 0 34 24` (grip อยู่ซ้ายพิกัดเดิม x≈9/15 · chevron เลื่อนขวา `translate(14,0)`) — `Icon.vue` รองรับ per-icon viewBox ผ่าน `VIEWBOX` map
- **จำตำแหน่ง** แยก 2 ค่า: `pleng.dock.barpos` (ทั้งแถบ) · `pleng.dock.fabpos` (ปุ่มลอย) · clamp ไม่ให้หลุดจอ · ตอนกางกลับ clamp แถบให้พอดีจอ (กันปุ่มลอยอยู่มุมแล้วแถบยาวล้น)
- desktop เท่านั้น: ปุ่มจับหลอมแทน `.sd-grip` + ปุ่มหุบเดิม · **มือถือคงเดิม** (ปุ่มหุบ `.sd-ctl` + slide-off + `.sd-tab`)

### Scope B — รวม dock เป็น instance เดียว (N1)
- ยก `<StudioDock>` ขึ้น mount **ครั้งเดียวที่ `Studio.vue`** · เอาออกจาก `EditorMode.vue` + `SongViewer.vue`
- แต่ละโหมด **ส่งชุดปุ่มขึ้นมาผ่าน event `@dock`** (ไม่ mount dock เอง):
  - `EditorMode` → `emit('dock', { tools, defaultTools, paletteKeys, message, onInsert })` (onInsert = ตัวแทรกโน้ตกลับเข้าช่องที่โฟกัส)
  - `SongViewer` → `emit('dock', { tools, defaultTools })`
- `Studio` เก็บ `editDock`/`viewDock`, มี `sheetDock` (ปุ่มพิมพ์) ของตัวเอง, เลือกด้วย `activeDock` ตามโหมด แล้วป้อนเข้า dock ตัวเดียว
- **collapsed + ตำแหน่ง = ค่าเดียวร่วมทุกโหมด** (localStorage ไม่ผูก mode แล้ว) · **tool order ยังแยกต่อโหมด** (ปุ่มต่างกัน) — dock เป็น instance เดิมตอนสลับโหมด → หุบ/ตำแหน่ง live ตรงกันทุกโหมด
- **ปุ่มพิมพ์ของโหมดแผ่น ย้ายเข้า dock** (ไปในทิศเดียวกับ B041 "ลบปุ่มพิมพ์ซ้ำ") · ลบ `.sheet-toolbar` เดิม → **ขอ P'Aim เคาะ** (ดูข้อสังเกตท้าย)

### D8 — config API แบบ generic (ตาม design-constraint ของ PM · กันรื้อ B043)
- dock config รองรับ **control ที่ไม่ใช่ปุ่ม** ผ่าน tool def แบบใหม่: `{ id, type:'custom', component, props }` → StudioDock render `<component :is>` แทนปุ่ม · dock ไม่รู้ว่าเป็นอะไร **หน้าเป็นเจ้าของ control เอง** (เดินสายผ่าน `props`)
- ผลลัพธ์: อนาคต **transport bar (B043)** — progress + marker ท่อน + play/pause/prev/next — หน้าฝึกร้อง config ใส่ dock เดียวนี้ได้เลย **ไม่ต้องแตะ StudioDock** = ไม่ชนกับงานนี้
- **ยังไม่ได้ build transport bar** (ตามที่ PM สั่ง) — ทำแค่รู "escape hatch" ให้พร้อม · custom control ไหลผ่าน overflow/ตั้งค่าปุ่ม เหมือน tool ปกติ · ผู้ให้ควรส่ง `component` เป็น `markRaw(...)`
- มีเทสต์ยืนยัน custom control render ผ่าน `<component :is>` (ไม่ใช่ปุ่ม) + props ถึงจริง
- **หมายเหตุ (ให้ B043 คิดต่อ):** ถ้า transport bar ต้อง "ปักไว้ไม่ให้ยุบเข้า ⋯" อาจต้องเพิ่ม flag `pinned` ทีหลัง — รอบนี้ยังไม่ทำ (ไม่มี control จริงมาเทสต์)

## ไฟล์ที่แก้
- `src/components/StudioDock.vue` — FAB + ปุ่มหลอม + tap/drag threshold + จำตำแหน่ง bar/fab (ร่วมทุกโหมด) + guard `fit()` กัน crash ตอน unmount
- `src/components/Icon.vue` — เพิ่ม `dock-grip-collapse`/`dock-grip-expand` + รองรับ per-icon `VIEWBOX`
- `src/views/Studio.vue` — mount `<StudioDock>` ตัวเดียว · `editDock`/`viewDock`/`sheetDock`/`activeDock`/`dockMode` · ลบ `.sheet-toolbar` (พิมพ์เข้า dock)
- `src/components/EditorMode.vue` — ถอด `<StudioDock>` · emit `@dock` แทน
- `src/components/SongViewer.vue` — ถอด `<StudioDock>` · emit `@dock` แทน
- เทสต์: `StudioDock.test.js` (tap/drag/FAB) · `Studio.followups.test.js` (พิมพ์ผ่าน dock) · `SongViewer.play.test.js` (harness จำลอง Studio ป้อน dock)

## พิสูจน์แล้ว (เล่นจริงในเบราว์เซอร์ ไม่ใช่แค่เช็ค DOM)
ยิง pointer events จริง (down/move/up) แล้ววัดผล — ผ่านทั้งหมด:
1. **แตะปุ่มจับ → หุบ** → แถบซ่อน (`display:none`) · ปุ่มลอยกลมโผล่ · `pleng.dock.collapsed=1` ✅
2. **ลากปุ่มลอย (>5px) → ย้าย ไม่กาง** · grab point ตรงใต้เคอร์เซอร์เป๊ะ (error dx/dy = 0) · ยังหุบอยู่ ✅
3. **แตะปุ่มลอย → กาง** · แถบกลับมา · clamp เข้าจอ · คีย์โน้ต 21 ปุ่มกลับมา ✅
4. **ลากปุ่มจับตอนกาง → ย้ายทั้งแถบ ไม่หุบ** · เลื่อนตรงระยะที่ลาก · `position:fixed` ✅
5. **คีย์โน้ต jianpu แทรกผ่าน dock ตัวรวม** → โฟกัสช่องโน้ต กดคีย์ "5" → ช่องได้ "5" (สาย `@insert` ทะลุ Studio ครบ) ✅
6. **สลับโหมด หุบค้าง** → หุบในโหมดแก้ไข → สลับไปโหมดแผ่น → **ยังหุบอยู่** (state ร่วม instance เดียว) · โหมดแผ่นมีปุ่มพิมพ์ใน dock · ไม่มีคีย์โน้ตนอกโหมดแก้ไข ✅
7. ไม่มี console error

## เทสต์ + build
- `npm test` → **113/113 เขียว** (เพิ่ม 4 เคส: tap→หุบ+FAB→กาง, ลากเกิน threshold ไม่ toggle, jitter ต่ำกว่า threshold = แตะ, custom control D8 render)
- `npm run build` → ผ่าน (คำเตือน fonts เดิม ไม่เกี่ยว)

## DoD
- [x] ยุบ = ปุ่มลอยกลมเดียว · ลากย้ายได้ · แตะ = กาง (desktop)
- [x] กาง = แตะปุ่ม combined = หุบ · ลากปุ่มจับ = ย้าย dock (B037 ยังทำงาน)
- [x] แตะ vs ลาก แยกถูก (threshold ~5px)
- [x] dock instance เดียวจาก Studio · ฟีเจอร์เดิมครบ (คีย์โน้ต edit ✓ · tools sing ✓ · print ✓)
- [x] `npm test` เขียว · `npm run build` ผ่าน
- [~] screenshot ยุบ/กาง — **เครื่องมือ screenshot ของ preview ในเซสชันนี้ค้าง (timeout 5 ครั้ง)** → ให้ภาพแทนที่ `docs/reports/assets/wt-dock-states.html` (glyph จริงจากแอป) + LAN URL ให้ P'Aim/พี่เปาดูสด

## รอบ 2 — แก้ตาม real-use ของ P'Aim (5 จุด)
P'Aim ลองจริงเจอ 5 จุด — แก้แล้วบน wt-dock เดิม · พิสูจน์สดด้วย pointer events จริง:
1. **ปุ่มลอยอยู่จุดที่กดยุบ ไม่กระโดดไปมุม** ✅ — ตอนหุบ `collapse()` ตั้ง `fabPos` = ตำแหน่งปุ่มจับ (center 48px บนปุ่ม) · วัดสด: fabCenter = handleCenter เป๊ะ (308,757)
2. **ปุ่มลอยเด่นขึ้น + ผ่าน WCAG 2.2 AA** ✅ — พื้นสีแบรนด์ (#8B4513) + ไอคอนขาว = **contrast 7.1:1** (เกิน 1.4.11 non-text ≥3:1 และเกิน text 4.5:1) · เงาเข้มขึ้น
3. **⋯ "ดูเพิ่ม" ขวาสุดของแถวเครื่องมือ** ✅ — เรียง `.sd-rc` ใหม่: ความโปร่ง → ตั้งค่าปุ่ม → ⋯ (ตอน sing ทุกปุ่มพอดีเลยไม่มี ⋯ โผล่ · ถ้ามี overflow จะอยู่ขวาสุด)
4. **transparency (blend) ปรับได้** ✅ — **ตรวจแล้วทำงานปกติทั้งโหมดแก้ไข + ฝึกร้อง** (สไลเดอร์ → `--dock-alpha` → พื้นโปร่ง + จำค่า · เช่น 0.62 → `rgba(255,255,255,0.62)`) · **ไม่พบ regression ใน wt-dock** — ถ้า P'Aim ยังเจอ อาจเป็นบิลด์เก่า/เครื่อง ขอ repro เพิ่ม
5. **"แสดงผล" โชว์ค่าที่เลือก + ปุ่มฟอนต์ครบ** ✅ — (5a) เพิ่ม badge บนปุ่มแสดงผล (ครบ/คอร์ด/โน้ต/เนื้อ/โน้ตล้วน) เหมือน คีย์(E)/ความเร็ว(84) · (5b) ขยาย dock desktop `max-width` 640→**700px** → ชุดฝึกร้องเต็ม (play·chord·tempo·key·แสดงผล·วนซ้ำ·ก−·ก+·พิมพ์) โชว์ครบบนแถบ ไม่ตกเข้า ⋯ (มือถือยังเต็มจอเหมือนเดิม)

**เทสต์:** 113/113 เขียว · build ผ่าน · ไม่มี console error
**หมายเหตุ:** play/pause ไม่มีพื้น + transport bar = B043 (แยก) ไม่ใช่รอบนี้
**board:** ผมไม่แก้ `docs/pm/board.md` เอง (สำเนาใน worktree เก่ากว่าของ PM — กันเขียนทับ) · ฝาก PM เพิ่มบรรทัด inbox ตาม ping

## ข้อสังเกต / ขอ P'Aim เคาะ
- **ปุ่มพิมพ์ในโหมดแผ่น ย้ายเข้า dock ลอย** (ลบปุ่มพิมพ์แยกด้านบน) — เพื่อ "dock ตัวเดียวทุกโหมด" + ทิศเดียวกับ B041 · ถ้าอยากได้ปุ่มพิมพ์เด่นๆ ในหน้าแผ่นด้วย บอกได้ จะคงไว้คู่กัน
- **มือถือ** รอบนี้ยังเป็นของเดิม (slide-off + tab) ตามที่ตกลง desktop ก่อน · เฟสหน้าทำ FAB ให้มือถือแบบ iOS
