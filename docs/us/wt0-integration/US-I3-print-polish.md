# US-I3 — print-polish: footer ชื่อเพลง + หน้า X ของ Y

**Worktree:** WT-0 integration · **Branch:** `wt0-integration` · **Port:** 5301 · **คู่ DS:** `ds/wt0-integration/DS-I3-print-polish.md`
**สถานะ:** spec (ทำได้เลย) · **ที่มา:** B004 / handoff WT-B ข้อ 2-3

## User Story
**ในฐานะ** คนที่พิมพ์แผ่นเพลงหลายหน้า
**ฉันต้องการ** ให้ footer มีชื่อเพลง และมีเลข "หน้า X ของ Y" โดยเนื้อไม่ทับ footer
**เพื่อ** ได้แผ่นเพลงที่อ่านง่าย รู้ว่าหน้าไหนของเพลงอะไร

## Acceptance Criteria
- [ ] โหมดแผ่นส่ง `:song-title` เข้า `SongSheet` → ชื่อเพลงโผล่ที่ footer (SongSheet รับ prop นี้อยู่แล้วจาก WT-B)
- [ ] `@page` ใน `src/styles.css`: เลข `หน้า X ของ Y` (`counter(page)`/`counter(pages)`) + margin กันเนื้อทับ footer หลายหน้า
- [ ] (เงื่อนไข: Chrome/Edge + ปิด "Headers and footers" ในกล่องพิมพ์ — ระบุในคู่มือ)

## นอกขอบเขต
- ชื่อไฟล์ PDF (US-I2) · เลือกคีย์ตอนพิมพ์ (design decision #4 ของ WT-B — รอ P'Aim เคาะ A/B)
