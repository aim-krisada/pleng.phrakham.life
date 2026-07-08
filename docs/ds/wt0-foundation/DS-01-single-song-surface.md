# DS-01 — surface เดียว 3 มุมมอง

**คู่กับ:** `us/wt0-foundation/US-01-single-song-surface.md`

## ไฟล์ที่แตะ
- `src/views/Studio.vue`

## จุดเสี่ยงชนกับ worktree อื่น
- ทุกโหมด mount ผ่าน `Studio.vue` — ต้องทำเป็น thin shell **ก่อน** A/B/C/D ไม่งั้นทุกคนต้องแก้ไฟล์นี้

## design
โครง `Studio.vue` (thin shell):
```
<ShellBar/>                          <!-- teleport: title, menus, catalog -->
<main>
  <SongViewer v-if="mode==='view'"  :song :tier @change/>
  <SongSheet  v-if="mode==='sheet'" :song/>
  <EditorMode v-if="mode==='edit'"  :song :tier @change @save/>
</main>
<Dock/>
```
- เพลงปัจจุบันเก็บเป็น state กลางที่ Studio (หรือ store) → สลับโหมดไม่ยัด/โหลดใหม่ = ไม่หาย

## test
- **unit:** mount Studio ด้วย song จำลอง · สลับ `mode` → render component ถูกตัว · `song` ยังอยู่หลังสลับ
- **tester:** เปิด `localhost:5301` เปิดเพลง สลับ ดู/แผ่น/แก้ → เพลงไม่หาย ทุกโหมดแสดงถูก

## a11y
- รักษาของเดิม: focus rings · targets ≥26px · drawer 760px · `scroll-margin-top`
