# สาย 1 — D.C./D.S./Fine/Segno resolver (worktree นี้)

เปิด Claude session ใหม่ในโฟลเดอร์นี้ (`C:\gl\krisada\pleng-dc-segno`) แล้วพิมพ์: **`อ่าน pm/pm.md`**
> pm/pm.md อยู่ที่ repo `pleng.phrakham.life-pm` — worktree นี้ share git เดียวกัน แต่คนละ working dir

## งานของ worktree นี้ (branch `dc-segno-resolver`)
ทำ resolver ให้ playback เล่นตามสัญลักษณ์ย้อน/วนซ้ำ: **D.C. · D.S. · Fine · Segno · Coda**
- บลูพรินต์: `work/ปรับ pl edit ui/DESIGN-editor-overhaul.md` §A (gap 1) + §E ลำดับ 1
- ลำดับที่ล็อก: นี่คือ **gap 1** (เล่นถูก · >30% ของเพลงใช้)

## 🔴 ด่านคน — นัดก่อนเริ่ม (กฎ pair-sop §2)
เสียง playback = ชั้น `audio` → **ไม่มี AI เซ็นได้ ต้องหูพี่เปา**
⇒ ยังไม่นัดหูพี่เปา = **งานนี้ยังไม่พร้อมเริ่ม** อย่าเพิ่งลงมือ verify ตอนจบ

## dev server
`npm run dev -- --host --port 5311` (port ของสายนี้ · สาย Editor UX ใช้ 5310)

## ห้ามชนสาย 2
สาย 2 (Editor UX) แตะ `EditorMode.vue` / `Studio.vue` — สายนี้แตะ playback (`midi.js`/`songModel.js`/resolver ใหม่) เป็นหลัก · ถ้าต้องแตะไฟล์เดียวกัน = หยุด ถาม P'Aim
