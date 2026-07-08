# PM board — pleng (verified snapshot)

กระดานที่ PM "ยืนยันแล้ว" ด้วย triangulation: **standup ของ session ↔ เอกสาร ↔ git/เทสต์จริง**
(ไม้ต่อสำหรับ PM session หน้า — อ่านไฟล์นี้แล้วรู้ว่ากระดานตรงกับความจริงถึงไหน)

อัปเดตล่าสุด: 2026-07-08 · PM session รอบที่ 1

> ▶ **RESUME (PM session ใหม่ อ่านนี่ก่อน):** สวมบท PM ต่อ → อ่าน `docs/pm/pm.md` (ไม้ต่อครบ) + memory `pleng-pm-role` + ไฟล์นี้
> **โฟกัสตอนนี้:** ✅ **คลื่น 1 (shell + StudioDock) merged เข้าฐานแล้ว** — B033/B034 fixed · unit 81/81 · build ผ่าน · P'Aim accept (LAN test มือถือจริง)
> **✅ คลื่น 2 + 3 เสร็จ (9 ก.ค.):** 3 สาย (E-editor / V-viewer / H-highlight) build overnight → **PM รวมเข้าฐานครบ** (merge เรียง editor→viewer→highlight · เคลียร์ conflict Icon/SongViewer/SongSheet/play.test มือ) · **unit 110/110 · build ผ่าน · verify เบราว์เซอร์:** editor รื้อใหม่+dock 3แถว · ฝึกร้อง control bar+ไฮไลต์รายพยางค์ 250 span · ไม่มี console error
> **ถัดไป:** (1) **P'Aim ทดสอบ + เคาะ design ที่ 3 สาย flag** (ดูส่วนล่าง) · (2) **N1** dock ซ้อน 2 instance (โชว์ตัวเดียว · ไม่ใช่บั๊กผู้ใช้) = cleanup ยก StudioDock ขึ้น Studio เมื่อว่าง · (3) เรื่องค้างเดิม ③ sync docs · ① DA · ② lint เข้าฐาน

## 🎨 design ที่ dev flag รอ P'Aim เคาะ (wave 2 · ไม่บล็อก)
- **Editor:** ~~ไอคอน "ท่อนฮุก" ใช้ ⚓ (anchor · Lucide ไม่มี hook) โอเคไหม~~ → ✅ **เคาะแล้ว (9 ก.ค.): ใช้ `fishing-hook`** (มีจริงในชุด Lucide เต็ม · PM แก้ตรง commit `eac9783`) · ยังเหลือ: ราย "ห้อง" ยังเก็บ ⋯ (ย้าย/สำเนา/ลบ/volta) — ซ่อนลึกกว่านี้ไหม
  > **กฎถาวร (P'Aim 9 ก.ค.):** ทุกโปรเจกต์หาไอคอนจาก `OneDrive/.../references/svg-icon-lucide/icons/` (1,745 ตัว) ก่อน อย่าเดาว่า Lucide ไม่มี — ดู memory `reference_lucide_icons`
- **Viewer:** **โหมดแสดงผล 5 vs 4** → ตัวต่างคือ **"เนื้อ+โน้ต"** (เนื้อ+โน้ตตัวเลข ไม่มีคอร์ด) · โค้ด+`us/ps3-dock` = 5, `us/ps3-viewer` = 4 (สเปก 2 ไฟล์ขัดกัน) → **รอ P'Aim เคาะเก็บ 5 หรือตัดเหลือ 4** (PM แนะเก็บ 5 · มีประโยชน์สำหรับคนอ่านโน้ตแต่ไม่เล่นคอร์ด) · ~~คงปุ่มพิมพ์~~ → ✅ **เอาออก (B041)** ซ้ำเมนู download · ~~loop~~ → ✅ **ยกเป็น V3 (backlog B040)**
- **Highlight:** ~~สีคาราโอเกะ (คำ=พื้นน้ำตาลตัวขาว · โน้ต=พื้นจางเลข brand)~~ → ✅ **เคาะแล้ว (9 ก.ค.): โทนสี OK** · ~~auto-scroll ระดับ segment~~ → ❌ **P'Aim ไม่รับ: ต้องเลื่อนตรงพยางค์จริง** (สังเกตว่าตอนนี้ไม่ตรง) = **B038 จ่าย H-highlight** (เปลี่ยน scroll ให้เล็ง `playingSyl`/`[data-syl]` แทน `playingSeg`)
> **ถัดไป:** editor redesign คลื่น 2 (ครอบ B032/B035) + highlight (B029) = build ตาม `ps2-studio-prototype.html` · เรื่องค้างเดิม (③ sync docs status ps4 · ① DA 3 เรื่อง · ② lint เข้าฐาน) ทำต่อได้เมื่อพร้อม

**Legend:** ✅ ยืนยันตรง 3 แหล่ง · ⚠️ ต้องเคลียร์/ตัดสิน · ⏳ ยังไม่รายงาน

## 🧪 ps4-shell — ผลทดสอบใช้จริง (P'Aim · 8 ก.ค.)
dev ps4-shell เสร็จ → P'Aim ลองใช้เอง (= gate real-use test):
| หน้า/โหมด | ผล | หมายเหตุ |
|---|---|---|
| ฝึกร้อง | ❌ 2 บั๊ก | **B029** ไฮไลต์ไม่ไล่ทีละพยางค์ · **B030** dock (แถบคีย์โน้ต) ไม่แสดง |
| แผ่นเพลง | ✅ ผ่าน | — |
| แก้ไข | ❌ 4 บั๊ก | **B031** แถบเมนูวางไม่เหมือนอีก 2 โหมด · **B032** ไม่มีปุ่ม "ลบท่อน" · **B033** dock key เลื่อนไม่ได้ · **B034** dock ซ่อนแล้วโชว์กลับไม่ได้ |
| dock (ร่วม) | ❌ | B030 (ฝึกร้อง ไม่แสดง) · B033 เลื่อนคีย์ไม่ได้ · B034 toggle ซ่อน/แสดงเสีย — StudioDock (wave1) มีปัญหาหลายจุด |

**⚠️ scope ยืนยัน (git):** dev ps4-shell = **คลื่น 1 = shell + StudioDock เท่านั้น** → แยกผลเป็น 2 กลุ่ม:
**✅ sa-ps3 ตรวจแล้ว (repro จริง port 5311) — verdict:**
| id | verdict | รุนแรง | ทำที่ไหน |
|---|---|---|---|
| B034 | บั๊กจริง (toggle หุบเสีย desktop) | **สูง** | **dev คลื่น 1 (wt-shell) แก้ได้เลย · ชัด** |
| B033 | บั๊กจริง (21 คีย์แออัด · ไม่ scroll) | **สูง** | **รอ P'Aim เคาะทิศ** (scroll / ลดคีย์ / 2 แถว) → dev |
| B031 | บั๊กจริง (แถบบน edit ไม่มี "เพลง ▾") | กลาง | คลื่น 2 (editor rebase · unify + B003) |
| B030 | ไม่ใช่บั๊ก (dock sing/print ยังไม่ mount) | — | คลื่น 2 |

heads-up: **N1** dock จะซ้อนตอนคลื่น 2 (ต้องยก StudioDock ขึ้นระดับ Studio) · **N2** infra: เปิด `localhost:5311` (ไม่ใช่ 127.0.0.1 · IPv6)
**ยังไม่ build (ไม่ใช่บั๊ก):** B029 highlight · B032+B035 editor redesign = คลื่น 2
**สถานะ:** ✅ **คลื่น 1 merged เข้าฐาน `studio-shell-redesign`** (dev `0652087` · PM ตรวจ DoD: unit 81/81 + build ผ่าน + P'Aim accept LAN test) · B033/B034 = done · wt-shell worktree ค้างไว้ให้ทดสอบ (5311/5321) — ลบตอนเริ่มคลื่น 2
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
