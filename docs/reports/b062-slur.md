# รายงาน — B062: วาดเส้นเอื้อน (slur/tie) เป็นเส้นโค้ง SVG ต่อเนื่อง

**สาย:** Android (offline) · branch `claude/pleng-mobile-triage-z9da6p` (แตกจาก `studio-shell-redesign` · ระบบล็อกชื่อ branch นี้ไว้ — เนื้องาน = B062 ตาม `android-cc/INSTRUCTIONS.md`)
**แตะไฟล์เดียว:** `src/components/NoteRow.vue` (+ test) — **ไม่แตะ** data/SQL/parser (กันชน DA B068) ✅
**สถานะ:** โค้ดเสร็จ · unit test เขียว · verify ภาพบนจอแล้ว · **print PDF = ยังไม่ได้ verify (gate P'Aim)**

---

## ทำอะไร
เปลี่ยนเส้นเอื้อน/ไท จาก **CSS pseudo-arc** (`.g-slur::before`, `.nt.tie-start::after`, `.nt.tie-end::before`) → เป็น **SVG path โค้งเรียบ**
- **slur `( )`** = `<svg class="slur-arc" preserveAspectRatio="none">` 1 อันต่อ 1 กลุ่ม · `path` เดียวโค้งคลุมทั้งกลุ่ม · ยืดตามความกว้างกลุ่ม + `vector-effect:non-scaling-stroke` (เส้นหนาเท่าเดิมทุกความยาว) → **ไม่ขาดเป็นท่อนอีก ไม่ว่ากลุ่มยาวแค่ไหน**
- **tie `~`** = SVG half-arc 2 ข้าง (`.tie-start-arc` ขึ้นไปทางขวา · `.tie-end-arc` ขึ้นมาจากซ้าย) แทน CSS hook เดิม

## หลักฐาน (offline · dev server + โน้ตจำลอง)
ภาพ: `docs/reports/assets/b062-slur.png` (โหมดแผ่นเพลง จอ 900px)
| โน้ตทดสอบ | ผล |
|---|---|
| `(1 2 3 4)` | โค้งเดียวต่อเนื่อง ✅ |
| `(1 2 3 4 5 6 7 1')` (ยาว 8) | **โค้งเดียวต่อเนื่อง ไม่ขาด** ✅ ← หัวใจ B062 |
| `(1_ 2_ 3_ 4_ 5_ 6_)` (เขบ็ต+เอื้อน) | โค้งเดียวคลุม + ขีดล่างแยกโน้ตเหมือนเดิม ✅ |
| `1 (2 3) 4` | โค้งเฉพาะกลุ่ม (2 3) ✅ |
| `1~ ~1` (ไทในห้องเดียว) | 2 ครึ่งมาบรรจบเป็นโค้ง ✅ |
| `5~ | ~5` (ไทข้ามห้อง) | 2 ครึ่งเรียบ ยกขึ้นหาเส้นห้อง (ดูล่าง ⚠️) |

DOM ตรวจ: `.slur-arc path` = 1 ต่อ 1 กลุ่มเป๊ะ · `.g-slur::before` เดิม = `content:none` (ตัดออกแล้ว)

## เทสต์
`src/components/NoteRow.test.js` (7 เคส · เขียวทั้งหมด) — ยืนยัน: slur กลุ่มยาวยังเป็น path เดียว · หลายกลุ่ม = หลาย arc แยก · triplet ไม่ขึ้น slur · tie ขึ้น half-arc 2 ข้าง · `~5` (ไทปลายข้ามห้อง) ยังวาดครึ่งของมัน
- **รันแล้ว:** `npx vitest run` → **224 passed** (เดิม 217 + ใหม่ 7) · build ไม่ได้รัน (แต่แก้แค่ template+CSS ใน .vue เดียว)
- (หมายเหตุ: suite `notationLint.test.mjs` ขึ้น fail = ปัญหาเดิม `process.exit(0)` ไม่เกี่ยวกับงานนี้)

## ⚠️ ข้อจำกัด/ค้าง — ต้องให้ PM/P'Aim ตัดสิน
1. **ไทข้ามห้อง (cross-bar) ยังไม่ต่อเนื่องสนิท 100%** — โน้ต 2 ตัวที่ผูกไทอยู่ **คนละ segment = คนละ NoteRow** มีเส้นห้อง (`.bar-line`) คั่นกลาง · NoteRow วาดได้แค่ในกล่องตัวเอง → ทำได้แค่ "2 ครึ่งมาเจอที่ขอบ" (ดีขึ้นกว่าเดิมมากแต่มีช่องว่างเล็กๆ ตรงเส้นห้อง)
   - **ถ้าอยากได้โค้งเดียวพาดข้ามเส้นห้องเป๊ะ** ต้องวาด SVG overlay ที่ **ระดับบรรทัด (line/SongSheet)** ไม่ใช่ใน NoteRow → **นอกขอบเขต "แตะแค่ NoteRow.vue"** · เสนอเป็นงานต่อแยก (ให้ PM ตัดสิน)
2. **ยังไม่มีเพลงจริงมี slur/tie** (0/120 · รอ DA B068 ใส่ข้อมูล) → ทดสอบด้วยโน้ตจำลองเท่านั้น · พอ B068 ลงแล้วควร re-verify กับเพลงจริง (โดยเฉพาะเพลง 100)
3. **print PDF A4 ยัง verify บนเครื่องนี้ไม่ได้** → gate สุดท้ายของ P'Aim (SVG ปกติ print ได้ แต่ยังไม่ยืนยันของจริง)

## รายงานกลับ
- (1) ไฟล์นี้ · (2) เพิ่ม §📥 inbox ใน `board.md` · (3) ping PM `PM รอบ 10 ก.ค. (a)` (§🎯)
- **ถัดไปตามที่ P'Aim สั่ง "ทำทั้งสอง เรียงลำดับ":** เสร็จ B062 แล้ว → ต่อ **mobile triage / auto-scroll (dock บังพยางค์)** (report เดิม `docs/reports/wt-mobile.md` + handoff `docs/pm/handoff-mobile-autoscroll-dock.md`)
