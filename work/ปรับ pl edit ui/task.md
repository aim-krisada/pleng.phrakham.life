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

## background trail (ไม่ต้องอ่านถ้าไม่เถียงดีไซน์)
- `บทวิเคราะห์-สถาปัตยกรรม.md` — Claude เทียบข้อเสนอ G กับโค้ดจริง (v2 มี ~70% แล้ว)
- `g-review-สรุป.md` — G รีวิว schema + จัดลำดับ gap + เหตุผล
- `brief-over-haul-รวม.md` — brief ที่ส่ง G Pro รอบปิด
- `แปลงโน้ตเพลงเป็นอัลกอริทึม.md` — บทสนทนา G ต้นทาง (P'Aim ↔ G เรื่องกฎเจียนพู่)

## ผูกกับ `work/editor-ux/`
บั๊ก daily ส่วนใหญ่ (ลบเพลง·preview·คลิกแก้·2คอร์ด) ถูกดูดเข้า over-haul นี้ · เหลือ 3 อันเล็กไม่เกี่ยวโครง (issue20·issues15.2·issues17) แก้แยกได้ ไม่ต้องรอ
