# WT-0 integration/polish — user stories

**Branch:** `wt0-integration` (จากฐานล่าสุด) · **Port:** 5301 · **DS:** `docs/ds/wt0-integration/`
**ที่มา:** ต่อสาย lib ของ WT-C (jsonIO/songName) + WT-B (print) เข้ากับ shell/editor/guide — จุดที่ dev อื่นแตะ `Studio.vue`/`EditorMode.vue`/`Guide.vue`/`styles.css` ไม่ได้
**ขึ้นกับ:** WT-C + WT-B merge แล้ว ✅

## ลำดับ (สำคัญ)
- **ทำได้เลย** (ไม่แตะ `EditorMode`): US-I1 · US-I2 · US-I3 · US-I4 — `Studio.vue` ว่างแล้ว (ไม่มี worktree อื่นแตะ)
- **รอ WT-D merge ก่อน** (แตะ `EditorMode.vue` = ไฟล์ WT-D): US-I5

## US
- US-I1 เซ็ต currentSong ตอนเปิดเพลง → ปุ่ม navbar โผล่
- US-I2 SSOT ชื่อไฟล์ = `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>`
- US-I3 print-polish (footer ชื่อเพลง + หน้า X ของ Y)
- US-I4 คู่มือ C03 ใน Guide.vue
- US-I5 ต่อ JSON ในโหมดแก้ (upload validate + downloadJson ใช้ lib + ตัดเมนูซ้ำ B003) — **รอ WT-D**
