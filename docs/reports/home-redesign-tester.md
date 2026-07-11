# รายงาน Tester — B087 หน้าแรกใหม่ + B089 verified-gate (home-redesign-dev)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `home-redesign-dev` `2e679bf` (SongList.vue+bookshelf.js · 342 test) · **ping:** pm7
**วิธี:** vitest + วัดจริง Browser MCP (`5414`) · ข้อมูลจริง **verified = 0/123** · **public view (ไม่ล็อกอิน)**

---

## VERDICT: ✅ public + a11y ผ่าน · ⚠️ team view (ล็อกอิน) = tester เข้าไม่ได้ (ห้ามกรอกรหัส) → ฝาก P'Aim

### ✅ public (ไม่ล็อกอิน · verified=0) — ถูกทุกข้อ
| เกณฑ์ B089 | ผล | หลักฐาน |
|---|---|---|
| หน้าแรกว่าง + ข้อความตรวจทาน | ✅ | ข้อความตรงเป๊ะ: **"เพลงกำลังอยู่ระหว่างตรวจทาน จะเปิดให้ชมเร็วๆ นี้"** · book-grid ว่าง |
| ไม่มีป้าย ✓ (verified badge) | ✅ | 0 badge element (`[class*=badge/verified/check]` = []) · (ที่เจอ 1 "✓" = อยู่ใน `<style>` tag = false positive) |
| ไม่มี facet-row (unverified/theme) | ✅ | 0 facet/filter-row |
| ค้นหาโชว์เฉพาะ verified | ✅ | ค้น "พระ" → **0 ผลลัพธ์** (เพราะ 0 verified) |
| ไม่ crash | ✅ | #app render ปกติ · console 0 error |
| 375px h-overflow 0 · a11y | ✅ | hOverflow=0 (emulate สะอาด 375=375) · **axe 0 violation** |
| vitest | ✅ | **342 passed** (1 failed file = notationLint quirk เดิม) |

### ⚠️ team (ล็อกอิน) + จัดกลุ่ม 3 เล่ม = ยืนยันไม่ได้
- **team view (เห็นครบ 123 + ป้าย ✓/⚠️ + facet-row) ต้องล็อกอิน** — **tester กรอกรหัสผ่านไม่ได้ (นโยบายความปลอดภัย + ไม่มี credential)** เหมือน dev headless
- **จัดกลุ่ม 3 เล่ม (category อนุชน/เล่มใหญ่)** — public ว่าง (0 verified) เห็นไม่ได้ · ต้อง logged-in
- → **ฝาก P'Aim ล็อกอินบน LAN ยืนยัน:** เห็นครบ 123 · ป้าย ✓/⚠️ · facet-row · 3 เล่มจัดกลุ่มถูก · (ตรรกะฝั่ง gate คุมด้วย 342 unit test ที่ผ่าน)

---

## หมายเหตุ
- ผมยืนยันได้ครบทุกอย่างที่ **เส้นทาง public/ไม่ล็อกอิน** เปิดให้ + unit tests · ส่วน authenticated view = gate อยู่หลังรหัสผ่านที่ผมแตะไม่ได้ตามนโยบาย
- code ฝั่ง verified-gate = ทำงานถูก (public เห็นเฉพาะ verified · ตอนนี้ 0 → ว่าง + ข้อความ · ไม่รั่ว badge/facet)

## next
- pm7 → public + a11y เขียว · **P'Aim LAN ล็อกอินยืนยัน team view (123 + badge + facet + 3 เล่ม)** ก่อน sign-off เต็ม · P'Aim เคาะจังหวะ deploy (verified=0 → public ว่าง = ตั้งใจ)
