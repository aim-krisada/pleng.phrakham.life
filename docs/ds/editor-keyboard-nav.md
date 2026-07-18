# DS — B109 นำทาง editor: ปุ่มบนจอ + คู่มือ (เฟส A · presentation)

**คู่:** US `docs/us/editor-keyboard-nav.md` (scheme + มาตรฐาน) · **เฟส:** A = พี่เปา (มือถือ) ได้ก่อน
**lane:** presentation (UX) · **serialize:** dev ทำ logic (`jump*`/keydown/Enter/Esc) → commit → free → UX ต่อ · **⛔ ไม่แตะ `EditorMode.vue` จน dev free** (บทเรียน dock-space baton)
**นี่คือ prep** — spec + draft พร้อม apply ทันที dev ปล่อย branch · verify device-matrix เอง (§5) ก่อน tester

---

## 0 · ขอบเขตเฟส A (2 ชิ้น)

1. **ปุ่มนำทางบนจอ** (◀▶ โน้ต · ⏮⏭ ห้อง · ▲▼ บรรทัด) — editor-side · เรียก `jump*` ที่ dev ทำ · ≥44px · fit 344/390/fold
2. **คู่มือ** — เพิ่มส่วนทางลัด + ปุ่มนำทาง ใน `Guide.vue §②` (ห้องทำเพลง) · document ข้อจำกัด Mac Ctrl+Arrow

**หลักเดียว (US §0):** navigation model เดียว 2 trigger — desktop=คีย์ (เฟส B) · mobile=ปุ่มบนจอ (เฟส A) → **เรียกฟังก์ชันตัวเดียวกัน**

---

## 1 · ปุ่มนำทาง — placement (ฟันธง + fallback)

**เลือก: slot บน edit-dock band (editor-side · ไม่ใช่ DockKey-shared logic)**
- เพิ่ม item `{ id:'nav', kind:'slot', ... }` ใน `editItems` (`EditorMode.vue` ~1899 ข้าง `keys`) + `#cell-nav` template ใน EditorMode → **markup+logic อยู่ EditorMode** (DockKey แค่เปิด slot · พระคำ feed items เอง = ไม่กระทบ · ตรง `[[pleng-dockkey-shared-single-source]]`)
- **ทำไม:** ขี่ dock band เดิม → ได้ **keyboard-aware ฟรี** (โผล่เหนือ OS keyboard ตอนพิมพ์เนื้อ · dock-space §5) — พี่เปาข้ามห้อง/บรรทัดโดยไม่ปิดแป้น (US §3 หัวใจ) · ไม่ต้องเขียน positioning ซ้ำ
- **fallback (ถ้า dev ว่า slot ยุ่ง):** cluster เดี่ยวใน template ใต้ `.ed-strip` · แต่ต้องทำ keyboard-aware เอง → ด้อยกว่า

**ยืนยันกับ dev ก่อน apply:** slot kind รองรับปุ่มกลุ่ม (ไม่ใช่แค่ btn เดี่ยว) ไหม · nav ควรอยู่ในแถบ (ขี่ hide-on-scroll) หรือ pin เสมอ (นำทางไม่ควรหายตอนเลื่อน?) → **เสนอ: pin เสมอ** (นำทาง = utility ถาวร ไม่ auto-hide)

## 2 · โครงปุ่ม (template sketch · apply หลัง dev free)

```
<span class="ed-nav" role="group" aria-label="นำทางในเพลง">
  <button class="ed-nav-btn" aria-label="โน้ตก่อนหน้า"  @click="jumpNote(-1)">◀</button>
  <button class="ed-nav-btn" aria-label="โน้ตถัดไป"     @click="jumpNote(1)">▶</button>
  <span class="ed-nav-div" aria-hidden="true"></span>
  <button class="ed-nav-btn" aria-label="ห้องก่อนหน้า"  @click="jumpBar(-1)">⏮</button>
  <button class="ed-nav-btn" aria-label="ห้องถัดไป"     @click="jumpBar(1)">⏭</button>
  <span class="ed-nav-div" aria-hidden="true"></span>
  <button class="ed-nav-btn" aria-label="บรรทัดก่อนหน้า" @click="jumpLine(-1)">▲</button>
  <button class="ed-nav-btn" aria-label="บรรทัดถัดไป"    @click="jumpLine(1)">▼</button>
</span>
```
- glyph = ทิศทาง (◀▶ โน้ต=แนวนอน · ⏮⏭ ห้อง=ข้าม-block · ▲▼ บรรทัด=แนวตั้ง) → mental model ตรงกับ layout จริง
- **6 ปุ่ม + 2 divider** · icon-only + `aria-label` (เนื้อที่จำกัดบน 344) · label ครบสำหรับ screen reader/tooltip

## 3 · CSS (≥44px · device-matrix · ยึด dock-space B pattern)

```
.ed-nav { display:flex; gap:2px; align-items:center; }
.ed-nav-btn { min-width:44px; min-height:44px; display:inline-flex; align-items:center; justify-content:center; font-size:15px; }
.ed-nav-div { width:1px; align-self:stretch; margin:4px 2px; background:var(--line); }
/* fit 344: 6×44 + 2 div + gaps ≈ 276px < 320 (max-width:100vw-24) — ถ้าเบียด keys band ให้ทั้งแถบ overflow-x ในตัว (dock band เดิมทำได้) */
```
- **44×44 ทุกปุ่ม** (WCAG 2.5.5 / --touch-min / parity dock · = เกณฑ์เดียวกับ concern B ที่เพิ่งผ่าน) · ปุ่มนำทางไม่มี destructive แต่ยึด 44 เพื่อ consistency
- **device-matrix (`ux-platform-patterns §5.5`):** 344 (fold-folded) · 390 · 690 (fold-open) · desktop — ทุกจอปุ่มอยู่ในขอบ · ไม่ h-scroll หน้า (แถบ overflow ในตัวถ้าเกิน)

## 4 · dev contract (สิ่งที่ UX พึ่ง — ยืนยันชื่อ/signature กับ dev)

| ฟังก์ชัน | ทำ | หมายเหตุ |
|---|---|---|
| `jumpNote(±1)` | โฟกัสช่องโน้ต ก่อน/ถัดไป (ข้ามห้อง/บรรทัดเนียน) | = Tab/Shift+Tab (เฟส B) |
| `jumpBar(±1)` | โฟกัสโน้ตแรกของห้อง ก่อน/ถัดไป | = Ctrl+←/→ (Win/Linux) |
| `jumpLine(±1)` | โฟกัสโน้ตแรกของบรรทัด ก่อน/ถัดไป | = Ctrl+↑/↓ |

- **1 model 2 trigger:** ปุ่มบนจอ + คีย์ desktop เรียก **ฟังก์ชันเดียวกัน** (US §3 · dev เป็นเจ้าของ · ชื่ออาจเป็น `goNote/goBar/goLine` — sync ตอน dev commit)
- โฟกัสเป้าหมายต้องตั้ง `selSlot`/`focusedSeg` ต่อ (continuity + toolbox anchor ของ dock-space ตามไปถูก) — dev จัดใน `jump*`
- **บทเรียน session นี้:** programmatic focus + `@focus` reactivity ระวัง (nextTick) — dev เจอใน dock-space anchor แล้ว

## 5 · self-verify (device-matrix · ก่อน tester · GATE0)

หลัง apply บน branch ที่ dev free → real Chrome + real click (บทเรียน `[[feedback_verify_worktree_mockup_resize_pane]]`):
1. ปุ่มทุกตัว **44×44** (วัด `getBoundingClientRect`) · aria-label ครบ
2. คลิก ◀▶⏮⏭▲▼ → โฟกัสขยับถูกทิศ (jumpNote/Bar/Line ทำงาน · วัด `document.activeElement` ก่อน/หลัง)
3. แถบ nav **fit** 344/390/690/desktop (จำลอง segment กว้าง) · ไม่ h-scroll หน้า · toolbox anchor ตามโน้ตที่ jump ไป
4. ตอนพิมพ์เนื้อ (แป้นขึ้น) → ปุ่ม nav ยังเข้าถึง (เหนือแป้น · dock-space keyboard-aware) — ยืนยัน real phone (พี่เปา) ถ้า pane ทำไม่ได้

---

## 6 · คู่มือ draft (พร้อมวางใน `Guide.vue §②` "ห้องทำเพลง" · ต่อจาก li สุดท้าย)

> เสียงพี่เปา · ม.ต้น · ตรงกับ voice เดิม (`<strong>`/`<code>`) · apply หลัง dev ยืนยัน scheme ตรง US §2

```html
<li><strong>นำทางเร็วในเพลง</strong> — ใช้ <strong>ปุ่มลูกศรบนแถบล่างจอ</strong>
  ข้ามไปมาได้เลย: <strong>◀ ▶</strong> โน้ตก่อนหน้า/ถัดไป · <strong>⏮ ⏭</strong> ข้ามทั้งห้อง ·
  <strong>▲ ▼</strong> ขึ้น/ลงบรรทัด — แตะได้ทั้งตอนพิมพ์อยู่ ไม่ต้องปิดแป้นพิมพ์
  <br /><span class="muted">คอมพิวเตอร์ (มีคีย์บอร์ด): กด <code>Tab</code> ไปโน้ตถัดไป ·
  <code>Ctrl</code>+ลูกศร ข้ามห้อง/บรรทัด (Windows/Linux) · เครื่อง Mac ให้ใช้ <code>Tab</code>
  หรือปุ่มลูกศรบนจอแทน (Mac กันปุ่ม Ctrl+ลูกศรไว้สลับหน้าจอ)</span></li>
<li><strong>ใส่คอร์ดแล้วกด Enter ยืนยันได้เลย</strong> — พิมพ์ชื่อคอร์ดในช่องคอร์ด
  แล้วกด <code>Enter</code> เพื่อยืนยัน หรือ <code>Esc</code> เพื่อยกเลิก (ไม่ต้องเอาเมาส์คลิก)</li>
```

**ทำไมใส่ตรงนี้:** §② "ห้องทำเพลง" มี hint คีย์อยู่แล้ว (บรรทัด ~109 "Enter/เว้นวรรค ไปช่องถัดไป") → ต่อยอด · ปุ่มลูกศร = ของใหม่ที่คนต้องเห็น · Mac limit = document ตาม US §2 (SA `5e3f011`)

**เพิ่มเติม (option C):** ตาราง cheatsheet เต็มใน `NotationStandard.vue` (/notation) ต่อ "?สัญลักษณ์" — เฟส C ไม่บล็อกเฟส A
