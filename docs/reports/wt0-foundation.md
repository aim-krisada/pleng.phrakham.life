# รายงาน — wt0-foundation (WT-0 ฐาน)
**รอบ:** รอบแรก (สร้างฐาน + แกะ EditorMode)
**สถานะ:** เสร็จ — พร้อมให้ SA review + merge

## ทำอะไรไปบ้าง (ต่อ US)
- **US-01 (surface เดียว 3 มุมมอง):** ✅ — `Studio.vue` เป็น thin shell แล้ว: ถือ "เพลงปัจจุบัน" ไว้ตรงกลาง + เลือกโหมด (ดู/แผ่น/แก้) + mount คอมโพเนนต์ตามโหมด (`SongViewer` / `SongSheet` / `EditorMode`). เปิด `/song/:id` เข้ามาได้โหมด **ดู** เป็นค่าเริ่มต้น · สลับโหมดแล้ว **งานที่กำลังแก้ไม่หาย** (editor mount ค้างด้วย `v-show` + ยิง `change` ขึ้น shell ทุกครั้งที่แก้)
- **US-02 (สิทธิ์อยู่ที่การเก็บ):** ✅ — รวม gating เป็นจุดเดียวใน `store.js`: `tier` (`anon`/`editor`/`approver`) · `canStore` · `canApprove`. ปุ่มบันทึกใน dock โชว์ตาม tier (anon = เห็นแค่ดาวน์โหลด JSON · editor+ = บันทึกร่าง/ส่งตรวจ · approver = เผยแพร่/ลบ/ย้อน)
- **US-03 (เข้าระบบแบบเชิญ):** ✅ — หน้า login ไม่มีปุ่มสมัครอยู่แล้ว (`ProfileTool.vue` = login + ลืมรหัส เท่านั้น) · **ยืนยันแหล่ง role = ตาราง `profiles.role`** (`'editor'`/`'approver'`) อ่านใน `store.js › loadProfile()` — บันทึกกลับใน DS-03 แล้ว
- **US-04 (สัญญาจุดต่อ + แกะ EditorMode):** ✅ — ยกโค้ด editor ทั้งก้อนออกจาก `Studio.vue` → `src/components/EditorMode.vue` (ไม่รื้อ internals: `NoteBoxes`/`NoteRow`/`ComboSelect` เดิม) · ทุกโหมดรับ props/emits ตาม contract

## contract ที่ทุก worktree ยึด (DS-04)
- **props เข้าโหมด:** `song` (v2 row `{id,number,title_th,title_en,content}`) · `tier` (`'anon'|'editor'|'approver'`) · `active` (โหมดนี้กำลังโชว์อยู่ไหม — ใช้คุม chrome ที่ teleport เข้า ShellBar)
- **events ออกจากโหมด:** `change(song)` (แก้แล้ว — shell เก็บเป็น state กลาง) · `save(kind)` โดย `kind ∈ 'json'|'draft'|'pending'|'publish'`
- **gating:** อ่านจาก store — `store.tier` / `store.canStore` / `store.canApprove` (ไม่เช็ก `session` กระจัดกระจายอีก)
- **ผลลัพธ์:** หลัง merge → **A/B/C/D แก้เฉพาะไฟล์โหมดของตัวเอง** (`SongViewer` / `SongSheet` / `EditorMode` / `jsonIO.js`) **ไม่ต้องแตะ `Studio.vue`** ✅

## ไฟล์ที่แก้
- `src/store.js` — เพิ่ม getter `tier` / `canStore` / `canApprove` (SSOT ของสิทธิ์)
- `src/views/Studio.vue` — **เขียนใหม่เป็น thin shell** (~230 บรรทัด จากเดิม 2,759): route + โหลดเพลง + โหมด + mount 3 คอมโพเนนต์ + teleport (ชื่อเพลงแบบอ่าน + ปุ่มสลับโหมด 3 ทาง)
- `src/components/EditorMode.vue` — **ไฟล์ใหม่** = editor ทั้งก้อน (script + template + dock + panels + เมนู เพลง/จัดการ ที่ teleport เข้า ShellBar) · ต่อ props/emits ตาม contract · gating ผูกกับ `props.tier`
- `docs/ds/wt0-foundation/DS-03-*.md` — บันทึกแหล่ง role ที่ยืนยันจากโค้ด
- โครงสร้างเทสต์ (worktree นี้เป็นเจ้าของ): `package.json` (+vitest/@vue/test-utils/jsdom) · `vite.config.js` (บล็อก `test`) · `.claude/launch.json` (+config `wt0` พอร์ต 5301)

## ผลทดสอบ
- **unit:** `npm test` → **10/10 ผ่าน** ใน 3 ไฟล์
  - `store.gating.test.js` (4) — tier/canStore/canApprove ครบ 3 สถานะ + legacy
  - `views/Studio.mode.test.js` (4) — เปิดมาโหมดแก้ · 3 โหมด mount ถูกตัว · **แก้แล้วสลับโหมดไม่หาย** · tier ส่งผ่าน prop
  - `components/EditorMode.contract.test.js` (2) — โหลด song จาก prop แล้ว emit `change` · แก้ชื่อแล้ว emit ซ้ำ
- **build:** `npm run build` ✅ (104 modules · เตือนแค่ font path เดิม ไม่เกี่ยว)
- **ลองจริงบนเบราว์เซอร์ (port 5301):** เปิด `/studio` = โหมดแก้ · พิมพ์ชื่อ + โน้ต `1 2 3 5` → สลับ **ดู** (SongViewer เห็นโน้ต) → **แผ่น** (SongSheet เห็นแผ่น) → **แก้** (โน้ตยังอยู่ครบ) · เปิด `/song/:id` = โหมดดู โหลดเพลงจริงจาก Supabase (คอร์ด+โน้ต+เนื้อ) · console ไม่มี error
- **วิธี tester ลอง:** เปิด `http://localhost:5301` → เปิดเพลงสักเพลง → กดสลับ **ดู / แผ่น / แก้** บนแถบบนขวา → เพลงต้องไม่หาย ทุกโหมดแสดงถูก · ลองแก้ในโหมดแก้ แล้วสลับไปดู/กลับมา = ค่าที่แก้ยังอยู่

## ข้อสังเกต / คำถามถึง SA
1. **โหมดสลับเป็น 3 ปุ่ม (ดู/แผ่น/แก้)** ตาม US-01 (เดิมเป็นปุ่ม toggle 2 ทาง sheet↔edit) · ลำดับบน ShellBar ตอนนี้ = [ปุ่มสลับโหมด][เพลง][จัดการ] (เดิมปุ่มโหมดอยู่ขวาสุด) — เป็นเพราะ teleport เรียงตามลำดับ mount (shell ก่อน editor) · ถ้าอยากได้ลำดับเดิมบอกได้ ปรับเพิ่มได้
2. **state ที่คงอยู่ข้ามโหมด** = ทั้งหมด (โน้ต·เนื้อ·ท่อนที่เลือก·undo history) เพราะ editor mount ค้างด้วย `v-show` — เกินที่ AC ขอ (ขอแค่ "เพลงไม่หาย") แต่ให้ UX ดีกว่า
3. **`save(kind)` event** ยิงออกมาตาม contract แต่ตัวเก็บจริง (เขียน Supabase) ยังอยู่ใน EditorMode เพราะมันเป็นเจ้าของ state + การเขียน · shell รับ event ไว้เป็น hook เฉย ๆ (onSave ว่าง) — ถ้าอยากให้ persistence ย้ายขึ้น shell บอกได้ แต่ผมแนะนำให้อยู่กับ WT-D
4. **เพิ่ม vitest** เป็น dev dependency (เดิม repo ไม่มี test runner) — เป็นของฐาน worktree นี้ · A/B/C/D rebase มาแล้วได้ test runner ใช้ต่อเลย
5. `.claude/launch.json` เพิ่ม config `wt0` (พอร์ต 5301) — ตรงตารางพอร์ตใน workflow.md

## ข้อเสนอปรับ workflow / SOP (ถึง SA — จากบทเรียนรอบนี้)
บทเรียน: รอบนี้ dev **ปิด dev server ตอนจบงาน** ทำให้พี่เอมเปิด `localhost:5301` ตรวจไม่ได้ ต้องสั่งให้สตาร์ทใหม่ — เสียเวลา 1 รอบ. เสนอเติม 2 ข้อลง `workflow.md` (บล็อก "สำหรับ dev") + `prompts/dev.md`:

1. **จบงานแล้ว "ค้าง dev server ไว้" — ห้ามปิด** · ปล่อยรันที่ **port ประจำของงานตามตาราง** (WT-0=5301 · A=5302 · B=5303 · C=5304 · D=5305) เพื่อให้พี่เอม/พี่เปา เปิดตรวจได้ทันทีโดยไม่ต้องสั่งสตาร์ทเอง · dev แค่ปิดตอนจะ merge เสร็จหรือเปลี่ยนงานเท่านั้น
2. **ระบุ URL ตรวจงานท้ายรายงานเสมอ** (เช่น "ตรวจที่ http://localhost:5301") — ให้ handoff จบในตัว
3. **1 session = 1 port แยก** (มีในตารางอยู่แล้ว) → ทุกงานเปิดพรีวิวขนานกันได้ · ข้อ 1 จะได้ผลก็ต่อเมื่อยึด port แยกเคร่งครัด (ไม่มีใครแย่ง 5301)

> ตรวจงาน WT-0 ได้ที่ **http://localhost:5301** (dev ค้าง server ไว้ให้แล้ว)

## พร้อม merge ไหม
**พร้อม** — AC ครบทั้ง 4 US · unit + build + ลองจริงผ่าน · contract วางเป็น "กำแพง+ประตู" ให้ A/B/C/D เริ่มขนานได้ (แก้เฉพาะไฟล์โหมดตัวเอง ไม่ชน `Studio.vue`)
