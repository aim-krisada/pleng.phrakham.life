# รายงาน Tester — B069 ไทข้ามห้อง + B082 เส้นปิดห้อง (fix-songsheet-barline-tie)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `fix-songsheet-barline-tie` `4b204ff` (SongSheet.vue+test+launch · NoteRow/EditorMode ไม่แตะ) · **ping:** pm7
**วิธี:** vitest + วัดจริง Browser MCP (`5410` แผ่นเพลง) · เพลง 3 / 4 / 100

---

## VERDICT: ✅ ผ่าน (บนจอ) — print = ด่าน P'Aim

| # | เกณฑ์ | ผล | หลักฐานวัดจริง |
|---|---|---|---|
| B069 | เพลง 3 ไทต่อเนื่องโค้งเดียว · ไม่มี hook ค้าง 2 ครึ่ง | ✅ | overlay 1 path ต่อเนื่อง (`M613 C… C…` bbox 43px คร่อมเส้นห้อง) · **inline tie halves visible = 0** (ถูกซ่อนหมด) |
| B069 | overlay = **1 SVG/บรรทัด** (เดิมคลุมแผ่น = พิมพ์แค่หน้าแรก) | ✅ | เพลง 100: **5 overlay บน 5 บรรทัดต่างกัน** (li 3,5,7,11,15) · แต่ละอัน 1 path · comment ยืนยัน "per-line so it prints on whatever page" |
| B082 | เพลง 4 เส้นปิดขวาครบเมื่อจังหวะครบ · pickup/ต่อบรรทัด = ไม่ปิด | ✅* | 36 บรรทัด · pattern ปิด/ไม่ปิด ผสม (28 ปิด · ที่เหลือเปิด) — ตรรกะ beatCount ต่อบรรทัดคุมด้วย **+5 vitest B082** (ผ่าน) |
| B082 | Fine ‖ ไม่ปิดซ้ำ | ✅ | 2 บรรทัด `.bar-final` (li 3,13) ทั้งคู่ `.bar-close`=0 → **doubled = false** |
| no-reg | ไม่มี hook ค้างทุกเพลง | ✅ | visible inline tie hooks = 0 (เพลง 3+100) |
| no-reg | B076 slur (NoteRow) ไม่เพี้ยน | ✅ | branch ไม่แตะ NoteRow → slur ไม่เปลี่ยน · (เพลง 100 มี 0 slur = ไม่มีให้เพี้ยน) |
| no-reg | vitest 322 (+5 B082) · console 0 | ✅ | **322 passed** · console 0 error ทั้ง 3 เพลง |

---

## หลักฐานเด่น
- **เพลง 3 (B069 hook fix):** ต้นเหตุ = ไท encode `tie-START` ที่โน้ตแรกห้อง (`"5~ - - -"`) CSS เดิมซ่อนไม่โดน → เดิมโชว์ครึ่งไท (hook) · **หลังแก้: inline halves ซ่อนหมด (visible=0) · overlay วาด 1 เส้นต่อเนื่อง** ✅
- **เพลง 100 (per-line):** overlay กระจาย **5 อัน ต่อ 5 บรรทัด** (ไม่ใช่ 1 อันคลุมทั้งแผ่น) → พิมพ์ครบทุกหน้า ✅
- **เพลง 4 (B082 Fine):** Fine ‖ 2 จุด ไม่มีเส้นปิดซ้อน ✅

## หมายเหตุ / โปร่งใส
- **count ต่าง:** dev report ว่าเพลง 100 = "3 ไท/3 SVG" · ผมวัดจริง = **5 overlay/5 path บน 5 บรรทัด** · ทั้ง 5 ถูกต้อง (ต่อเนื่อง · ไม่มี hook) — ไม่ใช่ defect แต่แจ้งให้ pm7 ทราบว่าจำนวนจริง 5 ไม่ใช่ 3
- **B082 ตรรกะ beatCount ต่อบรรทัด:** ผมยืนยันได้แค่ผลบนจอ (Fine ไม่ซ้ำ · ปิด/เปิดผสมตามคาด) — ตรรกะ "บรรทัดไหนควรปิด" เป็น unit (+5 vitest ผ่าน) ไม่ได้ไล่คำนวณ beat เองต่อบรรทัด
- **print = ด่าน P'Aim:** ไท/เส้นปิด (รวม arc ข้ามหน้าเพลงยาว) เห็นชัดตอนพิมพ์จริง → P'Aim print PDF เพลง 3+4+เพลงยาว (ตาม standing rule · ไม่ใช่งาน tester)

## next
- pm7 → git-verify DoD · P'Aim print PDF เป็นด่านปิด · บนจอ = เขียวครบ ไม่มี ✗
