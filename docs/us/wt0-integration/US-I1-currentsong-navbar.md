# US-I1 — เซ็ต currentSong ตอนเปิดเพลง → ปุ่ม navbar โผล่

**Worktree:** WT-0 integration · **Branch:** `wt0-integration` · **Port:** 5301 · **คู่ DS:** `ds/wt0-integration/DS-I1-currentsong-navbar.md`
**สถานะ:** spec (ทำได้เลย) · **ที่มา:** report WT-C ข้อ 2ก

## User Story
**ในฐานะ** คนที่เปิดเพลง
**ฉันต้องการ** เห็นปุ่มดาวน์โหลด/พิมพ์บนแถบบน (navbar) ทันทีที่เปิดเพลง
**เพื่อ** ใช้งานได้จากแถบบน ไม่ต้องเข้าเมนูจัดการ

## Acceptance Criteria
- [ ] เปิดเพลงใน Studio → เซ็ต `store.currentSong = song` → ปุ่ม `DownloadTool` บน navbar โผล่ (เดิม `v-if` เป็น false เสมอเพราะไม่เคย set)
- [ ] สลับเพลง/ออกจากเพลง → `currentSong` อัปเดต/ล้างถูกต้อง

## นอกขอบเขต
- format ชื่อไฟล์ (US-I2)
