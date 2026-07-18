# SA feasibility — B108 ระฆังเตือน "เพลงค้างรอตรวจกี่เพลง"

**ประเภท:** SA feasibility (docs only · ⛔ ไม่แตะ `src/`) · **UX (`pl uxui`) นำ flow/mockup · ใบนี้ตอบ "โครง+ข้อมูลรองรับไหม"**
**ต่อยอด:** orientation 2a (ชิป `📨 n รอตรวจ` บน IdentityStrip · `docs/ds/editor-orientation.md`)
**verify:** โค้ดจริง `EditorMode.vue`/`store.js` + schema จริง + นับสด anon 2026-07-18
**บริบท:** 🎉 RLS ปิดแล้ว LIVE (P'Aim รัน `db/005`) → team authenticated อ่าน songs ครบ · anon ไม่ได้ = **ระฆังโชว์เฉพาะคน login = ถูกต้องโดยโครงสร้างอยู่แล้ว**

---

## 0 · สรุป 30 วิ (ตอบ 3 คำถาม PM)

| # | คำถาม | คำตอบฟันธง |
|---|---|---|
| **Q1** | count "รอตรวจ" มาจากไหน · verified=false นับตรงได้ไหม | ⚠️ **มี 2 แหล่งต่างกัน ต้องแยก:** (ก) `song_drafts.status='pending'` = "เพลงส่งเข้ามา" (คนในทีมส่งร่างมาให้อนุมัติ · **โหลดอยู่แล้ว** `pendingDrafts`) · (ข) `songs.verified=false` = "ค้างยังไม่กด ✓" (94 เพลง ส่วนใหญ่ import) · **คนละความหมาย คนละ query คนละขนาด** — UX ต้องเลือกว่าระฆังนับอันไหน (หรือ 2 ตัวเลข) |
| **Q2** | อ่าน state ไหน · realtime หรือ poll · field พอไหม | **ไม่มี realtime ในโค้ดเลย** (grep เจอแต่ audio) → **poll** (fetch on login/นำทาง) เข้ากับสถาปัตยกรรมปัจจุบัน · `created_at` **มีทั้ง songs+drafts** → แยก "ใหม่/ค้าง" ตามอายุได้ · **แต่ไม่มี "seen state"** → "n ใหม่ที่ยังไม่ดู" ต้องเก็บ last-seen (localStorage/profile) |
| **Q3** | แตะ shell/IdentityStrip = ชน orientation 2a ไหม | ✅ **extend ได้ ไม่รื้อ** — ระฆังคือส่วนขยายของ IdentityStrip เดิม · **แต่ไฟล์เดียวกัน (shell/`EditorMode.vue`/`Studio.vue`)** → 1-ไฟล์-1-สาย ต้องคิว/ประสานกับสาย orientation (D1 `Studio.vue` ยัง 🚩 รอเคาะ) |

**ฟันธง SA:** ทำได้ · **refine** (ต่อยอด `pendingDrafts` + IdentityStrip เดิม) · **ประเด็นหลักไม่ใช่เทคนิค แต่คือ "ระฆังนับอะไร"** — 2 แหล่งความหมายต่างกันมาก (ส่งเข้ามา vs backlog import) · SA เสนอให้ UX/P'Aim เลือกก่อนออกแบบ flow.

---

## 1 · Q1 · แหล่งข้อมูล "รอตรวจ" — 2 อย่าง ต้องแยก (ไม่ใช่อันเดียว)

| แหล่ง | `song_drafts.status='pending'` | `songs.verified=false` |
|---|---|---|
| **ความหมาย** | ทีมส่งร่างมาให้ **อนุมัติ** ("ส่งเข้ามา") | เพลงเผยแพร่แล้วแต่ยัง**ไม่กด ✓** (backlog · 94 · ส่วนใหญ่ import) |
| **โหลดวันนี้ยัง** | ✅ **`pendingDrafts`** (EditorMode:1192/1215 · filter status==='pending') | คำนวณจาก list ที่โหลด (`verifiedProgress` = total−verified) |
| **count** | `pendingDrafts.value.length` | นับ `verified=false` |
| **RLS** | approver เห็น**ทุกร่าง** · editor เห็น**เฉพาะของตัวเอง** (policy 002) → count **role-dependent** | authenticated เห็นครบ · anon 0 |
| **ขนาด (นับสด 18 ก.ค.)** | วัดจากนี่ไม่ได้ (RLS กัน anon = ถูก) · วัดตอน login | **94** |

> **ประเด็นที่ UX/P'Aim ต้องเคาะ:** ระฆัง "🔔 มีเพลงส่งเข้ามา + ค้างรอตรวจ" —
> - ถ้าหมาย **"งานอนุมัติที่รอฉัน"** (approver's queue) = **แหล่ง ก** (`pending` drafts · ตรงคำว่า "ส่งเข้ามา") · เล็ก · เป็นงานจริงที่รอ action
> - ถ้าหมาย **"เพลงทั้งคลังที่ยังไม่ตรวจ"** = **แหล่ง ข** (`verified=false` · 94) · ใหญ่ · เป็น backlog กด ✓
> - **แนะนำ SA:** ระฆัง = **แหล่ง ก** (pending drafts · action ที่รอจริง) · ส่วน 94 verified=false = ตัวเลข backlog แยก (เช่นในหน้า review tracker) ไม่ควรเด้งระฆังทุกครั้ง (94 ค้างนานเป็น "งานประจำ" ไม่ใช่ "เตือนด่วน") — **แต่ UX ตัดสิน**

---

## 2 · Q2 · state · realtime/poll · field

- **อ่าน state ไหน:** `pendingDrafts` (มีแล้วใน EditorMode · โหลดตอน login) — **แต่ตอนนี้ผูกอยู่ใน `EditorMode.vue`** ถ้าระฆังอยู่บน **shell** (โชว์ทุกโหมด แบบ IdentityStrip) ต้อง **ยกตัวนับขึ้น `store.js`** (ถือ session/tier อยู่แล้ว) หรือให้ shell โหลดเอง = งานจริงข้อเดียวของฟีเจอร์นี้
- **realtime หรือ poll:** **ไม่มี realtime subscription ในโค้ดเลย** (ไม่มี `.channel`/`.subscribe`/`postgres_changes`) → ทุกอย่าง fetch-on-load วันนี้ · **แนะนำ poll** (refresh count ตอน login + เข้าโหมดแก้ + อาจ interval เบา ๆ) = ไม่เพิ่ม infra · Supabase Realtime ทำได้แต่ = **infra ใหม่** (channel/connection/RLS-aware) — ระฆัง review ไม่ต้องการความสด sub-second → poll พอ (realtime = optional ทีหลัง)
- **field พอไหม:** `songs` + `song_drafts` **มี `created_at` + `updated_at` ครบ** → แยก "ใหม่ (เพิ่งส่ง)" กับ "ค้างนาน" ตาม**อายุ**ได้ · **แต่ไม่มี field "ใครเห็นแล้ว"** → ถ้าอยากได้ "n ใหม่ที่ยังไม่ดู" (unread badge) ต้องเก็บ **last-seen timestamp ต่อ user** (localStorage = per-device ง่าย · profile = cross-device) — เป็น choice ไม่ใช่ blocker

---

## 3 · Q3 · ชนกับ orientation 2a ไหม → extend ได้ · แต่ lane เดียวกัน

- ระฆัง = **ส่วนขยายของ IdentityStrip** (2a) → **extend ไม่รื้อ** ✅ (ตรง `feedback_refine_not_redesign`)
- **แต่แตะไฟล์เดียวกัน:** shell identity area ใน `EditorMode.vue` + (ถ้า shell-level) `Studio.vue`/`ShellBar.vue` · DS orientation D1 "แถบระบุตัวตน sticky" ยัง 🚩 `Studio.vue` (รอเคาะ ยังไม่ merge) → **1-ไฟล์-1-สาย: B108 ต้องคิวหลัง/ประสานสาย orientation** ไม่จ่ายขนานแตะ shell พร้อมกัน
- **สถาปัตยกรรม:** ระฆังบน shell (โชว์ทุกโหมด) = ตัวนับต้องอยู่ shared (`store.js`) ไม่ใช่ฝังใน EditorMode → ออกแบบให้ orientation + bell ใช้ตัวนับ pending ตัวเดียวกันบน store (กัน 2 แหล่งความจริง)

---

## 4 · เฟส (ฟันธง · UX จัด flow)

| เฟส | ทำ | แตะ | หมายเหตุ |
|---|---|---|---|
| **1 · ระฆัง count (pending drafts)** ⭐ | ยกตัวนับ `pendingDrafts.length` → store · ระฆังบน shell (role-gated approver) · poll on login/นำทาง | `store.js` + shell (`EditorMode`/`Studio`) | คิวกับ orientation 2a · refine |
| **2 · ใหม่ vs ค้าง (อายุ)** | แยกสี/ตัวเลข "ใหม่ (created_at ล่าสุด)" vs "ค้าง" + last-seen marker (localStorage) | +เล็ก | field มีแล้ว |
| **3 · backlog verified=false (แยก)** | ตัวเลข 94 ในหน้า review tracker (ไม่เด้งระฆัง) | หน้า review | คนละความหมายกับ ก |
| **(opt) realtime** | Supabase postgres_changes push | +infra | เฉพาะถ้าต้องการสดจริง |

**go:** เฟส 1 = refine · ข้อมูลพร้อม (`pendingDrafts` โหลดอยู่) · งานจริง = ยกตัวนับขึ้น shell/store + คิวกับ orientation

---

## 5 · ที่ SA ไม่ตัดสินแทน — ส่ง UX + รอ PM/P'Aim

1. **ระฆังนับอะไร** (pending drafts "ส่งเข้ามา" · หรือ verified=false 94 · หรือ 2 ตัวเลข) = **UX/P'Aim เคาะ** (SA แนะ: ระฆัง=pending drafts · 94=backlog แยก)
2. **"ใหม่" = อายุ หรือ = ยังไม่ดู** (ต้อง last-seen marker) = UX เลือก
3. **poll พอ หรืออยาก realtime** = เริ่ม poll (แนะนำ) · realtime ทีหลังถ้าจำเป็น
4. **ลำดับกับ orientation 2a** — คิว/ประสาน (แตะ shell ไฟล์เดียวกัน) · **ยังไม่ build** — banked หลัง dock-config (P'Pao priority) · UX flow → SA ตรวจ feasibility คู่ → GATE 1

---

*verify โค้ด+schema+นับสด 2026-07-18 · SA (feasibility) · ฐาน `studio-shell-redesign`*
