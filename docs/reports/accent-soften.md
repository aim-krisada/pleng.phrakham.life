# Report — accent-soften → CLOSED as "revert to known-good + hide accent toggle"

**สายงาน:** `accent-soften` · **branch:** `claude/zealous-chatelet-7cc43a` (fork `studio-shell-redesign` @ `c4e6b6b`) · **1 commit:** `20d36ca`
**PM:** pm26 · **สถานะ:** ✅ เสร็จ · test เขียว · build ผ่าน · **รอ P'Aim ฟัง live ยืนยัน + PM gate/merge** · ห้าม merge/deploy เอง

## เรื่องราว (P'Aim iterate ตรง 16 ก.ค.)
โจทย์เดิม = ทำ accent เป็นสไลเดอร์ + default เบา (P'Aim ว่า live รอบ 27 "กระแทกแรงไป").
ระหว่าง iterate เจอ 2 เรื่อง:
1. ลด accent → mix แบน → **ฟังออกออร์แกน** (P'Aim สังเกตเอง)
2. P'Aim เข้าใจว่า "เน้นจังหวะแรก" = ระดับเสียงดัง/ค่อย (ที่จริงคือความต่างน้ำหนักบีต)

**คำตัดสินสุดท้าย (P'Aim):** "เสียงเดิมดีอยู่แล้ว — เอากลับไปแบบเดิม ไม่ต้องตั้งเยอะ · ไม่ต้องให้ผู้ใช้ตั้งทั้งระดับเสียงบรรเลงและเน้นจังหวะแรก" + (ถาม) "สวิตช์ accent เดิม → **เอาออกจากเมนูไปเลย**"

## สิ่งที่ทำจริง (minimal · ตรวจแล้ว)
1. **`git reset --hard c4e6b6b`** → ทุกไฟล์กลับ base เป๊ะ (byte-identical กับเวอร์ชันที่รู้ว่าดี) — ทิ้งงานทดลอง accent-slider / volume-slider / master-gain ทั้งหมด (กู้จาก reflog ได้ถ้าต้องการ)
2. **ลบ entry `accent` ออกจาก TECHNIQUES** (`techniques.js`) — "เน้นจังหวะแรก" ไม่โผล่ในเมนู "ปรับละเอียด" อีก (เมนู render จาก `readTechniques()` แบบ generic → ลบ entry = ซ่อนอัตโนมัติ ไม่ต้องแตะ .vue)
3. อัปเดต test 2 เคสให้ตรงพฤติกรรมใหม่ (accent override ถูกเมิน · ไม่มี row accent)

**diff เทียบ base = เฉพาะ `techniques.js` + `techniques.test.js` เท่านั้น** (ตรวจ `git diff --stat c4e6b6b` แล้ว · ไฟล์เสียง/preset/index อื่นไม่แตะ)

## กลไก (ทำไมปลอดภัย)
- accent ยัง **เปิดเต็มเบื้องหลัง** ผ่าน preset (`piano-arrangement` `dynamics.accent: true` · `piano-calm` `false`) + `index.js` `if (dyn.accent !== false) metricAccent(events, bpb)` — เหมือน base เป๊ะ → เปียโนยังมีลูกคลื่นน้ำหนักแบบคนเล่น ไม่แบนเป็นออร์แกน
- ผู้ใช้ปรับ accent ไม่ได้แล้ว (ไม่มี key ใน TECHNIQUE_KEYS → override ที่เคยเซฟถูกเมิน) — ตรงตามที่ P'Aim ต้องการ
- ไม่มีสไลเดอร์ระดับเสียง · ไม่แตะ playback path

## verify
- ✅ `npm test` **673/673 เขียว** (arranger 65 · techniques 7) · lock: accent override→ยังเปิด · ไม่มี row accent
  - _หมายเหตุ:_ `notationLint.test.mjs` "failed suite" = สคริปต์เรียก `process.exit(0)` (quirk เดิมของ harness) ไม่เกี่ยวงานนี้
- ✅ `vite build` ผ่าน
- ✅ curl ยืนยันเสิร์ฟจาก worktree: ไม่มี entry accent · ไม่มี volume slider · preset `accent: true` ยังอยู่
- ⚠️ เสียงจริง = ตรงกับ base ที่ P'Aim เคยฟังว่าดี (ไม่มีการเปลี่ยนเสียง) → ขอ P'Aim ยืนยันสั้น ๆ ว่าเมนูสะอาดแล้ว

## Network (ให้ P'Aim ยืนยัน)
[http://192.168.1.124:5320/](http://192.168.1.124:5320/) → เมนู "ปรับละเอียด" ไม่มี "เน้นจังหวะแรก" แล้ว · เสียงเหมือนเดิม

## ไม่ชน
แตะแค่ `techniques.js` + test · **ไม่แตะ styles/icons/Guide/ShellBar** (สาย cleanup-round ถือ)
