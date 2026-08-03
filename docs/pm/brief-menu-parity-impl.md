# BRIEF (Dev) — หัวเว็บ/เมนู pleng = phrakham เป๊ะ (P'Aim rules · 13 ก.ค.)

**สาย:** Dev · **จ่ายโดย:** pm22 · **ฐาน:** `studio-shell-redesign` (ปัจจุบัน · มี parity+hero/favicon merge แล้ว)
**อ้างอิง:** phrakham.life จริง (desktop+mobile) · SA DS `docs/ds/menu-parity.md` · **P'Aim ย้ำ: "look/feel ใกล้เคียงพระคำมากที่สุด · ต่างเยอะอยู่"**

## ⭐ กฎจาก P'Aim (ต้องทำให้ครบ — verify เทียบพระคำจริง)
1. **เอา hero image ออกจากหน้าแรก** — SongList ขึ้นเนื้อหา/รายการเพลงเลย (ลบส่วน hero ที่เพิ่งเพิ่มใน `SongList.vue` · asset ใน public/ ทิ้งไว้ได้ ไม่ต้องแสดง)
2. **Desktop:** หัวเว็บ = **ชื่อ "เพลง.พระคำ.ชีวิต" อย่างเดียว ไม่มี icon** · เมนูนำทาง **inline** (ไม่ใช่ ▾ dropdown): รายการเพลง · คู่มือ · เกี่ยวกับเรา · พระคำ.ชีวิต↗ · **เครื่องมือขวาบน** (Aa/⚙ ถ้ามี/⬇/🔍 ตาม DS mapping) — เลย์เอาต์แบบพระคำ desktop
3. **Mobile:** หัวเว็บ = **icon แอปอย่างเดียว มุมซ้ายบน (ไม่มีชื่อเว็บ)** · ขวาบน = **🔍 + ☰ แฮมเบอร์เกอร์** · กด ☰ → เปิด **drawer** (ลิงก์นำทาง + เส้นคั่น + หัวข้อ "เครื่องมือ" Aa/ตั้งค่า/ดาวน์โหลด แบบพระคำ)
4. **look/feel ใกล้พระคำมากที่สุด** — เทียบภาพเคียงข้าง (สี/ระยะ/ฟอนต์/ตำแหน่ง) · โทเคนสีตรงพระคำอยู่แล้ว

## รายละเอียด/mapping → ใช้ SA DS
`docs/ds/menu-parity.md` มี survey เมนูปัจจุบัน + mapping เข้าพระคำ + Lucide id + AC + จุดทับ shell-bar ครบ · **ทำตาม DS + override ด้วยกฎ P'Aim ข้างบน** (กฎ P'Aim ชนะถ้าต่าง) · 4 คำถามใน DS §8 = P'Aim ตอบผ่านกฎแล้ว (🔍 เอา · nav inline desktop · icon/ชื่อ สลับ breakpoint)

## scope guards
- **refine ต่อยอด ShellBar เดิม** — ไม่รื้อ routing/store · teleport `#shell-left`/`#shell-menus` (Studio) ต้องคงไว้ (FontTool/DownloadTool contextual) · ไม่แตะโทเคนสี · **ห้ามแตะแผ่นเพลง/dock/editor logic**
- แตะ: `ShellBar.vue` · `src/styles.css` (.shell-bar/.sb-*) · `SongList.vue` (เอา hero ออก) เท่านั้น

## setup + verify (design work — P'Aim จะ iterate)
- worktree branch ใหม่จากฐาน **studio-shell-redesign** · **verify fork base เอง** `git merge-base --is-ancestor studio-shell-redesign HEAD` (base ปัจจุบันมี parity+hero/favicon แล้ว)
- dev server **`--host`** + **Network URL** ในรายงาน
- **verify เทียบพระคำจริง (เปิด https://phrakham.life คู่กัน):** desktop = ชื่อไม่มี icon + nav inline + เครื่องมือขวา · mobile 360/412 = icon ซ้าย (ไม่มีชื่อ) + 🔍/☰ ขวา + ☰ เปิด drawer · ไม่มี hero · ปุ่มไม่หลุดจอ · screenshot desktop+mobile เทียบพระคำ

## รายงานกลับ (session-agnostic)
`docs/reports/menu-parity.md` + screenshot เทียบพระคำ (desktop+mobile) + Network URL · §📥 inbox `docs/pm/board.md` + ping "PM ปัจจุบัน" (board §🎯 — อย่า hardcode ชื่อสาย) · **ไม่ merge/deploy — P'Aim ดู+iterate ก่อน**
