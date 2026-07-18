# US/UX — ศูนย์แจ้งเตือนตามบทบาท 🔔 (Notification Center · B108)

**ประเภท:** UX flow + design (นำ) · **⛔ ยังไม่ build — รอ P'Aim GATE 1** · SA ตรวจ feasibility คู่
**brief:** B108 (PM 18 ก.ค. · ปรับเป็น role/event notification center) · **ต่อยอด (ไม่รื้อ):** ชิป `📨 n รอตรวจ` (orientation 2a · `local_91b05cf3`) · **SA feasibility:** `dockkey`/notif `10c8479`
**ยึด:** `docs/ux-platform-patterns.md` (SOP) · `docs/ui-standards.md` · WCAG 2.2 AA (**4.1.3 Status Messages**) · Material 3 Badges · Apple HIG Notifications · pattern GitHub/Gmail notification center
**สรุป ม.ต้น:** `docs/pm/summary-notification-bell-paim.md`

> **โจทย์ P'Aim (ปรับ):** ไม่ใช่ "ตัวนับเดียว" — เป็น **ศูนย์แจ้งเตือนที่ขึ้นกับ *งานของแต่ละบทบาท*** ออกแบบให้เพิ่มบทบาท/ประกาศทีหลังได้โดยไม่รื้อ. v1: ผู้ตรวจเห็นงานเข้า · ผู้ส่งได้รู้ผลอนุมัติ.

---

## 0 · สรุปการตัดสินใจ (อ่าน 30 วิ · ฟันธงทุกข้อ · P'Aim ลองในฐานะคนใช้ ไม่ใช่คนเลือกเมนู)

| # | ประเด็น | ฟันธง UX | อ้างมาตรฐาน (เปิดจริง) |
|---|---|---|---|
| **โครง** | list หรือ ตัวนับ | ✅ **notification list (bell + unread badge + dropdown ของ item ที่ลิงก์ไปเรื่องนั้น + mark-as-read)** — ไม่ใช่ตัวนับ | GitHub/Gmail center · M3 Badges |
| **ทำไม list** | รองรับอนาคต | ✅ **เพิ่มบทบาท/ประกาศ = เพิ่ม item type ไม่รื้อ UI** (schema เดียว) | extensibility · SOP §4 |
| **badge เลข** | นับอะไร | ✅ **unread count** (แจ้งเตือนที่ยังไม่อ่าน) · **mark-as-read = เคลียร์** · เกิน 99 = `99+` | Apple HIG (badge = unread เท่านั้น) · M3 |
| **"ค้างกี่เพลง"** | อยู่ไหน | ✅ **สรุปในหัว panel + ลิงก์ "ตัวติดตามการตรวจ"** ไม่ใช่ตัวเลข badge (badge = unread event ไม่ใช่ backlog) | Apple: badge ไม่ใช่ข้อมูลทั่วไป |
| **94 verified=false** | เด้งไหม | ✅ **ไม่เด้ง** — เป็น backlog ในหน้า review tracker แยก (SA แนะ · UX ฟันธงตาม: bell = event จริง ไม่ใช่ตัวเลขคลัง) | Apple HIG · derive live |
| **กด item** | ไปไหน | ✅ ลิงก์ไปเรื่องนั้น (เพลง→โหมดตรวจ) + **mark read** | recognition · single action |
| **มือถือ** | popup? | ✅ **หน้าเต็มจอ** (desktop = popover) | `ux-platform-patterns §1` |
| **a11y** | count เปลี่ยน | ✅ ชื่อระฆังมี unread + `role=status`+`aria-atomic` · unread mark ไม่พึ่งสี | WCAG 4.1.3 · 1.4.1 |

**ข้อเสนอเดียว (ฟันธง):** **ศูนย์แจ้งเตือน = bell + unread badge + list ของ item (ตาม type) + mark-as-read** บน shell · **v1:** approver=งานเข้า(pending) · submitter=ผลอนุมัติ · **schema เดียว รองรับ role/broadcast อนาคต**

---

## 0.5 · ⭐ ของเดิม vs ใหม่จริง (ยึด `ux-platform-patterns §4`) + SA feasibility

| ส่วน | สถานะ | หมายเหตุ (SA `10c8479`) |
|---|---|---|
| ชิป `📨 n รอตรวจ` (2a) | ❌ **มีแล้ว** | B108 = ยกเป็น notification center · **extend lane เดียว** (PM คิว) |
| `pendingDrafts` (นับ pending) | ❌ มีแล้ว | ✅ SA: **ยกตัวนับขึ้น `store.js`** ให้ shell อ่าน global |
| กล่องร่าง (list ร่าง) | ❌ มีแล้ว | item "งานเข้า" ต่อยอดจากนี้ |
| อัปเดตสด | — | ✅ SA: **poll (ไม่มี realtime)** — refresh-on-focus/interval |
| **notification list + item schema** | ✅ ใหม่ | `{id,type,icon,text,link,read,ts}` |
| **unread badge + mark-as-read** | ✅ ใหม่ | ✅ SA: **last-seen marker** สำหรับ unread |
| **ผลอนุมัติถึง submitter** | ✅ ใหม่ (v1) | อ่าน draft.status เปลี่ยน (approved/returned) |
| หน้า review tracker (94 backlog) | 🟡 แยก (ไม่ใช่ bell) | ลิงก์จาก panel |

---

## 1 · หน้าตา — notification center

### ระฆัง + unread badge (บน shell · ทุกโหมด)
```
🔔②   ← unread badge = แจ้งเตือน 2 อันที่ยังไม่อ่าน (เกิน 99 = 99+)
🔔    ← อ่านหมด/ไม่มี = ระฆังเปล่า
```
- **ไอคอน + เลข + สี** เสมอ (WCAG 1.4.1) · accent ตัด ≥3:1 · 44px

### กด 🔔 → รายการแจ้งเตือน (desktop popover · mobile หน้าเต็มจอ)
```
┌── การแจ้งเตือน ───────────────── [อ่านทั้งหมด] ─┐
│ ● 🔎 โม ส่ง "21. เมื่อข้าได้พบ..." มารอตรวจ  2 วันก่อน │  ← unread (จุด+หนา) · กด→ตรวจ
│ ● ✅ "45. พระคุณ" ของคุณ ได้รับอนุมัติแล้ว     1 วันก่อน │
│   ↩ "12. ในความรัก" ถูกส่งกลับให้แก้ไข         3 วันก่อน │  ← read
│ ─────────────────────────────────────── │
│ 3 เพลงรอตรวจทั้งหมด · ดูตัวติดตามการตรวจ →         │  ← สรุป+ลิงก์ (ไม่ใช่ badge)
└────────────────────────────────────────┘
```
- แต่ละ **item = icon + ข้อความ(ใคร·อะไร) + เวลา + สถานะอ่าน** · กด → ไปเรื่องนั้น + mark read
- **unread:** จุดนำ + ตัวหนา (ไม่พึ่งสีอย่างเดียว) · **[อ่านทั้งหมด]** = mark all read
- **item type (v1 + เผื่ออนาคต):**

| type | ใคร | ตัวอย่าง | ลิงก์ไป |
|---|---|---|---|
| `review_incoming` | approver | 🔎 โม ส่ง "X" มารอตรวจ | เพลง→โหมดตรวจ |
| `draft_approved` | submitter | ✅ "X" อนุมัติแล้ว | เพลงเผยแพร่ |
| `draft_returned` | submitter | ↩ "X" ส่งกลับแก้ | ร่างของตัวเอง |
| `broadcast` (อนาคต) | ทุกคน | 📢 ประกาศ… | — |

→ **เพิ่ม type ใหม่ = เพิ่มแถวใน map ไม่แตะ UI** (นี่คือเหตุผลที่ทำเป็น list ตั้งแต่แรก)

---

## 2 · a11y (WCAG 4.1.3 · AA)

- ชื่อระฆัง: `aria-label="การแจ้งเตือน · 2 ยังไม่อ่าน"` → โฟกัสได้ยินเลย
- unread count ใน `role="status"` + `aria-atomic="true"` + polite → เปลี่ยนแล้วอ่านทั้งก้อน ไม่แย่งโฟกัส (W3C ARIA22)
- list = `role="list"` · แต่ละ item actionable (ปุ่ม/ลิงก์ · โฟกัสได้) · unread mark มี text ("ยังไม่อ่าน") ไม่พึ่งสี (1.4.1)

---

## 3 · เฟส

| เฟส | ทำ | ได้อะไร | feasibility |
|---|---|---|---|
| **A ⭐** | bell + unread badge + list (`review_incoming`) + mark-read · นับสดจาก store.js · poll | **approver เห็นงานเข้า กดไปตรวจ** | ✅ SA เคลียร์ (store.js counter · poll · last-seen) |
| **B** | `draft_approved` / `draft_returned` ถึง submitter | ผู้ส่งรู้ผลเอง | อ่าน status change |
| **C** | ลิงก์ review tracker (94 backlog) + broadcast type | ตามงานครบ · ประกาศได้ | หน้า tracker แยก |

---

## 4 · feasibility — SA ตอบแล้ว (`10c8479`) · เหลือปิดตอน DS

| # | คำถาม | SA |
|---|---|---|
| 1 | นับ pending บน shell | ✅ ยกตัวนับขึ้น `store.js` (shell อ่าน global) |
| 2 | อัปเดตสด | ✅ **poll** (ไม่มี realtime) · refresh-on-focus/interval |
| 3 | unread marker | ✅ **last-seen marker** |
| 4 | extend 2a | ✅ คิว lane เดียว · PM ประสาน (1 ไฟล์ 1 สาย) |
| 5 | **RLS: approver นับ/อ่าน pending คนอื่นได้ · submitter อ่าน status ตัวเองได้ · ไม่รั่ว non-approver** | 🟡 **ยืนยันตอน DS** (RLS เพิ่งปิด — ต้อง test) |

---

## 5 · 🖼️ Mockup (จิ้มได้ · desktop + มือถือ)

- **เปิดเลย:** [🔔 mockup ศูนย์แจ้งเตือน — list · unread · mark-as-read](https://claude.ai/code/artifact/46569a53-99ee-44cd-8501-cff261503e95)
- ไฟล์รีโป: `docs/ds/notification-bell-mockup.html`
- **แสดง:** ระฆัง+unread badge · จำลอง item เข้า (approver/submitter) · กด 🔔 (desktop popover·mobile เต็มจอ) → list · กด item → mark read เลขลด · [อ่านทั้งหมด] · สรุป "N รอตรวจ + ลิงก์ tracker"

---

*UX/UI seat · 2026-07-18 · docs-only · ⛔ ไม่แตะ `src/` · อ้างอิงเปิดจริง: [M3 Badges](https://m3.material.io/components/badges) · [Apple HIG Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications) · [W3C ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22) · [WCAG 4.1.3](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)*
