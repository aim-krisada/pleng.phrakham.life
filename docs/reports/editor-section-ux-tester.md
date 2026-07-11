# รายงาน Tester — โครงเพลง (editor-section-ux · แถว rail)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `editor-section-ux-dev` `ded324a` (pm7 อ้าง `56fbdb4` · branch tip = ded324a · แตะ `EditorMode.vue` rail/arrangement)
**วิธี:** vitest no-regression + **วัด layout จริงในเบราว์เซอร์** (`http://127.0.0.1:5372/#/studio`, desktop 1280 + mobile 375, axe จริง) · ยืนยัน bundle = section-ux code ก่อนวัด

---

## ✅ RE-VERIFY (`5a9bacd` · dev แก้ .grip แล้ว · branch เลย 18b5a14 มาถึง 5a9bacd) = ผ่านครบ Tier-A + Tier-B
dev แก้ถูก + เหตุผลดี: `.grip` → **`aria-hidden="true"`** (ไม่ใช่ role=button · comment: role=button จะโฆษณา Enter/Space ที่ปุ่มลาก pointer-only ทำไม่ได้ · ▲▼ คือทางคีย์บอร์ด/AT — ตรง WCAG 4.1.2/2.1.1)
- **axe = 0 violation** (rail · WCAG A/AA จริงในเบราว์เซอร์) ✅
- **Tier-B วัดจริง 3 breakpoint** (grip aria-hidden ยืนยันใน DOM สด):

| viewport | row | ▲▼ ข้างกัน | ▲▼ min | ชื่อ "ร้อง 1" | h-overflow |
|---|---|---|---|---|---|
| 1280 | 52px | ✅ | 26px | ไม่ตัด | 0 |
| 768 | 52px | ✅ | 26px | ไม่ตัด | 0 |
| 375 | 58px | ✅ | 34px | ไม่ตัด | 0 |

- console 0 error · vitest 300 (ฐานเดิม)
- **หมายเหตุค่า:** row = 52/58px (pm7 ตั้ง "~42px") — dev ทำ "roomy" ตั้งใจ (comment: กว้างพอ ชื่อไม่ตัด) · เป็น **แถวเดียว ไม่ wrap ไม่เทอะทะ** → ผ่าน · ถ้า P'Aim อยากแน่นกว่านี้ = ปรับความชอบ ไม่ใช่ defect
- **VERDICT re-verify = ✅ เขียวครบ พร้อม P'Aim**

---

## VERDICT (รอบแรก `ded324a`): 🔴 เหลือ 1 (a11y serious) — **แก้แล้วใน `5a9bacd` ข้างบน**
Layout ตามกฎ list-row **เขียวหมด** · เหลือ a11y 1 ข้อ (fix 1 บรรทัด) → ส่งกลับ pm7 · **P'Aim ยังไม่ควรดู**

### 🔴 ข้อเดียวที่ต้องแก้
- **axe `aria-prohibited-attr` (serious)** — `.grip` (`<span class="grip" aria-label="จับลากเพื่อจัดลำดับท่อน">`) มี **aria-label บน span ที่ไม่มี role** → ARIA ห้าม (ชื่อไม่ถูก expose)
  - **fix:** เพิ่ม **`role="button"`** ให้ grip (มันคือ handle ลากจริง · aria-label เดิมคงไว้) · หรือ **`aria-hidden="true"`** (เพราะ ▲▼ เป็นทางเข้าถึงคีย์บอร์ดอยู่แล้ว ปุ่มลากเป็น pointer-only) — เลือกอย่างใดอย่างหนึ่ง

---

## ตารางผล (✓/✗ · auto/manual · หลักฐานที่วัดได้)

| # | ข้อ (pm7 · กฎ list-row §2) | วิธี | ผล | หลักฐาน (วัดจริง) |
|---|---|---|---|---|
| 1a | แถวบรรทัดเดียว กระชับ ~42px ไม่เทอะทะ | manual วัด | ✅ | `.srow` = **42px (desktop) / 54px (mobile touch)** — กระชับ ไม่สูงเทอะทะ |
| 1b | **▲▼ เรียงข้างกัน แนวนอน ไม่ซ้อน** (≥24px 2.5.8) | manual วัด | ✅ | desktop: ▲(x275,y149) ▼(x303,y149) **y เท่ากัน = ข้างกัน** · 26×26px · mobile: 34×40px · ทั้งคู่ ≥24 |
| 1c | ชื่อท่อนไม่ตัดโหด ("ร้อง 1" เต็ม) | manual วัด | ✅ | `.sname "ข้อ 1"` `scrollWidth ≤ clientWidth` = **ไม่ตัด** ทั้ง 2 breakpoint |
| 1d | pill ทำนองกระชับ · align เป็นระเบียบ | manual วัด | ✅ | `.mchip "♪A"` 29×26 · เรียง grip→เลข→ชื่อ→pill→▲▼ ซ้าย→ขวา จัดกึ่งกลางแนวตั้ง |
| 2 | no-regression (ของเดิมทำได้หมด) | auto + spot | ✅ | **vitest 300 passed** (note/seg/syl/preview/ย่อหน้า/ตั้งค่า/rename/drag+▲▼/aria-live) · **คลิกชื่อ → เปิด input rename โฟกัสได้จริง** (real click) · console **0 error** |
| 3a | มือถือ 375 + desktop 1280 | manual | ✅ | วัดทั้ง 2 ขนาด (ตาราง 1a–1c) |
| 3b | ไม่มี horizontal scroll | manual วัด | ✅ | `scrollWidth − clientWidth = 0` ทั้ง desktop + mobile |
| 3c | **axe a11y** | manual (axe จริงในเบราว์เซอร์) | 🔴 | **1 serious: `aria-prohibited-attr`** (`.grip`) — ดูข้างบน |
| 3d | console 0 | manual | ✅ | ไม่มี error |

---

## หลักฐาน layout (วัดจาก DOM จริง)
**desktop 1280:** row 42px · ▲26×26 ข้างกัน · ชื่อ 91px ไม่ตัด · pill 29×26 · h-overflow 0
**mobile 375:** row 54px · ▲34×40 ข้างกัน · ชื่อไม่ตัด · h-overflow 0
> เลือกวัด DOM แทน screenshot (screenshot ของ MCP timeout — ตามแนวทางโปรเจกต์ให้ใช้ค่าที่วัดได้ ซึ่งแม่นกว่าภาพ)

## หมายเหตุ / ขอบเขต
- no-regression เชิงฟังก์ชัน = พึ่ง **vitest 300** (ครอบ note/lyric/rename/drag/reorder/preview/settings) + spot-check rename จริง · แนะนำ **P'Aim LAN ลองมือ** เป็นด่านสุดท้าย (ตามที่ pm7 วางไว้)
- axe รันบน `.rail` จริงในเบราว์เซอร์ (esm.sh) · เจอ 1 ข้อในขอบเขต rail

## next
- pm7 → dev แก้ grip role (1 บรรทัด) → auto/axe เขียว → ผม re-verify เร็ว → P'Aim LAN ลองมือ → merge
- ไม่มีปัญหา layout · ไม่มี regression ที่วัดเจอ
