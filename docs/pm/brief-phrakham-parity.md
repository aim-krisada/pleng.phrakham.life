# BRIEF (implement phase) — pleng look & feel ให้เหมือน phrakham

**เป้าหมาย (คำพี่เอม):** ทำให้เว็บเพลง **look & feel เหมือน phrakham.life** · zoom 125% พี่เอมแก้ที่เครื่องแล้ว (ตั้ง Chrome default zoom กลับ 100%) — **รอบนี้ทำแค่ design parity**
**ฐาน:** `studio-shell-redesign` · **จ่ายโดย:** pm22 · 13 ก.ค. 2026
**SSOT วิเคราะห์:** `docs/reports/analyze-phrakham-style.md` (Section B) · **มาตรฐาน UI:** `docs/ui-standards.md`

---

## ขอบเขต = Section B เท่านั้น (B-1..B-6) · quick-win ก่อน
| # | เปลี่ยน | จาก → เป็น | ไฟล์ | ขนาด |
|---|---|---|---|---|
| B-2 ⭐ | สีหัวเว็บ (shell-bar) | เทาเย็น `#f8f9fa` → ครีม/ขาวอุ่น (`#fff`/`#FCFAF6`) | `src/styles.css:196` | S |
| B-1 ⭐ | ขนาดตัวหนังสือ | `--fs-base` 1.06→1.12rem (body 17→18px เท่าพระคำ) | `src/styles.css:42` | S |
| B-4 | มุมโค้งการ์ด/ชิป | การ์ด 10→14px · section-chip 16→20px | `src/styles.css:431,570` | S |
| B-3 | บรรทัดโปร่ง **เฉพาะหน้าอ่าน** (Guide/About) | 1.6 → 1.8 · **ห้ามแตะแผ่นเพลง** (จงใจแน่นเพื่อโน้ต) | Guide.vue/About.vue scoped | S |
| B-5 | ปุ่ม**รอง** → โปร่ง (ghost ครีม-ขอบน้ำตาล) · คงปุ่มหลักทึบ | `src/styles.css:390-403` | M |
| B-6 | whitespace/จัดกึ่งกลางหน้าอ่าน (คอลัมน์ ~850px แบบพระคำ) | `src/styles.css:57-59,122-126` | M |

**ค่าอ้างอิง phrakham (SSOT):** `C:\gl\krisada\phrakham.life2\theme.scss` — brand `#8B4513` · ink `#2D2A26` · cream `#FAF6F0/#FCFAF6` · line `#E0D6C8` · root 17px/body 1.06rem · line-height 1.8 · การ์ด radius 14 · pill 20 · ปุ่ม ghost ครีม

## เกณฑ์ (scope guards — ห้ามข้าม)
- **refine ไม่ redesign** — ปรับค่าที่มีอยู่ ไม่รื้อ component/logic
- **ห้ามแตะ:** line-height แผ่นเพลง (SongSheet/NoteRow — จงใจแน่น) · dock/editor logic · โทเคนสี (ตรงพระคำแล้ว) · stack (Vue คงเดิม)
- ทุกจุด = cosmetic/token เท่านั้น · ผ่าน WCAG contrast เดิม

---

## Flow + roles
### 1) SA (สายเดิม `analyze-phrakham-style` — มี context แล้ว)
เขียน `docs/ds/phrakham-parity.md` = design spec ที่ Dev ทำตามได้ทันที:
- แต่ละ B-x: **ค่าเดิม → ค่าใหม่เป๊ะ** (px/rem/hex), selector/บรรทัดจริง, before/after ที่คาดหวัง
- **AC (Acceptance Criteria)** ต่อ B-x — ข้อความตรวจได้ (เช่น "body computed font-size = 18px ที่ root default", "shell-bar background = #FCFAF6") ให้ Tester ใช้ gate เต็มทุกข้อ
- scope guards ข้างบน copy เข้า DS
- commit เฉพาะ DS บน branch ตัวเอง · แล้ว ping PM + §📥 inbox

### 2) Dev (สายใหม่ — spawn worktree/branch `phrakham-parity` จากฐาน studio-shell-redesign)
- ทำตาม `docs/ds/phrakham-parity.md` ทุกข้อ · เปิด dev server **`--host`** ใส่ Network URL (`http://<IP>:<port>`) ในรายงาน (ให้พี่เอม/พี่เปาเทสมือถือ)
- self-verify: computed style ตรง AC ทุกข้อ + เทียบภาพเคียงพระคำ · ห้ามแตะไฟล์นอก scope
- report `docs/reports/phrakham-parity.md` + §📥 inbox + ping PM

### 3) Tester (สายใหม่)
- gate เทียบ **AC ใน DS เต็มทุกข้อ** (`feedback_tester_gate_full_spec`) · ทุก viewport (360/412 + desktop) · ไม่มี regression หน้าแผ่นเพลง/dock
- report `docs/reports/phrakham-parity-qa.md` + verdict PASS/FAIL ราย AC + ping PM

### 4) PM
review DS → จ่าย Dev → gate → merge เข้า base → serve localhost → **P'Aim verify look&feel เทียบพระคำ** → P'Aim go → deploy (นโยบาย PM คุม deploy)

## รายงานกลับ (session-agnostic)
เขียน report ในไฟล์ + เพิ่ม §📥 inbox บน `docs/pm/board.md` + ping "PM ปัจจุบัน" (ดู board §🎯/RESUME — อย่า hardcode ชื่อสาย)
