# Brief — ดาวน์โหลดเสียง MP3 ของทำนอง (client-side) · B072

**สั่งโดย:** pm4 · **ฐาน:** `studio-shell-redesign` (HEAD `5f6dc82`) · **branch ใหม่:** `git switch -c mp3-download studio-shell-redesign`
**backlog:** B072 · **เป้าหมาย (P'Aim 10 ก.ค.):** ผู้ใช้กด "ดาวน์โหลดเสียง" → เบราว์เซอร์สร้างไฟล์ **MP3 ของทำนอง** ให้โหลด (ไม่ต้องมี server · offline ได้)

## ทำไมทำได้เร็ว (มีของครึ่งทางแล้ว)
`src/lib/midi.js` มี `songToNotes(content)` อยู่แล้ว = แปลงเพลงเป็น `[{ midi, beats, ... }]` (เลข MIDI + ความยาวจังหวะ · คลุม repeat/volta/tie/accidental) และมีตัวเล่นเสียงจริง (Web Audio oscillator) ที่ใช้ตอนกด "ฟัง". **ของยาก (โน้ต→เสียง) เสร็จแล้ว** — งานนี้แค่ "อัดเสียงลงไฟล์"

## งาน
1. **เรนเดอร์ทำนองเป็นเสียงดิบ (offline):**
   - ใช้ `OfflineAudioContext` เรนเดอร์ทำนองทั้งเพลงตาม `songToNotes()` + คีย์/BPM ปัจจุบัน — **reuse ตัวสังเคราะห์เสียง/การ schedule เดิมของ `midi.js`** (แยก logic การสร้าง oscillator ออกมาให้รับ context ได้ทั้ง realtime + offline · อย่าเขียน synth ใหม่ให้เสียงต่างจากปุ่มฟัง)
   - ได้ `AudioBuffer` → ดึง PCM (mono พอ · 44.1k หรือ 22.05k)
2. **เข้ารหัส MP3:**
   - ใช้ `lamejs` (MP3 encoder เป็น JS ล้วน · แนะ fork ที่ maintain เช่น `@breezystack/lamejs`) — `npm install` (แก้ package.json/lock = ok · สายอื่นไม่แตะ)
   - PCM Int16 mono → mp3 frames → รวมเป็น Blob (`audio/mpeg`) · bitrate ~96-128kbps
3. **ดาวน์โหลด:**
   - ปุ่ม/เมนู "⬇️ ดาวน์โหลดเสียง (MP3)" ใน **`DownloadTool.vue`** (ข้างรายการ "ดาวน์โหลดข้อมูลเพลง (JSON)" เดิม — โครงเมนูมีอยู่แล้ว) · ตั้งชื่อไฟล์ = basename เดียวกับ JSON (ชื่อเพลง) + `.mp3`
   - ระหว่างเข้ารหัส (ไม่กี่วินาที) → แสดงสถานะ "กำลังสร้างไฟล์…" กันผู้ใช้กดซ้ำ · เสร็จ/พลาด → คืนปุ่มปกติ + แจ้ง error ถ้ามี

## หลักการ / ขอบเขต
- **MP3 อย่างเดียวรอบนี้** (KISS) · ถ้าแยก `songToMidiBlob()` ออกมาด้วยได้ฟรีก็โอเค แต่ **ไม่ต้องทำ UI MIDI** (P'Aim เอา MP3 ก่อน)
- ทำนองเปล่า (ไม่มีเนื้อ · ไม่ต้องใส่คอร์ดเป็นเสียงรอบนี้) · เสียง = โทนเดียวกับปุ่มฟัง
- ทำงานได้ทั้ง desktop + มือถือ (Blob download ใช้ได้ทุกที่) · verify iOS/Android ถ้าทำได้

## รั้ว (กันชน 3 สายที่รันอยู่)
- **แตะได้:** `src/lib/midi.js` (เพิ่ม export **append-only** · แยก synth ให้ offline ได้ · อย่าเปลี่ยนพฤติกรรม `songToNotes`/playback เดิม) · `src/components/DownloadTool.vue` (เพิ่มรายการเมนู) · `package.json`/lock (เพิ่ม lamejs) · ไฟล์ helper ใหม่ถ้าต้อง (`src/lib/audioExport.js`)
- **⛔ ห้ามแตะ:** `StudioDock.vue`/`SingTransport.vue`/`SongViewer.vue` (สาย dockkey-dev) · `EditorMode.vue`/`SongSheet.vue` (สาย fix-editor-preview) · `ShellBar.vue`/`styles.css`/`App.vue` (สาย fix-favicon-footer) · `NoteRow.vue`
- **หมายเหตุ dock:** ตอนนี้ปุ่มดาวน์โหลดในหน้าฝึกร้องอยู่ใน dock (B045) — **รอบนี้เสียบ MP3 ที่ `DownloadTool.vue` พอ** · เพิ่มลง dock = phase หลัง (ผ่าน descriptor ตอน DockKey เสร็จ) อย่าไปแตะ dock ตอนนี้

## DoD + รายงาน
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` ผ่าน (ฐาน 268 · notationLint fail=ของเดิม) + `npm run build` ผ่าน (เช็ก bundle size เพิ่มจาก lamejs รับได้)
- unit: test ฟังก์ชัน export (โครงไฟล์ MP3 ถูก · ความยาว ≈ จำนวนจังหวะ×BPM) เท่าที่ทำได้ headless
- dev server **`--host`** + **Network URL** ในรายงาน · **verify จริง: โหลด MP3 เพลงจริง → เปิดเล่นได้ + ได้ยินทำนองตรง** (แนบขนาดไฟล์/ความยาวในรายงาน)
- รายงานกลับ (session-agnostic): (1) `docs/reports/mp3-download.md` (2) บรรทัด board §📥 inbox (3) ping PM ปัจจุบัน = **`pm4`** · **⛔ ห้าม merge/deploy เอง**
