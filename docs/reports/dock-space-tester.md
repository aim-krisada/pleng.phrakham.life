# รายงาน tester (GATE 2) — dock-space / คืนพื้นที่ editor

**สาย:** tester (GATE 2 · ยืนยันก่อนถึงพี่เปา) · **branch:** `dock-space-dev` @ `6c3b225`
**เครื่องมือ:** Browser pane (วัด layout ≥755px · หมุน DOM/computed) + **real Chrome (claude-in-chrome)** สำหรับ scroll/focus จริง (pane เลื่อน/โฟกัสจริงไม่ได้ ตามที่ report เตือน — พิสูจน์ซ้ำแล้ว: `scrollTo`/`scrollTop` = no-op ใน pane)
**🎧 Network URL (มือถือลองจริงได้):** **http://192.168.1.124:5344/#/studio** (curl 200 · vite `--host` · footer stamp = `6c3b225*` ตรง branch)

**สรุปคำตัดสิน:** 🟡 **CONDITIONAL — engine ผ่านแกนหลัก แต่มี 2 ข้อของ contextual toolbox ต้องให้ UX/dev แก้ก่อน + 3 ข้อรอพี่เปายืนยันบนมือถือจริง** (สภาพแวดล้อมตั้ง viewport <755px ไม่ได้) · **ยังไม่ merge**

---

## ผลต่อข้อ (เซ็นทีละข้อ)

### 1) Dock slim — ✅ PASS
- ⚙ Setting panel มีครบ + **ปักได้ทุกตัว:** `เสียงดนตรี`(soundctl)+ปัก · `ฟังทั้งเพลง`(playAll)+ปัก · `ดาวน์โหลด`(export)+ปัก · `ดูผลทั้งเพลง`+ปัก (วัดจาก DOM ของ `.dk-pop.dk-panel` สด)
- source ยืนยัน: `soundctl/export` = `kind:'slot', default:'inSetting', pinnable:true` · `playAll` = `default:'inSetting', pinnable:true` (`EditorMode.vue:1877/1882/1884`)
- **แถบหลัก:** grip(ย้าย/ย่อ) · ย้อน · ทำซ้ำ · ฟังท่อน · ⚙ ตั้งค่า — ทั้งหมด **44×44** ✓
- `บันทึกร่าง`(draft) มีที่นั่งถาวรบนแถบ `place:{row:2,col:3}` แต่ `hidden:!loggedIn` → **anon (ที่ผมทดสอบ) เลยไม่เห็น** = ถูกต้องตาม auth · **พี่เปา (login) จะเห็น draft/บันทึกบนแถบ** (ยืนยันจาก source · ยังไม่ได้ login เพื่อดูสด)

### 2) Hide-on-scroll (เลื่อนจริง) — ✅ PASS (บน real Chrome)
- `:auto-hide="true"` wired ที่ `EditorMode.vue:3148` · engine = window `scroll` listener (rAF + directional delta · `DockKey.vue:152`)
- **เลื่อนลงจริง (computer scroll gesture):** scrollY 0→1000 → `.dk-shift.hidden`=true (translateY≈199px พ้นจอ) + **peek handle โผล่** ✓
- **เลื่อนขึ้นจริง:** dock กลับมาเต็ม (คีย์+เครื่องมือ) · `hidden`=false · peek หาย ✓
- **peek handle:** 56×44 · aria `"แสดงแถบเครื่องมือ"` · `elementFromPoint` = peek เอง · `pointer-events:auto` · เรียก handler แล้ว dock กลับมาจริง ✓ (คลิกด้วย coordinate ของผมพลาดเพราะ screenshot ถูกสเกลจาก 2560px = artifact ฝั่งผม ไม่ใช่บั๊ก)
- guard ทำงาน: `atTop y≤40` ไม่ซ่อนใกล้บนสุด · popover/keyboard/focus-in-dock ไม่ซ่อน (source `DockKey.vue:142`)

### 3) Keyboard-aware (มือถือ) — ⚠️ ยืนยันสดไม่ได้ → รอพี่เปามือถือจริง
- logic wired: `visualViewport` height drop >150px = คีย์บอร์ด (`DockKey.vue` · `932cca5`) → ซ่อน dock + contextual toolbox อยู่เหนือคีย์บอร์ด
- **ทำไมยืนยันสดไม่ได้:** desktop Chrome/pane **สร้างคีย์บอร์ดจอ (soft keyboard) ที่ยิง `visualViewport` resize ไม่ได้** — ต้องมือถือจริง · dev มี Tier-A jsdom test (vv drop>150 → ซ่อน · URL-bar collapse ~90px ไม่นับ) ผ่าน
- **→ พี่เปาต้องลองบนมือถือจริง:** เปิดแป้นพิมพ์ตอนแก้โน้ต → dock หายไหม · toolbox octave/copy/del ลอยเหนือแป้นพิมพ์ไหม

### 4) Contextual toolbox — 🟡 ฟังก์ชันผ่าน แต่ 2 เรื่องต้องแก้
**ผ่าน (วัดสด):**
- โฟกัสโน้ต → toolbox โผล่กลุ่ม **octave ▼▲ + คัดลอก + ✕ลบ** (aria ครบ) · syllable → **◀▶** (mutually exclusive · template `selSlot>=0 ? ◀▶ : octave`) ✓
- **octave ▲ ทำงานจริง:** ค่าโน้ต `5`→`5'` (jianpu `'`บน / `.`ล่าง · `octaveShift` `EditorMode.vue:927`) ✓ · copy = `duplicateSegment` ✓
- ⚠️ **ยังไม่ได้ทดสอบ ◀▶ สด** (ต้องมีเนื้อ/พยางค์ · DB anon ว่าง สร้างเพลงมีคำสดไม่สะดวก) → ยืนยันจาก template + dev unit test "focus syllable → ◀▶+copy/del"

**🔴 CONCERN A (anchoring — ไม่ตรง AC "อยู่ใกล้โน้ต"):**
- `.slot-tools { left:50%; translateX(-50%) }` = **จัดกึ่งกลาง `.seg-col` (ทั้ง segment) ไม่ใช่กึ่งกลางโน้ตที่เลือก**
- วัดสด (desktop · เพลงทำนอง 15 โน้ตใน 1 segment กว้าง 716px): โฟกัสโน้ตซ้ายสุด → toolbox **ห่างไปขวา 335px** · โฟกัสโน้ตขวาสุด → **ห่างไปซ้าย 302px** · `sameToolboxX=true` (ไม่ขยับตามโน้ตเลย)
- **แนวตั้งถูก** (เกาะเหนือแถวโน้ต gap~3px · commit 6c3b225 แก้แล้ว) · **แนวนอนผิด**
- **ขอบเขตผลกระทบ:** หนักตอน **ป้อนทำนอง (segment กว้าง หลายโน้ต)** = เคสหลักของ octave · เพลงมีคำ (segment ต่อพยางค์ ~1 โน้ต แคบ) จะเบากว่า (กึ่งกลาง≈ใกล้โน้ต)
- **เสนอ:** คำนวณ `left` จากตำแหน่ง x ของ `activeInput` + clamp ในจอ (ไม่ให้พ้นขอบ)

**🔴 CONCERN B (touch target ต่ำกว่าเกณฑ์):**
- ปุ่มใน toolbox (▼▲ octave · คัดลอก · ✕ลบ · ◀▶) วัดจริง = **30×26px** (`.slot-btn min-width:30 min-height:26`)
- ต่ำกว่าเป้าโปรเจกต์ **44 (desktop) / 40 (mobile)** · ผ่าน WCAG 2.5.8 (24px) แบบเฉียด 2px · **✕ลบ เป็น action ทำลาย ที่ 26px = พลาดง่ายบนมือถือ**
- **เสนอ:** ยกปุ่ม toolbox ให้ ≥40px (mobile) — เป็น element ใหม่ของ dock-space (ไม่ใช่ของเดิม)

**หมายเหตุขอบ (priority ต่ำ):** `octaveShift` ไม่กันช่องที่ไม่ใช่โน้ต — โฟกัสช่องเส้นห้อง `|` แล้วกด ▲ ได้ `|'` (source แก้ `activeInput.value` ตรง ๆ ไม่เช็ก token) · ไม่กระทบ flow ปกติแต่ควรกันไว้

### 5) Continuity — ✅ PASS
วัดสด (real Chrome): ตั้ง selection แล้ว
- **blur (ปิดคีย์บอร์ด):** toolbox อยู่ ✓ · **resize (พับ/หมุน):** อยู่ ✓ · **mousedown ในตัว:** อยู่ ✓ · **mousedown นอก:** เคลียร์ ✓
- sticky ผ่าน `focusedSeg`/`selSlot` ไม่ล้างตอน blur (`EditorMode.vue:333/339`) · ล้างเฉพาะ outside `mousedown` (`onSegOutside` · `document.addEventListener('mousedown', ...)`)
- หมายเหตุ: ล้างผูก `mousedown` (ไม่ใช่ `pointerdown`) — บน touch ยังโอเค (มี compat mouse event) แต่ `pointerdown` จะแกร่งกว่า

### 6) Device matrix (§5.5) — 🟡 บางส่วน + narrow ยืนยันสดไม่ได้
| จอ | ตั้งได้สด? | h-scroll | dock fit | toolbox | หมายเหตุ |
|---|---|---|---|---|---|
| **desktop 1280** | ✅ pane | **0** ✓ | ✓ (392px) | ✓ fit | สะอาด |
| **tablet 768** | ✅ pane | มี (จาก edit-strip) | ✓ (392px) | (ดู note) | ดูด้านล่าง |
| **690 / 390 / 344** | ❌ | — | — | — | ตั้ง viewport <755 ไม่ได้ (ดู limitation) |

- **h-scroll ที่ 768 = ของ `.seg-strip/.note-boxes` (น: `flex-wrap:nowrap`) ไม่ใช่ dock** — dock กว้าง 392px fit เสมอ · **ยืนยันจาก diff:** dock-space แตะ `.seg-col` แค่เพิ่ม `position:relative` · `note-boxes nowrap` = **ของเดิม (unchanged)** → overflow นี้เป็น pre-existing + ถูกขยายด้วย test data ผม (ยัด 17 โน้ตใน segment เดียว) · เพลงจริงแตก segment ต่อพยางค์ → `.seg-strip` wrap ได้
- **touch floors:** dock tools 44×44 ✓ · peek 56×44 ✓ · **jianpu keypad 33×44** (ของเดิม · 21 คีย์แชร์แถวเดียวตาม US D3 · ไม่ใช่ regression dock-space) · **contextual toolbox 30×26 ✗** (= CONCERN B)
- **a11y:** toggle "ซ่อนแถบเมื่อเลื่อนอ่าน" อยู่ใน ⚙ ✓ (วัดสด) · `prefers-reduced-motion → auto-hide OFF` ✓ (source `autoHideEnabled` gate) · aria-label ครบบน toolbox/peek/dock ✓
- **⚠️ narrow 344/390/690 = ยืนยันสดไม่ได้ในสภาพแวดล้อมนี้:** Browser pane clamp ที่ ~755px (ตั้ง 344 → innerWidth 755) · real Chrome ค้าง maximized 2560 (`resize_window` = no-op · outerW=0) → **keypad 344 (21 คีย์แถวเดียว) fit, cap=f(width) Fold-jump, toolbox 344-clamp ยังไม่ได้วัดสด** → พึ่ง dev Tier-A (cap=f(width) tests) + dev island smoke 344/690/768 + **พี่เปามือถือจริง**

### 7) 2-host (phrakham) ไม่ regress — ✅ PASS (เชิงสถาปัตยกรรม + หลักฐาน dev)
- **การันตี opt-in:** `autoHide:{type:Boolean, default:false}` (`DockKey.vue:32`) · engine ทั้งหมด gate ที่ `autoHideEnabled = props.autoHide && !autoHideOff && !reduceMotion` · `onScroll` early-return ถ้าไม่เปิด → **พระคำไม่ส่ง `auto-hide` = hide/keyboard inert 100%**
- always-on เดียวที่กระทบพระคำ = **cap=f(width)** (island ~4-5 ปุ่ม → cap แทบไม่ bind = low-risk)
- dev rebuild `pk-dock-island.js` จาก DockKey นี้ + smoke 344/690/768/1200 = 0 error (หลักฐานใน `docs/reports/dock-space-dev.md` §2-host)
- **ผมไม่ได้ rebuild island เอง** (phrakham เป็นคนละ project tree · ไม่อยู่ใน worktree นี้ · ต้อง repo พระคำ + build chain) → **อาศัยการันตี opt-in prop + หลักฐาน dev**

---

## สิ่งที่ให้ dev/UX แก้ (≤3 loop · ผม gate ไม่แก้เอง)
1. **CONCERN A — anchoring:** toolbox เกาะ x ของโน้ตที่เลือก (ไม่ใช่กึ่งกลาง segment) + clamp ในจอ · [UX]
2. **CONCERN B — touch target:** ปุ่ม toolbox ≥40px (mobile) · โดยเฉพาะ ✕ลบ · [UX/dev]

## รอพี่เปายืนยันบนมือถือจริง (สภาพแวดล้อม tester ทำไม่ได้)
3. **item 3 keyboard-aware:** เปิดแป้นพิมพ์ตอนแก้ → dock หาย + toolbox ลอยเหนือแป้น
4. **item 6 narrow 344/390/690:** keypad ไม่ล้น/ไม่ตกบรรทัด · toolbox ไม่พ้นจอ · ไม่มี h-scroll แนวนอน
5. **item 4 ◀▶ + item 1 draft บนแถบ:** ลองบนเพลงจริงที่มีคำ + ตอน login

## ยังไม่ merge (PM gate ต่อ) · หลักฐานทั้งหมดวัดสด (DOM/computed/real-scroll) ไม่ได้เดา

*tester · 2026-07-18 · commit `6c3b225`*
