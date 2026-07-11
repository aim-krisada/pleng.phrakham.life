# รายงาน Tester — D6 หัวไทม์ไลน์ชิดขอบ dock (fix-sing-timeline-edge)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `fix-sing-timeline-edge` `639d4ec` (pm7 อ้าง `66915b8` · แตะ `SingTransport.vue` เดียว) · **ping:** pm7
**วิธี:** vitest + **วัด geometry จริงในเบราว์เซอร์** (`5401` · Claude Browser MCP) · ยืนยัน bundle = fix code ก่อนวัด

---

## VERDICT: ✅ ผ่าน (D6 + no-regression)

| เกณฑ์ D6 | ผล | หลักฐานวัดจริง |
|---|---|---|
| หัว frac=0 ห่างขอบซ้าย dock ≥10px | ✅ | **1280 = 13px · 768 = 13px · ~676 = 11px** (knob.left − dock.left · ทุกค่า ≥10) |
| หัว frac=1 สมมาตร (ไม่ชิดปลายอีกด้าน) | ✅ | ลากถึง frac=1 จริง (valuenow 0→100) · **track inset ใน seek = 10px ทั้ง 2 ข้าง (สมมาตร)** · knob center ลงตรงปลาย track พอดี ไม่ล้น |
| ลากแล้วหัวตรงนิ้ว 1:1 | ✅ | คลิกกลางราง → knob center **คลาดเคลื่อน 0px (768) / 1px (676)** |
| แถบท่อน/เส้นแบ่ง align กับราง | ✅ | 2 `.st-seg` + 1 `.st-div` อยู่ในราง · divider (243) คั่นกลาง seg1(179–240)/seg2(244–305) พอดี |
| ห้ามล้นจอ / dock ในจอ | ✅* | 768/1280 hOverflow=0 · dock hug 356px < 375 (พอดีจอมือถือ) |
| no-regression (play/เลือกท่อน/Aa/⚙) | ✅ | ปุ่มครบ · ⚙ เปิด+Esc ปิดได้ · เลือกท่อนเปิดได้ · Aa มี |
| console 0 | ✅ | ไม่มี error |
| vitest 317 | ✅ | 317 passed (no-regress · scrub test ยังผ่าน) |

**สรุปตัวเลข frac=0 (แกนหลัก D6):** 1280→**13px** · 768→**13px** · 676(effective)→**11px** — **≥10px ทุกจุด** (เดิม ~3px)

---

## หมายเหตุความแม่นของเครื่องมือ (โปร่งใส)
- Browser MCP pane นี้ **บังคับ window จริงต่ำกว่า ~676px ไม่ได้** → ที่ viewport emulate 375 ตัว `position:fixed .dk-host` ใช้ความกว้าง window จริง (676) ไม่ใช่ 375 (artifact · `innerWidth 676 ≠ clientWidth 375`). จึง **วัด 375 แบบ fixed-element ตรงๆ ไม่ได้ในเครื่องนี้**
- **แต่ D6 ผ่านที่ 375 ได้ข้อสรุปแน่นจาก 3 ทาง:**
  1. **CSS ตายตัว** — track inset = `left:10px; right:10px` (ไม่ขึ้นกับความกว้างจอ) → frac=0 gap = padding(มือถือ 8) + inset ส่วนเกิน = **11px คงที่ทุกจอ** (พิสูจน์แล้วที่ 676 = 11px)
  2. **dock hug 356px < 375** → ตัว dock พอดีจอมือถือ (ส่วนที่ "ล้น" = artifact ของ fixed host ที่ยึด window 676 · บนมือถือจริง innerWidth=375 host จะ = 375)
  3. dev self-verify บนเครื่อง/มือถือจริง = 375→11px ตรงกับข้อ 1
- แนะนำ: P'Aim/พี่เปาเหลือบดูบนมือถือจริงตอน LAN อีกที (ยืนยันข้อ 2)

## next
- pm7 → git-verify DoD + ปลดบล็อก deploy รอบ 7 · P'Aim LAN ยืนยันมือถือจริง
- ไม่มี ✗ · ไม่มี regression ที่วัดเจอ
