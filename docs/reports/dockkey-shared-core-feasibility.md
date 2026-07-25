# SA feasibility — DockKey ปรับแต่งได้ + "core lib แชร์พระคำ↔เพลง"

**ประเภท:** SA feasibility (docs only · ⛔ ไม่แตะ `src/`) · **brief:** `docs/pm/brief-dockkey-config.md`
**โจทย์พี่เปา:** DockKey ปรับได้ (เลือกปุ่ม show/hide + ตำแหน่ง · resize ขนาด · settings · toggle ชื่อ + ชื่ออ้างอิง) · **P'Aim ย้ำ:** "แก้ต้องแก้ core lib ที่ใช้ร่วมพระคำ↔เพลง"
**verify ของจริง 2 repo:** pleng `sa-standing` · phrakham `phrakham.life2` **`origin/main`** — วัด/อ่านซอร์สจริง 2026-07-18
**UX นำ flow · ใบนี้ตอบ feasibility + สถาปัตยกรรม shared-core**

> ⚠️ **แก้ไขจากฉบับแรก (SA ยอมรับผิด):** ฉบับแรกผมสรุปว่า "phrakham ไม่มี dock · DockKey pleng-only · แก้ 2 เว็บไม่ได้ · regression พระคำ = ศูนย์" — **ผิดทั้งหมด** เพราะผม verify แค่ branch `pm-primary-parking` (branch พัก) + main `assets/` folder แล้วสรุปเร็ว. **P'Aim แก้ถูก:** DockKey **ออกแบบให้ share 2 เว็บตั้งแต่แรก** (พระคำใช้อ่านออกเสียง · เพลงปุ่มเยอะกว่า · base เดียวกัน). บทเรียน: verify ต้องดู **branch live (`origin/main`) + ซอร์สจริง** ไม่ใช่ branch แรกที่เจอ.

---

## 0 · สรุป 30 วิ (ตอบ 3 คำถาม PM · ฉบับถูกต้อง)

| # | คำถาม | คำตอบฟันธง |
|---|---|---|
| **Q1** | อะไร shared · อะไรเฉพาะ pleng · config ควรอยู่ชั้นไหน | **`DockKey.vue` = single shared source จริง** (พระคำ import ตัวเดียวกันผ่าน `@pleng` alias · ไม่ใช่ก๊อป) · **config ต้องอยู่ที่ชั้น engine ใน `DockKey.vue`** → แก้ครั้งเดียว 2 เว็บได้ · ส่วน "ปุ่มไหนมี" อยู่ที่ data (items) ของแต่ละเว็บ |
| **Q2** | 🟢 แก้ครั้งเดียวได้ 2 เว็บจริงไหม | ✅ **ได้จริง** — 1 source edit (`DockKey.vue`) · แต่ **2 deploy** (pleng deploy ตรง · phrakham ต้อง `npm run build` rebuild island `pk-dock-island.js` + commit + render + deploy) |
| **Q3** | persist · resize · id คงที่ · regression พระคำ · กี่เฟส | persist=localStorage per `storeKey` (แยก user/เว็บอยู่แล้ว) · **id คงที่ = มีแล้ว** · resize ขนาด=เติม · **🔴 regression พระคำ = มีจริง (engine แชร์)** ต้องเป็น test gate · 1–3 เฟส |

**ฟันธง SA (แก้ใหม่):** ทำ config ที่ **engine (`DockKey.vue`)** = **ถูกชั้นตามที่ P'Aim สั่งเป๊ะ** และ **ได้ 2 เว็บจริง** · engine รองรับ ~80% แล้ว → **refine** · **แต่เพราะแชร์จริง → ต้องมี gate ป้องกัน regression dock อ่านออกเสียงของพระคำทุกครั้งที่แตะ engine** (ตรงข้ามกับที่ผมเขียนผิดรอบแรก).

---

## 1 · Q1+Q2 · สถาปัตยกรรม shared core จริง (verify ซอร์ส 2 repo)

### DockKey = single source · พระคำ consume ไฟล์เดียวกัน (ไม่ใช่ก๊อป)
หลักฐานในซอร์สพระคำ (`origin/main`):
```
src/IslandApp.vue:8   import DockKey from '@pleng/components/DockKey.vue'
vite.config.js        alias { '@pleng': '../pleng.phrakham.life/src' }   // ชี้ src จริงของ pleng
                      // คอมเมนต์: "points STRAIGHT at pleng's src (not a copy).
                      //            Edit DockKey.vue there → rebuild here → phrakham gets it."
```
- **pleng:** ใช้ `DockKey.vue` ตรงใน Vue app · feed `ITEMS_EDIT`/`ITEMS_SING`/`ITEMS_PRINT`
- **phrakham:** `IslandApp.vue` (host glue: TTS อ่านออกเสียง + Aa + ภาพ) import `DockKey.vue` ตัวเดียวกัน → Vite bundle เป็น `assets/pk-dock-island.js` (96KB / **36.6KB gzip**) → Quarto โหลดเฉพาะหน้าบทความ · feed reading dock (▶ฟังบทความ/speed/Aa/ภาพ) · `store-key="phrakham-reading"`
- **engine เดียวกัน ต่างแค่ DATA (items)** — พระคำปุ่มน้อย (grip·▶·Aa·⚙ + transport ตอนเล่น) · เพลงปุ่มเยอะ (13 ปุ่ม edit) · **ทั้งคู่ใช้ ⚙ Setting page (pin/reorder/transparency) อันเดียวกัน**

### ✅ ตอบ Q2 (แก้ใหม่): แก้ครั้งเดียวได้ 2 เว็บจริง — กลไก
| | |
|---|---|
| **source** | 1 ที่ = `pleng/src/components/DockKey.vue` |
| **pleng ได้ยังไง** | ใช้ตรง → pleng build/deploy ปกติ |
| **phrakham ได้ยังไง** | `npm run build` (vite · ที่ root พระคำ) → rebuild `pk-dock-island.js` → **commit bundle** (Quarto resource · node_modules gitignore) → `quarto render` → deploy |
| **แปลว่า** | **1 source edit · 2 deploy** — ไม่ fork ไม่ก๊อป-drift · แต่ **ไม่ auto**: ต้อง trigger rebuild ฝั่งพระคำ (report เดิมเสนอผูก `npm run build` เข้า `deploy-github.ps1` กัน bundle เก่าค้าง — ยังไม่ทำ) |

### สิ่งที่แชร์ "แบบก๊อป-verbatim" (คนละกลไกกับ DockKey · ยังจริง)
`pk-scrollnav.js` = identical (diff=0) แชร์แบบก๊อปมือ · `pk-fontsize.js` = แชร์ core (Aa ของพระคำเรียกใช้) · `pk-tts.js` = framework-agnostic (report บอกจะ graduate เป็น shared แบบ pk-fontsize) · **`pk-drawer.js`** = pleng ใช้ (ShellBar ☰) · พระคำไม่ track (คนละของกับ dock · ไม่เกี่ยวงานนี้).

---

## 2 · Q3 · feasibility ราย element (config อยู่ที่ engine = 2 เว็บได้)

| พี่เปาขอ | DockKey engine วันนี้ | เติมที่ engine (→ 2 เว็บได้) |
|---|---|---|
| **id คงที่ต่อปุ่ม (ชื่ออ้างอิง)** | ✅ **มีแล้ว** — ทุก descriptor มี `id` + `name` · `byId` · `:data-cell` | 0 — surface/document/toggle (§4.5) |
| **show/hide ปุ่ม** | 🟡 กลไก `hidden` มี · Setting page ทำแค่ pin/reorder | เติม `hiddenOverride` ต่อ user (แพตเทิร์นเดียวกับ `pins`) · namespaced ด้วย `storeKey` → **user เพลง กับ user พระคำ แยกกัน อัตโนมัติ** |
| **ตำแหน่ง/ลำดับ** | ✅ pin+reorder + `place` declarative | ~มีแล้ว |
| **settings ⚙** | ✅ มี (pin/reorder + transparency · ใช้ทั้ง 2 เว็บ) | ต่อยอดหน้าเดิม |
| **resize (พี่เปา: "ใหญ่ไป")** | 🟡 ย้าย/ลากได้ · ปรับ**ขนาด**ไม่ได้ · ขนาดคุมด้วย `cap`(m7/d14)+44px | **resize = ขนาด** → (ก) ลด default เล็กลง (UX ฟันธง · ≥44px) (ข) handle ปรับขนาด+persist |
| **toggle ชื่อ label** | ❌ ยังไม่มี · `name` มี | flag `showLabels` + persist + render `name` มีเงื่อนไข |
| **persist ต่อ user** | ✅ localStorage `pleng.dockkey.<storeKey>.*` | per-device มีแล้ว · cross-device = profile (เฟสเสริม) |

### 🔴 regression พระคำ = มีจริง (แก้ที่ผมเขียนผิด) → ต้องเป็น gate
engine แชร์จริง → **ทุกการแตะ `DockKey.vue` กระทบ dock อ่านออกเสียงของพระคำด้วย**. ต้องกัน:
- config UI ใหม่ใน ⚙ / resize / label-toggle → โผล่ที่พระคำด้วย (น่าจะดี แต่**ต้องพิสูจน์ไม่พังอ่านออกเสียง**: transport โผล่ตอนเล่น · Aa slot เป็น page-drawn · gating โชว์เฉพาะหน้าบทความ)
- **DoD บังคับ:** ทุกงานแตะ engine → **rebuild `pk-dock-island.js` + รัน standards gate ของพระคำ** (report เดิมมี checklist: target 48px · aria-label ครบ · no h-scroll 375/390 · print hidden) ก่อนถือว่าเสร็จ · ทดสอบทั้ง 2 host
- **regression risk แท้จริง = engine change เท่านั้น** · แค่แก้ `ITEMS_EDIT` (data เพลง) → พระคำไม่กระทบ (คนละ items)

---

## 3 · เฟส (ฟันธง · UX จัด flow · config ที่ engine = 2 เว็บ)

| เฟส | ทำ | แตะ | 2 เว็บ? | regression guard |
|---|---|---|---|---|
| **1 · user config บน engine** ⭐ | Setting page: show/hide ต่อปุ่ม + toggle ชื่อ + reorder เดิม · persist localStorage per storeKey | `DockKey.vue` (+ items แต่ละหน้า) | ✅ ได้ทั้ง 2 | rebuild island + standards gate พระคำ |
| **2 · resize ขนาด + ลด default** | ลด default เล็กลง (พี่เปา) + handle ปรับขนาด | `DockKey.vue` | ✅ ได้ทั้ง 2 | เช็ก dock พระคำไม่เล็กจนกด TTS ยาก · 48px |
| **3 · persist cross-device** | mirror prefs → Supabase profile (เฉพาะ login) | +DB+`store.js` | pleng (พระคำไม่มี auth เดียวกัน) | — |

**go:** เฟส 1 = refine · engine พร้อม ~80% · **แต่บังคับ 2-web test** ก่อนถือเสร็จ · **1 ไฟล์ 1 สาย ข้าม 2 product:** งานแตะ `DockKey.vue` = สายเดียว · ต้อง rebuild+verify พระคำในสายเดียวกัน (PM คิว)

---

## 4.5 · ⭐ ระบบชื่ออ้างอิง (P'Aim ข้อ 5 · "โครงสร้างสื่อสารทีม") — ground-truth

ทุก descriptor มี `id` คงที่ + `name` ไทยอยู่แล้ว → ข้อ 5 = **surface + document + toggle ไม่ใช่ประดิษฐ์ใหม่**. ตาราง edit dock (`ITEMS_EDIT` · หน้าที่พี่เปาขอก่อน):

| id | name (ไทย) | kind | | id | name | kind |
|---|---|---|---|---|---|---|
| `keys` | แป้นสัญลักษณ์ | keys | | `setting` | ตั้งค่า | gear |
| `grip` | ย้าย/ย่อ | grip | | `save` | (บันทึก) | btn |
| `undo` | ย้อน | btn | | `playAll` | ฟังทั้งเพลง | btn |
| `redo` | ทำซ้ำ | btn | | `export` | ดาวน์โหลด | slot |
| `play` | ฟังท่อน | btn | | `draft` | บันทึกร่าง | btn |
| `stop` | หยุด | btn | | `preview` | ดูผลทั้งเพลง | toggle |
| `soundctl` | เสียงดนตรี | slot | | | | |

→ เหลือ (1) UX ทำตาราง "ปุ่ม→ชื่อ→id" เป็นเอกสารทีม (ต่อยอด + เพิ่มหน้า print/sing + **dock อ่านออกเสียงพระคำ**) · (2) toggle โชว์/ซ่อน `name` · (3) `id`→`data-dock-id` บน DOM = test hook + `aria-label` จากชื่อไทย (a11y ในตัว · **ได้ทั้ง 2 เว็บ เพราะอยู่ที่ engine**)

---

## 5 · ที่ SA ไม่ตัดสินแทน — ส่ง UX + รอ PM/P'Aim

1. **นิยาม default ขนาดเล็กลง** (พี่เปาว่าใหญ่ไป) = UX ฟันธง (≥44px)
2. **config โผล่ที่พระคำด้วยเอาไหม** — show/hide/resize/label ที่ engine จะเห็นผลที่ dock อ่านออกเสียงด้วย → P'Aim/UX ยืนยันว่าอยากให้ 2 เว็บได้พร้อมกัน (น่าจะใช่ ตามเจตนา "แก้ core ร่วม") หรือจะ gate เฉพาะบางเว็บ
3. **persist cross-device** (localStorage พอ หรือ profile) = P'Aim เลือก
4. **ยังไม่ build** — UX flow/mockup → ผมตรวจ feasibility คู่ → P'Aim เคาะ GATE 1 → DS + จ่าย dev (+ แผน rebuild/verify พระคำ)

---

*verify 2 repo (pleng `studio-shell-redesign` · phrakham `phrakham.life2 origin/main` ซอร์สจริง) 2026-07-18 · SA*
