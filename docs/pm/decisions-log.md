# Decisions log — เพลง.พระคำ.ชีวิต (append-only · ทีละบรรทัด · ที่มาที่ไปแบบอ่านครั้งเดียวจบ)

> มติ + เหตุผล ทีละบรรทัด (ใหม่สุดล่างสุด) · แทน transcript · PM/พี่ใดก็อ่านที่มาที่ไปได้โดยไม่รื้อประวัติ

## รูปแบบ: `YYYY-MM-DD · มติ — เพราะ`

- 2026-07-22 · **home/nav (สาย 2) merge เข้า base** — gate ผ่าน (759 เทสต์ · verify live ธีม/footer/i18n · อยู่ในเลน)
- 2026-07-22 · editor merge target = **`editor-usability`** ไม่ใช่ `claude/peaceful-bhaskara` — อันหลังเป็น docs เก่าไม่มี impl
- 2026-07-23 · lyric-align **ไม่รื้อ SongSheet ใหม่** (musical-moment) — ปรึกษา G + scoping พบว่าจะพัง beam/slur ที่ ship แล้ว (B110/B118) เสี่ยงสูง คุ้มน้อย
- 2026-07-23 · **P0 grid align** (pin คำใต้โน้ต) ทำแล้ว `a343571` — reuse ~45 บรรทัด ไม่แตะ `.note-row`
- 2026-07-23 · **P2 melisma slur = ทำ** — โน้ตว่าง=held ต้องมีเส้นโค้ง (มาตรฐาน jianpu · G ยืนยัน) · reuse engine B062/B118 · **derive จาก blank-run ก่อน · ⛔ ไม่ re-import**
- 2026-07-23 · **คอร์ดเข้าชุด alignment** — pin เหนือโน้ต ชิดซ้าย (มุมซ้าย=โน้ตที่เริ่มคอร์ด · เพราะคอร์ดยาว C#dim/G7 จัดกลางเบี้ยว)
- 2026-07-23 · **songbook เนื้อล้วน = ไหลต่อเนื่อง DEFAULT ไม่มี toggle** (พี่เปายืนยัน) — ข้อ=ย่อหน้าใหม่ · ตัดที่จบวลี · คั่น=เว้นวรรค (ผู้สูงอายุตาไม่ดี) · density=auto · ท่อนรับแยก+(รับ) · = หน้ากากแบบโบสถ์ไทย
- 2026-07-23 · **สถาปัตย์ = SSOT สากล + output ≥2 format** (สากล / โบสถ์ไทย) — ยืนยันจาก `บทวิเคราะห์-สถาปัตยกรรม.md` (พี่+G ตกผลึก)
- 2026-07-23 · **เลือกขนาดกระดาษพิมพ์ได้** (B121)
- 2026-07-23 · **PM mode = จ่ายงาน+อ่านสรุปเท่านั้น** · สมอง PM บน disk (`docs/pm/`) · re-spawnable · verify จ่าย Tester
- 2026-07-23 · **backlog คงที่ `docs/backlog.md`** (กล่องกลาง shared) · สมอง PM → `docs/pm/` — ไม่ย้าย backlog เข้า work/ (ผิด flow + คนอื่นหาไม่เจอ)
- 2026-07-23 · **เปิด Tester session ประจำ** (spun) รับงาน verify → verdict 4 บรรทัด · read-only · PM ไม่ verify เอง
- 2026-07-23 · **PM operating model เข้า memory** (`feedback_pm_brain_on_disk` · ⭐⭐) ใช้ทุก PM ทุกโปรเจกต์ · แจ้ง pk pm ทำเหมือนกัน (พระคำ)
- 2026-07-23 · **alignment 3 จุด (คำ/melisma/คอร์ด) PASS** บน `editor-usability` `8c508be` — Tester verify geometry จริง (คอร์ด 0.05px · คำ/เส้น 0.1px · 792 เทสต์) · pre-merge เหลือ: กวาดคลัง over-draw + P'Aim พิมพ์ PDF จริง
- 2026-07-23 · **Tester #2 กวาดคลัง 149 เพลง — ไม่มี over-draw ยักษ์** (98% melisma 2 โน้ตปกติ) · alignment PASS ทุก breakpoint · เจอ artifact `"` 1 จุด + 5 เพลง judgment + 2 minor (B122 arcPlan≥3บรรทัด · B123 shell h-scroll 8px)
- 2026-07-23 · P'Aim เคาะ **(ก) แก้ artifact `"` ก่อน แล้ว merge** — จ่าย editor แก้ render-side (ไม่แตะ DB)
- 2026-07-23 · **พี่เปา: current editor ใส่ไม่ได้ทุกคอร์ด → จ่าย hotfix** (branch `chords-all-standard` จาก main) — engine (`parseChord`) รองรับครบแล้ว แก้แค่ input UI · branch จาก main (base ยังไม่ release · พี่เปาใช้เลย) · deploy รอ P'Aim go + port base
- 2026-07-23 · **render/screenshot SSOT = `C:\gl\CLAUDE.md §4`** (Chromium headless+CDP · ห้าม Edge) — โหลดทุก session ทุกโปรเจกต์ · **ไม่เก็บ memory ซ้ำ** (กัน drift) · 2 PM (pl+pk) ยืนยันปิดเคส
- 2026-07-23 · **5-song melisma eyeball (P'Aim/พี่เปา): 1-3 เอื้อนถูก · 4=เส้นซ้อน(dedup bug) · 5="แห่ง"→โน้ต2 เกิน** → derive ~ดีแต่มี false-positive · จ่าย editor แก้ #4 dedup + #5 (ไม่ลบเส้นถูก 1-3) ก่อน merge
- 2026-07-23 · **#4+#5 = ต้นเหตุเดียว: P2 วาดทับ authored `()` slur** (dedup เดิมเช็คไม่ครบ same-segment) → แก้ dedup (authored slur wins) `0c76e45` · 1-3 (blank-run ไม่มี `()`) ไม่โดนแตะ · **flag: เส้น "แห่ง" ที่เหลือ = authored `(3 2)` เดิม (pre-P2) → รอ P'Aim เคาะว่าจะเอาออกด้วยไหม (กระทบทุกข้อ · ไม่บล็อก merge P2)**
- 2026-07-23 · **คอร์ด hotfix เสร็จ** `8678162` — ComboSelect เพิ่ม allow-custom+validate(parseChord) · 774 เทสต์ · real-browser verify · caveat slash-bass transpose = B124 (pre-existing) · deploy รอ P'Aim go
- 2026-07-23 · **P'Aim GO deploy คอร์ด→main** (deploy หลัง Tester verify · production ต้อง verify)
- 2026-07-23 · ~~song 16 "แห่ง": เอาเส้น authored ออก~~ **❌ ยกเลิก — PM อ่าน P'Aim ผิด** (ดู CORRECTION ล่าง)
- 2026-07-23 · **✅ CORRECTION "แห่ง": ไม่ใช่ over-draw/ลบ — เป็นบั๊กตำแหน่ง: เส้น slur ปลายซ้ายยาวเกิน ล้นเลข "3" ข้ามเส้นบาร์** (เส้นอื่นจบ center เลขพอดี) · P'Aim = "ถ้าผิดให้ทำให้ถูก + ไปดูมาตรฐานเอง" · แก้ = ปลาย slur anchor ที่ center หัวโน้ต (engraving std) · หาต้นเหตุ (โน้ตแรกหลังบาร์ คิด x จากขอบบาร์?) + กวาด blast radius · **บทเรียน: อย่าตีความคำติเรื่อง "ตำแหน่ง/ยาวเกิน" เป็น "เอาฟีเจอร์ออก" — ทำให้ถูกตามมาตรฐาน [[feedback_never_ask_user_what_is_correct]] [[feedback_read_source_spec_before_building]]**
- 2026-07-23 · **Tester PASS both** (chord + melisma dedup) + จับ PM คลาดเคลื่อน 2 จุด: (1) chord validation แค่ root (junk-มี-root ผ่าน)=B125 (2) dedup ลบเฉพาะเส้นที่ทับ authored — tail-melisma (ข้า/ไป/น.) **ยังอยู่** (P'Aim judged 1-3 tail = ถูก แล้ว) · PM's "เหลือ 1 เส้น" จริงเฉพาะบาร์ที่มี authored · **บทเรียน: อย่าป้อน claim ตัวเลขไม่แม่นให้ Tester**
- 2026-07-23 · **พี่เปา: ENTER = เลือก/ยืนยันคอร์ด** → รวมเข้างาน rebase ของ chord session (เลือกไฮไลต์ quick-pick + ยืนยันค่าพิมพ์เอง)
- 2026-07-23 · **slur "แห่ง" geometry = editor แก้เอง `60cfda9`** (ไม่ต้อง spin session ใหม่ · แก้ก่อน context เต็ม): ต้นเหตุ = within-segment slur (`NoteRow` CSS 8%/84% ของกล่อง) พอ P0 seg-grid ทำกล่องกว้างเท่าคอลัมน์=คำ → 8% ตกขอบคอลัมน์ = ล้นซ้าย · แก้ = วัด center หัว-ท้ายโน้ต (เหมือน beam) · blast 94 arc/4 เพลง gap ≤0.1px · 263 เทสต์ · Tester job C verify ก่อน merge
- 2026-07-23 · **§4.5 เสริม (pk pm จับ · P'Aim ratified):** PM **ไม่ส่องโค้ดเองใน session** (แม้ grep/Read เร็วๆ) → read-only investigation = Explore/Agent subagent (คืนข้อสรุป · Agent-tool ใช้ได้ข้อเดียวนี้) · deliverable = spun session · แก้ความขัด point 7
- 2026-07-23 · **PM operating model → กฎกลาง `C:\gl\CLAUDE.md` §4.5** (P'Aim: เพลง+พระคำ แนวเดียวกัน) — สมองบน disk/dispatch-only/Tester/session พอดีตัว/prune/commands/spun-session/seat-แก้ให้ถูกเอง · **prune memory `feedback_pm_brain_on_disk` (SSOT ที่ §4.5)** · live state ยังอยู่ `docs/pm/` ต่อโปรเจกต์ · แจ้ง pk pm ยึด §4.5
- 2026-07-23 · **กฎกลาง §4: ห้ามรบกวน browser/server ที่ P'Aim ใช้อยู่** (P'Aim ratified ผ่าน pk pm · เคส audio-autoplay) — ทุก session (รวม PM serve preview) ใช้ Chromium ของตัวเอง (own port ≠9222 + own user-data-dir) · ห้าม kill ที่เขาดู · render ใหม่=port+URL ใหม่ · **แก้ recipe เดิมด้วย (9222→own port ที่ชนเบราว์เซอร์พี่)** · sync OneDrive · ไม่มี memory dupe
- 2026-07-23 · **deploy คอร์ดติด: origin/main ขยับ ~15 commit** (B118/B110/B113/B108/hooks/pair-sop — deploy รอบที่ local worktree ไม่ได้ fetch) → FF ไม่ได้ · reset+cherry-pick เจอ conflict `EditorMode.vue` (chord vs B118) → **abort · จ่าย chord session rebase onto origin/main + resolve เอง** (production conflict = ไม่ hand-resolve · dispatch)
- 2026-07-23 · **editor merged เข้า base `3a3e618`** (Tester job C slur PASS ก่อน) — code auto-merge สะอาด (B118+editor slur/styles.css region ไม่ชน textual) · conflict แค่ 2 planning doc (task.md/ux-groundup เก็บ base)
- 2026-07-23 · **✅ editor merge gate ปิด — Tester job D PASS:** merged base build ✅ + **804 เทสต์** · slur 3 ชนิดอยู่ร่วมกันถูก (within-seg 0.06px · cross-bar B118 0.05px · melisma dedup เท่าเดิม) · 141 คอร์ด 73/73 + P0 ไม่ถอย · ไม่มี double-arc (1 near-match = false positive ตรวจแล้ว) · **alignment/editor redesign ครบบน base** · main รอ P'Aim go

- 2026-07-23 · **✅ คอร์ด hotfix LIVE production** — chord session rebase onto `b3e747b` (resolve EditorMode imports = เก็บทั้ง parseChord+B118) + ENTER-เลือกคอร์ด (4 เคส) · 809 เทสต์ · PM FF-push `main` `b3e747b→5661068` · **verify live: bundle มี `5661068` + placeholder "พิมพ์เองได้"** = พี่เปาใช้ได้ · ⚠️ main กับ base diverged → port chord เข้า base ก่อน full deploy ครั้งหน้า

## มติล็อกก่อนหน้า (ยกมาไว้อ่านครั้งเดียว)
- ⛔ **ห้าม re-import/bulk-write 120 เพลง** — ทีมแก้ live อยู่ · migration ทำตอน app เสร็จ
- คง **Vue3+Vite** (ไม่ Nuxt/Tailwind) · คง bookshelf หน้าแรก · ripple default · backspace ลบชิด
- **แปล zh/en สุดท้าย** (หลัง string นิ่ง) · **ไม่ release จนเสร็จ** · **main = P'Aim สั่ง go เท่านั้น**
- font = **Hybrid Noto** (UI self-host+subset · เนื้อจีน system CJK) · favorites/playlist **ไม่มี account** · **merge = PM เท่านั้น**
