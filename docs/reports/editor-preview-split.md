# report — หน้าแก้ไข: พรีวิว 2 แบบ (A ต่อห้อง inline · B หน้าต่างลอยทั้งแผ่น)

**branch:** `editor-preview-split` (ฐาน `studio-shell-redesign`) · **ห้าม merge main/deploy**
**brief:** `docs/pm/brief-editor-preview-split.md` · **1 สายทำทั้งคู่** (แตะ `EditorMode.vue` เป็นหลัก)
**LAN (มือถือ):** `http://10.215.141.98:5340/#/studio` (launch config `eps` · `--host`)

## สรุป (F60+)
2 ปุ่มพรีวิวในหน้าแก้ไขปรับตาม brief ครบ · **A** = "ตัวอย่างสด" เปลี่ยนพรีวิวสดจาก **ต่อบรรทัด → ต่อห้อง** · **B** = "ดูผลทั้งเพลง" เปลี่ยนจาก "สลับทั้งหน้า (แก้ต่อไม่ได้)" → **หน้าต่างลอยไม่บัง (non-modal · live-sync · ลากได้ · ปิดได้ · ไม่หลุดขอบ)** · verify เบราว์เซอร์จริง 3 breakpoint + unit + build เขียว · console 0 error.

## A — ปุ่มตา "ตัวอย่างสด" → ต่อห้อง (per-bar)
- แถบพรีวิวสดเหนือแต่ละบรรทัด (`.ed-line-live`) เดิม render ทั้งบรรทัดเป็น SongSheet เดียว (`lineContent`) → เปลี่ยนเป็น **render ราย "ห้อง"** วนทุก `line.bars` เรียก **`barContent(li, bi)`** (ตัวเดียวกับ per-bar ดูผล B035) มีเส้นแบ่งห้อง `.ed-live-sep` คั่น · เห็นการแก้ราย**ห้อง**สดขณะพิมพ์
- **คง toggle เดิม** (ไอคอน `eye` · `aria-pressed` · เปิด/ปิด) · reuse `serializeLine`/`barContent`/SongSheet (ไม่เขียน render ใหม่)
- ⛔ ไม่แตะ `NoteRow.vue` (ใช้ผ่าน SongSheet) · section/marker โชว์ห้องแรก · end/label ห้องสุดท้าย (barContent จัดให้อยู่แล้ว = ไม่ซ้ำทุกห้อง)
- ลบ `lineContent()` ที่ไม่ใช้แล้ว (dead code)

## B — ปุ่ม "ดูผลทั้งเพลง" → หน้าต่างลอยไม่บัง (non-modal floating)
- ปุ่มเปลี่ยนจาก toggle (`toggleShowAll`/`allShown` = พลิกทุกห้องเป็น render จนแก้ต่อไม่ได้) → **launcher เปิด/ปิดหน้าต่างลอย** (`sheetWinOpen`)
- **ไอคอน:** `picture-in-picture-2` (สื่อ "เด้งเป็นหน้าต่าง") — **ลงทะเบียนจาก Lucide set จริง** (`OneDrive/.../svg-icon-lucide/`) ใน `Icon.vue` พร้อม `grip-horizontal` (ที่จับลาก) · ⛔ ไม่ใช้ `external-link`/↗
- **มาตรฐานบังคับ 3 ข้อ — ผ่านครบ:**
  1. **Non-modal** — ไม่มีฉากดำ · แก้เพลงข้างล่างได้พร้อมกัน (verify: `.ed-strip .note-box` ยังอยู่ · z-index 95 · position fixed)
  2. **Live-sync** — ผูก `resolvedPreview` (reactive) → พิมพ์โน้ตในตัวแก้ หน้าต่างเปลี่ยนทันที (verify: พิมพ์ `1 2 3 4` → body หน้าต่างขึ้น `1234`)
  3. **ปิด ✕ + ลากได้ + ไม่หลุดขอบ** — verify ครบ (ด้านล่าง)
- **reuse dock-core:** พอร์ตแพตเทิร์นลาก+clamp ของ `StudioDock` (`combinedDown/Move/Up` + `clampToViewport`) มาเป็น `floatDown/Move/Up` + `clampWin` (ไม่สร้าง floating engine ใหม่ · แพตเทิร์นเดียวกับ dock ทั้งแอป) · หน้าต่างจับลากที่ title bar เท่านั้น
- **จัดวาง:** A + B ติดกันเป็นกลุ่ม `<span.ed-preview-grp role="group" aria-label="พรีวิว">` + tooltip ชัด (A="ตัวอย่างสด — เห็นผลแต่ละห้องระหว่างพิมพ์" · B="ดูผลทั้งเพลง — เปิดหน้าต่างลอย แก้ไปดูไป")

## Responsive
- **มือถือ (≤760px):** หน้าต่างลอยไม่เวิร์กบนจอเล็ก → **เปิดเต็มจอมีปุ่มปิด** (`@media max-width:760px` → `inset:0`, radius 0, ลากปิด) · ปุ่มลาก disabled (`floatDown` return เมื่อ narrow · cursor default) · ปุ่ม A ยังเป็นพระเอก
- **เดสก์ท็อป/แท็บเล็ต:** หน้าต่างลอยเต็มรูปแบบ (มุมขวาบน default · ลาก/ปิดได้)
- `narrow` ref อัปเดตตาม `resize` (clamp หน้าต่างกลับเข้าจอเมื่อ viewport หด)

## Verify (เบราว์เซอร์จริง · LAN 5340 · `--host`)
- **A ต่อห้อง:** unit fixture 2 ห้อง → `.ed-live-bar` = 2, `.ed-live-sep` = 1, `.section-label` = 1 (ห้องแรกเท่านั้น) · เบราว์เซอร์: แถบ render + live-sync
- **B non-modal + live-sync:** เปิดหน้าต่าง → `.ed-float` z95 fixed · `.ed-strip .note-box` ยังแก้ได้ · พิมพ์ในตัวแก้ → หน้าต่างเปลี่ยนสด
- **B ลาก:** ลากไป (300,250) → หน้าต่างไปที่ (300,250) เป๊ะ (อ่านหลัง nextTick)
- **B ไม่หลุดขอบ:** ลากพ้นมุมซ้ายบน (-900,-900) → clamp ที่ (4,4) · ลากพ้นมุมขวาล่าง (9000,9000) → clamp `right ≤ 1280 · bottom ≤ 800`
- **B ปิด:** กด ✕ → `.ed-float` หาย · ปุ่ม `aria-pressed=false`
- **มือถือ (375):** หน้าต่างเต็มจอ (กว้าง=viewport · left/top 0 · radius 0 · cursor default = ลากปิด) · มีปุ่มปิด · แก้ข้างล่างได้
- **console:** 0 error (มีแค่ vite debug)
- **unit:** `EditorMode.edhead.test.js` 13/13 (เขียน B035→หน้าต่างเปิด/ปิด non-modal · เพิ่มเทส A per-bar · B050/B051→อ่านจากหน้าต่างลอย) · **full suite `vitest run` 239 passed** (`notationLint.test.mjs` fail = ของเดิมบนฐาน · `process.exit` ไม่เกี่ยว · พิสูจน์ stash แล้ว)
- **build:** ✅ (116 modules · 2.08s)

## ขอบเขต / กันชน (ยึดตาม brief)
- แตะ: `src/components/EditorMode.vue` (หลัก) · `src/components/Icon.vue` (+2 ไอคอน Lucide) · `src/components/EditorMode.edhead.test.js` (อัปเดตให้ตรงพฤติกรรมใหม่) · `.claude/launch.json` (+config `eps`)
- ⛔ **ไม่แตะ** `NoteRow.vue` (ACC/B062) · ไม่แตะ logic แก้เพลง/data/parser · reuse `StudioDock`/`SongSheet` (ใช้ ไม่รื้อ)
- ✓verified / dock / settings inline เดิมไม่พัง (per-bar ดูผล B035 · "ดูผลห้องนี้" ยังทำงาน)

## หมายเหตุถึง PM
- ปุ่ม "ดูผลทั้งเพลง" เดิม (สลับทั้งหน้า) เทสต์ B035/B050/B051 เขียนพฤติกรรมเก่าไว้ → **อัปเดตเทสต์ให้ตรงพฤติกรรมใหม่** (เปลี่ยน feature = ต้องเปลี่ยนเทสต์ของ feature นั้น · ไม่ใช่ regression) · เทสต์ per-bar/section-once ยังคุมความถูกต้องเดิมไว้บนหน้าต่างลอยแทน
- `Icon.vue` เพิ่ม 2 ไอคอน = additive (ตาม SSOT "Lucide names เป็นหลัก") · ไม่กระทบไอคอนอื่น
