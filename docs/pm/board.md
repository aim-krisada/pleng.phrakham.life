# PM board — pleng (verified snapshot)

กระดานที่ PM "ยืนยันแล้ว" ด้วย triangulation: **standup ของ session ↔ เอกสาร ↔ git/เทสต์จริง**
(ไม้ต่อสำหรับ PM session หน้า — อ่านไฟล์นี้แล้วรู้ว่ากระดานตรงกับความจริงถึงไหน)

อัปเดตล่าสุด: 2026-07-09 · PM session = **debug pl2 round 1**

## 🎯 PM session ปัจจุบัน (routing — สำคัญ)
**สายที่ PM สั่งงาน = รายงานกลับ "PM session ปัจจุบัน" ที่ระบุตรงนี้** (PM หมุน session ไปเรื่อยๆ · อย่า hardcode ชื่อสายในprompt)
- **ตอนนี้ = `debug pl2 round 1`** (แทน `pm ต้นแบบ pl2` ที่เลิกใช้แล้ว)
- **วิธีรายงานเสร็จของ dev/SA (session-agnostic):** (1) เขียน `docs/reports/<branch>.md` · (2) เพิ่มบรรทัดใน 📥 inbox ล่าง · (3) ping PM session ปัจจุบัน (ชื่อด้านบน) · ถ้า PM สายนั้นปิด → PM สายใหม่อ่าน inbox เจอเอง
- **เวลา PM หมุนสายใหม่:** อัปเดตชื่อบรรทัดนี้ทันที

## 📥 PM inbox (สายเสร็จ → รอ PM ตรวจ DoD)
| สาย/branch | commit | สถานะ | PM |
|---|---|---|---|
| dock-polish `wt-dock2` | `5587d44` | ✅✅ **MERGED เข้าฐาน** (wt-dock2 ครบ) — **A** popup viewport-clamp (core · ทุก popup) · **C** sing เรียงใหม่+เอา chord ออก · **B ยกเลิก+revert** (blend กลับเป็น built-in · transparency ไปแผงตั้งค่า B043) · ฐาน 113/113 · build ✅ · dock-core session ปิดได้ | debug pl2 r1 ✅ merged |
| dock-core `wt-dock` | `a661df9` | ✅✅ **MERGED เข้าฐาน** (merge `5656149`) — รอบ 1-3 verified ครบ (FAB in-place · WCAG 7.1:1 · ⋯ ขวาสุด · transparency+blur ผูก slider · display badge · D8 config API · print เข้า dock) · **ฐานหลัง merge: 113/113 เขียว · build ผ่าน** (verify ด้วย `--exclude .claude/**` กัน vitest กวาด worktree ซ้อน) · **gate ปลดล็อกแล้ว → B038/B039 พร้อมจ่าย** · worktree/session dock-core = ปิด/ลบได้ | debug pl2 r1 ✅ merged | · test 113/113 · build · แก้ 5 จุด: (1) ปุ่มลอยอยู่จุดที่กด ✅ (2) WCAG contrast 7.1:1 ✅ (3) ⋯ ขวาสุด ✅ (4) **transparency PM ตรวจเองในเบราว์เซอร์ = ทำงาน (α 0.92→0.58 ตอนขยับ slider) → ที่ P'Aim เห็นพัง = บิลด์เก่า/cache** ✅ (5) "แสดงผล" โชว์ badge + dock กว้าง 700 ✅ · **merge นี้ = gate ปลดล็อก B038/39/41** · ⚠️ merge มี doc conflict (backlog/board/brief-dock-core · wt-dock fork ก่อน PM commits) → PM เคลียร์เอง | debug pl2 r1 ✅ |
| **B043 dev `wt-b043-dev`** | `77629e1` | ✅ **เฟส 1 เสร็จ · PM DoD-verified — รอ P'Aim accept (LAN 5323) ก่อน merge** · music dock: `SingTransport.vue` (transport core ผ่าน D8 top-region) + ⚙panel inline+pin + selector Gmail · ตัด .section-bar · B038 · B042 · v1=เงียบ · **test 134/134 · build · music dock renders · การ์ดเก่าตัด · ไม่มี console error** · ⚠️ **auto-scroll ตามพยางค์ = ต้องเทสต์มือถือจริง** (headless พิสูจน์ไม่ได้ · dev+PM ตรวจ unit=target [data-syl] แล้ว) · accept → merge → **เฟส 2** A2 (SongSheet+print PDF) · **P'Aim เทสต์: "icon หายหมด" → PM ตรวจ = ไม่ใช่บั๊ก · controls อยู่ในแผง ⚙ ครบ (โมเดล settings-panel · decision G ปัก transport อย่างเดียว) → default โล่งไป · **P'Aim เคาะ layout (sketch): 2 แถว — บน=grip+progress bar (กรอบ) · ล่าง=⚙(ซ้ายสุด)→▶→🔁→ปุ่มปัก · default pin=transport+คีย์+ความเร็ว+แสดงผล · ที่เหลือในแผง ⚙** → ส่ง dev ปรับก่อน accept/merge · **layout FINAL (P'Aim "เอาใหม่"):** (1) **popup ห้ามหลุดขอบ** — แผง ⚙ เด้งขึ้นหลุดขอบบน → ใช้ viewport-clamp ของ dock-polish (flip ลงล่าง) กับแผงตั้งค่าด้วย · (2) ลำดับ: grip มุมซ้ายบน · แถวล่าง = **⚙→⏮→▶→⏭→🔁→คีย์→ความเร็ว→แสดงผล** (ใช้บ่อยไว้หน้า) · (3) **font ออกจาก dock → ไป top nav (ShellBar)** ปุ่ม Aa→popup (A↓ % A↑ + คืนค่าปกติ) แบบ phrakham.life (ref `phrakham.life2/assets/pk-navbar.js`) · ถอด fdown/fup จาก SING_DEFAULT+singTools · global ตอนอ่าน | debug pl2 r1 |
| ↳ B043 dev progress | `77629e1` | ✅ layout 2 แถว + default pin (คีย์/ความเร็ว/แสดงผล) + ความโปร่งเข้าแผง ⚙ · test 138/138 · build (dev verify) · **⏳ ยังเหลือ: font ออกจาก dock → top nav (ข้อความ queued · dev ประมวลต่อ)** → เสร็จครบ PM verify เฟส 1 ตัวจบ → P'Aim ลองรอบเดียว → accept/merge | debug pl2 r1 |
| B043 SA `wt-b043-sa` | `7328363` | ✅ **design ครบ (folded PM inputs 1-6)** — Gmail-select (marker เลือกได้เสมอ · All/None · transport ตาม selection · ไม่เลือก=play all · ฝึกท่อนเดียว=select+▶) · แยก 2 แกน selection≠loop · music dock ล่าง · transport=core reusable ผ่าน D8 · play/pause ไม่มี bg · **decisions เคาะแล้ว (P'Aim 9 ก.ค.):** **A=A2** (แผ่นย่อ รับครั้งเดียว · ⚠️แตะ SongSheet+print ต้อง verify PDF) · **B=เอา** ป้ายรอบ · **G=ตามเสนอ** · **H=ทั้งคู่** (scrub อิสระ + แตะ marker) · **C=ไม่จำ** (แต่ละเพลงเริ่มใหม่ · ว่าง=เล่นทั้งเพลง · เปลี่ยนเพลง=ล้าง) · **F=เงียบ** (v1 ไม่มีท่อน=เล่นทั้งเพลง) · **overflow: selection = Gmail scrollable list** (แยกจาก progress bar · มือถือเปิด sheet) — decisions ครบ 8 (C+F folded `7328363`) → ✅ **SA design เสร็จสมบูรณ์ 100% (12 commit · US+DS+wireframe · docs only)** · wireframe รอบสุดท้าย = `http://10.215.141.98:5402/b043-sing-repeat.html` (demo ท่อนเยอะ 7 · selector list + All/None · progress bar+กรอบ scrub · แผงตั้งค่า) · **รอ P'Aim เปิดดู+เคาะ = gate สุดท้ายก่อน dev** · transport+⚙panel+selector build ได้ (ไม่ผูก A2) · dev ประสาน dock-core (D8) · A2 verify print PDF · **wireframe fix:** เอาลำดับท่อนซ้ำอันบนออก เหลือ progress bar+กรอบ · ทำ select ให้ชัด (คลิก label=select · All/None) · SA ปรับ→wireframe รอบใหม่ให้ P'Aim ดู · **+ settings-panel 2 ชั้น (6c) folded** (⚙ = ทุก setting ปรับ inline แม้ไม่ปัก · slider ความโปร่งในแผง) · **+ overflow ท่อนเยอะมือถือ** (แยก selection เป็นรายการเลื่อน Gmail · progress bar ไม่รับภาระเลือก) · transport+settings **build ได้แล้ว** (G+H เคาะ · ไม่ผูก A) รอ wireframe รอบใหม่ P'Aim เคาะ → dev · **⚠️ dev หลัง dock-core merge + ประสาน** (แตะ SongViewer+StudioDock+DownloadTool) | debug pl2 r1 |

> ▶ **RESUME (PM session ใหม่ อ่านนี่ก่อน):** สวมบท PM ต่อ → อ่าน `docs/pm/pm.md` (ไม้ต่อครบ) + memory `pleng-pm-role` + ไฟล์นี้
> **โฟกัสตอนนี้:** ✅ **คลื่น 1 (shell + StudioDock) merged เข้าฐานแล้ว** — B033/B034 fixed · unit 81/81 · build ผ่าน · P'Aim accept (LAN test มือถือจริง)
> **✅ คลื่น 2 + 3 เสร็จ (9 ก.ค.):** 3 สาย (E-editor / V-viewer / H-highlight) build overnight → **PM รวมเข้าฐานครบ** (merge เรียง editor→viewer→highlight · เคลียร์ conflict Icon/SongViewer/SongSheet/play.test มือ) · **unit 110/110 · build ผ่าน · verify เบราว์เซอร์:** editor รื้อใหม่+dock 3แถว · ฝึกร้อง control bar+ไฮไลต์รายพยางค์ 250 span · ไม่มี console error
> **ถัดไป:** (1) **P'Aim ทดสอบ + เคาะ design ที่ 3 สาย flag** (ดูส่วนล่าง) · (2) **N1** dock ซ้อน 2 instance (โชว์ตัวเดียว · ไม่ใช่บั๊กผู้ใช้) = cleanup ยก StudioDock ขึ้น Studio เมื่อว่าง · (3) เรื่องค้างเดิม ③ sync docs · ① DA · ② lint เข้าฐาน
>
> ▶ **รอบ real-use debug #1 (9 ก.ค. · session "pm ต้นแบบ pl2"):** P'Aim ลองใช้จริง → เก็บบั๊กที่ `docs/pm/realuse-bugs.md` (หลักฐานภาพ `docs/pm/realuse-assets/`)
> · ✅ **PM แก้ตรง (จิ๋ว):** B036 favicon (`13e5714`) · B037 dock drag desktop (`ddcb63f`, `.sd-dock` static) · icon ท่อนฮุก→fishing-hook (`eac9783`)
> · 🚚 **รอจ่าย batch (ยังไม่ส่ง — P'Aim อยากรวบ):** B038 auto-scroll ต้องตรงพยางค์→H-highlight · B039 เมนู download ค้าง + B041 ลบปุ่มพิมพ์ซ้ำ→V-viewer
> · 🧩 **dock-core (ใหญ่):** FAB ปุ่มลอยตอนยุบ + รวม StudioDock เป็น instance เดียว (=N1) · brief=`docs/pm/brief-dock-core.md` · **spawn_task chip หย่อนแล้ว** (P'Aim กดเปิด session `dev-dock-core` · branch `wt-dock` · port 5315) · desktop ก่อน
> · เคาะแล้ว: 5 โหมดแสดงผล (เก็บ "เนื้อ+โน้ต") · loop→backlog B040 (V3) · design 1a fishing-hook · highlight โทนสี OK
> · **แผน dispatch (collision-aware · P'Aim ยืนยัน 9 ก.ค. = งานหลัก PM):** จัดลำดับตามไฟล์ที่แตะ กันชน `SongViewer.vue`
>   - 🟢 **ขนานตอนนี้:** dock-core (รัน · แตะ StudioDock/Studio/EditorMode/SongViewer-mount) + **B043 SA** (chip `task_140f3eca` หย่อนแล้ว · เขียนแค่ docs = ไม่ชน · **ขอบเขตขยาย = music-player transport bar · ยุบ B042 เข้ามาแล้ว**)
>   - 🟡 **รอ dock-core merge ก่อน แล้วยิงทีเดียว 1 session:** B038 + B039 + B041 (แตะ `SongViewer.vue`/`DownloadTool.vue` · B038/41 ชน dock-core ที่ SongViewer → ต้องรอ) · ~~B042~~ ย้ายไป B043 (SA)
> · **กฎใหม่ (P'Aim 9 ก.ค.):** PM = จัดงาน+ส่งงานอย่างเดียว **ไม่โค้ดเอง** (ให้ขนานเร็ว) · ดู memory `pleng-pm-role`
> · **สถาปัตยกรรม (P'Aim 9 ก.ค.):** dock/แถบควบคุม = **ของกลางเจ้าของเดียว = dock-core** · เป้าหมาย = ทำเป็น **library กลาง config ต่อหน้าได้** (generic รับ control ที่ไม่ใช่แค่ปุ่ม) · ถ้าสำเร็จ → transport bar ของ B043 หน้าฝึกร้อง **config เองได้ ส่งสายฝึกร้องทำ ไม่ชน** · ถ้าไม่ → เป็นงาน dock-core (กระทบทุกหน้า) · แจ้ง dock-core เป็น design-constraint แล้ว
> · **ค้างรอ P'Aim:** เล่นหาบั๊กเพิ่ม (รอบ #2) · dock-core + B043 SA เสร็จเมื่อไหร่ PM ตรวจ DoD/พาdesign ให้ P'Aim review
>
> ▶ **UPDATE (ช่วงบ่าย 9 ก.ค.):** ✅ **dock-core MERGED เข้าฐาน** (merge `5656149` · FAB+unify+D8 config API+transparency/blur+print-in-dock · ฐาน 113/113 · build) · **ต่อไป:** จ่าย B038 (scroll ตรงพยางค์) + B039 (download menu ค้าง) ได้แล้ว (dock-core gate เปิด) · B041 print = จัดการใน dock-core แล้ว (verify ตอนจ่าย batch) · **B043** design ครบ รอ P'Aim เคาะ 7 decision (A แผ่เต็ม/ย่อ) → dev หลังจากนี้ · **cleanup ค้าง:** worktree ซ้อนใต้ `.claude/worktrees/` ทำให้ vitest จาก main กวาดเจอ (verify merged ต้อง `--exclude '**/.claude/**'`) · ลบ worktree dock-core ได้แล้ว

## 🎨 design ที่ dev flag รอ P'Aim เคาะ (wave 2 · ไม่บล็อก)
- **Editor:** ~~ไอคอน "ท่อนฮุก" ใช้ ⚓ (anchor · Lucide ไม่มี hook) โอเคไหม~~ → ✅ **เคาะแล้ว (9 ก.ค.): ใช้ `fishing-hook`** (มีจริงในชุด Lucide เต็ม · PM แก้ตรง commit `eac9783`) · ยังเหลือ: ราย "ห้อง" ยังเก็บ ⋯ (ย้าย/สำเนา/ลบ/volta) — ซ่อนลึกกว่านี้ไหม
  > **กฎถาวร (P'Aim 9 ก.ค.):** ทุกโปรเจกต์หาไอคอนจาก `OneDrive/.../references/svg-icon-lucide/icons/` (1,745 ตัว) ก่อน อย่าเดาว่า Lucide ไม่มี — ดู memory `reference_lucide_icons`
- **Viewer:** **โหมดแสดงผล 5 vs 4** → ตัวต่างคือ **"เนื้อ+โน้ต"** (เนื้อ+โน้ตตัวเลข ไม่มีคอร์ด) · โค้ด+`us/ps3-dock` = 5, `us/ps3-viewer` = 4 (สเปก 2 ไฟล์ขัดกัน) → ✅ **เคาะแล้ว (9 ก.ค.): เก็บ 5** · sync `us/ps3-viewer.md` เป็น 5 แบบแล้ว · ~~คงปุ่มพิมพ์~~ → ✅ **เอาออก (B041)** ซ้ำเมนู download · ~~loop~~ → ✅ **ยกเป็น V3 (backlog B040)**
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
