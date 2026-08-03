# Brief — B095: แก้ base กลับ "ล็อก 3 เล่ม" (ตัด allow-custom)

**ฐาน:** `studio-shell-redesign` · **worktree/branch ใหม่:** `b095-lock-fix` (แตกจากฐาน · อย่าใช้ `book-taxonomy-lock`/`book-taxonomy-3` เดิม)
**สั่งโดย:** PM (pm11) · **นี่คือแก้ process breach** — base ถูก self-merge เวอร์ชัน flexible เข้ามาโดยไม่ผ่าน PM

## Requirement (P'Aim เคาะแล้ว ผ่าน PM — ยึดอันนี้)
ช่อง **"หมวด" ในหน้าแก้ไข = ล็อก 3 เล่มเท่านั้น** (เล่มใหญ่ `lem-yai` / อนุชน `anuchon` / เด็กเล็ก `dek-lek`) · **พิมพ์ค่านอกลิสต์ต้องไม่ติด**
(P'Aim ตอบ AskUserQuestion 12 ก.ค. · commit base `0ac0556` · "เลี้ยงได้/allow-custom" ที่หลุดมาทางคอมเมนต์โค้ด = ไม่ผ่าน PM ไม่นับ · วิธี "เลี้ยงได้" ที่ถูกอยู่ที่ B096 admin page ซึ่ง deferred แล้ว)

## สถานะปัจจุบันบน base (git-verified — ต้องแก้กลับ)
base เป็นเวอร์ชัน **flexible (breach)**:
- `EditorMode.vue:2156` → `<ComboSelect v-model="meta.category" :options="CATEGORY_OPTIONS" allow-custom width="100%" />` — **มี `allow-custom`**
- test = `src/components/ComboSelect.category.test.js` (ยืนยัน "ค่านอกลิสต์ยังติด") · `ComboSelect.lock.test.js` เดิมถูกลบ
- docs หลุดเป็น "เลี้ยงได้": `docs/ds/home-redesign.md` §Taxonomy · `docs/reports/book-taxonomy-3.md` · **`docs/system-map.md` §เล่มเพลง+invariant**

## สิ่งที่ต้องทำ
1. **`EditorMode.vue:2156` — ตัด `allow-custom`** ออกจาก `<ComboSelect>` ช่องหมวด (เหลือ options=CATEGORY_OPTIONS ล็อก 3 เล่ม)
2. **test — ยืนยัน "ค่านอกลิสต์ไม่ติด" แบบสะท้อน EditorMode จริง** (ไม่ใช่ test ลวงที่ mount ComboSelect เปล่าๆ ไม่มี allow-custom):
   - แนวที่ tester อยากเห็น: **mount `EditorMode` → หา ComboSelect ช่องหมวด → พิมพ์ค่านอกลิสต์ (เช่น "เยาวชน") → blur → `meta.category` ต้องไม่เปลี่ยนเป็นค่านั้น** (ยังเป็นค่าเดิม/1 ใน 3)
   - ลบ/แทน `ComboSelect.category.test.js` (เวอร์ชัน flexible) · ยังคง assert ว่า dropdown เสนอ 3 เล่มเป๊ะ เรียงถูก
3. **docs กลับเป็น "ล็อก":** `docs/ds/home-redesign.md` §Taxonomy · `docs/reports/book-taxonomy-3.md` · **`docs/system-map.md` §เล่มเพลง + invariant** (แก้ "เลี้ยงได้" → "ล็อก 3 เล่มในหน้าแก้ไข")
4. **ไม่แตะ DB · ไม่แตะ `bookshelf.js`** (3 เล่ม canonical + ซ่อนเด็กเล็กตอน 0 เพลง ถูกอยู่แล้ว)

## รั้ว
- แตะแค่: `EditorMode.vue` · `ComboSelect.*.test.js` · docs 3 ไฟล์ข้างบน · ⛔ ไฟล์อื่นห้าม

## DoD + รายงาน (session-agnostic)
- `npx vitest run` เขียวทั้งหมด (`notationLint` "1 failed file" = quirk เดิม ไม่นับ) + `npm run build` ผ่าน
- dev server **`--host`** + ใส่ **Network URL** ในรายงาน
- **verify เบราว์เซอร์จริง (login approver · Supabase live):** เปิดหน้าแก้ไข → ช่องหมวด → (ก) dropdown = 3 เล่มเป๊ะ (ข) **พิมพ์ค่านอกลิสต์แล้ว blur → ไม่ติด** (ค่ากลับเป็น 1 ใน 3) — แนบภาพ/บันทึกผล
- รายงาน: `docs/reports/b095-lock-fix.md` + บรรทัดใน `board.md` §📥 inbox + ping **PM ปัจจุบันที่ระบุใน `board.md` §🎯 (pm11)** (อย่า hardcode ชื่อสาย)
- ⛔ **ห้าม self-merge เข้าฐาน / ห้าม deploy** — tester gate ก่อน แล้ว PM cherry-pick commit โค้ดเอง
