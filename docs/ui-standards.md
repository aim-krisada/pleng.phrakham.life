# pleng — UI/Quality Standards (SSOT กลาง)

**นี่คือ "list กลาง" ที่ SA · dev · tester ยึดทุกหน้า ทุกงาน** (ไม่ใช่เฉพาะ DockKey).
ทุก brief ของ SA/dev ต้องอ้างไฟล์นี้ · tester ตรวจตามไฟล์นี้ + checklist เฉพาะฟีเจอร์ก่อนส่ง P'Aim · PM ไม่ merge จนกว่า checklist จะครบเขียว.
เช็กลิสต์เฉพาะฟีเจอร์ (เช่น `docs/pm/dockkey-checklist.md`) = **ต่อยอดจากไฟล์นี้ ไม่ทับ**.

---

## 1 · de-facto standard ที่ยึด (อ้างอิงได้)
1. **WCAG 2.2 ระดับ AA (ขั้นต่ำ)** — คอนทราสต์ ≥ 4.5:1 (ตัวอักษร) / ≥ 3:1 (ไอคอน·ขอบปุ่ม·graphics · 1.4.3/1.4.11) · โฟกัสเห็นชัด (2.4.7/2.4.11) · คีย์บอร์ดครบ ไม่ติดกับ (2.1.1/2.1.2) · target ≥ 24px+ระยะห่าง (2.5.8 · โปรเจกต์ตั้งเป้า 44px) · ปิด popup ด้วย Esc/แตะนอก · แจ้ง dynamic ด้วย `aria-live` · name/role/value (4.1.2) · เคารพ `prefers-reduced-motion` (2.3.3)
2. **WAI-ARIA Authoring Practices (APG)** — แพตเทิร์นมาตรฐาน menu · listbox · dialog · slider · disclosure (role · การเดินคีย์ · focus management · popover ยึดกับปุ่มที่กด · modal trap focus)
3. **Apple HIG + Material Design 3** — touch 44px/48dp · พฤติกรรม popover/sheet/menu · **button hierarchy: 1 บริบท = ปุ่มหลัก (filled/สีเน้น) ได้ปุ่มเดียว** ที่เหลือ secondary/tertiary (outline/ghost/text) · spacing grid 4/8px · motion/elevation สม่ำเสมอ
4. **Nielsen Norman Group 10 heuristics** — เห็นสถานะระบบ (progress determinate ถ้า > 10 วิ) · consistency & standards · minimalist (ไม่ยัดคำอธิบายเกิน) · recognition > recall · error prevention
5. **Fitts's law** — ปุ่มใช้บ่อย/สำคัญ = ใหญ่+เข้าถึงง่าย (thumb zone บนมือถือ)

## 2 · UI invariants ทั่วเว็บ (ทุกหน้า · ทุก component)
- **popup/overlay ทุกตัว:** ตำแหน่งสม่ำเสมอ (ยึดกับปุ่มที่เปิด) · **ห้าม scroll แนวตั้ง/แนวนอน** (fit เนื้อหาพอดี · dropdown ไม่ถูกตัด) · ปิดด้วย Esc/แตะนอก · clamp ไม่หลุดขอบจอ
- **spacing สม่ำเสมอ** ตาม grid (ไอคอน·ป้าย·ตัวปรับ·ปุ่มย่อย มี rhythm เดียวกัน)
- **button hierarchy:** ปุ่มไม่ต้องสีเหมือนกันหมด แต่ **ห้ามมีปุ่มเดียวโดดสีโดยไม่มีเหตุผล** — filled/สีเน้นสงวนให้ primary ปุ่มเดียว/บริบท · ปุ่มเครื่องมือทั่วไป treatment เดียวกัน
- **single source of action (ห้ามปุ่ม/action ซ้ำ 2 ที่):** 1 การกระทำ = **1 บ้านชัดเจน** · ห้าม action เดียวกันโผล่หลายที่ (เช่น "ดาวน์โหลด" ทั้งเมนู "จัดการ" และ dock export = ซ้ำ) — อ้าง **Hick's Law** (ตัวเลือกเยอะ=ตัดสินใจช้า) + **NN/g #4 consistency / #8 minimalist**. ถ้าซ้ำ → ยุบเหลือที่เดียวที่เหมาะสม (export ทั้งหมด = dock ExportTool · จัดการ = import/นำเข้า/จัดการเพลง)
- **ปุ่มที่กดแล้วเปิดหน้าต่างเลือก = ไม่ต้องมีลูกศร ▾** (ทุกปุ่มเปิดหน้าต่าง = ลูกศรซ้ำซ้อน)
- **ไอคอนล้วนถ้าความหมายชัด** (ไม่ยัดคำยาวในปุ่มแถบ) · มี `aria-label` เสมอ
- **ไม่โชว์คำอธิบายวิธีใช้ในหัว popup** (minimalist — UI ต้อง self-evident)
- **responsive:** ใช้ได้ทั้งมือถือ+PC · drag รองรับ touch · ไม่มี horizontal overflow ของ body
- **theme tokens:** ใช้ตัวแปรสี/ระยะจาก `styles.css` (S0 tokens) ไม่ hard-code
- **แถว/รายการ (list row) ต้องกระชับ ดูมืออาชีพ:** แต่ละแถว = **บรรทัดเดียว** (ไม่ห่อ/ไม่สูงเทอะทะ) · ปุ่มควบคุมในแถว (เช่น ▲▼ เลื่อนขึ้น-ลง) **วางเรียงบรรทัดเดียว ไม่ซ้อนแนวตั้ง** · ข้อความ (ชื่อ) **ไม่ถูกตัดสั้นเกินไป** (ให้ความกว้างพอ · truncate เฉพาะเมื่อจำเป็นจริงพร้อม tooltip) · องค์ประกอบในแถว align กันเป็นระเบียบ · ตัวอย่างที่ผิด: `docs/pm/realuse-assets/songstruct-row-cramped.png` (ชื่อ "ร้..." ตัดโหด · ▲▼ ซ้อน 2 บรรทัด · pill บีบ)
- **การตัดคำ (truncation):** ปุ่ม/ป้าย/ตัวเลือกต้องแสดงข้อความพอเข้าใจ · ถ้าที่แคบ = ปรับ layout ให้พอ ไม่ใช่ตัดจนอ่านไม่ออก
- **หัวลาก/ปุ่มกลมของ control (slider knob · handle · thumb) ห้ามชิด/ยื่นเลยขอบ container:** วัดที่ **สุดทั้งสองปลาย** (ค่าต่ำสุด+สูงสุด) — ขอบ knob ต้องห่างขอบ dock/กรอบ **≥ padding ปกติของ container (~10px)** ทุก breakpoint · **ระวังวงกลมที่ centered (`translate(-50%)`) ยื่นเลยจุดเริ่ม/จบราง = ครึ่งความกว้าง knob** → ต้อง inset ช่วงเดินของ knob ไม่ใช่แค่ inset ราง · ตัวอย่างที่ผิด: ไทม์ไลน์หน้าฝึกร้อง หัวสไลด์ที่ frac=0 ห่างขอบ 3px (P'Aim GATE-4 11 ก.ค. · brief `docs/pm/brief-sing-timeline-edge.md`) · **วัด Tier-B จริง ไม่เดา**

## 3 · หลักการทำงาน
- **ห้ามตาม P'Aim อย่างเดียว** — เจอทางที่ตรงมาตรฐาน/ดีกว่า ต้องคิด+เสนอก่อนทำเสมอ
- **library กลาง = ฝังกฎครั้งเดียว ทุกหน้าได้ตาม** (fine-tune ทีเดียว · อย่า hand-roll ซ้ำต่อหน้า)
- **prototype/design = reference ยอมรับ** — dev เปิดเทียบข้างๆ ตอน build

## 4 · การบังคับใช้ (มั่นใจได้ยังไงว่า SA/dev/tester ทำตามจริง)
เรียงจากแข็งสุด → อ่อนสุด:
1. **อัตโนมัติ (พิสูจน์ได้ · ไม่ใช่ความเห็น):** เขียน unit/integration test ให้ข้อที่วัดได้ — a11y ด้วย **axe-core** (contrast/role/label) · target-size · **no-scroll assertion** (scrollWidth==clientWidth) · focus/keyboard · เป็นส่วนหนึ่งของ `npm test` → CI แดงถ้าไม่ผ่าน
2. **tester gate + checklist ที่เซ็นชื่อ:** ข้อที่ auto ไม่ได้ (สายตา/UX) → tester รัน checklist ต่อฟีเจอร์ + ไฟล์นี้ → **commit checklist ที่ติ๊กครบเป็นหลักฐาน** (`docs/reports/<branch>-checklist.md`) ก่อนถึง P'Aim
3. **brief อ้างมาตรฐาน:** ทุก brief ของ SA/dev ต้องลิงก์ไฟล์นี้ + ใส่ "ผ่าน ui-standards + checklist" ใน DoD
4. **PM gate:** PM ไม่ merge จนเห็น (1) test เขียว (2) checklist ครบ · P'Aim เห็นเฉพาะงานที่ผ่าน 3 ชั้นนี้แล้ว
