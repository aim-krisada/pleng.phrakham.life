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

---
---

# PART 2 (เพิ่ม 24 ก.ค. · รอบ caret/menu/octave) — พี่เปา (ผู้ใช้จริงทุกวัน) เจอตอนคีย์เพลง

**สโคปเดิม:** ตัวแก้ inline (`SongViewer.vue` โหมด `editMode` + `NoteInputBar.vue`) · ⛔ ไม่แตะ `EditorMode.vue`
(ตัวเก่า) · ⛔ ไม่แตะข้อมูลเพลง · spec ยังไม่แตะโค้ด · **transcript G เต็ม** →
`work/ปรับ pl edit ui/meetings/2026-07-24-caret-menu/` (ส่ง `05-flat-sent.md` · ตอบ `06-round1-resp-FULL.md` ·
ตรวจ `07-verify-notes.md` · octave `08`–`10`)

**อ่านของจริงก่อนเขียน (อ้างไฟล์:บรรทัด):** โมเดลเคอร์เซอร์ปัจจุบัน = **block "เลือกโน้ต"** — `curIdx`
(`SongViewer.vue:235`) ชี้ 1 unit ในลิสต์ interleaved (โน้ต=คู่ · เนื้อ=คี่ · `:232-234`) · เดินด้วย
`moveHoriz`(±2)/`moveVert`/`moveBar`/`moveLineJump` (`:270-308`) · keydown ที่ `onCaptureKey` (`:387-459`) ·
พิมพ์เลข: default **overwrite** (`overwriteDigit`) · Insert key สลับเป็น **insert** (`insertDigit`, ripple ขวา ·
`typeMode` `:381`) · **`Delete`=ทำเป็น rest อยู่กับที่ (`deleteSel`→`restNote` :454/624)** · **`Backspace`=ลบทั้ง
cell ดึงชิด (`removeCell`→`withDeletedNote` :455/644)** · engine ข้อมูลมี `withInsertedBox(...,before)` รองรับ
**แทรกก่อน/หลังโน้ตอยู่แล้ว** (`songEdit.js:189/197`) — ตัว UI แค่ยังไม่มีตำแหน่ง "ก่อนโน้ตตัวแรก"

---

## 4. Task A — พับเมนู "เพลง ▾" เข้า ⋮ เพิ่มเติม + ต่อ engine ค้นหาจริง

### วันนี้เป็นยังไง
- "เพลง ▾" teleport เข้า `#shell-menus` (`Studio.vue:509-540`, `v-if mode!=='edit'`) · panel มี **"สร้างเพลงใหม่"**
  (`createNew` `:526`) + **ComboSelect picker** (`:530`, `pickerOptions` `:427`)
- **⋮ เพิ่มเติม (overflow) ยังไม่มี — ต้องสร้างใหม่** (ในแถบมีแค่ เพลง▾ · ↗แชร์ `:544` · แถบโหมด MODES `:556`)
- ค้นหาวันนี้ = **ComboSelect filter แบบ substring บน `songHaystack`** (`ComboSelect.vue:39`
  `(o.search ?? o.label).includes(q)`) → **note-sequence "5561"↔"5 5 6 1" · fuzzy พิมพ์ผิด · book-ref ไม่ทำงาน**
  ทั้งที่ placeholder โฆษณา "โน้ต" · engine จริง `searchSongs`/`filterSongs` (`songSearch.js:231/224` — note-aware
  space-insensitive + fuzzy + book-ref) **มีครบแต่ picker ไม่เรียก**

### สเปก
- **ลบ "สร้างเพลงใหม่" ออกจากเมนูนี้** (สร้างอยู่หน้าแรกที่เดียว ตามที่ P'Aim เคาะ) → เอา `createNew` block ออก
- **สร้าง ⋮ เพิ่มเติม (overflow) menu** — icon `more-vertical` (Lucide · kebab) · `aria-haspopup="menu"` +
  `aria-expanded` · อยู่ขวาสุดของ shell actions ตาม locked design `‹back · title · ✏️edit · ↗share · ⋮more`
  (`ux-groundup-design.md`) · ใช้ `shellMenu` one-menu-at-a-time เดิม (`:436`)
- **⋮ ตามดีไซน์ล็อก** (`ux-groundup-design.md`) = 🖨พิมพ์ · ⬇ดาวน์โหลด · ★โปรด · ➕เพลย์ลิสต์ · **🔎เปิดเพลงอื่น** ·
  ⚙เสียง/คีย์/tempo · **⛔ ไม่มี "สร้างเพลงใหม่"** (create = หน้าแรก) · **งานนี้ = สร้าง container ⋮ + item "เปิดเพลงอื่น"** ·
  slot อื่น (พิมพ์/ดาวน์โหลด = print lane · โปรด/เพลย์ลิสต์ = EPIC H/I · เสียง = audio lane) **วางโครงรองรับ** แต่ wiring
  เป็นของ lane นั้น (ระบุใน DoD) · ⛔ ไม่ซ้ำ ↗แชร์ (อยู่บนแถบแล้ว)
- **ย้าย "เปิดเพลงอื่น…" เข้า ⋮** → กดแล้ว**ขยายเป็นช่องค้นหาในเมนู** (ไม่เด้ง dialog ซ้อน · โฟกัสทันที) · บนมือถือ =
  full-screen sheet ตาม `docs/ux-platform-patterns.md`) ที่มีช่องค้นหา + ลิสต์ผล
- **ค้นหาต้อง back ด้วย `searchSongs` (ranked · note/fuzzy/book-ref aware)** ไม่ใช่ substring:
  - เพิ่ม optional prop ให้ ComboSelect: `:rank-fn` (หรือ `:filter-fn`) → เมื่อมี ให้ ComboSelect delegate
    matching+ordering ไป `searchSongs(songList, query)` แทน internal `.includes` (`ComboSelect.vue:39`) · คง keyboard
    a11y เดิม (↑↓/Enter/Esc · role=listbox) · **นี่คือทางที่ผมแนะ** (reuse a11y ตัวเดิม ไม่เขียน picker ใหม่)
  - GATE เดิมคงไว้: options มาจาก `visibleSongs(songList, tier!=='anon')` (`:427` — anon เห็นเฉพาะ verified) →
    อย่าให้ค้นหารั่ว unverified (round-24 leak #2 กันไว้แล้ว ห้าม regress)
- **เปิดเพลง = คงโหมดเดิม (US-05)** — `openSong(id)` → `router.push('/song/'+id)` · route watcher โหลดโดยคงโหมด
  (`:463-467` เดิม) · ไม่เปลี่ยน logic นี้
- **เหตุผล discoverability (Material overflow pattern):** overflow menu = "less-common actions" ·
  ตอนอยู่หน้าเพลง งานหลัก = ร้อง/ดู/แก้เพลง**ที่เปิดอยู่** · "เปิดเพลงอื่น" = งานรอง → เข้า ⋮ ถูกต้อง ·
  คนสลับเพลงบ่อยยังมีหน้าแรก (catalog · route `/`) เป็นทางหลักที่ค้นได้เต็ม

### AC (วัดได้)
- **AC-A1** "เพลง ▾" เดิมหาย · ไม่มี "สร้างเพลงใหม่" ในแถบ (สร้างมีแต่หน้าแรก)
- **AC-A2** ⋮ เพิ่มเติม โผล่ในแถบทุกโหมด non-edit · กด → มีรายการ "เปิดเพลงอื่น…"
- **AC-A3** เปิด "เปิดเพลงอื่น" → พิมพ์ `5561` **เจอ**เพลงที่โน้ตขึ้นต้น `5 5 6 1` (พิสูจน์ใช้ `searchSongs`
  ไม่ใช่ substring — substring หาไม่เจอเพราะ haystack มีเว้นวรรค) · พิมพ์ชื่อผิด 1-2 ตัว **ยังเจอ** (fuzzy) ·
  `ล.282` เจอด้วย book-ref
- **AC-A4** anon (ไม่ล็อกอิน) ค้นหา**ไม่เจอ**เพลง unverified (gate `visibleSongs` คงอยู่)
- **AC-A5** จิ้มเพลง → ไป `/song/:id` · **โหมดเดิมคงอยู่** (อยู่ ฝึกร้อง → ยังฝึกร้อง)

---

## 5. 🎯 Task B — caret / insert / delete model: **cursor เปลี่ยนรูปตามโหมด**

**ต้นตอ (PM วินิจฉัย · ถูก):** เคอร์เซอร์วันนี้เป็น block "เลือกโน้ต" ไม่มีตำแหน่ง "ระหว่างโน้ต" → (1) แทรกก่อน
โน้ตตัวแรกไม่ได้ (2) Del/Backspace ไม่เป็นทิศแบบ text · **หลังคุย G รอบ 1 (`06-round1-resp-FULL.md`) เปลี่ยนจาก
"between-notes caret ตลอดเวลา" (ที่ PM ร่าง) → เป็น cursor เปลี่ยนรูปตามโหมด** ด้วยเหตุผลด้านล่าง

### 🔴 ทำไมไม่ใช้ caret-ระหว่างโน้ต-ตลอดเวลา (จุดที่ต่างจาก PM diagnosis · G ค้าน ผมรับ)
ผมเสนอ G ว่าจะทำ caret ระหว่างโน้ตตลอด + มี "active note = ตัวซ้าย (หรือตัวขวาถ้าอยู่หน้าสุด)" ให้คำสั่งโน้ตเกาะ ·
**G ค้านว่าเป็น context-dependent rule → muscle memory พัง**: `#` จะตกโน้ตซ้ายหรือขวาขึ้นกับตำแหน่ง caret (กลางห้อง
= ซ้าย · หน้าสุดห้อง = ขวา) → มือโปรคีย์เร็วกดผิดง่าย · **ผมรับ ถูกต้อง** → ไม่รวม selection+caret เข้าด้วยกัน แต่
**แยกด้วยโหมด + เปลี่ยนรูป cursor**

### สเปก — 2 โหมด 2 รูป cursor (อ้าง Dorico · verified)
| โหมด | รูป cursor | พิมพ์เลข | คำสั่งโน้ต (# _ ~ ^ ' คอร์ด) | ที่มา |
|---|---|---|---|---|
| **ทับ (default)** | **Block** คลุมโน้ต 1 ตัว (ของเดิม `.syl-sel`) | **ทับพิตช์โน้ตที่คลุม** (`overwriteDigit`) | กระทำโน้ตที่คลุม | happy-path แก้พิตช์ 80-90% — G+ทีมเห็นพ้องคง overwrite เป็น default |
| **แทรก** | **Line Caret** แท่งกะพริบแนวตั้ง **ระหว่างโน้ต** | **แทรกโน้ตใหม่ตรง caret ดันขวา** | กระทำ **โน้ตที่เพิ่งพิมพ์** (มาตรฐาน Dorico/Sibelius) | [Dorico Pro — Insert mode](https://www.steinberg.help/r/dorico-pro/6.1/en/dorico/topics/write_mode/write_mode_insert_mode/write_mode_insert_mode_c.html) : "notes inserted before existing music ahead of the caret … pushed ahead" · toggle = คีย์ **I** |

- **สลับโหมด = ปุ่ม Insert (คีย์ `Insert`) เดิม** (`toggleTypeMode` `:382` · `typeMode` มีอยู่แล้ว) — **ไม่เพิ่มคีย์ใหม่** ·
  desktop ที่ไม่มีปุ่ม Insert → ปุ่ม "แทรก/ทับ" บนแถบ (`NoteInputBar` toggle-mode) ยังใช้ได้
- 🔴 **cursor ต้องเปลี่ยน "รูป" ให้เห็นชัด** ว่าอยู่โหมดไหน (เหมือน VS Code/Word overtype: เส้นบาง↔บล็อก) ·
  Block = กล่องคลุมโน้ต · Line Caret = แท่งบางกะพริบในช่องว่าง (มี `blink` CSS) · **ห้ามให้ 2 โหมดหน้าตาเหมือนกัน**
  (G เตือน — ผู้ใช้ต้องรู้ว่าพิมพ์แล้วจะทับหรือแทรก)
- **Line Caret ไปอยู่ g0 (หน้าโน้ตตัวแรก) ได้** → กด Insert แล้วเลื่อน caret ไปซ้ายสุด → พิมพ์ = แทรกก่อนตัวแรก
  (แก้ปัญหา 1 สมบูรณ์ · engine `withInsertedBox(...,before=true)` รองรับ `songEdit.js:197`)

### การเดิน caret / ปุ่มที่ใช้ (ตรวจไม่ชน `SongViewer.vue:387-459` แล้ว — ตารางคีย์ด้านล่าง)
- **โหมดแทรก:** `←→` เลื่อน caret ทีละช่องระหว่างโน้ต (รวม g0 หน้าสุด และ gN หลังสุด) · พิมพ์เลข = แทรก + caret เดินขวา 1 ช่อง
- **โหมดทับ:** `←→` = block ทีละโน้ต (ของเดิม `moveHoriz` ±2) · ไม่มี g0/gN (บล็อกเกาะโน้ตจริง)
- `Ctrl+←→` = ข้ามห้อง (`moveBar` เดิม) · `↑↓` = สลับโน้ต↔เนื้อ (เดิม) · `Ctrl+↑↓` = ข้ามบรรทัด (เดิม) — **ไม่แตะ**

### 🔴 ลบ: Backspace = ซ้าย · Delete = ขวา (ทิศคงที่ทั้ง 2 โหมด — verified + จุดที่ผมปรับต่างจาก Dorico)
มาตรฐาน text-editor: [Wikipedia — Backspace](https://en.wikipedia.org/wiki/Backspace) "**deletes the character
before the cursor**" · Delete "**deletes text at or following the cursor position**" (forward delete)
- **Backspace = ลบโน้ต "ทางซ้าย" ของ caret เสมอ + caret ถอยซ้าย 1 ช่อง** (ดึงชิด · `withDeletedNote`)
- **Delete = ลบโน้ต "ทางขวา" ของ caret เสมอ + caret อยู่กับที่** (ดึงชิด) · ในโหมด **ทับ** (block) "ขวาของ caret" = โน้ตที่คลุม → Delete = ลบโน้ตที่คลุมแล้วดึงตัวถัดไปเข้ามา
- 🔴 **จุดที่ผมปรับต่างจาก Dorico (รายงาน PM):** Dorico ให้ Delete-ในโหมด-ปกติ = **กลายเป็น rest** (ตรงกับ pleng
  วันนี้พอดี) · แต่ผมเลือก **ทิศคงที่ (ลบขวาแบบดึงชิด) ทั้ง 2 โหมด** เพื่อกันความสับสนแบบเดียวกับที่ G เตือนเรื่อง
  active-note-สลับที่ — **ให้ Del/Backspace มีความหมายเดียวเสมอ** · "ทำเป็น rest อยู่กับที่" ที่เคยผูก Delete →
  **ย้ายไปพิมพ์เลข `0`** (ทับเป็นตัวหยุด · `overwriteDigit('0')` ทำได้อยู่แล้ว) จึงไม่เสียความสามารถ · **นี่ตอบโจทย์
  พี่เปา (ขอสลับ Del/Backspace) ตรง ๆ โดยไม่ต้องสลับปุ่มมั่ว** — ทิศเป็น text-standard เลย
- **ขอบห้อง (bar line · G เตือน):** caret ท้ายห้อง กด Delete → **ข้าม `|` ไปลบโน้ตตัวแรกของห้องถัดไป** · Backspace
  ต้นห้อง → ข้าม `|` ไปลบตัวสุดท้ายห้องก่อน · **⛔ Del/Backspace ไม่ลบเส้น `|` เอง** (กัน layout พังจากลบเพลิน — G) ·
  (วันนี้ `|` เป็น line item แยก `{type:'bar'}` ไม่ใช่ note cell อยู่แล้ว → note-delete ไม่โดน `|` โดยธรรมชาติ ✅)
- **ปลายบรรทัด (line break · G):** `←→` วิ่งสุดบรรทัด → caret ไปท้ายบรรทัดนั้นก่อน · พิมพ์ตัวถัดไปจึง wrap ·
  แตะ/คลิกหน้าสุดบรรทัดถัดไป = caret ไปบรรทัดถัดไป (dev note เรื่อง DOM state ของตำแหน่งนี้)
- **Bar overflow ที่ G ห่วงไม่ applies:** pleng bars = เส้นแบ่งอิสระ (`{type:'bar'}` · **ไม่มี time-signature/นับ
  beat validation ใน `songEdit.js`**) → แทรกโน้ต = ห้องยาวขึ้นเฉย ๆ ไม่ล้น · notationLint เตือนความยาวได้แต่ไม่บล็อก

### มือถือ (G: อย่าให้แตะช่องบาง ๆ)
- **แตะโดนโน้ต = เลือก block เสมอ** (hitbox โน้ตเต็ม ≥44px — Apple HIG 44pt / Material 48dp) · ⛔ ไม่ให้ผู้ใช้จิ้ม
  ช่องว่างบางระหว่างโน้ต (ฝันร้าย hitbox)
- **แทรกก่อนตัวแรก/แทรกกลาง บนมือถือ:** กดปุ่ม "แทรก" บนแถบ → block ที่เลือกกลายเป็น Line Caret ที่ **ขอบซ้าย**ของ
  โน้ตนั้น (แตะโน้ตตัวแรก → แทรก → caret ไป g0) · ปุ่ม ◀▶ บนแถบเลื่อน caret ทีละช่อง
- **แป้นพิมพ์จอไม่บัง caret/ป๊อปอัป:** วัด `visualViewport` แล้ว scroll caret เข้าเหนือแป้น (reuse §1 auto-scroll +
  `scroll-margin-bottom`) · ป๊อปอัปคอร์ด (§3) วางเหนือแป้นเสมอ

### 🔑 ตารางคีย์ทั้งหมดที่พึ่ง + ยืนยันไม่ชน `SongViewer.vue:387-459` (dev เช็กก่อน implement)
| คีย์ | ความหมายใหม่ | สถานะเดิม (ที่บรรทัด) | ชน? |
|---|---|---|---|
| `Insert` | สลับ ทับ↔แทรก (เปลี่ยนรูป cursor) | `toggleTypeMode` (`:419`) | ✅ เดิม ไม่ชน |
| `←→` | แทรก: caret ทีละช่อง · ทับ: block ทีละโน้ต | `moveHoriz`/`moveBar` (`:415-416`) | ✅ ขยาย ไม่ชน |
| `Backspace` | ลบโน้ตทางซ้าย + caret ถอยซ้าย | `removeCell` (`:455`) | 🔁 **นิยามใหม่** (ทิศชัดขึ้น) |
| `Delete` | ลบโน้ตทางขวา (ดึงชิด) | `deleteSel`→rest (`:454`) | 🔁 **เปลี่ยน**: rest ย้ายไปพิมพ์ `0` |
| `0` | ทับเป็นตัวหยุด (rest) | `overwriteDigit('0')` (`:432-435`) | ✅ เดิม (รับภาระ rest แทน Delete) |
| `0-7`·`# b n`·`_ . ~ ^`·`'`·`|`·`( ) { } -` | เดิมทั้งหมด | `:432-453` | ✅ ไม่แตะ (ยกเว้น `.` ดู §6) |

### AC (วัดได้)
- **AC-B1** โหมดทับ (default) · block คลุมโน้ต · พิมพ์เลข = **ทับพิตช์** (ไม่ริปเปิล) — ของเดิมไม่ regress
- **AC-B2** กด `Insert` → cursor **เปลี่ยนรูปเป็นแท่งกะพริบระหว่างโน้ต** (getComputedStyle/DOM ต่างจาก block ชัด) ·
  พิมพ์เลข = **แทรก** ดันขวา
- **AC-B3** 🎯 **แทรกก่อนโน้ตตัวแรกได้**: ในห้อง "2 5 2" · โหมดแทรก · เลื่อน caret ไปซ้ายสุด (g0) · พิมพ์ `5` →
  ได้ "**5** 2 5 2" (5 อยู่หน้า 2 ตัวแรก)
- **AC-B4** 🎯 **Backspace ลบซ้าย · Delete ลบขวา**: caret ระหว่าง "2 | 5" (| = caret) · Backspace → ลบ 2 (เหลือ "5") ·
  ทำใหม่ Delete → ลบ 5 (เหลือ "2") · ทิศตรงตาม Wikipedia forward/back delete
- **AC-B5** พิมพ์ `0` บนโน้ต → กลายเป็นตัวหยุด (rest) อยู่กับที่ (ความสามารถ "rest in place" ยังอยู่หลังย้ายจาก Delete)
- **AC-B6** caret ท้ายห้อง กด Delete → ลบโน้ตแรกห้องถัดไป (ข้าม `|`) · **เส้น `|` ไม่ถูกลบ**
- **AC-B7** มือถือ: แตะโน้ต = เลือก block (ไม่ใช่จิ้มช่องว่าง) · กดแทรก → caret ไปขอบซ้ายโน้ตนั้น · แป้นจอไม่บัง caret
- **AC-B8** 🔴 **ไม่ชน keydown เดิม `:387-459`** — ทุกคีย์ในตารางด้านบนทำงานตามนิยามใหม่ · คีย์ที่ไม่ระบุ = เหมือนเดิม

---

## 6. Task B2 — พิมพ์ระดับเสียง (octave) ด้วยคีย์บอร์ดล้วน (พี่เปา · "แบบที่เคยเป็น")

### วันนี้เป็นยังไง (อ่านซอร์ส · restore ไม่ใช่ออกแบบใหม่)
- ไวยากรณ์ระบบ = **SSOT ของ parser** (`src/lib/notation.js:4-8`): **`.5` = ต่ำ** (จุด**นำหน้า**เลข) · **`5'` = สูง**
  (apostrophe **ตามหลัง**เลข) · **`5.` = ประจุด** (จุด**ตามหลัง**เลข) — parser แยกความหมาย `.` **ด้วยตำแหน่ง** (จุดก่อนเลข
  =ต่ำ · จุดหลังเลข=ประจุด · `notation.js:25-27`) · = มาตรฐาน jianpu (จุดใต้/บนเลข)
- **`'` (สูง) ผูกคีย์แล้ว**: `SongViewer.vue:448` `'` → `octaveSel(1)` (ยกอ็อกเทฟบนโน้ตที่คลุม/เพิ่งพิมพ์) → ตรง `5'` ✅
- **เสียงต่ำ `.5` ทำด้วยคีย์บอร์ดไม่ได้**: `.` วันนี้ = **ประจุดทันที** (`markSel('.')` `:444`) · เสียงต่ำมีแต่**ปุ่มบนจอ
  `ต่ำ↓`** (`NoteInputBar.vue:137` emit `octave,-1`) · คอมเมนต์ยอมรับเอง (`:133` "octave has no keyboard key → button")
- **"แบบที่เคยเป็น" = raw textarea ใน `EditorMode.vue` เก่า** (พิมพ์สตริง `.5 5'` ตรง ๆ ให้ parser แปลง) — inline
  editor ใหม่ยังไม่มีทางพิมพ์เสียงต่ำ = ช่องว่างจริงที่ B2 อุด · **ยืนยัน convention ไม่สลับ**: `.` ก่อน = ต่ำ · `'` หลัง = สูง

### สเปก — `.` เป็น dead-key prefix สำหรับเสียงต่ำ (coherent กับ caret §5)
- **`'` (สูง) = คงเดิม** ผูก `octaveSel(1)` บนโน้ตที่คลุม/เพิ่งพิมพ์ — **ไม่แตะ** · (ยืนยันข้ามระบบ: LilyPond/ABC ก็ใช้
  `'`-ตามหลัง = ยกอ็อกเทฟ · G รอบ 2 ระบุเอง)
- **`.` = dead-key prefix (ปุ่มนำ)** — กด `.` แล้ว **คีย์ถัดไปเป็นเลข 0-7** → เลขนั้นได้เสียงต่ำ (`.5`) · ใช้ทั้ง 2 โหมด
  (ทับ: ทับโน้ตที่คลุมเป็น `.5` · แทรก: แทรก `.5` ตรง caret) · **คีย์ถัดไปไม่ใช่เลข** → เป็น **ประจุด** บนโน้ตปัจจุบัน (`5.`) →
  ตรงกฎ parser (จุดก่อนเลข=ต่ำ · จุดหลังเลข=ประจุด) + muscle memory พี่เปา
- 🔴 **จุดพัง (G ไม่ตอบ — ผมกันเอง):** คลุม `3` ตั้งใจประจุด กด `.` แล้วเผลอพิมพ์ `5` = ได้ `.5` (ต่ำ) แทน → กันด้วย
  **visual pending-low indicator** (จุดจาง ๆ นำหน้า caret ทันทีที่ `.` ค้าง) ผู้ใช้เห็นสถานะก่อนพิมพ์เลข ·
  **one-shot ไม่มี timeout** (คงจนกดคีย์ถัดไป · `Esc` = ยกเลิก pending)
- **มือถือ:** ปุ่ม `สูง↑`/`ต่ำ↓` บนแถบ **คงอยู่** (คีย์บอร์ดล้วน = ทางเดสก์ท็อป · ไม่ได้แทนปุ่ม — PM บังคับ) → 2 ทางอยู่ร่วมกัน
- **collision check (`SongViewer.vue:387-459`):** `'` ผูกแล้ว (ไม่ชนใหม่) · **`.` ต้องเปลี่ยนจาก `markSel('.')`-ทันที
  (`:444`) เป็น dead-key resolver** แต่ยังเป็นคีย์ `.` เดิม (โผล่แค่ SYMBOL_CHARS learn `:407` + markSel branch `:444`
  ไม่ชนคีย์อื่น) · **`Space`=ยืนยันคอร์ด อยู่ใน popup คอร์ด (§3) คนละ context — ไม่ชน**

### AC (วัดได้)
- **AC-B2a** พิมพ์ `.` `5` (ไล่กัน) → ได้ **`.5`** (5 จุดล่าง) · ทั้งโหมดทับและแทรก · **ไม่แตะเมาส์เลย**
- **AC-B2b** พิมพ์ `5` `'` → ได้ **`5'`** (5 จุดบน) — ของเดิมไม่ regress
- **AC-B2c** คลุมโน้ต `5` กด `.` แล้วกด `Enter`/`Space` (ไม่ใช่เลข) → ได้ **`5.`** (ประจุด) ไม่ใช่เสียงต่ำ
- **AC-B2d** กด `.` → เห็น **pending-low indicator** (จุดจาง/ไฮไลต์ที่ caret) · กด `Esc` → indicator หาย ไม่มีอะไรเปลี่ยน
- **AC-B2e** มือถือ: ปุ่ม `ต่ำ↓`/`สูง↑` ยังทำงาน (2 ทางอยู่ร่วมกัน)
- **AC-B2f** flow คีย์บอร์ดล้วน: คีย์เพลงทั้งท่อน (เลข + `.`/`'` + `space`/`enter`) **ไม่ต้องแตะเมาส์ตลอด flow**

---

## รายงาน PM (PART 2) — จุดที่ต่างจาก PM diagnosis / ที่ G ค้าน / ที่ G พลาด
1. 🔴 **เปลี่ยนจาก "between-notes caret ตลอดเวลา" (PM ร่าง) → "cursor เปลี่ยนรูปตามโหมด" (Block ทับ / Line Caret แทรก)**
   — G ค้านโมเดล caret-ตลอด+active-note ว่าเป็น context-dependent rule (muscle memory พัง) · ผมรับ · **ยังได้ทุกอย่างที่
   PM ต้องการ**: แทรกก่อนตัวแรกได้ (Line Caret ไป g0) · Backspace ซ้าย/Delete ขวา (text-standard) · ต่างแค่ "ไม่บังคับ caret
   ตลอดเวลา" ซึ่งรักษา overwrite-default (happy-path แก้พิตช์ 80-90%) ที่ P'Aim ล็อก
2. 🔴 **Del/Backspace ทิศคงที่ทั้ง 2 โหมด** (ต่างจาก Dorico ที่ default=rest / insert=pull-tight) — กันความสับสน ·
   "rest อยู่กับที่" ย้ายไปพิมพ์ `0` (มีอยู่แล้ว) · ตอบโจทย์พี่เปาตรง ไม่สลับปุ่มมั่ว
3. ⚠️ **ตัด keybinding MuseScore 4 ทิ้ง** — G อ้าง Shift+I/Ctrl+Shift+I แต่ **ไม่ยืนยัน** (G เคยพลาด MS keys) → สเปกอ้าง
   **Dorico (Steinberg help จริง) + Wikipedia** เป็นฐานแทน ไม่อ้าง MS4 keybinding
4. 🔴 **G ไม่ช่วยเรื่อง octave (B2) — 2 รอบเข้าใจผิด** (ไล่ระบบโน้ต SPN/ABC ทั่วไป · แล้วแค่รับทราบ) → ตัดสินเองบน
   parser SSOT (`notation.js:4-8`) + มาตรฐาน jianpu + LilyPond corroborate `'`=สูง · จุดพัง dead-key ผมกันเองด้วย visual pending
5. **Task A (menu→⋮)** — low-controversy · ตรง locked design + Material overflow pattern · ประเด็นเดียวที่ต้อง dev ตัดสิน =
   ต่อ `searchSongs` เข้า ComboSelect ยังไง (แนะ prop `:rank-fn`)

## ยังไม่พิสูจน์ (PART 2 · ห้ามนับว่าผ่าน)
1. **ไม่ได้รันโค้ด/เปิดแอป** — spec ล้วน · สถานะปัจจุบันอ่านจากซอร์สจริง (`SongViewer.vue`·`Studio.vue`·`ComboSelect.vue`·
   `songSearch.js`·`songEdit.js`·`notation.js`·`NoteInputBar.vue`)
2. **ไม่ชน keydown `:387-459`** — ตรวจจากซอร์สแล้ว (ตาราง §5) แต่ **dev ต้องยืนยันตอน implement** ว่า Insert/Backspace/
   Delete/`.` นิยามใหม่ไม่พังคีย์อื่น + `.` dead-key ไม่ทำ SYMBOL_CHARS learn เพี้ยน
3. **รูป cursor 2 แบบ (Block↔Line Caret) แยกกันเห็นชัดจริงบนจอ** — เป็นข้อเสนอ · ต้องเห็นของจริง + ทดสอบกับพี่เปาว่ารู้ว่า
   อยู่โหมดไหน (G เตือนว่าถ้าเหมือนกัน = พัง)
4. **dead-key `.` visual pending + one-shot** — กันจุดพ้ังด้วย indicator เป็นข้อเสนอ · ต้องทดสอบกับพี่เปาว่าไม่รำคาญ/ไม่พลาด
5. **ComboSelect รับ `:rank-fn`** — เป็นทางที่แนะ · dev อาจเลือกทำ picker แยก · ทั้งคู่ต้องพิสูจน์ note/fuzzy/book-ref เจอจริง (AC-A3)
6. **บริบทมือถือ (แตะโน้ต→block · แทรก→caret ขอบซ้าย)** — ยังไม่ทดสอบ real device
