# wt-fix — เสร็จแล้ว (แจ้ง SA ps2)

**สาขา:** `wt-fix` (แตกจาก `studio-shell-redesign`) · **พอร์ตตรวจ:** http://localhost:5306
**สถานะ:** เสร็จครบ 3 งาน · unit **63/63** · build ✅ · **พร้อมให้ SA review + merge เข้าฐาน** (ยังไม่แตะ `main`)
**รายงานละเอียด:** `docs/reports/wt-fix.md`

## ทำอะไรไปบ้าง (ps2 wave B — bug/feature อิสระ ไม่แตะเมนู/design)

| id | สรุป | ผล |
|---|---|---|
| **B018** bug | กล่อง “เปิดเพลง” ตกขอบขวาบนมือถือ → บนจอ ≤760px เปลี่ยนเป็นแผ่นเต็มกว้าง เว้นขอบ 8px วางใต้แถบบน (วัดขอบแถบจริง ไม่ล้นทุกความกว้าง) | ✅ |
| **B020** bug | dock ล่างไม่ติดขอบจอมือถือ → เพิ่ม `viewport-fit=cover` + เผื่อ `env(safe-area-inset-bottom)` ที่แถบล่าง | ✅ (ขอ tester ยืนยันบนมือถือมีติ่งจริง) |
| **B001** feature | ปุ่มเลื่อน ↑บนสุด/↓ล่างสุด → **ใช้ไฟล์ร่วมกับ พระคำ.ชีวิต เป๊ะ** `pk-scrollnav.js` (Samsung-style: ชัดตอนเลื่อน หรี่หลังหยุด 1.2 วิ) | ✅ (พฤติกรรมเห็นชัดบนมือถือจริง) |

## ไฟล์ที่แตะ

- **B018:** `src/views/Studio.vue`
- **B020:** `src/components/EditorMode.vue` · `index.html`
- **B001:** `src/lib/pk-scrollnav.js` (ก๊อปตรงจาก `phrakham.life2/assets/`, ไม่แก้เนื้อใน = SSOT ร่วม) · `src/lib/pk-scrollnav.test.js` · `src/main.js` · `src/styles.css`

ทุกไฟล์ที่ใช้ร่วม (`App.vue`—คืนสภาพเดิม, `main.js`, `index.html`, `styles.css`) เป็นการ **เพิ่ม** ไม่ชนกับ `wt0-int-a` (คนละไฟล์)

## SA ต้องทำ

1. อ่าน `docs/reports/wt-fix.md`
2. `git merge wt-fix` เข้า `studio-shell-redesign`
3. (ก่อนปิดสนิท) ขอ tester ลอง **B020 dock + B001 โผล่/หรี่ บนมือถือจริง** — สอง item นี้เห็นผลชัดเฉพาะบนมือถือ
4. `main` = ตามพี่เอมสั่งเท่านั้น (auto-deploy)
