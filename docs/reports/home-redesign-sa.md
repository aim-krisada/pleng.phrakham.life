# รายงาน SA — หน้าแรกใหม่ แบบเลือกเล่ม (B087)

**สาย:** SA (design) · **ฐาน:** `studio-shell-redesign` · **สถานะ:** mockup เสร็จ → **รอ P'Aim เคาะก่อน dev** · **PM:** pm7
**ส่งมอบ = ออกแบบล้วน · ไม่แตะ src** (mockup แยกไฟล์ · US/DS เป็นเอกสาร)

## ทำอะไร
ออกแบบหน้าแรกใหม่ตาม brief `brief-home-redesign-sa.md`: แทนลิสต์เพลงแบนด้วยหน้าแบบ "ชั้นหนังสือ" —
เข้ามาเจอ **ช่องค้นหา + ปุ่มเลือก 9 เล่ม** (หลักการเดียวกับตัวเลือกพระธรรมของ phrakham.life, แต่ pleng 2 ชั้น: เล่ม → เพลง).

## ส่งมอบ
1. **Mockup คลิกได้:** `docs/design/home-bookshelf.html` — self-contained, ใช้ S0 tokens เดิม (Warm Study Room). 3 สถานะในหน้าเดียว:
   - **เลือกเล่ม (landing):** ช่องค้นหาบนสุด + กริด 9 เล่ม (ชื่อ + จำนวนเพลง) + ใบ "อื่นๆ / ยังไม่จัดเล่ม"
   - **เพลงในเล่ม:** breadcrumb ← กลับ · รายการเพลงเรียงตามเลขในเล่ม · แถวเดียวจบ (เลข + ชื่อ + คีย์)
   - **ผลค้นหา:** พิมพ์แล้ว override ทุกชั้น ค้นข้ามทุกเล่ม (ชื่อ/เลข/คีย์/`ล.282`) · ล้าง → กลับชั้นเดิม
2. **US:** `docs/us/home-redesign.md` (7 AC) · **DS:** `docs/ds/home-redesign.md` (code anchors: SongList.vue, bookCodes.js, songSearch.js)

## เปิดดู mockup
```sh
cd C:\gl\krisada\pleng.phrakham.life
python -m http.server 5490 --bind 127.0.0.1
# แล้วเปิด http://127.0.0.1:5490/docs/design/home-bookshelf.html
```
หรือดับเบิลคลิกไฟล์เปิดในเบราว์เซอร์ตรงๆ ก็ได้ (self-contained).

## ตรวจแล้ว (Browser MCP · มือถือ 375px)
- กริดแสดง **9 เล่ม + fallback "อื่นๆ" (1 เพลง)** ครบ · หัวข้อ "9 เล่ม"
- drill "ไทยอนุชน 120" → เพลงเรียงตามเลขในเล่ม (2·5·11·18·23) · ชั้นเล่มถูกซ่อน · breadcrumb กลับได้
- ค้น "พระคุณ" → 2 ผลข้ามเล่ม พร้อมบรรทัด "แหล่งเพลง: …" · ค้น "282" → เจอ "ของขวัญ" (ล.282)
- **h-overflow = 0 ที่ 375px** · แถวบรรทัดเดียว · target ≥ 44px
- ⚠️ `preview_screenshot` timeout (รู้อยู่ · flaky) → ยืนยันด้วย DOM/JS แทนตามธรรมเนียม worktree

## หลักการออกแบบ (ยืนยันตาม ui-standards)
- **ปรับไม่รื้อ (KISS):** data flow เดิมของ SongList.vue คงไว้ (โหลด songs + `filterSongs` + `bookRefLabels`) — เพิ่มแค่ 3 สถานะการจัดวางผลลัพธ์
- **data-driven:** จำนวนเล่ม/เพลงนับจาก `book_refs` → รับ "เล่มใหญ่" ที่จะ import ทีหลังเองโดยไม่แก้โค้ด
- ไม่แตะ model/DB/`songSearch.js` · ไม่แตะ SongSheet/EditorMode → ไม่ชนสาย print/tie/section-ux

## ข้อควรตัดสิน (ให้ P'Aim เคาะ)
1. เล่มที่ยัง **0 เพลง** → ซ่อน หรือแสดงเป็น "0 เพลง" (mockup ใช้เลขสมมติ — ยังไม่ตัด)
2. อยากได้ **ปกเล่ม/ไอคอน** ต่อเล่มไหม หรือใช้ "สัน + โค้ดเล่ม" แบบ mockup พอ
3. บนจอกว้าง (PC) อยากได้ 3 คอลัมน์ (mockup) หรือ 2 พอ

## Next
P'Aim เคาะ mockup → PM จ่าย dev (แก้ SongList.vue ตาม DS) → tester gate → merge → deploy รอบถัดไป.
