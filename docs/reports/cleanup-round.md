# Report — cleanup-round (shell overflow root + นัชวิลล์ sync + guide②)

**สายงาน:** `cleanup-round` · **branch:** `claude/zealous-morse-efdc99` (fork ฐานล่าสุด `studio-shell-redesign` = `aacb1c4` · มี notation+icon+app-name merged)
**PM:** pm26 · **สถานะ:** เสร็จ 3 งาน · verify จริงผ่าน · **รอ P'Aim เคาะ + PM merge** (ห้าม merge/deploy เอง)
**dev `--host` (มือถือทดสอบ):** http://192.168.1.124:5299/

> ⚠️ **scope เปลี่ยน (pm26 · 16 ก.ค.):** งานไอคอน (เดิมข้อ 1) + `site.webmanifest` **ถูกตัดออกจาก cleanup-round** — P'Aim เปลี่ยนดีไซน์เป็นพื้นขาว+กุญแจทองอุ่น → แยกเป็น task `icon-v2` ต่างหาก. ไฟล์ไอคอนที่เคยแก้ **revert กลับ base ครบแล้ว** (diff เทียบ base ไม่เหลือ `public/` หรือ manifest). `maskable-512.png` + `site.webmanifest` ไม่เคยแตะ.

## สรุป 3 งาน

### 1. 🐞 แก้บั๊ก shell ตารางล้นจอ (root · ทั้งเว็บ)
- **ต้นตอ (วัดจริง):** `main.container` เป็น flex item (`flex:1 0 auto`) ใน `#app` (flex column) → cross-axis width โตเกิน 100% ของ #app ได้เมื่อ min-content ลูกกว้าง → หน้า guide ล้น 4px (container 364.45 บน viewport 360)
- **แก้ที่ `src/styles.css`:** cap `max-width: min(var(--container), 100%)` (+ `min(var(--container-wide), 100%)` สำหรับ studio-wide) + `min-width:0` บน main.container → container ไม่มีวันเกิน viewport · ดีไซน์กว้างเดิมยังใช้บนจอใหญ่
- **ทำไมไม่ใช้ `#app{overflow-x:hidden}`:** จะพัง `position:sticky` ของ ShellBar · `min-width:0` เดี่ยวไม่พอ (ทดสอบแล้วยัง 364.45) → cap 100% คือ root fix จริง
- notation local table-cap (`.tbl-wrap`) คงไว้ (ซ้ำซ้อนไม่เป็นไร ตาม brief)

### 2. 📝 sync "นัชวิลล์" → "คอร์ดโรมัน"
| ไฟล์ | เปลี่ยน |
|---|---|
| `src/lib/chords.js:1` | comment `Nashville-number` → `Roman-numeral` |
| `docs/us/ps3-viewer.md:9` | `ตัวเลขนัชวิลล์` → `คอร์ดโรมัน` |
| `docs/us/ps3-dock.md:51` | `เลขนัชวิลล์` → `คอร์ดโรมัน` |
| `docs/ds/dockkey-print-edit.md:26` | `เลขนัชวิลล์ (1 4 5)` → `คอร์ดโรมัน (I IV V)` · badge `ABC·145·—` → `ABC·I·V·—` |
| `docs/design/dockkey-prototype.html:177-178` | label + badge (`145`→`I·V`) |
| `docs/design/ps3-dock-prototype.html:167,178` | `เลขนัชวิลล์` → `คอร์ดโรมัน` |
| `docs/design/ps2-studio-prototype.html:322` | `ตัวเลข (นัชวิลล์)` → `คอร์ดโรมัน (I IV V)` |

### 3. 📖 guide ② wording
- `src/views/Guide.vue` ② หัวข้อ `คอร์ดเป็นตัวเลข` → **`คอร์ดโรมัน`** ("...เป็นเลขโรมันตามลำดับขั้นในคีย์ (I IV V)") สอดคล้องกับปุ่ม + หน้า notation

## DoD verify (จริง ไม่เดา)
| เช็ก | ผล |
|---|---|
| 0 body h-scroll ทุกหน้า (list/guide/notation/about/studio) @ 360 + 412 + 1280 | ✅ วัด `scrollWidth-clientWidth=0` ทุกคู่ |
| desktop centering ไม่ regress | ✅ container 852px @1280 = **ค่าเดิม** (plain `900px` ก็ได้ 852 — column-flex cross-axis เดิม · min() ไม่เปลี่ยน) |
| grep "นัชวิลล์" = 0 นอก history + NotationStandard (ดู flag) | ✅ |
| guide ② = "คอร์ดโรมัน" | ✅ |
| `npm test` | ✅ **672/672 tests เขียว** (suite `notationLint.test.mjs` ขึ้น "failed" = quirk `process.exit` เดิม ไม่เกี่ยว) |
| `vite build` | ✅ built ~2.3s |
| self-verify axe (list/guide/notation/about @360) | ✅ list/guide/about = 0 violations · notation = 1 (ดู flag ด้านล่าง) |

**หมายเหตุ screenshot:** `computer screenshot` (Claude Browser MCP) time-out ทุกครั้ง (flaky ตาม CLAUDE.md) — renderer ยังตอบ eval ปกติ · ใช้หลักฐาน DOM/eval (`scrollWidth`) แทนตาม convention · P'Aim ดูจริงบนมือถือได้ที่ Network URL ด้านบน

## 🚩 flag → PM (out-of-scope — ไม่แก้เอง)
1. **`src/views/NotationStandard.vue:339` ยังมีคำ "นัชวิลล์" — เจตนา (ไม่ใช่ mislabel):** เป็นข้อความ "กฎบ้านเรา" อธิบาย *ทำไม*ใช้คอร์ดโรมัน ไม่ใช่นัชวิลล์ ("เลขนัชวิลล์ 1 4 5 จะปนสายตากับเลขทำนอง — โรมัน I IV V แยกชัด"). ลบคำออก = ทำลายเหตุผลที่ถูกต้อง → **คงไว้ + ฝาก PM เคาะ** ว่าจะให้ถือเป็น "0 นอก history" ตาม DoD หรือให้ rewrite (ผมแนะนำคงไว้)
2. **a11y pre-existing บนหน้า notation:** axe เจอ `scrollable-region-focusable` (serious · 2 nodes) ที่ `.tbl-wrap` ใน `NotationStandard.vue` (สาย notation-build ถือ · มีมาก่อน ไม่ใช่ regression ของ cleanup-round). fix เล็ก: เพิ่ม `tabindex="0"` + `role="region"` + `aria-label` บน `.tbl-wrap` → ให้ keyboard เลื่อนตารางได้ (WCAG 2.1.1). ฝาก PM จ่ายรอบเก็บกวาดถัดไป

## ต่อไป
- ห้าม merge/deploy เอง — รอ pm26 gate + P'Aim go
