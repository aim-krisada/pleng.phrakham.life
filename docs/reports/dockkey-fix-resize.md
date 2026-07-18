# รายงาน dev — dockkey-fix-resize (DockKey engine · 2-host)

**สาย:** dev (engine only · `DockKey.vue`) · **branch:** `dockkey-fix-resize` (จาก `studio-shell-redesign`) · pushed origin
**ไฟล์ที่แตะ:** `src/components/DockKey.vue` **เท่านั้น** (⛔ ไม่แตะ `EditorMode.vue` = lane B109/dev อื่น)
**🎧 Network URL:** http://10.189.195.98:5361/#/studio (editor) · dev server `--host` 5361 (IP เปลี่ยนบ่อย — เช็ก vite Network line ก่อนใช้)
**สถานะ:** 🟢 **TASK 1 เสร็จ + commit `2e238f0` + verified real-browser** — phrakham unblock · ⏳ TASK 2 (free-form resize) กำลังทำต่อ

---

## TASK 1 — fix cap=f(width) 344 overflow (LIVE REGRESSION · blocks phrakham) ✅

### root cause
`cap=f(width)` (`27f5d9b`) นับ *จำนวนปุ่ม* แต่ไม่รู้ *ความกว้าง px จริง* ของปุ่ม → แถวปุ่มกว้าง (island พระคำ: `[grip][▶ ฟังบทความ pill][version chip][Aa][⚙]`) ยังเป็น **flex row เดียว `nowrap`**. เมื่อความกว้างธรรมชาติเกิน `min(700, 100vw)` กล่อง dock clamp แต่แถว **reflow ไม่ได้** → ปุ่มขวาสุด (⚙) **ถูกตัด ~+23px เลยขอบจอ 344** (Fold cover). ตรงกับที่ phrakham PM วัด (367px / +23) และ P'Aim เคยบ่น "ปุ่มขวาหลุดขอบ".

### fix (CSS-only · `DockKey.vue`)
1. **`.dk-row { flex-wrap: wrap }`** — แถวที่กว้างเกินกล่อง (clamp แล้ว) **reflow ขึ้นแถวใหม่** แทนล้นจอ · ปุ่มคง `--touch-min` (44/42/40) · เพิ่มแค่ *จำนวนแถว* = เจตนา cap=f(width) แต่**การันตีใน CSS ทุก host/font/glyph** (pleng editor + island พระคำ)
2. **`.dk-dock`**: `max-width: min(700px, calc(100vw - 20px))` (เดิม −16px · dock กว้างกว่ากล่อง host ~4px เพราะ host padding 10px×2) + **`min-width: 0`** ให้ flex item ย่อถึง cap แทนถูก min-content ของแถว nowrap ดันเกิน

**⛔ ไม่เปลี่ยน prop/พฤติกรรม** — `auto-hide` default false คงเดิม · auto-hide/keyboard-aware/toolbox anchor/pins/transparency/popover-clamp ไม่แตะ. **2-host:** พระคำได้ safety net ตอน rebuild โดย**หน้าตาปกติไม่เปลี่ยนเลย** (bundle base กับ fix วัดได้ **เท่ากันเป๊ะ** 313px/1 แถว เมื่อ content พอดี · ต่างกันเฉพาะตอนจะ clip → base ตัด, fix wrap).

### verify (real-browser · Edge headless · viewport เป๊ะ · MCP pane ทำ <755 ไม่ได้)
เครื่องมือ: puppeteer-core + Edge · วัด `documentElement.scrollWidth − innerWidth` (h-overflow) + `.dk-dock` scrollWidth/rect/rows

| จอ | pleng editor route | island replica (faithful) | island replica (**stress** · label กว้างกว่าจริง) | **REAL rebuilt island** (Noto Sans Thai) |
|---|---|---|---|---|
| **344** | h-ovf **0** ✅ | 0 ✅ (317px 1 แถว) | **base: 366px ⚙ ตัด +24** → **fix: 332px wrap 2 แถว 0** ✅ | 0 ✅ (313px 1 แถว) |
| **360** | 0 ✅ | 0 ✅ | 0 ✅ (wrap) | 0 ✅ |
| **390** | 0 ✅ | 0 ✅ | 0 ✅ (wrap) | 0 ✅ |
| **690** | 0 ✅ | 0 ✅ | — | 0 ✅ |
| **834/768** | 0 ✅ | 0 ✅ | — | 0 ✅ (768) |
| **1280** | 0 ✅ | 0 ✅ (367px 1 แถว = hug content คงเดิม) | — | — |

- **before/after ชี้ชัด (stress @344):** base = content scrollWidth **366** ในกล่อง 340 → ⚙ ขอบขวา 368 > 344 (**ตัด**) · fix = **332** ≤ กล่อง · wrap 2 แถว (สูง 40→83) · **0 clip**
- **2-host self-check:** rebuild `pk-dock-island.js` จาก DockKey ของผม (`PLENG_SRC=<worktree>/src` · **output → scratch ไม่แตะ phrakham tree**) · 15 modules · CSS มี `flex-wrap:wrap` + `calc(100vw - 20px)` (scoped `721f1083`) · วัดด้วย **Noto Sans Thai จริง** = 0 overflow ทุกจอ · เทียบ bundle base (pre-fix) = พฤติกรรมเดียวกันเมื่อพอดี, ต่างเฉพาะตอน clip
- **tests:** DockKey 36/36 ✅ · full suite **736 pass** (notationLint `process.exit(0)` = pre-existing) · **build ✓**

### flag → PM (นอก scope regression · ไม่แก้เงียบ)
- **keys band (`.dk-keyrow`) ยังเป็น `nowrap`** — ที่ 344 palette 11 คีย์ (min-width 30px) มี **internal spill เล็กน้อย** (scrollWidth 341 vs กล่อง 324, ~8px/ข้าง centered) → **อยู่ในจอ ไม่ล้น document · เป็นของเดิม** (ผมไม่แตะ `.dk-keyrow`; spill ตั้งแต่ก่อน dock-space เพราะ 341 > กล่องเก่า 328). เหมือนที่ tester เคยจัด note-boxes เป็น backlog แยก → **ไม่แก้ในนี้** (เปลี่ยน layout palette ที่พี่เปาใช้ทุกวัน = ต้อง design sign-off). ถ้า PM อยากให้ wrap คีย์ที่จอแคบ = จ่ายงานแยก

---

## TASK 2 — free-form dock resize (แบบ 2 · width→reflow) ⏳ กำลังทำ
(รายละเอียดเพิ่มเมื่อเสร็จ · reuse engine cap=f(width) + flex-wrap ที่เพิ่ง fix)

---

*dev · 2026-07-18 · `dockkey-fix-resize` · commit `2e238f0` · ⛔ ไม่ merge เอง (PM only)*
