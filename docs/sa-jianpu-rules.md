# sa-jianpu-rules — งาน SA สายกฎโน้ต (jianpu) ทำเพลง (ps3) — 2026-07-08

**งานจริงของ session นี้ = "กฎทำเพลง"** — กฎตรวจโน้ต (lint) + ความสามารถของโน้ต (notation) ของเครื่องมือทำเพลง

มี SA **2 session** ทำขนาน (ปกติ 1) → แบ่งตาม **"ธีม/พื้นที่งาน"** ไม่ให้ชนไฟล์:
- **sa-jianpu-rules** (session นี้ · "กฎทำเพลง") = กฎ + ระบบโน้ต (algorithm)
- **ps3sa** = shell / editor / IA / UI-UX redesign

## ✅ สายกฎทำเพลง — ทำเสร็จ (approved · รอ build ps4 · ยังไม่ dev)
- **B026** กฎ lint editor (7 กฎ) → US/DS `ps3-editor-rules` · spike `src/lib/notationLint.js` บน main (เทสต์ 21)
- **B027** โน้ตจุดคู่ `5..` → US/DS `ps3-double-dot`

## 🔵 สายกฎทำเพลง — pool ต่อไป (session นี้ทำเองได้ ไม่ต้อง P'Aim เคาะ)
- เติม R4–R7 ในเครื่องยนต์ lint + ต่อเข้า editor (ลงมือตอน ps4)
- ความสามารถโน้ตเพิ่ม **เมื่อเจอเพลงจริงต้องใช้** (โน้ต 32 · grace · ฯลฯ — เหตุผลที่พักไว้อยู่ใน B027)
- กฎ/เคสใหม่ที่เจอจากการคีย์เพลงจริง (พี่เปา ฯลฯ)

## 🟣 สาย UI/editor = ps3sa (ไม่ใช่ของ session นี้ — ลงไว้กันชน/อ้างอิง)
### เล็ก/ชัด (เขียน US/DS ได้เลย)
B023 footer ติดขอบล่าง · B011 "จบเพลง" เฉพาะห้องสุดท้าย · B007 ตัดเมนูซ้ำ · B010 legend กาง/ยุบ
### ต้อง P'Aim เคาะดีไซน์
B009 IA เมนู · B012 controls โครงเพลง · B005 แก้เนื้อ 2 ที่ · B024 control bar · B021/B022/B025 dock

> ⚠️ เดิม session นี้เคยเสนอรับ "กลุ่ม ก. (ตัวเล็ก)" — แต่พองานเป็นสาย "กฎทำเพลง" ตัวเล็กพวกนี้เป็น **UI = ธีม ps3sa** เลยยกให้ ps3sa · ถ้าจะให้ sa-jianpu-rules ช่วยแบ่งเบา ค่อยเคลมทีหลัง

## ✅ Handshake ยืนยันขอบเขต (8 ก.ค. · กับ ps3sa)
- **sa-jianpu-rules เป็นเจ้าของ:** `us|ds/ps3-editor-rules` · `us|ds/ps3-double-dot` · `src/lib/notationLint.js` · ไฟล์นี้ · แถว **B026/B027** ใน backlog · บรรทัด B026/B027 ใน status
- **ps3sa เป็นเจ้าของ:** `design/ps3-dock-prototype.html` · `us|ds/ps3-dock` · `us|ds/ps3-{shell,editor,viewer,highlight}` · backlog แถว B003/B005/B006/B007/B008/B009/B010/B011/B012/B016/B017/B021/B022/B023/B024/B025 · status บรรทัด UI/design
- **verified ไม่ทับกัน** (footprint sa-jianpu-rules = แค่ B026/B027 + ไฟล์ตัวเอง) · `ps3-editor-rules.md` ≠ `ps3-editor.md` (คนละไฟล์)
- ⚠️ **heads-up ตอน build ps4 (ยังไม่ตอนนี้):** B027 (จุดคู่) จะแตะโค้ด **shared**: `notation.js` · `midi.js` · `NoteRow.vue` · `Guide.vue` — ทับกับงาน editor ของ ps3sa ได้ → ค่อยจัดลำดับ/worktree ตอน ps4 (เฟส design นี้ยังไม่ชน)

## กติกากันชน (สำคัญ)
1. แต่ละ session แก้เฉพาะ **ไฟล์ US/DS ของ item ที่ตัวเองรับ** — คนละ item = คนละไฟล์ = ไม่ชน
2. ไฟล์ shared (`backlog.md` · `status.md` · ไฟล์นี้) → **targeted edit เฉพาะแถว/บรรทัดของตัวเอง** (ห้าม rewrite ทั้งไฟล์) · เช็ก git ก่อนแก้ · `git add <file>` เจาะจง (ไม่ใช่ `-A`) · commit บ่อย
3. ฐาน = `studio-shell-redesign` · **ยังไม่ dev / ไม่ merge main** · เช็ก `git branch --show-current` ก่อน commit
