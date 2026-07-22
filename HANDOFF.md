# HANDOFF — inline editor (สาย 1) · อ่านไฟล์นี้ไฟล์เดียวแล้วทำต่อได้

> เขียน 22 ก.ค. 2026 (ค่ำ) · session เดิม context ใกล้เต็ม → session ใหม่ทำต่อ **ไม่ต้อง re-derive**.
> **ทำ *ต่อ* จากนี้ ไม่เริ่มใหม่ · ดีไซน์ล็อกแล้ว.**

## รัน + verify
- worktree นี้ = `C:\gl\krisada\pleng-editor-ux` · **branch `editor-usability`** (แตกจาก base `studio-shell-redesign`)
- ดู state ก่อน: `git log --oneline -20` · HEAD ล่าสุด = handoff commit นี้
- รัน: `npm install` แล้ว `npm run dev -- --host --port 5310` → ส่ง **Network URL** ให้ P'Aim ทุกรายงาน (มือถือเปิดได้)
- เพลงตัวอย่าง: `/#/song/33c26a91-6727-4f98-8d86-17f215a8aecd`
- เทสต์ (ต้องผ่านก่อน merge · ~224):
  `npx vitest run src/components/EditorMode src/components/SongViewer.play.test.js src/components/SongSheet.test.js src/lib/songEdit.test.js`
- verify UI: preview_* attach **ไม่ถึง worktree** → เปิด browser pane navigate `http://127.0.0.1:5310/...` + **`resize_window(1280,800)` ก่อนวัด** (pane เริ่มที่ viewport 0) · programmatic `.focus()` ใช้ได้แม้ `document.hasFocus()=false` · **hash-nav ไม่ reset โมดูล → ใช้ `location.reload()` เมื่อแก้โค้ดแล้วต้องเห็นของใหม่**

## สถาปัตยกรรม (แก้ที่ 3 ไฟล์นี้ · reuse engine เดิม ไม่รื้อ)
- **`src/lib/songEdit.js`** = engine บริสุทธิ์ (unit-test ครบใน `songEdit.test.js`). ทุก mutation อยู่ที่นี่ ทำงานบน v2 content (stanzas+arrangement):
  - โน้ต: `setNotePitch` · `withNotePitch`(ทับ) · `withInsertedNote`(แทรก**หลัง** syk+1) · `withDeletedNote`(เอาออกทั้งช่อง + ห้องว่าง→ลบทั้งห้องรวมคอร์ด) · `withRestAt`(→ตัวหยุด) · `withOctaveShift` · `withAccidental`
  - คำ/คอร์ด: `withSetSyllable`(พิมพ์เนื้อ) · `withClearedSyllable`(ลบคำ) · `withChord`(ใส่/ล้างคอร์ด · ''=ล้าง)
  - ทุก insert/delete โน้ต **ripple syllable ทุกข้อที่ share ทำนอง** (rippleVerses)
- **`src/components/SongViewer.vue`** = reader-edit surface (orchestrator). ถือ `editUnits`(โน้ต+คำ interleave) · `curIdx` cursor · `<input class="sv-capture">` โฟกัสตอนเลือก → เรียกคีย์บอร์ดจริง (inputmode numeric=โน้ต / text=คำ) · `onCaptureKey`/`onCaptureInput` · emit `update-content` ขึ้น Studio (`liveSong`) — **ไม่ mutate props เอง**
- **`src/components/NoteInputBar.vue`** = แถบปุ่มพิเศษ (variant popup=คอม / bar=มือถือ) · layer-aware · chord picker · grip ลาก · (i)help · หลบ header

## ✅ ทำเสร็จ + P'Aim ตรวจผ่าน (keyboard-first inline editor)
- **นำทาง 2D**: ← → ในแถวเดียวกัน (โน้ต→โน้ต / คำ→คำ) · ↓ โน้ต→คำของมัน / คำ→โน้ตบรรทัดล่าง · ↑ กลับ · Ctrl+← → ข้ามห้อง · Ctrl+↑ ↓ ข้ามบรรทัด · มือถือใช้ลูกศรในแถบ
- **คีย์บอร์ดจริง**: กดดินสอ→โฟกัสทันที (ไม่ต้องคลิกซ้ำ) · แตะโน้ต=แป้นเลข · แตะคำ=แป้นไทย → **แก้เนื้อร้อง inline** เนียน (ไม่มีกล่องลอย)
- **พิมพ์เลข = ทับ default ลงตรงโน้ต + อยู่ที่โน้ตเดิม** (ใส่ octave/♯ ต่อได้) · Enter/→/space ไปตัวถัดไป · **แทรก=แทรกหลัง** (Insert สลับโหมด) · คอม: `#`/`b` = ชาร์ป/แฟลต
- **ลบ**: Delete=อยู่กับที่ (โน้ต→ตัวหยุด · คำ→ว่าง) · Backspace=เอาออกทั้งช่อง (ห้องว่าง→คอร์ดหายเอง)
- **คอร์ด**: ปุ่ม picker ใส่/เปลี่ยน/ล้าง (— ไม่มีคอร์ด —)
- **แถบปุ่มพิเศษ**: คอม=popup ลอยข้างโน้ต (grip ลาก · (i)ฟ้า · **หลบใต้ header** flip ลงล่าง) · มือถือ=แถบเหนือคีย์บอร์ด (visualViewport)
- Guide (`src/views/Guide.vue`) อัปเดตตามทุกฟีเจอร์

## 🎯 กำลังทำต่อ = จัดคำให้แป๊ะใต้โน้ต (P'Aim อยากได้ · PM เคาะให้ทำ)
- อาการ: คำเหลื่อมจากโน้ต **~1–8px** (มีกลไก `styles.css` `bug 010` กระจาย note-row/lyric เท่ากันอยู่แล้ว · residual จากขอบโน้ต octave/accidental margin + note grouping ที่ syllable ไม่มี → เลื่อนสะสม)
- ให้แป๊ะ 0px = ต้องรื้อ layout แผ่นเพลงเป็น **ตาราง/คอลัมน์ (โน้ต+คำ share คอลัมน์ กว้าง=max)** → **แตะ `NoteRow.vue`** (วาดคาน/เส้นโยง/ขีดใต้ ที่ measure จาก `.note-row` · ระวังพัง) + `styles.css` (`.segment`/`.note`/`.note-row` line ~607–627 · **ไฟล์แชร์ = PM watch conflict**)
- ⚠️ **แผ่นเพลงกลาง (SongSheet) ใช้ 3 ที่: ฝึกร้อง · พิมพ์ A4 · พรีวิวหน้าแก้** → **ต้อง verify จาก PDF จริง** (Read ไฟล์ PDF ที่ print ออกมา ไม่ใช่แค่ DOM — lesson เดิม) + เช็ค ฝึกร้อง/พรีวิวไม่พัง
- ⏸ **iPad/มือถือ test = P'Aim เลื่อนออกไปเทสต์เองตอนงานสมบูรณ์กว่านี้** (อย่าหยุดรอ)

### 🔴 REFINED โดย PM + P'Aim (22 ก.ค. ค่ำ) — อ่านก่อนทำงานจัดคำ · **ห้ามรื้อเป็นตารางมืดๆ · diagnose ก่อน**
- **P'Aim ดูของจริงแล้ว = ไม่ใช่แค่เหลื่อม px** · ภาพหลักฐาน: `work/ปรับ pl edit ui/align-issue-song141-a.png` + `align-issue-song141-b.png` (เพลง 141 "โอพระเยซูยาม")
- **เคสจริงที่พัง = ห้องที่ "จำนวนโน้ต ≠ จำนวนคำ"** เช่นห้องวงแดง = **3 โน้ต (6 1 6) แต่ 2 คำ (ใจ/รับ)** → คำร้องคลุมหลายโน้ต (melisma) · layout ไหลอิสระเกลี่ยคำเต็มห้อง → **อ่านไม่ออกว่าคำไหนคู่โน้ตไหน** (พังหน้าที่หลักของแผ่นเพลง = "รับระดับนี้" ตกไป · ต้องแก้)
- **ขั้นที่ 1 = DIAGNOSE (ก่อนแก้/ก่อนรื้อ):** ชี้ให้ชัดว่าสาเหตุคือ
  - (ก) **layout** — คำไม่ถูกปักใต้คอลัมน์โน้ตเจ้าของ (แก้ด้วย grid/คอลัมน์ที่ NoteRow+styles.css) · หรือ
  - (ข) **data** — โมเดล v2 ไม่ได้เก็บว่าคำนี้คลุมกี่โน้ต (melisma/tie · ดู memory "render data gaps: v2 ไม่โมเดล ties/slurs") → ต้องเติมที่ข้อมูล + วาดเส้นลาก/ขีดคลุมด้วย
- **เกณฑ์ผ่าน = การันตีอ่านออกทุกเคส** (โดยเฉพาะห้อง count-mismatch) ไม่ใช่แค่ลด px
- **เสนอทางแก้ขั้นต่ำ + แผนกันงานพิมพ์ A4 พัง (verify PDF จริง) → ส่ง PM gate → P'Aim ดูก่อน commit จริง** · ห้าม commit รื้อใหญ่โดยไม่ผ่าน gate นี้

## TODO ถัดไป (หลังจัดคำ)
- **song-shell ground-up** (หน้าเพลง/หน้าแรก) ตาม `work/ปรับ pl edit ui/ux-groundup-design.md` (**LOCKED**)
- **wire ↗แชร์ + ⋮เพลย์ลิสต์** — engine อยู่บน base แล้ว (`lib/share` buildSongUrl + `ShareSheet` · `lib/playlists` toggleSong) → ต่อบน `Studio.vue`
- iOS/มือถือ verify (คีย์บอร์ด/แถบลอย/พิมพ์เนื้อ/ลูกศร)

## ดีไซน์ที่ล็อก (อ่านก่อนทำ)
- `work/ปรับ pl edit ui/ux-groundup-design.md` = **LOCKED SSOT** (พื้นผิวเดียว · ดินสอ · Play · 2 บริบท)
- `work/ปรับ pl edit ui/design-locked-final.md` = reuse map + G cross-check · `user-stories-AC.md` = US/AC
- decisions: north star=ง่ายสุดทุกวัย/ซ่อนความซับซ้อน · แทรกหลัง · พิมพ์=ทับ default อยู่กับที่ · ปุ่ม=เฉพาะที่คีย์บอร์ดไม่มี + (i)help · stack คง Vue3+Vite

## ⚠️ merge = งานสุดท้าย · **PM (session "pl pm 39") เป็นคน merge** เข้า base `studio-shell-redesign`
- ก่อน merge: pull base ล่าสุด + **`npm install`** (base เพิ่ม dep `qrcode-generator`) · conflict watch = `styles.css` (สาย 2 แตะ :root · สาย 1 แตะ component region)
- **ห้าม merge เอง · ห้าม deploy/main** · แจ้ง PM เมื่อพร้อม
