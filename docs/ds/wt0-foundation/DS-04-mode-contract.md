# DS-04 — mode contract + แกะ EditorMode

**คู่กับ:** `us/wt0-foundation/US-04-mode-contract.md`
**นี่คือ "กำแพง+ประตู" — งานสำคัญสุดของ WT-0**

## ไฟล์ที่แตะ
- `src/views/Studio.vue` · `src/components/EditorMode.vue` (ใหม่)

## สัญญาจุดต่อ (contract) — ทุก worktree ยึดตามนี้
**props เข้าโหมด**
- `song` : object — เพลงปัจจุบัน (v2 model)
- `tier` : `'anon' | 'editor' | 'approver'`

**events ออกจากโหมด**
- `change(song)` — เพลงถูกแก้ (Studio เก็บ state กลาง ไว้สลับโหมดไม่หาย)
- `save(kind)` — กดบันทึก โดย `kind ∈ 'json' | 'draft' | 'pending' | 'publish'` (Dock ตัดสินตาม tier ว่าปุ่มไหนโชว์)

**gating** — จาก store (ดู DS-02): `store.tier` · `store.canStore` · `store.canApprove`

## แกะ EditorMode
- ยกโค้ด editor จาก `Studio.vue` **ออกมาทั้งก้อน** ใส่ `EditorMode.vue` → ต่อ props/events ตาม contract
- **ห้ามรื้อ internals** (`NoteBoxes`/`NoteRow`/`ComboSelect`) — ปรับปรุงภายในเป็นงาน WT-D

## จุดเสี่ยงชนกับ worktree อื่น
- เสร็จอันนี้แล้ว A/B/C/D ถึงจะ **ไม่ต้องแตะ `Studio.vue`** อีก → นี่คือเงื่อนไขปลดล็อกงานขนาน

## test
- **unit:** ส่ง song เข้า `EditorMode` → แก้ → emit `change` ถูก; Studio รับ `change` แล้ว state อัปเดต; emit `save('json')` ทำงาน
- **tester:** port 5301 เข้าโหมดแก้ พิมพ์คำ → สลับไปโหมดดู กลับมา = ค่าที่แก้ยังอยู่
