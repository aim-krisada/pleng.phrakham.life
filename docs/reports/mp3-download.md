# รายงาน — mp3-download (B072 · ดาวน์โหลดเสียง MP3 ของทำนอง)

**สาย/branch:** `mp3-download` (ฐาน `studio-shell-redesign`) · worktree `../pleng-mp3` · พอร์ต 5372
**สถานะ:** เสร็จ — pipeline พิสูจน์แล้วในเบราว์เซอร์จริง · **รอ PM ตรวจ DoD + P'Aim ฟังจริง** · ⛔ ยังไม่ merge/deploy

## ทำอะไรไปบ้าง
ผู้ใช้กด "⬇️ ดาวน์โหลดเสียง (MP3)" → เบราว์เซอร์สร้างไฟล์ MP3 ของทำนองเองทั้งหมด (ไม่มี server · offline ได้) แล้วโหลดลงเครื่อง ชื่อไฟล์ = ชื่อเดียวกับ JSON/PDF + `.mp3`

**ของยาก (โน้ต→เสียง) มีอยู่แล้ว** ใน `midi.js` — งานนี้แค่ "อัดลงไฟล์" โดย **ใช้ตัวสังเคราะห์เสียงตัวเดียวกับปุ่มฟัง** เพื่อให้เสียงในไฟล์เหมือนที่ได้ยินตอนเล่น 100%

## วิธีทำ (ตาม 3 ข้อในใบสั่ง)
1. **แยก synth ให้ใช้ได้ทั้ง realtime + offline** — ดึงบล็อกสร้าง oscillator + envelope ออกจาก `playSong` มาเป็น `scheduleNote(context, destination, midi, startT, soundDur, detuneCents)` (export ใหม่ใน `midi.js`) แล้วให้ **ทั้ง** `playSong` (ปุ่มฟัง) **และ** ตัวเรนเดอร์ MP3 เรียกตัวเดียวกัน → พฤติกรรมปุ่มฟังเดิมไม่เปลี่ยน (เทสต์เดิมผ่านครบ), เสียงไฟล์ = เสียงฟัง โดยนิยาม
2. **เรนเดอร์ทำนองแบบ offline** — `renderSongToBuffer()` ใน `src/lib/audioExport.js` ใหม่: `OfflineAudioContext` mono 44.1k, ไล่โน้ตจาก `buildPlayNotes(playableContent(content))` (แปลง v2 stanzas → v1 lines ด้วย `resolveContent` เหมือน SongViewer · คีย์ = คีย์เพลง · BPM = `content.bpm||92` ตรงกับค่า default ตอนกดฟัง) → `AudioBuffer` → PCM
3. **เข้ารหัส MP3** — `@breezystack/lamejs` (fork ที่ maintain), `floatToInt16` → `encodePcmToMp3` (มono 128 kbps, บล็อก 1152) → `Blob('audio/mpeg')` → download; ปุ่มใน `DownloadTool.vue` ข้างรายการ JSON เดิม, ระหว่างเข้ารหัสโชว์ "⏳ กำลังสร้างไฟล์เสียง…" + disable กันกดซ้ำ + โชว์ error ภาษาคนถ้าพลาด

## ไฟล์ที่แตะ (อยู่ในรั้ว)
- `src/lib/midi.js` — **append-only:** เพิ่ม `scheduleNote()` + ให้ `playSong` เรียกใช้ (behavior-preserving) · ไม่แตะ `songToNotes`/logic playback
- `src/lib/audioExport.js` — **ไฟล์ใหม่** (render + encode pipeline, แยกส่วน pure ให้เทสต์ headless ได้)
- `src/lib/audioExport.test.js` — **ไฟล์ใหม่** (6 เทสต์)
- `src/components/DownloadTool.vue` — เพิ่มรายการเมนู MP3 + busy/error state (dynamic `import()` ให้ lamejs code-split ออกจาก bundle หลัก)
- `package.json` / lock — เพิ่ม `@breezystack/lamejs`
- (นอกรั้ว repo — tooling เท่านั้น) `.claude/launch.json` ของ session หลัก +config `mp3` (พอร์ต 5372) เพื่อ preview เสิร์ฟ worktree · `verify-mp3.html` = harness ตรวจ (จะลบก่อน merge)

**ไม่แตะ:** StudioDock/SingTransport/SongViewer · EditorMode/SongSheet · ShellBar/styles.css/App.vue · NoteRow · dock

## หมายเหตุสำคัญ — DownloadTool ยังไม่ถูก mount บนฐาน
บน `studio-shell-redesign` ตอนนี้ `DownloadTool.vue` **ไม่ได้ถูก import/mount ที่ไหนเลย** (ปุ่มดาวน์โหลดจริงย้ายเข้า dock ไปแล้ว B045 · dock อยู่ในรั้วห้ามแตะ) — ตรงกับใบสั่ง: รอบนี้ให้เสียบ MP3 ที่ `DownloadTool.vue` เป็น "จุดต่อ" ไว้ก่อน, การเอาเข้า dock/UI จริง = phase หลังผ่าน descriptor ตอน DockKey เสร็จ. ผลคือ **bundle ที่ ship ตอนนี้ยังไม่มี lamejs เลย** (ทั้ง dynamic-import + component ยัง orphan → tree-shaken ออกหมด · ไม่กระทบขนาด bundle ปัจจุบัน). โค้ด + เทสต์ + pipeline พร้อมเสียบทันทีเมื่อ DockKey wiring มาถึง.

## ผลทดสอบ (DoD)
- **vitest:** `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` → **274 tests passed** (ฐาน 268 + ใหม่ 6) · suite `notationLint.test.mjs` โชว์ "1 failed suite" แต่เป็น quirk เดิม (`process.exit(0)` · จริง ๆ 72/72 ผ่าน) · เทสต์ใหม่ 6 ตัวรันใน env `node` เพราะต้องใช้ `Blob.arrayBuffer` ที่ jsdom ไม่มี
- **build:** `npm run build` ผ่าน
- **dev `--host`:** Network URL = **http://10.215.141.98:5372/verify-mp3.html**

### verify จริงในเบราว์เซอร์ (เพลง 100 · v2 · คีย์ G)
รัน pipeline จริงบน Chromium (OfflineAudioContext + lamejs) แล้ววัดผลแบบภววิสัย:

| เมตริก | ค่า |
|---|---|
| โน้ต | 214 events (201 มีเสียง · 13 rest) |
| เรนเดอร์ | 166.23 วินาที · 7,330,667 เฟรม @ 44.1k (ใช้เวลา ~2.5 วิ) |
| **pitch-check (พิสูจน์ทำนองตรง)** | **201/201 โน้ตตรง MIDI ที่คาด = 100%** (autocorrelation จับความถี่กลางโน้ตเทียบ `buildPlayNotes`) |
| ไฟล์ MP3 | **2,660,310 ไบต์ (2.54 MB)** · `audio/mpeg` · 128 kbps mono |
| decode กลับ (พิสูจน์เล่นได้จริง) | `decodeAudioData` สำเร็จ → 166.27 วิ · เล่นได้ (PLAYABLE) |
| duration drift เรนเดอร์↔mp3 | 0.041 วิ |
| **VERDICT** | **PASS ✅** |

> "ทำนองตรง" พิสูจน์ด้วยการถอดความถี่จริงจากไฟล์เสียงที่เรนเดอร์ กลับเป็นเลข MIDI แล้วเทียบกับโน้ตที่ระบบเล่น — 100% ตรง (ไม่ใช่แค่เดาจากภาพ) · "เล่นได้จริง" พิสูจน์ด้วย `decodeAudioData` ถอด MP3 กลับสำเร็จ

### รอ P'Aim (ear-check ตัวจริง)
เปิด **http://10.215.141.98:5372/verify-mp3.html** บนเครื่อง/มือถือใน LAN เดียวกัน → กดเล่นใน `<audio>` player (หรือปุ่ม ⬇️ โหลดไฟล์) เพื่อฟังว่าทำนองไพเราะ/ตรงหูจริง

## รอบ 2 — progress feedback (P'Aim สั่งหลังทดลองผ่าน)
P'Aim: encode นาน ถ้าไม่มี feedback คนนึกว่าพัง → กด refresh. ขอ near-real-time + ประมาณเวลา/ขนาด + staged. **ทำครบแล้ว** (de-facto: determinate progress + ETA สำหรับงาน >10 วิ — NN/g):
- `estimateMp3(content)` — คำนวณ **ก่อน** render (แค่เลขโน้ต): ความยาวเป๊ะ + ขนาดไฟล์จาก bitrate → โชว์ "≈ 2m46s · ~2.5 MB" ก่อนเริ่ม
- `encodePcmToMp3` → async, รายงาน 0→1 + **yield main thread ทุก N เฟรม** (`setTimeout 0`) → progress bar repaint จริง (ไม่งั้น loop กิน thread จนบาร์ค้าง = กับดัก "ดูเหมือนแฮงค์")
- `songToMp3Blob({onProgress})` → staged `{stage:'render'|'encode'|'done', fraction}`
- `DownloadTool.vue` → ป้ายตามขั้น + `<progress>` bar + ETA สด + บรรทัดประมาณการ
- verify จริง เพลง 100: stages `render→encode→done` ✅ · **ประมาณขนาดพลาดแค่ 0.025%** (est 2,659,652 vs จริง 2,660,310 ไบต์) · ETA ยิงสด · pitch ยัง 201/201
- เทสต์ +2 (estimate math · progress 0→1 monotonic) → **รวม 276 ผ่าน** · build ผ่าน bundle เท่าเดิม (lamejs ยัง tree-shaken จนกว่าจะเสียบ dock)

## ข้อเสนอตำแหน่ง UI (ถึง PM)
P'Aim ขอให้เสนอ PM จับ MP3 ใส่ที่เหมาะสมอิง de-facto → `docs/pm/proposal-mp3-placement.md`: **รวมเข้าเมนูดาวน์โหลด/ส่งออกเดียวกับ PDF+JSON** (export ทุกฟอร์แมตอยู่ที่เดียว) · หลัง DockKey = เสียบ dock ผ่าน descriptor (สาย `sa-dockkey-print-edit`) · Web Worker = ตัวเลือกเสริม ยังไม่จำเป็น. **รอ PM เคาะ**

## Next (phase หลัง · ไม่อยู่ในรอบนี้)
- เสียบ MP3 เข้า dock ผ่าน descriptor ตอน DockKey เสร็จ (ปัจจุบันปุ่มอยู่ใน `DownloadTool.vue` ที่ยัง orphan)
- ถ้าจะทำ MIDI download ด้วย → มี `songToNotes` อยู่แล้ว, เพิ่ม `songToMidiBlob` ได้ทีหลัง (ใบสั่งบอกรอบนี้ MP3 พอ)
- ลบ `verify-mp3.html` ก่อน merge
