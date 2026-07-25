### G ตอบ (หลังส่วนที่ 1/1) — OK

ตรง ๆ ทีละข้อครับ:

1. การยอมรับเรื่องมาตรฐาน & แหล่งอ้างอิง
เรื่อง aria-haspopup

"ไม่มี ผมพูดเกินครับ"

ขอบคุณที่ไล่เช็กครับ ใน W3C ARIA 1.2 / APG Spec สำหรับ role="combobox" นั้น

ค่า default ของ aria-haspopup สำหรับ combobox คือ "listbox" อยู่แล้ว

การใส่ aria-haspopup="listbox" เป็นเพียง Implicit Definition (มีก็ไม่ผิด แต่ไม่จำเป็นและไม่ได้บังคับ)

สเปกบังคับจริงๆ คือ role="combobox", aria-expanded, aria-controls, และ aria-activedescendant ตามที่คุณระบุถูกแล้วครับ

เรื่อง NN/g Reference

กรณีเรื่อง Inline Hint / Empty-state teaching เป็น ความเห็นและข้อสังเกตจากประสบการณ์ UX Architecture ของผมเอง (การประยุกต์ใช้ Mental Model การสอนคีย์บอร์ด) ไม่ใช่ตัวเลขวิจัยเป๊ะๆ จากบทความเฉพาะฉบับของ NN/g ครับ ขออภัยที่นำชื่อองค์กรมาอ้างอิงให้เกิดความสับสนครับ

2. กติกา Enter ตอน [ เปิดAutocomplete
ประเมินกติกา: ปลอดภัยมาก และเป็นทางออกที่ถูกต้องสำหรับ Domain เฉพาะนี้

การใช้แบบ VS Code (Preselect แถวแรกทันที) จะพังแน่นอนกับเว็บคุณ เพราะใน VS Code คนพิมพ์โค้ดคาดหวังให้ IntelliSense มาแย่งพิมพ์ แต่คนพิมพ์โน้ตเพลง/เนื้อร้องต้องการให้ Enter แปลว่า New Line / Next Note เป็นหลัก

เคสจริงที่เคยเจอ (Real-world Pitfall)

ในระบบประเภท Form Builder และ Rich Text Editor ที่มี / command หรือ [ trigger:

ถ้า preselect แถวแรกไว้เสมอ ผู้ใช้ที่พิมพ์เร็วจะกด [ แล้วพิมพ์คำสั่งจบ แล้วกด Enter ทันที ผลคือ คำสั่งถูกแทรกซ้ำ หรือตัว Autocomplete กินคำสั่ง Enter ถัดไป ทำให้เคอร์เซอร์ไม่ยอมลงบรรทัดใหม่

กติกาของคุณ (Unselected by default + ต้องกด ↓ เพื่อ Arm คำสั่ง): เป็น Pattern เดียวกับ Slack (เมื่อพิมพ์ @ หรือ :) ซึ่ง ปลอดภัยที่สุดสำหรับ Power User พิมพ์รัวแล้ว Enter ไหลผ่านได้ 100% ไม่ช้าลงสำหรับคนพิมพ์รัวครับ

3. Snippet Placeholder (Highlight ตัวเลข)
จุดพังที่ยังเหลืออยู่ (ที่ไม่ใช่ IME และ Esc)

เมื่อตัดเรื่อง IME ภาษาไทยออก เหลือจุดพังฝั่ง DOM Focus Management ที่ต้องระวังตอนเขียนระบบจริง 1 จุดครับ:

" Selection Disruption จาก Autocomplete / Auto-save / Global Hotkey "

Selection Lost on Focus Shift: เมื่อ palette ปิดลง แล้วระบบสั่ง selection.setBaseAndExtent(...) คลุมตัวเลขไว้ หากระบบมี Auto-save Background Process หรือมี Global Listener ที่รันเมื่อสั่งปิด palette แล้วไปยุ่งกับ DOM (เช่น การสั่ง Rerender พรีวิวโน้ตบนจอแบบ Real-time) Highlight/Selection ตัวเลขจะ "หลุดทันที"

ผลคือ ผู้ใช้กดพิมพ์ตัวเลขทับไม่ได้ แต่กลายเป็นพิมพ์ต่อท้ายตัวเลขเดิม (เช่น [ซ้ำ 2 รอบ] กลายเป็น [ซ้ำ 23 รอบ])

วิธีป้องกัน: ตอนสั่ง Highlight ตัวเลข ต้องมั่นใจว่า State ของ Editor อยู่ในสถานะ Atomic Transaction (หยุดการ Re-render ฝั่ง UI พรีวิวชั่วคราวจนกว่า Selection นั้นจะถูกแก้ไขหรือ Focus หลุดออกไป)

4. คำสั่งไม่ลงบรรทัด (โครงสร้าง 1 Palette)
ตอบ: (ก) + (ข) + (ค) ปิดความเสี่ยงได้ครบถ้วนครับ

กลไกที่คุณเสนอแก้ปัญหา Mental Model แตกแยกได้ตรงจุดที่สุดแล้วครับ:

ประตูเดียว (Single Entry): ไม่เสีย Mental Model ผู้ใช้จำแค่ Ctrl+K

Unselected + อยู่ท้ายสุด (ข้อ ก & ข): ป้องกันอุบัติเหตุการกด Enter รัวแล้วแจ็กพอตไปโดนคำสั่งสั่งการ (เช่น "พิมพ์" หรือ "ฟังเสียง") 100%

Visual Distinction (ข้อ ค): แยก Visual Identity ชัดเจนว่ากลุ่มล่างไม่มีการคืนค่าข้อความลงบรรทัด

ไม่มีจุดตายเพิ่มเติมในข้อนี้ครับ ถือว่าเป็นสถาปัตยกรรม UI ที่รัดกุมแล้วครับ