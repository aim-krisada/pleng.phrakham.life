# US-06 — ปุ่มพิมพ์ในโหมดแผ่นเพลง

**Worktree:** WT-0 (follow-up) · **Branch:** `wt0-followups` · **Port:** 5301 · **คู่ DS:** `ds/wt0-foundation/DS-06-sheet-print-button.md`
**สถานะ:** spec (รอ dev) · **ที่มา:** review WT-0 ข้อ 4 (ส่วน shell)
**โยง mission:** พิมพ์แผ่นเพลงได้ง่าย

## User Story
**ในฐานะ** คนที่ดูแผ่นเพลง
**ฉันต้องการ** ปุ่มพิมพ์ (🖨) เห็นชัดในโหมดแผ่นเพลง
**เพื่อ** สั่งพิมพ์ได้ทันทีจากหน้าที่ดูอยู่

## Acceptance Criteria
- [ ] โหมดแผ่นมีปุ่มพิมพ์ใน toolbar (`Studio.vue`) → เรียก `window.print()`
- [ ] รูปแบบหน้าพิมพ์จริง (A4/footer) = งาน WT-B (US-B02) — story นี้แค่ปุ่ม trigger

## นอกขอบเขต
- print format / footer pleng.phrakham.life (เป็นของ WT-B)
