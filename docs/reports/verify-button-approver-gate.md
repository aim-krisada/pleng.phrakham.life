# ปุ่ม "✓ ตรวจแล้ว" โผล่เฉพาะ approver (พี่เปา)

**branch:** `claude/sad-jennings-08f0ad` (fork จาก `studio-shell-redesign` — ยืนยันด้วย `git merge-base --is-ancestor`)
**ประเภท:** refine 1 จุด (ไม่ redesign)
**ที่มา:** `docs/reports/check-role-permission.md` §จุด1 (จุดขรุขระ UX — ไม่ใช่ช่องโหว่)

## ปัญหา
ปุ่ม "✓ ตรวจแล้ว" (verified) ในหน้าแก้เพลง gate ด้วย `v-if="loggedIn"` → โผล่ให้ทุกคนที่ล็อกอิน (รวม editor/ติว) แต่ตอน editor กด DB ปฏิเสธ (RLS `songs.verified` = approver-only) ขึ้น error → สับสน

## แก้
- [`src/components/EditorMode.vue`](src/components/EditorMode.vue) ~บรรทัด 2360: ปุ่ม `.ed-verify` เปลี่ยน gate `v-if="loggedIn"` → `v-if="isApprover"`
- `isApprover = computed(() => props.tier === 'approver')` มีอยู่แล้วในไฟล์ (mirror `canApprove` ใน store) — ใช้ getter เดิม ไม่เพิ่ม logic ใหม่
- เพิ่ม comment อธิบายว่าทำไม gate ด้วย approver (RLS จะ reject editor)
- แตะแค่ 3 บรรทัด (button + comment)

## AC — ผ่านครบ
| ผู้ใช้ | เห็นปุ่ม? | ยืนยัน |
|---|---|---|
| anon (public) | ❌ ไม่เห็น | test เดิม + `tier==='anon'` |
| editor (ติว) | ❌ ไม่เห็น | **unit test ใหม่** (`tier==='editor'`) |
| approver (พี่เปา) | ✅ เห็น กดได้เหมือนเดิม | test เดิม (flips verified) |

## DoD
- **test:** `524 passed` (52 suites) · verify suite `EditorMode.verify.test.js` = 4 passed รวม case ใหม่ "hidden for a logged-in editor"
  - suite `notationLint.test.mjs` ขึ้น fail = **pre-existing** (standalone script เรียก `process.exit(0)` — exit 0 = ผ่าน แต่ vitest flag การเรียก process.exit) · `git diff` เทียบ base = ไม่แตะไฟล์นี้
- **build:** `vite build` ✓ (1.82s)
- **serve (--host):** ยืนยัน compiled template gate ที่ `$setup.isApprover` (guard เดิม `loggedIn` บนปุ่มนี้หายแล้ว)
  - **Local:** http://localhost:5361/
  - **Network (มือถือ):** http://192.168.1.124:5361/
- **ห้าม merge/deploy เอง** — รอ PM gate

## หมายเหตุ verify UI ในเบราว์เซอร์
การซ่อน/โชว์ตาม role ขับด้วย auth tier (ต้อง login 2 บัญชี editor+approver จริงกับ Supabase) — unit test mount component ที่ทั้ง 3 tier แล้ว assert `.ed-verify` โดยตรง = หลักฐานตรงกว่าคลิกในเบราว์เซอร์สำหรับ gate นี้ · compiled template ยืนยัน guard ถูกต้องแล้ว

## ไฟล์ที่แตะ
- `src/components/EditorMode.vue` (ปุ่ม + comment)
- `src/components/EditorMode.verify.test.js` (เพิ่ม editor-hidden case + ปรับ header/ชื่อ test ให้ตรง approver-only)
