# Tester QA — เมนูเพลง breakpoint 767/768 → 991.98/992 (re-check)

**สรุป (F60+):** ✅ **PASS ทั้ง 5 AC** — breakpoint สลับ ☰ drawer ↔ nav inline ที่ **991/992 เป๊ะ** ตาม DS §4 · จุดเสี่ยงเดิม 768/900 = drawer ครบเนื้อ เปิด/ปิดได้ · ≥992 desktop ไม่ regress · <768 ไม่มี h-scroll ปุ่มไม่ล้น · login + Studio teleport + console clean · 523 tests + build ผ่าน. **ไม่พบ regression — พร้อมให้ PM merge.**

**Branch ตรวจ:** `menu-breakpoint-992` HEAD `c40afc9` (worktree `intelligent-cerf-a9e45f`)
**merge-base:** `ce41874` = HEAD `studio-shell-redesign` ✅ (ไม่ใช่ main)
**Diff (src) ยืนยันด้วย git:** `ShellBar.vue` (15 · icon-removal) + `styles.css` (8 · breakpoint 2 บรรทัด) — ไม่แตะ JS behavior
```
-@media (min-width: 768px) { .sb-drawer { display: none; } }
-@media (max-width: 767px) {
+@media (min-width: 992px) { .sb-drawer { display: none; } }
+@media (max-width: 991.98px) {
```
**สเปกอ้างอิง:** `docs/ds/menu-drawer-spec.md` §4 (`<992` = drawer · `≥992` = nav inline · พระคำใช้ 991.98)
**วิธีวัด:** real browser (Claude Browser MCP · tab `seed`) · `resize_window` แต่ละ width → `getComputedStyle` + `getBoundingClientRect` live (ไม่เดาจาก source)

---

## ตาราง AC → PASS/FAIL (วัดจริง)

| AC | เกณฑ์ | วัดได้ | ผล |
|---|---|---|---|
| **1** | **768px** (จุดเสี่ยง): drawer · nav inline ซ่อน · burger โชว์ · เปิด/ปิดได้ · เนื้อครบ | `.sb-nav`=**none** · `.sb-burger`=**flex** · brand icon-only (`.sb-app-ico`=block, `.sb-brand-text`=none) · เปิด drawer → resting left448→right768 (w320) **ในจอเต็ม** · nav 4 ลิงก์ (รายการเพลง · คู่มือ · พระคำ.ชีวิต↗ · เกี่ยวกับเรา) + หัวข้อ "เครื่องมือ" + font 2 ปุ่ม (ก ข ค ไม่มีหัว/มีหัว) · ปิด → `.sb-drawer` หายจาก DOM | ✅ PASS |
| **1** | **900px** (จุดเสี่ยง): เหมือน 768 | `.sb-nav`=none · `.sb-burger`=flex · drawer resting left580→right900 (w320) ในจอ · nav 4 ลิงก์ + เครื่องมือ + font 2 ปุ่ม · no h-scroll | ✅ PASS |
| **1** | **boundary 991px** = ยังเป็น drawer | 991: `.sb-nav`=none · `.sb-burger`=flex · no h-scroll | ✅ PASS |
| **2** | **≥992 ไม่ regress desktop** | **992**: `.sb-nav`=**flex** · `.sb-burger`=**none** · `.sb-brand-text`=block · nav 4 ลิงก์ inline · no h-scroll — สลับเป๊ะที่ 992 · **1200**: nav flex · burger none · brand-text โชว์ · no h-scroll | ✅ PASS |
| **3** | **<768 (360/412)** เหมือนเดิม · ไม่มี h-scroll · ปุ่มขวา ≤ vp | **360**: drawer · hScroll=false · 0 ปุ่มบนแถบล้น vp · **412**: drawer · hScroll=false · 0 ปุ่มล้น vp | ✅ PASS |
| **4** | login + Studio teleport (`#shell-menus`) ทำงาน · console clean | login `.sb-login` อยู่ในแถบทุก width (1200 right ≤ vp) · `/studio` 412: `#shell-menus` teleport (2 children · order:10 · basis:100% → ตกแถว 2 ตามดีไซน์) · 1200: order:0 inline · **console errors = 0** | ✅ PASS |
| **5** | test เดิมเขียว + build ผ่าน (notationLint fail=pre-existing) | **523 tests passed** (52 files) · **build ok** (`✓ built in 2.00s`) · `notationLint.test.mjs` = 1 file "failed" = `process.exit(0)` quirk เดิม (สำเร็จ แต่ vitest ฟ้อง) ไม่เกี่ยวไฟล์ที่แก้ — ตาม brief "ไม่นับ" | ✅ PASS |

---

## วัดจริง — computed display ที่ 768/900/1200 (+ boundary)

| width | โหมด | `.sb-nav` | `.sb-burger` | brand | drawer resting (finish anim) | h-scroll |
|---|---|---|---|---|---|---|
| 360 | drawer | none | flex | icon | — | ❌ ไม่มี |
| 412 | drawer | none | flex | icon | — | ❌ ไม่มี |
| **768** | **drawer** | none | flex | icon | left448→right768 w320 ในจอ | ❌ ไม่มี |
| **900** | **drawer** | none | flex | icon | left580→right900 w320 ในจอ | ❌ ไม่มี |
| **991** | **drawer** | none | flex | icon | — | ❌ ไม่มี |
| **992** | **nav inline** | **flex** | none | text | (ไม่มี drawer) | ❌ ไม่มี |
| 1200 | nav inline | flex | none | text | (ไม่มี drawer) | ❌ ไม่มี |

**Boundary เป๊ะ:** 991px = drawer · 992px = nav inline → ตรง DS §4 (`<992` / `≥992`).

---

## หมายเหตุ verify (โปร่งใส — ไม่ fake-pass)
- **Screenshot ค้าง (timeout 30s)** — tab MCP เป็น `visibilityState:hidden` (dev เตือนไว้) → renderer/animation ถูก throttle · **ไม่แนบภาพ** → วัด DOM แทนตามที่ brief อนุญาต.
- drawer animation (`sb-drawer-in 0.18s`) ถูก throttle ค้าง keyframe แรก (นอกจอ) เพราะ hidden tab — **ไม่ใช่บั๊ก + CSS drawer ไม่ถูกแตะในงานนี้** · วัดตำแหน่งพักจริงโดยสั่ง `getAnimations().forEach(a=>a.finish())` ก่อน `getBoundingClientRect` → ทุก width drawer พักชิดขวาในจอเต็ม (ตารางบน). ผู้ใช้จริง (tab visible) เห็น slide-in จบใน 0.18s.
- เปิด/ปิด drawer พิสูจน์ด้วย DOM lifecycle: กด ☰ → `.sb-drawer` เข้า DOM · กดซ้ำ → หายจาก DOM (ปิดจริง ไม่ใช่แค่ซ่อน).

## DoD
- ✅ ตรวจ real browser 7 widths (360/412/768/900/991/992/1200) — AC1–5 ครบ.
- ✅ git-verify diff = src 2 ไฟล์ (ShellBar.vue + styles.css · breakpoint 2 บรรทัด) · ไม่เกินขอบเขต.
- ✅ 523 tests + build ผ่าน.
- ⛔ **Tester ไม่ merge / ไม่แก้โค้ด** — ส่งคืน PM.

## Next (PM)
**PASS → merge `menu-breakpoint-992` เข้า base `studio-shell-redesign` ได้ (branch มีครบ icon-removal + breakpoint · merge อันเดียวจบ).** deploy เฉพาะเมื่อ P'Aim สั่ง.
