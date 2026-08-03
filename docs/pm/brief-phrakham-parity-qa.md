# BRIEF (QA gate) — phrakham-parity B-1,3,4,5,6

**สาย:** Tester · **จ่ายโดย:** pm22 · 13 ก.ค. 2026 · **branch under test:** `phrakham-parity` (`b70e53c` · fork ฐาน `studio-shell-redesign`)
**spec/AC SSOT:** `docs/ds/phrakham-parity.md` (AC ต่อ B-x) · **Dev report:** `docs/reports/phrakham-parity.md`
**PM git-verify แล้ว:** diff = `styles.css`(13) + `About.vue`(2) + `Guide.vue`(2) + report เท่านั้น (scope สะอาด)

## หน้าที่ = gate เทียบ DS AC เต็มทุกข้อ (feedback_tester_gate_full_spec)
ตรวจ **computed-style ทุก B-x ที่ทำ** + ทุก viewport (360 / 412 / desktop) + regression · verdict **PASS/FAIL ราย AC**

### AC ที่ต้องผ่าน (จาก DS — ยึด DS เป็นหลัก)
- **B-1** `getComputedStyle(document.body).fontSize` = **18px** (±0.2) ที่ zoom 100%/root 16px · ปุ่ม shell-bar สูง ≥44px
- **B-4** `.card` border-radius = **14px** · `.section-chip` = **20px** (pill)
- **B-3** `.reading-page` line-height ≈ **1.8×fs** (เช่น ~32.4px) · หน้าอื่น/SongList ไม่เปลี่ยน
- **B-6** `.reading-page` max-width = **820px** จัดกึ่งกลาง (margin ซ้าย=ขวา ที่จอ >820) · container รวม/studio เท่าเดิม
- **B-5** ปุ่มหลัก `background=rgb(139,69,19)` color ขาว **ไม่เปลี่ยน** · `.secondary` hover: `border-color=#8B4513` · ปุ่ม danger/ปุ่มใน dock ไม่แตะ
- **B-2 (ตัดทิ้ง):** `.shell-bar` background = **`#f8f9fa` (rgb 248,249,250) คงเดิม** — ยืนยัน header **ไม่ถูกแตะ**

### ⚠️ 3 จุดที่ Dev verify สดไม่ได้ (worktree Supabase shelf ว่าง) — Tester ต้องทำสด
Dev ยืนยัน chip 20px + regression ผ่าน bundle+git diff (ไม่ใช่คลิกสด) · **Tester ต้องล็อกอิน team เปิดแผ่นเพลงจริง 1 เพลง** แล้วเช็ก:
1. **section-chip = pill 20px** (ในหน้าแก้ไข/เลือกท่อน สด)
2. **แผ่นเพลง no regression** — ขนาดโน้ต + line-height เนื้อร้อง **เท่าเดิม** (B-1 ไม่ควรรั่วเข้า sheet เพราะ sheet ใช้ `rem` อิง root · ต้องยืนยันสด)
3. **ปุ่มรอง hover ขึ้นขอบน้ำตาล** บน desktop (hover:hover)

## setup
- worktree ของคุณ: **checkout branch `phrakham-parity`** (verify `git log --oneline -1` = `b70e53c` · `git merge-base --is-ancestor studio-shell-redesign HEAD`) · เปิด dev server **`--host`** ใส่ Network URL ในรายงาน
- **Supabase:** ตั้ง env `SUPABASE_*_PLENG` (`.env` OneDrive) ให้ shelf โหลดเพลง + **ล็อกอิน team** (public เห็น 0 เพลงเพราะ GATE) เพื่อเปิดแผ่นเพลงจริง · ถ้าล็อกอินไม่ได้ → ping PM (จะขอ credential จาก P'Aim)
- Tier B (no-scroll/target-size/contrast/pill/hover) = **ต้องเบราว์เซอร์จริง** (gate บน `hasLayout()` อย่า fake-pass — memory `pleng-tester-role`)

## รายงานกลับ (session-agnostic)
`docs/reports/phrakham-parity-qa.md` = verdict **PASS/FAIL ราย AC** + computed proof + screenshot 360/412/desktop + Network URL · เพิ่ม §📥 inbox board + ping "PM ปัจจุบัน" (board §🎯 — อย่า hardcode ชื่อสาย) · **ไม่ merge/deploy** — PM ทำเอง
