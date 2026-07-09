# brief — B055 (ด่วน) แจ้งเตือนจังหวะข้ามห้อง/บรรทัด (false red)

**สาย:** dev · worktree ใหม่จากฐาน `studio-shell-redesign` · 1 worktree = 1 branch = 1 port · **ด่วน (P'Aim)**
**ที่มา:** P'Aim 9 ก.ค. ค่ำ (transcript "แจ้งเตือนห้อง 1/2" · G:\My Drive\0-google-drive-temp)

## ปัญหา (P'Aim อธิบาย)
ตัวตรวจจังหวะในโหมดแก้ไขขึ้น **แดง "จังหวะไม่ครบ"** ทั้งที่**จริงครบ** เพราะจังหวะถูกแบ่งข้ามห้อง/บรรทัด:
- **pickup/anacrusis:** ห้องขึ้นต้นที่จังหวะ 3-4 (ไม่ครบ) → ทำนองไปจบที่ห้องท้ายจังหวะ 1-2 → **รวม = 4 จังหวะครบ** (แพทเทิร์นเพลงนมัสการทั่วไป · โน้ตลากข้ามบรรทัด)
- **จังหวะเดียวกันเขียนคนละบรรทัด** → ตัวตรวจนับต่อบรรทัด เห็นขาด → แดง แต่จริงครบแค่คนละบรรทัด
- **P'Aim:** "แต่ก่อนหน้านี้มันทำได้แล้ว" + "ไม่มีที่ให้ใส่ได้ว่าจริงๆมันครบ" → อาจ regressed / ไม่ครอบเคส / checkbox หายาก

## สิ่งที่มีในโค้ดแล้ว (จุดเริ่มสอบ)
- `src/components/EditorMode.vue`
  - **กลไก `line.cont`** (~บรรทัด 519-549): ถ้าบรรทัดถัดไป `cont=true` → รวม tokens ข้ามบรรทัดแล้ว `beatCount` รวม · โชว์ `⤷`
  - **checkbox** (บรรทัด 1544): `<input v-model="curLine().cont"> ⤷ ต่อห้องจากบรรทัดก่อน` · `v-if="activeLine > 0"` (line-level เท่านั้น)
- `src/lib/notation.js` — `beatCount` / `expectedBeats` (ตัวคำนวณจังหวะ)

## โจทย์ (investigate ก่อน แล้วแก้)
1. **repro:** เปิดโหมดแก้ไข ทำเพลง 4/4 ที่ห้องแรกเริ่มจังหวะ 3-4 (pickup) + จบห้องท้าย 1-2 → เห็นแดงไหม · ลองติ๊ก checkbox ⤷ แล้วยังแดงไหม
2. หา gap: (a) checkbox ครอบ **pickup pairing (ห้องแรก↔ห้องท้าย)** ไหม หรือแค่บรรทัดติดกัน (b) แดงหายทั้ง 2 ห้องที่ต่อกันไหม (c) checkbox discoverable ไหม (ซ่อนใน options?)
3. **แก้ให้:** ผู้ใช้มีทาง**ติ๊ก/มาร์คว่าห้องต่อกัน** → ตัวตรวจนับจังหวะ**ข้ามห้อง** → ไม่ขึ้นแดงปลอม · ครอบทั้ง cross-line + pickup/anacrusis · ทำ control ให้หาเจอง่าย
4. **ขอ P'Aim ตัวอย่างเพลงจริง** ถ้าต้องการ (จะได้ repro ตรงเคส)

## กันชน
- แตะ `EditorMode.vue` (+ `notation.js` ถ้าจำเป็น) · ⛔ ระวัง: ถ้าสาย mobile (Android) เริ่มแตะ EditorMode ให้แจ้ง PM (ตอนนี้ Android ยังไม่ทำ) · ไม่ชน DA (data)

## Verify
- repro เคสจริงในเบราว์เซอร์ (เปิด `--host` ใส่ Network URL) → ก่อน/หลัง: แดงปลอมหาย · จังหวะนับข้ามห้องถูก
- unit test: beatCount/validation ข้ามห้อง (pickup + cross-line) · `vitest --exclude '**/.claude/**'` เขียว + build ผ่าน · ไม่ทำ beat-check เดิมพัง

## รายงานกลับ (session-agnostic)
`docs/reports/wt-b055.md` + board §📥 inbox + ping PM ตาม board §🎯 · commit อังกฤษ · ห้าม merge main/deploy · เช็ก branch ก่อน commit
