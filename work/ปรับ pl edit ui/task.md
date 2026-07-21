# งานช้าง: Editor over-haul (2 เป้า — มาตรฐานดนตรี + editor ใช้ง่าย)

**สถานะ: ดีไซน์ล็อกแล้ว (21 ก.ค. · Claude + G Pro 4 รอบ) — session หน้าเริ่ม implement ได้เลย ไม่ต้องออกแบบใหม่**

## 👉 อ่านอันเดียว: `DESIGN-editor-overhaul.md` (บลูพรินต์ฉบับปิด)
- §A โมเดล = flat rows + attribute (voice/lang) · ไม่รื้อ tooling
- §B editor UX = Live Sheet + Contextual Inspector (คลิกห้อง=แก้ตรงนั้น)
- §C หลุมพราง 3 + §D edit-scope ที่ต้องอุด
- §E ลำดับลงมือ

## ลำดับ implement (จาก §E)
1. **D.C./D.S./Fine/Segno resolver** — gap 1 · เล่นเสียง · 🔴 นัดหูพี่เปา verify ก่อนเริ่ม
2. **Editor UX over-haul** (Live Sheet + Structure Dock + Inspector) — **ทำ wireframe บนโค้ดจริงก่อน (M1) → P'Aim เคาะ → implement** · 🔴 นัดตาพี่เปา
3. Alignment Validator ขยาย (หลุมพราง 1) ทำคู่กับ #2
4. View/Print Filter + custom jianpu keyboard = เฟสถัดไป

## ⛔ สเปกต้นทาง — ต้องอ่านให้ครบก่อนเขียนโค้ด (pair-sop §9.0 · อย่าเชื่อป้าย "background")
- `แปลงโน้ตเพลงเป็นอัลกอริทึม.md` — **บทสนทนา P'Aim ↔ Gemini = สเปกตัวจริง** โจทย์คือ *โครงสร้างเพลง* (repeat/volta/D.C./ท่อนรับ/compact display) ไม่ใช่ WYSIWYG editor
- `บทวิเคราะห์-สถาปัตยกรรม.md` — Claude เทียบข้อเสนอ G กับโค้ดจริง (v2 มี ~70% แล้ว · gap จริง 4 ข้อ)
- `g-review-สรุป.md` — G รีวิว schema + จัดลำดับ gap + issue6 = คลิก preview → เด้ง cursor ไป source ใน editor เดิม (ไม่ใช่ป๊อปอัพใหม่)
- `brief-over-haul-รวม.md` — brief ที่ส่ง G Pro รอบปิด
- ⚠️ **`DESIGN-editor-overhaul.md` (Live Sheet + Inspector) = P'Aim บอก 21 ก.ค. ว่าไม่ใช่ทิศที่ต้องการ** — แผ่นเพลงคงไว้เพื่อพิมพ์ · ใช้ editor เดิม · ปัญหาหลักพี่เปา = ห้องดูยาก/ไม่เท่ากัน + คลิกห้องแล้วโฟกัสทั้งห้อง (ไม่ใช่แค่กล่องโน้ต)

## บั๊ก editor daily ที่ over-haul นี้ต้องแก้ (= acceptance · เดิมอยู่ folder `editor-ux` ยุบเข้ามาแล้ว)
- **issues10** ลบทั้งเพลง หาปุ่มไม่เจอ → Structure Dock ปุ่ม global [🗑️ ลบเพลง]
- **issues6** คลิกโน้ตใน preview → เด้งไปแก้ → Click-to-Edit (`_source` trace)
- **issues7** preview เล็ก ขยายไม่ได้ → Live Sheet เป็นหน้าหลัก 80%
- **issue21** พิมพ์ 2 คอร์ด/ห้องไม่ได้ → บรรทัด [คอร์ด] อิสระใน Inspector
- **issues4** โครงเพลง collapse ให้เหมือนทำนอง → ยุบ 2 panel เป็นอันเดียว
- **issue20** แถบบนติดตอนเลื่อน → layout Live Sheet ใหม่กำหนดเอง (moot ในของเดิม)
_(บั๊กเล็กที่ไม่เกี่ยว over-haul: issues15.2 แถบดำ · issues17 review badge → อยู่ `work/loose-bugs/`)_
