# Brief (DEV BUILD) — หน้าคู่มือทำเพลง "มาตรฐานการเขียนโน้ต" + เมนูดรอปดาวน์

**สายงาน slug:** `notation-build` · **branch:** fork **ฐานล่าสุด** `studio-shell-redesign`
**PM ปัจจุบัน:** `pm26` · **ห้าม merge/deploy เอง** · **P'Aim เคาะ GATE 1 (design) แล้ว** — งานนี้คือ "สร้างตามดีไซน์"

## SSOT ที่ต้องทำตาม (อ่านก่อน — อย่าออกแบบใหม่)
- **US:** `docs/us/notation-standard.md` · **DS:** `docs/ds/notation-standard.md` (branch `claude/friendly-nash-594af5` — ดึงมาอ่าน: `git show claude/friendly-nash-594af5:docs/ds/notation-standard.md`)
- แหล่งเนื้อเดิม (ย้ายมา): `src/views/Guide.vue` ① · SSOT อ้างอิง (ลิงก์ ไม่ก๊อป): `docs/song-model-v2.md` · `docs/reports/golden-piano.md` · มาตรฐาน `docs/ui-standards.md`

## งาน (build ตาม DS)
1. **หน้าใหม่ `src/views/NotationStandard.vue`** (route `/#/notation`) — 7 หัวข้อตาม DS §4 (§0 เริ่มที่นี่ · §1 ราก · §2 จังหวะ · §3 โครงเพลง · §4 คอร์ด · §5 เนื้อร้อง · §6 กฎบ้านเรา · §7 ⭐ตาราง "เขียน X→ได้ผล Y แผ่น+เล่น") · ย้าย `SYMBOLS`/`COMBOS` + การ์ด ① จาก Guide มาเป็นแกน + เติมครบ · **callout ⭐ ทุกหัวข้อ** (🎵ผลบนแผ่น · ▶ผลตอนเล่น) · §7 ตารางแมป arranger จริง (ตาม DS §5) · NoteRow render จริง · สารบัญ anchor 7 หัวข้อ
2. **`src/router.js`** — +1 route `/notation` → NotationStandard.vue
3. **`src/views/Guide.vue`** — ตัดการ์ด ① (ตาราง/accidentals/ผสม/ไท-สลัวร์/สัญลักษณ์อื่น/แหล่งอ้างอิง) ออก → เหลือ **② วิธีใช้เว็บ (ครบเดิม) + intro โน้ตสั้น + กล่องสะพาน "เป็นคนทำเพลง? → คู่มือทำเพลง"** · anchor `#howto` คงอยู่ · `#notation` = ชี้ intro สั้น (ไม่ให้ลิงก์เก่าพัง)
4. **`src/components/ShellBar.vue`** — เมนู "คู่มือ" เดี่ยว → **ดรอปดาวน์ 2 เมนูย่อย:** "คู่มือใช้งานโปรแกรม"→/#/guide · "คู่มือทำเพลง"→/#/notation · **เห็นทุก tier (login ไม่เปลี่ยนเมนู)** · **⚠️ สำคัญ: fork ฐานล่าสุด · ต่อยอด ShellBar ปัจจุบัน ไม่รื้อ · คง Studio teleport `#shell-left`/`#shell-menus` + โครงเมนูที่ merge แล้ว (parity/pwa/pk-drawer)** · APG menu keyboard (↑↓/Esc/Enter · aria)
5. **`src/components/EditorMode.vue`** — +ลิงก์ help "คู่มือทำเพลง" (ไอคอน `circle-help`) เปิด `/#/notation` **แท็บใหม่** (กันงานคีย์หาย) · **แตะแค่เพิ่มลิงก์ ไม่แตะ logic แก้ไข**

## DoD (world-class · self-verify ก่อนส่ง)
- ครบ US/DS ทุก AC · 7 หัวข้อ + callout ⭐ ทุกหัวข้อ + §7 ตารางครบทุกแถว · เข้า 2 ทาง (ดรอปดาวน์ + Studio) · เมนูเห็นทุก tier · Guide เหลือ ② + intro (ไม่เหลือกฎละเอียดซ้ำ 2 ที่)
- **self-verify:** `npm test` เขียว (route resolve · Guide ไม่มี SYMBOLS/warn-box แล้ว · 7 anchor id · ดรอปดาวน์เห็นทุก tier) + `vite build` + **axe Tier-A + Tier-B ผ่าน Claude Browser MCP** (contrast/heading-order/APG menu · no-scroll body · target ≥44px · 360/412px ไม่ล้น) เขียวเองก่อนส่ง
- SSOT (song-model-v2/golden-piano) ลิงก์ ไม่ก๊อป · อ้างมาตรฐาน (jianpu/OMT/Laitz)

## Setup + รายงานกลับ
- **verify fork ฐานล่าสุด `studio-shell-redesign`** (`git merge-base` · มี app-name f6641b8 + pwa + parity ครบ) · ผิด → `git switch -c notation-build studio-shell-redesign`
- `npm install` → dev **`--host`** → ส่ง Network URL (clickable · ให้ P'Aim ดูของจริงก่อน deploy)
- **ห้าม merge/deploy เอง** · รายงาน: `docs/reports/notation-build.md` + board §📥 inbox + ping **pm26**
