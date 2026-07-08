# PM board — pleng (verified snapshot)

กระดานที่ PM "ยืนยันแล้ว" ด้วย triangulation: **standup ของ session ↔ เอกสาร ↔ git/เทสต์จริง**
(ไม้ต่อสำหรับ PM session หน้า — อ่านไฟล์นี้แล้วรู้ว่ากระดานตรงกับความจริงถึงไหน)

อัปเดตล่าสุด: 2026-07-08 · PM session รอบที่ 1

> 🅿️ **PARKED (พี่เอม 8 ก.ค.):** ทุกสาย**พักไว้**จนกว่า app ใหม่ (ps4-shell) จะเสร็จ + ลองใช้จริงระดับหนึ่งก่อน แล้วค่อย**ทะยอยทำ**. เรื่องค้างทั้งหมด (③ sync docs · ① DA 3 เรื่อง · ② lint เข้าฐาน) **เลื่อนไปหลัง ps4-shell ใช้งานได้**. ระหว่างนี้ทีมโฟกัสที่ dev ps4-shell อย่างเดียว.

**Legend:** ✅ ยืนยันตรง 3 แหล่ง · ⚠️ ต้องเคลียร์/ตัดสิน · ⏳ ยังไม่รายงาน

## 🧪 ps4-shell — ผลทดสอบใช้จริง (P'Aim · 8 ก.ค.)
dev ps4-shell เสร็จ → P'Aim ลองใช้เอง (= gate real-use test):
| หน้า/โหมด | ผล | หมายเหตุ |
|---|---|---|
| ฝึกร้อง | ❌ 2 บั๊ก | **B029** ไฮไลต์ไม่ไล่ทีละพยางค์ · **B030** dock (แถบคีย์โน้ต) ไม่แสดง |
| แผ่นเพลง | ✅ ผ่าน | — |
| แก้ไข | ❌ 4 บั๊ก | **B031** แถบเมนูวางไม่เหมือนอีก 2 โหมด · **B032** ไม่มีปุ่ม "ลบท่อน" · **B033** dock key เลื่อนไม่ได้ · **B034** dock ซ่อนแล้วโชว์กลับไม่ได้ |
| dock (ร่วม) | ❌ | B030 (ฝึกร้อง ไม่แสดง) · B033 เลื่อนคีย์ไม่ได้ · B034 toggle ซ่อน/แสดงเสีย — StudioDock (wave1) มีปัญหาหลายจุด |
→ รวบเป็น brief ส่ง sa-ps3 (review + ยืนยัน + สเปกแก้)

## สายงาน (roster + สถานะ verify)
| สาย | active | standup | verify |
|---|---|---|---|
| `dev-ps4-shell` | 🟢 ทำงาน | ⏳ (เห็นผ่าน sa-ps3) | ✅ commit `bd18c97` จริง |
| `sa-ps3` | ⚪ ว่าง | ✅ ส่งแล้ว | ✅ ตรง 3 แหล่ง (+3 doc-drift) |
| `sa-jianpu-rules` | ⚪ ว่าง | ✅ ส่งแล้ว | ✅ ตรง 3 แหล่ง (+1 ความเสี่ยง build) |
| `sa-log-system` | ⚪ ว่าง | ✅ ส่งแล้ว | ✅ ตรง 3 แหล่ง |
| `da-import-songs` | ⚪ ว่าง | ✅ ส่งแล้ว | ✅ ตรง (แต่งานอยู่นอก git) |

---

## ⚠️ ต้องพี่เอมตัดสิน / PM จัดการ (รวมหัวข้อสำคัญ)

### A. DA นำเพลงเข้า — รอพี่เอมเคาะ 3 เรื่อง + งานอยู่นอก git
- **นำเข้าคลังจริง = 0 เพลงจากรอบนี้** (seed ยัง staged ใน OneDrive · ยังไม่ run เข้า Supabase)
- **งานทั้งหมดอยู่ OneDrive ไม่ใช่ repo** → PM/git มองไม่เห็น = traceability gap (ISO 29110) · ไม่มี backlog id/US/DS
- **ค้นพบใหญ่:** PDF เป็น text จริง → parser อ่านทั้งเล่ม 84 เพลงอัตโนมัติ (ไม่ต้อง vision) → **`docs/importing-songs.md` ล้าสมัย** (playbook เก่าบอก ARM ทำไม่ได้)
- **3 เรื่องรอเคาะ:** (1) ย้าย tool+data เข้า repo ไหม (2) verify ก่อน/import ก่อน (3) เพลงไหนก่อน + พี่เอม run SQL เอง (DA เขียน DB ไม่ได้)

### B. ความเสี่ยง ps4 (จาก sa-jianpu) — ไฟล์ lint อยู่ผิด branch
- `src/lib/notationLint.js` + เทสต์ (21 ผ่าน) อยู่ **บน `main` เท่านั้น** · ฐาน `studio-shell-redesign` **ยังไม่มี** (base ตามหลัง main **7 commit**)
- → ตอน build editor (ps4) ต้อง **เอา notationLint เข้าฐานก่อน** (merge `main`→base หรือ cherry-pick) ไม่งั้น build ไม่เจอไฟล์
- **PM action:** จัดเข้าลำดับ ps4 (ยังไม่ทำตอนนี้ · เฟส design)

### C. เอกสารกระดานล้าสมัย (จาก sa-ps3) — PM ขอ sync
1. `status.md` แผน ps4 ยังเป็น "4 epic เดิม" · ของจริง = **3 คลื่น** (คลื่น 1 Shell+StudioDock กำลัง build) + dock (B021/22/24/25) ไม่อยู่ในแผนเก่า
2. `backlog.md` B003 โยงไป `US-I5` (ไม่มีไฟล์) · ควรเป็น `ps3-editor`/`ps3-shell`
3. `status.md`/`backlog.md` ยังไม่บันทึกว่าคลื่น 1 (`wt-shell`) เริ่ม build แล้ว

---

## รายสายที่ยืนยันแล้ว (หลักฐาน)

### dev-ps4-shell 🟢 — build ps4 คลื่น 1 (Shell + StudioDock)
- worktree `../pleng-shell` · branch `wt-shell` · port 5311 · commit `bd18c97` "extract shared StudioDock from EditorMode" ✅ (git ยืนยัน)
- ยังไม่มี `docs/reports/wt-shell.md` + ส่วน shell ยังไม่เสร็จ → **ยังไม่พร้อม merge** (sa-ps3 จะเช็ก DoD ก่อนสั่ง merge)

### sa-ps3 — UI redesign ✅ VERIFIED
- design done (US/DS 5 คู่ ps3-{shell,editor,viewer,highlight,dock} มีครบ · prototype dock 3 โหมด) · แตกงาน build 3 คลื่น · คลื่น 1 อยู่กับ dev
- doc-drift 3 ข้อ → ดูหัวข้อ C
- จุดต่อ ps4: dev คลื่น 1 แก้ `EditorMode.vue` (ถอด dock) → สาย editor (คลื่น 2) ต้อง rebase หลัง wt-shell merge

### sa-jianpu-rules — กฎทำเพลง ✅ VERIFIED
- B026 (7 กฎ lint · spike R1-R3 บน main · เทสต์ 21 ผ่าน) + B027 (จุดคู่) · US/DS ครบ · approved · freeze ที่ design (พี่เอมสั่งยังไม่ dev)
- git ยืนยัน: notationLint บน main ✅ · ไม่บน base ✅ · base ตามหลัง main 7 commit ✅ → ความเสี่ยง build หัวข้อ B
- จุดต่อ ps4: B027 แตะ shared `notation.js·midi.js·NoteRow.vue·Guide.vue` ทับสาย editor ของ ps3sa → นัดลำดับ/แยก worktree ตอน build

### sa-log-system — B028 audit log ✅ VERIFIED (รอบ 1)
- US เสร็จ (`docs/us/audit-log.md`) · DS ยังไม่เขียน (ถูกต้อง) · **พี่เอมสั่งรอ ps4-shell เสร็จก่อนค่อยเขียน DS** (จะได้เห็นของจริงว่าต่อกับอะไร)
- git ยืนยัน: ds ไม่มีจริง ✅ · US commit `4d28f5c` ✅ · B028 ใน backlog (ติด commit ps3sa `1549aa9`) ✅
- ยังไม่อยู่บนกระดานสปรินต์ → ควร slot ps4 (คู่ WT-D รอบ2)

### da-import-songs — Data Analyst ✅ VERIFIED (งานอยู่นอก git)
- git ยืนยัน: OneDrive `.../pleng.phrakham.life/{tools,song-data,song-picture}` มีจริง · **ไม่มี artifact ใน git repo** ✅ (traceability gap ยืนยัน)
- ดูหัวข้อ A สำหรับสิ่งที่รอเคาะ
