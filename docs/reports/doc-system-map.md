# Report — doc-system-map (SA · งาน doc เดียว)

**สาย:** doc-system-map · **branch:** `doc-system-map` (จาก `studio-shell-redesign`) · **PM:** pm11
**ส่ง:** 12 ก.ค. 2026 · **รอ:** PM ตรวจก่อน canonical (ยังไม่ merge — PM merge เอง)

## ทำอะไร
เขียน `docs/system-map.md` — แผนที่ระบบ **มินิมอล 1 หน้า** = ประตูหน้าเดียวให้ session/คนใหม่
เข้าใจดีไซน์ปัจจุบันเร็ว (living doc · SOP §5 ผูก DoD ให้อัปเดตเมื่อแตะ data/flow)

## โครง (ตามที่ brief กำหนด)
1. ระบบนี้คืออะไร (2-3 บรรทัด + stack)
2. Data — `songs` data dictionary (11 คอลัมน์จริงจาก `SongList.vue:97` + `EditorMode`) · `song_drafts` · content v2 (ลิงก์ `song-model-v2.md` ไม่อธิบายซ้ำ) · เล่ม 3 เล่ม
3. ส่วนประกอบหลัก 8 ตัว (1 บรรทัด/ตัว + ลิงก์ DS)
4. Flow หลัก 4 (ดู/transpose/print · แก้→ร่าง→เผยแพร่ · verified gate · JSON import)
5. Invariants 6 ข้อ (1 เพลง 1 เล่ม · verified แยก layer · category free-text · hash router · โน้ต=scale degree · แก้ทำนองที่เดียว)

## หลัก minimal ที่ยึด
- เขียนเฉพาะ **ของนิ่ง** · ลิงก์ไป SSOT เดิมไม่ก็อป: `mission.md` `README.md` `song-model-v2.md`
  `ui-standards.md` `sop.md` + `docs/ds/*` ราย epic
- ภาษาคน (ม.ต้นเข้าใจ) · ศัพท์เทคนิคขยายครั้งแรก
- เล่มเขียนตามปลายทาง **3 เล่ม (เล่มใหญ่/อนุชน/เด็กเล็ก)** ตาม B095 · หมายเหตุ `category` code
  ปัจจุบัน = `lem-yai`/`anuchon`/`yuwachon` (ชื่อโชว์ "เด็กเล็ก" สำหรับ yuwachon)

## แตะไฟล์
- `docs/system-map.md` (ใหม่)
- `docs/README.md` (+1 บรรทัด ข้อ 0 ชี้ system-map เป็น entry point)
- `docs/reports/doc-system-map.md` (ไฟล์นี้)

## DoD
- ✅ ไฟล์เดียว ~1 หน้า · ลิงก์ครบ ไม่ก็อปซ้ำ · คนไม่โค้ดอ่านรู้เรื่อง
- ✅ README ชี้เข้า system-map เป็น entry point
- ✅ ไม่มี UI → ไม่ต้อง tester gate
- ⏳ **รอ PM (pm11) ตรวจ** → ถ้าผ่าน merge เข้า base เป็น canonical

## จุดที่อยากให้ PM ยืนยัน
- เล่มที่ 3 เขียน "ยุวชน (เด็กเล็ก)" — B095 กำลังเปลี่ยน `yuwachon`→"เด็กเล็ก" · ถ้า code/ชื่อ
  ปลายทางต่างจากนี้ บอกได้ จะแก้ให้ตรง
