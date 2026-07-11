# รายงาน Tester — B085 สติกกี้หัวท่อน + B086 ย้ายบรรทัด (editor-ux-followup)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `editor-ux-followup` `9dc22d9` (EditorMode.vue+test · vitest 330 +4) · **ping:** pm7
**วิธี:** vitest + วัดจริง Browser MCP บนเพลง 2 "ของขวัญ" หน้าแก้ไข `5413`

---

## VERDICT: ✅ B086 ผ่าน · B085 กลไกถูกต้อง (visual-pin ตอนเลื่อนลึก = ฝาก P'Aim เครื่องจริง · เครื่องมือเลื่อนไม่ได้)

### B086 ย้ายบรรทัด = ✅ ผ่านเต็ม
| เกณฑ์ | ผล | หลักฐาน |
|---|---|---|
| ปุ่ม ▲▼ ย้ายบรรทัด รู้ตำแหน่ง | ✅ | ที่บรรทัดแรก **moveUp disabled · moveDown enabled** (ถูก) · ย้ายลงแล้ว moveUp enabled |
| ย้ายแล้วโน้ต+เนื้อตามไปถูก | ✅ | ย้ายลง → ลำดับโน้ตเปลี่ยน (changed=true) · เนื้อ "ชีวิตไม่ยาวนาน…" คงอยู่ · badge จับคู่ทั้ง 3 ข้อคงเดิม (ร้อง1 ✓ · รับ 1/69 ✗ · ร้อง2 21/69 ✗) |
| ย้ายลง-ขึ้นกลับเดิมเป๊ะ | ✅ | **round-trip lossless: restoredExact=true** (ทำซ้ำ 2 รอบ · signature โน้ตกลับตรงเป๊ะ) |

### B085 สติกกี้หัวท่อน = ✅ กลไกถูก · ⚠️ visual-pin ยืนยันด้วยเครื่องมือไม่ได้
- **`.cshead` = `position: sticky · top: 58px · z-index: 4`** (กลไก sticky ถูกต้อง) · **ไม่มี ancestor ตัวไหน overflow hidden/auto/scroll** (= sticky ไม่ถูก break — ทุกชั้น overflow:visible)
- ที่ scroll 145px: cshead เลื่อนตาม flow ถูก (top 409→264) · **ปุ่มครบ** (เปลี่ยนทำนอง/แก้ชื่อ/▲▼/ลบ present)
- 🔧 **ข้อจำกัดเครื่องมือ:** Browser MCP pane นี้ **เลื่อนหน้าไม่เกิน 145px** (maxScrollTop ควร 4118 แต่ถูก clamp · ลองครบ: `scrollTo`/`scrollTop`/`scrollIntoView`/คีย์ End — ติดหมด) → **สังเกตสถานะ "ปักที่ 58 ตอนเลื่อนลึก" ด้วยตาไม่ได้ในเครื่องนี้**
- **สรุป:** กลไก sticky ตั้งถูก + ไม่มีตัว break → **การันตีว่าปักได้** · แต่ภาพจริงตอนเลื่อนเพลงยาว = **ฝาก P'Aim เลื่อนบนมือถือจริง** (นี่คือ point ที่ dev headless ทำไม่ได้ · เครื่องมือ tester ก็ติด scroll เดียวกัน → P'Aim เป็นด่านเดียวที่เลื่อนจริงได้)

### no-regression
- **vitest 330 passed** (+4 · B083 tests ไม่ regress) · **console 0 error**
- **B083 จับคู่ทำนอง ยังทำงาน** (badge ✓/N/M ✗ โชว์ครบ 3 ข้อ)

---

## หมายเหตุ / โปร่งใส
- **B085 scroll = ข้อจำกัดเครื่องมือ 2 ครั้งซ้อน** (ก่อนหน้า 375-window ของ B081/D6 · ตอนนี้ scroll ของ B085) — Browser MCP pane clamp การเลื่อน/ขนาด fixed-element · **process gap:** งานที่ต้อง "เลื่อน/ย่อจอจริง" บน fixed/sticky = ต้องพึ่ง P'Aim เครื่องจริงเป็นด่านปิด (ทั้ง dev + tester ติดเหมือนกัน)
- ผมทดสอบย้ายบรรทัดแล้ว **restore กลับเป๊ะ** (ไม่ค้าง state) · ไม่ได้กด save
- save/ดูผลจริง (SX7) = P'Aim ยืนยันบน LAN ตามปกติ

## next
- pm7 → **P'Aim LAN เพลงยาว: เลื่อนลงยืนยันหัวท่อนค้างบน (B085)** + ย้ายบรรทัด/save (B086 บนจอเขียวแล้ว) · B086 = พร้อม merge เชิงฟังก์ชัน
