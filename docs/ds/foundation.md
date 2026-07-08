# DS — WT-0 ฐาน (foundation)

**คู่กับ:** `docs/us/foundation.md`

## ไฟล์ที่เป็นเจ้าของ (มีแต่ WT-0 แก้ได้)
- `src/views/Studio.vue` — เหลือแค่ shell: เลือกโหมด + gating + mount component
- `src/components/EditorMode.vue` — **ใหม่** (แกะ editor ออกจาก Studio.vue ทั้งก้อน)
- `src/store.js` — เพิ่ม getter รวมศูนย์: `tier` · `canStore` · `canApprove`
- `src/supabase.js` · `src/components/ShellBar.vue` — auth/role + teleport target

## จุดเสี่ยงชนกับ worktree อื่น (เหตุผลที่ต้องทำ WT-0 ให้จบก่อน)
- ทุกโหมด mount ผ่าน `Studio.vue` → ถ้ายังไม่แกะ editor ออก A/B/C/D จะต้องแก้ `Studio.vue` = ชนกัน
- gating กระจาย (เช็ก `session` หลายที่) → รวมเป็น getter เดียวก่อน A/B/C/D เรียก

## โครง Studio.vue หลังทำ (thin shell)
```
<ShellBar/>                          <!-- teleport: title, menus, catalog -->
<main>
  <SongViewer v-if="mode==='view'"  :song :tier @change/>
  <SongSheet  v-if="mode==='sheet'" :song/>
  <EditorMode v-if="mode==='edit'"  :song :tier @change @save/>
</main>
<Dock/>                              <!-- ปุ่มบันทึกแสดงตาม tier -->
```

## สัญญาจุดต่อ (contract) — ทุก worktree ยึดตามนี้
**props เข้าโหมด**
- `song` : object — เพลงปัจจุบัน (v2 model)
- `tier` : `'anon' | 'editor' | 'approver'`

**events ออกจากโหมด**
- `change(song)` — เพลงถูกแก้ (Studio เก็บ state กลาง ไว้สลับโหมดไม่หาย)
- `save(kind)` — ผู้ใช้กดบันทึก โดย `kind ∈ 'json' | 'draft' | 'pending' | 'publish'` (Studio/Dock ตัดสินตาม tier ว่าปุ่มไหนโชว์)

**gating (จาก store)**
- `store.tier` · `store.canStore` (editor ขึ้นไป) · `store.canApprove` (approver)

## states
- `/studio` เปล่า = เพลงใหม่ว่าง, โหมดแก้ (ถ้า tier ≥ editor)
- กำลังโหลดเพลง / โหลดไม่เจอ (error) / โหลดเสร็จ
- logged-out เปิดเพลง → ดู/แผ่น ได้, กดบันทึก = ดาวน์โหลด JSON

## a11y / responsive
- WCAG 2.2 AA · targets ≥26px · focus rings · sticky-safe `scroll-margin-top` · mobile drawer ที่ 760px
- ของเดิมทำไว้แล้ว — WT-0 **รักษาไว้** ระหว่างแกะไฟล์

## หมายเหตุการทำ
- แกะ editor แบบ **ยกโค้ดออกมาทั้งก้อน** ใส่ `EditorMode.vue` แล้วต่อ props/events — ปรับปรุงภายในเป็นงาน WT-D ไม่ทำตอนนี้
- **ห้าม merge เข้า `main`**
