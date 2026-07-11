# ใบสั่ง (dev · สาย B) — หน้าแก้ไข "ดูผลทั้งเพลง" กระดาษล้น/เลื่อนมั่ว (B081)

**สั่งโดย:** pm7 · **ฐาน:** `studio-shell-redesign` (HEAD = deploy รอบ 7 · `71b8d8f`+) · **branch ใหม่:** `fix-editor-preview-overflow`
**ที่มา:** พี่เปา 11 ก.ค. · img `docs/backlog-assets/B081-editor-preview-paper-overflow.jpg`

## ปัญหา (พี่เปา)
หน้าแก้ไข → เปิด **"ดูผลทั้งเพลง"** (หน้าต่างพรีวิวลอย) → โน้ตเรียงยาวเกินความกว้างกระดาษ → **ล้นขวา มีสกอลล์แนวนอน คอลัมน์ขวาโดนตัด** ไม่ตัดขึ้นบรรทัดใหม่เหมือนกระดาษจริง ("format กระดาษยังผิด มันเลื่อนไม่เรียบร้อย")

## ต้นเหตุ (PM triage)
- toggle "ดูผลทั้งเพลง" = `EditorMode.vue:1334` (`sheetWinOpen`) · หน้าต่างพรีวิว whole-song ~`EditorMode.vue:1483` เอา **SongSheet จริง** มาโชว์ (ตาม test `EditorMode.edhead.test.js` B050/B051 — non-modal floating window)
- หน้าต่างพรีวิว**ไม่บังคับความกว้าง = หน้ากระดาษ (A4)** → SongSheet เรียงห้องเต็มความกว้าง container ที่กว้างเกิน แล้ว overflow + scroll แนวนอน + ตัดคอลัมน์ขวา

## ต้องได้ (AC)
1. พรีวิว "ดูผลทั้งเพลง" **แสดงเท่าหน้ากระดาษจริง** (ความกว้างเท่า print A4) → ห้องตัดขึ้นบรรทัดใหม่ (wrap) เหมือนตอนพิมพ์ · **ไม่มี horizontal scroll · ไม่มีคอลัมน์โดนตัด**
2. ผลในพรีวิว = ผลตอน print จริง (พรีวิวต้องสื่อสิ่งที่จะได้บนกระดาษ) → **เทียบ print PDF จริงต้องตรงกัน**
3. มือถือ + คอม ใช้ได้ (พรีวิวจอเล็ก = ย่อ/เลื่อนแนวตั้งได้ ไม่ใช่แนวนอนมั่ว)
4. ไม่ regress: แก้ไข/พรีวิวเดิม (โชว์เนื้อร้องท่อนที่เลือก B050) ยังทำงาน · test เดิมเขียว

## ตรวจเอง Tier-B ก่อนส่ง tester (บังคับ)
- Browser MCP: เปิดหน้าแก้ไข → "ดูผลทั้งเพลง" → วัด **ไม่มี hOverflow** (scrollWidth==clientWidth) · คอลัมน์ขวาไม่ตัด · ห้อง wrap เหมือนกระดาษ · ลองเพลงยาวหลายห้อง/หลายท่อน
- **verify print PDF จริง** (สั่ง print → เปิด PDF เทียบว่าพรีวิว = กระดาษ · memory `feedback_verify_print_from_pdf` + `feedback_show_real_ui_not_harness`)
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` เขียว + `npm run build` เขียว

## เปิด server + รายงาน
- `npx vite . --host --port 5411 --strictPort` → **Network URL `http://<IP>:5411/`** ใส่ในรายงาน
- เสร็จ session-agnostic: (1) `docs/reports/editor-preview-overflow.md` (2) เพิ่มบรรทัด `docs/pm/board.md` §📥 inbox (3) ping **PM ปัจจุบัน = pm7** · อย่า hardcode ชื่อ session · ⛔ ห้าม merge/deploy เอง
- แตะเฉพาะ `EditorMode.vue` (+ CSS พรีวิว/test) · **ไม่แตะ `SongSheet.vue`** (สาย A แตะอยู่ — เลี่ยงชน) ถ้าจำเป็นต้องแตะ SongSheet ให้ทัก PM ก่อน · เช็ก `git branch --show-current` ก่อน commit
