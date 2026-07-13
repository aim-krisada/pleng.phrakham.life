# Report — เมนูเพลง breakpoint 767→992 (parity เต็ม · Dev · เพลง/pleng)

**Branch:** `menu-breakpoint-992` — fork จาก commit `a25fb24` (branch เมนูเดิม `claude/wizardly-mcnulty-97ecf3`) เพื่อให้ได้ **ทั้ง 2 การเปลี่ยน** (เอาไอคอน nav ออก + breakpoint) · merge-base = `ce41874` = HEAD ของ `studio-shell-redesign` ✅ (ไม่ใช่ main)
**สเปกร่วม:** `docs/ds/menu-drawer-spec.md` §4 (RATIFIED) — `< 992px` = drawer · `≥ 992px` = nav inline (พระคำใช้ 991.98px)
**ที่มา:** flag จาก report เมนูเดิม (`docs/reports/menu-pleng.md` §🚩) → **P'Aim เคาะ parity เต็ม** → task นี้
**Network URL (verify มือถือจริง):** http://192.168.1.124:5424/ (`--host` · launch config `cerf` = worktree นี้)

## Objective (จุดเดียว)
เมนูเพลงเดิมสลับเป็น ☰ drawer ที่ **767/768px** → เปลี่ยนเป็น **991.98/992px** ให้ตรงพระคำ + DS §4. Refine ไม่ redesign.

## สิ่งที่แก้ (จริง · 2 บรรทัด CSS)
`src/styles.css` — บล็อกเดียว (บรรทัด 437–438):

| เดิม | ใหม่ |
|---|---|
| `@media (min-width: 768px) { .sb-drawer { display: none; } }` | `@media (min-width: 992px) { … }` |
| `@media (max-width: 767px) { …โหมดมือถือ… }` | `@media (max-width: 991.98px) { … }` |

- **ไม่แตะ JS** — `ShellBar.vue` เป็น CSS-only breakpoint (ยืนยันด้วย grep: ไม่มี `innerWidth`/`matchMedia`/`resize`). สลับ desktop↔drawer เกิดจาก media query ล้วน.
- **ไม่แตะ** `--bp-md: 768px` (token) และ `SongList.vue` book-grid `768px` — คนละเรื่อง (grid ชั้นวางหนังสือ ไม่เกี่ยวเมนู).
- style มือถือในบล็อก `max-width` (shell-title font · brand icon-only · shell-menus order:10) ตอนนี้ครอบถึง 991 — verify แล้วช่วง 768–991 layout ไม่เพี้ยน (ตารางล่าง).

## Verify — real browser, 5 widths (live computed, tab emulate)
วัด `getComputedStyle` + `getBoundingClientRect` บน live worktree (ไม่เดาจาก source). drawer เปิดวัดที่ตำแหน่งพักจริง (finish animation — ดูหมายเหตุ).

| width | โหมด | `.sb-nav` | `.sb-burger` | drawer อยู่ในจอ | h-scroll | ปุ่มขวาล้น vp |
|---|---|---|---|---|---|---|
| **360** (มือถือ) | drawer | none | flex | ✅ left 58→right 360 (w302) | none | 0 |
| **412** (มือถือ) | drawer | none | flex | ✅ left 92→right 412 (w320) | none | 0 (login r404 ≤ 412) |
| **768** (แท็บเล็ต · เดิม desktop) | **drawer** | none | flex | ✅ left 448→right 768 | none | 0 |
| **900** (แท็บเล็ต) | **drawer** | none | flex | ✅ left 580→right 900 | none | 0 |
| **1200** (desktop) | nav inline | **flex** | none | (ไม่มี drawer) | none | 0 |

- **AC1 (768–991 จุดเสี่ยง regress):** ✅ 768 + 900 = drawer, nav inline ซ่อน, burger โชว์, brand เป็น icon-only. เปิด/ปิด drawer ได้ (toggle ปิดคืน → `.sb-drawer` หายจาก DOM = ปิดจริง). drawer เนื้อครบ: 4 nav links (`รายการเพลง · คู่มือ · พระคำ.ชีวิต↗ · เกี่ยวกับเรา`) + หัวข้อ "เครื่องมือ" + 2 ปุ่ม font "ก ข ค". อยู่ในจอเต็ม.
- **AC2 (≥992 ไม่ regress):** ✅ 1200 = nav inline `flex`, burger `none`, brand-text โชว์.
- **AC3 (<768 เหมือนเดิม):** ✅ 360 + 412 = drawer, ไม่มี h-scroll, ปุ่มขวาทุกตัว right ≤ vp.
- **AC4 (login + Studio teleport):** ✅ login (`.sb-login`) คงบนแถบทุก width. `/studio` → `#shell-menus` รับ mode switch (ฝึกร้อง/แผ่นเพลง/แก้ไข/จัดการ) ปกติ · ที่ 900px `#shell-menus` `order:10 flex-basis:100%` ตกแถว 2 (top 56) ตามดีไซน์ · console ไม่มี error.
- **AC5 (test + build):** ✅ **523 tests ผ่าน** (`ShellBar.test.js` เขียว) · **build ผ่าน** (137 modules, 2.0s). `notationLint.test.mjs` โชว์ "failed suite" = quirk เดิม (`process.exit(0)` = สำเร็จ · vitest ฟ้อง) ไม่เกี่ยวไฟล์ที่แก้ — ตาม brief "ไม่นับ".

## หมายเหตุ verify (โปร่งใส)
tab ใน MCP browser เป็น `visibilityState: hidden` → CSS animation (`sb-drawer-in 0.18s`) ถูก throttle ค้างที่ keyframe แรก (`translateX(100%)` = นอกจอ). **ไม่ใช่บั๊ก + ไม่เกี่ยว breakpoint** (drawer CSS ไม่ถูกแตะ) — ผู้ใช้จริง tab visible จะเห็น slide-in จบใน 0.18s. วัดตำแหน่งพักจริงโดยสั่ง `animation.finish()` ก่อน `getBoundingClientRect` → ทุก width drawer พักชิดขวาในจอเต็ม (ตารางบน).

## DoD
- ✅ verify มือถือจริง (emulate) 5 widths: 360 / 412 / 768 / 900 / 1200 — ครบ AC1–5.
- ✅ diff เล็ก 2 บรรทัด (`styles.css` เท่านั้นใน src) · ไม่แตะ ShellBar.vue/EditorMode/SongSheet.
- ✅ เปิด `--host` + Network URL ด้านบน.
- ⛔ **ไม่ merge / ไม่ deploy เอง** — รอ PM gate + tester.

## Next (PM)
1. gate: git-verify diff (`git diff a25fb24 -- src/` = styles.css 2 บรรทัด) → tester เทียบ DS §4 + AC ทั้ง 5 บน browser จริง (tab visible เพื่อเห็น animation).
2. รวมกับ branch เมนูเดิม: branch นี้ fork จาก `a25fb24` แล้ว = มีทั้ง icon-removal + breakpoint ในตัว → merge branch นี้เข้า base ได้ทีเดียว (ไม่ต้อง merge เมนูเดิมแยก).
3. merge → base `studio-shell-redesign` · deploy เฉพาะเมื่อ P'Aim สั่ง.
