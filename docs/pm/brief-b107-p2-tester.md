# Brief — tester re-gate: B107 P2 auto-arranger (เปียโน · step 0–8)

**สาย:** tester (QA gate) · **branch ที่ตรวจ:** `b107-p2-arranger` (HEAD `89be540` · fork จาก base `66194b7`)
**dev worktree:** `C:/gl/krisada/pleng.phrakham.life/.claude/worktrees/pensive-joliot-b70bc4` · **dev server รันอยู่** `http://192.168.1.173:5342/` (port 5342)
**อ่านก่อน:** `docs/reports/b107-p2-arranger.md` (dev report) · `docs/ds/instrument-arranger-p2.md` §7 (Acceptance Criteria = เกณฑ์ตรวจ)

## บริบท (สำคัญ)
งานนี้คือ **P2 auto-arranger** = ใส่ `arrange()` แปลงโน้ตบนแผ่น → เปียโน "เหมือนคนบรรเลง" (humanize + voicing + patterns + dynamics + mix). **P'Aim ฟัง checkpoint humanize ผ่านแล้ว** → นี่คือรอบ final ก่อน merge/deploy. ใช้เปียโน Grand เดิม (P1) · ยังไม่แตะ sample เครื่องเพิ่ม (step 9 รอบหลัง).

## ⭐ AUDIO GATE — วัด output จริง ไม่ใช่ "fire ไม่ error" (บทเรียน B107 เปียโนเงียบ)
1. **unit/invariant (headless):** `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` → ควรเขียวครบ (~504) · `npm run build` ผ่าน · ยืนยัน invariant tests ของ arranger รันจริง (velocity-in-layer ทุก preset · ลูกเล่นปิด=โน้ตพิมพ์/timeShift0/0emb · voicing pitch-class คงเดิม · walking approach≤2 · embellish chord-tone only · rubato Σ timeShift≈0)
2. **real audio (OfflineAudioContext · บน browser จริง §7c):** render เพลงจริงต่อ **ทุก preset (บรรเลง/สงบ/ตรงโน้ต)** แล้ววัด:
   - peak > 0 (ไม่เงียบ) · peak รวม ≤ ~0.9 (ไม่ clip) · melody peak > chord peak (ทำนองนำ)
   - **humanize:** OFF = onset ตรงกริด (~0ms) · ON = มี spread (dev วัดได้ 9.69ms) — พิสูจน์ "หายแข็ง" วัดได้
   - **reverb:** มี tail หลังโน้ตจบ เมื่อ reverb≠none (dev: 0.0069 vs dry 0) · **pan:** มี stereo spread
   - ทุก velocity ที่ fire ∈ layer ที่โหลด (0 โน้ตเงียบ)
3. **ตรงโน้ต (ปิดลูกเล่น) = exact grid:** preset "ตรงโน้ต" → melody = โน้ตพิมพ์เป๊ะ · timeShift 0 ทุกตัว · 0 embellish · gain คงที่

## UI + regression (browser จริง)
- **เมนู "สไตล์การเล่น"** (หน้าดู): บรรเลง(default) / สงบ / ตรงโน้ต · จำค่า localStorage · **สลับกลางเล่นได้** · **หน้าแก้ไข(พี่เปา) = ตรงโน้ตเสมอ** (ไม่โดน humanize)
- **regression ไม่พัง:** เล่น/หยุด/resume/สลับโหมด(ทำนอง/คอร์ด/รวม)/ทรานสโพสกลางเล่น/loop
- ⚠️ **ต้องล็อกอินทีมก่อน** ถึงจะเห็นเพลง (GATE ทำให้ public = 0 เพลง · worktree ต่อ Supabase เดียวกัน) — ถ้าไม่มี credential ทีม ping PM
- มือถือจริง: เมนู/เล่นได้ ไม่กระตุก (schedule ล่วงหน้า)

## วิธีตรวจ (worktree แยก · กัน branch checkout ชน)
branch `b107-p2-arranger` ถูก check out ใน dev worktree อยู่แล้ว → tester อย่า check out ซ้ำ · สร้าง worktree ของตัวเองแบบ detached: `git worktree add <path> --detach b107-p2-arranger` แล้ว `npm install` + `npx vite . --host --port 5344 --strictPort` (verify จาก worktree ตัวเอง · ดู memory `pleng-preview-from-worktree`) · หรือทดสอบ UI บน dev server 5342 ที่รันอยู่

## รายงานกลับ (session-agnostic)
(1) เขียน `docs/reports/tester-b107-p2-arranger.md` (PASS/FAIL ต่อ AC + ตัวเลข audio ที่วัดได้จริง) · (2) เพิ่ม 1 บรรทัด `docs/pm/board.md` §📥 inbox · (3) ping "PM ปัจจุบัน" (pm21)
**PASS = ทุก AC + audio วัดได้จริง** → PM ให้ P'Aim ฟัง final → merge+deploy · **FAIL = ระบุจุด + หลักฐาน** → PM ยิง dev แก้
