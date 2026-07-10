# รายงาน SA — DockKey (dock กลาง) + หน้าฝึกร้อง

**branch:** `sa-dock-consistency` (แตกจาก `studio-shell-redesign`) · **docs only · ไม่แตะ code · ยังไม่ push · ห้าม merge/deploy**
**สถานะ: ✅ design ปิดงาน · หน้าฝึกร้อง = ฐาน (reference) ให้อีก 2 หน้า · พร้อมจ่าย dev**

## โจทย์
dock โผล่ทั้ง 3 โหมด (ฝึกร้อง/แผ่นเพลง/แก้ไข) แต่วางไม่เหมือนกัน → P'Aim ต้องการ **เบสโค้ดเดียว โครงเดียว** · อ้างอิงข้อกำหนด `docs/design/ข้อกำหนด dockey.docx`

## ส่งมอบ
- **`docs/ds/dockkey-library.md`** — สเปก core library: descriptor schema · กติกา engine · รายการปุ่มหน้าฝึกร้อง · **AC/Invariants (I1–I8)**
- **`docs/design/dockkey-sing-prototype.html`** — prototype กดได้จริง (descriptor-driven · แยก core/data ชัด) = reference ตัวแรก
- (ประกอบ) `docs/ds/dock-consistency.md` · `dock-consistency-pseudocode.md` · wireframe/mockup รุ่นสำรวจ

## โครงที่เคาะ (P'Aim 10 ก.ค. · จากไฟล์ + คุยสด)
**พิกัด:** row นับจากล่าง · col จากซ้าย · cap เติมเต็มความกว้าง 44px (มือถือ ≥6 · เดสก์ท็อป ~14) ผ่าน WCAG 2.2 AA
**หน้าฝึกร้อง default (2 แถว):**
- แถวล่าง = core คงที่ `Grip · Back · Play · Fwd · Aa · ⚙` (กระจายเต็มกว้าง · grip ซ้ายสุด/⚙ ขวาสุด)
- แถว 2 = ไทม์ไลน์(1–3) · คีย์(4) · เลือกท่อน(5–6)
- repeat/คอร์ด/ความเร็ว/แสดงผล/โปร่งใส = อยู่ในแผง ⚙ · ปัก 📌 แล้วขึ้น**แถวใหม่เหนือไทม์ไลน์** (ไม่แทรกแถวล่าง)

**พฤติกรรมที่เก็บครบใน core (อีก 2 หน้า reuse):**
- ยุบ = เหลือ [grip][⚙] · **ยุบ/กาง อยู่ที่เดิม ไม่กระโดด** (collapse-in-place) · grip แตะกาง/ลากย้าย · ⚙ กางพร้อมตั้งค่า
- ลาก grip ได้ทั้งยุบ+กาง (transform · คุมในกรอบ)
- แผง ⚙ = บ้านครบทุกปุ่ม · ▲▼ จัดลำดับ · 📌 pin (ความโปร่งก็ปักได้) · เมนู = **native dropdown** · toggle = **สวิตช์เลื่อน**
- ป๊อปอัพ/แผง **CLAMP ไม่ล้นขอบ** เสมอ · แผงลิสต์สูงตามจอ (scroll เฉพาะเกินจอ)
- ไทม์ไลน์: **แตะ = วิ่งไปทันที** · **เส้นท่อน** (เลือก=น้ำตาล/ไม่เลือก=เทา/เล่นอยู่=หนา) · default เลือกทุกท่อน · snap เข้าขอบท่อนเงียบๆ (ไม่มีวงกลมท่อน) · Aa แสดงแค่ "Aa" (%+reset ในป๊อปอัพ) · แสดงเวลารวมอย่างเดียว

## core / data (ให้ dev)
- **core** = `itemHtml` · `buildRows` · `render` · drag · `transitionInPlace` · gear-panel · clamp
- **data** = `ITEMS_SING` (descriptor list) → แผ่นเพลง/แก้ไข = เพิ่ม `ITEMS_PRINT`/`ITEMS_EDIT` ป้อน core เดิม

## จ่าย dev — ต้นทุน/ขอบเขต
`StudioDock.vue` → ยกเป็น DockKey engine (row/col + anchor + collapse-in-place + Setting/pin) · `SingTransport.vue` → เลิกวาด chrome เอง เหลือส่ง descriptor · `SongViewer.vue`/`Studio.vue` จุดต่อ · **ไม่แตะ** notation/NoteRow/SongSheet · ⚠️ ทับ B043/dock-polish → PM จัดคิว worktree · คง test เดิม + เพิ่มเคส cap/pin/collapse-in-place
**ทุก interaction ทดสอบใน jsdom แล้ว** (ผ่าน)

## ต่อไป
- ✅ หน้าฝึกร้อง design ปิด · จ่าย dev ได้
- แผ่นเพลง/แก้ไข = design รอบถัดไป (SA) ด้วย core เดียวกัน — หรือ dev สร้าง core+ฝึกร้องก่อน แล้ว SA เติม data 2 หน้าทีหลัง (PM เลือกลำดับ)
