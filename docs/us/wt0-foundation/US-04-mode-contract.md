# US-04 — สัญญาจุดต่อ (contract) สำหรับงานขนาน

**Worktree:** WT-0 · **Branch:** `wt0-foundation` · **คู่ DS:** `ds/wt0-foundation/DS-04-mode-contract.md`
**สถานะ:** spec (รอ dev)
**โยง mission:** แผนที่งาน — ต้องมี "กำแพง+ประตู" ก่อนทำขนาน

## Story
ในฐานะ **ทีมพัฒนา (หลาย session)** เราต้องการให้แต่ละโหมดเป็นไฟล์ของตัวเอง มี props/events ชัด เพื่อทำพร้อมกันโดยไม่ต้องแตะ `Studio.vue`

## Acceptance Criteria
- [ ] แกะ `EditorMode.vue` ออกจาก `Studio.vue` (ยกทั้งก้อน ไม่รื้อ internals)
- [ ] ทั้ง 3 โหมดรับ **props มาตรฐาน** + ส่ง **events มาตรฐาน** ตามที่นิยามใน DS-04
- [ ] หลัง WT-0 merge: A/B/C/D แก้เฉพาะไฟล์โหมดของตัวเอง + `jsonIO.js` — **ไม่ต้องแตะ `Studio.vue`**

## นอกขอบเขต
- การปรับปรุงภายใน editor (WT-D)
