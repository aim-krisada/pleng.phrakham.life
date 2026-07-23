# HANDOFF — inline editor + sheet alignment (สาย 1) · อ่านไฟล์นี้ไฟล์เดียวแล้วทำต่อได้

> อัปเดต 23 ก.ค. 2026 · **ทุกงานในชุด alignment เสร็จ + Tester/verify ผ่านหมด · เหลือแค่ PM merge**
> ทำ *ต่อ* จากนี้ ไม่เริ่มใหม่ · ดีไซน์ล็อกแล้ว.

## รัน + verify
- worktree = `C:\gl\krisada\pleng-editor-ux` · **branch `editor-usability`** (แตกจาก base `studio-shell-redesign`)
- รัน: `npm install` แล้ว `npm run dev -- --host --port 5310` → ส่ง **Network URL** ให้ P'Aim ทุกรายงาน
  - ⚠️ ถ้า 5310 ไม่ว่าง (orphan) vite จะเด้งไป **5311** — เช็ค log ทุกครั้ง
- เพลงตัวอย่าง: `/#/song/33c26a91-6727-4f98-8d86-17f215a8aecd` (=เพลง 141)
- เทสต์ (ต้องผ่านก่อน merge · **263 เขียว**):
  `npx vitest run src/components/EditorMode src/components/SongViewer.play.test.js src/components/SongSheet.test.js src/components/NoteRow.test.js src/lib/songEdit.test.js src/lib/notation.slur.test.js src/lib/notation.melisma.test.js`
  - ⚠️ **ต้อง `cd` เข้า worktree ก่อนรัน vitest** — Bash tool cwd reset ไป primary dir ได้ (จะรันผิด worktree เงียบๆ)
- verify UI: preview_* attach **ไม่ถึง worktree** → เปิด browser pane navigate `http://127.0.0.1:5311/...`
  - **`resize_window(1280,800)` ก่อนวัด** (pane เริ่ม viewport 0)
  - **hash-nav ไม่ reset โมดูล** → เปลี่ยนเพลงใช้ `location.href=...#/song/<id>; location.reload()`
  - **agent browser suppress rAF/observer** → overlay arc (measureTies) อาจไม่ยิงจน trigger `resize_window(...)` หรือ `dispatchEvent(new Event('resize'))` ก่อนวัด (มิฉะนั้น `.tie-overlay path` = 0 หลอกๆ) · v-arc (NoteRow) ยิงตอน mount ปกติ
  - javascript_tool: **อย่า return Promise** (serialize เป็น `{}`) — วัดแบบ synchronous
- **verify งานพิมพ์ = ต้อง PDF จริง** (ไม่ใช่แค่ DOM): headless Edge (§4 · own profile dir + own port ≠9222):
  `msedge --headless=new --no-sandbox --user-data-dir=<temp เฉพาะ> --print-to-pdf=<out> --virtual-time-budget=15000 "http://127.0.0.1:5311/#/song/<id>"`
  → render PNG ด้วย `py -3.14 -c "import fitz; ..."` แล้ว Read · **A4:** เติม `@media print{@page{size:A4}}` ชั่วคราวใน styles.css แล้ว `git checkout` คืน (ห้าม commit)
  - ⚠️ Edge exit 2 บ่อย = profile lock → `taskkill //F //IM msedge.exe` + sleep 3 + user-data-dir ใหม่ + retry loop

## สถาปัตยกรรม (แก้ที่ไฟล์เดิม · reuse engine · ไม่รื้อ)
- **`src/lib/songEdit.js`** = engine mutation v2 (unit-test ครบ). ทุก mutation โน้ต/คำ/คอร์ด อยู่ที่นี่ · ripple ทุกข้อที่ share ทำนอง
- **`src/lib/notation.js`** = parser + geometry บริสุทธิ์:
  - `parseNotes` · `noteBoxKinds`(attack/held/struct) · `syllableSlots`(=จำนวน note-box=จำนวน `.nt`=จำนวนคอลัมน์ grid)
  - `slurSpans(noteStrings)` → `[{open:{si,idx},close:{si,idx},sameSegment}]` จาก `()` ในข้อมูล · `arcPlan(rects)`→'single'|'split'
  - `melismaSpans(segments)` (P2) → derive เส้นเอื้อนจาก blank-run: **คำจริง (มีตัวอักษร/เลข = `carriesWord`) + โน้ต 'attack' ที่ว่างตามหลัง** = melisma · **ไม่กวาด** rest/ext/tie (held) · punctuation ล้วน (`"`.) ไม่ anchor
- **`src/components/NoteRow.vue`** = วาดโน้ต 1 segment + คาน (beam) + arc เอื้อน/ไท **ในห้องเดียวกัน**
- **`src/components/SongSheet.vue`** = แผ่นเพลงกลาง (ใช้ 3 ที่: ฝึกร้อง · พิมพ์ A4 · พรีวิวหน้าแก้ ผ่าน EditorMode/SongViewer) · `measureTies()` วาด overlay arc (tie + slur **ข้ามห้อง** + melisma derived) โดยวัด px จริง
- **`src/components/SongViewer.vue`** = reader-edit surface (keyboard-first inline editor)

## ✅ เสร็จ + verify ผ่าน + commit บน `editor-usability` (baseline handoff เดิม = 7d2d106)
1. **keyboard-first inline editor** (นำทาง 2D · แป้นจริง · แทรกหลัง · ลบ · คอร์ด picker · แถบปุ่มพิเศษ) — Guide อัปเดตแล้ว
2. **`a343571` จัดคำใต้โน้ต (P0):** segment เป็น **CSS subgrid** — คอลัมน์ร่วม โน้ต+คำ (N=`syllableSlots`) · `.seg-grid` + `--cols` ใน `SongSheet.vue` · rule ที่ `styles.css` (`.song-line .segment.seg-grid ...`) · **ไม่แตะ `:root` (สาย 2)** · คำปักใต้โน้ต 0px (เหลือ ≤3.4px เฉพาะโน้ตเดี่ยวมีจุดต่อเสียง = ไม่กำกวม)
3. **`6f7808e` เส้น melisma (P2):** `melismaSpans` derive → วาดด้วย `buildArc`/overlay เดิม · ไม่แตะ DB · +8 unit test
4. **`8c508be` คอร์ดเหนือโน้ต:** pin มุมซ้ายคอร์ด = center โน้ตตัวแรก ด้วย `transform:translateX` วัดใน `measureTies` (ไม่ reflow-loop)
5. **`ac6b4d7` punctuation guard:** พยางค์เครื่องหมายล้วน (`"` `.` `“” `) ไม่ anchor melisma (`carriesWord` = `/[\p{L}\p{N}]/u`) · +4 test · verify เพลง 109
6. **`0c76e45` dedup melisma vs authored slur:** derived span ที่ overlap `()` ใดๆ (ในห้อง+ข้ามห้อง) → ข้าม (author's slur ชนะ) · แก้ double-arc เพลง 16/59 · เคส 1-3 (เอื้อนจริง ไม่มี `()`) ไม่กระทบ (song141: 22 melisma, skip 0)
7. **`60cfda9` slur overshoot bug (งานที่ PM คิดว่ายังไม่ทำ — ทำแล้ว):** เส้น "แห่ง" ปลายซ้ายเลยเลข "3" ข้ามบาร์ → แก้ที่ต้นเหตุ (รายละเอียดล่าง)

## 🎯 slur-geometry bug = ✅ แก้แล้ว (`60cfda9`) — ไว้เผื่อเจอเคสใหม่/blast-radius เพิ่ม
**อาการเดิม:** เส้นเอื้อนเหนือ "แห่ง" (`3 - 3 (3 2) 3` เพลง `5f7fb5d2`) ปลายซ้ายล้นเลข "3" ข้ามเส้นบาร์ (ภาพ `work/ปรับ pl edit ui/slur-overshoot-haeng.png`)

**ต้นเหตุ (สำคัญ — endpoint คำนวณที่ไหน):**
- **slur "ถูก" (ข้ามห้อง)** วาดที่ `SongSheet.vue measureTies()` → `buildArc(xOpen,xClose,...)` โดย **xOpen/xClose = center ของ `.nt .num` (วัด getBoundingClientRect)** → ตรง notehead เป๊ะ
- **slur "ผิด" (ในห้องเดียวกัน)** วาดที่ `NoteRow.vue` `.slur-arc` (CSS `left:8%;width:84%` **ของกล่อง `.note-group`**) · เดิมกล่อง = กว้างเท่าโน้ต แต่ **P0 (seg-grid) ทำกล่องกว้างเท่าคอลัมน์=ขนาดคำ** → เลขอยู่ center ของคอลัมน์กว้าง → 8% ตกที่ขอบคอลัมน์ = เลยเลขไปซ้าย

**แก้แล้ว (`NoteRow.vue` `applyArc` เฉพาะ kind='slur'):** วัด center หัว-ท้ายโน้ตของกลุ่ม (เหมือน `applyBeam`) แล้ว set `el.style.left/width` = center→center → ปลายอยู่บน notehead ทุก layout · cross-segment/overlay/tie/beam ไม่แตะ · jsdom (ไม่มี layout) ผ่าน guard = no-op

**verify blast-radius แล้ว:** 61 เพลงมี within-segment slur · สุ่มวัด 94 arc / 4 เพลง (16·59·**776=80arc**·98 mixed) → gap ปลาย↔center ≤ 0.1px · overlay/cross ครบ · 263 test เขียว

## ⚠️ งานที่ "ยกเลิก" แล้ว (อย่าทำ)
- **remove authored slur `(3 2)` จากเพลง 16 (แก้ DB):** ยกเลิก — ปัญหาจริงคือ positioning bug (แก้ที่ `60cfda9`) ไม่ใช่ over-draw/data · **ไม่ต้องเขียน DB** · (อนึ่ง publishable key = read-only RLS → เขียน DB ต้อง auth team ผ่านแอป · agent ทำไม่ได้)

## merge = งานสุดท้าย · **PM เป็นคน merge** เข้า base `studio-shell-redesign`
- ก่อน merge: pull base ล่าสุด + `npm install` (base มี dep `qrcode-generator`) · conflict watch = `styles.css` (สาย 2 แตะ `:root` · สาย 1 แตะ component region `.song-line .segment...`)
- **ห้าม merge เอง · ห้าม deploy/main** · แจ้ง PM เมื่อพร้อม
- หลักฐานภาพทั้งชุดอยู่ `docs/analysis/evidence/` (song141 P0/P2 · song109 punctuation · song16/59 dedup+slur) + scoping ที่ `docs/analysis/lyric-align-scoping.md`
