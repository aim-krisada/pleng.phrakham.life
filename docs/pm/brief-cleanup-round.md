# Brief — เก็บกวาดรวม (icon any-split + shell overflow root + นัชวิลล์ sync + guide② wording)

**สายงาน slug:** `cleanup-round` · **branch:** fork **ฐานล่าสุด** `studio-shell-redesign` (มี notation+icon+app-name merged แล้ว)
**PM ปัจจุบัน:** `pm26` · **ห้าม merge/deploy เอง** · refine ไม่ redesign · P'Aim สั่ง "แก้เลย ทุกงานเล็ก"

รวม 4 งานเล็กในสายเดียว (คนละไฟล์กันเป็นส่วนใหญ่ · ทำเรียงกันในworktree เดียว):

## 1. 🎨 แยกไอคอน "any" ออกจาก maskable (P'Aim เคาะ = แยก)
- ตอนนี้ android-512(any) = ภาพเดียวกับ maskable (กุญแจเล็ก เผื่อขอบ safe-zone) → any/favicon เลยกุญแจเล็กเกิน
- **ทำ:** regenerate ไอคอน **"any" + favicon + apple-touch ให้กุญแจเต็มขอบกว่า** (เว้นขอบน้อยลง · พื้น #363636 full-bleed เหมือนเดิม) · **คง `maskable-512.png` เดิม** (safe-zone) ไม่แตะ
  - regenerate: `favicon.ico`(16/32/48) · `favicon-16/32` · `apple-touch-icon`(180 ทึบ) · `android-chrome-192/512` = กุญแจเต็มขึ้น
  - source: `docs/pm/icon-source/pleng-icon-source.png` · เทคนิค: ดู `docs/reports/icon-refresh.md`
  - manifest: android-512 (any) กับ maskable-512 ตอนนี้ชี้คนละไฟล์อยู่แล้ว — คง 2 entry (any=android-512 กุญแจเต็ม · maskable=maskable-512 เผื่อขอบ)

## 2. 🐞 แก้บั๊ก shell ตารางล้นจอ (root · ทั้งเว็บ)
- ต้นตอ (dev notation-build เจอ): `main.container` `flex-shrink:0` → child กว้าง (ตาราง) ดันหน้าล้นแนวนอนบนมือถือ
- **ทำ:** แก้ที่ root ใน `styles.css` ให้ container ยอมหด/ไม่ให้ child ดันล้น (เช่น `min-width:0` บน flex child · หรือถอด flex-shrink:0 ถ้าปลอดภัย) → ทุกหน้าได้ประโยชน์
- **⚠️ verify ไม่ regress:** เช็กทุกหน้า (รายการเพลง/หน้าเพลง/Studio/คู่มือ/notation/about) desktop+360/412 = ไม่มี body h-scroll + layout shell ไม่เพี้ยน · notation-build ใส่ local cap ตารางไว้ = คงได้ (ซ้ำซ้อนไม่เป็นไร) หรือถอดถ้า root fix ครอบแล้ว

## 3. 📝 sync คำ "นัชวิลล์" → "คอร์ดโรมัน" (ค้างในเอกสาร/คอมเมนต์)
- `docs/us/ps3-dock*.md` (~บรรทัด 51) · `docs/us/ps3-viewer*.md` (~บรรทัด 9) · `docs/ds/dockkey-print-edit.md` (~บรรทัด 26 · badge เดิม "145" → "I·V") · design prototypes 3 ไฟล์ (`docs/design/*.html`) · `src/lib/chords.js:1` (comment)
- grep repo หา "นัชวิลล์" ให้ไม่เหลือค้าง (ยกเว้นถ้าเป็น history log ที่ไม่ควรแก้ → flag)

## 4. 📖 guide ② wording — "คอร์ดโรมัน" ให้สอดคล้อง
- เช็ก `src/views/Guide.vue` ② (หลัง notation-build) — ถ้ายังเขียนคอร์ดแบบกลางๆ/ไม่ตรง → ปรับให้เรียก "คอร์ดโรมัน" สอดคล้องกับปุ่ม + หน้า notation

## DoD
- ไอคอน any กุญแจเต็มขึ้น (เทียบ maskable เห็นต่าง) · maskable คงเดิม · มุมทึบ #363636 · build+dist ครบ
- shell: 0 body h-scroll ทุกหน้า 360/412 + desktop · ไม่ regress
- grep "นัชวิลล์" = 0 (นอก history) · guide ② พูดคอร์ดโรมัน
- `npm test` เขียว + `vite build` + self-verify axe/no-scroll (Claude Browser MCP) · **หลักฐาน:** ภาพ any vs maskable + screenshot มือถือ 360 ไม่ล้น

## Setup + รายงานกลับ
- verify fork ฐานล่าสุด `studio-shell-redesign` (`git merge-base`) · ผิด → `git switch -c cleanup-round studio-shell-redesign`
- `npm install` → dev `--host` → Network URL (clickable link)
- **ห้าม merge/deploy เอง** · รายงาน: `docs/reports/cleanup-round.md` + board §📥 inbox + ping **pm26**
