# WT-A ร้อง/คาราโอเกะ — user stories

**Branch:** `wt-a-sing` (จาก `studio-shell-redesign`) · **Port:** 5302 · **DS:** `docs/ds/wt-a-sing/`
**ขึ้นกับ:** WT-0 (contract) ต้อง merge ก่อน

**ภาพรวม:** โหมด "ดู" ของเพลง = `SongViewer.vue` (build ไว้แล้วส่วนใหญ่: เล่น · ทรานสโพส · ความเร็ว · วนซ้ำ · ฟอนต์ · ไฮไลต์ตาม). งานหลัก = ยืนยันครบตาม story + ต่อเข้า contract ของ WT-0 (รับ `:song` `:tier` · โหมด view อ่านอย่างเดียว ไม่มีบันทึก)

**อัปเดตจาก WT-0 (สำคัญ):** WT-0 แตะ `SongViewer.vue` + `midi.js` เพื่อคืน **live key re-tune** (เปลี่ยนคีย์สดตอนเล่น = ส่วนหนึ่งของ US-A02) พร้อมเทสต์ `SongViewer.play.test.js` → **WT-A branch จากฐานใหม่ที่ merge แล้ว (ไม่ต้อง rebase เพราะเพิ่งเริ่ม)** · WT-A แค่ยืนยัน/ต่อยอด · latent bug ที่ WT-0 พบ: `watch(props.song)` รีเซ็ต `displayKey` — แก้ใน US-A04

## US
- `US-A01-play-along.md` — เล่นตามแบบคาราโอเกะ (ไฮไลต์วิ่งตาม)
- `US-A02-key-tempo-loop.md` — ปรับคีย์ / ความเร็ว / วนซ้ำ (live key = WT-0 ทำแล้ว · ยืนยัน)
- `US-A03-readability.md` — อ่านง่าย (ฟอนต์ / เนื้อเต็ม / เลือกท่อน)
- `US-A04-live-tempo.md` — เปลี่ยน tempo สดตอนเล่น (review #5 · feature ใหม่)
