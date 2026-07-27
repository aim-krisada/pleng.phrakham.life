# PM state — เพลง.พระคำ.ชีวิต

> **สมองอยู่บน disk** → PM ตายเกิดใหม่ได้ · อ่านไฟล์นี้ + `decisions-log.md` = rehydrate ทันที
> เก็บ **สั้น เฉพาะของสด** · จบแล้วตัดออกทันที (ประวัติ → `decisions-log.md` → `decisions-archive.md`)

## ▶▶ pl pm 49 เริ่มที่นี่ (handoff 2026-07-27 · จาก pm48)

**อ่าน 3 memory ก่อนทำอะไร:** `feedback_follow_exactly_and_guard` · `feedback_definition_of_complete` · `feedback_dispatch_hand_locked_ssot` (ยื่น SSOT ที่ล็อกแล้วให้ worker · อย่าสั่ง "ไปหาวิธีเอง")
**report-back:** worker เขียน `C:\gl\pm-inbox\pleng\` + ping PM (หา PM จาก title prefix `pl pm` เลขสูงสุด)

---

## 🌐 สถานะ LIVE ตอนนี้ (ยืนยันจาก bundle จริง 26 ก.ค.)
| เว็บ | commit | สร้างจาก |
|---|---|---|
| `/` (v1) | **`9bb1c8d`** | tag **`v1-frozen`** (branch `v1`) |
| `/v2/` | **`27978bf`** | branch **`main`** |

**วิธี deploy (ยืนยันแล้ว):**
- **v1:** `git tag -f -a v1-frozen <sha>` + `push -f` → **ย้าย tag ไม่ trigger เอง** ต้องดันต่อ: empty commit บน `origin/main` ผ่าน `commit-tree` (⛔ อย่า push local main — ล้าสมัยกว่า origin) · `gh workflow run` **ใช้ไม่ได้ (PAT ไม่มีสิทธิ์ Actions)**
- **v2:** push branch เข้า `main` ตรงๆ = trigger
- **verify เสมอ:** curl bundle จริงหา build stamp — ห้ามเชื่อว่า push แล้วขึ้น

---

## 🟢 งานที่จ่ายแล้ว กำลังเดิน (2 ตัว · คู่ขนาน ไม่ชนกัน)

| งาน | task | ผลที่ต้องได้ |
|---|---|---|
| **ออกแบบ "ระบบทำงานหลายคน"** (ไม่แตะโค้ด) | `task_8106f416` | สเปกเดียวครอบ **กันเซฟทับ + เจ้าของ/สิทธิ์ + ลบ/ถังขยะ 30 วัน** → `docs/ds/multi-editor-safety.md` + **mockup ให้ P'Aim เคาะ** · **build ตอนรื้อ v2** |
| **กันชื่อเพลงซ้ำในเล่มเดียวกัน** | `task_29ebf41c` | กัน 3 ทาง (พิมพ์ใหม่ · แก้ชื่อ · **นำเข้าเป็นชุด**) + รายงานว่าตอนนี้ซ้ำอยู่กี่คู่ |

**กติกาที่ P'Aim เคาะไว้แล้ว (ห้ามเปลี่ยน):**
- **ชื่อซ้ำ:** เหมือนเป๊ะ+เล่มเดียวกัน = **กันจริง** (ทางออกฉุกเฉินเฉพาะ approver) · คล้าย = เตือนแต่ผ่านได้ · คนละเล่ม = ผ่านปกติ · **เล่ม (เล่มใหญ่/อนุชน/เด็กเล็ก) จะเพิ่มได้ → ห้าม hard-code**
- **ระบบหลายคน:** *"ระบบต้องกันเอง ไม่ควรอิงพฤติกรรมคนใช้"* · ไอเดีย P'Aim = **checkout/lock + ปลดอัตโนมัติ + request-lock** ต้องพิจารณาเป็นตัวเลือกหลัก · ⚠️ **ทางแก้ที่ทำให้เซฟสะดุด = แย่กว่าปัญหา**

---

## 🔴 รอ P'Aim เคาะ (ไม่บล็อกใคร)
1. **จัดหน้าแรก** — ออกแบบ+ปรึกษา 3AI ครบแล้ว รอ build: การ์ดเพลง (Media Library) · ปุ่ม "+ สร้าง/นำเข้า" เล็กหัวรายการ · **per-card ⋮ = แชร์/ดาวน์โหลด JSON/ลบ** (ลบ = ทั้งการ์ด+หน้าดู) · เอาปุ่ม ⇄ + "รุ่นทดลอง" ออก
2. **♿ ป้าย "Key F" บน `/` = 4.28:1 ตก WCAG AA** (`--muted #757575` บน `--cream`) · /v2 ผ่าน 4.82 · งานเล็ก
3. **การ์ดผลค้นหา: snippet เป็นหัวของชุดที่ match** — พิมพ์คำลึกกลางชุดจะ badge ถูกแต่ข้อความไม่ใช่คำที่พิมพ์ · แก้ = match-centred window **แต่กระทบการ์ดทุกเพลง** → แยกงาน
4. **เนื้อ 2 ชุดของ 717 ยาวไม่เท่ากัน** (5 vs 8 ท่อน · ท่อนรับวางคนละแบบ) = **มาแต่ต้นฉบับ → งานพี่เปาแก้ข้อมูล ไม่ใช่โค้ด**

## 🐛 หนี้/ความเสี่ยงที่รู้แล้ว (ยังไม่แก้)
- **`saveDraftRow` / ทางเขียนทั้ง 6 เส้น ไม่มีตัวกันเซฟทับ** · **/v2 autosave ทุก 2.5 วิ** (`Studio.vue:291-299`) → **ยกไปสเปก task_8106f416 แล้ว** · SQL ตรวจพร้อมใช้ `backup/lost-update-audit.sql` (ทดสอบกับ Postgres จริงแล้ว)
- **ปุ่ม "⏪ ย้อนเวอร์ชัน" เขียนทับด้วยสำเนาเก่า ไม่มีกันชน ไม่มี undo** (v1:1989 · main:1855)
- **ลบห้องที่มีเครื่องหมายบน v1 → flow ชี้ id ที่ไม่มีแล้ว (orphan)** — เท่าเดิม · ควรจบที่ lint ฝั่ง /v2 (`findOrphanFlows`)
- **เพลง 33 คอร์ด `E7`→`E`** · `tools/restore-song33-chord-E.sql` — **รันเมื่อย้ายคนไป /v2**
- ไฟล์ preview 2 ตัวติดมากับ merge (`demo-lyricset-names.html` + `src/demoLyricSetNames.js`) — ไม่กระทบ bundle · ลบทีหลัง
- **ร่างที่ยังไม่อนุมัติ (`song_drafts`/`song_revisions`) อ่านไม่ได้ด้วย anon (RLS)** → การกวาดตรวจทั้งหมดครอบแค่ 199 เพลงที่ published

---

## 🔴 กฎถาวร
- **FIX ต้องครอบทั้ง v1 + v2** (memory `pleng-fixes-cover-v1-and-v2`) · โค้ดเดียวกัน = แก้ครั้งเดียว deploy 2 ที่
- ⛔ **merge = PM เท่านั้น** · ⛔ **deploy/SQL = P'Aim สั่ง go** · ⛔ re-import/bulk-write 120 เพลง
- ⛔ SQL ต้อง guard + rollback + **จบด้วย `ROLLBACK;`** ให้ P'Aim เปลี่ยนเป็น `COMMIT;` เอง
- ⛔ ไม่แตะ browser/server ของ P'Aim (`:9222`, ai-bridge `:9335`) · ⛔ ไม่ใช้พอร์ต 5393 (มี vite ผี) · ⛔ ไม่กั้น UI ด้วย `@media(hover)`
- **PM = จ่ายงาน + อ่านสรุป + gate** (§4.5) · เปิดไฟล์เองได้เพื่อตอบ P'Aim/ตรวจรายงาน · ⛔ ไม่ code เอง ไม่ run Agent tool
- **ก่อน code ทุกก้าว: 3AI (C→N→G) + P'Aim ดู mockup ก่อน build** · **G-VERIFY = ตรวจซ้ำที่ source เอง ไม่ใช่ G อนุมัติ** · ไม่มี transcript = ไม่นับ
- **worker บอก "ขอ handoff" ≠ หยุดจริง** — ยืนยันก่อนจ่ายทับ (เคยจ่ายซ้ำ)
- **baseline เทส:** ยึด **ก่อน/หลังของเครื่องตัวเอง** ไม่ยึดเลขดิบจากใบสั่งเก่า (diag-ensemble 10 เทส gate ด้วย env)

## ⭐ ลำดับความสำคัญ (P'Aim)
- **UI + engine ทำเพลง สำคัญสุด** · **เมโลดี้/MusicScore = SSOT ต้อง 100% · เสียง(timbre) ไม่ต้อง** (piano พอ)
- **ship-fast, fix-faster** · ⛔ ยกเว้นกลุ่มเดียว = **ข้อมูลหายเงียบ กู้ไม่ได้** (เกทเสมอ)
- **v2 จะถูกรื้อ** → อย่าลงแรงปะ v1/v2 ในเรื่องที่จะรื้ออยู่แล้ว (เช่น editor 360px — P'Aim สั่งข้าม)

## 📌 SSOT pointers
- **PM brain:** ไฟล์นี้ + `docs/pm/decisions-log.md` · เก่า → `decisions-archive.md`
- **รายงาน worker:** `C:\gl\pm-inbox\pleng\` · **ป้ายเรียก P'Aim:** `C:\gl\pm-inbox\_ขอความช่วยเหลือ\`
- **ดีไซน์ล็อก:** `work/ปรับ pl edit ui/ux-groundup-design.md`
- **G/N:** ai-bridge `C:\gl\krisada\ceo\tools\aibridge` (`bridge.py ask G/N`) · **inline ใช้ได้ · `--file` เคยพังแล้วหายเอง** · runtime `C:\gl\.aibridge\`
- **กับดักที่เสียเวลาไปแล้ว:** อย่าแก้ไฟล์ด้วย python `open(...,'w')` (CRLF ทำ diff บวมหมื่นบรรทัด) · worktree v2 ต้อง junction `node_modules` (main dir ไม่มี `qrcode-generator`) · headless ต้อง `Network.setBypassServiceWorker` ก่อน navigate · headless รายงาน `pointer:coarse` เสมอ (ยืนยัน 44px บน desktop ไม่ได้)
