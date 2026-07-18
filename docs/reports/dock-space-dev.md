# รายงาน dev — dock-space / คืนพื้นที่ editor (engine lane)

**สาย:** dev (engine + logic · HYBRID SOP §3.0) · **branch:** `dock-space-dev` (rebased บน `dock-space-ux` `10a3207` ตาม PM · ไม่ใช่ main/base เปล่า)
**สถานะ:** 🟢 **engine ครบ 4 ชิ้น commit + test แล้ว — รอ (1) UX wire `:auto-hide` (2) PM sequence EditorMode wiring (3) 2-host phrakham gate**
**ไฟล์:** `src/components/DockKey.vue` + `DockKey.test.js` **เท่านั้น** (verify: `git diff 10a3207..HEAD` = แตะ 2 ไฟล์นี้ล้วน · **ไม่แตะ EditorMode/editItems/toolbox/save** = lane UX)
**🎧 Network URL:** **http://192.168.1.124:5313/#/studio** (curl 200 · ⚠️ IP `10.189.195.98` ตายแล้ว ใช้ `192.168.1.124`)

---

## สิ่งที่ส่งมอบ (4 commit · ตาม SA feasibility ทุกข้อ)

| # | commit | ทำอะไร | SA ref |
|---|---|---|---|
| 1 🥇 | `1cd032c` | **slot render ใน ⚙ panel** (`kind:'slot'`) + `panelOpenId` (one-at-a-time ตัวที่ 2 · เปิด popover ใน ⚙ โดย ⚙ ไม่ปิด) | **unblock UX** ย้าย soundctl/export เข้า ⚙ |
| 2 | `3955a1f` | **hide-on-scroll** · prop `auto-hide` (default **false** · พระคำ opt-in) · window scroll · rAF+directional delta (ลง>8 ซ่อน · ขึ้น>4 คืน) · `.dk-shift` wrapper (translateY แยกจาก drag transform บน `.dk-dock`) · peek handle · a11y toggle ⚙ + `prefers-reduced-motion`→off + focus-guard | Q1·Q3 |
| 3 | `27f5d9b` | **cap=f(width)** · `clamp(floor(w/50),3,14)` · observe `documentElement` (full-width ref · **ไม่ใช่ dock** = กัน feedback loop) ผ่าน `ro` ที่เคยว่าง · `mobile` derive จาก width เดียวกัน · **แก้ Fold-jump 760** · ปุ่มคง `--touch-min` 44/42/40 | Q4 |
| 4 | `e406e29` | **keyboard-aware** · `visualViewport` height drop >150px = คีย์บอร์ด (URL-bar ~60-100px แยกออก) · fallback focusin · ไม่แตะ meta · keyboardUp guard hide-on-scroll ด้วย | Q2 |

**guards ครบ (hide ไม่ลั่นกลางแก้):** ไม่ซ่อนเมื่อ popover เปิด · คีย์บอร์ดขึ้น · focus อยู่ใน dock · กำลังลาก

---

## verify (self · ก่อนส่ง tester)

- **Tester A (vitest/jsdom) — DockKey +13 tests → 29 tests เขียว** (มี real mounted component + real scroll/resize/vv events + assert class จริง):
  - slot-in-panel: render `#cell-<id>` ใน ⚙ · popover เปิดโดย ⚙ ไม่ปิด
  - hide-on-scroll: off-by-default (พระคำ regression) · ลง→ซ่อน+peek · ขึ้น→คืน · top dead-zone · popover guard · peek คืน · toggle persist · reduced-motion off
  - cap=f(width): wide merge/narrow 2 rows+dk-m · pinned pack น้อยแถวลงเมื่อกว้าง (ต่อเนื่อง ไม่กระโดด 760)
  - keyboard: vv drop>150 ซ่อน+คืน · URL-bar collapse ~90px ไม่นับเป็นคีย์บอร์ด
- **full suite: 728 tests pass** · build ✓ · **0 Vue warning** · (`notationLint` แดง = pre-existing `process.exit(0)` · 72/72 ผ่านข้างใน · ยืนยันไม่เกี่ยว)
- **live smoke (Browser MCP → worktree 5313):** `.dk-shift` render จริงในแอป · **0 console error** · hostDisplay flex (mount ไม่พัง layout)

### ✅ 2-host gate (phrakham island) — rebuild + live smoke PASS
- **rebuild:** build `pk-dock-island.js` จาก **DockKey ของผม** (island worktree `angry-galileo-10ad10` · `PLENG_SRC=<my worktree>/src` · **output → scratch ไม่แตะ phrakham tree** · git assets/ clean) → **15 modules · 524ms · bundle มี engine ใหม่ (`autoHidden`/`dk-shift`/`nextHidden`)** = **DockKey ผม bundle เข้า island สะอาด**
- **source-safe:** `IslandApp.vue` `<DockKey>` **ไม่ส่ง `auto-hide`** → hide/keyboard **inert** · ⚙ ของพระคำ = toggle/slider/note (ไม่มี slot-kind) → slot-in-panel ไม่ยิง · scale(Aa) = bar item ถาวร ไม่ใช่ ⚙
- **live smoke (Chromium จริง · bundle ผม · demo `about.html`):**

  | จอ (content W) | mount | rows | h-scroll | auto-hidden | หมายเหตุ |
  |---|---|---|---|---|---|
  | 344 | ✅ | 1 | ❌ ไม่มี | false (inert) | `--touch-min` 40px floor |
  | 690 | ✅ | 1 | ❌ | false | dkm=true |
  | 768 (753) | ✅ | 1 | ❌ | false | dkm=true (scrollbar −15) |
  | 1200 (1185) | ✅ | 1 | ❌ | false | **dkm=false** (mobile off ถูก) |

  **0 console error** ทุกจอ · **ไม่มี Fold-jump** (690↔768 ต่อเนื่อง) · **auto-hide inert ทุกจอ = พระคำไม่ regress** ✅
- ⚠️ **ข้อสังเกต harness:** Browser MCP `resize_window` ไม่ยิง `resize` event ให้ page → ต้อง `dispatchEvent('resize')` เอง dkm ถึง update (พิสูจน์: 1200 dispatch → dkm flips false ถูก) — logic ถูก, เป็น quirk ของ tool ไม่ใช่บั๊กโค้ด
- **⛔ ยังไม่ commit `pk-dock-island.js` เข้า phrakham** = post-merge + pk-PM (build ไป scratch เท่านั้น)

### ⚠️ device-matrix Tier-B ฝั่ง editor (auto-hide จริง) — ทำที่ integration
- **hide/keyboard/peek บน editor** วัดสดยังไม่ได้เพราะ **editor ยังไม่ผ่าน `:auto-hide`** (= EditorMode · lane UX/PM-sequence) → **แต่พฤติกรรมพิสูจน์แล้วผ่าน Tier-A (real events) + engine เดียวกับ island ที่ smoke ผ่าน**
- **→ device-matrix editor พร้อมเลข = tester Tier-B gate หลัง wire `:auto-hide` + serve บนฐาน** (SOP GATE 2)

---

## ต้องทำต่อ (นอก lane ผม · PM sequence)

1. **UX/EditorMode wiring (1 บรรทัด):** ใส่ `:auto-hide="true"` ที่ `<DockKey ... >` (`EditorMode.vue:2994`) — **ผมไม่แตะ EditorMode ตามกฎ 1-file-1-lane** · PM สลับให้ dev ทำ wiring pass หลัง UX วาง toolbox เสร็จ
2. **UX:** set `soundctl`/`export` เป็น `default:'inSetting', pinnable` ใน `editItems` (ตอนนี้ทำได้แล้ว — #1 ปลดล็อก)
3. **🔴 2-host DoD (phrakham · ต้องประสาน pk PM):** engine เปลี่ยน → **rebuild `pk-dock-island.js` + gate พระคำ 344/690/768** · **new behavior หลัง prop `auto-hide` (พระคำไม่ opt-in = เหมือนเดิม)** · always-on ที่กระทบพระคำ = **cap=f(width)** (island ~4-5 ปุ่ม → cap แทบไม่ bind = low-risk แต่ต้อง gate) · slot-in-panel กระทบเฉพาะถ้าพระคำมี slot ใน ⚙ (ไม่มี)

---

---

## 6 · joint-pass wiring plan (prep · ไม้ต่อ) — dev pass บน EditorMode หลัง UX วาง template

**ลำดับ (PM sequence · dev = pass 2):** UX วาง toolbox template/CSS + `:auto-hide="true"` บน `dock-space-ux` → freeze → PM เคาะ → dev `git rebase dock-space-dev` บน latest `dock-space-ux` → wire.

**Q1/Q2 verify แล้ว (EditorMode:2884-2937):**
- `.slot-tools`(◀▶ :2911) + `.seg-tools`(copy/del :2934) **อยู่ `.seg-col` เดียวกัน** (`v-for (seg,si) in bar.segments` :2884) → `(li,bi,si,bar,seg)`+`cell.slot` พร้อมกัน = **ไม่ต้อง reverse-lookup**
- functions พร้อม: `pullSlot(i)`/`pushSlot(i)` (:336/329 · แก้ `lensRow.syllables` · lens-only) · `duplicateSegment(bar,si)`/`removeSegment(bar,si)` (:954/947 · ทุกโหมด) · octave = `NoteBoxes` child

**dev จะ wire:**
1. **`focusedSeg` ref ใหม่** (ยังไม่มี · =0) — set ผ่าน `@focusin` บน `.seg-col` (`NoteBoxes`=native input · focus bubbles ไม่ stopProp) → `"li-bi-si"` = โน้ต scope trigger ตอนพิมพ์โน้ต (ไม่มี lens)
2. merged toolbox: `focusedSlot` → ◀▶ (slot) · `focusedSeg` → copy/del (note) · ในกล่อง anchored เดียว
3. **continuity (SA §7):** เก็บ selection ใน ref อิสระจาก `@blur` (ไม่ล้างทันที) หรือ restore focus หลัง resize settle — จุดเดียวคุม `focusedSlot`+`focusedSeg` (กันพับ/หมุน/ปิดแป้น toolbox หาย)
4. positioning: note ก่อน · bar(`barMenuOpen`)/line(`activeLine`)/section(`activeStanza`) = เฟสถัดไป

**⚠️ บอก UX:** `.seg-tools` วันนี้โชว์ตลอด → contextual = copy/del ซ่อนจนกดโน้ต (behavior change · ตรงเจตนา แต่ให้ P'Aim/UX รู้)
**verify:** editor data จริง (เพิ่มโน้ต→verse lens→focus syl-box · ⛔ ไม่ verify จอเปล่า) + device-matrix

*dev · engine lane · 2026-07-18 · engine `1cd032c`/`3955a1f`/`27f5d9b`/`e406e29` + 2-host gate `99c9002` · Q1/Q2 ตอบแล้ว · รอ UX template+freeze → PM เคาะ joint pass · ⛔ ไม่ merge เอง*
