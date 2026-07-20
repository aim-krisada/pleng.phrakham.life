# HANDOFF — pm29 → pl pm ใหม่ (2026-07-20)

อ่านไฟล์นี้ + `docs/pm/pm.md` + `docs/pm/board.md` (▶ RESUME) แล้วทำต่อได้ทันที
**ตั้งชื่อตัวเอง `pm30`** แล้วอัป `board.md §🎯 PM session ปัจจุบัน`

---

## 1. LIVE / GIT (สำคัญสุด)
- **LIVE = รอบ 34 `c7f60a3`** (`origin/main` · bundle `index-BIao-yy-.js` · **ยืนยันจาก bundle จริงแล้ว**) · วิธียืนยัน: `curl` หน้าแรก → หา `assets/index-*.js` → grep commit ใน bundle
- ประกอบด้วย: **รอบ 31 `68b25ca` = fermata** + **รอบ 32 `047a7a7` = tablet drawer** + **รอบ 33 `23f2e19` = คู่มือ** + **รอบ 34 `c7f60a3` = B108 แก้เพลงย้ายเล่มเอง**
- deploy = push เข้า `main` → GH Actions auto (⚠️ 20 ก.ค. GitHub Actions ล่ม ~32 นาที run ค้าง "queued" — **ถ้าเจออีกให้รอ ไม่ต้องแก้อะไร** เช็ก githubstatus.com)
- **⛔ ห้าม merge main / deploy จน P'Aim สั่ง**
- base งานทั่วไป = `studio-shell-redesign` · **แต่ 2 ฟีเจอร์นี้แตกจาก main ตรง** (เลี่ยง dock-space ที่ทิ้ง) — ดูให้ดีก่อนเลือกฐาน

## 2. ✅ คู่มือ — จบแล้ว (รอบ 33)
- **คู่มืออัปแล้วขึ้น live รอบ 33 `23f2e19`** — ครอบ fermata (วิธีใส่ · ± ครึ่งจังหวะ · เริ่มต้น 2 · ป้าย `𝄐N` · **แผ่นพิมพ์ไม่มีเลข + เหตุผล**) + โครงเพลง ▾ / ลิ้นชักจอแคบ · ภาษาคนล้วน ไม่มีศัพท์พิกเซล
- **`guide-update` (branch เก่า `1393eed`) — ตรวจแล้วไม่มีอะไรตกหล่น:** การ์ดเครดิต About + Guide ② + ไอคอน อยู่บน live ก่อนหน้าแล้ว (เหมือนกันเป๊ะ) · เหลือ 2 บรรทัดที่ของปัจจุบันถูกกว่า จึงไม่เอากลับ · **branch ยังอยู่ที่ `1393eed` ไม่ถูกแตะ — ลบได้ถ้า P'Aim โอเค**
- ⚠️ **`𝄐` glyph risk (ยังไม่เคลียร์):** บาง Android/iOS อาจไม่มีฟอนต์ → เห็นเป็นกล่อง □ · **กระทบของที่ live แล้วด้วย** (ชิป · badge · แผ่น) · P'Aim กำลังเช็กบนมือถือจริง — ถ้าเป็นกล่อง ต้องเปลี่ยนเป็นไอคอน SVG วาดเอง
  - เพลงที่มีเฟอร์มาต้าจริงบน live (14 เพลง) เช่น **#777** `7f8b920e-4a96-42f8-b518-8a6bf7e32db4` · **#760** (4 ตัว) `de9d58d5-1b1d-4532-a03a-b44e295a20d8` · **#97** `093a1a7e-1a38-43a4-8633-572ddf425cd2`

## 3. ✅ B108 — เพลงย้ายเล่มเอง (รอบ 34 · ปิดครบแล้ว)
**อาการ:** เปิดเพลง/ร่างแล้วหมวดเด้งเป็น "อนุชน" ทั้งที่คนทำใส่ "เล่มใหญ่" — และเผยแพร่/อนุมัติต่อจะ**เขียนทับฐานข้อมูลจริง**
**ปิดไปแล้ว 5 ทาง:** (1) เปิดร่าง→เด้ง anuchon (2) เผยแพร่→ทับ (3) **อนุมัติ→ล้าง `theme`** (RPC coalesce เฉพาะ category ไม่ coalesce theme — ทางที่พี่เปาใช้จริง) (4) แตะธีมอย่างเดียว→หมวดโดนทับ (5) resolve ทับ pick ใหม่ในร่าง
**หลักการแก้:** ธง `categoryKnown`/`themeKnown` แยกกัน · **known = key มี AND ค่าไม่ null** · ไม่รู้ค่า = **ไม่ส่ง key นั้นเลย** (PostgREST ไม่แตะคอลัมน์ที่ไม่ส่ง)
- ✅ **`db/010-draft-category.sql` P'Aim รันแล้ว** (PM verify คอลัมน์ขึ้นจริง) → drafts เก็บ category/theme เองได้ → **เพลงใหม่ไม่หายหมวดแล้ว**
- 733 tests (+20) · tester เขียน probe เอง 12 เคส ตรวจระดับ **payload** · report `fix-draft-category{,-tester}.md`
- 📌 **quirk ค้าง (ไม่ใช่ข้อมูลเสีย · ต้องทำ tri-state):** เลือก "— ไม่ระบุธีม —" → เก็บ null → เปิดใหม่อ่านเป็น "ไม่รู้" → **เผยแพร่แล้วธีมเก่าถูกส่งกลับ** = เจตนาล้างหาย (tester วัดถึงขั้น publish แล้ว)
- 📌 อย่าสับสน: **B104 = งาน MIDI คอร์ดมือซ้าย** (มี 3 branch `b104-*`) · งานนี้คือ **B108**

## 4. 🙏 ค้างให้ P'Aim/พี่เปา ยืนยันบน live (ยังไม่ได้ยืนยัน)
1. แก้เพลง → ปิด → เปิดใหม่ **ค่า fermata ยังอยู่ไหม** (tester ขับ DB จริงไม่ได้ ไม่มี auth)
2. เปิด **เพลงเก่า** (มี `^` เดิม) เล่นได้ + โชว์ค่าไหม
3. 🔴 **Ctrl+P / PDF จริง — ต้องไม่มีตัวเลขบนแผ่น** (ตรวจจาก PDF จริง ไม่ใช่ DOM · `feedback_verify_print_from_pdf`)

## 5. 🔧 ค้างทำต่อ (ไม่บล็อก)
- **polish:** ชิป fermata อาจทับแป้นตอนโน้ตอยู่ล่างสุดจอเตี้ย (tester flag · positioning เดิม ไม่ใช่ regression)
- **DockKey ใหม่ยังไม่นิ่ง** — branch `dock-resize` `f8d77a3` ค้าง ไม่ deploy · **P'Aim: ไม่อยากใช้จนกว่าจะนิ่ง** · (DockKey = core แชร์พระคำ · ถ้าจะ deploy ต้อง gate 2-host ประสาน pk-PM)

## 6. 🆕 งานใหญ่ที่ P'Aim คุยกับ G ไว้ (ยังไม่ทำ · ควร file เข้า backlog ก่อนแตกงาน)
สรุป As-Is จากโค้ดจริงอยู่ใน **`docs/reports/current-editor-audit.md`** (ตอบ G ครบ 3 หัวข้อ) — ช่องว่างจริง:
- **ลูกคู่ (multi-voice) = ไม่มีในโมเดลเลย** (1 ห้อง = แนวเดียว) → งานขยายโมเดลใหญ่ ต้องถก scope ก่อน
- **D.C./D.S./Fine/Segno = เป็น text เฉย ๆ เล่นไม่กระโดด** (มี SA brief `docs/pm/brief-repeat-symbols-ui.md` แต่ยังไม่มี US/DS/โค้ด)
- measure grid · layer/track view · DockKey redesign (windowed + flat-list setting)
- ⚠️ อย่าให้บานปลาย — file เข้า backlog แล้วแตกทีละชิ้น

## 7. กระบวนการที่ใช้อยู่ (เวิร์กมาก รอบนี้)
- **PM สร้าง agent session เองได้** (P'Aim อนุมัติ 20 ก.ค. · memory `pleng-pm-spawns-agent-sessions`)
- **1 agent = 1 ฟีเจอร์ full-stack** (SA+UX+UI+dev) · **tester = agent แยกเสมอ** (คนสร้างห้าม gate งานตัวเอง)
- **M1 = ทำ "หน้าตา" บนโค้ดจริงแล้วหยุด → P'Aim ดู/เคาะ → M2 ต่อ logic** (ห้าม throwaway mockup) · resume agent เดิมด้วย `SendMessage`
- แต่ละ agent: **worktree + port ของตัวเอง** · `--host` + แจ้ง Network URL เสมอ
- **PM gate จากหลักฐาน tester** · PM ไม่ทดสอบพิกเซลเอง แต่ **ดูตาเปล่า sanity ก่อนส่ง P'Aim**

## 8. 🧹 ความสะอาด
- **ปิดแล้ว:** dev server :5350 (fermata) · :5360 (drawer)
- **worktree merged แล้ว ลบได้:** `pleng-fermata` · `pleng-drawer` (`git worktree remove ../pleng-fermata`)
- **worktree merged แล้วเช่นกัน:** `pleng-guide` (guide-r33) · `pleng-category` (fix-draft-category · **ปิด :5380 ด้วย**) — deploy แล้วทั้งคู่
- memory sync ขึ้น OneDrive แล้ว (177 ไฟล์)

---
*pm29 · 2026-07-20 · live รอบ 34 · fermata + tablet drawer + คู่มือ + B108 (เพลงย้ายเล่ม) ขึ้นครบแล้ว*
