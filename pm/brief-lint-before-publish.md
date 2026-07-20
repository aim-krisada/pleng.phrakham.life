# ใบสั่ง (dev) — B093: run lint ก่อนเผยแพร่ → เตือน + ติด label (ไม่บล็อก)

**สั่งโดย:** pm7 · **ฐาน:** `studio-shell-redesign` · **branch: `lint-before-publish`** · **ไฟล์: `EditorMode.vue`(+test)** (ใช้ `notationLint.js` เดิม · ไม่แก้ lint)
**ที่มา:** พี่เปา issue5 — "ก่อนอนุมัติเผยแพร่ ควร run lint ยืนยัน + รายงานถ้าไม่ผ่าน · คนพลาดได้ · เน้นระบบตรวจแม่นยำ" · **P'Aim เคาะ: เตือน + ติด label (ไม่บล็อก)**

## พฤติกรรม (P'Aim)
ตอนกด **เผยแพร่** (`save('publish')` ~1098) [และ/หรือ "ตรวจแล้ว"/verify] →
1. **run notationLint** บนโน้ตของเพลง (ทุกบรรทัด/ทุกห้อง)
2. ถ้าเจอ **ERROR** (เช่น R2 จังหวะไม่ครบ · สัญลักษณ์ผิด):
   - **เตือน** (`saveMsg`): "⚠️ เผยแพร่แล้ว — แต่พบปัญหาโน้ต N จุด (ติดป้ายไว้ให้ตรวจ)"
   - **ติด label:** เพิ่ม flag ลง `review_flags` (เช่น `"lint:R2"` หรือ `"lint-fail"` + จำนวน) → ทีมเห็นว่าเพลงนี้ lint ไม่ผ่าน
   - **ไม่บล็อก** — เผยแพร่ผ่านตามปกติ (label = ไว้เตือน ไม่ห้าม)
3. lint ผ่าน = เผยแพร่เงียบ ไม่มี label lint

## notationLint API (ใช้เดิม · `src/lib/notationLint.js`)
- `lintLine(noteString, { timeSignature })` / `lintBar(...)` → คืน violations + `SEVERITY` (error/warning/hint)
- นับเฉพาะ **error** เป็น "ไม่ผ่าน" (warning/hint = ไม่ติด label หรือแยกระดับ — เอา error พอตาม P'Aim "ถ้าไม่ผ่าน")

## ขอบเขต + display
- แตะ `EditorMode.vue` (publish flow + เขียน `review_flags` เข้า payload เผยแพร่ · save เดิมเขียน row อยู่แล้ว) + test
- **label display:** ใช้ `review_flags` เดิม (team view SongList โชว์ flag อยู่แล้วไหม — ถ้ายังไม่โชว์ = แค่เก็บ flag ก่อน · การโชว์ป้ายใน SongList = ประสาน B087 dev/ follow-up · **flag PM ถ้าต้องแตะ SongList**) · อย่าแตะ SongList เอง (สาย B087 ถืออยู่)
- ไม่แตะ `notationLint.js` (ใช้เฉยๆ) · ไม่แตะ model/DB schema (review_flags มีอยู่แล้ว)

## ตรวจเอง + report
- unit test: เพลงจังหวะไม่ครบ → publish → review_flags มี lint flag + saveMsg เตือน · เพลงสะอาด → ไม่มี flag · **ไม่บล็อก** (เผยแพร่สำเร็จทั้งคู่)
- Browser MCP (ถ้าล็อกอินได้) หรือ unit · vitest+build เขียว · แตะ EditorMode.vue เดียว · เช็ก branch ก่อน commit
- เสร็จ: `docs/reports/lint-before-publish.md` + board §📥 inbox + ping PM=pm7 · ⛔ ไม่ merge/deploy
