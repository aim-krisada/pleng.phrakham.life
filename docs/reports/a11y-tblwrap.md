# a11y-tblwrap — /notation scrollable-region-focusable (axe serious)

**Branch:** `claude/adoring-benz-0d5526` (fork ✓ `studio-shell-redesign` = `976597a`)
**Commit:** `c7a09b4`
**File touched:** `src/views/NotationStandard.vue` เท่านั้น (ไม่แตะ public/arranger/icon)

## โจทย์
`.tbl-wrap` (กล่องครอบตาราง `overflow-x:auto`) เลื่อนด้วยเมาส์ได้ แต่คีย์บอร์ดโฟกัสไม่ได้
→ axe `scrollable-region-focusable` (**serious** · WCAG 2.1.1 Keyboard). หน้านี้ขึ้น deploy รอบ 29.

## ทำ
มี `.tbl-wrap` 4 กล่องในหน้า (§1 สัญลักษณ์ · §1 การผสม · §2 ตัวอย่างเอื้อน · §7 ตารางสรุป).
ทุกกล่อง → เพิ่ม:
- `tabindex="0"` — Tab เข้าได้ + ลูกศรเลื่อนแนวนอนได้
- `role="region"` — เป็น landmark ให้ screen reader
- `aria-label` ต่างกันตามหัวข้อ ("ตารางสัญลักษณ์พื้นฐาน · เลื่อนแนวนอนได้" ฯลฯ)

CSS เพิ่ม `.tbl-wrap:focus-visible` = brand outline 2px offset 2px → โฟกัสเห็นชัด (WCAG 2.4.7).

## DoD — verify (Claude Browser MCP · dev `:5329`)
| เกณฑ์ | ผล |
|---|---|
| axe rule `scrollable-region-focusable` บน /#/notation | **0 violations · 5 passes** ✓ |
| axe full page (ทุก impact) | **0 violations** ✓ |
| 4 กล่อง: tabindex=0 · role=region · aria-label ต่างกัน · scrollableX | ครบทั้ง 4 ✓ |
| Tab เข้ากล่องได้ (`activeElement === .tbl-wrap`) | ✓ |
| ลูกศร/scroll เลื่อนแนวนอนได้ (scrollLeft เปลี่ยน) | ✓ |
| `npm test` | 672/672 tests ✓ (1 "failed suite" = `notationLint.test.mjs` เรียก `process.exit(0)` — quirk เดิมของ vitest, lib file ที่ไม่ได้แตะ) |
| `vite build` | ✓ built |

_(screenshot timeout — flaky ตามปกติ · หลักฐานครบจาก axe + DOM assertion)_

## หมายเหตุ
ไม่แตะไฟล์อื่น · ห้าม merge/deploy เอง — รอ PM.
