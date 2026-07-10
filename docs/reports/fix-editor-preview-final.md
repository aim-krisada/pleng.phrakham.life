# Report — fix-editor-preview-final (พรีวิวลอย "ดูผลทั้งเพลง" 2 บั๊ก)

**สาย:** `fix-editor-preview-final` (ฐาน `studio-shell-redesign`) · **brief:** `docs/pm/brief-fix-editor-preview.md` · **สั่งโดย:** pm4
**หลักฐาน P'Aim:** `docs/pm/realuse-assets/bug-editor-preview-final.jpg/.txt` (เพลง "1. พระเจ้าเป็นความรัก" Key E)
**แตะ 2 ไฟล์เท่านั้น:** `src/components/EditorMode.vue` (+8) · `src/components/SongSheet.vue` (+8) · ⛔ ไม่แตะ NoteRow/styles.css/Dock/Shell/App

---

## บั๊ก 1 — พรีวิวลอยต้องล็อกบรรทัด ไม่ reflow เวลาย่อ/ขยาย ✅
**ต้นตอ:** global `.song-line { flex-wrap: wrap }` (styles.css, "bug 016") ทำให้ห้อง (bar) ตัดขึ้นบรรทัดใหม่เมื่อหน้าต่างแคบ → เห็นการจัดบรรทัดไม่ตรงของจริง
**แก้ (scoped เฉพาะ `.ed-float-body` ใน EditorMode.vue):**
```css
.ed-float-body :deep(.sheet-root) { width: max-content; min-width: 100%; }
.ed-float-body :deep(.song-line)  { flex-wrap: nowrap; }
```
- แต่ละ song-line = **1 แถวเสมอ** · `.ed-float-body` มี `overflow:auto` อยู่แล้ว → **เลื่อนแนวนอน** เมื่อหน้าต่างแคบกว่าบรรทัด
- `sheet-root: max-content` ให้ overlay ไทของ B069 มี viewBox = ความกว้างเต็มเนื้อหา (วัดตรง, ไม่บิด)
- **scope เฉพาะพรีวิวลอย** — หน้าแผ่นเพลง/ฝึกร้องยังใช้ wrap แบบเดิม (global rule ไม่ถูกแตะ)

## บั๊ก 2 — เส้น tie ข้ามห้องซ้อน 2 เส้น ✅
**ต้นตอ (สำคัญ):** B069 วาด overlay โค้งเดียวข้ามห้อง (source→receiver) แล้ว **ซ่อนเฉพาะครึ่ง END ของ NoteRow** (`:deep(... .tie-end-arc){display:none}`) — **แต่ครึ่ง START ที่ตัวต้นเสียง (source) ไม่เคยถูกซ่อน** → overlay + ครึ่ง START = **2 เส้นซ้อน**
- **ทำไมแผ่นเพลง (เพลง 100) ผ่านแต่พรีวิว (เพลง 1) ซ้อน:** ข้อมูลเพลง 100 เข้ารหัสไทด้วย **tie-END อย่างเดียว (0 ตัว tie-start)** → ไม่มีครึ่ง START ให้ซ้อนตั้งแต่แรก · เพลง 1 เข้ารหัส **ทั้ง tie-start + tie-end** → ครึ่ง START โผล่ซ้อน · ไม่ใช่บั๊กเฉพาะหน้าต่างลอย แต่เป็น **เฉพาะเพลงที่มี tie-start** (พรีวิวลอย + แคบ ทำให้เห็นชัด)
**แก้ (SongSheet.vue — เพิ่มกฎ hide ให้สมมาตรกับของเดิม):**
```css
:deep(.note-row > .note-group:last-child > .nt.tie-start:last-child .tie-start-arc) {
  display: none;
}
```
- ซ่อนครึ่ง START เฉพาะ **ไทข้ามห้อง** (ตัว source = โน้ตตัวสุดท้ายของ note-row) → เหลือ overlay วาดโค้งเดียว
- ไทในห้องเดียวกัน (within-segment, source ไม่ใช่ตัวสุดท้าย) **คงเดิม** — สมมาตรกับกฎ end-arc เดิม (`:first-child`) ที่ผ่าน production แล้ว จึงแยก cross-bar/within-segment ด้วย invariant เดียวกัน
- **เพลง 100 ไม่ regress:** ไม่มี tie-start เลย → กฎใหม่ match 0 ตัว → overlay ยัง 5 โค้ง, end-arc ยังซ่อนครบ = **ไม่เปลี่ยนอะไร**

---

## DoD — ผ่านครบ
| รายการ | ผล |
|---|---|
| `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` | **264 passed** (1 "failed file" = `notationLint.test.mjs` `process.exit(0)` เดิม — ยืนยัน pre-existing บนฐานด้วย `git stash`) |
| `npm run build` | ✅ built in ~1.8s |
| dev `--host` + Network URL | `http://10.215.141.98:5372/` (port 5372) |
| console | **0 errors** ตลอด path เปิดเพลง → แก้ไข → ดูผลทั้งเพลง |

## Verify ในเบราว์เซอร์จริง (float จริง เพลง 1)
เข้าโหมดแก้ไขได้โดยไม่ต้อง login (login กันแค่ตอน save) → เปิด `.ed-float` จริง วัด DOM:
- **บั๊ก 1:** `.song-line` computed `flex-wrap: nowrap` · `.sheet-root` width = 700px (max-content) · body scrollWidth 725 > clientWidth 423 → **เลื่อนแนวนอน** · **ย่อ float เหลือ 300px → ทุกบรรทัดยังบาร์แถวเดียว (maxBarRows=1) ไม่ reflow** · โค้งไทไม่ขยับ (max-content = โน้ตไม่เลื่อน)
- **บั๊ก 2:** ไทข้ามห้อง 3 จุด → overlay 3 โค้ง ตรงกับตำแหน่ง source→receiver เป๊ะ · ครึ่ง START + ครึ่ง END ของ NoteRow ซ่อนหมด (`visibleSourceHalfArcs = 0`) = **โค้งเดียว ไม่ซ้อน**
- **regression เพลง 100 (แผ่นเพลง):** tie-start = 0, tie-end = 5 (ซ่อนครบ), overlay 5 โค้ง = **เหมือนเดิม ไม่พัง**

## หมายเหตุถึง PM
- บั๊ก 2 แก้เป็น **global (ทุกหน้าที่ render SongSheet)** ไม่ใช่ scope เฉพาะ float — เพราะต้นตอ (ครึ่ง START ไม่ถูกซ่อน) เป็น global อยู่แล้ว · เป็นการ engraving ที่ถูกต้องขึ้น และพิสูจน์แล้วว่าไม่ regress เพลง 100
- ⛔ ยังไม่ merge/deploy — รอ pm4 ตรวจ
