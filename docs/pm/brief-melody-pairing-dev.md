# ใบสั่ง (dev) — จับคู่ทำนอง↔เนื้อร้อง (B083) · build ตาม SA design

**สั่งโดย:** pm7 · **ฐาน:** `studio-shell-redesign` (deploy รอบ 8 · `e83afe7`+ · มี B081 EditorMode merged แล้ว = ไม่ชน) · **branch ใหม่:** `melody-pairing-dev`
**สเปกครบอยู่แล้ว (อ่านก่อน):** `docs/ds/melody-pairing.md` (code anchor + pseudo-fix + test เคสเพลง 2) · `docs/us/melody-pairing.md` · mockup `docs/design/melody-pairing.html` · report `docs/reports/melody-pairing-sa.md`
**ที่มา:** พี่เปา (เปลี่ยนทำนอง A→B ไม่ได้ + ตั้งชื่อไม่ได้) + P'Aim (import สลับทำนอง↔เนื้อ) · เคสจริง **เพลง 2 "ของขวัญ"** (`74ebe8b8-9c41-46e0-b8c6-a102ca127edd`)

## ⭐ ข้อกำหนดหลัก (P'Aim)
- **ปรับของเดิม ไม่ทำจอใหม่ · KISS** — เสริม 4 จุดที่มีอยู่ใน `EditorMode.vue` (rail โครงเพลง · ComboSelect ทำนองหัวท่อน · verse-lens · stanzaIdOptions)
- **เคารพ SX7** — ไส้ในแก้โน้ต/ดูผล/บันทึก เหมือนเดิม (editor-section-ux gate) · ห้าม regress เพลงอื่น (100)

## 4 จุด build (ตาม DS — P'Aim เคาะแล้ว)
1. **เปลี่ยนทำนองหัวท่อนแล้วแถบไม่หาย** — root = `lensActive` ผูก `activeStanzaId` (`EditorMode.vue:242`) → พอเปลี่ยน `lensRow.stanza` (`:2034`) ให้ `selectStanza` ไปทำนองใหม่ด้วย (แถบแก้เนื้ออยู่ต่อ)
2. **พรีวิวทำนองใน dropdown** (`stanzaIdOptions :647`) — โชว์โน้ต 5-6 ตัวแรก + จำนวนบรรทัด + ความจุพยางค์ · **derived ล้วน — Q1: ไม่เพิ่ม field ในโมเดล · ไม่มีช่องตั้งชื่อ**
3. **ปุ่ม "✂ แยกพยางค์อัตโนมัติ"** ในแผงแก้เนื้อ — **Q2: ใช้ `Intl.Segmenter('th')`** (ไม่โหลด lib) แตกเนื้อก้อน→ช่องพยางค์ · ปรับต่อด้วย ◀▶ เดิม
4. **ป้ายเตือนจับคู่ใน rail โครงเพลง** — ใช้ `rowStatus` เดิม (got/need) · **Q3: เตือนไม่บล็อก** (พยางค์เกิน/ขาด = ป้ายเตือน ทำต่อได้)

## ตรวจเอง Tier-B ก่อนส่ง tester (บังคับ · เคสเพลง 2)
- Browser MCP: (1) ร้อง1 เปลี่ยนทำนอง B→A → หัวท่อน+ช่องคำ **ไม่หาย** · ป้ายอัปเดต (2) dropdown โชว์พรีวิว A/B แยกออก (3) "รับ" กด ✂ → ก้อนแตกเป็นช่อง ปรับ ◀▶ ได้ · overflow เตือนไม่บล็อก (4) regression: แก้โน้ต/ดูผล/บันทึก เหมือนเดิม · เพลง 100 ไม่ regress
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` เขียว (เพิ่ม test ตาม DS) + `npm run build` เขียว

## เปิด server + รายงาน
- `npx vite . --host --port 5412 --strictPort` → **Network URL `http://<IP>:5412/`** ในรายงาน (IP ดู board)
- แตะเฉพาะ `EditorMode.vue` (+test) · ถ้าต้องแตะโมเดล/ไฟล์อื่น = **flag PM ก่อน** · เช็ก `git branch --show-current` ก่อน commit
- เสร็จ session-agnostic: (1) `docs/reports/melody-pairing-dev.md` (2) บรรทัด `docs/pm/board.md` §📥 inbox (3) ping **PM ปัจจุบัน = pm7** (board §🎯) · อย่า hardcode ชื่อ session · ⛔ ห้าม merge/deploy
