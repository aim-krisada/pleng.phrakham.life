# HANDOFF — pm28 → pl pm ใหม่ (2026-07-18 ค่ำ)

อ่านไฟล์นี้ + `docs/pm/pm.md` + `docs/pm/board.md` (▶ IN FLIGHT) แล้วทำต่อได้ทันที

---

## 🔴 0. โครงทีมใหม่ (P'Aim สั่ง 18 ก.ค. ค่ำ · ⭐ สำคัญสุด)
**"จากนี้ 1 session ต่อ 1 feature = ทำทั้ง SA + UX + UI + Dev (full-stack owner คนเดียว)"**
- เหตุผล P'Aim: **แยก seat (SA/UX/dev) = ประสานเยอะ · ไม่มีใครเห็น feature ทั้งภาพ · วันนี้ "ยังแย่มาก"** → เลิกแยก · รวมทุกทักษะไว้ที่ 1 session ต่อ feature (เจ้าของ end-to-end · ออกแบบ+เขียนเอง ไม่ต้อง handoff ข้ามสาย)
- **PM (คุณ) = คงบทบาท:** interface P'Aim คนเดียว · จัดคิวไฟล์ · gate · deploy · ไม่ code · **ห้ามถามอะไรถูก/ออกแบบให้ถึงระดับโลก**
- **Tester = P'Aim ไม่ได้พูดถึงในการรวม** → default คงเป็น QA gate แยก (P'Aim เน้น tester verify · PM ไม่ทดสอบเอง) · **ถ้าไม่ชัดถาม P'Aim ว่า tester รวมด้วยไหม**
- เลิกโมเดลเดิม: 3 seat ถาวร (เช้า 18) → รวม SA+UX (บ่าย 18) → **ตอนนี้ = 1 session/feature ครบทุกอย่าง** (memory `pleng-roster-3-seats` อัปแล้ว)
- ⚠️ งาน in-flight ปัจจุบัน (dock/fermata) session เดิมทำต่อจนจบชิ้น · **feature ใหม่ = ใช้โมเดล 1-session-full-stack**

## 1. LIVE / GIT / DB (สำคัญต่อความปลอดภัย)
- **LIVE = รอบ 30 `2f4177e`** (นิ่ง · P'เปาใช้ได้) — `origin/main` · deploy = push main → GH Actions
- **งานทั้งหมดยังไม่ deploy · ยังไม่ merge** · base ใหม่ควร branch จาก `2f4177e` (ไม่ใช่ `studio-shell-redesign`=64ec8ef ที่มีของ dock-space ที่ทิ้ง)
- **Supabase:** `db/005` RLS (public เห็นเฉพาะ verified) รันแล้ว-verified · `db/006-009` เตรียม-ไม่รัน (author_id ทิ้ง · notifications · security) · frontend DB code = เหมือนรอบ 30 (ไม่แตะ)
- **⛔ ห้าม merge main/deploy จน P'Aim สั่ง**

## 2. งาน IN FLIGHT (2 สาย · ดู board ▶ ละเอียด)
**🎛️ A. dock-resize + ⚙ panel redesign — เกือบจบ · รอ 2 อย่างก่อน deploy**
- branch `dock-resize` (จากรอบ 30) · commit **`f8d77a3`** · 🎧 preview http://127.0.0.1:5342/#/studio (localhost = เครื่องเดียวกับ P'Aim)
- ของที่ทำ+ tester PASS หมด: ลากขอบปรับขนาด (2 แกน · pointer · **ไม่ gate hover** = จุดพัง 3 รอบแก้แล้ว) · ปุ่มสเกล floor 44 wrap · min+warn · hug-content · **⚙ panel:** ไอคอนครบ · การ์ด section · **grip+⚙ ยึดล่างซ้าย ตายตัว (ยกเว้นแค่ 2 นี้ · ที่เหลือถอด/ย้ายได้หมด รวม keypad)** · **⚙ = standalone window (Teleport · ลากทั่วจอ · ⛶เต็มจอ · Esc)** · mobile=รอบ30 diff0 · 712 tests
- **เหลือ:** (1) **P'Aim ลอง preview + tactile drag ยืนยัน** (2) **2-host พระคำ:** pk-PM (pm8→pm9) smoke `pk-dock-island` @ f8d77a3 (⚙ redesign ไม่ prop-gated → กระทบ island desktop) → verdict · **BLOCK deploy จนพระคำผ่าน** · deploy = pleng+พระคำ คู่กัน (DockKey เดียว)
- session: dev `local_e20ebbbd` · tester `local_9f001e0f` · pk-PM `local_43cdd55a`

**🎵 B. fermata (หน่วงเสียงตั้งค่าได้) — design เสร็จ · รอ host-move**
- สเปก `docs/us/fermata-hold.md` (§CORE SPEC: 1 ค่า/โน้ต · คุมทั้งเล่น+แผ่น · เริ่ม=แนะนำ · ปรับ=persist)
- SA design (`ffb845a`): **hold=บีตสัมบูรณ์ · เก็บ `holds` แยก string · playback นอก bar-math (แก้ห้องหลุด) · sheet=สัญลักษณ์ variant (Gould · ไม่วาดโน้ตยาว/ไม่โชว์เลข) · no-migrate · refine** · correctness อ้างมาตรฐานเอง (**ไม่ Gemini** · P'Aim สั่งตัด)
- UX (`74e051e`): UI ตั้งค่า = **ค่าแนะนำ+▲▼ (0.5) + ▶ฟังทันที**
- 🔴 **ติด:** UX วาง UI บน contextual toolbox = มากับ dock-space **ที่ทิ้งไป (ไม่มีในรอบ 30)** → **ต้องย้าย host = chip ใต้โน้ต** ก่อนประกอบ → P'Aim รีวิว → build (base รอบ 30)
- ต้นเหตุโค้ด: `midi.js FERMATA_FACTOR=1.75` คงที่

## 3. บทเรียนวันนี้ (SOP §6 anti-patterns + memory · อ่านก่อนทำ)
- **#10 ใช้ของเดิม = ตามเดิมเป๊ะ ห้ามทำเกิน/redesign** (dev เพิ่ม ✕/＋ แทนพินแดง → P'Aim "ทำเกินทำไม")
- **#11 gate ที่ "ทำได้จริง (functional)" ไม่ใช่กลไก/ตัวเลข** · tester ทดสอบ real interaction ห้าม synthetic-pass · **PM ใช้ตาดูเอง** (ปุ่มจิ๋ว=รู้เลยใช้ไม่ได้)
- **`@media(hover)` = กับดัก:** Surface P'Aim รายงาน hover:none แม้มีเมาส์ → element ใน @media(hover)=display:none หาย (memory `feedback_verify_hover_on_real_browser`)
- **verify ของ hover/cursor = อ่าน computed/matchMedia บนเบราว์เซอร์จริง (claude-in-chrome)** — pane/headless รายงาน hover:none
- **ออกแบบก่อนสร้าง · design-first · ส่ง P'Aim เฉพาะที่ gate แล้ว** (verify ก่อน relay — burn trust ถ้าส่ง unverified)
- **2-host: DockKey แชร์พระคำ** — แก้ engine = rebuild island + smoke 344/690/768 (memory `pleng-dockkey-shared-single-source`)

## 4. P'Aim decision ค้าง
- dock/⚙ deploy: รอ P'Aim ลอง + พระคำ 2-host
- fermata: host-move → รีวิว
- tester รวมในโมเดลใหม่ไหม (ถาม)
- header การ์ด ⚙ bold กว่านี้ไหม (tweak เล็ก · P'Aim อาจไม่สน)

## 5. sessions
PM pm28(นี้)→ใหม่ · dev `local_e20ebbbd` · tester `local_9f001e0f` · SA `local_6904d4be` · UX `local_284b3dbe` · pk-PM `local_43cdd55a` · 🎼 music `local_278e3228` (เชลโลค้าง · แยกสาย)

## 6. กติกา
คุยกับ P'Aim = ภาษาคน ม.ต้น · `docs/sop.md`+`ui-standards.md` = SSOT · board อัปทุกครั้งสถานะเปลี่ยน · memory sync OneDrive · **ตั้งชื่อ session = เลข deploy รอบถัดไป** (รอบล่าสุด=30 · ถัดไป=pm31 ถ้า deploy dock)
