# report — editor-preview-refine (หน้าแก้ไข พรีวิว ปรับ 2 จุด)

**branch:** `editor-preview-refine` (ฐาน `studio-shell-redesign`) · **1 สาย · แตะ `EditorMode.vue` เดียว** (+ `EditorMode.edhead.test.js` · `.claude/launch.json`)
**ที่มา:** P'Aim ดูของจริงหลัง `editor-preview-split` merge แล้ว ขอปรับ 2 จุด (brief `docs/pm/brief-editor-preview-refine.md`)

## จุด 1 — A "ตัวอย่างสด": พรีวิวต่อห้อง **ในที่** (เหนือแต่ละห้อง)
- **เดิม:** แถบรวม `.ed-line-live` บนหัวทั้งบรรทัด (ทุกห้องอยู่ในแถบเดียว มีเส้น `.ed-live-sep` คั่น)
- **ใหม่:** พรีวิว render ของ **แต่ละห้องอยู่เหนือช่องแก้ของห้องนั้นเอง** — `.ed-bar-live` วางเป็นลูกตัวแรกใน `.ed-bar` (อยู่เหนือ `.seg-strip` โดยตรง) · **ลบแถบรวม `.ed-line-live`/`.ed-live-bar`/`.ed-live-sep` ทิ้ง**
- reuse `barContent(li, bi)` เดิม (SongSheet · คอร์ด+โน้ต+เนื้อจาก lens verse) — logic ไม่แตะ
- แสดงเมื่อ `livePreview && !barShown(li,bi) && barHasNotes(li,bi)` (ห้องว่าง=ไม่โชว์ · ห้องที่กด "ดูผล" เต็ม=render แทน grid อยู่แล้ว ไม่ซ้อน)
- เพิ่ม helper `barHasNotes(li, bi)` (คู่กับ `lineHasNotes`)
- **section head ครั้งเดียว/บรรทัด (คง B051):** `barContent` ใส่ section/marker เฉพาะห้องแรก อยู่แล้ว → หัวโชว์ครั้งเดียวบนพรีวิวห้องแรก
- ทำงานทั้ง 2 layout (`lay-stack` 1 ห้อง/แถว + `lay-flow` ห้องต่อกัน) เพราะพรีวิวอยู่ในคอลัมน์ `.ed-bar` เอง

## จุด 2 — B หน้าต่างลอย "ดูผลทั้งเพลง": **ปรับขนาดได้**
- เพิ่ม resize handle มุมขวาล่าง `.ed-float-resize` (เส้นทแยงมาตรฐาน · desktop เท่านั้น · `v-if="!narrow"`)
- state ใหม่: `sheetWinSize={width,height}` (null=ขนาด CSS เดิม) · `FLOAT_MIN_W=280` · `FLOAT_MIN_H=200`
- handler `resizeDown/Move/Up` = แพตเทิร์นเดียวกับ drag เดิม (press→track→clamp) แต่โต width/height จากมุมบนซ้ายที่ปักไว้
- **min-width/height:** `Math.max(FLOAT_MIN_*, …)` · **ไม่หลุดขอบจอ:** `Math.min(innerWidth-left-4, …)` / `Math.min(innerHeight-top-4, …)`
- `floatStyle` เขียนใหม่ให้ใส่ width/height (+`maxHeight:none` override cap 70vh เดิม) เมื่อ resize แล้ว · position เดิมคงพฤติกรรม
- `onFloatResize` (viewport หด) ตอนนี้ clamp ทั้ง **ขนาด** และตำแหน่งให้อยู่ในจอ
- `.ed-float-body` เพิ่ม `flex:1 1 auto; min-height:0` → เลื่อนในความสูงที่กำหนดได้
- **ของเดิมครบ:** drag (⁝⁝⁝ head) · ปิด ✕ · scroll · live-sync (`resolvedPreview`) · non-modal (แก้ข้างล่างได้) · **มือถือ ≤760 เต็มจอเดิม** (handle ซ่อน · floatStyle คืน {})

## กันชน (ครบ)
⛔ ไม่แตะ `NoteRow.vue` (ACC/B062) · ⛔ ไม่แตะ `styles.css` (`<style scoped>` + token) · ไม่แตะ logic แก้เพลง/data · toggle ตา · verified · settings inline · drag/close/clamp เดิม = ไม่พัง

## verify
- **unit:** `EditorMode.edhead.test.js` **15/15** — อัปเดตเทส A (per-bar in-place: `.ed-line-live` หาย · 2× `.ed-bar-live` ในแต่ละ `.ed-bar` เหนือ seg-strip · section-label 1) + เพิ่มเทส B resize (handle มี/ไม่มี · **ลากตั้งขนาดจริง · floor ที่ 280×200 · ceiling ที่ viewport 1020×764**) · **full `vitest run` = 241 passed** (`notationLint.test.mjs` fail = ของเดิมบนฐาน · process.exit(0) · พิสูจน์ stash แล้ว fail เหมือนกัน)
- **build ✅**
- **เบราว์เซอร์ (preview_start `epr` · `--host` · LAN `http://10.215.141.98:5341/#/studio`):**
  - **จุด 1:** พิมพ์ห้อง 1=`3333234` ห้อง 2=`5671` → 2× `.ed-bar-live` แต่ละอันอยู่ใน `.ed-bar` เอง เหนือ `.seg-strip` (ไม่ใช่แถบรวม · `.ed-line-live` หาย) · **สด** (แก้โน้ต→พรีวิวเปลี่ยนทันที) · **ทั้ง flow + stack** (`lay-stack` ยัง 2 พรีวิวในที่) · **eye toggle** ปิด→0 เปิด→2 · console 0
  - **จุด 2:** หน้าต่างลอยเปิดได้ + resize handle มีใน DOM (พิสูจน์ math ผ่าน unit เพราะ preview MCP viewport=0×0 → matchMedia บังคับ narrow ในเบราว์เซอร์ตัวนั้น · jsdom viewport จริง 1024×768 ยืนยัน clamp min+viewport)

**ห้าม merge main/deploy** (คง studio-shell-redesign เป็นฐาน)
