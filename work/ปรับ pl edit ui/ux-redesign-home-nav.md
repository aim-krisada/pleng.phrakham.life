# UX Redesign — HOME + SHELL/NAV + แยก "สร้าง" ออกจาก "ค้นหา/เปิด" (EPIC G)

**สาย 2 (whole-app shell/nav/home) · คู่ขนานกับ editor inline (EPIC A–D)**
ต่อยอด (delta) จาก: `docs/us/home-redesign.md` + `docs/ds/home-redesign.md` (bookshelf · P'Aim เคาะ 11–12 ก.ค.) · `docs/mission.md` · friction map `work/ปรับ pl edit ui/ux-redesign-workflow.md §1–2` · เขตแดน editor = `docs/us/editor-orientation.md`, `docs/us/selection-driven-editor.md`
**ยึด:** `docs/ui-standards.md` (WCAG 2.2 AA · button hierarchy · single source of action) · `docs/ux-platform-patterns.md` (touch≠pointer · §5.5 ทุกอุปกรณ์)
**ห้ามแตะ `src/`** (สายนี้ = ออกแบบ/wireframe) · **ห้ามออกแบบภายใน inline editor** (สายอื่นถือ) — สายนี้ถือแค่ shell/home/nav/create-flow รอบ ๆ editor

> 🔴 **แก้ตามพี่เอม (22 ก.ค.): คง bookshelf เป็นหน้าแรกเดิม — ไม่เปลี่ยนเป็น list ทุกเพลง.** เหตุผล: หน้าแรกมีช่องค้น = หาเพลงตรงได้อยู่แล้ว (เพลงนำโดยพฤตินัย) · usage จริงคนเลือกเล่มก่อน → **S-2 ไม่ถือเป็นปัญหา.** ที่ยังทำ: เพิ่ม chip ★ (โปรด) + แก้ placeholder (S-3) + แยกสร้าง/ค้น (M-1/M-2) + ตัดปุ่มหน้าเพลง (S-6) + แชร์/QR (S-1). ดู US-G1 ที่แก้แล้ว.

---

## 0 · ตาราง "มีแล้ว / ใหม่จริง / ต่อยอด" (บังคับตาม ux-platform-patterns §4 — เปิดโค้ดจริงแล้ว)

| ส่วน | สถานะ | หลักฐาน (ไฟล์:บรรทัด) |
|---|---|---|
| bookshelf 2 ชั้น (เล่ม→เพลง) + search override | ✅ มีแล้ว — **ไม่รื้อ** | `SongList.vue:36,97,142,189,224` · US/DS home-redesign |
| ช่องค้นหาบนสุดตลอด | ✅ มีแล้ว — **แค่แก้ placeholder (S-3)** | `SongList.vue:127-133` |
| `song-row` / `song-card` / `.facet-chip` styles | ✅ มีแล้ว — **reuse ทำ list + chips** | `SongList.vue:303,371,440` |
| shell เดียวใช้ทุกหน้า + teleport slots (`#shell-left/title/menus`) | ✅ มีแล้ว — **reuse เป็นที่วางของใหม่** | `ShellBar.vue:133,174,177` · `Studio.vue:274,280` |
| drawer มือถือ (PKDrawer · a11y ครบ) | ✅ มีแล้ว — **แค่เพิ่ม 1 แถวใน drawer** | `ShellBar.vue:44,225` |
| route `/studio` (bare = เพลงเปล่า → editor) | ✅ มีแล้ว — **create-flow reuse ได้เลย ไม่ต้องเพิ่ม route** | `router.js:16` · `Studio.vue:64-67,238` |
| ครีเอต + ค้นหา ปนกันใน "เพลง▾" | 🟡 ต่อยอด — **ผ่า 2 เจตนา** (create ออก shell/home · find คงในเมนู) | `Studio.vue:284,301-313` |
| 3-mode switch teleport | 🟡 ต่อยอด — คงไว้ · เพิ่ม back + share + overflow ข้าง ๆ | `Studio.vue:316-328` |
| landing นำด้วย **หมวดเล่ม** ก่อนเพลง (S-2) | 🟡 ต่อยอด — เพิ่ม default "ทั้งหมด" (content-first) · เล่ม = ตัวกรอง | `SongList.vue:224` (เห็นเล่มก่อน) |
| ปุ่ม "＋ สร้างเพลงใหม่" บน shell/home | ❌ **ใหม่จริง** (วันนี้ลิงก์เดียว = เนื้อความ About) | `About.vue:82` · M-1 |
| ปุ่ม/ไอคอน **แชร์** | ❌ ใหม่จริง (ดู `ux-redesign-share-favorite-playlist.md`) | ไม่พบ `navigator.share` ใน `src/` |
| ★ favorite quick-toggle บนแถว/การ์ด | ❌ ใหม่จริง (ดูไฟล์ share/fav/playlist) | — |
| 🔍 ใน shell = แค่กลับหน้าแรก+โฟกัส (ซ้ำ) | 🟡 ต่อยอด — เก็บบนหน้าอื่น · หน้าแรกซ่อน (ช่องค้นอยู่ตรงหน้าแล้ว) | `ShellBar.vue:121-128,181` |

> **หลักตัดสิน:** งานนี้ = **refine ไม่ redesign** (`feedback_refine_not_redesign`). ของสำคัญ "มีอยู่แล้วเกือบหมด แค่วางผิดที่/ปนเจตนา" — ตรงกับข้อสรุปสาย editor-orientation `§7`. สิ่งเดียวที่ **ใหม่จริง** = ปุ่มสร้าง · แชร์ · ★.

---

## 1 · หลัก IA ที่ยึด (อ้างมาตรฐานต่อการตัดสินใจ)

- **นำด้วยงาน/เนื้อหา ไม่ใช่ taxonomy** — Spotify/Apple Music นำด้วย content (ล่าสุด/ทั้งหมด) แล้วค่อยให้กรอง → NN/g *Recognition rather than recall* · Nielsen #6. **แต่คง bookshelf** ที่ P'Aim เคาะไว้เป็น **มุมมองหนึ่ง** (คนถือหนังสือกระดาษยังหาแบบเล่มได้) — parity align-UP ไม่ทิ้งของดี.
- **1 เจตนา = 1 ปุ่ม 1 บ้าน** — "สร้าง" (generative) กับ "เปิด/ค้น" (navigational) เป็นคนละงาน ต้องคนละที่ → NN/g #4 consistency · Hick's Law (`ui-standards §2` single source of action). วันนี้ปนใน "เพลง▾" = ต้นเหตุ "ปุ่มเพลงที่งง".
- **Google-Docs-clean** (mission) — โชว์ของใช้บ่อย · ที่เหลือหลัง disclosure. หน้าเพลงตัด 20+ ปุ่มค้าง → แกนหลัก + overflow.
- **touch ≠ pointer** (`ux-platform-patterns §1`) — desktop = ปุ่ม/เมนูบนแถบ · mobile = FAB (thumb-zone) + drawer + full-screen sheet. ออกแบบทั้งสองท่าตั้งแต่แรก.
- **button hierarchy** — 1 บริบท = 1 ปุ่มหลัก filled. "＋ สร้างเพลงใหม่" = ปุ่มหลักของ shell/home. Play = ปุ่มหลักของหน้าฝึกร้อง. ห้ามมีปุ่ม filled แข่งกัน.

---

## 1.5 · 🔴 GROUND-UP (แก้ตามพี่เอม 22 ก.ค. — ยึดอันนี้ · §3–§4 ด้านล่าง = กรอบเก่า SUPERSEDED)

**ยอมรับ:** wireframe เดิมยังติดกรอบเก่า (คง 3 โหมด [ฝึก][แผ่น][แก้] · เมนูกองบนแถบ · bolt ＋สร้างไว้ขวา) = ยังไม่ integrate ดีไซน์ใหม่ที่ล็อก (design-locked-final: พื้นผิวเดียว · ดินสอ · Play). คิดใหม่จาก user journey:

### หน้าเพลง = พื้นผิวเดียว · ไม่มีโหมด (integrate ดินสอ/Play)
เลิก [ฝึก][แผ่น][แก้]. มีแค่ **แผ่นเพลง** เป็นพื้นผิว · ที่เหลือ = ปุ่มการกระทำ:
- **แผ่นเพลง = สิ่งที่แสดง** (default อ่าน/ร้องได้เลย) — ไม่ใช่ "โหมดแผ่น"
- **▶ เล่น = ฝึกร้อง** (เสียง + ไฮไลต์วิ่งตามพยางค์) — ปุ่ม ไม่ใช่โหมด
- **✏️ ดินสอ = แก้ inline บนแผ่นนั้นเลย** · ออก → กลับเป็นแผ่น — ปุ่ม ไม่ใช่โหมด
- **🖨 พิมพ์ · ↗ แชร์ · ★ โปรด = การกระทำ**
```
มือถือ:
┌───────────────────────────────┐
│ ‹  12. พระเจ้าเที่ยงแท้   ✏️ ↗ ⋮│  ← back·ชื่อ·ดินสอ·แชร์·overflow  (ไม่มี tab โหมด)
├───────────────────────────────┤
│   1 2 3 − | 5 6 5 −            │  ← แผ่นเพลง (พื้นผิวเดียว · SongViewer/SongSheet)
│   สรร-เส-ริญ  พระ-เจ้า          │
├───────────────────────────────┤
│            ▶  เล่น             │  ← Play = ฝึกร้อง · ปุ่มหลักเดียว
└───────────────────────────────┘
  ⋮ = 🖨 พิมพ์ A4 · ⬇ ดาวน์โหลด · ★ โปรด · 🔎 เปิดเพลงอื่น · ⚙ เสียง/คีย์/tempo
```
กด **✏️** → แผ่นกลายเป็นแก้ได้ (cursor + พิมพ์ inline · แถบล่างเปลี่ยนเป็นเครื่องมือแก้ contextual) · **ไม่มีคำว่า ฝึก/แผ่น/แก้ บนจอ** · นี่คือการ sync กับดีไซน์ inline ที่ล็อก

### Shell/nav = journey-first (ไม่ใช่ menu-first)
เลิก mega-nav กองบนแถบ + เลิก bolt ＋สร้างแยกขวา. มี 2 บริบทเท่านั้น:
- **หน้าแรก = ศูนย์ "หา + สร้าง" เพลง:** ค้นหา + bookshelf + **＋ สร้างเพลงใหม่** อยู่ด้วยกัน*ในหน้า* (coherent ตาม journey) · เมนูจำเป็นเดิม (คู่มือ · พระคำ↗ · เกี่ยวกับเรา · เข้าระบบ) = เก็บใน **☰/overflow เดียว** ไม่แข่งพื้นที่บนสุด
- **หน้าเพลง:** shell = `‹back · ชื่อ · ✏️ · ↗ · ⋮` (ไม่มีเมนู library มารก)
→ create/find ยัง**แยกเจตนาชัด** (ตาม M-2) **แต่อยู่บ้านเดียวกัน = หน้าแรก** ตาม journey · ไม่ใช่ซ้าย-ขวาคนละมุมบนแถบ · **"รายการเพลง" ไม่ใช่เมนูแยก — มันคือหน้าแรก** (แตะ brand/⌂ กลับมา)

---

## 2 · Wireframe (a) — HOME / ค้นหา

หน้าเดียวคือ `SongList.vue` (คง data flow เดิม · เพิ่ม "state ตัวกรอง" + ★ + FAB). ช่องค้นหาบนสุดตลอด. **query ว่าง = โชว์ตามตัวกรอง · query มีค่า = ผลค้นหาแบน override ทุกอย่าง** (คงพฤติกรรมเดิม `SongList.vue:40,142`).

### มือถือ (360–412px · default)
```
┌───────────────────────────────┐
│ ⌂       🔍  ＋สร้าง   ☰   ⤷    │  ← ShellBar: brand · (🔍 ซ่อนบน "/") · ＋ · ☰ · login
├───────────────────────────────┤
│ ┌───────────────────────────┐ │
│ │ 🔍  ค้นหาเพลง             │ │  ← .song-search · placeholder สั้น (แก้ S-3)
│ └───────────────────────────┘ │
│ ⟨ ทั้งหมด ⟩ ⟨ เล่ม ⟩ ⟨ ★ ⟩   │  ← chip row (reuse .facet-chip) · default=ทั้งหมด
├───────────────────────────────┤
│ 12  พระเจ้าเที่ยงแท้    C   ★  │  ← .song-row (reuse) + ★ quick-fav (ใหม่ · ขวาสุด)
│ 15  เชิญพระวิญญาณ      D   ☆  │
│ 21  เมื่อข้าพบพระองค์  G   ★  │
│ …                             │
│                     ┌───────┐ │
│                     │＋ เพลง│ │  ← FAB (ใหม่ · มือถือเท่านั้น · thumb-zone · Material FAB)
│                     └───────┘ │
└───────────────────────────────┘
```
- **default = "ทั้งหมด"** (รายการเพลงเลย · content-first → แก้ S-2) เรียงตาม `number`. ผู้ใช้ทั่วไปเจอเพลงทันที ไม่ต้องรู้ก่อนว่าอยู่เล่มไหน.
- **"เล่ม"** = สลับไปมุมมอง bookshelf เดิม (`SongList.vue:224` grid เล่ม → drill เข้าเพลง) — **ไม่รื้อ ของ P'Aim เคาะแล้ว** · แค่ย้ายจาก "ด่านแรกบังคับ" → "ตัวเลือกหนึ่ง".
- **"★"** = กรองเฉพาะรายการโปรด (localStorage · ดูไฟล์ favorite). ถ้ายังไม่มี ★ = empty state ชวนกดดาว.
- FAB `＋ เพลงใหม่` → `router.push('/studio')` (bare → editor เปล่า · reuse `Studio.vue:64`).

### เดสก์ท็อป (≥992px)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ เพลง.พระคำ.ชีวิต   รายการเพลง  คู่มือ▾  พระคำ↗  เกี่ยวกับเรา   ＋สร้างเพลงใหม่  ⚙  เข้าสู่ระบบ │
├──────────────────────────────────────────────────────────────────────────┤
│   ┌──────────────────────────────────────────────────────┐                │
│   │ 🔍  ค้นหาเพลง                                        │                │
│   └──────────────────────────────────────────────────────┘                │
│   ⟨ ทั้งหมด ⟩  ⟨ เล่ม ⟩  ⟨ ★ รายการโปรด ⟩                                  │
│   ────────────────────────────────────────────────────                    │
│   12  พระเจ้าเที่ยงแท้ ..............................  คีย์ C   ★           │
│   15  เชิญพระวิญญาณ ................................  คีย์ D   ☆           │
│   …                                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```
- Desktop ไม่มี FAB — **"＋ สร้างเพลงใหม่" = ปุ่มบนแถบขวา** (filled brand · ปุ่มหลักเดียวของ shell).
- 🔍 บนหน้าแรก **ซ่อน** (ช่องค้นอยู่ตรงหน้าแล้ว = ปุ่มซ้ำ · แก้ cross-cutting note). บนหน้าอื่น (เพลง/คู่มือ) 🔍 ยังโชว์ = ทางลัดกลับมาค้น.

**Progressive disclosure ของหน้านี้:** default โชว์ = ช่องค้น + chip 3 ตัว + รายการ. ซ่อน = facets ตรวจทาน (`onlyUnverified`/`theme` · `SongList.vue:149`) โผล่**เฉพาะตอนค้นหา + ล็อกอิน** (คงเดิม · ทีมเท่านั้น). ผู้ใช้ทั่วไปไม่เห็นศัพท์ QA.
**Host:** `SongList.vue` ทั้งหมด (chip row + ★ = scoped ในไฟล์นี้ · FAB = element ใหม่ในไฟล์นี้).

---

## 3 · Wireframe (b) — SHELL / NAV  ⛔ SUPERSEDED โดย §1.5 (กรอบเก่า · เก็บไว้อ้างอิงเฉยๆ)

**หลักการ:** shell เดียว (`ShellBar.vue`) ทุกหน้า teleport ของเฉพาะหน้าเข้ามา. delta = เพิ่ม "＋ สร้าง" ให้เป็น affordance ระดับ shell + จัดกลุ่ม.

### Desktop shell (ทุกหน้า)
```
[brand]  รายการเพลง  คู่มือ▾  พระคำ↗  เกี่ยวกับเรา   ···(teleport ของหน้า)···   ＋สร้างเพลงใหม่  🔍*  ⚙  เข้าสู่ระบบ
                                                                                 └ ปุ่มหลัก filled  └ *ซ่อนบน "/"
```
### Mobile shell (ทุกหน้า)
```
[icon]                          ···(teleport)···                 🔍*  ＋  ☰  ⤷
                                                                       │   └ drawer (nav + เครื่องมือ + ＋สร้างเพลงใหม่)
                                                                       └ ＋ ไอคอนบนแถบ (ทางลัดสร้าง · นอก drawer)
```
- **drawer (มือถือ)** เพิ่ม 1 แถวใต้ nav: `＋ สร้างเพลงใหม่` (นำทางไป `/studio`) — reuse โครง `sb-drawer-nav`/`sb-drawer-tools` (`ShellBar.vue:229,239`). ทางลัด ＋ บนแถบ = สำหรับคนที่ไม่เปิด drawer (Fitts).
- **"เพลง▾" ที่ Studio teleport (`Studio.vue:284`) ผ่าเจตนา:** เหลือเฉพาะ **"เปิดเพลงอื่น"** (ค้น/สลับเพลง · ComboSelect เดิม `:301-313` ส่วน find) → ย้ายไป overflow ⋮ ของหน้าเพลง (ดู §4). ส่วน **create** (`createNew()` `:238`) ออกไปเป็นปุ่ม shell/home. **ผล: ปุ่มเดียว 2 งาน → 2 บ้านชัด (แก้ M-1,M-2).**

**Host:** `ShellBar.vue` (ปุ่ม ＋ desktop/mobile + drawer row + ซ่อน 🔍 บน "/") · `Studio.vue` (ยก create ออกจาก teleport panel).

---

## 4 · Wireframe (c) — หน้าเพลง  ⛔ SUPERSEDED โดย §1.5 (มี [ฝึก][แผ่น][แก้] = กรอบเก่า · ไม่เอาแล้ว)

**ปัญหาเดิม:** shell 6 + teleport(title+เพลง▾+3โหมด) + dock 8–10 = ค้างพร้อมกัน 20+ (`ux-redesign-workflow §1 cross-cutting`). Play จมใน dock หนัก (S-6).
**คำตอบ:** dock มี collapse อยู่แล้ว (DockKey) → ให้ **default = ยุบ** เหลือแกนหลัก · advanced หลัง ⚙ (มีแล้ว `SongViewer.vue:505`). shell เหลือของจำเป็น + Share + overflow.

### หน้าเพลง — ฝึกร้อง (มือถือ)
```
┌───────────────────────────────┐
│ ‹  12. พระเจ้าเที่ยงแท้         │  ← back + ชื่อเพลง (teleport #shell-title · มีแล้ว)
│    [ฝึก] [แผ่น] [แก้]  ↗  ⋮    │  ← mode switch(มีแล้ว) + ↗แชร์(ใหม่) + ⋮overflow(ใหม่)
├───────────────────────────────┤
│                               │
│   1  2  3  −  |  5  6  5  −    │  ← เนื้อ/โน้ต (SongViewer · ไม่แตะ internals)
│   สรร-เส-ริญ    พระ-เจ้า        │
│                               │
├───────────────────────────────┤
│  ⠿   ▶  เล่น          Aa   ⚙   │  ← dock ยุบ default: grip · Play(prime) · Aa · ⚙
└───────────────────────────────┘
        └ ⚙ เปิด popover: เสียง/ensemble/instrument/style/คอร์ด/คีย์/tempo (มีแล้ว)
```
- **overflow ⋮** = { ↗ แชร์ · ★ บันทึกโปรด · ⬇ ดาวน์โหลด (PDF/JSON/MP3 = ExportTool เดิม) · 🔎 เปิดเพลงอื่น }. รวม action รอง 1 บ้าน (Hick's Law · single source).
- **↗ แชร์** โชว์เป็นไอคอนแยกบน shell (ไม่ซ่อนใน ⋮) เพราะ = แกน #1 (S-1) · ใช้บ่อย.
- **Play = ปุ่มหลักเดียว** ของหน้าฝึกร้อง (filled) — advanced ทั้งหมดอยู่หลัง ⚙ แล้ว (progressive). แก้ S-6 โดย**ไม่ต้องรื้อ** dock: แค่ตั้ง default collapsed + ยก Play เป็น prime.

### หน้าเพลง — เดสก์ท็อป
```
[brand] รายการเพลง คู่มือ▾ … │ 12. พระเจ้าเที่ยงแท้  [ฝึก][แผ่น][แก้]  ↗แชร์  ⋮  │ 🔍 ⚙ เข้าสู่ระบบ
────────────────────────────────────────────────────────────────────────────────
                          (เนื้อ/โน้ต)
────────────────────────────────────────────────────────────────────────────────
                    ⠿  ▶ เล่น        คีย์ C ▾   ♩=108 ▾   Aa   ⚙   ⬇
                                     └ desktop มีที่ → กาง quick-control ได้มากกว่า (คีย์/tempo)
```

**Progressive disclosure (สรุปนับใหม่):** persistent มือถือ ≈ back·title·3โหมด·↗·⋮ (shell) + grip·Play·Aa·⚙ (dock) = **~9** (จาก 20+). ที่เหลือ = หลัง ⚙ / ⋮ / drawer.
**Host:** `Studio.vue` teleport (`#shell-title` back+title · `#shell-menus` mode+↗+⋮) · dock default-collapsed = prop/descriptor ใน `SongViewer.vue`(ITEMS_SING) + `Studio.vue`(printItems) · **ไม่แตะ EditorMode / โหมดแก้ (สายอื่น)**.

> **หมายเหตุเขตแดน:** หน้า "แก้ไข" มีสาย editor-orientation + selection-driven ถืออยู่ (แถบตัวตน sticky · ปุ่มพูดผลลัพธ์ · Aa บน shell). สายนี้ **แค่จองที่บน shell** ให้ back/title/mode/↗/⋮ อยู่ร่วมกับของ editor ได้ (teleport slot เดียวกัน) · ไม่ยุ่ง logic ปุ่มหลัก/สถานะของ editor.

---

## 5 · Wireframe (d) — "＋ สร้างเพลงใหม่" แยกขาดจาก "เปิด/ค้นหา"

| เจตนา | ปุ่ม | ที่อยู่ | ปลายทาง | reuse |
|---|---|---|---|---|
| **สร้าง (generative)** | `＋ สร้างเพลงใหม่` (filled) | desktop: shell ขวา · mobile: ＋ บนแถบ + แถวใน drawer + FAB หน้าแรก | `/studio` (bare → blank editor) | `router.js:16` · `Studio.vue:64,238` |
| **ค้น/เปิด (navigational)** | ช่องค้นหา + รายการ · 🔍 | หน้าแรก (`/`) เป็นหลัก · 🔍 บนหน้าอื่น | `/song/:id` | `SongList.vue:127` · `ShellBar.vue:121` |
| **สลับเพลงระหว่างเปิดอยู่** | `🔎 เปิดเพลงอื่น` | overflow ⋮ ของหน้าเพลง | `/song/:id` (คงโหมด) | ComboSelect ส่วน find `Studio.vue:305` |

**เหตุผล:** สร้าง = สร้างของใหม่จากศูนย์ · ค้น = หาของที่มี — เจตนาตรงข้าม ผู้ใช้มาด้วยความตั้งใจต่างกัน. รวมไว้ปุ่มเดียว = ต้องอ่านก่อนถึงรู้ว่าปุ่มทำอะไร (recall) = "ปุ่มที่งง". แยกแล้ว = แต่ละปุ่มพูดเจตนาตัวเองชัด (recognition · NN/g #6).

```
สร้าง                         ค้น/เปิด
┌───────────────┐            ┌───────────────────────────┐
│ ＋ สร้างเพลงใหม่│  ⟵ คนละ ⟶ │ 🔍 ค้นหาเพลง               │
└───────────────┘   ปุ่ม     │ 12. …  15. …  21. …        │
   → editor เปล่า            └───────────────────────────┘
                                → /song/:id
```

---

## 6 · Responsive + a11y (ผูก ui-standards + ux-platform-patterns §5.5)

- **fluid 320→∞** · ทดสอบ: มือถือเล็ก ~360/375 · ใหญ่ ~412 · Fold พับ ~344 · Fold กาง ~690–768 · tablet 768/1024 · desktop ≥1280 · 2 orientation · continuity ข้ามพับ/หมุน (chip ที่เลือก + ตำแหน่ง scroll คงไว้).
- **target ≥ 44px** — chip/★/FAB/mode/⋮/↗ ทุกตัว (WCAG 2.5.8 · โปรเจกต์ 44). ★ ในแถวต้อง ≥44 ทั้งที่ไอคอนเล็ก (hit-area padding).
- **ไม่ scroll แนวนอน** ที่ 360 — แถว = บรรทัดเดียว (ชื่อ truncate + ★/key ค้างขวา · reuse `SongList.vue:397` `.ttl` wrap + `.no/.key` flex-none).
- **touch≠pointer** — FAB = มือถือเท่านั้น (`@media (hover:hover)` gate ปุ่มสร้างแบบ desktop) · overflow ⋮/⚙ = full-screen/bottom-sheet บนมือถือ ไม่ใช่ floating panel เล็ก (`ux-platform-patterns §1`) · ★ = tap ไม่ผูก hover.
- **safe-area** — FAB + dock ล่างเคารพ `env(safe-area-inset-bottom)` (viewport-fit=cover มีแล้ว B020).
- **contrast ≥ 4.5:1** · focus-visible · theme tokens เดิม (ไม่ hard-code สี · `SongList.vue:245`).
- **ไอคอนมี aria-label** ทุกตัว (＋/↗/⋮/★/🔍) · ★ ใช้ ไอคอน+`aria-pressed` ไม่พึ่งสีล้วน (WCAG 1.4.1).

---

## User Stories + AC (EPIC G — find / create / nav)

> traceable: mission "หาเพลงเจอเร็ว · ทุกคนใช้ง่าย" + friction `ux-redesign-workflow §1` (S-2/S-3/S-6 · M-1/M-2/M-3). ทุก AC วัดได้ · tester เทียบทีละข้อ (`ui-standards §4`).

### US-G1 — 🔴 แก้ตามพี่เอม 22 ก.ค.: คง bookshelf หน้าแรก + ช่องค้น (ไม่ list ทุกเพลง)
**decision P'Aim:** bookshelf ที่ทำไว้ OK · ช่องค้นบนหน้าแรก = หาเพลงตรง = เพลงนำโดยพฤตินัย · usage จริงคนเลือกเล่มก่อน → คง default เดิม แค่เติมค่าเพิ่ม
*ในฐานะ* คนร้อง *ฉันต้องการ* หาเพลงจากหน้าแรกได้ทั้ง "ค้นตรง" และ "เลือกเล่ม" *เพื่อ* เจอเพลงเร็วตามที่ตัวเองถนัด
- **AC-G1.1** landing คง **bookshelf เดิม** (grid เล่ม → drill เข้าเพลง · ไม่ regress home-redesign) — **ไม่เปลี่ยนเป็น list ทุกเพลง**.
- **AC-G1.2** ช่องค้นบนสุด = ทางตรงเข้าเพลง (มีอยู่แล้ว) · เพิ่ม **chip "★ รายการโปรด"** เป็นตัวกรอง (ค่าเพิ่ม · ไม่กระทบ default bookshelf · ไม่ต้องมี chip "ทั้งหมด" บังคับ).
- **AC-G1.3** placeholder ช่องค้น = สั้นเป็นภาษาคน ("ค้นหาเพลง") · ไม่ล้น 360px (แก้ S-3 · syntax เดิม เลข/คีย์/โน้ต ยังค้นได้ · ไม่แตะ `songSearch.js`).
- **AC-G1.4** query มีค่า → ผลค้นหา override (คงเดิม) · ล้าง query → กลับ bookshelf.
- *test:* default = bookshelf (ไม่ regress home-redesign) · chip ★ กรองโปรด · placeholder สั้น · axe 0 · no-hscroll @360/412.

> หมายเหตุ: wireframe §2 ที่วาด "default = ทั้งหมด (list)" = **superseded** โดย US-G1 นี้ (คง bookshelf) · ★ chip + FAB สร้าง + placeholder ยังใช้ตามภาพ

### US-G2 — "＋ สร้างเพลงใหม่" หาเจอทันที (แก้ M-1)
*ในฐานะ* คนทำเพลง *ฉันต้องการ* ปุ่มสร้างเพลงใหม่ที่เห็นชัดจากหน้าแรก *เพื่อ* เริ่มเพลงใหม่โดยไม่ต้องเปิดเพลงเก่าก่อน
- **AC-G2.1** ปุ่ม `＋ สร้างเพลงใหม่` เข้าถึงได้จาก **หน้าแรกโดยตรง** (desktop: shell/FAB-mobile) โดยไม่ต้องเปิดเพลงอื่นก่อน.
- **AC-G2.2** กด → เปิด editor เพลงเปล่า (route `/studio`) — ไม่มี state เพลงเดิมค้าง.
- **AC-G2.3** desktop = ปุ่ม filled บน shell · mobile = FAB (thumb-zone) + แถวใน drawer · ทุกตัวลิงก์ปลายทางเดียวกัน (single source of action).
- *test:* จากหน้าแรก คลิกได้ใน 1 ขั้น → assert route `/studio` + editor เปล่า · target ≥44 · FAB โผล่เฉพาะ `@media(hover:none)`/มือถือ.

### US-G3 — แยก "สร้าง" ออกจาก "ค้น/เปิด" (แก้ M-2, M-3)
*ในฐานะ* คนทำเพลง *ฉันต้องการ* ปุ่มสร้างกับปุ่มค้น/เปิดแยกกันชัด *เพื่อ* ไม่งงว่าปุ่มไหนทำอะไร
- **AC-G3.1** "สร้าง" กับ "เปิด/ค้น" = คนละปุ่ม คนละบ้าน · ไม่มีปุ่มเดียวทำ 2 เจตนา (เลิก panel รวมใน `Studio.vue:301`).
- **AC-G3.2** "เปิดเพลงอื่น" (สลับเพลงระหว่างเปิดอยู่) มีที่เดียว (overflow ⋮ ของหน้าเพลง) · ใช้ picker ตัวเดียวกันทุกโหมด (แก้ M-3 · reuse ComboSelect).
- **AC-G3.3** ป้ายปุ่มพูดเจตนาตัวเอง ("สร้างเพลงใหม่" / "ค้นหาเพลง" / "เปิดเพลงอื่น") — ไม่ต้องอ่านเนื้อในถึงจะรู้ (recognition).
- *test:* snapshot ว่าไม่มี control ไหนมีทั้ง create + find ในตัวเดียว · picker selector เดียวทุกโหมด.

### US-G4 — shell/นาวมินิมอล ทุกหน้าบอกตำแหน่งชัด
*ในฐานะ* ผู้ใช้ทุกกลุ่ม *ฉันต้องการ* แถบบนที่สะอาด ไม่มีปุ่มซ้ำ *เพื่อ* ไม่สับสน
- **AC-G4.1** 🔍 บนหน้าแรกไม่โชว์ (ช่องค้นอยู่หน้าจอแล้ว = เลิกปุ่มซ้ำ) · หน้าอื่นโชว์ได้.
- **AC-G4.2** 1 บริบท = ปุ่ม filled เดียว (shell = ＋สร้าง · หน้าฝึกร้อง = Play) · ปุ่มเครื่องมืออื่น treatment เดียวกัน (`ui-standards §2`).
- **AC-G4.3** drawer มือถือคง a11y เดิม (PKDrawer: focus-trap/Esc/scrim) เมื่อเพิ่มแถว ＋สร้าง (ไม่ regress).
- *test:* 🔍 `display:none` เมื่อ route==`/` · axe menu roles · drawer focus-trap ยังผ่าน.

### US-G5 — หน้าเพลงมินิมอล (แก้ S-6 · cross-cutting)
*ในฐานะ* คนร้อง *ฉันต้องการ* หน้าเพลงที่นำด้วย "เล่น" ไม่รกปุ่ม *เพื่อ* ฟัง/ฝึกได้ทันที
- **AC-G5.1** persistent controls บนหน้าเพลง (มือถือ) ≤ 10 (จาก 20+) · ที่เหลือหลัง ⚙/⋮/drawer.
- **AC-G5.2** ฝึกร้อง: dock default = ยุบ · Play = ปุ่มหลักเดียว · advanced (เสียง/ensemble/instrument/style/คีย์/tempo) หลัง ⚙ (คง `SongViewer.vue:505` · ไม่รื้อ).
- **AC-G5.3** back + ชื่อเพลง + 3-mode + ↗แชร์ + ⋮ อยู่บน shell ครบทุกโหมด (teleport เดียว) · ไม่ทับกับแถบตัวตนของสาย editor-orientation.
- *test:* นับ persistent controls @360 ≤10 · Play เป็น prime (filled) · dock เริ่ม collapsed · ไม่มี h-overflow.

---

## นอกขอบเขต (ไม่ทำในสายนี้)
- **ไม่แตะ inline editor internals** (แถบตัวตน · ปุ่มพูดผลลัพธ์ · autosave · lyric split) = สาย editor-orientation / selection-driven.
- **ไม่แตะ `songSearch.js` / model / DB** — คงการค้นเดิม.
- **ไม่รื้อ bookshelf** — คงเป็นมุมมอง "เล่ม" (P'Aim เคาะ).
- Share/QR + favorite + playlist = ไฟล์แยก `ux-redesign-share-favorite-playlist.md` (EPIC H/I).
- หัว sheet + เลขห้อง = สาย print/sheet (`ux-redesign-workflow §4.5` · เคาะแล้ว 22 ก.ค.).
