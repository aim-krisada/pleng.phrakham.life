# รายงาน Tester — B081 พรีวิว "ดูผลทั้งเพลง" กระดาษล้น (fix-editor-preview-overflow)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `fix-editor-preview-overflow` `22abb9d` (EditorMode.vue เดียว) · **ping:** pm7
**วิธี:** vitest + วัดจริง Browser MCP (`5411`) · เพลงทดสอบ = "พระเจ้าเป็นความรัก" (**71 ห้อง · มี cross-bar tie 3 เส้น** — เคสยาว+มีไท ครบ)

---

## VERDICT: 🔴 ยังไม่ผ่าน — **desktop ผ่าน · มือถือ FAIL (เกณฑ์ #2 no h-scroll)**

### ✅ Desktop 1280 — ผ่าน
- พรีวิว `.ed-float` = 720px · **hOverflow 0** · overflowX hidden · โน้ต 71 ห้อง **wrap เป็น 85 บรรทัด** · widest child = 718 (= หัวกระดาษ) **ไม่มีอะไรเกินกระดาษ = ไม่โดนตัด** ✅

### 🔴 มือถือ 375 — FAIL: พรีวิวยัง **h-scroll 316px**
- โน้ต (`.sheet-root`) wrap เหลือ **351px พอดีจอ** · note rows จบที่ 363 (< 375) → **เนื้อโน้ต wrap ถูกต้อง** ✅
- **แต่ `.ed-float-body` (overflowX:auto) scrollWidth 691 vs clientWidth 375 = เลื่อนขวาได้ 316px** 🔴
- **สาเหตุเดียว (พิสูจน์แล้ว):** `.tie-overlay` (SVG overlay ของ **B069 cross-bar tie** · absolute · 3 paths) กว้าง **679px** ไม่หดตามกระดาษที่ wrap เหลือ 351
  - **ทดสอบตัดสาเหตุ:** ซ่อน `.tie-overlay` → body scrollWidth 691→**375 · overflow 0** (`overlayIsSoleCause=true`)
  - บน desktop รอด เพราะ float 720 > overlay 679 · จอ < ~691 (มือถือ) = overlay ล้น + เลื่อนได้ + เส้นไทวางผิดสเกลเทียบโน้ตที่ wrap

**สรุป:** fix wrap "เนื้อโน้ต" สำเร็จ ✅ แต่ **B069 tie-overlay ไม่ responsive** → มือถือยัง h-scroll (เกณฑ์ #2 ไม่ผ่าน) · เฉพาะเพลงที่มี cross-bar tie (overlay มี path) · เพลงไม่มีไท = ผ่านมือถือ

---

## ตาราง

| เกณฑ์ | desktop | มือถือ 375 | หลักฐาน |
|---|---|---|---|
| 1. no h-scroll พรีวิว (sw==cw) | ✅ 0 | 🔴 **316px** | `.ed-float-body` sw 691 / cw 375 (มือถือ) |
| 1. คอลัมน์ขวาไม่โดนตัด · ห้อง wrap | ✅ | ✅ โน้ต wrap 351 · **แต่ overlay ยื่น** | note rows ≤363 · overlay ถึง 691 |
| 2. มือถือ no h-scroll | — | 🔴 **FAIL** | เลื่อนขวาได้จริง (canScrollRight) |
| 3. B050 เนื้อร้องท่อนที่เลือกโชว์ | ✅ | ✅ | 200 lyric els · มีข้อความไทย |
| 3. tie ไม่เพี้ยน/ซ้อน | ✅ inline ties display:none (rule เดิม) · slur ตรง · overlap 0 | ⚠️ overlay วางผิดสเกลตอน wrap (ผลพวงเดียวกัน) | 6 inline tie = display:none · overlay 3 path @679 |
| 3. vitest 317 · console 0 | ✅ 317 passed · 0 error | | |

## fix ที่เสนอ (ให้ pm7 → dev)
`.tie-overlay` (B069 · SongSheet) ต้องอิงความกว้างกระดาษที่ wrap จริง — scale/re-layout ตาม container หรือ (ถ้าคุม overlay ยากในพรีวิว) constrain ให้ไม่สร้าง scroll · **หมายเหตุ:** fix นี้แตะ EditorMode เดียว (ตามรั้ว) แต่ตัวที่ล้น = SongSheet B069 → pm7 เคาะว่ารวมงานนี้ หรือแยกเป็น B069-mobile

## หมายเหตุ
- print (AC2) = ด่าน P'Aim (ไม่ใช่ tester · standing rule) — ผมยืนยันแค่บนจอ
- desktop พร้อม · **มือถือติด 1 จุด (tie-overlay)** → ส่งกลับ pm7 · P'Aim ยังไม่ดูจนมือถือเขียว
