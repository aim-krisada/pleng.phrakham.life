# รายงาน — mp3-dock-wire (B072 phase 2 · เสียบ MP3 เข้า dock ฝึกร้อง)

**สาย/branch:** `mp3-dock-wire` (ฐาน `studio-shell-redesign` `6e454ad` · มี audioExport lib merged แล้ว) · worktree `../pleng-mp3-dock` · พอร์ต 5374
**สั่งโดย:** pm4 (fast-path — P'Aim: เสียบ dock ปัจจุบันเลย ไม่รอ DockKey · ขึ้น live แล้วปรับทีหลัง)
**สถานะ:** เสร็จ — verify จริงในหน้าฝึกร้องแล้ว · รอ PM ตรวจ DoD + merge · ⛔ ยังไม่ merge/deploy

## ทำอะไร
เพิ่มรายการ **"ดาวน์โหลดเสียง (MP3)"** ในเมนู ⚙ ตั้งค่า ของ dock หน้าฝึกร้อง (ข้าง "ดาวน์โหลด (JSON)" เดิม) → กดแล้วสร้าง MP3 ของทำนองในเบราว์เซอร์ (audioExport lib ที่ merged เข้าฐานแล้ว) + โชว์สถานะ %/ETA + โหลดไฟล์ = ชื่อเพลง.mp3

**คีย์/ความเร็ว = ค่าที่ผู้ใช้ตั้งในหน้าฝึกร้องตอนนั้น** (`tempo` + `displayKey`→transpose) → ไฟล์ตรงกับที่กด "ฟัง" เป๊ะ (ไม่ใช่ค่า default อย่างเดียว)

## ไฟล์ที่แตะ (อยู่ในรั้ว)
- `src/components/SongViewer.vue` — **ไฟล์เดียว** · เพิ่ม `downloadMp3()` + state (`mp3Stage`/`mp3Pct`/`mp3Eta`/`mp3Est`/`mp3Err`) + computed label + รายการ dock `downloadMp3` ใน `settingDescs` · `import` audioExport แบบ **dynamic** (code-split lamejs)
- **ไม่แตะ:** StudioDock/SingTransport/DockKey/EditorMode/styles.css/ShellBar/NoteRow (ตามรั้ว) · ไม่แก้ audioExport lib (ใช้ตัว merged)

## progress feedback — ข้อจำกัดจากรั้ว
`SingTransport.vue` เป็นรั้ว (ห้ามแตะ) และเป็นตัว render dock item → **ใส่ `<progress>` bar กราฟิกในเมนูไม่ได้**. เลยโชว์สถานะผ่าน **ข้อความใน label ของ item** (reactive) ซึ่ง re-emit dock ทุกครั้งที่ % เปลี่ยน:
- ว่าง: "ดาวน์โหลดเสียง (MP3)"
- เตรียม/เรนเดอร์: "กำลังเตรียมเสียง · ~2.5 MB…" (ประมาณขนาดล่วงหน้า)
- บีบอัด: "กำลังสร้างเสียง · N% · เหลือ ~X วิ" (near-real-time)
- พลาด: "เสียง MP3 — ลองใหม่"

ครบ **staged + estimate + %/ETA** ตาม intent · ต่างจาก DownloadTool.vue แค่ "ข้อความแทนแถบกราฟิก" เพราะรั้ว. ถ้าอยากได้แถบกราฟิกใน 3 โหมด → ทำตอน DockKey (แก้ตัว render ได้)

## DoD
- **vitest** (`--exclude '**/.claude/**' --exclude '**/node_modules/**'`) → **283 passed** (= ฐาน · notationLint quirk เดิม 1 suite) · ไม่มีเทสต์ใหม่ (การเสียบ dock เป็น wiring ใน SFC · logic MP3 เทสต์แล้วในสาย audioExport เดิม)
- **build** ผ่าน · **audioExport code-split เป็น chunk แยก 171KB (gzip 59.6)** อยู่นอก bundle หลัก (496KB) — lamejs โหลดเฉพาะตอนกดโหลดเสียง
- **dev `--host`** · Network URL = **http://10.215.141.98:5374/**

### verify จริง (หน้าฝึกร้อง · เพลงจริงจาก Supabase)
- รายการ MP3 โผล่ในเมนู ⚙ ตั้งค่า ถัดจาก JSON: `display · chord · key · tempo · JSON · **MP3** · print · alpha` ✅
- กดปุ่มในเมนู → label วิ่งสด: "กำลังเตรียมเสียง" → "กำลังสร้างเสียง · 98% · เหลือ ~0 วิ" → กลับเป็น "ดาวน์โหลดเสียง (MP3)" = ไฟล์เด้งโหลด ✅
- **ไฟล์เล่นได้จริง** (round-trip เพลง "พระเจ้าเป็นความรัก"): `songToMp3Blob` → **1,284,806 ไบต์ (1.23 MB · = ประมาณการ 1.22MB)** · `audio/mpeg` · decode กลับ = 80.3 วิ (ต้นทาง 80.25 · drift 0.05) · **playable ✅**

**หมายเหตุ:** เครื่องรัน dev server หลายตัวพร้อมกัน (parallel sessions) → CPU แน่น → encode ช้ากว่าปกติ (เพลง 80 วิ ใช้ ~11 วิ) · บนเครื่องปกติเร็วกว่านี้มาก · ETA เป็นค่าประมาณ

## รั้ว/ชนกัน
- **dockkey-dev (HOLD) แก้ SongViewer เหมือนกัน** → ตอน DockKey merge ทีหลัง PM carry MP3 item เข้า descriptor เอง (pm4 รับทราบแล้ว)
- ไฟล์ dev ชั่วคราวไม่มี (verify ผ่าน preview MCP ตรง ๆ)

## Next
- PM ตรวจ DoD → merge `mp3-dock-wire` → `studio-shell-redesign` → ขึ้น live (P'Aim: ship ก่อน ปรับทีหลัง)
- ถ้าต้องการแถบ progress กราฟิกในเมนู → รอ DockKey (แก้ตัว render dock ได้ตอนนั้น)
