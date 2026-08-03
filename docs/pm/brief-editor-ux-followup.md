# ใบสั่ง (dev) — 2 ปรับปรุงโหมดแก้ไข จากพี่เปา (B085 สติกกี้ + B086 ย้ายบรรทัด)

**สั่งโดย:** pm7 · **ฐาน:** `studio-shell-redesign` (deploy รอบ 9 · `e7af727`+ · มี B083 melody-pairing merged แล้ว) · **branch ใหม่:** `editor-ux-followup`
**ที่มา:** พี่เปา 11 ก.ค. (2 ข้อ แตะ `EditorMode.vue` ไฟล์เดียว → รวมสายเดียว) · **ปรับของเดิม · KISS · ไม่ทำจอใหม่ · เคารพ SX7**

## 🎯 B085 — เครื่องมือแก้ไขหัวท่อนสติกกี้ค้างบน (งานเล็ก)
- **อาการ:** แถบเครื่องมือหัวท่อน `.cshead` (`EditorMode.vue:2827` · เปลี่ยนทำนอง/แก้ชื่อ/▲▼/ลบ) เลื่อนหายไปกับหน้า → เลื่อนลงแก้ท่อนล่างๆ **มองไม่เห็นเครื่องมือ**
- **แก้:** `.cshead` → `position: sticky; top: <ให้ค้างใต้ ShellBar บน>; z-index:` + พื้นทึบ (มี `background: var(--cream)` แล้ว · อาจต้องปิด transparent) → เลื่อนแล้วเครื่องมือท่อนที่กำลังแก้ค้างบนเสมอ
- **ระวัง:** ต้อง sticky เทียบ scroll container ที่ถูกตัว (ถ้าหน้า scroll ที่ body → top เทียบ ShellBar) · ไม่บังเนื้อ/ไม่ทับ dock · **verify มือถือ+เดสก์ท็อป** (เลื่อนจริงแล้วเห็นเครื่องมือค้าง)

## 🎯 B086 — ย้ายบรรทัดขึ้น-ลง (ทำนอง+เนื้อไปด้วยกัน) — งานปานกลาง
- **อาการ:** มี copy/delete บรรทัด (`removeLine` · `qCopyLine` · ปุ่มใน per-line toolbar ~2063) **แต่ไม่มี "ย้ายบรรทัด"** → พิมพ์สลับบรรทัดต้องลบพิมพ์ใหม่ (พี่เปาเสียเวลา)
- **แก้ UX:** เพิ่มปุ่ม **▲▼ ย้ายบรรทัดขึ้น/ลง** ข้างปุ่มคัดลอก/ลบเดิม (per-line toolbar) — reuse pattern เดียวกับ `moveRow` (▲▼ ของท่อน)
- **⚠️ จุดสำคัญ (correctness · อย่าพลาด):** เนื้อร้อง (syllables) ผูกโน้ต**ทีละพยางค์**แบบ **flat array บน arrangement row** (slot map `li-bi-si` · `slotStarts` ~245 · `stanzaSlots` ~465) → ย้ายบรรทัด `stanza.lines[i]` ↔ `[i±1]` **ต้องสลับ syllable-slice ของ 2 บรรทัดนั้นใน *ทุก* arrangement row ที่ใช้ stanza นี้ด้วย** (คำนวณ slot boundary = ผลรวม `syllableSlots` ต่อบรรทัด) → เนื้อของแต่ละข้อตามทำนองไปถูก
  - เคสหลายข้อ (เพลง 2 "ของขวัญ" มี ร้อง1/รับ/ร้อง2 บน stanza เดียว) = ต้องย้ายเนื้อครบทุกข้อ
- **unit test บังคับ:** ย้ายบรรทัดใน stanza ที่มี ≥2 arrangement row → ยืนยันโน้ต+พยางค์ของทุกข้อสลับตามถูก (ไม่หลุด/ไม่ค้าง)

## ตรวจเอง Tier-B ก่อนส่ง tester
- Browser MCP (เพลง 2): B085 เลื่อนยาวๆ เห็น cshead ค้างบนทั้งเดสก์ท็อป+มือถือ · B086 ▲▼ ย้ายบรรทัด → โน้ต+เนื้อทุกข้อตามไปถูก (สลับ ร้อง1↔รับ ดูเนื้อตาม) · ไม่ regress แก้โน้ต/save/ดูผล (SX7)
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` เขียว (+test B086) + `npm run build` เขียว

## เปิด server + รายงาน
- `npx vite . --host --port 5413 --strictPort` → **Network URL ในรายงาน** (IP ปัจจุบัน = `10.215.141.98` · ดู board)
- แตะเฉพาะ `EditorMode.vue`(+test) · เช็ก `git branch --show-current` ก่อน commit
- เสร็จ session-agnostic: (1) `docs/reports/editor-ux-followup.md` (2) บรรทัด board §📥 inbox (3) ping **PM = pm7** (board §🎯) · อย่า hardcode ชื่อ session · ⛔ ห้าม merge/deploy
