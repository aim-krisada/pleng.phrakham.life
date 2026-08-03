# Brief — B103 (chore): เพิ่ม `.gitattributes` บังคับ LF (กัน CRLF whole-file diff)

**ฐาน:** `studio-shell-redesign` · **worktree/branch ใหม่:** `b103-gitattributes` · **สั่งโดย:** PM (pm11) · P'Aim เคาะ "Go" 12 ก.ค.

## ที่มา
บทเรียน B097: dev เซฟ `EditorMode.vue` เป็น CRLF ทั้งไฟล์ (repo ไม่มี `.gitattributes` · `core.autocrlf=true`) → cherry-pick ได้ diff บวมเป็นหมื่นบรรทัด + เสี่ยง conflict. แก้ถาวร = บังคับ EOL ผ่าน `.gitattributes`

## สิ่งที่ต้องทำ
1. เพิ่มไฟล์ **`.gitattributes`** ที่ root:
   ```
   * text=auto eol=lf
   *.png binary
   *.jpg binary
   *.jpeg binary
   *.gif binary
   *.ico binary
   *.woff binary
   *.woff2 binary
   ```
   (ปรับ binary list ตามไฟล์จริงในรีโป — ตรวจว่าไม่มีไฟล์ binary อื่นโดน text)
2. **renormalize** ทั้งรีโปเป็น LF: `git add --renormalize .` → commit (จะเป็น commit ใหญ่ที่แก้ EOL อย่างเดียว — ตั้งใจ)
3. **ยืนยันไม่พังอะไร:** `npx vitest run` เขียว (`notationLint` quirk เดิม) + `npm run build` ผ่าน + `git diff` ตรวจว่า renormalize แตะแค่ EOL ไม่แตะเนื้อโค้ด

## รั้ว / ข้อควรระวัง
- commit renormalize จะใหญ่ (หลายไฟล์) แต่ **เนื้อหาต้องไม่เปลี่ยน** — แค่ EOL · ตรวจ `git diff --stat` + สุ่มเปิดไฟล์ยืนยัน
- อย่าแตะ logic ใดๆ
- **⚠️ กำลังมีสายแก้ EditorMode.vue หลายสาย (B099/B100/B101) + งานอื่น** — renormalize ทั้งรีโปอาจชนตอน merge สายพวกนั้นกลับ. **แนะนำ: ทำ .gitattributes ให้เสร็จ+ตรวจ แต่ให้ PM เป็นคน merge จังหวะที่เหมาะ (หลังสายอื่น merge เข้ามาแล้ว หรือก่อนเริ่มรอบใหม่)** — flag PM ในรายงาน

## DoD + รายงาน
- vitest เขียว + build ผ่าน · `.gitattributes` มีผล (`git check-attr -a src/components/EditorMode.vue` โชว์ `text eol=lf`)
- รายงาน `docs/reports/b103-gitattributes.md` + บรรทัด `board.md` §📥 inbox + ping **PM ปัจจุบัน §🎯 (pm11)** · **ไม่ commit ลง base · ไม่ deploy** (PM merge จังหวะเหมาะ)
