-- สำรวจคลังเพลง — 29 ก.ค. 2026
-- ตอบ: ในฐานมีกี่เพลง · แต่ละเพลงเข้ามาทางไหน · ใครเป็นคนเริ่ม · สถานะคืออะไร
--
-- ✅ SELECT ล้วนทั้งไฟล์ ไม่มีการเขียน ไม่ต้อง begin/rollback — รันได้เลย
-- 📋 รัน 8 บล็อกนี้ทีเดียวได้ · ถ้าบล็อกไหน error ให้ก๊อป error มาด้วย (นั่นก็คือคำตอบอย่างหนึ่ง
--    ว่าคอลัมน์นั้นไม่มีจริง) แล้วรันบล็อกที่เหลือต่อ

-- ═══ 1. ตาราง songs มีคอลัมน์อะไรบ้าง (เลิกเดากันตลอดไป) ═══
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'songs'
order by ordinal_position;

-- ═══ 2. ตาราง song_revisions (สมุดบันทึกว่าใครทำอะไร) มีคอลัมน์อะไร ═══
--    ถ้าเห็น actor_name / event / hand = db/004 ติดตั้งแล้ว · ถ้าไม่เห็น = ยังไม่ติดตั้ง
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'song_revisions'
order by ordinal_position;

-- ═══ 3. นับรวม: มีกี่เพลง แบ่งตามว่ามีร่างผูกอยู่ไหม ═══
--    "มีร่างผูก"    = เดินผ่านด่านตรวจ (มีคนอ่านแน่นอน)
--    "ไม่มีร่างผูก" = ใส่เข้าตารางตรง ๆ / นำเข้าเป็นก้อน (ไม่มีหลักฐานว่าใครอ่าน)
select
  count(*)                                                        as เพลงทั้งหมด,
  count(*) filter (where d.song_id is not null)                    as มีร่างผูก,
  count(*) filter (where d.song_id is null)                        as ไม่มีร่างผูก,
  count(*) filter (where s.verified is true)                        as ธง_ตรวจแล้ว,
  count(*) filter (where s.verified is not true)                    as ธง_ยังไม่ตรวจ,
  count(*) filter (where s.deleted_at is not null)                  as อยู่ในถังขยะ
from public.songs s
left join (select distinct song_id from public.song_drafts where song_id is not null) d
       on d.song_id = s.id;

-- ═══ 4. แยกตามเล่ม + ต้นทาง ═══
select
  coalesce(s.category, '(ไม่มีเล่ม)')                              as เล่ม,
  count(*)                                                        as ทั้งหมด,
  count(*) filter (where d.song_id is not null)                    as มาจากร่าง,
  count(*) filter (where d.song_id is null)                        as ใส่ตรง_นำเข้า
from public.songs s
left join (select distinct song_id from public.song_drafts where song_id is not null) d
       on d.song_id = s.id
group by 1
order by 2 desc;

-- ═══ 5. ใครเป็นคนเริ่มแต่ละเพลง + เมื่อไหร่ (จากสมุดบันทึก) ═══
--    เอาแถวแรกสุดของแต่ละเพลง = จุดที่เพลงนั้นเกิด
with first_touch as (
  select
    coalesce(r.song_ref, r.song_id)                               as sid,
    min(r.created_at)                                             as first_at
  from public.song_revisions r
  group by 1
),
who as (
  select f.sid, f.first_at, r.actor_name, r.actor_role, coalesce(r.event, r.action) as ev
  from first_touch f
  join public.song_revisions r
    on coalesce(r.song_ref, r.song_id) = f.sid and r.created_at = f.first_at
)
select
  coalesce(w.actor_name, '(ไม่มีบันทึก)')                          as คนเริ่ม,
  w.actor_role                                                    as บทบาทตอนนั้น,
  w.ev                                                            as เหตุการณ์แรก,
  count(*)                                                        as จำนวนเพลง,
  min(w.first_at)::date                                           as ครั้งแรกสุด,
  max(w.first_at)::date                                           as ครั้งล่าสุด
from public.songs s
left join who w on w.sid = s.id
group by 1, 2, 3
order by 4 desc;

-- ═══ 6. จับก้อนนำเข้า: วันไหน ใครรัน กี่เพลง ═══
--    ถ้าเห็นวันเดียวมีหลายสิบเพลง = การนำเข้าเป็นก้อน 1 รอบ
with first_touch as (
  select coalesce(r.song_ref, r.song_id) as sid, min(r.created_at) as first_at
  from public.song_revisions r group by 1
)
select
  f.first_at::date                                                as วันที่,
  coalesce(r.actor_name, '(ไม่ทราบ)')                              as ใครรัน,
  count(*)                                                        as กี่เพลง
from first_touch f
join public.song_revisions r
  on coalesce(r.song_ref, r.song_id) = f.sid and r.created_at = f.first_at
join public.songs s on s.id = f.sid
group by 1, 2
having count(*) >= 5          -- เอาแค่ก้อนใหญ่ ตัดงานทีละเพลงออก
order by 1;

-- ═══ 7. สรุปต่อคน: ใครทำอะไรไปเท่าไร (คนหนึ่งคนมีเลขได้หลายคอลัมน์) ═══
select
  coalesce(u.email, '(ไม่ทราบ)')                                   as คน,
  p.role                                                          as สิทธิ์ที่ถืออยู่,
  count(*) filter (where d.status = 'draft')                       as ร่างที่ยังเขียนอยู่,
  count(*) filter (where d.status = 'pending')                     as ส่งตรวจ_รออยู่,
  count(*) filter (where d.status = 'approved')                    as ร่างที่ผ่านแล้ว,
  count(*) filter (where d.status = 'rejected')                    as ถูกส่งกลับแก้
from public.song_drafts d
left join auth.users u on u.id = d.author_id
left join public.profiles p on p.id = d.author_id
group by 1, 2
order by 3 desc, 4 desc;

-- ═══ 8. สิทธิ์ของทุกบัญชี + สมุดบันทึกครอบคลุมย้อนหลังถึงไหน ═══
select p.role as สิทธิ์, u.email as บัญชี, p.display_name as ชื่อที่แสดง
from public.profiles p join auth.users u on u.id = p.id
order by p.role, u.email;

select
  (select min(created_at)::date from public.song_revisions)         as บันทึกเริ่มจดตั้งแต่,
  (select min(created_at)::date from public.song_drafts)            as ร่างอันแรกสุด,
  (select count(*) from public.song_revisions)                      as จำนวนบันทึกทั้งหมด,
  (select count(distinct coalesce(song_ref, song_id))
     from public.song_revisions)                                    as เพลงที่มีบันทึก,
  (select count(*) from public.songs)                               as เพลงทั้งหมด;
