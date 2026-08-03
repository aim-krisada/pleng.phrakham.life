# docs/pm/ — ช่องสื่อสารกับ PM (ผู้จัดการโครงการ)

พี่เอมตั้ง Claude อีก session เป็น **ผู้จัดการโครงการ (PM)** ช่วยคุมภาพรวม pleng —
ลำดับงาน · กันงานชนกัน · สรุปสถานะ · คุมคุณภาพก่อน merge

PM เป็น **คนละ session** กับ SA/DA/dev → มองไม่เห็นแชตของแต่ละคน อ่านได้แค่ **git**
โฟลเดอร์นี้จึงเป็น "กระดานนัดพบ" ให้ทุก session รายงานสถานะให้ PM ผ่านไฟล์

## กรอบงาน: ISO 29110-5-4 (Agile/VSE) + Scrum
โปรเจกต์อิง **ISO/IEC 29110-5-4:2025 (แนวทาง Agile สำหรับทีมเล็ก/VSE) + Scrum** — สิ่งที่ทีมทำอยู่แล้ว map ตรงกับมาตรฐาน:

| Scrum | ISO 29110-5-4 | ของเราอยู่ไหน |
|---|---|---|
| Product Backlog | (input) | `docs/backlog.md` |
| Sprint | — | ps1…ps4 (`docs/status.md`) |
| Requirement + AC | **SI.2** | `docs/us/` |
| Design | **SI.3** | `docs/ds/` |
| Code + unit test (CI เขียว) | **SI.4** | branch + GitHub Actions + `npm test` |
| Test Report / Sprint Review | **SI.5** | `docs/reports/` + tester (พี่เปา) + พี่เอมรับงาน |
| Delivery | **SI.6** | merge `main` → deploy (git history / tag) |
| **Daily Standup** | monitoring | **`docs/pm/standup-*.md` ← โฟลเดอร์นี้** |
| Retrospective | process improvement | `docs/lessons.md` |

**บทบาท (Scrum):** พี่เอม = **Product Owner** (จัดลำดับ backlog · รับงาน · สั่ง merge main/deploy) ·
SA/DA/dev sessions = **Development Team** · Claude (คนละ session) = **Scrum Master + PM** (คุมลำดับ · กันชน · facilitate · เฝ้า DoD + traceability)

**หัวใจ 29110 ที่ PM เฝ้า:**
- **Traceability** — ทุกงานสาวกลับได้ตามสาย `backlog id → US(SI.2) → DS(SI.3) → code(SI.4) → report(SI.5)` ทุก commit/branch อ้าง id ของ item
- **DoD gate** — ไม่ครบ AC + unit test ไม่เขียว → ไม่ merge เข้าฐาน · ไม่ผ่าน tester + พี่เอมรับ → ไม่ขึ้น `main`
- **Config management** — ฐาน `studio-shell-redesign` · 1 งาน = 1 branch/worktree · `main` = ของจริง (protected โดยพฤตินัย: deploy ต่อเมื่อพี่เอมสั่ง)

## 1 ไฟล์ = 1 "สายงาน" (ไม่ใช่ 1 session)
เขียน standup ลง **`docs/pm/standup-<slug>.md`** โดย `<slug>` ผูกกับ **สายงาน/ธีม** ไม่ใช่ session
เช่น `sa-jianpu-rules` · `ps3sa` · `sa-<ธีม>` · `da` · `dev-ps4-shell`

**สำคัญ — พี่เอมเปลี่ยน session ใหม่เมื่อ context ใกล้เต็ม → 1 สายงานพาดผ่านหลาย session ได้:**
- **session ใหม่ที่มาสานสายเดิม → เปิดไฟล์ standup เดิมของสายนั้น อ่านก่อน แล้วอัปเดตทับ** (อย่าสร้างไฟล์ใหม่)
  ไฟล์ standup จึงเป็น "ไม้ต่อ (handoff)" — อ่านไฟล์นี้ไฟล์เดียวก็ทำต่อจากที่ session ก่อนค้างไว้ได้ทันที
- ถ้าเป็นสายงานใหม่จริงๆ (ยังไม่มีไฟล์) → ตั้ง slug ใหม่ สร้างไฟล์ใหม่
- ถ้าจำเป็นต้องมี **หลาย session ทำสายเดียวกันพร้อมกัน** → เติมท้าย slug เช่น `dev-ps4-shell-2` แล้วบอกใน standup ว่าแบ่งงานกับตัวหลักยังไง (กันแก้ทับ)

**หัวไฟล์ standup ให้มีบรรทัดพวกนี้เสมอ (PM ดูปราดเดียวรู้ว่าสด/สายไหน):**
```
สายงาน: <slug>   ·   สถานะล่าสุด: <ออกแบบ/build/รอ review/รอเคาะ>
อัปเดตล่าสุด: <วันที่> โดย session รอบที่ <n>
```

## หัวข้อ standup (ภาษาคน สั้น กระชับ · ไม่ต้องลอก status.md/backlog.md มา — ชี้ path พอ)
1. **คุณคือใคร** — บทบาท (SA/DA/dev) + ธีม/ขอบเขตที่รับ
2. **ตอนนี้ทำอะไรอยู่** — งานปัจจุบัน + สถานะ (ออกแบบ / กำลัง build / รอ review / รอพี่เอมเคาะ)
3. **ถึงไหนแล้ว / เหลืออะไร** — เสร็จอะไรไปแล้ว เหลือขั้นไหน
4. **ไฟล์รายละเอียดอยู่ไหน** — path ของ US / DS / prototype / report / โค้ดที่แตะ
5. **คุณเป็นเจ้าของไฟล์ไหน** — ไฟล์/โฟลเดอร์ที่กำลังแก้ + branch + port
6. **ติด/รออะไรอยู่** — blocker · รอ session อื่น · หรือรอพี่เอมตัดสินใจ
7. **จุดต่อกับคนอื่น** — งานไปแตะไฟล์ร่วม/ต้องนัดต่อกับใครตอนไหน

## กติกากันชน (หลาย session commit พร้อมกัน)
- แก้เฉพาะไฟล์ standup ของตัวเอง — คนละไฟล์ ไม่ชน
- `git add docs/pm/standup-<slug>.md` เจาะจง (ไม่ใช่ `git add -A`)
- commit บนฐาน `studio-shell-redesign` · เช็ก `git branch --show-current` ก่อน commit
- ห้าม merge `main` / ห้าม deploy
- อัปเดต standup ของตัวเองเมื่อสถานะเปลี่ยน (PM อ่านไฟล์ล่าสุดเสมอ)

## PM อ่านที่ไหนบ้าง (พื้นหลัง)
`docs/status.md` (กระดานสปรินต์) · `docs/backlog.md` (idea ทั้งหมด) · `docs/reports/` (รายงาน dev) ·
`docs/us/` + `docs/ds/` (สเปก) — standup ในโฟลเดอร์นี้ = ภาพ "ตอนนี้ใครทำอะไรสดๆ" ที่เอกสารพวกนั้นไม่บอก
