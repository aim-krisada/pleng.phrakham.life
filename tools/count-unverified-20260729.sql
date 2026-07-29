-- นับเพลง "ยังไม่ตรวจ" ด้วยสิทธิ์เต็ม (service_role) — 29 ก.ค. 2026
--
-- ทำไมต้องรันอันนี้: คีย์ anon ถูก RLS ซ่อนแถว unverified ไว้ทั้งหมด
-- (พิสูจน์แล้ว 28 ก.ค. — REST verified=false คืน [] · anon_visible_unverified = 0)
-- ⇒ ใครนับจากหน้าเว็บ/คีย์ anon จะได้ "verified 100%" เสมอ ไม่ว่าความจริงเป็นอย่างไร
--
-- ✅ SELECT ล้วน ไม่มีการเขียน ไม่ต้อง begin/rollback — รันได้เลยใน Supabase SQL editor

select
  count(*)                                                   as songs_total,
  count(*) filter (where verified is not true)                as unverified_all,
  count(*) filter (where verified is not true
                     and deleted_at is null)                  as unverified_live,   -- ← เลขที่จะโผล่ในชิป
  count(*) filter (where deleted_at is not null)              as in_trash
from public.songs;

-- "ยังไม่ตรวจ" มี 2 ความหมาย อย่าสับสนกัน:
--   ข้างบน = เพลงในคลังที่ approver ยังไม่กดตรวจ  (ชิปนี้ใช้อันนี้)
--   ข้างล่าง = ร่างที่คนส่งมารออนุมัติ            (คนละประตู)
select status, count(*) as drafts
from public.song_drafts
group by status
order by status;
