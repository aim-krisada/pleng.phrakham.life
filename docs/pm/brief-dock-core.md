# Dev brief — Dock core: floating collapse button + unify to one instance

**ฐาน:** branch `studio-shell-redesign` · **ทำใน worktree แยก** (ดู §Setup)
**ที่มา:** P'Aim real-use test (9 ก.ค.) + PM board N1. ต่อจาก B037 (drag fix, merged แล้ว).

## Objective
ตอนยุบ dock ให้เหลือ **ปุ่มลอยกลมเล็กปุ่มเดียว ลากย้ายได้** (แบบ iOS AssistiveTouch / FAB) แทนแถบยาวว่างเปล่า — และ **รวม dock เป็น instance เดียว** ใช้ร่วมทุกโหมด (reuse core).

## Why
- ตอนนี้ยุบแล้วเหลือ "แถบยาวว่าง + ปุ่มเล็ก 1 ปุ่ม" → เสียพื้นที่ ไม่สวย (P'Aim ไม่โอเค)
- `StudioDock.vue` ถูก mount **2 ที่แยกกัน** → `EditorMode.vue` (`mode="edit"`) + `SongViewer.vue` (`mode="sing"`) → ต่างคนต่างจำ collapsed/pos (localStorage per-mode) → พฤติกรรมไม่ตรงกันระหว่างโหมด (นี่คือสิ่งที่ P'Aim สังเกตเห็น). ต้องยกเป็น **core เดียว** (= งาน N1).

---

## Scope A — Floating collapse button (FAB)

**พฤติกรรม (ยืนยันกับ P'Aim แล้ว):**
| สถานะ | หน้าตา | แตะ (click/tap) | กดค้างแล้วลาก |
|---|---|---|---|
| **กางอยู่** | dock เต็ม (คีย์+เครื่องมือ) + ปุ่ม combined ที่มุม | **หุบ** | ย้าย dock ทั้งแถบ (มีอยู่แล้วจาก B037) |
| **หุบอยู่** | เหลือ **ปุ่มกลมลอยปุ่มเดียว** | **กาง** | ย้ายปุ่มลอยไปวางตรงไหนก็ได้ |

- ลบ UI เดิม (แถบบางว่าง `.sd-collapsed` + `.sd-tab`) ทิ้ง แทนด้วยปุ่มลอยกลม (FAB) ขนาดประมาณ 44–48px
- **แยก "แตะ" vs "ลาก"**: pointerdown → ถ้าเลื่อน > ~5px ก่อน pointerup = ลาก (ไม่ trigger toggle) · ถ้าไม่เลื่อน = แตะ (toggle กาง/หุบ). ใช้ pointer events + threshold.
- จำตำแหน่งปุ่มลอย + สถานะ collapsed ใน localStorage (ต่อ core เดียว — ดู Scope B)
- clamp ปุ่มลอยไม่ให้หลุดขอบจอ (เหมือน dragMove เดิม)

**Combined icon (แบบ B — หลอม path เป็น glyph เดียว, P'Aim เลือก reuse):**
รวม `grip-vertical` (จุด 6 จุด = สื่อ "ลากได้") + chevron (สื่อสถานะ) ใน SVG เดียว วางซ้าย-ขวา:
- **หุบอยู่** → grip + `chevrons-up-down` (ลูกศรกางออก = กดเพื่อกาง)
- **กางอยู่** → grip + `chevrons-down-up` (ลูกศรหุบเข้า = กดเพื่อหุบ)

Native shapes (viewBox 24×24 เดิมของแต่ละตัว):
```
grip-vertical:   <circle cx=9  cy=5  r=1/><circle cx=9  cy=12 r=1/><circle cx=9  cy=19 r=1/>
                 <circle cx=15 cy=5  r=1/><circle cx=15 cy=12 r=1/><circle cx=15 cy=19 r=1/>
chevrons-up-down:  <path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>
chevrons-down-up:  <path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/>
```
วิธีหลอม: ทำ viewBox กว้างขึ้น (เช่น `0 0 34 24`) เอา grip ไว้ซ้ายตามพิกัดเดิม (x≈9,15) + chevron เลื่อนขวา `translate(14,0)` (หรือปรับตามตาที่สวย). เพิ่มเป็น 2 entry ใน `Icon.vue` เช่น `dock-grip-expand` / `dock-grip-collapse` (ตั้งชื่อตามจริง). **พิกัด/ระยะห่าง/ขนาด = ปรับได้ตามสายตา** (P'Aim อยากได้ core นี้ไว้ปรับต่อ).

## Scope B — Unify to one dock instance (N1)
- ยก `<StudioDock>` ขึ้นไป mount **ครั้งเดียวที่ `Studio.vue`** (แทนที่จะ mount แยกใน `EditorMode.vue` + `SongViewer.vue`)
- Studio ส่ง prop `mode` (`edit`/`sing`/`print`) + ชุด tools ตามโหมดปัจจุบันเข้า dock เดียวนั้น
- ผลลัพธ์: dock ตัวเดียว state เดียว → ลาก/ยุบ/ตำแหน่ง สอดคล้องกันทุกโหมด (ปุ่มลอยจำตำแหน่งข้ามโหมดได้)
- ระวัง: EditorMode ใช้ `emit('insert', k)` (แป้นโน้ต) + tools เฉพาะโหมด — ต้องเดินสายผ่าน Studio ให้ครบ ไม่ให้ฟีเจอร์เดิมหาย

## ไฟล์ที่เกี่ยวข้อง
- `src/components/StudioDock.vue` (หลัก — FAB + drag + collapse)
- `src/components/Icon.vue` (เพิ่ม combined glyph)
- `src/views/Studio.vue` (ยก dock มา mount ที่นี่)
- `src/components/EditorMode.vue` + `src/components/SongViewer.vue` (ถอด mount เดิม, เดิน prop/event ผ่าน Studio)
- เทสต์: `src/components/StudioDock.test.js` (อัปเดต/เพิ่มเคส FAB + click-vs-drag)

## Setup (worktree + mobile-test)
```sh
git worktree add ../pleng-dock -b wt-dock studio-shell-redesign
cd ../pleng-dock && npm install
npx vite . --host --port 5315 --strictPort    # --host เสมอ
```
**รายงานต้องแนบ Network URL** (`http://<LAN-IP>:5315`) ให้ P'Aim/พี่เปาเทสต์มือถือจริง (กฎถาวร).

## DoD
- [ ] ยุบ = ปุ่มลอยกลมเดียว · ลากย้ายได้ · แตะ = กาง (desktop + [มือถือ ถ้าอยู่ใน scope — ดู §Open])
- [ ] กาง = แตะปุ่ม combined = หุบ · ลาก grip = ย้าย dock (B037 ยังทำงาน)
- [ ] แตะ vs ลาก แยกถูก (threshold ~5px) — แตะแล้วไม่ลากโดยไม่ตั้งใจ
- [ ] dock เป็น instance เดียวจาก Studio · ฟีเจอร์เดิมทุกโหมดครบ (แป้นโน้ต edit, tools sing/print)
- [ ] `npm test` เขียว · `npm run build` ผ่าน
- [ ] เขียน `docs/reports/wt-dock.md` (สรุป + Network URL + screenshot ยุบ/กาง)

## Open decision (ถาม P'Aim ก่อนเริ่ม)
- **มือถือด้วยไหม?** ตอนนี้มือถือยุบแล้ว dock เลื่อนหายลงล่าง + มี tab เปิดกลับ. ทำ FAB ให้มือถือด้วย (สวยแบบ iOS) หรือ **desktop ก่อน** แล้วมือถือ fast-follow. — PM แนะ desktop ก่อนให้ core นิ่ง แล้วค่อยขยายมือถือ.
