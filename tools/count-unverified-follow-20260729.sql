-- ตามต่อจาก count-unverified-20260729.sql — 3 คำถามที่ยังไม่มีคำตอบ
-- ✅ SELECT ล้วน ไม่มีการเขียน · รันได้เลย

-- 1) ผลของ query แรกที่ยังไม่ได้เห็น: ในตาราง songs มีเพลงที่ยังไม่ตรวจกี่เพลง
--    (ตัวเลขนี้คือสิ่งที่ชิป "ยังไม่ตรวจ" ที่เราสร้างไว้กรองอยู่)
select
  count(*)                                                  as songs_total,
  count(*) filter (where verified is not true)               as unverified_all,
  count(*) filter (where verified is not true
                     and deleted_at is null)                 as unverified_live,
  count(*) filter (where deleted_at is not null)             as in_trash
from public.songs;

-- 2) สิทธิ์ของแต่ละบัญชี — ตอบคำถาม "สิทธิผมเท่าพี่เปาไหม"
--    ('approver' = ตรวจ/เผยแพร่/ลบได้ · 'editor' = แก้+ส่งตรวจได้ แต่เผยแพร่ไม่ได้)
select p.role, u.email, p.display_name
from public.profiles p
join auth.users u on u.id = p.id
order by p.role, u.email;

-- 3) ร่าง 6 อันที่ status = 'pending' คืออะไร — นี่อาจเป็น "ยังไม่ตรวจ" ที่พี่เปาหมายถึง
select d.id, d.title_th, d.category, d.status, d.updated_at, u.email as author
from public.song_drafts d
left join auth.users u on u.id = d.author_id
where d.status = 'pending'
order by d.updated_at desc;
