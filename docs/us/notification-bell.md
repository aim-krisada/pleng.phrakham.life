# US/UX — ระฆังเตือน 🔔 "มีเพลงส่งเข้ามารอตรวจ" (B108)

**ประเภท:** UX flow + design (นำ) · **⛔ ยังไม่ build — รอ P'Aim GATE 1** · SA ตรวจ feasibility + core lib คู่
**brief:** `docs/pm/brief-dockkey-config.md`→B108 (PM 18 ก.ค.) · **ต่อยอด (ไม่รื้อ):** ชิป `📨 n รอตรวจ` (orientation 2a · `local_91b05cf3`) · `docs/ds/editor-orientation.md` (D1 identity strip)
**ยึด:** `docs/ux-platform-patterns.md` (SOP) · `docs/ui-standards.md` · WCAG 2.2 AA (**4.1.3 Status Messages**) · Material 3 Badges · Apple HIG Notifications
**สรุป ม.ต้น:** `docs/pm/summary-notification-bell-paim.md`

> **โจทย์ P'Aim:** ปิด RLS แล้ว (public เห็นเฉพาะ verified) → ทีมทยอยกด ✓ ตรวจเอง · **ผู้ตรวจ (พี่เปา) ต้องเห็นเองว่ามีเพลงส่งเข้ามาใหม่ + ค้างรอตรวจกี่เพลง โดยไม่ต้องถาม** → ระฆัง 🔔 + badge บน shell

---

## 0 · สรุปการตัดสินใจ (อ่าน 30 วิ · ฟันธง)

| # | คำถาม | ฟันธง UX | อ้างมาตรฐาน (เปิดจริง) |
|---|---|---|---|
| **แสดงยังไง** | 🔔 บน shell (ทุกโหมด) + **badge** | ✅ **number badge = ค้างกี่เพลง** (งานจริง) **+ จุด/เน้น "ใหม่" = มีของเข้ามาตั้งแต่ครั้งก่อน** | M3 Badges (dot=มีใหม่ · number=count) |
| **"ใหม่" กับ "ค้าง" ต่างกันไง** | ✅ **แยกกัน** — count ลดเมื่อ**ตรวจจริง** · จุดใหม่หายเมื่อ**เปิดดู** | count=งานคงเหลือ · จุด=สัญญาณให้เหลียวมอง | Apple HIG "clear when seen" (จุด) · count=งานจริงไม่หายตอนแค่เหลือบ |
| **นับจากไหน** | ✅ **นับสด `pendingDrafts` (status='pending' ของคนอื่น)** ห้าม hardcode | derive จาก DB เสมอ | `editor-orientation.md §1` (8/116→20/104 เน่าใน 4 วัน) |
| **กดแล้วไปไหน** | ✅ **เปิด "คิวรอตรวจ" = ร่าง pending ทั้งคลัง** (ต่อยอดกล่องร่างเดิม) | desktop=popover · **mobile=หน้าเต็มจอ** | `ux-platform-patterns §1` |
| **ใครเห็น** | ✅ **approver เท่านั้น** (พี่เปา) · editor/Tier0 ไม่มีคิวตรวจ | — | mission tiers |
| **a11y count** | ✅ ชื่อระฆังมี count + `role="status"` + `aria-atomic` | อ่านออกเสียงตอนเลขเปลี่ยน ไม่แย่งโฟกัส | **WCAG 4.1.3** · W3C ARIA22 |

**ข้อเสนอเดียว:** **ยกชิป `📨 n รอตรวจ` เป็นระฆัง 🔔 + badge 2 ชั้น** (number=ค้าง · dot=ใหม่) บน shell → กด = คิวรอตรวจ · **นับสด · เคลียร์ "ใหม่" เมื่อเปิด · count ลดเมื่อตรวจจริง**

---

## 0.5 · ⭐ ของเดิม vs ใหม่จริง (ยึด `ux-platform-patterns §4`)

| ส่วน | สถานะ | หมายเหตุ |
|---|---|---|
| ชิป `📨 n รอตรวจ` บน shell (2a) | ❌ **มีแล้ว** (สาย `91b05cf3`) | B108 = **ยกระดับชิปนี้** เป็นระฆัง+badge · ไม่สร้างคู่แข่ง |
| ข้อมูล `pendingDrafts` (นับ pending ได้) | ❌ มีแล้ว | โหลดผ่าน `loadDrafts()` · `editor-orientation.md §1` |
| กล่องร่าง (list ร่าง) | ❌ มีแล้ว | คิวรอตรวจ = กล่องนี้ **filter เฉพาะ pending ของคนอื่น** |
| identity strip D1 (เพลงที่เปิด·ของใคร) | ❌ มีแล้ว (2a) | **คนละเรื่อง** — D1=เพลงที่เปิดอยู่ · 🔔=ทั้งคลังมีอะไรรอ |
| **badge 2 ชั้น (number + dot ใหม่)** | ✅ ใหม่ | — |
| **ตัวจำ "เห็นแล้ว" (last-seen)** | ✅ ใหม่ | localStorage/profile ต่อ approver |
| **คิวรอตรวจเป็น panel/หน้าเต็มจอ** | 🟡 ต่อยอดกล่องร่าง | filter + a11y |
| **นับสด/อัปเดตเมื่อมีของเข้า** | 🟡 ต่อยอด | realtime/refresh — ถาม SA |

---

## 1 · หน้าตา (desktop + มือถือ)

### ระฆัง + badge บน shell
```
 🔔③     ← number badge = 3 เพลงรอตรวจ (งานจริง)
 🔔·③    ← + จุดเน้น = มีเพลง "ใหม่" เข้ามาตั้งแต่เปิดครั้งก่อน
 🔔      ← ไม่มีค้าง = ระฆังเปล่า (ไม่มี badge · Apple: ไม่มีของ = ไม่มี badge)
```
- **number badge:** มุมขวาบนไอคอน · pill สั้น · **เกิน 99 = `99+`** (M3/impl convention · คลังเพลงเล็ก 99+ พอ)
- **จุด "ใหม่" (dot/pulse):** เมื่อมี pending ที่ approver ยังไม่เคยเปิดคิวเห็น → **เปิดคิว = จุดหาย** (Apple clear-on-seen) · **แต่ count ยังอยู่จนตรวจจริง** (count = งานคงเหลือ ไม่ใช่ unread)
- **ไอคอน + เลข + สี** เสมอ (ไม่พึ่งสีอย่างเดียว · WCAG 1.4.1) · badge โทน accent (ส้ม/แดงอ่อน) ตัดกับ ≥3:1

### กด 🔔 → "คิวรอตรวจ"
- **desktop:** popover ใต้ระฆัง — list เพลงรอตรวจ (ชื่อ · ของใคร · กี่วันก่อน · [ตรวจ]) · Esc/แตะนอกปิด
- **มือถือ (พี่เปา):** **หน้าเต็มจอ** (ตาม SOP · popup ลอยบน 360px คับ) → เลือกเพลง → กด "เสร็จ"/ย้อน กลับจุดเดิม
- แต่ละแถว → เปิดเพลงนั้นเข้าโหมดตรวจ (D3/D4 ของ orientation ทำงานต่อ) — **ต่อกันพอดี**

---

## 2 · a11y (WCAG 4.1.3 Status Messages · AA)

- **ชื่อระฆัง (accessible name) มี count:** `aria-label="การแจ้งเตือน · 3 เพลงรอตรวจ"` → โฟกัสปุ๊บได้ยินเลข (APG practice)
- **count อยู่ใน `role="status"` + `aria-atomic="true"` + polite** → **เลขเปลี่ยนอ่านทั้งก้อน "การแจ้งเตือน 3 เพลงรอตรวจ" ไม่แย่งโฟกัส** (W3C ARIA22 · ต้องใส่ role ไว้ก่อนเลขมา)
- ปุ่ม 44px · โฟกัสเห็นชัด · จุด "ใหม่" มี text ทางเลือก ("มีใหม่") ไม่พึ่งสี

---

## 3 · เฟส

| เฟส | ทำ | พี่เปาได้ | บล็อก |
|---|---|---|---|
| **A ⭐** | ระฆัง + number badge (นับสด pending) + a11y · กด = คิว | **เห็นเองว่าค้างกี่เพลง กดไปตรวจได้** | 🚩 shell = 1 ไฟล์ 1 สาย (2a) · extend |
| **B** | จุด "ใหม่" + last-seen (เคลียร์เมื่อเปิด) | รู้ว่ามี "ของเพิ่งเข้า" | ต่อ A |
| **C** | อัปเดตสด (realtime/refresh-on-focus) | ไม่ต้องรีเฟรชเอง | รอ SA (realtime feasibility) |

---

## 4 · feasibility → SA (ผ่าน PM · SA เจ้าของ data/RLS + core)

1. **นับสดบน shell:** `pendingDrafts` วันนี้โหลดตอน login/เปิดกล่องเท่านั้น (`editor-orientation.md §1`) → ต้องโหลด global ตอน approver เข้า + refresh ยังไง (ไม่ให้ badge ค้าง 0)
2. **RLS (เพิ่งปิด):** approver query นับ **ร่าง pending ทั้งคลังของคนอื่น** ได้จริงไหม (RLS อนุญาต approver อ่าน pending drafts) · count รั่วให้ non-approver ไหม
3. **last-seen "ใหม่":** เก็บที่ไหน (localStorage ต่อ user? profile?) · เทียบ max draft id/created_at
4. **realtime vs poll:** "เห็นเองโดยไม่ต้องถาม" = ต้อง Supabase realtime subscription หรือ refresh-on-focus/interval พอ · ต้นทุน keepalive
5. **shell home:** ระฆังอยู่ `ShellBar.vue`/`Studio.vue` = ไฟล์เดียวกับ 2a → extend chip เดิม (1 ไฟล์ 1 สาย · PM คิว)

---

## 5 · 🖼️ Mockup (จิ้มได้ · desktop + มือถือ)

- **เปิดเลย:** [🔔 mockup ระฆังเตือน — badge · จุดใหม่ · คิวรอตรวจ](https://claude.ai/code/artifact/46569a53-99ee-44cd-8501-cff261503e95)
- ไฟล์รีโป: `docs/ds/notification-bell-mockup.html`
- **แสดง:** ระฆัง+badge · ปุ่ม "จำลองส่งเพลงใหม่" (badge เด้ง + จุดใหม่) · กด 🔔 (desktop=popover · mobile=หน้าเต็มจอ) → คิว → ตรวจ → count ลด · จุดใหม่หายเมื่อเปิด

---

*UX/UI seat · 2026-07-18 · docs-only · ⛔ ไม่แตะ `src/` · อ้างอิงเปิดจริง: [M3 Badges](https://m3.material.io/components/badges) · [Apple HIG Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications) · [W3C ARIA22 (status)](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22) · [WCAG 4.1.3](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)*
