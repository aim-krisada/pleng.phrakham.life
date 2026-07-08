# Brief ตรวจงาน (จาก PM) — sa-ps3 review ps4-shell คลื่น 1

**สั่งโดย:** PM · **ผู้รับ:** sa-ps3 · **วันที่:** 2026-07-08
**เป้า:** ตรวจงานที่ dev ps4-shell ส่งมอบ (เฉพาะคลื่น 1) เทียบดีไซน์ที่เคาะ → รายงานบั๊กจริง (PM เป็นคนยิงให้ dev แก้ · **คุณไม่ต้องเขียนสเปก/DS ใหม่** — แค่ review + ชี้จุด)

## ⚠️ ขอบเขต (สำคัญมาก — อ่านก่อน)
dev ps4-shell build แค่ **คลื่น 1 = shell (แถบบน) + StudioDock** เท่านั้น (ยืนยันจาก git: `wt-shell` แตะ `ShellBar/Studio/StudioDock` · `EditorMode.vue` แค่ *ถอด dock ออก* ยังไม่รื้อ UI)
→ **ตรวจเฉพาะ shell + dock** · **อย่าตรวจ** editor/viewer/highlight redesign — พวกนั้น = คลื่นถัดไป **ยังไม่ build** (ไม่ใช่บั๊ก)

## สิ่งที่ต้องทำ
1. อ่านรายงาน dev: `docs/reports/wt-shell.md` (มี URL/port ไว้เปิดตรวจ) + ดีไซน์ที่เคาะ: `us/ds ps3-shell` · `us/ds ps3-dock` · `docs/design/ps3-dock-prototype.html`
2. เปิดของจริง (build คลื่น 1) เทียบ prototype → หา **บั๊กจริง** (build ไม่ตรงดีไซน์) เฉพาะ shell + dock
3. **ยืนยัน 4 บั๊กที่ P'Aim เจอแล้ว** (repro จริง + ชี้เหตุถ้าเห็นชัด):
   - **B030** dock (แถบคีย์โน้ต) ไม่แสดงเลยในโหมดฝึกร้อง
   - **B031** แถบเมนูบน (desktop) โหมดแก้ไข วางไม่เหมือนฝึกร้อง/แผ่นเพลง (ไม่มี "เพลง ▾")
   - **B033** dock: แถวคีย์โน้ตเลื่อน (scroll) แนวนอนไม่ได้
   - **B034** dock: กดซ่อนแล้วกดแสดงกลับมาไม่ได้ (toggle เสีย)
4. **ไม่ต้องแตะ (P'Aim + PM triage แล้วว่าไม่ใช่บั๊ก — ยังไม่ build):** B029 ไฮไลต์รายพยางค์ (epic highlight) · B032 ปุ่มลบท่อน + B035 หน้าแก้ไขไม่ตรง prototype (= editor redesign คลื่น 2)

## ส่งมอบ
- เขียนผลลง **`docs/pm/review-ps4-shell-wave1-report.md`** (ไฟล์ใหม่ของคุณ) — ต่อบั๊ก 1 รายการ: *อาการ · ควรเป็นยังไงตามดีไซน์ · ไฟล์/จุดที่น่าจะเป็นต้นเหตุ · ความรุนแรง* + บั๊กใหม่ที่คุณเจอเพิ่ม (ถ้ามี)
- print สรุปในแชตให้ P'Aim เห็นด้วย
- **ไม่ต้องแก้โค้ดเอง · ไม่ต้องเขียน DS ใหม่** — PM รวบยิง dev

## กติกา
commit เฉพาะไฟล์ report ของคุณ (`git add` เจาะจง) · บนฐาน `studio-shell-redesign` · เช็ก `git branch --show-current` ก่อน commit · ห้าม merge main/deploy
พื้นหลังเพิ่ม: `docs/pm/board.md` (test log + triage) · backlog B029–B035
