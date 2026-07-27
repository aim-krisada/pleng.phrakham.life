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

## 🎯 โฟกัสเดียวตอนนี้: **ปิด v1 ให้จบ** (P'Aim สั่ง 27 ก.ค.)

> *"ทำ v1 ให้จบก่อน · รื้อ v2 ค่อยดูหลัง v1 เสร็จจริง"* · ⛔ **ห้ามเริ่มวางแผนรื้อ v2**
> **v1 ได้เฉพาะ 2 อย่าง:** (1) ข้อมูลหายเงียบกู้ไม่ได้ (2) พี่เปาทำงานไม่จบ flow · **นอกนั้นยกไป v2 ทั้งหมด**
> **✅ พี่เปา = ผู้อนุมัติ (P'Aim ยืนยัน 27 ก.ค.)** → ไม่มีปัญหาเรื่องต้องรอคนอนุมัติ · flow เขาจบเองได้

**v1 เหลือ 2 ข้อ (จ่ายแล้ว 27 ก.ค. · คนละไฟล์ ไม่ชนกัน):**
| งาน | task | ไฟล์ |
|---|---|---|
| งานที่ยังไม่บันทึกหายตอนสลับเพลง (isDirty ไม่คร่อม 4 จุด) | `task_1967b1e9` | `src/components/EditorMode.vue` |
| ฟังแล้วได้ยินโน้ตเกิน — พอร์ต pre-echo referee จาก main มา v1 | `task_4ff0f3b8` | `src/lib/arranger/` |
| ยามเทมเพลตนำเข้าเพลง (เลขชน = หยุด ไม่ทับเงียบ) | `task_3a275770` | `docs/importing-songs.md` + สคริปต์นำเข้า |

**❌ ตัดออกจาก v1 แล้ว (worker เปิดของจริงยืนยัน · PM ตรวจซ้ำข้อ isDirty เอง):**
- ปุ่ม ⏪ **ไม่ได้ทำข้อมูลหายถาวร** — `db/004` เก็บสำเนา before ทุก UPDATE ย้อนได้ (PM เคยเข้าใจผิด)
- เพลง 33 คอร์ด **หายเองแล้วบน live** · orphan flow **0/199 เพลง** · เซฟทับกัน = หายเงียบแต่**กู้ได้** → ยกไป v2
- ไฟล์ demo 2 ตัว = ขยะในรีโป build ไม่เอาขึ้น live

**⚠️ deploy:** P'Aim สั่ง **รอปล่อยทีเดียวตอน v1 จบครบ** ⛔ ห้ามทยอย · v1 ขึ้นเว็บต้อง **เลื่อน tag `v1-frozen` + จุด workflow เอง** (แก้ branch v1 เฉย ๆ ไม่ขึ้น) · `deploy.yml` บน branch v1 = ฉบับเก่าไม่เคยทำงาน **อย่าอ่านผิดตัว**

---

## 🟢 งานอื่นที่ยังค้าง (ไม่ใช่ v1 · อย่าเพิ่งลงแรง)
- **กันชื่อเพลงซ้ำ** — เสร็จแล้วทั้ง 2 สาย ยังไม่ merge: `/v2` `claude/keen-hellman-70be16`@20d221a · v1 `dup-title-guard-v1`@7589cb4 · `db/011` ยังไม่เคยรันจริง (ต้องเคลียร์ 2 คู่ที่ซ้ำก่อน)
- **สเปกระบบทำงานหลายคน** — `docs/ds/multi-editor-safety.md` + mockup @`9f1f446` (branch `claude/pensive-dubinsky-7bec80`) · **build ตอนรื้อ v2**

## 🔴 รอ P'Aim (ไม่บล็อก v1)
1. **ถามพี่เปา: เพลงซ้ำ 2 คู่ในเล่มเด็กเล็ก** ("พระเยซูทรงรักเด็กๆ" · "พระดำรัสชิมหวานสักปานใด") เป็นเพลงเดียวกันหรือคนละเพลง → ต้องเคลียร์ก่อนรัน `db/011`
2. **จัดหน้าแรก** (ออกแบบ+3AI ครบ) · **ป้าย Key F ตก AA 4.28:1** · **การ์ดผลค้นหา snippet ไม่ตรงคำค้น** — **ทั้งหมดยกไป v2 แล้ว ไม่แตะ v1**
3. **เนื้อ 2 ชุดของ 717 ยาวไม่เท่ากัน** = ข้อมูลต้นฉบับ → งานพี่เปา ไม่ใช่โค้ด

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
