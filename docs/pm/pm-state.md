# PM state — เพลง.พระคำ.ชีวิต

> **สมองอยู่บน disk** → PM ตายเกิดใหม่ได้ · อ่านไฟล์นี้ + `decisions-log.md` = rehydrate ทันที
> เก็บ **สั้น เฉพาะของสด** · จบแล้วตัดออกทันที (ประวัติ → `decisions-log.md`)

## ▶▶ PM คนต่อไปเริ่มที่นี่ (handoff 2026-07-29 · จาก pm50 · P'Aim ย้าย session ใหม่)

**สถานะ 1 บรรทัด:** v1 ปล่อยแล้วพี่เปาใช้จริงทุกวัน · **/v2 พักทั้งชุด** (P'Aim สั่ง — พี่เปางง) · ตอนนี้ = **ทำ feature เก็บไว้ ไม่ขัดเงา** · ค้างที่ **P'Aim 2 คำตอบ**

---

## 🔴 ค้างที่ P'Aim (บล็อกทุกอย่าง — ถามก่อนเดินต่อ)
1. **"media library คืออะไร"** — เขาบอกว่าเป็น *หัวใจหลัก* แต่ **ไม่มีบันทึกที่ไหนเลย** · PM ตอบตรงแล้วว่าไม่รู้ · ⛔ **ห้ามออกแบบหน้าฟังเพลง/หน้าแก้ต่อจนกว่าจะได้คำตอบ** (จะหลุดทิศ)
2. **"go" deploy v1 รอบถัดไป** = B128 (เตือนชื่อซ้ำที่ 5 ตัวอักษร) + ชิป "ยังไม่ตรวจ" — **build เสร็จ gate ผ่าน รอคำเดียว**

---

## 🟡 พร้อมส่ง/รอเคาะ (ของเสร็จแล้ว จอดอยู่บน branch)
| งาน | branch @sha | สถานะ |
|---|---|---|
| **B128** เตือนชื่อซ้ำ 5 ตัวอักษร | `b128-early-warn-v1@d8d041ab` (off `origin/v1@297a7b65`) · `b128-early-warn-v2@c241fcb9` (off `origin/main`) | เสร็จ · **default ตลอด ไม่มี toggle** (P'Aim สั่ง) · รอ go deploy |
| **ชิป/แท็บ "ยังไม่ตรวจ (N)"** approver-only | `unverified-chip-v1@45cd0123` · `unverified-tab-v2@358b8faa` | เสร็จ · v2 PM commit ให้เอง (worker ตายก่อนเขียน inbox) |
| **หน้าฟังเพลง ⋮ redesign** (mockup) | `songpage-redesign-mockup@b51424d7` (off `origin/main`) | **P'Aim ยังไม่ได้ดู** · preview ตายแล้วตามการปิด session → รันใหม่จาก worktree `unruffled-satoshi-48ec8a` (`npm run dev -- --host --port 5487`) |
| **/v2 release รวม** | `v2-release@f30767ca` | gate ผ่านแล้ว **แต่ P'Aim สั่งพัก** ⛔ ห้าม merge |
| หน้าแรก v2 ใหม่ | `home-refresh-v2@79a67b1d` | P'Aim อนุมัติ look แล้ว · อยู่ใน v2-release ที่พัก |

## 🔵 หน้าฟังเพลง — ผลปรึกษา N/G/C (ยังไม่ relay ครบ · รอ P'Aim ลอง)
- **ข้อ 1 "จัดเมนูตามบทบาท" = โจทย์ไม่ยืน** — anon กดได้ถูกต้องทั้ง 6 รายการอยู่แล้วตามโมเดลสิทธิ์ ⇒ **ไม่มีอะไรให้ซ่อน** · สิ่งที่ต่างตามบทบาท = *ความหมายของการกด* → SA ใส่ประโยคไทยอธิบายต่อบทบาทแทน · **role-gating จริงอยู่ที่ปุ่มจบงาน** `docs/ds/edit-completion-flow.md` ← น่าจะเป็นก้าวถัดไป
- **ข้อ 2 เมนูโดนตัด = แก้แล้ว** core เดียว `src/lib/anchoredPanel.js` (flip→shift→clamp) · ต้นตอ: `.sb-dropdown{left:0}` ใต้ ⋮ ที่อยู่ขวาสุด · เดิมก๊อปมือ 5 ที่ (DockKey/EditorMode/FontTool/ExportTool/SingTransport) — **ยังไม่ย้ายทั้ง 5 มาใช้ core = งานถัดไป**
- **ข้อ 3 ปุ่ม `<`** เก็บไว้ + ป้ายบอกปลายทาง ≥761px · มือถือ icon เปล่า (PWA ไม่มี back)
- **ข้อ 4** เพิ่ม "ลบเพลงนี้" ให้ approver (เดิมไม่มีทางเข้าบนหน้านี้ทั้งที่มีสิทธิ์) · **ยังเป็น confirm เปล่า ไม่ต่อ RPC**
- **ยังไม่พิสูจน์:** role มาจากสวิตช์จำลอง (ไม่เคย login จริง) · touch target วัด headless · ยังไม่เทียบกับ `PKDrawer`

## 🟢 อื่น ๆ ที่ค้าง (ไม่เร่ง)
- **B129** สร้างเพลงใหม่หายาก = **ตัวบล็อกจริงของ v2** (พี่เปางงตรงนี้) — ต้องแก้ก่อน v2 จะพร้อม
- **B130** ย้อนเวอร์ชัน = future ไม่เน้น · ของมีบางส่วน (`RevisionHistory.vue` + `db/004`) แต่ปุ่ม ⏪ ยังไม่มีกันชน
- สเปกทำงานหลายคน `docs/ds/multi-editor-safety.md` (+ mockup `claude/pensive-dubinsky-7bec80@9f1f446`) — build ตอนรื้อ v2

---

## 🌐 LIVE ตอนนี้
| เว็บ | commit | สร้างจาก |
|---|---|---|
| `/` (v1) | `297a7b65` | tag `v1-frozen` — **พี่เปาใช้จริงทุกวัน** |
| `/v2/` | `4fa4f186` | branch `main` (tree = `be159a3b`) |

**วิธี deploy (ยืนยันแล้ว):** v1 = `git tag -f -a v1-frozen <sha>` + push -f → **ย้าย tag ไม่ trigger** ต้องดัน empty commit บน `origin/main` ผ่าน `commit-tree` (⛔ อย่า push local main) · `gh workflow run` ใช้ไม่ได้ (PAT ไม่มีสิทธิ์ Actions) · v2 = push เข้า `main` ตรง ๆ · **verify เสมอ: curl bundle จริงหา build stamp**

---

## 🔴 กฎถาวร
- **FIX ครอบทั้ง v1 + v2** (`pleng-fixes-cover-v1-and-v2`) — โค้ดเดียวกัน แก้ครั้งเดียว deploy 2 ที่
- ⛔ **merge = PM เท่านั้น** · ⛔ **deploy/SQL = P'Aim สั่ง go** · ⛔ re-import/bulk-write 120 เพลง
- ⛔ SQL ต้อง guard + จบด้วย `ROLLBACK;` ให้ P'Aim เปลี่ยนเป็น `COMMIT;` เอง · **รัน SQL prod ก่อน merge client เสมอ** (บทเรียน db/010)
- ⛔ ไม่แตะ browser/server ของ P'Aim (`:9222`, ai-bridge `:9335`) · ⛔ ไม่ใช้พอร์ต 5393 (vite ผี) · ⛔ ไม่กั้น UI ด้วย `@media(hover)`
- **PM = จ่ายงาน + อ่านสรุป + gate** (`C:\gl\CLAUDE.md` §4.5) · เปิดไฟล์เองได้เพื่อตอบ P'Aim/ตรวจรายงาน · ⛔ ไม่ code เอง ⛔ ไม่ run Agent tool
- **ก่อน code ทุกก้าว: N/G/C ครบ 3 เสา + P'Aim ดู mockup ก่อน build** · G-VERIFY = PM ตรวจซ้ำที่ source เอง · **ไม่มี transcript = ไม่นับ**
- 🔴 **ผู้ใช้จริง 1 คนสับสน > 3 เสาเห็นตรงกัน** — ความเห็นที่ถอยเพราะถูกดัน ≠ ความเห็นที่ผิด (บทเรียน B129) · เรื่อง discoverability ต้องทดสอบกับคนจริงก่อนตัด
- 🔴 **คีย์ anon เห็นแถวไม่ครบ (RLS)** — ห้ามสรุป "ไม่มี/ถูกลบ" จาก anon ให้พูดว่า "มองไม่เห็น" แล้วขอ P'Aim รัน SQL
- **PM ห้าม relay สิ่งที่ยังไม่เปิดดูเอง** (บทเรียน 712 melisma: "0 overlays" = hidden-tab ไม่ paint ไม่ใช่บั๊ก)

## ⭐ ลำดับความสำคัญ (P'Aim)
- **UI + engine ทำเพลง สำคัญสุด** · เมโลดี้/MusicScore = SSOT ต้อง 100% · เสียง = เปียโนเดี่ยวพอ
- **ship-fast, fix-faster** · ⛔ ยกเว้นเดียว = **ข้อมูลหายเงียบกู้ไม่ได้** (เกทเสมอ)

## 🐛 หนี้ที่รู้แล้ว
- **/v2 ยังลบเพลงถาวร** (soft-delete จอดใน `v2-release`) — เสี่ยงต่ำเพราะไม่มีใครใช้ /v2 ทำงานจริง
- **/v2 autosave 2.5 วิ** (`Studio.vue:291-299`) → แค่เปิดดูก็เปลี่ยน `updated_at` ⇒ ใช้เป็นหลักฐาน "ใครแก้อะไร" ไม่ได้
- ทางเขียนทั้ง 6 เส้นไม่มีตัวกันเซฟทับ · ปุ่ม ⏪ ย้อนเวอร์ชันไม่มีกันชน/undo
- เพลง 33 คอร์ด `E7`→`E` (`tools/restore-song33-chord-E.sql`) — รันเมื่อย้ายคนไป /v2

## 📌 SSOT pointers
- **PM brain:** ไฟล์นี้ + `docs/pm/decisions-log.md`
- **รายงาน worker:** `C:\gl\pm-inbox\pleng\` · **เรียก P'Aim:** `C:\gl\pm-inbox\_ขอความช่วยเหลือ\`
- **N/G/C:** `bridge.py ask N/G` จาก `C:\gl\krisada\ceo\tools\aibridge` (venv `C:\gl\.aibridge\venv`) · **N ของเพลง = โน้ตบุ๊ก "Pleng resource 1/2/3"** ⛔ ไม่ใช่ "แสวงหา" (=พระคำ) · transcript auto `C:\gl\.aibridge\transcripts\`
- **ping PM:** title prefix `pl pm` เลขสูงสุด · ⚠️ `pk pm` = โปรเจกต์พระคำ **คนละบ้าน**
- **กับดักที่เสียเวลาไปแล้ว:** ⛔ แก้ไฟล์ด้วย python `open(...,'w')` (CRLF ทำ diff บวมหมื่นบรรทัด) · worktree v2 ต้อง junction `node_modules` · headless ต้อง `Network.setBypassServiceWorker` ก่อน navigate · headless รายงาน `pointer:coarse` เสมอ
- **อ่าน 3 memory ก่อนทำอะไร:** `feedback_follow_exactly_and_guard` · `feedback_definition_of_complete` · `feedback_dispatch_hand_locked_ssot`
