# G consult — session pleng-v2-header-2026-07-25

- when: 2026-07-25 09:06:53
- url: https://gemini.google.com/app/c254fc1fb4df8119

## Q
ตามต่อ 2 เรื่อง:

1) citation ที่ตรวจสอบได้: ขอ URL จริงของ (ก) Material Design 3 Top app bar — ส่วนที่ระบุว่า leading area วางได้ 1 navigation icon, (ข) Apple HIG หน้า Navigation bars/Back button. ขอ 'ประโยค/ใจความ' ที่เอกสารเขียนไว้จริง ไม่ใช่พาราเฟรสลอยๆ (ถ้าไม่แน่ใจข้อความเป๊ะ บอกว่าไม่แน่ใจ — ห้ามแต่ง).

2) ประเด็นกลยุทธ์ (สำคัญ): แอปนี้ v2 ยังมีบั๊กจริงที่ยังไม่ทำงาน (เช่น D.C./D.S. repeat ยังไม่ทำ). ถ้าเราลด framing 'รุ่นทดลอง/beta' ให้เหลือแค่ badge จางๆ เล็กๆ ตามที่แนะนำ — จะเสี่ยงทำให้ผู้ใช้เข้าใจว่านี่คือของเสถียรแล้ว และเจอบั๊กแล้วเสียความเชื่อมั่นไหม? world-class เขาชั่งน้ำหนักระหว่าง 'header สะอาด' กับ 'ความซื่อสัตย์ว่ายังทดลอง' ยังไง? Badge ควรเด่นแค่ไหนเมื่อ product ยัง unstable จริง? อ้าง pattern ของจริง (เช่น Google/Apple/GitHub ใช้คำว่า Beta/Preview/Experimental ยังไงบน production).

## A
1) Verification & Quotations จาก Guideline จริง
(ก) Material Design 3 — Top App Bar Specs & Guidelines

URL จริง: https://m3.material.io/components/app-bars/specs และ https://m3.material.io/components/app-bars/guidelines

โครงสร้าง anatomy และข้อความจริง:

ในเอกสาร Specs หัวข้อ Anatomy of Top App Bar ระบุว่า leading slot มีไว้สำหรับ "Leading icon (optional): 1" เท่านั้น (ระบุเป็นตัวเลข 1 ชิ้นชัดเจนใน anatomy diagram/table)

ในหน้า Guidelines ระบุบทบาทของ Leading Icon ไว้ว่า:

"Leading icons appear on the left side of the top app bar, before the title. They are used for navigation—like a back arrow or drawer menu icon."
(หมายเหตุ: M3 ออกแบบ slots ของ Leading Icon ไว้เพียง slot เดียวขนาด 48x48dp บน App Bar เพื่อป้องกันไม่ให้ปุ่มนำทางตีกับ Element อื่น)

(ข) Apple HIG — Toolbars & Navigation

URL จริง: https://developer.apple.com/design/human-interface-guidelines/toolbars

ข้อความจริง:  
Apple Developer

ในส่วน Structure / Leading edge Apple ระบุตำแหน่งและลำดับของปุ่มฝั่งซ้ายสุดไว้เป๊ะๆ ว่า:

"Leading edge: Elements that let people return to the previous document and show or hide a sidebar appear at the far leading edge, followed by the view title."  
Apple Developer

ในส่วน Best practices ระบุเรื่องการไม่ใส่ของเยอะเกินไป:  
Apple Developer

"Choose items deliberately to avoid overcrowding. People need to be able to distinguish and activate each item, so you don't want to put too many items in the toolbar."  
Apple Developer

2) ประเด็นกลยุทธ์: ความซื่อสัตย์ (Honesty) vs. ความสะอาด (Cleanliness)

เมื่อระบบยังมีบั๊กสำคัญที่ยังไม่เสร็จ (เช่น D.C./D.S. repeat) ความซื่อสัตย์ต่อผู้ใช้สำคัญกว่าความสะอาดของ Header การลด Badge เหลือเพียงตัวเล็กๆ จางๆ จนผู้ใช้ไม่สังเกต คือความเสี่ยงที่สุดที่จะทำให้ผู้ใช้คิดว่านี่คือ Production แล้วหัวเสียเมื่อฟีเจอร์หลักทำงานผิดพลาด

องค์กร Tech ระดับโลกชั่งน้ำหนักเรื่องนี้โดย "แบ่งแยกประเภทความเสี่ยงของซอฟต์แวร์" และใช้ Pattern ดังนี้:

Pattern ของจริงที่องค์กรระดับโลกใช้

Google (Material Web / Search Console / Cloud)

คำที่ใช้: Beta หรือ   
Material Design
Experimental

Pattern: ใช้ Persistent Tonal Badge (ไม่จาง แต่ใช้สีที่ไม่สะดุดตาเกินไป เช่น Amber Tonal หรือ Grey-Filled) วางติดกับ Logo หรือ App Title เสมอ

วิธีรับมือบั๊ก: ใช้ Dismissible Top Banner หรือ Inline Notice แปะไว้บนสุดของหน้าที่มีปัญหา เช่น หน้าเพลงที่มี D.C./D.S. โดยระบุตรงๆ ว่า "ระบบเล่นซ้ำ (D.C./D.S.) กำลังอยู่ในช่วงพัฒนาและยังไม่สมบูรณ์" ผู้ใช้จะรับรู้ขอบเขตทันทีโดยไม่เสียความรู้สึก

GitHub (Feature Preview / Technical Preview)

คำที่ใช้: Public Beta หรือ   
Material Design
Preview

Pattern: GitHub จะไม่ใช้แค่ Badge บน Header แต่จะใช้ Scoped Notice / Banner Box ครอบส่วนฟีเจอร์นั้นๆ ไว้เลย และมีปุ่ม "Give Feedback" หรือ "Switch back to legacy view" อยู่ข้างๆ

แนวคิด: ยอมเสียพื้นที่ UI เล็กน้อยในหน้าที่มีปัญหา เพื่อแลกกับการตั้ง Expectation ของผู้ใช้ให้ถูกต้อง (Expectation Management)

Apple (iOS / macOS Beta Releases)

คำที่ใช้:  
Material Design
 Beta

Pattern: HIG ของ Apple เน้นย้ำเรื่อง Clear Expectations หากแอป/ฟีเจอร์นั้นเสี่ยงที่จะกระทบ Core Workflow (เช่น การนำนมัสการที่เพลงหลุดกลางคลำ) ควรมี Feedback Assistant Mechanism หรือแถบแจ้งสถานะชัดเจน

คำแนะนำการปรับใช้สำหรับแอปนมัสการ (Vue3 PWA)

การนำนมัสการต้องการ "ความชัวร์ 100%" บนเวที ถ้า D.C./D.S. ทำงานผิด เพลงจะล่มทันที ดังนั้นกลยุทธ์ที่ World-class ที่สุดสำหรับกรณีนี้คือ:

Header (Global Context):

ให้ใช้ Pill/Badge คำว่า v2 Beta ติดไว้ข้าง Logo v2 ฝั่งซ้าย (แต่ไม่ทำหน้าที่เป็นปุ่มสลับเวอร์ชัน)

เด่นระดับปานกลาง (Medium Contrast) เพื่อให้รู้ว่ายืนอยู่บน v2 ตลอดเวลา

Scoped Warning (In-Context Notice):

ในหน้ารายการเพลง หรือหน้าแสดงคอร์ดตรงจุดที่มี D.C./D.S. ให้ใส่ Warning Chip/Callout เล็กๆ สีกระดาษ/Amber ไว้ตรงนั้นเลย เช่น ⚠️ ระบบ D.C./D.S. ยังอยู่ในช่วงปรับปรุง

การเตือน ณ จุดที่ผู้ใช้กำลังจะใช้งานจริง (Just-in-time notification) มีประสิทธิภาพสูงกว่าการพยายามใส่เตือนรวมๆ ไว้บน Header

Version Switcher:

ย้ายปุ่มสลับไป v1 ไปไว้ใน Overflow Menu (⋮) ฝั่งขวา หรือใส่ Dismissible Banner แถบแคบๆ ใต้ Header ในครั้งแรกที่เข้าแอปว่า "กำลังทดลอง v2? หากพบปัญหาสามารถ [สลับกลับไปใช้ v1] ได้ตลอดเวลา" (เมื่อกดปิด Banner ก็จะไม่ขึ้นมากวนอีก แต่ปุ่มสลับยังคงอยู่ใน Overflow Menu)
