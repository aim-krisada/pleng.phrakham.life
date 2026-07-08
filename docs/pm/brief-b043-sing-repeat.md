# SA brief — B043: จัดหน้าฝึกร้องด้วย tag ท่อน + multi-select repeat

**บทบาทรอบนี้: SA (ออกแบบ) เท่านั้น — ยังไม่ dev** · ฐาน `studio-shell-redesign`
**ที่มา:** P'Aim real-use test 9 ก.ค. 2026 (ต่อยอด B040 "วนท่อน" · B040 ยุบรวมเข้า B043 แล้ว)

## Objective
ออกแบบ **แผงควบคุมฝึกร้องแบบ music player เต็มรูปแบบ** — progress bar + marker ท่อน + play/pause/prev/next + เลือกวนซ้ำท่อน (multi-select) — แก้โจทย์ยากที่ว่าการ**แสดงผลย่อ** (โชว์ hook ครั้งเดียว) ขัดกับ**ลำดับการเล่นจริง** (ไม่เป็นเส้นตรง)

> **ขอบเขตขยาย (P'Aim 9 ก.ค. · รวม B042 เข้ามาแล้ว):** เปลี่ยนแนวจาก "ปุ่มเล่นเดี่ยว" → **transport bar แบบ Samsung Music** (ref: `docs/pm/realuse-assets/ref-music-player-{play,pause}.jpg`)
> - **progress bar เลื่อน/แตะได้ (seek)** + **marker = ขอบเขตท่อน** (แตะ marker = กระโดดไปท่อนนั้น) → ทำได้เพราะมีโครงสร้างท่อน/โน้ตอยู่แล้ว
> - **⚠️ แกน bar = ตำแหน่งดนตรี (ห้อง/ท่อน) ไม่ใช่เวลา mm:ss** เพราะ BPM ปรับสดได้ (เปลี่ยนความเร็ว → เวลารวมเปลี่ยน) · marker ป้ายด้วยชื่อท่อน
> - **▶/⏸ play/pause** (เลิก icon stop สี่เหลี่ยม · behaviour มาตรฐาน = พักแล้วเล่นต่อจากเดิม) — **ตอบโจทย์ "เล่นต่อ/เริ่มใหม่" ในตัว** (⏮ = ต้นท่อน/ต้นเพลง = เริ่มใหม่)
> - **⏮/⏭ = หน่วย "ท่อน"** (ไม่ใช่เพลงถัดไป · แบบ Spotify: ⏮ ใกล้ต้นท่อน = ท่อนก่อนหน้า)
> - **marker บน bar = tag ท่อน อันเดียวกับ multi-select repeat** → ออกแบบเป็นหน้าจอเดียว ไม่แยก
> - เดิม B042 (เล่นต่อ/เริ่มใหม่) **ยุบรวมที่นี่** — ไม่แยกไป dev ก่อนแล้ว

## บริบท/โจทย์ (จาก P'Aim)
- อยากให้แต่ละท่อน (ท่อนทำนอง / เนื้อร้อง) เป็น **tag** แล้ว **multi-select** ว่าจะ repeat ตรงไหน
- **ความซับซ้อนหลัก:** เพื่อประหยัดพื้นที่ (โดยเฉพาะตอนพิมพ์) แอปโชว์ **hook/ท่อนซ้ำแค่ครั้งเดียว** แล้วให้ flow ไล่แต่ละข้อ **วนกลับมา hook** → ลำดับเล่นจริงเป็น verse1 → hook → verse2 → hook … แต่หน้าจอแสดง hook บล็อกเดียว
- ต้องออกแบบว่า: (1) ผู้ใช้เลือก "วนท่อนไหน" ยังไงให้เข้าใจง่าย (2) ตอนเล่น/ไฮไลต์จะไล่ตามลำดับจริงยังไงในเมื่อ layout ย่อ (3) ปุ่ม loop เดิม (ปิด/เปิด = วนทั้งเพลง) จะกลายเป็นอะไร

## Design inputs / requirements (จาก P'Aim 9 ก.ค. — ต้องออกแบบเผื่อ)
1. **รวม "ปุ่มท่อน" เดิมเข้ากับ transport เป็นระบบเดียว** — ตอนนี้มีแถบชิป `▶ ทั้งเพลง · ร้อง1 · รับ · ร้อง2` (SongViewer `sections` computed จาก `{type:'section'}` · เล่นเป็นท่อน) · **อย่าทำ 2 UI ขนาน** (ชิป + progress-bar-marker = ซ้ำซ้อน) · ท่อนพวกนี้ = marker บน progress bar อันเดียวกัน (แตะ=กระโดดเล่น · ⏮/⏭=ท่อนก่อน/ถัดไป · multi-select=เลือกวน)
2. **เผื่อเพลงที่ไม่มีโครงท่อน (v1 แบน)** — section chips โผล่**เฉพาะเพลงที่มี `arrangement`** (v2: ร้อง/รับ) · เพลง v1 (`content.lines` แบน เช่นเพลง 1 "พระเจ้าเป็นความรัก") → `songModel.js` แปลงเป็น stanza เดียว label ว่าง → **ไม่มี tag ให้เลือก** · DS ต้องระบุ fallback (เล่นทั้งเพลงเฉยๆ? / ชวนผู้ใช้ไปเพิ่มโครงท่อนในหน้าแก้ไข?) · downstream: เติมโครงท่อนเพลงเก่าทั้งคลัง = งาน DA แยก
4. **⭐ รื้อ control ฝึกร้องทั้งหมด → music control ใน bottom sticky dock (P'Aim 9 ก.ค. · img `docs/pm/realuse-assets/sing-redesign-annotated.png`):**
   - ตอนนี้หน้าฝึกร้องมี **การ์ดควบคุมก้อนใหญ่ด้านบน** (ฟังเพลง · tempo · วนซ้ำ · ก-/ก+ · เต็ม/เนื้อล้วน · ABC/IVV · พิมพ์) กินที่จอ
   - P'Aim: **"ควรออกแบบใหม่หมด เป็น Music control ด้านล่าง ใช้ sticky mobile dock key"** → ย้าย control ทั้งหมดจากการ์ดบน → **แถบ dock ล่าง (sticky)** = ตัวเดียวกับ dock-core library · transport bar (progress+marker+play/pause) + display/chord/key/tempo อยู่ใน dock ล่างนี้ทั้งหมด
   - **ย้าย download เข้า dock ด้วย** (note 2 · คืนที่แถบบน)
   - = B043 ไม่ใช่แค่ "เพิ่ม tag/repeat" แต่ **ยกเครื่อง control ฝึกร้องทั้งหน้า** ให้เป็น music-player ใน bottom dock · **config ลง dock-core library** (ดู brief-dock-core §เป้าหมายสถาปัตยกรรม)
5. **layout convention ของแถบควบคุม (P'Aim 9 ก.ค.):**
   - **⋯ "ดูเพิ่ม" อยู่ขวาสุดของกลุ่มปุ่มเครื่องมือเสมอ** (ธรรมเนียม overflow) · ตอนนี้มีปุ่ม (blend/sliders/หุบ) อยู่ขวาของ ⋯ = ผิด → เรียง `[grip] [tools…] [⋯]` แล้วปุ่มระบบ dock (หุบ) แยกออก (ยิ่ง dock-core ทำปุ่มลอยรวม หุบจะออกจากแถบ ⋯ เป็นตัวท้ายพอดี)
   - **แถบ = แนวนอน** (ปุ่มคุมอ่านซ้าย→ขวา เหมือน music player) · **เมนูที่ ⋯ กางออก = แนวตั้ง + ไอคอน+ชื่อ** (ตอนนี้ไอคอนล้วนต้องเดา → overflow ควรมีชื่อกำกับ อ่านง่าย เพิ่มรายการได้เยอะ)
   - เป็น convention ของ **dock library กลาง** → ใช้ทุกโหมด (edit/sing/print) เหมือนกัน · SA เขียนเป็น spec, dock-core implement ตอนทำ library

## แตะโมเดล — อ่านก่อนออกแบบ
- **`docs/song-model-v2.md`** (บังคับ) — v2 แยก **melody (stanza)** จาก **words (verse/refrain linked to a stanza)** · 1 พยางค์ต่อ 1 โน้ตที่มีพยางค์ · โครงสร้าง verse/refrain นี่แหละคือกุญแจของ "hook ครั้งเดียว เล่นวนกลับ"
- ต้องออกแบบให้ tag/repeat map กับโครงสร้าง v2 ได้จริง (ไม่ใช่ hack บน UI อย่างเดียว)

## SA deliverables (ตาม flow: idea → US → DS → wireframe → P'Aim เคาะ → ค่อย dev)
1. **US** `docs/us/sing-repeat.md` — user story + AC (ผู้ใช้ทำอะไรได้ · เงื่อนไขผ่าน)
2. **DS** `docs/ds/sing-repeat.md` — ออกแบบ interaction + data (tag ท่อนมาจากไหนในโมเดล · multi-select เก็บที่ไหน · playback order gen ยังไง · ไฮไลต์/auto-scroll ตามลำดับจริง — เชื่อมกับ B038)
3. **Wireframe/mockup** — ให้ P'Aim เห็นภาพก่อนโค้ด (คลิกได้ยิ่งดี · แบบเดียวกับ studio wireframe เดิม)

## Gate (สำคัญ)
- **ห้ามเขียนโค้ดจนกว่า P'Aim จะเคาะ design** — งานนี้กำกวมสูง ออกแบบผิด = รื้อแพง
- เสร็จ design แล้ว **บอก PM (session "pm ต้นแบบ pl2")** เอา design ให้ P'Aim review → อนุมัติ → ค่อยแตกงาน dev (สายเดิมต่อเป็น dev ได้)

## สถาปัตยกรรม — transport bar สร้างบน "dock library กลาง" (P'Aim 9 ก.ค.)
- **แถบ transport (progress+marker+play/pause/prev/next) จะอยู่ใน dock/แถบควบคุมกลาง** (StudioDock) ที่สาย **dock-core เป็นเจ้าของ** (กำลังทำ unify + ออกแบบให้ config ต่อหน้าได้ · ดู `docs/pm/brief-dock-core.md` §เป้าหมายสถาปัตยกรรม)
- **DS ต้องระบุ:** หน้าฝึกร้อง **config** อะไรลง dock library บ้าง (transport controls + progress/marker) · ต้องการ control ชนิดใหม่อะไรที่ core ยังไม่มี (เช่น progress/slider/custom slot) → บอกให้ชัด เพื่อ **นัดกับ dock-core** ว่า core เพิ่มให้ หรือหน้าฝึกร้อง inject เอง
- **เป้าหมาย routing:** ถ้า dock library generic พอ → **dev หน้าฝึกร้องทำเองได้** (แค่ config) · ถ้าต้องแก้ core → เป็นงานของ dock-core (กระทบทุกหน้า) · PM จะจัดลำดับตามผลออกแบบนี้

## Note เรื่องขนาน (PM คุมชน)
- งานนี้เขียนแค่ `docs/us/` + `docs/ds/` + wireframe = **ไม่แตะโค้ด → ไม่ชนใคร** ทำขนานกับ dock-core / batch ฝึกร้องได้เต็มที่
- เกี่ยวกับ B038 (auto-scroll ตรงพยางค์) — DS ควรเผื่อให้สอดคล้อง (playback order เดียวกัน)
- **DS ระบุให้ชัดว่าต้องการอะไรจาก dock library** → PM เอาไปนัดลำดับกับ dock-core (กันชน StudioDock)
