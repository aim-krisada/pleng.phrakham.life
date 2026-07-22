# งานช้าง: Editor over-haul — **▶ ทำต่อ (ไม่ใช่เริ่มใหม่)**

> ## 🟢 นี่คือการทำต่อ — ดีไซน์ **ล็อก + P'Aim ยืนยันแล้ว** (คุยกันจบหลายรอบ 21 ก.ค.)
> - ⛔ **อย่าออกแบบใหม่ · อย่าถาม P'Aim ยืนยันทิศซ้ำ · อย่าสำรวจ `EditorMode.vue` ทั้งไฟล์ก่อนเริ่ม** — ทิศชัดแล้ว
> - **§9.0 (ทวนโจทย์ก่อนโค้ด) = สำหรับงานที่ยังไม่ชัด · งานนี้ชัดแล้ว** → พูดสั้นๆ 2 บรรทัดว่าเข้าใจ แล้ว**ลงมือขั้นแรกเลย** (หยุดให้ P'Aim ดูทีละขั้นตาม stepwise ก็พอ)
>
> ### 👉 ขั้นแรกที่ทำได้เลย (ไม่ต้องอ่านทั้งไฟล์ก่อน)
> **ขั้น 1 = โหมดดู/แก้ + ปุ่มดินสอ:** ทำให้หน้าเพลง **default แสดงเป็นแผ่นเพลง jianpu** (ใช้ `resolvedPreview` + `SongSheet` ที่มีอยู่) + **ปุ่มดินสอ ✏️ สลับเข้า/ออกโหมดแก้** (โหมดแก้ตอนนี้ = ตัว editor เดิมไปก่อน) → commit → หยุดให้ P'Aim ดู
> ขั้นถัดไป (2,3,4) = ค่อยแทน editor เดิมด้วย inline: cursor/ไฮไลต์ → ดักคีย์พิมพ์สด+ripple → popup คอร์ด (ดู "ต่อไป" ล่างสุด)
>
> โค้ดอยู่ worktree `C:\gl\krisada\pleng-editor-ux` (branch `editor-usability` · push แล้ว · dev port 5310) — **ไม่ใช่ที่ pm dir นี้**

## 🎯 ดีไซน์ที่ล็อกแล้ว = **หน้าแก้แบบ Inline editor** (P'Aim ตกผลึก 21 ก.ค.)

หน้าแก้เดิม (ช่อง input ต่อโน้ต) → เปลี่ยนเป็น **แก้ inline บนตัว render** (WYSIWYG จริง · มาตรฐานโลกแบบ MuseScore/Flat.io/Soundslice):

- **โหมดดู/โหมดแก้ (P'Aim ยืนยัน 21 ก.ค.):** **default = แสดงเป็นแผ่นเพลง jianpu** (โหมดดู · อ่าน/ร้องได้เลย) · **ปุ่มดินสอ ✏️ → เข้าโหมดแก้** ค่อย inline edit · ออกจากโหมดแก้ → กลับเป็นแผ่นเพลง (แพทเทิร์น Notion/Google Docs: ดูก่อน กดดินสอค่อยแก้) · ตรงกับโครง mode เดิม (ฝึกร้อง/แผ่นเพลง/แก้ไข) — "แก้ไข" = ปุ่มดินสอ

- **โน้ต + เนื้อ = ข้อความ render เสมอ** (เหมือนแผ่นเพลง/เอกสาร) — **ไม่มีช่อง input เต็มไปหมด**
- **cursor ตัวเดียว + ไฮไลต์โน้ตที่กำลังแก้** (กรอบ/สีอ่อน) บอกตำแหน่ง — ไม่ใช่ช่องพิมพ์ แค่ตัวชี้ (ไฮไลต์สำคัญ: cursor เปล่าๆ บนมือถือหา/เลื่อนยาก · ไฮไลต์ = เห็นชัด+เป้าแตะใหญ่)
- **คีย์บอร์ดพิมพ์เหมือน Word:** พิมพ์เลข→ขึ้นตรง cursor สด · เว้นวรรค/ลูกศร เลื่อน · backspace ลบ · **ripple เกิดเองเหมือนพิมพ์ข้อความ** (ripple = กลไกเลื่อนพยางค์/โน้ตตอนแทรก/ลบ · ต้องทำงานปกติ · logic เดิมใช้ได้ `pushSlot`/`pullSlot`/`setSyl`)
- **คลิกตรงไหน → cursor ไปตรงนั้น** (กดตรงไหนแก้ตรงนั้น)
- **คอร์ด + สัญลักษณ์พิเศษ (จุด octave · ขีดครึ่งจังหวะ · #) = popup เด้งบนโน้ตที่เลือก** (switchable) — โดยเฉพาะมือถือที่คีย์บอร์ดไม่มีปุ่มพวกนี้ · ใช้รายการคอร์ดเดิม (`chordOptions(key)`)
- **เต็มจอบนจอใหญ่ · ไม่มี h-scroll · ทำงานทั้ง desktop + มือถือ** (world-class + responsive = เงื่อนไขทุกงาน)
- **ไม่ต้องมีหน้า/พรีวิว "ดูผล" แยกอีกแล้ว** (แก้ inline = เห็นผลเลย) → ตัดทิ้ง: ตัวอย่างสด · ดูผลทั้งเพลง(ลอย) · ดูผลต่อห้อง · **เหลือแค่แผ่นเพลงพิมพ์ A4** (render ชุดเดียวกัน + ธีมพิมพ์ · ทำทีหลัง)

**วิธีทำที่เลือกไว้:** ข้อความ render + ช่องรับคีย์ที่มองไม่เห็นซ้อน + วาด cursor/ไฮไลต์ระหว่างตัวโน้ต (เทคนิค editor โค้ด/Word) · ทำเป็นขั้นๆ ไม่รื้อทีเดียวจนพัง

## ✅ ทำไปแล้ว (branch `editor-usability` แตกจาก `studio-shell-redesign`)
`git worktree` = `C:\gl\krisada\pleng-editor-ux` · dev: `npm run dev -- --host --port 5310`
1. `5177a5e` click-to-edit: คลิกห้องใน preview → cursor เด้งไปห้องนั้นในหน้าแก้ (`_source`/`jumpToSource`)
2. `11abfd3` toolbar ห้องโผล่เฉพาะห้องที่คลิก (เลิกกระจายทุกห้อง)
3. `0ba5324` ยุบ toolbar โน้ตลอย + ห้อง เป็นแถบเดียว
4. `e04db61` แถบโชว์ทีละ level + ปุ่มสลับเร็ว (โน้ต↔ห้อง · `toolLevel`/`barToolsOn`/`pickBar`) — **บรรทัด/ข้อ ยังไม่ทำ**
5. `91aacbd`→`09124d7` ลองห้องเท่ากัน(ย่อกล่อง)+เต็มจอ → **ย่อกล่อง revert แล้ว** (ทำพยางค์เยื้องโน้ต 17px = "ripple ดูพัง") · **เต็มจอ (studio-wide → 1920px) เก็บไว้**

⚠️ งานเก่าทั้งหมด (toolbar/level/click-to-edit) จะถูก inline editor แทนบางส่วน — **อ่านดีไซน์ก่อน ค่อยตัดสินว่าเก็บอะไร** (แถบ level + popup คอร์ด น่าเอามาต่อ)
📦 branch `editor-ux-overhaul` = Live Sheet เก่า (ผิดทิศ · P'Aim ไม่เอา) **เก็บไว้ ไม่ลบ ไม่ใช้เป็นฐาน**

## 🔴 บทเรียน session นี้ (อย่าทำซ้ำ — เต็มใน [[feedback_editor_stepwise_direction]] + pair-sop §9.0)
- **ทำ 1 ขั้น → หยุด → ให้ดู → รอ** · อย่าตัดสินใจเอง อย่าทำเกินที่สั่ง
- **คุยภาษาคน** (ห้ามศัพท์ `_source`/`data-bar`/increment) · P'Aim = เสียงผู้ใช้ ไม่ใช่คนตั้งมาตรฐาน (มาตรฐาน = หน้าที่เรา อ้างของจริง)
- **ระดับโลก = เราไปหาเอง + ฟันธงให้สอดคล้อง** (เคยฟันธง "ทั้งห้อง" ขัดกับที่ตัวเองพูด "ระดับโลก=ไม่มีกล่อง" → P'Aim จับได้)
- **"กดได้จริง" ต้องวัด** — คลิกจริง/elementFromPoint ไม่ใช่แค่ querySelector เจอ ([[pleng-dom-exists-vs-visible]])
- **แผ่นเพลง = ไว้พิมพ์** ไม่ใช่พื้นที่แก้ · หน้าแก้ = inline

## แหล่งสเปกต้นทาง (อ่านให้ครบ)
- บทสนทนา P'Aim↔Gemini: `แปลงโน้ตเพลงเป็นอัลกอริทึม.md` (โครงเพลง: repeat/volta/D.C./ท่อนรับ/Layout Engine)
- `บทวิเคราะห์-สถาปัตยกรรม.md` · `g-review-สรุป.md` (v2 มี ~70% · gap 4 ข้อ · flat-rows+attribute)
- ⛔ `DESIGN-editor-overhaul.md` (Live Sheet) = **P'Aim ไม่เอาทิศนั้น** (superseded โดย inline ข้างบน)

## ต่อไป — สถานะจริง 22 ก.ค. (สำรวจโค้ด + G cross-check + US ครบแล้ว)

**อ่านก่อน (SSOT ที่รวมแล้ว — เลิกกระจาย):**
- `design-locked-final.md` — ดีไซน์รวม + **reuse map (เกือบทุกอย่างมีแล้ว)** + แผน reuse-first + 3 แกน #1
- `user-stories-AC.md` — **US+AC ชัด** (ตัวกันหลงทาง) ต่อยอด `docs/us/selection-driven-editor.md` + mission
- **decisions ที่ P'Aim เคาะ:** ripple เปิด default · backspace = ลบดึงชิด · เอาให้ได้เยอะ (รวม copy/paste) · **block-cards ลากวาง** (โปรแกรมสร้าง volta/repeat เอง ไม่วาดสัญลักษณ์) · **popup responsive** (desktop เกาะ cursor / mobile แถบคีย์บอร์ด) · **stack คง Vue3+Vite** (ไม่ Nuxt/Tailwind) · north star = ง่ายสุดทุกเพศทุกวัย · ความซับซ้อนซ่อนไว้ให้คนต้องการ

**WIP inline-edit (branch `editor-usability`) — ทำ *ต่อ* ไม่เริ่มใหม่:**
- ✅ done (commit `7ceb3c4` step A + `3e45ae0`/`17d0ba9`): pencil `toggleEdit()`→`editMode` · คลิกโน้ต/คำ→`selectAt(li,si,syk)` เลือก cell (`selCell`/`selIdx`/`selLayer`=note|word) · `editSel` ส่ง `SongSheet` วาด cursor/ไฮไลต์ · เปิดทุก tier (`canEdit=true`) เกตที่ save · แก้บนแผ่นฝึกร้องจริง (เลิก `InlineSheetEditor.vue` แยก — ลบแล้ว)
- 🔜 **next increment (step B — พิมพ์):** ดักคีย์ตอน editMode+เลือกโน้ต → **พิมพ์ 1-7 = เปลี่ยนโน้ต (ทับ)** · space/ลูกศร เลื่อน → แล้วค่อย ripple(insert)/ลบ 2 แบบ/คีย์เนื้อ (`space`/`-`/`_`/`~`)
- ✅ **สถาปัตย์ resolved (เปิดโค้ดแล้ว 22 ก.ค.):** `EditorMode.vue` เป็นเจ้าของโมเดลเขียนได้ = `stanzas`/`arrangement` ref + `setSyl`(`:317`)/`pushSlot`(`:429`)/`pullSlot`(`:436`) ผูกกับ `lensRow`/`activeStanza`(`:192,223`) · `SongViewer.vue` = reader ล้วน (รับ `props.song` อ่านอย่างเดียว · `resolveContent` · ไม่มี write-path `:127`)
  → **step B = refactor: ยกโมเดลแก้ไข (stanzas/arrangement + setSyl/pushSlot/pullSlot + selection) ออกเป็น composable กลาง `useSongEdit`/`lib/songEdit` ให้ reader-edit + EditorMode ใช้ร่วม (reuse ไม่ก๊อป)** → แล้วต่อ keydown 1-7 บน SongViewer editMode
  → ⚠️ แตะ `EditorMode` 245KB ที่มี test เยอะ — ทำทีละก้าว · รัน `EditorMode.*.test.js` เป็น guard · verify worktree (node + curl)
- verify (worktree): node import `src/lib/*` + `curl 127.0.0.1:<port>` · preview attach ไม่ถึง worktree · **ห้าม deploy/merge main**
- ฝั่งโครงสร้าง (Drawer การ์ด + Make-Unique) + selection-driven (ซ่อนตาม scope) = ทำหลัง inline core (ดู US EPIC C/D)
- ฝั่งสมอง (D.C./Segno · compact) = อีกสาย ทำทีหลัง

---

## ▶ STATE 22 ก.ค. (ค่ำ) — handoff ต่อ session ใหม่ (inline edit)

**branch `editor-usability` (worktree pleng-editor-ux · dev `npm run dev -- --host --port 5310`) — commit ล่าสุด `ff444ca`. ทำ *ต่อ* จากนี้ ไม่เริ่มใหม่.**

เครื่องมือแก้ทั้งหมดอยู่ 3 ไฟล์: `lib/songEdit.js` (pure engine + tests `songEdit.test.js`) · `components/NoteInputBar.vue` (แถบ/ป็อปอัพ) · `components/SongViewer.vue` (orchestrator). เทสต์ ~204–224 ผ่าน (รัน `npx vitest run src/components/EditorMode src/components/SongViewer.play.test.js src/components/SongSheet.test.js src/lib/songEdit.test.js`).

**ทำเสร็จ + P'Aim ตรวจผ่าน:**
- เลือก/นำทาง 2D: ← → ในแถว · ↓ โน้ต→คำ / คำ→โน้ตบรรทัดล่าง · ↑ กลับ · Ctrl+←→ ข้ามห้อง · Ctrl+↑↓ ข้ามบรรทัด
- **ช่องพิมพ์โฟกัส → คีย์บอร์ดจริง** (แป้นเลข=โน้ต · แป้นไทย=เนื้อ) · แก้ **เนื้อร้อง inline** ได้ (`.sv-capture` on-word เนียน ไม่มีกล่องลอย) · กดดินสอโฟกัสทันที (ไม่ต้องคลิกซ้ำ)
- พิมพ์เลข = **ทับ default ลงตรงโน้ต + อยู่ที่โน้ตเดิม** (ไม่เด้ง ใส่ octave/♯ ต่อได้) · Enter/→/space = ไปโน้ตถัดไป · **แทรก = แทรกหลัง** (Insert สลับโหมด)
- คีย์บนคอม: `#`=ชาร์ป `b`=แฟลต · octave/♯♭ = ปุ่มใน popup (คอม) / แถบ (มือถือ)
- ลบ: **Delete**=อยู่กับที่ (โน้ต→ตัวหยุด · คำ→ว่าง) · **Backspace**=เอาออกทั้งช่อง (ลบโน้ตหมดห้อง คอร์ดหายเอง)
- **คอร์ด**: ปุ่ม picker ใส่/เปลี่ยน/ล้าง (`withChord` · chordOptions)
- แถบปุ่มพิเศษ: คอม=popup ลอยข้างโน้ต (grip ลากได้ · (i)ฟ้า help · หลบใต้ header ไม่โดนบัง) · มือถือ=แถบเหนือคีย์บอร์ด (visualViewport) + ลูกศร ← ↑ ↓ →
- ripple เนื้อทุกข้อที่แชร์ทำนอง

**ยังค้าง (P'Aim ยังไม่เคาะ/ยังไม่ทำ):**
1. **จัดคำแป๊ะใต้โน้ต** — ตอนนี้เหลื่อม ~1–8px (มีกลไก bug 010 กระจายอยู่แล้ว · residual จากขอบโน้ต octave/acc). จะแป๊ะ 0px ต้องรื้อ layout แผ่นเพลงเป็น **ตาราง** = แตะ NoteRow (คาน/เส้นโยง) + `styles.css` แชร์ + **ต้องพิมพ์ PDF จริงตรวจ**. รอ P'Aim เคาะ: รับ ~1–8px หรือรื้อ.
2. **เทสต์มือถือจริง (โดยเฉพาะ iOS)** — คีย์บอร์ดเด้ง · แถบลอยเหนือคีย์บอร์ด (visualViewport) · พิมพ์เนื้อไทย · ลูกศร. verify ใน pane ไม่ได้ (PM มอบ P'Aim/tester).

**merge = งานสุดท้าย · PM (pl pm 39) เป็นคน merge เข้า base `studio-shell-redesign`.** ก่อน merge: pull base ล่าสุด + `npm install` (base เพิ่ม dep `qrcode-generator`) · watch conflict `styles.css`. ห้าม merge เอง · ห้าม deploy/main.
