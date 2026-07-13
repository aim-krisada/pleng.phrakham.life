# รายงาน Dev — ป้ายสถานะ "✓ ตรวจแล้ว / ยังไม่ตรวจ" ในรายการเพลง (เลน 6)

**สาย:** Dev · **task:** `task_6d711e84` · **branch:** `claude/vibrant-williamson-1ed30e` (fork จาก `studio-shell-redesign` — verify ผ่าน)
**brief:** `docs/pm/brief-review-status-badge.md`

## สรุป (F60+)
เพิ่มป้ายสถานะรายเพลง **✓ ตรวจแล้ว** (เขียว) / **ยังไม่ตรวจ** (เทา) ในหน้ารายการเพลง (`SongList.vue`) ทั้ง **แถวในเล่ม** และ **การ์ดผลค้นหา** + ตัวนับความคืบหน้า **"✓ ตรวจแล้ว X / ทั้งหมด Y"** (รวมบนหน้าเลือกเล่ม + รายเล่มบนหัวเล่ม) — **เห็นเฉพาะทีมล็อกอิน**. Public ไม่เห็นป้าย/ตัวนับ และเห็นเฉพาะเพลง verified เหมือนเดิม. ไม่แตะ gate/RLS/header/dock/แผ่นเพลง.

## ไฟล์ที่แก้
- `src/lib/bookshelf.js` — เพิ่ม 2 helper บริสุทธิ์ (unit-test ได้): `showUnverifiedBadge(song, loggedIn)` (คู่ตรงข้ามของ `showVerifiedBadge` เดิม) + `verifiedProgress(songs) → {verified, total}`
- `src/views/SongList.vue` — เรียก 2 helper · แถวในเล่มเพิ่ม `.row-status` badge · การ์ดค้นหาเพิ่ม "ยังไม่ตรวจ" (เดิมมีแค่ ✓) · หัวเล่ม + หน้าเลือกเล่มเพิ่มตัวนับ progress · CSS `.badge.pending` (เทา slate) + `.row-status` + `.progress`
- `src/lib/bookshelf.test.js` — +2 describe (showUnverifiedBadge + complement · verifiedProgress) รวม 20 test ในไฟล์นี้
- `docs/reports/assets/review-status-badge-states.html` — ภาพจำลอง 2 สถานะ (CSS + โทเคนสี + ชื่อเพลง = ของจริง)

## การออกแบบสี (contrast)
- **✓ ตรวจแล้ว** = badge.ok เดิม (เขียว #2e6b3b บน #e7f4e9) — ใช้ซ้ำ ไม่สร้างใหม่
- **ยังไม่ตรวจ** = badge.pending ใหม่ (slate #4a4f57 บน #eef0f2) — **เทา ไม่ใช่แดง** เพราะเพลงแค่ "ยังไม่ตรวจ" ไม่ใช่ "พัง" (แดงสงวนไว้ให้ ⚠️ ต้องตรวจ/lint flags) · วัด contrast ≈ **7.2:1** ผ่าน AA + AAA · เข้ากับ warm theme (เทากลาง ไม่ตีกับน้ำตาล brand)
- **ตัวนับ progress** = เขียวเดียวกับ ✓ (สื่อความคืบหน้า)

## verify (ทำจริงบน dev server `--host`)
Network URL: **http://192.168.1.124:5421/** (port 5421)

ยืนยันสดผ่าน DOM (เครื่องมือ screenshot ของ Browser pane + Chrome MCP ค้าง/ไม่ต่อในรอบนี้ — ดูหมายเหตุล่าง · แทนด้วยการวัด DOM จริงซึ่งแม่นกว่า pixel):

1. **ไม่ล็อกอิน (public):** หน้าเลือกเล่ม "อนุชน 8 เพลง" · ไม่มีตัวนับ progress · เข้าเล่มแล้วแถวเพลง **ไม่มีป้ายเลย** (มีแค่ เลข/ชื่อ/อ้างอิง/คีย์) ✓
2. **ล็อกอินทีม** (จำลอง session จริงบน dev build): เห็นทุกเพลง (124) · แถว verified → `✓ ตรวจแล้ว [ok]` · แถว unverified → `ยังไม่ตรวจ [pending]` · หัวเล่ม `อนุชน 121 เพลง · ✓ ตรวจแล้ว 61 / 121` · การ์ดค้นหาโชว์ป้ายทั้งสองแบบ · หน้าเลือกเล่ม `✓ ตรวจแล้ว 62 / ทั้งหมด 124` ✓
3. **count ถูก:** `verifiedProgress` = {verified, total} ตรงกับข้อมูล (unit-test + วัดสด) ✓
4. **มือถือ 360 / 412:** in-book 121 แถว — `scrollWidth == viewport` (ไม่มี horizontal scroll) · ทุกแถว right ≤ viewport (360→max 333 · 412→max 359) · ป้ายไม่ถูกตัด (`row-status` flex:0 0 auto) · ชื่อยาว ellipsis แทน ✓

**test:** `vitest run` — 528 tests ผ่าน (bookshelf 20/20) · 1 suite fail = `notationLint.test.mjs` (สคริปต์ `process.exit` — pre-existing ไม่เกี่ยวงานนี้ · commit ล่าสุด B057)
**build:** `vite build` ผ่าน (1.88s)

## หมายเหตุ / ค้าง
- **screenshot:** เครื่องมือ screenshot ทั้ง Browser pane (ค้าง 30s ทุกครั้ง แม้หน้าเล็ก) และ Chrome MCP (ไม่ต่อ) ใช้ไม่ได้ในรอบนี้ → ยืนยันด้วยการวัด DOM จริง (rendered text + class + computed color + measurement) + ทำ **ภาพจำลอง HTML** `docs/reports/assets/review-status-badge-states.html` (เปิดในเบราว์เซอร์เห็น 2 สถานะ · CSS/โทเคน/ชื่อเพลง = คัดจากของจริง). ถ้า PM ต้องการภาพ screenshot จริง เปิดไฟล์นี้หรือดูสดที่ Network URL (ล็อกอินทีม)
- **public gate = client-side** (`visibleSongs` ใน bookshelf.js) ไม่ใช่ RLS — anon fetch ได้ทุกเพลงแล้วกรองฝั่ง client. **นอก scope งานนี้** (brief สั่งไม่แตะ gate/RLS) แต่แจ้งไว้ให้ PM รับรู้ (ตรงกับ risk 1.3 ที่ P'Aim รับไว้แล้ว)
- **ไม่ merge / ไม่ deploy** — รอ PM gate + Tester (Tier B: มือถือ real-browser 360/412 + contrast)
- launch config เพิ่ม `rsb` (port 5421) ใน `.claude/launch.json` (worktree นี้เท่านั้น)
