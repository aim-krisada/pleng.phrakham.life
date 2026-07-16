# notation-build — หน้า "มาตรฐานการเขียนโน้ต" + เมนู "คู่มือ ▾" ดรอปดาวน์

**สาย:** `notation-build` · **branch:** `notation-build` (fork ฐานล่าสุด `studio-shell-redesign` · merge-base = tip `bf62fae`)
**PM:** pm26 · **สถานะ:** ✅ dev เสร็จ · self-verify เขียวครบ · **รอ PM gate + P'Aim verify → ห้าม merge/deploy เอง**

## ดูของจริงก่อน deploy (มือถือได้เลย)
- **หน้าคู่มือทำเพลง:** http://192.168.1.124:5420/#/notation
- **หน้าคู่มือใช้งาน (ตัดแล้ว):** http://192.168.1.124:5420/#/guide
- **เมนู "คู่มือ ▾":** อยู่บนแถบบนทุกหน้า (เดสก์ท็อป = ดรอปดาวน์ · มือถือ = ในเมนู ☰)
- **help ในห้องทำเพลง:** http://192.168.1.124:5420/#/studio → ลิงก์ "คู่มือทำเพลง" บนแถบบน (เปิดแท็บใหม่)

## ทำอะไรไปบ้าง (5 ไฟล์ ตาม brief + DS)

1. **`src/views/NotationStandard.vue` (ใหม่ · route `/#/notation`)** — หน้า "มาตรฐานการเขียนโน้ต"
   - **สารบัญ (TOC)** sticky บน PC · แถบเลื่อนแนวนอนบนมือถือ · anchor แชร์ลิงก์ได้ (`#/notation#roots` ฯลฯ)
   - **7 หัวข้อครบ:** §0 เริ่มที่นี่ · §1 ราก (`#roots`) · §2 จังหวะ+ห้อง (`#rhythm`) · §3 โครงเพลง (`#form`) · §4 คอร์ด (`#chords`) · §5 เนื้อร้อง (`#lyrics`) · §6 กฎบ้านเรา (`#house-rules`) · §7 เขียน→ผล ⭐ (`#write-to-result`)
   - **callout ⭐ ทุกหัวข้อ §1–§6** (🎵 ผลบนแผ่น · ▶ ผลตอนเล่น) — มิติ "เขียน X ได้ผล 2 ทาง" แทรกในที่ ไม่รอไปรวมท้าย
   - **§7 ตารางเรือธง** 12 แถว (input · 🎵 แผ่น · ▶ เล่น · อ้างอิง) แมปเข้า arranger จริง (ไท→legato · ป้ายท่อน→rubato · ท่อนรับ→comp เข้ม · ซ้ำ/volta→ลำดับเล่น · ทำนอง→ตัวขับเรียบเรียง) · แถวที่ผลตอนเล่นเด่นสุด = เน้นพื้นสี
   - **NoteRow render จริง** (ไม่ใช่ภาพ mock) — ยก `SYMBOLS`/`COMBOS` + การ์ด ① จาก Guide มาเป็นแกน + เติม §2 ไท/สลัวร์, §3 ฟอร์ม, §4 คอร์ด, §5 เนื้อร้อง, §6 กฎบ้านเรา
2. **`src/router.js`** — +route `/notation` → NotationStandard.vue (scrollBehavior เดิมรองรับ `to.hash` อยู่แล้ว)
3. **`src/views/Guide.vue`** — ตัดการ์ด ① ละเอียด (ตาราง/accidentals/ผสม/ไท-สลัวร์/สัญลักษณ์อื่น/แหล่งอ้างอิง) ออก → เหลือ **② วิธีใช้เว็บ (ครบเดิม)** + **intro โน้ตสั้น** (อ่านออกพอร้อง) + **กล่องสะพาน** "เป็นคนทำเพลง? → คู่มือทำเพลง" · anchor `#howto` + `#notation` คงอยู่ (ลิงก์เก่าไม่พัง)
4. **`src/components/ShellBar.vue` + `src/styles.css`** — เมนู "คู่มือ" เดี่ยว → **ดรอปดาวน์ 2 ย่อย** (คู่มือใช้งานโปรแกรม→/guide · คู่มือทำเพลง→/notation)
   - **เห็นทุก tier** (ไม่ผูก `store.session` — เมนู nav เป็น static อยู่แล้ว)
   - **ต่อยอด ShellBar ปัจจุบัน ไม่รื้อ** — คง teleport `#shell-left`/`#shell-title`/`#shell-menus` + PKDrawer core + โครงเมนูที่ merge แล้ว (parity/pwa/drawer) · desktop = ปุ่ม+ดรอปดาวน์ (reuse `.sb-dropdown`) · mobile = 2 ลิงก์ในดรอเวอร์
   - **APG menu button:** `aria-haspopup`/`aria-expanded` · เปิด Enter/Space/↓ · เดิน ↑↓ Home/End · ปิด Esc (คืนโฟกัสปุ่ม) + แตะนอก (backdrop เดิม) · target ≥ 44px
5. **`src/components/EditorMode.vue`** — +ลิงก์ help "คู่มือทำเพลง" (ไอคอน `circle-help`) บนแถบเครื่องมือ editor · เปิด `/#/notation` **แท็บใหม่** (`target=_blank rel=noopener` · กันงานคีย์หาย) · **แตะแค่เพิ่มลิงก์ ไม่แตะ logic**

## SSOT · มาตรฐาน (ลิงก์ ไม่ก๊อป)
- อ้าง **jianpu (Numbered musical notation · Wikipedia)** · **Open Music Theory** · **The Complete Musician (Laitz)** — align UP
- อ้าง `docs/song-model-v2.md` (โมเดล/พยางค์/repeat-volta) + `docs/reports/golden-piano.md` (arranger) แบบ **อ้างอิงในตาราง §7 + ส่วนแหล่งอ้างอิง ไม่ทำซ้ำเนื้อหา** (repo เป็น private → อ้างเป็นชื่อเอกสาร ไม่ hyperlink ให้ user เจอ 404)

## self-verify (เขียวเองก่อนส่ง)
- **`npm test`:** 672 passed · +10 test ใหม่ (`NotationStandard.test.js`: route resolve · 7+1 anchor · callout §1–§6 มี 🎵+▶ · §7 12 แถว · h1 เดียว/heading order · SSOT อ้างไม่ก๊อป · Guide ตัดจริง — ไม่มี `.guide-table`/`.warn-box`, มีสะพาน→/notation) · +4 test `ShellBar.test.js` (ดรอปดาวน์เปิด role=menu 2 ย่อย→/guide+/notation · เห็นทุก tier ตอน login · ดรอเวอร์มี 2 ย่อย · Esc ปิด+คืนโฟกัส)
  - _(1 test file "failed" = `notationLint.test.mjs` เป็น standalone self-`process.exit(0)` · pre-existing บน base · ไม่เกี่ยวงานนี้ · ไม่ได้แตะ)_
- **`vite build`:** ✓ (150 modules · font warning เดิม ไม่เกี่ยว)
- **axe (Claude Browser MCP · live):**
  - **Tier A** — color-contrast · heading-order · link-name · button-name · td-headers/scope · list · **0 violations** · เมนูเปิด: aria-required-children/parent · aria-roles/allowed-attr · **0 violations**
  - **Tier B (วัดจริง 360/412px)** — page horizontal overflow = **0** · ตารางทุกตัว scroll ในกล่องตัวเอง (`overflow-x:auto`) ไม่ดัน body · TOC link สูง **44px** · ดรอปดาวน์ item **44px** · popover อยู่ในจอ + ยึดปุ่ม · keyboard ↑↓/Esc ผ่าน
- **contrast fix:** คอลัมน์อ้างอิงบนแถวเน้นสี `--muted` (#757575) ตก 4.31:1 → เปลี่ยนเป็น #616161 (≈5.4:1) ผ่าน 4.5:1

## หมายเหตุถึง PM (ตรงไปตรงมา)
- **latent bug ของ shell (ไม่ได้แก้ที่ root · แก้เฉพาะหน้านี้):** `main.container` เป็น `flex-shrink:0` → โตตาม min-content ของเนื้อ ไม่ใช่ตามจอ · ตาราง 4 คอลัมน์ (§7) ดันทั้งหน้าล้นแนวนอนบนมือถือ · **fix = cap `.notation-page { max-width: calc(100vw - 24px) }`** ให้ `overflow-x:auto` ของกล่องตารางทำงาน (ตาราง scroll ในกล่อง body ไม่ scroll) · เดสก์ท็อปไม่กระทบ (container max-width 900 คุมอยู่แล้ว) · **ไม่แตะ shell ร่วม** (refine ไม่ redesign · เลี่ยง collision) — ถ้าอยากแก้ root (`flex-shrink:1`) ทั้งเว็บ = งานแยก ประเมิน regression ทุกหน้าก่อน
- **collision icon-refresh:** ไม่แตะ `public/icons` / `site.webmanifest` / `index.html` (icon) — คนละไฟล์ ✓
- launch config `nb` (worktree serve :5420 --host) เพิ่มใน `.claude/launch.json` เผื่อ verify มือถือ

## next (PM)
1. PM gate: อ่าน checklist DS §9 · เทียบ US/DS ครบทุก AC (7 หัวข้อ · callout ทุกหัวข้อ · §7 · เข้า 3 ทาง · เมนูทุก tier · Guide เหลือ ②)
2. tester gate (สายตา/มือถือจริง) ถ้าต้องการ
3. รอ P'Aim verify (Network URL) → เคาะ → **รวม merge เข้าฐาน + deploy รอบ 29** (P'Aim สั่ง "รอขึ้นทีเดียวพร้อมกัน" กับ app-name + icon-refresh)
