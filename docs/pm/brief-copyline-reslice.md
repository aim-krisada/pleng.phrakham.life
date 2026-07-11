# ใบสั่ง (dev) — B088: คัดลอก/ลบบรรทัด ต้อง reslice พยางค์ (เหมือน B086)

**สั่งโดย:** pm7 · **ที่มา:** dev flag ตอนทำ B086 (11 ก.ค.) · **branch ใหม่: `editor-copyline-reslice` แตกจาก `editor-ux-followup`** (มี reslice helper ของ B086 อยู่แล้ว → reuse · เลี่ยงชน)
**⚠️ ลำดับ merge (PM คุม):** `editor-ux-followup` (B085/B086) merge/deploy รอบ 10 ก่อน → แล้ว B088 นี้ต่อยอด merge ทีหลัง (clean เพราะแตกจากมัน)

## ปัญหา (latent · ยังไม่มีคนแจ้งเจอจริง)
`copyLine` / `removeLine` (EditorMode.vue) **ไม่ reslice syllables** ของ arrangement rows เหมือน B086 (move) → คัดลอก/ลบบรรทัดทำนองที่มีเนื้อ → พยางค์ของทุก verse **เลื่อนไปโน้ตผิด** (เนื้อหลุดจากทำนอง)

## แก้ (reuse logic B086)
ใช้ตัว reslice/slot-boundary เดียวกับ B086 (`stanzaSlots`/slot map `li-bi-si`) กับ 2 จุด:
- **`removeLine(li)`** — ลบบรรทัด `li` ของ stanza → ในทุก arrangement row ที่ใช้ stanza นี้ **ตัด syllable-slice ของบรรทัด li ออก** (พยางค์บรรทัดหลังเลื่อนขึ้นถูกตำแหน่ง)
- **`copyLine`/`qCopyLine`** — คัดลอกบรรทัด → **แทรก syllable-slice สำเนา** (หรือ slice ว่างเท่าจำนวนพยางค์ของบรรทัดใหม่) ในทุก verse ตำแหน่งเดียวกัน → เนื้อ verse ไม่เลื่อน

## ตรวจเอง + test
- **unit test บังคับ** (เพลง 2 หลาย verse): ลบบรรทัดกลาง → พยางค์ทุกข้อเลื่อนถูก · คัดลอกบรรทัด → เนื้อข้อหลังไม่เพี้ยน
- Browser MCP (เพลง 2): คัดลอก/ลบบรรทัดจริง → เนื้อทุกข้อยังตรงโน้ต · vitest เขียว + build
- แตะเฉพาะ `EditorMode.vue`(+test) · เคารพ SX7 · เช็ก `git branch --show-current` ก่อน commit

## รายงาน
session-agnostic: (1) `docs/reports/copyline-reslice.md` (2) board §📥 inbox (3) ping PM = pm7 · ⛔ ไม่ merge/deploy
