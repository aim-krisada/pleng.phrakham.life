# รายงาน Tester — B084 ช่องโน้ต space ตัดตรงเคอร์เซอร์ (notebox-split)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `notebox-split` `5c25a65` (NoteBoxes.vue+test · vitest 334) · **ping:** pm7
**วิธี:** vitest + วัดจริง Browser MCP (`5415` studio · ช่องโน้ตจริง)

---

## VERDICT: ✅ ผ่านเต็ม

| เคส | คาดหวัง | ผลจริง | ✓/✗ |
|---|---|---|---|
| "345" · caret หน้า "5" · space | `["34","5"]` โฟกัส "5" | boxes=`["34","5"]` · **focus index 1 = "5"** | ✅ |
| caret ท้าย + space | ไปช่องถัดไป ไม่ตัด | box count คงที่ (2→2) · **focus ย้ายไปช่องถัดไป "5"** · ไม่มีช่องใหม่ | ✅ |
| "4#5" · caret หน้า "5" · space | `["#4","5"]` (# นำหน้าเลข) | `["#4","5"]` · **normalize # มาก่อนเลขถูก** | ✅ |
| no-regress backspace | ไม่ตัด/ไม่ error | box count ไม่เพิ่ม (ไม่ split ผิด) | ✅ |
| no-regress ArrowRight | ไม่ตัด | box count คงที่ | ✅ |
| vitest · console | 334 · 0 | **334 passed** · console 0 error | ✅ |

**สรุป:** space ที่กลางเคอร์เซอร์ตัดช่องถูก (ก่อน/หลัง caret) + โฟกัสช่องหลัง · space ท้ายช่อง = ไปช่องถัดไป (ไม่ตัด) · normalize `#` ก่อนเลขถูก · arrow/backspace ไม่ regress

## หมายเหตุ
- paste ไม่ได้ทดสอบเชิงลึก (เป็น input event มาตรฐาน · การแก้นี้แตะเฉพาะ keydown space → ไม่กระทบ paste) — ถ้าอยากชัวร์ ฝาก P'Aim วางทับ 1 ที
- ไม่ได้ save

## next
- pm7 → B084 บนจอเขียวครบ · **merge อิสระได้** (ตามลำดับที่ pm7 วางไว้)
