# SA security audit — pleng backend (RLS · RPC · secrets)

**ขอบเขต:** ทุกตาราง (RLS) · ทุก `security definer` RPC (privilege escalation · search_path) · secret leak · verify โค้ด/SQL จริง 2026-07-18
**ต่อยอด:** ปิด verified-GATE RLS leak ไปแล้ว (`db/005` LIVE) → รอบนี้กวาดที่เหลือเชิงรุก
**มาตรฐาน:** ISO/IEC 27001 A.9 (access) · A.12.4 (audit integrity) · Supabase RLS · Postgres security-definer hardening

---

## 0 · สรุปผล (ranked by severity)

| # | ระดับ | เรื่อง | สถานะ |
|---|---|---|---|
| **F1** | 🟠 **MEDIUM** | `song_drafts` UPDATE **ไม่มี `with check`** → editor set `status='approved'` เองได้ (forge อนุมัติ + audit ปลอม) | fix ใน `db/009` |
| **F2** | 🟡 LOW-MED | 3 ฟังก์ชัน `db/002` **ไม่ pin `search_path`** (`handle_new_user`·`app_role`·`log_song_change`) — hardening gap | fix ใน `db/009` |
| **F3** | 🟡 LOW | `log_song_change()` = **dead code** (ถูกแทนด้วย `log_song_event` ใน db/004 · ไม่มี trigger เรียก) | drop ใน `db/009` |
| **F4** | ⚪ INFO | `profiles` อ่านได้โดยทุก authenticated (display_name+role ของทุกคน) — ยอมรับได้ (ทีมเล็ก invite-only) | note เฉย ๆ |
| ✅ | GOOD | **ไม่มี service_role/secret รั่วใน repo** (มีแค่ publishable key = ปลอดภัยโดยออกแบบ) | — |
| ✅ | GOOD | **RLS เปิดครบทุกตาราง** (profiles·song_drafts·song_revisions·notifications·songs) · verified gate ปิดแล้ว (db/005) | — |
| ✅ | GOOD | ฟังก์ชันรุ่นใหม่ (003·004·008) pin search_path + scope auth.uid() ครบ | — |

**สรุป:** ระบบ**แข็งแรงในภาพรวม** (ไม่มี secret รั่ว · RLS ครบ · gate สำคัญปิดแล้ว) · เหลือ **1 medium (self-approve) + hardening 2 จุด** → รวมใน `db/009-security-hardening.sql` (เตรียม ⛔ ยังไม่รัน · P'Aim รันเอง)

---

## F1 · 🟠 MEDIUM — editor อนุมัติร่างตัวเองได้ (song_drafts UPDATE ไม่มี WITH CHECK)

**policy ปัจจุบัน (`db/002`):**
```sql
create policy "Update own or as approver" on public.song_drafts
  for update using (author_id = auth.uid() or public.app_role() = 'approver');
```
**ช่องโหว่:** Postgres — UPDATE ที่**ไม่มี `with check`** ใช้ `using` เป็น check ของ row ใหม่ด้วย · `using = author_id=auth.uid()` → **ควบคุมแค่ "ห้ามเปลี่ยน author_id เป็นคนอื่น" (ดี) แต่ไม่คุม `status`** → **editor UPDATE ร่างตัวเอง set `status='approved'` ได้** (row ยังมี author_id=ตัวเอง = ผ่าน check)

**ผลกระทบ (จริง แต่ไม่ถึงขั้น data leak):**
- ❌ **ไม่** ทำให้เพลงขึ้น public — publish จริงผ่าน `songs` (approver-only RLS) / `approve_and_publish` (เช็ก approver) → gate จริงยังอยู่
- 🟠 **แต่:** `drafts_audit` trigger (`log_song_event`) map `status→'approved'` = event `approve_publish` hand `approver` → **audit log บันทึกเหตุการณ์ "อนุมัติโดย approver" ปลอม** โดย actor = editor → **ทำลาย integrity ของ audit (ISO 27001 A.12.4)** + พังโมเดล review ("อนุมัติได้เฉพาะ approver")
- exploitability ต่ำ (ทีม invite-only เชื่อถือได้) แต่เป็นช่องที่ควรปิด

**fix (`db/009`):** เพิ่ม `with check` จำกัด status ของ non-approver ให้ได้แค่ `draft`/`pending` (ตรงกับที่แอปใช้ — editor เซฟร่าง/ส่งตรวจ · อนุมัติผ่าน RPC เท่านั้น)

## F2 · 🟡 LOW-MED — 3 ฟังก์ชัน security-definer ไม่ pin search_path

`handle_new_user` · `app_role` · `log_song_change` (`db/002`) = `security definer` แต่**ไม่มี `set search_path`** → ใช้ search_path ของ caller = ช่องทาง **search_path hijack** (สร้าง object ชื่อชนใน schema ที่มาก่อน → รันโค้ดด้วยสิทธิ์ definer)
- **exploitability ต่ำ** เพราะ ref ในฟังก์ชัน**เป็น schema-qualified อยู่แล้ว** (`public.profiles`/`public.song_revisions`/`auth.uid()`) → ยาก hijack · **แต่ผิดมาตรฐาน** ที่ db/003/004/008 ทำครบ (defense-in-depth)
- **fix (`db/009`):** เพิ่ม `set search_path = ''` (ref qualified ครบแล้ว) หรือ `= public` — recreate 3 ฟังก์ชัน

## F3 · 🟡 LOW — `log_song_change()` = dead code

`db/004` drop trigger เก่า + สร้างใหม่ใช้ `log_song_event` → **`log_song_change()` ไม่มี trigger เรียกแล้ว** แต่ยัง define ค้าง (definer function ที่ไม่ pin search_path นั่งเปล่า ๆ) → **drop ทิ้ง** (`db/009`)

## F4 · ⚪ INFO — profiles อ่านได้ทุก authenticated

`"Authenticated can read profiles"` → ทุกคนล็อกอินเห็น display_name+role ของทุกคน · **ยอมรับได้** (ทีมเล็ก invite-only · จำเป็นต่อการโชว์ชื่อผู้เขียนร่าง) · ไม่ใช่ช่องโหว่ · บันทึกไว้เฉย ๆ

---

## ✅ สิ่งที่ตรวจแล้วปลอดภัย (ยืนยัน)

- **ไม่มี secret รั่ว:** grep `src/`+`db/`+config = ไม่มี service_role key/JWT secret/private key · มีแค่ **publishable key** ใน `supabase.js` (ออกแบบให้เปิดเผยได้ · write ป้องกันด้วย RLS+auth)
- **RLS ครบทุกตาราง:** profiles·song_drafts·song_revisions·notifications·songs = enable + policy ครบ · **ไม่มีตารางเปิดโล่ง**
- **verified gate ปิดแล้ว (db/005 LIVE):** anon เห็นเฉพาะ verified (พิสูจน์ 32/94)
- **RPC สิทธิ์ถูก:** `approve_and_publish` เช็ก approver + raise · `update_my_display_name` แตะแค่ display_name ของตัวเอง · `mark_notification_read` scope auth.uid() · `song_revisions`/`notifications` write ผ่าน trigger/RPC เท่านั้น (client forge ไม่ได้)
- **audit ปลอมแปลงไม่ได้ (นอกจาก F1):** ไม่มี client write policy บน song_revisions → log เขียนได้แค่ trigger

---

## แผนแก้ (ทั้งหมดใน `db/009-security-hardening.sql` · ⛔ เตรียม ยังไม่รัน)
1. F1 — เพิ่ม `with check` บน song_drafts UPDATE (editor จำกัด draft/pending)
2. F2 — recreate 3 ฟังก์ชัน + `set search_path`
3. F3 — `drop function log_song_change()`
**ทั้งหมดเป็น hardening ปลอดภัย ไม่กระทบ flow แอป** (editor ใช้ saveDraft draft/pending อยู่แล้ว · อนุมัติผ่าน RPC) · P'Aim รันเมื่อพร้อม (ไม่เร่งเท่า RLS leak เพราะทีม invite-only)

---

*verify SQL/โค้ดจริง 2026-07-18 · SA (security audit · read-only) · ฐาน `studio-shell-redesign`*
