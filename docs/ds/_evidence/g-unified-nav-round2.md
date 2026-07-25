# G consult — session pleng-v2-header-2026-07-25

- when: 2026-07-25 09:27:13
- url: https://gemini.google.com/app/c254fc1fb4df8119

## Q
ตามต่อ ให้ฟันธงจุดที่ยังก้ำกึ่ง 3 ข้อ (ตอบสั้น + citation):

1) แยกให้ชัด: Spotify ‹ › คือ 'history arrows' (เหมือน browser back/fwd ตาม session) — ต่างจาก 'hierarchical Up' ของ Android ที่ยึดโครงสร้างข้อมูล. แอปคลังเพลงนมัสการนี้เป็น content-hierarchy (catalog→เพลง) ไม่ใช่ media-browse-history. ยืนยันไหมว่าเราควรใช้ **hierarchical Up (labeled, ‹ + ปลายทาง)** ไม่ใช่ history arrows แบบ Spotify? เพราะอะไร + cite.

2) บนแถบเพลงมือถือ/standalone ที่พื้นที่จำกัด: ควรมีทั้ง Home (แบรนด์) และ Up พร้อมกันไหม หรือ Up อย่างเดียวพอ (เพราะกด Up ไล่ขึ้นไปถึง start/catalog ได้ตาม Android)? อะไรคือ best practice — 2 ปุ่มหรือ 1? cite.

3) beta chip วางข้าง title — ขัดกฎ M3 'leading = navigation only' ไหม ถ้า chip อยู่ในโซน title (ไม่ใช่ leading icon slot)? ยืนยันตำแหน่งที่ถูกต้องเป๊ะ + cite M3 badges/app-bar.

ย้ำกฎ: citation จริง + URL, ไม่แน่ใจให้บอก ห้ามแต่ง.

## A
ฟันธง 3 ประเด็นก้ำกึ่งพร้อม Citation จริง:

1) ยืนยันให้ใช้ Hierarchical Up (‹ + ปลายทาง) ไม่ใช่ History Arrows แบบ Spotify

คำฟันธง: ยืนยัน 100% ว่าควรใช้ Hierarchical Up

เหตุผล:

Spotify ใช้ History Arrows (‹ ›) เพราะพฤติกรรมผู้ใช้เป็นการท่องไปตามจุดต่างๆ แบบสุ่ม (Session-based Linear History) เช่น จาก Playlist A -> Artist B -> Search -> Album C ซึ่งไม่มีโครงสร้าง Parent-Child ที่ชัดเจน

แอปคลังเพลงนมัสการเป็น Content Hierarchy (Shallow 2-level) ที่มีจุดเริ่มต้นแน่นอน (/ Catalog -> /song/:id Song View) การใช้ Hierarchical Up ช่วยสร้าง Mental Model ที่คงที่และคาดเดาได้ (Predictable) บน PWA Standalone โดยผู้ใช้กด ‹ รายการเพลง แล้วรู้ทันทีว่าถอยกลับไปชั้นแม่ ไม่ใช่ถอยตามประวัติการเข้าดู

Citation & URL:

Android Navigation Principles:

"Up navigation is strictly based on the hierarchical structure of your app... The Up button ensures the user is returned to the logical parent screen in the application structure."

URL: https://developer.android.com/guide/navigation/principles

2) บนแถบมือถือ/Standalone ที่พื้นที่จำกัด: ควรมี 1 ปุ่ม (Up อย่างเดียว) หรือ 2 ปุ่ม (+ Home)?

คำฟันธง: บนมือถือควรมี Up เพียงปุ่มเดียว (1 ปุ่ม)

เหตุผล:

เมื่อลำดับชั้นมีความลึกเพียง 2 ระดับ (/ -> /song/:id) การกด Up จากหน้าเพลง จะนำผู้ใช้กลับสู่ Start Destination (Catalog/Home) โดยตรงทันที ปุ่ม Home จึงซ้ำซ้อน (Redundant)

การวางทั้ง Home (Logo) และ Up บนพื้นที่แคบของมือถือ ละเมิดหลัก Touch Target Spacing และสร้าง Visual Overcrowding ในพื้นที่ Leading Area

Citation & URL:

Material Design 3 - Top App Bar Guidelines:

"Don't overcrowd the top app bar with too many actions... Leading area is reserved for one navigation icon."

URL: https://m3.material.io/components/app-bars/guidelines

Apple HIG - Navigation Bars:

"A navigation bar displays a single back button on the leading edge... avoid including unnecessary controls that obscure the title or crowd the bar."

URL: https://developer.apple.com/design/human-interface-guidelines/navigation-bars

3) Beta Chip วางข้าง Title ขัดกฎ 'Leading = navigation only' ของ M3 หรือไม่?

คำฟันธง: ไม่ขัดกฎ

เหตุผล:

กฎ "Leading = navigation only" หมายถึง Leading Slot (48x48dp slot ทางซ้ายสุด) สงวนไว้สำหรับ Navigation Icon เท่านั้น (เช่น ปุ่ม Up ‹) ห้ามเอา Action/Button อื่นไปวางใส่

Title Slot (โซนตรงกลาง) อนุญาตให้วาง Text Title ควบคู่กับ Inline Status Elements เช่น Badge / Tonal Chip ได้ โดยถือว่า Badge เป็นส่วนหนึ่งของ Metadata/Context ของหน้านั้น ไม่ใช่ Navigation control

ตำแหน่งที่ถูกต้องเป๊ะ:

[ Leading Slot: ปุ่ม Up (‹ รายการเพลง) ] | [ Title Slot: ชื่อเพลง + (v2 Beta Badge) ] | [ Trailing Slot: Overflow Menu (⋮) ]

Citation & URL:

Material Design 3 - Top App Bar Anatomy & Specs:

Anatomy ระบุโครงสร้างชัดเจน: 1. Leading navigation icon, 2. Title (can contain inline indicators/badges), 3. Trailing action icons.

URL: https://m3.material.io/components/app-bars/specs

Material Design 3 - Badges Guidelines:

"Badges can be attached to other components, such as icons or text, to convey dynamic information or status."

URL: https://m3.material.io/components/badges/guidelines
