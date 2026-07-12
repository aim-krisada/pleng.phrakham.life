# รายงาน Tester — B091 ล้างเนื้อบรรทัด (line-clear-parts)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `line-clear-parts` (feature commit `a8b18e8` · EditorMode.vue+test · vitest 335) · **ต้นเรื่อง:** P'Aim สั่งตรวจต่อ · **ping:** pm7
**วิธี:** vitest + code review + วัดจริง Browser MCP (tester ตั้ง server เอง `localhost:5422` เพราะไม่มี server dev)

---

## VERDICT: ✅ ฟีเจอร์ผ่าน · 🔴 **แต่ merge ไม่ได้ตามสภาพ (แตกจาก base เก่า → ต้อง cherry-pick)** — ต้องแก้ก่อน merge

### ✅ ฟีเจอร์ 🧹 ล้างเนื้อบรรทัด = ถูกต้อง
| เกณฑ์ | ผล | หลักฐาน |
|---|---|---|
| ปุ่ม 🧹 "ล้างเนื้อบรรทัดนี้ (ทุกข้อ · โน้ตอยู่)" ใน ⋯ | ✅ | เจอปุ่มในเมนู ⋯ · มี `window.confirm` ยืนยัน |
| ล้างเนื้อบรรทัด → **ลบเฉพาะเนื้อบรรทัดนั้น · ทุกข้อ** | ✅ | live: กด 🧹 → พยางค์บรรทัดที่เลือกหาย (42→32 · ล้าง 10 ช่อง "ชี·วิต·ไม่·ยาว·นาน,·เว…") · **unit ยืนยัน blank ทุก verse** (resliceRows ทั้ง stanza) |
| **โน้ต/ทำนองไม่แตะ** | ✅ | **notesUnchanged = true** (string โน้ตก่อน==หลัง เป๊ะ) |
| บรรทัดอื่นไม่กระทบ | ✅ | เหลือ 32 พยางค์ (บรรทัดอื่นคงอยู่) · unit: line 0,2 คง alignment |
| vitest · console | ✅ | **335 passed** (+2 EditorMode.line-clear.test.js) · console 0 |

### 🔴 ปัญหา merge (ต้องแก้ก่อน — สำคัญ)
- `git merge-base --is-ancestor studio-shell-redesign line-clear-parts` = **FALSE** → branch นี้ **แตกจาก base เก่า** (ก่อน B087/B085/B086/B088/B084/B090)
- **ถ้า merge ทั้ง branch ตามสภาพ = REVERT งานใหม่** (diff vs base ปัจจุบัน = −1760 บรรทัด · ลบ bookshelf.js/B087 SongList ฯลฯ)
- **fix: cherry-pick เฉพาะ commit `a8b18e8`** (ล้างเนื้อ · EditorMode +41 บรรทัด + test) ลง base ปัจจุบัน แล้วรัน test ใหม่ · **ห้าม merge ทั้ง branch**

---

## หมายเหตุ / โปร่งใส
- ฟีเจอร์ตัวเล็ก isolated (EditorMode 41 บรรทัด) · logic ถูก (อ่านโค้ด + unit + live ตรงกัน)
- ใช้ **native `window.confirm`** (เหมือน B088 ลบบรรทัด) — ผม override เป็น true เพื่อทดสอบ · **ข้อสังเกต UX เดิม: ควรเป็น in-app dialog** (รวมงานปรับกับ B088)
- ทดสอบบน server ที่ tester ตั้งเอง (`localhost:5422` · worktree `pleng-b091` · base เก่า) — เพราะ B091 ไม่มี server/report จาก dev

## next
- pm7 → ฟีเจอร์เขียว **แต่ 🔴 ต้อง cherry-pick `a8b18e8` ลง base ปัจจุบันก่อน merge** (อย่า merge ทั้ง line-clear-parts) · แล้ว re-verify quick + P'Aim ลอง 🧹 บน LAN
