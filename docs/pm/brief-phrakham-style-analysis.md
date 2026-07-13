# BRIEF (analysis only) — ปรับ pleng ให้เป็นสไตล์เดียวกับ phrakham.life + แก้ Chrome auto-zoom 125%

**สาย:** SA / research (วิเคราะห์-ออกแบบ) · **โหมด:** อ่าน-อย่างเดียว ห้ามแตะโค้ด (นี่คือรอบวิเคราะห์ ยังไม่ implement)
**Branch สำหรับ report:** `analyze-phrakham-style` · **Report:** `docs/reports/analyze-phrakham-style.md`
**จ่ายโดย:** PM (pm22) · **13 ก.ค. 2026**

---

## Objective (คำพี่เอม — ภาษาคน)
พี่เอมพอใจดีไซน์ของ **พระคำดอทคอม (phrakham.life)** มาก — ตอนทำสั่งว่า "ออกแบบให้ทันสมัยที่สุดในโลก + มืออาชีพที่สุดสำหรับเว็บแอป" แล้วได้ผลลัพธ์ที่ชอบ
พี่เอมอยากให้ **pleng** เป็นสไตล์เดียวกันเป๊ะ

มี 2 ปัญหา/เป้าหมายที่ต้องวิเคราะห์:
1. **บั๊กจริงที่ยังแก้ไม่หาย:** เปิด pleng ใน Chrome (เดสก์ท็อป) แล้ว **Chrome ขยายหน้าเองเป็น ~120–125% โดยอัตโนมัติ** ทำให้เมนู/เลย์เอาต์เพี้ยนหมด โดยเฉพาะ **dock key** ที่ออกแบบมาเฉพาะ · **phrakham.life ไม่เป็นปัญหานี้** — ทำไม?
2. **ดีไซน์:** phrakham.life เลย์เอาต์สวย ทันสมัย มืออาชีพ · อยากรู้ว่า pleng ต้องเปลี่ยนอะไรบ้างเพื่อให้เป็นสไตล์เดียวกัน

**ห้ามทำเอง = ให้วิเคราะห์เท่านั้น แล้วส่ง report กลับ PM** (พี่เอมสั่งชัด: รอบนี้เป็นการวิเคราะห์ ยังไม่ลงมือแก้)

---

## Deliverable = report เดียว 2 ส่วน (`docs/reports/analyze-phrakham-style.md`)

### ส่วน A — Root cause: ทำไม Chrome ขยายเอง 125% ใน pleng แต่ไม่ใน phrakham
สืบให้ถึงต้นตอ (ไม่ใช่เดา) เทียบ 2 เว็บตรงๆ:
- ต่างกันตรงไหนที่ทำให้ Chrome ตัดสินใจ zoom/scale: `<meta viewport>`, root font-size, `text-size-adjust`, การใช้ px vs rem/em, min-width/fixed-width, Windows display scaling (125% เป็นค่า default ของ Windows หลายเครื่อง) interact กับ layout ยังไง
- โดยเฉพาะ **dock key** ของ pleng: มันพังเพราะ fixed sizing / absolute px หรือเพราะอะไร — ระบุ file:line
- phrakham ทำอะไรถึงภูมิคุ้มกัน (fluid layout? rem-based? container query? clamp()?) — ระบุไฟล์/บรรทัดใน `phrakham.life2`
- **ข้อควรระวัง:** พี่เอมบอก "เคยนึกว่าแก้แล้ว แต่ยังเป็น" — เช็กว่ารอบก่อนแก้ตรงไหน (memory/board พูดถึง `text-size-adjust:100%` pin ตอน B107 step 9) ทำไมยังไม่หาย · แยกให้ชัดระหว่าง **มือถือ font-boosting** (เคยแก้) กับ **เดสก์ท็อป page-zoom 125%** (ปัญหาปัจจุบัน — คนละเรื่อง?)
- **ข้อเสนอแก้:** ระบุแนวทางแก้ที่ตรงต้นตอ (ยังไม่ต้อง implement — แค่บอกว่าต้องแก้อะไร ที่ไหน ผลข้างเคียง)

### ส่วน B — Design-parity gap: pleng → สไตล์ phrakham
สกัด "DNA ดีไซน์" ของ phrakham.life2 แล้วแมปว่า pleng ต้องเปลี่ยนอะไร:
- **Design tokens:** ดึงจาก `phrakham.life2/theme.scss` (หรือ `assets/`) — สี, typography scale, spacing scale, radius, shadow, container width, breakpoints · เทียบกับ pleng (`src/**/*.css`, theme tokens)
- **Layout system:** โครงหน้า phrakham (header/nav/content/footer grid), max-width, การจัดกึ่งกลาง, whitespace rhythm, sticky/scroll behavior (`pk-scrollnav.js` ใช้ร่วมอยู่แล้ว)
- **Typography:** font family, ขนาด, line-height, การใช้ Thai font
- **Component ที่ pleng มีแต่ phrakham ไม่มี** (เช่น dock key, editor, NoteBoxes) → เสนอว่าจะทำให้เข้ากับ design language ของ phrakham ยังไงโดย**ไม่รื้อ logic** (memory `feedback_refine_not_redesign` — refine ไม่ redesign)
- **ผลลัพธ์ = ตารางเปลี่ยนแปลง (change plan):** แต่ละแถว = [สิ่งที่ต่าง] · [pleng ตอนนี้] · [phrakham เป็นยังไง] · [ต้องทำอะไร] · [ขนาดงาน S/M/L] · [เสี่ยงกระทบ logic ไหม]
- จัดลำดับความสำคัญ: อะไรให้ผล "รู้สึกเหมือน phrakham" มากสุดด้วยงานน้อยสุด (quick wins ก่อน)

---

## Reference (paths)
- **phrakham source:** `C:\gl\krisada\phrakham.life2` (Quarto — `.qmd`, `theme.scss`, `assets/pk-*.js`) · **ไม่ใช่** `phrakham.life-v2` (Jekyll เก่า)
- **pleng dock key + theme:** `src/components/` (dock/ShellBar/EditorMode), `src/**/*.css`, theme tokens · UI มาตรฐาน `docs/ui-standards.md` + `docs/pm/` memories
- **Shared UI:** `pk-scrollnav.js` copy verbatim อยู่แล้ว (memory `reference_phrakham_source_repo`)
- **Live:** pleng = https://pleng.phrakham.life · phrakham = https://phrakham.life
- **Stack ต่างกัน:** pleng = Vue3/Vite · phrakham = Quarto (static) — **ห้ามเสนอเปลี่ยน stack** · โจทย์คือย้าย "design language" ไม่ใช่ย้ายเทคโนโลยี

## กติกา
- **วิเคราะห์อย่างเดียว ไม่แก้โค้ด** · deliverable = report + change plan ให้ PM/พี่เอม ตัดสินก่อน implement
- เปิด dev server เทียบภาพได้ (ทั้ง pleng `--host` และดู phrakham live) แต่**ไม่ commit โค้ด** · commit ได้เฉพาะ report
- อ้างอิง file:line จริงทุกข้อสรุป (ไม่เดา) · เทียบ 2 เว็บที่ 125% zoom จริงในเบราว์เซอร์
- **รายงานกลับ (session-agnostic):** (1) เขียน `docs/reports/analyze-phrakham-style.md` · (2) เพิ่มบรรทัดใน `docs/pm/board.md` §📥 inbox · (3) ping "PM ปัจจุบัน" (ดู `board.md` §🎯 / §🎯 หัว) — อย่า hardcode ชื่อสาย PM
