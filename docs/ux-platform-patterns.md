# UX SOP — มือถือ ≠ เดสก์ท็อป + เช็คของเดิมก่อน (ที่นั่ง UX ต้องเก่งเองโดยไม่ต้องบอก)

**สถานะ:** SOP ผูกพัน (binding) · **ต่อยอด `docs/ui-standards.md` ไม่ทับ** · ทุก US/DS/mockup ของ UX ต้องผ่านลิสต์นี้ก่อนส่ง PM
**ทำไมมีไฟล์นี้ (P'Aim 2026-07-18):** *"ผมขี้เกียจพูดซ้ำหลายรอบ · เรื่องพวกนี้คุณควรเก่งกว่าผม"* → ความรู้แพตเทิร์นมือถือ/เดสก์ท็อป + วินัย "เช็คของเดิม" ต้องเป็น**ค่าเริ่มต้นของที่นั่งนี้** ไม่ใช่รอ P'Aim สอน
**หลักแม่ (ยึดเหนือทุกข้อ):** `docs/sop.md §0` world-class by default + `feedback_never_ask_user_what_is_correct` (มาตรฐาน = เราไปอ่านเอง)

---

## 0 · กฎทอง: **touch ≠ pointer — ออกแบบท่านิ้วให้ถูกแต่แรก อย่ายกท่าเมาส์มาแปะ**

พี่เปาใช้**มือถือ (touch)**. เดสก์ท็อปใช้**เมาส์ (pointer)**. สองอย่างนี้ interaction คนละชุด:
> *"a finger only has finger-down / finger-up — **touch has no hover state at all**"* — [NN/g](https://www.nngroup.com/articles/mouse-vs-fingers-input-device/)

**ห้ามออกแบบ desktop เสร็จแล้วยัดลงมือถือ.** ออกแบบ**ทั้งสอง**ให้ถูกท่าตั้งแต่แรก — คิดเรื่องเดียวกัน คนละท่า.

---

## 1 · ⭐ ตารางแปลง เดสก์ท็อป → มือถือ (ท่องให้ขึ้นใจ · นี่คือของที่ P'Aim ไม่อยากพูดซ้ำ)

| ท่า desktop (pointer) | ท่าที่ถูกบน mobile (touch) | อ้างมาตรฐาน |
|---|---|---|
| **hover เผยเครื่องมือ** (เอาเมาส์ไปวาง) | **tap-to-select** (แตะ = เลือก) + long-press = context · **ห้ามผูกงานกับ hover** | NN/g mouse-vs-fingers · Apple HIG |
| **popup/แผงลอยข้างปุ่ม** (floating panel) | **หน้าตั้งค่าเต็มจอ (full-screen)** — เปิด → เลือก → กด "เสร็จ" **กลับจุดเดิม รักษา state** · หรือ **bottom sheet** เลื่อนขึ้น | [Material full-screen dialog](https://m3.material.io/components/dialogs/guidelines) (งานตั้งค่าหลายขั้นบนจอเล็ก) · iOS push settings |
| **ลากขอบปรับขนาด** (drag-resize) | **เลือกขนาด/ระดับในตั้งค่า** (preset/scale) · **ห้ามลากขอบบน touch** (นิ้วเล็งยาก) | [Apple Dynamic Type](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/) · MD3 density (ขนาด = user option) |
| **right-click context menu** | **touch-and-hold / double-tap** | Apple HIG edit/context menus |
| **tooltip โผล่ตอน hover** | **ชื่ออยู่ในป้าย/aria-label** ไม่ซ่อนหลัง hover (touch ไม่มี hover จะไม่มีวันเห็น) | WCAG 2.5.3 / 4.1.2 |
| **แถบเครื่องมือกว้างถาวร (แผงข้าง)** | **เกาะ element ที่เลือก** หรือ **แถบล่าง (CAB)** — จอ 360px รับแผงข้างถาวรไม่ไหว | Material CAB · Canva |

**hover บนเดสก์ท็อป = ได้ แต่เป็น "ตัวช่วยค้นพบ" เท่านั้น** (peek) — **ความจริง (การเลือก/สั่งงาน) ต้องเป็น tap/click** ที่ mobile ก็ทำได้ · ครอบด้วย `@media (hover:hover)` เสมอ

---

## 2 · UI เกาะ element (toolbox / callout / popover) — กฎตำแหน่ง

- **เกาะติดสิ่งที่เลือก** (ไม่ใช่ลอยอิสระกลางจอแบบ Photoshop CTB — อันนั้น desktop-only บังโน้ต/ชนคีย์บอร์ดบนมือถือ)
- **วางเหนือ element ก่อน → ไม่มีที่ค่อยพลิกลง → ลูกศรชี้ element → clamp ไม่หลุดจอ** ([Apple HIG edit menus](https://developer.apple.com/design/human-interface-guidelines/edit-menus))
- **scope ที่ต้องพิมพ์ (มีคีย์บอร์ด) = วางเหนือเท่านั้น** (คีย์บอร์ดมือถือเด้งกินล่าง)
- **ไม่เลือกอะไร = ห้ามโชว์ปุ่มที่ต้องมี selection** · **ซ่อน ไม่ใช่ทำจาง** (Apple HIG)

---

## 3 · "แถบกินพื้นที่จอ" บนมือถือ — ลด footprint ไม่ใช่ย่อปุ่มต่ำกว่า floor

จอมือถือคือข้อจำกัด. เมื่อของ "ใหญ่ไป/กินที่":
- ✅ **ลดจำนวนปุ่มที่โชว์ default** (ที่เหลือเก็บในตั้งค่า · ยังกดใช้ได้)
- ✅ **ย่อ/พับได้ (collapse)** + **preset ขนาด** + บีบ gap/padding
- ✅ **ให้ผู้ใช้ย่อเอง** (desktop = ลากขอบ · mobile = เลือกขนาด)
- ⛔ **ห้ามย่อ touch target ต่ำกว่า 44px (Apple HIG) / 48dp (Material)** — WCAG 2.5.8 ขั้นต่ำ 24px · โปรเจกต์ตั้ง 44px · **วัดจริง 360/412 ไม่เดา** (`feedback_verify_mobile_real_width`)

---

## 4 · ⭐⭐ ก่อนออกแบบ — **เปิดของเดิมอ่านก่อนเสมอ** (กันเสนอซ้ำของที่มีอยู่แล้ว)

**บทเรียน 2026-07-18:** เสนอ "เลือกปุ่ม/ปัก/เลื่อน ▲▼/ตั้งค่าในตัว" ให้ P'Aim ทั้งที่ `DockKey.vue` **มีครบอยู่แล้ว** → P'Aim ต้องมาชี้เอง = เสียเครดิต + เสียรอบ.

**บังคับทุกงาน ก่อนขีด mockup:**
1. **เปิดโค้ด component จริง + DS เดิมที่เกี่ยว** (ไม่ใช่เดาจากความจำ/ภาพ)
2. **ทำลิสต์ "ของเดิมมีอะไรแล้ว"** อ้าง `ไฟล์:บรรทัด`
3. **เสนอเฉพาะ DELTA (ส่วนที่ใหม่จริง)** — ทุก US/DS ต้องมีตาราง *"มีแล้ว ❌ ไม่ทำ / ใหม่จริง ✅ ทำ / ต่อยอด 🟡"*
4. **refine ไม่ redesign** (`feedback_refine_not_redesign`) — จะรื้อของเดิม = flag + เหตุผลก่อน ไม่แอบรื้อ

---

## 5 · 2 เว็บเป็นตระกูลเดียว (พระคำ + เพลง · shared core)

- component ที่แชร์ (เช่น `DockKey.vue` ที่พระคำ `@pleng` import) → **ออกแบบให้ทั้ง 2 เว็บ ไม่ใช่ pleng อย่างเดียว** (uxui.md ข้อ 4)
- แตะ engine ที่แชร์ = กระทบอีกเว็บ → **DoD ต้องระบุ test 2 host** · เช็คกับ SA (เจ้าของ core) ก่อนเสมอ

---

## 6 · ท่าทำงานของที่นั่งนี้ (ผูกกับ SOP §0 + §1.3)

1. **world-class · เปิด spec จริง/วัด computed · อ้างเป็นข้อ** ไม่อ้างจากความจำ · ของอ้างอิงต่ำกว่ามาตรฐาน = ยกขึ้น ไม่ก๊อป
2. **เชิงรุก + ฟันธง** — เจอทางที่ดีกว่าโจทย์ = เสนอ+ฟันธง (⛔ ไม่โยน ก./ข. ให้ P'Aim · ⛔ ไม่ถาม "อะไรถูก")
3. **พาไปถึงตัดสินใจได้** — จบด้วย *หน้าตา desktop+มือถือ · ทำได้จริงไหม · กี่เฟส* + mockup จิ้มได้
4. **verify จอจริง 360/412** ไม่เดา (screenshot MCP flaky → วัด DOM สด / ส่ง URL ให้ P'Aim ลอง)

---

## ✅ เช็กลิสต์ก่อนส่ง PM (ติ๊กครบทุกข้อ)

- [ ] เปิดโค้ด/DS ของเดิมแล้ว · มีตาราง "มีแล้ว / ใหม่จริง / ต่อยอด"
- [ ] desktop + mobile **แยกท่าถูกตามตาราง §1** (ไม่ยกท่าเมาส์มาแปะมือถือ)
- [ ] mobile: popup→full-screen? · resize→preset? · hover→tap? ตรวจครบ
- [ ] touch target ≥ 44px · footprint ลดด้วยการลดของ ไม่ใช่ย่อต่ำ floor · วัด 360/412
- [ ] ถ้าแชร์ 2 เว็บ → ระบุ test 2 host + เช็ค SA
- [ ] ฟันธง 1 ทาง + อ้างมาตรฐานเป็นข้อ + mockup จิ้มได้ + จบที่ "ตัดสินใจได้"

---

*UX/UI seat · 2026-07-18 · docs-only · อ้างอิงเปิดจริง: [NN/g mouse-vs-fingers](https://www.nngroup.com/articles/mouse-vs-fingers-input-device/) · [Material full-screen dialog](https://m3.material.io/components/dialogs/guidelines) · [Apple Dynamic Type](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/) · [Apple HIG edit menus](https://developer.apple.com/design/human-interface-guidelines/edit-menus) · [WCAG 2.5.3](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name) · [NN/g touch targets](https://www.nngroup.com/articles/touch-target-size/)*
