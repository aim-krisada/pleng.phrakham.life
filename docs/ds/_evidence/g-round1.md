# G consult — session pleng-v2-header-2026-07-25

- when: 2026-07-25 09:05:50
- url: https://gemini.google.com/app/c254fc1fb4df8119

## Q
บริบท: เว็บแอปนมัสการภาษาไทย (Vue3 PWA) กำลังรัน beta 'v2' ควบคู่ตัวจริง v1 บนโดเมนเดียว — v1 อยู่ root '/', v2 อยู่ subpath '/v2/'. บนแถบบน (app header) ของ v2 ตอนนี้มี 3 องค์ประกอบชิดซ้ายที่ผู้ใช้สับสน: (1) ปุ่มยี่ห้อ/โลโก้ → กลับหน้าแรก v2, (2) pill สีเหลืองอำพัน 'v2 รุ่นทดลอง ⇄' → สลับไป v1 (คนละเวอร์ชัน), (3) ปุ่ม '‹' back → กลับไปหน้ารายการเพลง. บนมือถือ โลโก้ถูกซ่อน เหลือ pill (เด่นสุด อยู่ซ้ายสุด แต่กระโดดข้ามเวอร์ชัน) กับ '‹' เล็กๆ = ผู้ใช้กดผิดง่าย.

ขอคำแนะนำระดับ world-class อ้างอิง Material Design 3 + Apple HIG (ระบุชื่อ component/guideline จริง + URL ที่ตรวจสอบได้ ห้ามมั่ว) สำหรับ 3 ประเด็น:
(ก) การสื่อว่าเป็น beta/รุ่นทดลอง บน production ที่ยังมีบั๊ก — pattern ที่ดีที่สุดคืออะไร (badge? banner? อยู่ตรงไหน? ถาวรหรือ dismissable?)
(ข) การสลับระหว่างสองเวอร์ชันของแอปเดียวกัน — ควรอยู่ที่ header หรือที่อื่น (เมนู/settings/overflow)? ควรเด่นแค่ไหน?
(ค) back-navigation ในแอปมือถือ/PWA standalone ที่ไม่มีปุ่ม back ของ browser — ปุ่ม back ใน app bar (Material top app bar navigation icon / HIG back button) เป็นสิ่งจำเป็นไหม, และการวาง version-switch ที่ 'ดูเหมือน back' ไว้ข้างๆ ปุ่ม back จริง ผิดหลักอะไร?

ตอบกระชับ เป็นข้อ ก/ข/ค พร้อม citation จริง.

## A
ข้อเสนอแนะตามมาตรฐาน Material Design 3 (M3) และ Apple Human Interface Guidelines (HIG) เพื่อแก้ไขปัญหา Navigation ของ Vue3 PWA:

(ก) การแสดงสถานะ Beta/รุ่นทดลอง บน Production

Pattern ที่ดีที่สุด: การผสมผสานระหว่าง Inline Badge (ถาวร) และ Banner (Dismissible)

Persistent Indicator (ถาวร): แนะนำให้ใช้ Badge หรือ Label ขนาดเล็กวางติดกับ Title/Logo บน Header (เช่น v2 Beta) โดยใช้สีที่เป็นกลางหรือ Tonal Color เพื่อระบุสถานะของแอปตลอดเวลาโดยไม่แย่งซีนเนื้อหาหลัก

Dismissible Banner (ปิดได้): สำหรับคำเตือนว่าแอปยังมีบั๊ก ให้ใช้ M3 Banner หรือ Inline Message วางใต้ Header เมื่อผู้ใช้เปิดเข้ามา Banners จะแสดงข้อความแจ้งเตือนพร้อมตัวเลือก "ปิด" (Dismiss) หรือ "รายงานบั๊ก" เมื่อกดปิดแล้ว Banner จะหายไปเพื่อคืนพื้นที่ใช้งาน แต่ Badge สัญลักษณ์ Beta บน Header ยังคงอยู่

ข้อควรระวังตาม HIG: Apple HIG ระบุว่าไม่ควรใช้ Alert Modal เด้งขัดจังหวะเพื่อแจ้งข้อมูลทั่วไป ให้ใช้ Banner หรือ Status Indicator ในบริบทหน้าจอแทน

อ้างอิง:

Material Design 3 - Badges

Apple HIG - Navigation Bars

(ข) การวางจุดสลับเวอร์ชัน (Version Switcher)

ตำแหน่งที่ถูกต้อง: ย้ายออกจากด้านซ้ายของ Header ไปไว้ใน Overflow Menu หรือ Settings ฝั่งขวา

ทั้ง M3 และ HIG กำหนดให้ฝั่งซ้ายของ App Bar บนมือถือมีไว้สำหรับ Primary Navigation เท่านั้น (เช่น ปุ่ม Back หรือ Drawer Menu)

แอ็กชันการเปลี่ยนเวอร์ชันถือเป็น Global Administrative Action (ไม่ใช่การนำทางระดับเนื้อหา) จึงควรย้ายไปไว้ใน Overflow Menu (⋮) หรือเมนู Settings/Profile ฝั่งขวาบน

ระดับความเด่น (Prominence):  
Material Design

ไม่ควรทำเป็น Pill สีสันสดใส (เช่น Amber Pill) บน Header เพราะจะดึงดูดสายตาเกินความจำเป็น และทำให้เข้าใจผิดว่าเป็นสถานะ/ปุ่มหลักของหน้านั้น

ควรใช้เป็น Text Button หรือ List Item ธรรมดาในเมนู เช่น "สลับไปใช้ v1 (เวอร์ชันเสถียร)"

อ้างอิง:

Material Design 3 - Top App Bar Guidelines

Apple HIG - Toolbars

(ค) ปุ่ม Back Navigation และข้อผิดพลาดของการวาง Version-Switch ข้างปุ่ม Back

ปุ่ม Back จำเป็นใน PWA Standalone หรือไม่: จำเป็นอย่างยิ่ง

ใน PWA Standalone Mode ที่ไม่มี UI ของ Browser ผู้ใช้ต้องพึ่งพา Leading Navigation Icon (ปุ่ม ‹ Back) บน App Bar เพื่อถอยกลับตามลำดับโครงสร้างข้อมูล (Hierarchical Navigation)

ข้อผิดพลาดทาง UX เมื่อวาง Version-Switch ชิดปุ่ม Back:

ละเมิด Gestalt Principle (Proximity & Similarity): เมื่อวางองค์ประกอบที่เป็น Pill รูปทรงคล้ายปุ่มไว้ติดกับลูกศร ‹ ผู้ใช้จะรับรู้โดยอัตโนมัติว่าเป็นกลุ่มปุ่มควบคุมย่อยของการนำทางเดียวกัน ทำให้เกิดอาการกดผิด (Accidental Taps)

ขัดต่อกฎ Leading Area ของ M3 และ HIG:

M3: กำหนดให้พื้นที่ Leading Element ฝั่งซ้ายสุดสงวนไว้สำหรับ Navigation Icon เพียง 1 ชิ้นเท่านั้น เพื่อรักษาระยะ Touch Target (อย่างน้อย 48x48dp)  
YLabZ - Medium

HIG: กำหนดให้ Back button อยู่ซ้ายสุดอย่างอิสระ ห้ามวาง Control อื่นที่ไม่เกี่ยวกับการถอยกลับขั้นย่อยมาปะปนในพื้นที่นำทาง  
CodersHigh
+ 1

การสับสนเรื่อง Scope of Control: ปุ่ม ‹ เปลี่ยนแปลงสถานะเฉพาะหน้าจอ (Local Context) แต่ Version Switch เปลี่ยนแปลงทั้งระบบ (Global Context) การนำสองสิ่งที่มี Scope ต่างกันอย่างสิ้นเชิงมาวางชิดกัน สร้าง Cognition Overload สูงมากแก่ผู้ใช้

What would you like to do next?
ปรับปรุงเลย์เอาต์ Header ของ v2 ตามหลัก Material Design 3
ออกแบบ Banner แจ้งเตือน Beta พร้อมระบบ Dismissible
จัดการ Router Back Navigation สำหรับ PWA บนมือถือ
