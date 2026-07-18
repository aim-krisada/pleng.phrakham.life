# รายงาน tester (GATE2) — B109 เฟส A: keyboard/on-screen navigation

**สาย:** tester (GATE2) · **branch:** `b109-keyboard` @ `54c3fed` (dev logic `bb18c08` + UX presentation `54c3fed`)
**เครื่องมือ:** Browser pane (geometry เป๊ะ + synthetic focus/keydown สด บนเพลง **หลายห้อง/หลายบรรทัด** ที่ผมสร้างเอง — เคสที่ UX เทสสดไม่ได้)
**🎧 Network URL:** http://192.168.1.124:5344/#/studio (curl 200 · nav buttons render = โค้ด b109 สด)

**สรุป:** 🟡 **CONDITIONAL — nav ใหม่ (ปุ่ม+คีย์+จัมพ์) ผ่านครบ · 1 เรื่อง Home/End ยังค้าง (ตรงที่ UX บอก dev กำลัง apply) + 2 ข้อ mobile รอพี่เปา** · ⛔ ไม่ merge

**โครงสร้างที่ใช้เทส (สร้างเอง):** Line 0 = ห้อง 0-0(1,2,3) + 0-1(4,5,6) · Line 1 = ห้อง 1-0(6,7)

---

## ✅ PASS (วัดสด)

**1) ปุ่มนำทางบนจอ (`.ed-nav-btn`)** — 6 ปุ่ม · **44×44 ทุกปุ่ม** · on-screen · **pageHScroll=0** (desktop 1280) · aria-label ครบถูก: ◀`โน้ตก่อนหน้า`/▶`โน้ตถัดไป` · ⏮`ห้องก่อนหน้า`/⏭`ห้องถัดไป` · ▲`บรรทัดก่อนหน้า`/▼`บรรทัดถัดไป`

**2) jump ด้วยปุ่ม (สิ่งที่ UX เทสไม่ได้ — 1 ห้อง/บรรทัด):**
- ▶ jumpNote: 0-0:1→2→3 (เลื่อนในห้อง) ✓
- ⏭ jumpBar: 0-0→**0-1:4** (โน้ตแรกห้องถัดไป) → **1-0:6 (wrap ข้ามไป line ถัดไป ห้องแรก)** ✓ · ⏮ ถอยกลับ 0-1 ✓
- ▼ jumpLine: →1-0:6 ✓ · ▲ →0-0:1 (line ก่อน ห้องแรก) ✓

**3) คีย์ desktop (dispatch keydown สด):**
- **Tab** → โน้ตถัดไป (0-0:1→2) ✓ · Shift+Tab ถอย (source `jumpNote(-1)`)
- **Ctrl+→/←** → ห้อง (0-0→0-1) ✓ · **Ctrl+↓/↑** → บรรทัด (0-1→1-0) ✓ · **edge guard:** Ctrl+↑ ที่ line 0 = ไม่ขยับ (ถูก)
- **Home/End** → โน้ตแรก/ท้าย**ห้อง** (0-1: End→6 · Home→4) · **Ctrl+Home/End** → แรก/ท้าย**เพลง** (0-0:1 / 1-0:7) ✓
- **ลูกศรเปล่า (ไม่ Ctrl) = native** ไม่ถูก hijack (อยู่โน้ตเดิม) ✓ — `onNavKeys` gate ที่ `editorHasFocus()` + `ctrl&&alt` ปล่อย

**4) toolbox anchor ตามการ jump** — หลัง Ctrl+→ (ไป 0-1:4) และ Ctrl+↓ (ไป 1-0:6) → contextual toolbox **re-anchor เกาะโน้ตใหม่ gap 0 · on-screen** ทุกครั้ง ✓ (ต่อยอด dock-space A-fix)

**5) คู่มือ Guide §② (ห้องทำเพลง)** — render ครบถูก (`Guide.vue:114-121`): ▲▼ "แตะได้ทั้งที่ยังพิมพ์อยู่ ไม่ต้องปิดแป้นพิมพ์" · Tab→โน้ต · Ctrl+ลูกศร→ห้อง/บรรทัด (Win/Linux) · **Mac limit: "Ctrl+ลูกศร Mac กันไว้สลับหน้าจอ → ใช้ Tab/ปุ่มบนจอแทน"** · Enter ยืนยันคอร์ด / Esc ยกเลิก ✓

---

## 🟡 CONCERN — Home/End override native caret (ยืนยันตรงที่ UX บอก dev กำลัง apply)
- **`54c3fed` ยังไม่มี native-caret:** `EditorMode.vue:1878-1879` = `Home`/`End` → `e.preventDefault(); focusEdge()` **ไม่มีเงื่อนไข** (ไม่มี `selectionStart` guard บน Home/End) → **override การเลื่อน caret ต้น/ท้ายข้อความเสมอ**
- **ผลกระทบจริง = ช่องพยางค์/เนื้อ (multi-char):** `focusEdge` ทำงานกับ `.syl-box` ด้วย (`kind = p.onSyllable ? '.syl-box' : ...`) → กด Home/End ในคำยาว จะ**กระโดดไปพยางค์แรก/ท้ายห้อง แทนที่จะเลื่อน caret ในคำ** = ปัญหาตอนแก้เนื้อร้อง (โน้ตช่องเดียวตัวอักษรเดียวไม่กระทบ)
- UX แจ้งว่า agreed = "คง native caret · dev กำลัง apply" → **ยืนยันว่ายังไม่เข้า commit นี้** · **ต้อง re-verify เมื่อ dev apply** (หรือ PM เคาะว่ารับ override ชั่วคราวได้)

---

## ⏳ verified via code+docs+jsdom (เปิด picker สดไม่ได้)
- **Enter/Esc คอร์ด** — คลิก `.chord-cell`/`.chord-add` แบบ synthetic ไม่เปิด picker (ต้อง real pointer ที่ pane ขับไม่ได้) → อาศัย source (`chord-cell @keydown.esc="editingChord=null"` `:3070` + ComboSelect รับ Enter · `editorHasFocus()` ยกเว้น `.chord-pick` ให้ picker คุมคีย์เอง `:1867`) + คู่มือ + dev jsdom (bb18c08)

## 🚩 รอพี่เปามือถือจริง (env นี้ทำไม่ได้ · เหมือนรอบ dock-space)
- **ปุ่ม nav โผล่เหนือ OS keyboard** ตอนพิมพ์เนื้อ (keyboard-aware · ต้องแป้นพิมพ์จริง)
- **narrow 344/390 nav-row fit + no h-scroll** — ตั้ง viewport <755 ไม่ได้ (pane clamp 755 · real Chrome ค้าง max 2560) · UX self-verify 344/375 ในเครื่องเขาแล้ว → พี่เปายืนยันซ้ำ

---

## สรุปให้ PM
- **nav ใหม่ (ปุ่ม+คีย์+จัมพ์+toolbox-follow+คู่มือ) = PASS ครบ** วัดสดบนเพลงหลายห้อง/บรรทัด
- **ค้าง 1:** Home/End override native caret (dev กำลัง apply ตามที่ UX บอก · ผมยืนยันยังไม่เข้า `54c3fed`) → จ่าย dev + re-verify · หรือ PM เคาะรับ override interim
- **รอพี่เปา:** keyboard-aware nav-above-keyboard · narrow 344/390 · (+Enter/Esc live)
- ⛔ tester ไม่ merge

*tester · 2026-07-18 · `54c3fed`*
