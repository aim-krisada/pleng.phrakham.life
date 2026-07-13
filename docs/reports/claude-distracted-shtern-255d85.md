# Report — B028 audit log "ใครแก้อะไร" (Dev · สาย DB/audit)

**Branch:** `claude/distracted-shtern-255d85` (fork จาก `studio-shell-redesign` — ยืนยัน merge-base = `ce41874` แล้ว ไม่ใช่ main)
**Brief:** `docs/pm/brief-audit-log.md` · **DS:** `docs/ds/audit-log.md`
**Network URL (มือถือ):** `http://192.168.1.124:5311/` — สั่ง `npm install && npm run dev -- --host --port 5311 --strictPort` ในโฟลเดอร์ worktree นี้ (IP เครื่องเปลี่ยนบ่อย เช็ก `Get-NetIPAddress` ก่อนส่งต่อ)

---

## ทำอะไรไป (ภาษาคน)
ทำระบบ "สมุดบันทึกประวัติเพลง" ที่ **ฐานข้อมูลจดเอง** — ใครแตะเพลงในคลังกลาง ระบบจดทันที คนแก้/ลบร่องรอยไม่ได้ ต่อยอดของเดิม (`song_revisions`) ไม่ทำตารางใหม่ ข้อมูลเก่าไม่หาย.

จุดสำคัญที่ P'Aim ย้ำ — **ชื่อคนแก้ต้องไม่หาย**: ตอนจด ระบบ **ถ่ายสำเนาชื่อ + ตำแหน่ง ณ วินาทีนั้น** ลงในบันทึกเลย ถ้าคนคนนั้นถูกลบบัญชี/เปลี่ยนชื่อทีหลัง ประวัติเก่ายังอ่านออกว่าใครทำ (พิสูจน์ด้วยเทสต์: ลบ profile ทิ้งแล้วชื่อในบันทึกยังอยู่).

และ **"อนุมัติ + เผยแพร่" = เหตุการณ์เดียว**: กดทีเดียวเห็นบรรทัดเดียวว่าใครทำเพลงเป็นสาธารณะ (ผ่านคำสั่งฐานข้อมูล `approve_and_publish` ที่ทำ 2 อย่างในทีเดียว + ผูกด้วย `op_group`).

## ไฟล์ที่ทำ
| ไฟล์ | คืออะไร |
|---|---|
| `db/004-audit-log-events.sql` | **migration** — ต่อคอลัมน์ให้ `song_revisions` (event/hand/entity, actor snapshot, before/after เต็ม, op_group, song_ref) · trigger จับ **2 มือ** (`song_drafts` + `songs`) แปลงเป็น event มีความหมาย · **snapshot actor_name/role ตอนเขียน** · RPC `approve_and_publish` · back-fill แถวเก่า |
| `src/lib/auditLog.js` | อ่าน/จัดรูป log ให้ UI — event→ป้ายไทย/ไอคอน · `actorLabel` (ใช้ snapshot ก่อนเสมอ) · รวม `op_group` เป็นบรรทัดเดียว · โหลดไทม์ไลน์ทั้งสาย (ร่าง+คลัง) |
| `src/components/RevisionHistory.vue` | พาเนล "ประวัติการแก้ไข" ใหม่→เก่า · แยกสี editor/approver · diff ก่อน↔หลัง · ปุ่มย้อนเวอร์ชัน (เฉพาะ approver) |
| `src/components/EditorMode.vue` | wiring: `approve()` เรียก RPC · พาเนล history เปลี่ยนมาใช้ `<RevisionHistory>` · ลบโค้ด history เดิมที่ตายแล้ว (`revName/revDiff/loadRevisions`) — **ไม่แตะโซนปุ่ม "✓ ตรวจแล้ว"** |
| เทสต์ | `src/lib/auditLog.test.js` · `src/components/RevisionHistory.test.js` · `src/components/EditorMode.approve-rpc.test.js` · **`db/004-audit-log-events.test.js`** (รัน SQL จริงบน Postgres in-memory) |

## คำตัดสิน P'Aim 7 ข้อ — ทำครบ
1. จับ `song_drafts` ด้วย ✅ (create/edit/submit/reject ฝั่งคนทำเพลง)
2. event มีความหมาย ✅ `create·edit·submit·approve_publish·reject·edit_published·unpublish`
3. RPC `approve_and_publish` = 1 op_group ✅ (เทสต์ยืนยัน 2 แถวใช้ op_group เดียว)
4. ⭐ snapshot `actor_name`+`actor_role` ✅ **เก็บ fk `actor_id` ไว้ด้วย** · เทสต์: ลบ profile แล้วชื่อยังอยู่
5. วิวัฒน์ `song_revisions` ที่เดิม ✅ (ALTER + back-fill · ไม่ทำตารางใหม่)
6. `unpublish` เดียว ✅
7. logged-in อ่านได้หมด ✅ (คง RLS เดิม · ไม่มี policy เขียนให้ client = แก้ log ไม่ได้)

## verify ยังไง (พิสูจน์จริง ไม่ใช่ "ไม่ error")
- **DB layer (ส่วนเสี่ยงสุด) — รัน trigger/RPC จริงบน Postgres** ผ่าน pglite ใน `db/004-audit-log-events.test.js` (โหลดไฟล์ `db/004` ตัวจริงมารัน):
  - จดครบทุก event ทั้ง 2 มือ (create→edit→submit→reject→submit ฝั่งร่าง · approve_publish/edit_published/unpublish ฝั่งคลัง)
  - **actor_name อยู่รอดหลังลบ profile** (join คืน null แต่สำเนาในบันทึกยังอยู่)
  - `approve_and_publish` → 2 แถว **op_group เดียวกัน** · กัน non-approver (raise)
  - write ปกติ (ไม่ผ่าน RPC) → op_group เป็น null
  - **หมายเหตุ:** เทสต์นี้จับ bug จริงได้ 1 ตัวระหว่างทำ (inline CASE อ้าง `new.song_id` บนตาราง `songs` ที่ไม่มีคอลัมน์นั้น) → แก้เป็น branch-local variable แล้ว
- **UI/lib** — `auditLog.test.js` (27 เคส: mapping ครบทุก event · actorLabel snapshot-first · collapse op_group) · `RevisionHistory.test.js` (render/สี/ปุ่มย้อน/empty) · `approve-rpc.test.js` (approve เรียก RPC ไม่ใช่ 2-step เดิม)
- **ทั้ง repo:** `563 passed` · build ผ่าน · เปิดแอปจริงในเบราว์เซอร์ (worktree, `--host`) = **0 console error**
- **หมายเหตุ:** `src/lib/notationLint.test.mjs` ขึ้น "failed suite" — เป็น script เดิมที่เรียก `process.exit()` เอง (ไม่ใช่เทสต์ vitest ปกติ · **มีมาก่อน · ไม่เกี่ยวงานนี้** · ยืนยันด้วย `git show studio-shell-redesign:...`)

## ต้องรู้ก่อน merge/deploy
- **migration `db/004` ต้องรันใน Supabase SQL Editor โดย approver (P'Aim)** — ผมไม่รันเอง (ไม่ deploy/แตะ prod DB). ก่อนรัน db/004 ต้องมี 002+003 แล้ว. **ก่อนรัน migration หน้า "ประวัติการแก้ไข" จะยังว่าง** (query หาคอลัมน์ `song_ref` ไม่เจอ → lib จับ error คืน [] อย่างนุ่มนวล ไม่พัง). end-to-end บนเบราว์เซอร์จริงต้องรอ migration ลง prod ก่อน — DB logic พิสูจน์ครบด้วย pglite แล้ว
- **จุด handshake กับ WT-D (DS §2) — จัดการฝั่ง query แล้ว ไม่ต้องเพิ่ม `songs.source_draft_id`:** `loadSongHistory(songId)` ดึง draft id ที่ link กับเพลง แล้ว query `song_ref in (songId, ...draftIds)` → รวมไทม์ไลน์เพลงใหม่ (แถวช่วงร่าง key ด้วย draft.id) เข้ากับช่วงเผยแพร่ได้เอง โดยไม่แก้ schema `songs`
- **เพิ่ม devDependency:** `@electric-sql/pglite` (ไว้รัน Postgres จริงในเทสต์ · dev-only ไม่กระทบ bundle production)
- **ไม่แตะโซน "✓ ตรวจแล้ว"** (`markVerified` ~บรรทัดเดิม) ตาม brief — กัน merge ชนสาย "ป้ายสถานะตรวจเพลง"

## DoD
- [x] unit test ครบทุก event + actor_name ไม่หาย + RPC = 1 op_group
- [x] server `--host` + Network URL ในรายงาน
- [x] test เดิมไม่แตก (563 passed) + build ผ่าน
- [x] ไม่ merge/deploy เอง — รอ PM gate + tester
