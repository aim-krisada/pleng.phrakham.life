# Editor flow polish — สเปก 3 ข้อ (พี่เปา/พี่เอมเจอตอนใช้พรีวิว)

**สโคป:** ตัวแก้ **inline ตัวใหม่** (`SongViewer.vue` โหมด `editMode` + `NoteInputBar.vue`) เท่านั้น ·
⛔ ไม่แตะ `EditorMode.vue` (ตัวเก่า) · ⛔ ไม่แตะข้อมูลเพลง · งานนี้ = spec ยังไม่แตะโค้ด
**ต่อจาก:** `work/ปรับ pl edit ui/ux-groundup-design.md` (ดีไซน์ล็อก) · memory `pleng-editor-overhaul-design` (inline WYSIWYG · popup คอร์ด)

**อ่านของจริงก่อนเขียน (ไม่ grep ตื้น):** เปิด `SongViewer.vue` · `Studio.vue` · `NoteInputBar.vue` แล้ว —
สถานะปัจจุบันแต่ละข้อระบุใน "วันนี้เป็นยังไง" ของแต่ละหัวข้อ อ้าง `ไฟล์:บรรทัด`

---

## 1. Auto-scroll เคอร์เซอร์เข้าจอ

### วันนี้เป็นยังไง
เคอร์เซอร์ = `curIdx` (index ของ unit ที่เลือก · `SongViewer.vue:218`) · เดินด้วย `moveVert`/`moveHoriz`/`moveBar`/
`moveLineJump`/`moveUnit` (`:236-289`) · **ไม่มี `scrollIntoView` ที่ไหนเลยตอนเคอร์เซอร์ย้าย** (grep ยืนยัน 0 จุด) →
ในเพลงยาว กด `↑↓` แล้ว cell ที่แก้หลุดจอ ผู้ใช้ต้องเลื่อนเอง

### สเปก
- **watch `curIdx`** → เมื่อเปลี่ยน ให้ `selectedCellEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })`
  - `selectedCellEl` = DOM ของ cell ที่เลือก (มี `.syl-sel`/note cell อยู่แล้ว · `SongSheet.vue:542/553`) — resolve ผ่าน ref/querySelector ตาม li/si/slot ที่ `curIdx` ชี้
- 🔴 **`block:'nearest'` ไม่ใช่ `'center'`** — verified เป็นพฤติกรรม text-editor ระดับโปร (VS Code/Word) · `center` เด้งจอทุกครั้งที่ขยับ = ทำลาย spatial memory + ตาลายตอนพิมพ์รัว (G · ความเห็นจากประสบการณ์ · แต่ตรงกับพฤติกรรม editor จริง)
- 🔴 **`behavior:'auto'` (instant) ⛔ ห้าม `'smooth'`** — verified: [CSSOM View `scrollIntoView`](https://www.w3.org/TR/cssom-view-1/#dom-element-scrollintoview) · smooth = คิว/ยกเลิก animation ตอนกดลูกศรรัว (~30/วิ) → lag ค้างหรือ jank
- **scroll-margin กันโดนบัง 2 ด้าน:** ตั้ง `scroll-margin-top` = ความสูงแถบเครื่องมือ/สถานะบันทึกที่ sticky อยู่บน · `scroll-margin-bottom` = ความสูงแถบปุ่ม/แป้นมือถือ
  - ⚠️ **มือถือ: scroll ต้องรอ `visualViewport` นิ่งก่อน** — คีย์บอร์ดจอเด้งแล้ว `scrollIntoView` ที่ยิงทันทีจะคำนวณตำแหน่งผิด (จอยังไม่ถูกดันเสร็จ) → **ผูก `visualViewport.addEventListener('resize', …)` แล้ว scroll หลังคีย์บอร์ดดันจอนิ่ง** (G · pitfall ที่พิสูจน์ได้จากพฤติกรรม visualViewport)
- **ไม่กระตุกตอนพิมพ์รัว:** เพราะ `block:'nearest'` เลื่อนเฉพาะตอน cell กำลังหลุดขอบ (+ scroll-margin) · ตอนอยู่กลางจอไม่ขยับเลย

### AC (วัดได้)
- **AC-1.1** เพลงยาวเกิน 1 จอ · เคอร์เซอร์อยู่แถวล่างสุดที่มองเห็น · กด `↓` → cell ใหม่เลื่อนเข้ามาเห็นเต็ม **โดยไม่ต้องเลื่อนมือ** · ระยะเลื่อน = พอให้เห็น ไม่ใช่กระโดดไปกลางจอ
- **AC-1.2** เคอร์เซอร์อยู่กลางจอ · กดลูกศรขยับ 1 → **จอไม่ขยับเลย** (พิสูจน์ `block:'nearest'` ไม่ใช่ center)
- **AC-1.3** กดลูกศรค้าง/รัว 10 ครั้งเร็ว → **ไม่มี animation ค้าง/ไม่มี jank** (พิสูจน์ instant)
- **AC-1.4** มือถือ (visualViewport เล็กลงเพราะแป้น) · เลือก cell ใกล้ล่าง → cell ไม่ถูกแป้นพิมพ์บัง (พิสูจน์ scroll-margin-bottom + รอ resize)
- ⚠️ **วิธีทดสอบ:** เครื่องจริง (Chrome/Edge) · ⛔ ไม่ใช่ browser pane (scrollIntoView เคยเงียบใน pane — memory `pleng-agent-browser-not-rendering`) · วัดตำแหน่ง `getBoundingClientRect().top/bottom` เทียบขอบ viewport ก่อน/หลัง

---

## 2. ซ่อนแท็บโหมดบนสุด (ฝึกร้อง/แผ่นเพลง/แก้ไข) ตอนอยู่ในโหมดแก้ inline

### วันนี้เป็นยังไง
แท็บ 3 อัน = `MODES` array (`Studio.vue:363`) render ที่ `:507` (`v-for="m in MODES"`) · โหมดแก้ inline อยู่
**ใน `SongViewer`** (`editMode` ref · `:185`) — **`SongViewer` ไม่ emit สถานะ editMode ขึ้นไปให้ `Studio` เลย**
(grep ยืนยันไม่มี `emit('edit'…)`) · ทางออกจากโหมดแก้ = `toggleEdit()` (`:729`) มีปุ่ม "เสร็จ" + ยืนยันถ้ายังไม่บันทึกอยู่แล้ว

### สเปก
- **SongViewer emit สถานะ editMode ขึ้น** — เพิ่ม `emit('update:editing', editMode.value)` ใน `watch(editMode)` ที่มีอยู่แล้ว (`:329`/`:495`) · `Studio` bind ค่านี้เป็น `songViewerEditing`
- **`Studio` ซ่อนแถบ `MODES` เมื่อ `mode==='view' && songViewerEditing`** — (โหมดแก้ inline อยู่ใน ฝึกร้อง/`view`)
- **ทางออกเมื่อไม่มีแท็บ (Nielsen #3 "User Control and Freedom" — [NN/g 10 Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) · verified เป็น heuristic ข้อ 3):**
  - ปุ่ม **"เสร็จ"** ที่มีอยู่แล้ว (บนแถบสถานะบันทึก · `toggleEdit`) = ทางออกที่มองเห็น
  - 🔴 **เพิ่ม `Esc` = ออกจากโหมดแก้** (desktop) → เรียก `toggleEdit()` (ผ่าน guard ยืนยันถ้ายังไม่บันทึกเหมือนกดปุ่ม) · G ย้ำว่า focus-mode ต้องมี keyboard exit เสมอ ไม่ใช่แค่ปุ่ม
    - ⚠️ **ระวัง Esc ชนกับป๊อปอัปคอร์ด (ข้อ 3):** ถ้าป๊อปอัปคอร์ดเปิดอยู่ Esc = ปิดป๊อปอัปก่อน (ข้อ 3) · Esc อีกครั้งตอนไม่มีป๊อปอัป = ออกจากโหมดแก้ · **ลำดับชั้นชัด: ปิดของที่ตื้นสุดก่อน**
- **แสดง/ซ่อนแบบ animate slide ~150-200ms ⛔ ไม่หายทันที** — G: หายทันที = change blindness (ผู้ใช้งงว่าแท็บไปไหน) · slide เก็บขึ้น = mental model "ถูกเก็บไว้ด้านบน" · (ความเห็นจากประสบการณ์ · สมเหตุผล)
- 🔴 **กัน layout shift:** แถบ `MODES` ต้องเป็น layer แยก (`position: sticky`/`fixed`) ไม่อยู่ใน document flow ของแผ่นเพลง → ซ่อน/แสดงแล้วเนื้อเพลง**ไม่ขยับ offset** เคอร์เซอร์ที่กำลังแก้ไม่เด้ง (G · เป็น pitfall จริง) · ตรวจของจริงว่าวันนี้ `.shell-bar`/tab อยู่ flow ไหน ถ้าอยู่ใน flow ต้องยกเป็น sticky ก่อน

### AC (วัดได้)
- **AC-2.1** เข้าโหมดแก้ inline (กดดินสอ) → แถบ `MODES` หายไป (slide) · `getComputedStyle` display/transform เปลี่ยนจริง
- **AC-2.2** กด "เสร็จ" **หรือ** `Esc` → ออกจากโหมดแก้ · แถบ `MODES` กลับมา · ถ้ายังไม่บันทึก → ขึ้น confirm เดียวกับปุ่ม
- **AC-2.3** ตอนแท็บซ่อน/แสดง → **เนื้อเพลงไม่กระตุกเลื่อน** (วัด `getBoundingClientRect().top` ของโน้ตตัวแรกก่อน/หลัง = เท่าเดิม)
- **AC-2.4** ป๊อปอัปคอร์ดเปิดอยู่ + กด Esc → ปิดป๊อปอัปก่อน (ยังอยู่โหมดแก้) · Esc ซ้ำ → ออกโหมดแก้ (พิสูจน์ลำดับชั้น)

---

## 3. 🎯 คอร์ด = พิมพ์/แก้ตรงจุดที่กด เหมือนโน้ต (ทางหลัก)

**PM ฟันธงแล้วว่าเห็นด้วย · ผมเห็นด้วยเต็มที่** — ตรงดีไซน์ล็อก + แนว MuseScore chord-at-cursor + แถบไกล = เสีย
จังหวะ (Fitts) · ⛔ ไม่มีข้อโต้แย้งกับ PM

### วันนี้เป็นยังไง
ใส่คอร์ดวันนี้ผ่านปุ่ม "คอร์ด ▾" ใน `NoteInputBar` → เปิด `nib-chordbox` (input + ลิสต์คอร์ดในคีย์ + พิมพ์เอง ·
`NoteInputBar.vue`) → `emit('chord')` → `setChord()` → `withChord()` (`SongViewer.vue:665`) · desktop popup ลอยเกาะโน้ต
อยู่แล้ว (variant popup · `:462`) แต่**ต้องกดปุ่มคอร์ดก่อน** = "ขึ้น ๆ ลง ๆ" ที่พี่เอมบ่น · engine `chordOptions`/
`isValidChord`/`withChord` **มีครบแล้ว — งานนี้ reuse ไม่เขียน engine ใหม่**

### สเปก — chord-at-cursor เป็นทางหลัก

**เรียกป๊อปอัป:**
- เคอร์เซอร์อยู่โน้ต → กด **`C`** (หรือปุ่ม "คอร์ด" ที่มี · ทางสำรอง) → ป๊อปอัปคอร์ดเด้ง **ตรงเหนือโน้ตนั้น** (ไม่ใช่แถบไกล)
  - ⚠️ ต้องเลือกคีย์เรียกที่ **ไม่ชนกับการพิมพ์โน้ต** — เลขโน้ตคือ `0-7`, marks คือ `_ . - ~ ^ ' # b n ( ) { } |` · `C`/`K` ว่างอยู่ · **เสนอ `C` (= chord จำง่าย)** · dev ยืนยันว่าไม่ชนก่อน implement
- ป๊อปอัปมี `<input>` โฟกัสทันที · ลิสต์คอร์ดในคีย์ (จาก `chordOptions`) ใต้ช่อง

**พิมพ์ + ยืนยัน + เดินต่อ (หัวใจ · verified จาก MuseScore 4 handbook):**
| คีย์ | ทำอะไร | ที่มา |
|---|---|---|
| พิมพ์ | autocomplete จากคอร์ดในคีย์ก่อน · **ยอมพิมพ์คอร์ดนอกคีย์ได้** (maj7 · sus · /bass) | — |
| **`Space`** | **ยืนยันคอร์ด + เลื่อนไปโน้ตถัดไป + เปิดป๊อปอัปใหม่ทันที** (พิมพ์คอร์ดรัวได้ไม่ต้องปิด) | [MuseScore 4: *"move the input cursor forward to the next beat, note, or rest, press Space"*](https://handbook.musescore.org/text/chord-symbols) · verified |
| `Enter` | ยืนยันคอร์ด + **ปิดป๊อปอัป** (อยู่โน้ตเดิม) | — |
| ⛔ **`Tab`** | **ไม่ผูกอะไรเลย** — สงวนให้ focus-traversal (a11y) | 🔴 verified: MuseScore 4 **เอา Tab ออกจากการเดินคอร์ด** เปลี่ยนเป็น `Ctrl+→` **โดยเจตนาเพื่อคืน Tab ให้ accessibility** · G ยืนยัน "อ่านถูก 100%" (G รอบแรกพูดผิดว่า Tab=ห้อง = พฤติกรรม MuseScore **3** · แก้แล้ว) |
| `Ctrl+Space` | (เผื่อ) กระโดดคอร์ดถัดไปที่ **หัวห้องถัดไป** สำหรับคอร์ดลากยาว | G เสนอ · `Ctrl+→` ของเราจองแล้ว (moveBar) → ใช้ `Ctrl+Space` แทน (ตรวจว่าว่าง) |
| `Esc` | **ยกเลิกข้อความที่พิมพ์ค้าง (คอร์ดเดิมไม่ถูกลบ) + ปิดป๊อปอัป + คืนโฟกัสไป cell โน้ตเดิม** | G · 🔴 pitfall: Esc มักทำโฟกัสหลุดไป `<body>` → ต้องดักคืนโฟกัสที่ cell (เหมือน §2.1/7 ของ palette spec) |

**ความละเอียดการเดิน (verified + ปรับให้เข้า jianpu):**
- **`Space` = โน้ตถัดไปทีละ cell** (ความคาดเดาได้ = สำคัญสุดสำหรับพิมพ์รัว · G) · โน้ตที่ไม่ต้องมีคอร์ด = ปล่อยว่างแล้ว Space ข้ามเอง
- **ข้าม cell ลากเสียง (`-`)** — แทบไม่มีใครเปลี่ยนคอร์ดกลางการลาก (G)
- **หยุดที่ตัวหยุด (`0` rest) ได้** — คอร์ดมาก่อนเนื้อ/จังหวะยกมีจริง (G) · แต่ไม่บังคับใส่

**แก้ vs เพิ่ม vs ลบ:**
- โน้ตมีคอร์ดอยู่แล้ว → ป๊อปอัป pre-fill คอร์ดเดิม + **คลุมข้อความทั้งหมด (select-all)** → พิมพ์ทับได้ทันที (G · verified UX pattern)
- โน้ตยังไม่มีคอร์ด → ช่องว่าง
- **ลบคอร์ด:** (desktop) เปิดป๊อปอัป → คลุมลบข้อความให้ว่าง → `Enter` = ลบ · (mobile) **ปุ่มถังขยะ ≥24px** ในป๊อปอัป (WCAG 2.5.8 AA) เพราะจิ้มแป้นลบข้อความบนมือถือน่ารำคาญ (G)
  - 🔴 **กันลบโดยไม่ตั้งใจ (dirty-checking · G):** เปิดป๊อปอัปแล้ว **ไม่แตะอะไร (pristine) + Enter = ปิดเฉย ๆ ไม่ลบ** · ต้อง**คลุมลบให้ว่างเอง (dirty→'') + Enter** จึงลบ
  - ⚠️ **ผมไม่รับข้อเสนอ G ที่ให้กด `Delete`/`Backspace` บนโน้ต (ไม่เปิดป๊อปอัป) เพื่อลบคอร์ด** — เพราะในตัวแก้เรา **`Delete`=ทำเป็นตัวหยุด · `Backspace`=เอา cell ออก ถูกจองไปแล้ว** (`SongViewer.vue:422-423`) · ผูกทับ = ลบโน้ตแทนคอร์ด = พังหนักกว่า · **เก็บการลบคอร์ดไว้ในป๊อปอัปเท่านั้น** (รายงาน PM: จุดที่ผม override G)

**autocomplete — กัน race condition (verified concern):**
- 🔴 **กด `Enter`/`Space` เร็ว ขณะ autocomplete ไฮไลต์ suggestion แรกอยู่ → ต้องยึด raw text ที่ผู้ใช้พิมพ์ ถ้ามันเป็นคอร์ดที่ valid** (ผ่าน `isValidChord` ที่มีแล้ว) · ⛔ ห้าม force-correct ไป suggestion เว้นผู้ใช้กด `↓` เลือกเอง (G · เป็น pitfall จริงของ chord autocomplete)

**มือถือ:**
- 🔴 **input คอร์ด `font-size ≥ 16px`** — verified: [iOS Safari zoom เข้า input < 16px ตอนโฟกัส](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/) → layout พัง · ต้อง ≥16px (แม้ดูใหญ่ไปนิด) · ถ้าอยากเล็กบน desktop ใช้ `@media (pointer:coarse)` แยก
- **ป๊อปอัปเหนือแป้นพิมพ์เสมอ** — วัด `visualViewport.height` + `offsetTop` วางป๊อปอัปเหนือแป้น (เหมือน `NoteInputBar` bar variant ที่ทำอยู่แล้ว · reuse)

### AC (วัดได้)
- **AC-3.1** เคอร์เซอร์บนโน้ต → กด `C` → ป๊อปอัปเด้ง**เหนือโน้ตนั้น** (rect ป๊อปอัปอยู่เหนือ rect โน้ต) · input โฟกัส
- **AC-3.2** พิมพ์ `G` → `Space` → คอร์ด G ลงโน้ตนั้น + เคอร์เซอร์ไปโน้ตถัดไป + ป๊อปอัปเปิดใหม่ (พิมพ์ `C` → `Space` ต่อได้เลย) · ⛔ Tab ไม่ทำอะไรกับคอร์ด (กด Tab = focus ขยับตามปกติ)
- **AC-3.3** โน้ตมีคอร์ด `Am` → กด `C` → ป๊อปอัป pre-fill `Am` คลุมทั้งหมด → พิมพ์ `F` = ได้ `F` (ทับ ไม่ใช่ `AmF`)
- **AC-3.4** เปิดป๊อปอัปเปล่า → `Enter` ทันที (pristine) → **คอร์ดเดิมไม่หาย** · คลุมลบว่าง → `Enter` → คอร์ดถูกลบ
- **AC-3.5** พิมพ์ `C#maj7/F` → `Enter` เร็ว → ได้ `C#maj7/F` เป๊ะ ⛔ ไม่ถูก autocorrect เป็น suggestion อื่น (พิสูจน์ผ่าน `isValidChord`)
- **AC-3.6** มือถือ: โฟกัส input คอร์ด → **จอไม่ zoom** (font ≥16px) · ป๊อปอัปไม่ถูกแป้นบัง (rect ป๊อปอัป bottom ≤ visualViewport ที่เหลือ)
- **AC-3.7** `Esc` ในป๊อปอัป → ปิด + โฟกัสกลับ cell โน้ตเดิม (กดลูกศรต่อได้ทันที ไม่ต้องคลิก)

---

## รายงาน PM — จุดที่ต่างจากที่ G เสนอ / ที่ผมตรวจแล้วแก้

1. 🔴 **G รอบแรกบอก "MuseScore 4: Tab=ข้ามห้อง" — ผิด** (นั่นคือ MuseScore **3**) · ผมเปิด handbook จริง → MuseScore 4
   **เอา Tab ออกโดยเจตนาเพื่อคืนให้ a11y** เปลี่ยนเป็น `Ctrl+→` · G ยืนยัน "อ่านถูก 100%" → **สเปกไม่ผูก Tab เลย**
2. 🔴 **ผม override G เรื่องลบคอร์ดด้วย `Delete`/`Backspace` บนโน้ต** — G ไม่รู้ว่า 2 คีย์นี้ถูกจองลบโน้ตแล้ว (`SongViewer.vue:422-423`) → เก็บลบคอร์ดไว้ในป๊อปอัปเท่านั้น
3. **ข้อ 3 (คอร์ด) = เห็นด้วยกับ PM เต็มที่** ไม่มีข้อโต้แย้ง

## ยังไม่พิสูจน์ (ห้ามนับว่าผ่าน)
1. **ไม่ได้รันโค้ด/ไม่ได้เปิดแอป** — งานนี้เป็น spec · สถานะปัจจุบันอ่านจากซอร์สจริง (`SongViewer.vue`·`Studio.vue`·`NoteInputBar.vue`)
2. **คีย์ `C` เรียกป๊อปอัปคอร์ด — ยังไม่ยืนยันว่าไม่ชนของจริง** — เสนอไว้ · dev ต้องเช็ก keydown handler (`SongViewer.vue:382-423`) ว่า `C`/`Ctrl+Space` ว่างจริงก่อน implement
3. **scrollIntoView บนเครื่องจริง** — memory เตือนว่าเงียบใน browser pane · ต้องทดสอบ Chrome/Edge จริง (ไม่ใช่ pane) · behavior ที่เลือก (nearest/auto) มาจากมาตรฐาน+ความเห็น ยังไม่วัดกับพี่เปา
4. **การเดิน Space ข้าม `-` หยุดที่ `0`** — เป็นกฎที่ผมกับ G เห็นพ้อง แต่ยังไม่ทดสอบกับเพลงจริงว่าตรงกับที่คนคีย์คาดหวัง
5. **chord label ยาว (`C#maj7/F`) ซ้อนโน้ตข้างเคียงในแผ่นแน่น** — G ตั้งคำถามปิดท้าย · **เป็นเรื่อง render ไม่ใช่ flow การป้อน (นอกสโคป 3 ข้อนี้)** · มีอยู่แล้ววันนี้ (คอร์ด render เหนือโน้ต) → flag ไว้เป็นงานแยก ไม่รวมในสเปกนี้
6. **animate 150-200ms slide · dirty-checking · nearest vs center** = ความเห็นจากประสบการณ์ของ G (ระบุแล้วในเนื้อ) ไม่ใช่มาตรฐานที่อ้าง URL ได้ — สมเหตุผลแต่ปรับได้เมื่อเห็นของจริง
