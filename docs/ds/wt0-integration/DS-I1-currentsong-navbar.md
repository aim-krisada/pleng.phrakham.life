# DS-I1 — currentSong → navbar buttons

**คู่กับ:** `us/wt0-integration/US-I1-currentsong-navbar.md`

## ไฟล์ที่แตะ
- `src/views/Studio.vue` (WT-0 · ว่างแล้ว)

## จุดเสี่ยงชน
- ไม่มี — `Studio.vue` ไม่มี worktree อื่นแตะแล้ว

## design
- ตอนโหลดเพลง (`onMounted` / `watch(route.params.id)`) → `store.currentSong = song`
- ตอนออกจากเพลง/เพลงใหม่ว่าง → เคลียร์/อัปเดต `currentSong`
- `DownloadTool` (navbar) `v-if="store.currentSong"` จะโผล่เอง

## test
- **unit:** เปิดเพลง → `currentSong` ถูกเซ็ต · ปุ่ม navbar โผล่
- **tester:** port 5301 เปิดเพลง → เห็นปุ่มดาวน์โหลด/พิมพ์บนแถบบนทุกโหมด
