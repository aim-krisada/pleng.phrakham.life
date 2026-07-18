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

### ⚠️ device-matrix Tier-B (344/390/690/834/desktop) — ทำที่ integration
- **hide/keyboard/peek** วัดสด "ตัวเลข" ไม่ได้ตอนนี้เพราะ **editor ยังไม่ผ่าน `:auto-hide`** (= EditorMode · lane UX/PM-sequence) → dock live ยังพฤติกรรมเดิม
- **worktree caveat:** Browser pane อ่าน dock 0-width (dock ต้องอยู่สถานะ edit จริง + pane rendering quirk) → เชื่อ Tier-A + compile ตาม `CLAUDE.md`
- **→ device-matrix พร้อมตัวเลข = tester Tier-B gate หลัง wire + serve บนฐาน** (SOP GATE 2)

---

## ต้องทำต่อ (นอก lane ผม · PM sequence)

1. **UX/EditorMode wiring (1 บรรทัด):** ใส่ `:auto-hide="true"` ที่ `<DockKey ... >` (`EditorMode.vue:2994`) — **ผมไม่แตะ EditorMode ตามกฎ 1-file-1-lane** · PM สลับให้ dev ทำ wiring pass หลัง UX วาง toolbox เสร็จ
2. **UX:** set `soundctl`/`export` เป็น `default:'inSetting', pinnable` ใน `editItems` (ตอนนี้ทำได้แล้ว — #1 ปลดล็อก)
3. **🔴 2-host DoD (phrakham · ต้องประสาน pk PM):** engine เปลี่ยน → **rebuild `pk-dock-island.js` + gate พระคำ 344/690/768** · **new behavior หลัง prop `auto-hide` (พระคำไม่ opt-in = เหมือนเดิม)** · always-on ที่กระทบพระคำ = **cap=f(width)** (island ~4-5 ปุ่ม → cap แทบไม่ bind = low-risk แต่ต้อง gate) · slot-in-panel กระทบเฉพาะถ้าพระคำมี slot ใน ⚙ (ไม่มี)

---

*dev · engine lane · 2026-07-18 · commit `1cd032c`/`3955a1f`/`27f5d9b`/`e406e29` · รอ PM sequence + P'Aim ลองรวมตอน integrate*
