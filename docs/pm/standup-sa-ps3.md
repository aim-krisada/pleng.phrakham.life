# Standup — สาย sa-ps3 (UI redesign)

สายงาน: sa-ps3   ·   สถานะล่าสุด: ออกแบบครบ (design done) → ส่งต่อ build คลื่น 1
อัปเดตล่าสุด: 2026-07-08 โดย session รอบที่ 1

## 1. คุณคือใคร
SA สาย **UI redesign** ของหน้า Studio — ขอบเขต: shell/เมนู · โต๊ะแก้ไข · ฝึกร้อง · ไฮไลต์ · dock (แถบเครื่องมือล่าง) · ไม่แตะสายกฎโน้ต (sa-jianpu) และธีม audit-log (B028)

## 2. ตอนนี้ทำอะไรอยู่
**ออกแบบ UI ครบทุกตัวแล้ว (design done)** · เพิ่งแตกงาน build เป็น 3 คลื่น + ส่ง prompt **dev คลื่น 1 (Shell + StudioDock)** ไปแล้ว · ตอนนี้ = รอ dev คลื่น 1 รายงาน แล้วผมสั่ง merge

## 3. ถึงไหนแล้ว / เหลืออะไร
- **เสร็จ:** US/DS ครบ 5 คู่ (shell/editor/viewer/highlight/dock) · prototype dock กดได้ 3 โหมด (verified desktop+mobile จริง) · sync backlog 16 แถว + status ให้ตรง · เคาะดีไซน์ dock กับพี่เอมจบ (หุบ/โปร่ง/customizable/dynamic overflow)
- **เหลือ:** build ps4 — **คลื่น 1 กำลัง build** (dev เริ่มแล้ว) · คลื่น 2 (editor + โน้ต/แสดงผล ขนาน) · คลื่น 3 (รวม+ทดสอบ)

## 4. ไฟล์รายละเอียดอยู่ไหน
- สเปก: `docs/us/ps3-{shell,editor,viewer,highlight,dock}.md` + `docs/ds/` ชื่อเดียวกัน (มีครบ ตรวจแล้ว)
- prototype: `docs/design/ps2-studio-prototype.html` (②③④) · `docs/design/ps3-dock-prototype.html` (dock 3 โหมด)
- แถว backlog: B003 B005 B006 B007 B008 B009 B010 B011 B012 B016 B017 B021 B022 B023 B024 B025 (สถานะ = in-US ทุกตัว ยกเว้น B023=done)
- status สาย ps3: `docs/status.md` ส่วน "🔮 Sprint 3" + "🔨 Sprint 4"

## 5. คุณเป็นเจ้าของไฟล์ไหน
- **SA (ผม):** `docs/us|ds/ps3-*` · prototype 2 ไฟล์ · แถว backlog UI ของผม · `docs/status.md` บรรทัด ps3 UI · standup นี้ · **ไม่มี branch โค้ด** (SA ไม่เขียนโค้ด)
- **dev คลื่น 1 (แยก session):** เจ้าของ `ShellBar.vue · App.vue · router.js · StudioDock.vue(ใหม่) · EditorMode.vue(ถอด dock)` บน branch **`wt-shell`** · worktree `../pleng-shell` · port **5311**

## 6. ติด / รออะไรอยู่
- **รอ dev คลื่น 1** เขียน `docs/reports/wt-shell.md` → ผมอ่านจาก git แล้วเช็ก DoD (AC + unit test) ก่อนสั่ง merge เข้า `studio-shell-redesign`
- ความคืบหน้า dev: worktree `wt-shell` มี commit `bd18c97` (StudioDock extract) แล้ว · **ยังไม่เห็น report + ส่วน shell** → ยังไม่พร้อม merge
- ไม่มี blocker ค้างพี่เอม (ดีไซน์เคาะครบแล้ว)

## 7. จุดต่อกับคนอื่น
- **sa-jianpu (B026 lint · B027 จุดคู่):** build แตะ `notation.js · midi.js · NoteRow.vue` ทับสาย build คลื่น 2 (โน้ต/แสดงผล) → ต้องจัดลำดับ/แยก worktree ตอนลงมือ
- **dev คลื่น 1 กำลังแก้ `EditorMode.vue` (ถอด dock engine)** → สาย editor (คลื่น 2) ต้อง **rebase หลัง wt-shell merge** ก่อนเริ่ม
- **B028 audit-log (ธีมใหม่ · ไม่ใช่ผม):** ต่อจุด build ที่ WT-D รอบ2 (ส่งตรวจ/อนุมัติ) + "ปุ่มดูประวัติ" บนจอ (เป็น UI = แตะสาย ps3sa ตอนนั้น) · ตอนนี้แค่ออกแบบรอ

## ⚠️ จุดที่เอกสารไม่ตรงกับของจริง
1. **`backlog.md` B003 โยงไปเก่า** — เขียน `US-I5 (รอ WT-D)` แต่ไม่มีไฟล์ชื่อนั้น · ของจริง B003 (ตัดเมนูเลือกเพลงซ้ำ) ถูกคลุมใน `us/ps3-editor` (ส่วน "รวม I5") + shell S2 · **ควรแก้ลิงก์เป็น `ps3-editor` / `ps3-shell`** (ยังไม่แก้รอบนี้เพราะกติกา PM = commit เฉพาะ standup)
2. **`status.md` แผน ps4 ยังเป็นแผนเดิม** — บรรทัด "4 epic: ① Shell(5311) … ④ Highlight(5314)" คือแผนก่อนเคาะ dock · ของจริง = **3 คลื่น** (คลื่น 1 = Shell+StudioDock บน wt-shell/5311 **กำลัง build**; คลื่น 2 = editor + โน้ต/แสดงผลขนาน; คลื่น 3 = รวม+ทดสอบ) · dock (B021/22/24/25) ไม่อยู่ใน 4-epic เดิม · **ควร sync แผน ps4**
3. **wt-shell กำลัง build แต่ status/backlog ไม่บันทึก** — worktree + commit `bd18c97` มีจริง แต่ status.md ยังไม่มีร่องรอยว่าคลื่น 1 เริ่มแล้ว (standup นี้คือแหล่งที่บอก)
