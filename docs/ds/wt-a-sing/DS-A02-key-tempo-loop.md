# DS-A02 — ปรับคีย์ / ความเร็ว / วนซ้ำ

**คู่กับ:** `us/wt-a-sing/US-A02-key-tempo-loop.md`

## ไฟล์ที่แตะ
- `src/components/SongViewer.vue` (แถบควบคุม `.vw-bar`) · `src/lib/chords.js` (transpose)

## จุดเสี่ยงชนกับ worktree อื่น
- ไม่มี — `chords.js` ใช้ร่วม แต่ WT-A แค่เรียกใช้ (ไม่แก้ signature)

## design
- แถบควบคุม: คีย์ (−/+) · ความเร็ว · loop toggle + ช่วง
- ค่าเหล่านี้เป็น **local state ของ viewer** — ไม่แตะเพลงต้นฉบับ

## test
- **unit:** transpose คำนวณคีย์ถูก · loop เล่นวนเฉพาะช่วง
- **tester:** ปรับคีย์/ความเร็ว → เสียงและโน้ตเปลี่ยนตาม · ต้นฉบับไม่เปลี่ยน

## a11y
- controls ≥26px · focus rings · ค่าปัจจุบันอ่านออก (aria)
