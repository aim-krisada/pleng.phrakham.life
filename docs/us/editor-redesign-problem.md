# US/ปัญหา — Editor redesign: นิยามโจทย์ + ข้อจำกัด (ก่อนออกแบบ)

**ขั้นนี้ = เข้าใจปัญหาให้คม · ⛔ ยังไม่ออกแบบ solution** (ขั้น 2 = UX ออกแบบ · P'Aim รีวิวโจทย์นี้ก่อน)
**ที่มา:** P'Aim สั่ง reset — dock-space redesign (สลิม+auto-hide + toolbar ลอย + resize) สร้างปัญหาซ้ำ → ถอยเวอร์ชันนิ่ง แล้ว **ออกแบบก่อนสร้าง ไม่ปะทีละจุด**
**verify:** โค้ด `EditorMode.vue` จริง + docs เดิม (DELTA) · SA · 2026-07-18

---

## 1 · ผู้ใช้จริง + อุปกรณ์จริง (device/capability matrix) — หัวใจ

| | |
|---|---|
| **ผู้ใช้หลัก** | **พี่เปา** = คนแก้เพลงเข้าคลังหลัก (คอขวด · แก้ 124 เพลง) → UX ของ editor = ความสำคัญสูงสุด |
| **อุปกรณ์หลัก** | **Surface จอสัมผัส** (ยืนยันสด · แม้ต่อเมาส์): `hover: none` · `any-hover: false` · `pointer: coarse` · `any-pointer` (fine)=false · `maxTouchPoints=10` |
| **อุปกรณ์อื่น (binding)** | มือถือ 360–430 · **จอพับ Fold (พับ ~344 · กาง ~690–768)** · Android + iOS |

**🔴 บทเรียนตรง (ห้ามพลาดซ้ำ · เผา trust ไป 3 รอบ):** **ห้าม gate ฟีเจอร์ pointer ด้วย `@media(hover)`/`pointer:fine`** — จอสัมผัสของพี่เปา**รายงาน false ทั้งที่มีเมาส์** → element ที่ gate ด้วย hover **display:none = หายไปเลย** (resize handle หายเพราะเหตุนี้) · **ทุก control ต้องเข้าถึงได้ด้วย tap เสมอ · hover = ของเสริมบนสุด ไม่ใช่เงื่อนไขการมีอยู่** ([[feedback_verify_hover_on_real_browser]])
→ **verify capability บน Chrome จริง (claude-in-chrome) ไม่เชื่อ `@media` · ต้องวัด computed `display`+matchMedia บนเครื่องจริง**

---

## 2 · งานที่ editor ต้องให้พี่เปาทำได้ (task list จริง · จาก `editItems` + inline tools)

**ทุกข้อนี้ต้องอยู่ครบหลัง redesign — ไม่มีข้อไหนหายได้:**

| กลุ่มงาน | คำสั่งจริง (verify ในโค้ด) |
|---|---|
| **แก้โน้ต** | พิมพ์ในกล่องโน้ต (`NoteBoxes`) + **แป้นสัญลักษณ์** (`keys` palette: จุด octave · เขบ็ต · เอื้อน · **เฟอร์มาตา** · เส้นกั้นห้อง) |
| **แก้คอร์ด** | จิ้มคอร์ด (`+`) → เลือก/พิมพ์ (ComboSelect) |
| **แก้พยางค์/เนื้อ** | พิมพ์ในช่องพยางค์ + `◀`ดึงคำมาซ้าย `▶`ดันไปขวา (จัดพยางค์ให้ตรงโน้ต) |
| **จัดโครงสร้าง** | เพิ่ม/ลบ/ย้าย/ทำซ้ำ — **โน้ต · ห้อง · บรรทัด · ท่อน(ทำนอง) · ข้อ(เนื้อ)** · rename ชื่อท่อน |
| **copy ข้ามท่อน** | คัดลอก **ห้อง/บรรทัด** ไปวางท่อนอื่น (clipboard) |
| **สัญลักษณ์เล่นซ้ำ** | ห้องต่อกัน(pickup) · เริ่มซ้ำ/วนกลับ `‖: :‖` · ห้องจบ(volta) · เล่นซ้ำบรรทัด |
| **ฟัง** | ฟัง **ท่อน / บรรทัด / ห้อง / ทั้งเพลง** · หยุด |
| **ดูผล (พรีวิว)** | สลับ แก้ ⇄ แผ่นเพลง ระดับ **ห้อง** + **ทั้งเพลง** (หน้าต่างลอย ลากได้) |
| **เสียงดนตรี** | เลือกเครื่อง/สไตล์ (4 แกน · default = ตรงโน้ต) |
| **เซฟ (ตาม tier)** | **บันทึกร่าง** · ส่งตรวจ(pending) · **เผยแพร่/อนุมัติ**(approver) · **verify ✓** |
| **พกพา** | ดาวน์โหลด JSON / **MP3** / พิมพ์ PDF |
| **ทั่วไป** | ย้อน/ทำซ้ำ (undo/redo) · ย้าย/ย่อ dock |

> **5 ระดับ selection มีอยู่แล้ว** (`focusedSlot`/`editingChord`/`barMenuOpen`/`activeLine`/`activeStanza`) — ดู `docs/us/selection-driven-editor.md`

---

## 3 · ปัญหาแท้ (root) — ทำไมต้อง redesign

- **(a) 🔴 dock/เครื่องมือกินพื้นที่แย่งเนื้อเพลง** — จอเปล่าโชว์ ~100 ปุ่มพร้อมกัน (วัดสด · `selection-driven-editor.md`) → เนื้อเพลงเหลือพื้นที่น้อย โดยเฉพาะจอเล็ก
- **(b) 🔴 แก้ไขบนจอสัมผัสยาก** — เครื่องมือเล็ก/ชิด · บาง control พึ่ง hover (หายบนจอสัมผัส) · ปุ่มต่ำกว่า 44px
- **(c) ⛔ แถบ/toolbar ลอยทับเนื้อหาที่กำลังแก้ = แก้คอร์ด/โน้ตไม่ได้ = ห้ามเด็ดขาด** (ความล้มเหลวของ dock-space รอบก่อน: toolbar ลอยบังคอร์ด · slider กระพริบ · resize หายาก)

---

## 4 · ข้อจำกัด hard (solution ต้องไม่ละเมิด)

1. **touch target ≥ 44px** ทุก control (WCAG 2.2 · Fitts) · เข้าถึงด้วย tap เสมอ (ไม่ gate hover — §1)
2. **จอเล็กสุด = Fold พับ 344px** — ต้องใช้ได้ · ไม่ล้นแนวนอน (no h-scroll)
3. **⛔ ห้าม overlay ทับเนื้อหาที่กำลังแก้** — เครื่องมือของ element ต้องไม่บังตัว element นั้น (บทเรียน (c))
4. **⛔ คีย์บอร์ดจอ (มือถือ) ไม่บังแถบที่ต้องใช้ตอนพิมพ์** — พิมพ์เนื้อ/โน้ต = แป้นขึ้นครึ่งล่าง
5. **2-host:** `DockKey.vue` = engine แชร์กับพระคำ (island อ่านออกเสียง) → แก้ engine = rebuild+gate พระคำทั้งคู่ · behavior ใหม่ควรอยู่หลัง prop opt-in (พระคำ inert) ([[pleng-dockkey-shared-single-source]])
6. **เนื้อหา/ฟีเจอร์ครบ (§2)** — ไม่มีคำสั่งไหนหาย (เพลง/fermata/MP3/save-draft/เสียง/ดูผล)
7. **มาตรฐานระดับโลก** — Material/HIG/WCAG 2.2 AA · Google-Docs-clean (โชว์ของใช้บ่อย ซ่อนของนาน ๆ ครั้ง · `mission.md`)

---

## 5 · Acceptance criteria (เกณฑ์วัดว่าแก้ปัญหาแล้ว · solution-agnostic)

- **AC1** พี่เปาทำครบทุกงาน §2 บน **Surface จอสัมผัส + Fold 344 + มือถือ** โดย **ไม่มี control หายเพราะ hover** (verify computed บน Chrome จริง)
- **AC2** ตอนแก้ element ใด ๆ **เนื้อหาที่แก้ไม่ถูกบัง** (เห็นคอร์ด+โน้ต+พยางค์ที่กำลังพิมพ์)
- **AC3** เนื้อเพลงได้พื้นที่**มากกว่าเดิม**บนทุกจอ (ปุ่มพร้อมกันบนจอเปล่าลดลงชัด · วัดสด)
- **AC4** ทุก control ≥44px · no h-scroll ที่ 344/360/412/690/768 (วัดสด · ไม่เดา)
- **AC5** พระคำ (island อ่านออกเสียง) **ไม่ regress** (rebuild + gate ผ่านทั้ง 2 host)
- **AC6** ฟีเจอร์ §2 ครบ 100% (ไม่มีของหาย)

---

## 6 · DELTA — ต่อยอดของเดิม (ไม่เริ่มศูนย์) + สิ่งที่ลองแล้วพัง

**มีวิเคราะห์/มีของแล้ว (UX ขั้น 2 อ่านก่อน):**
- `docs/us/selection-driven-editor.md` — 5 selection refs + contextual-tools มีเชื้ออยู่แล้ว (`slot-tools`◀▶ · per-bar ⋯ · inline)
- `docs/ds/dock-space-spec.md` — สเปกรอบที่ **ล้มเหลว** (บทเรียน (c)) · `docs/reports/dock-space-feasibility-sa.md` — scroll=window · visualViewport keyboard-detect · cap=f(width) แก้ Fold-jump · continuity `focusedSlot`
- `docs/ds/dockkey-library.md` · `ps3-dock.md` — DockKey engine (cap · collapse-in-place · pin/reorder)
- `docs/ux-platform-patterns.md` §5.5 · `docs/ui-standards.md` — device matrix + a11y SSOT

**สิ่งที่ลองแล้วพัง (อย่าทำซ้ำ):** toolbar ลอยทับเนื้อหา · resize แบบลากหายาก · slider กระพริบ · gate ด้วย hover (control หาย)

---

## 7 · ⛔ ที่ยังไม่ทำในใบนี้ (= ขั้น 2 UX)

- **ไม่เสนอ solution** (auto-hide · toolbox แบบไหน · layout · resize รูปแบบไหน) — UX ออกแบบหลัง P'Aim เคาะโจทย์
- SA ตรวจ feasibility คู่ตอน UX เสนอ solution (2-host · touch · Fold · continuity)

---

*นิยามปัญหา · verify โค้ดจริง 2026-07-18 · SA · ฐาน `studio-shell-redesign` · P'Aim รีวิวโจทย์ก่อนเข้าขั้น 2*
