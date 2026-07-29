-- สืบปม "3 เพลงที่ผ่านด่านแล้วแต่ไม่อยู่บนหน้าสาธารณะ" — 29 ก.ค. 2026
--
-- ✅ SELECT ล้วนทั้งไฟล์ · ไม่มี begin/update/insert · รันได้เลย ไม่เปลี่ยนอะไรแม้แต่แถวเดียว
--
-- ⭐ บล็อก 1 สำคัญที่สุด — มันตรวจว่า "เกณฑ์" ที่เราใช้ตัดสินใจทั้งวันถูกหรือผิด
--    เกณฑ์ที่ใช้: "เพลงที่มีร่างผูกอยู่ = เคยผ่านสายตาคน"
--    ที่น่าสงสัย: ถ้ามีคนส่งร่างมา*แก้*เพลงที่ถูกใส่ตรงเข้าตาราง เพลงนั้นก็จะ "มีร่างผูก"
--    ทั้งที่ไม่เคยมีใครอ่านตอนแรก ⇒ เลข 139 ที่จะถอนอาจไม่ใช่ตัวเลขที่ถูก


-- ═══ 1. ⭐ ทดสอบเกณฑ์: แยก "มีร่างที่ผ่านการอนุมัติ" ออกจาก "มีร่างแต่ไม่เคยอนุมัติ" ═══
--    ถ้าช่อง "มีร่าง แต่ไม่มีร่างไหนถูกอนุมัติ" มีตัวเลข > 0  ⇒ เกณฑ์เดิมของ PM ผิด
--    ตัวเลขที่ควรใช้ถอนจริงคือ "ไม่เคยมีร่างที่อนุมัติ" ทั้งหมด ไม่ใช่แค่ "ไม่มีร่างเลย"
select
  case when s.verified is true then 'อยู่บนหน้าสาธารณะ' else 'ไม่อยู่บนหน้าสาธารณะ' end as สถานะเผยแพร่,
  case
    when exists (select 1 from public.song_drafts d
                  where d.song_id = s.id and d.status = 'approved')
      then 'มีร่างที่ถูกอนุมัติ (ผ่านด่านจริง)'
    when exists (select 1 from public.song_drafts d
                  where d.song_id = s.id)
      then 'มีร่าง แต่ไม่มีร่างไหนถูกอนุมัติ'   -- ← ถ้ามีเลขที่นี่ เกณฑ์เดิมผิด
    else 'ไม่มีร่างเลย (ใส่ตรง/นำเข้า)'
  end as ต้นทาง,
  count(*) as จำนวนเพลง
from public.songs s
where s.deleted_at is null
group by 1, 2
order by 1, 3 desc;


-- ═══ 2. 3 เพลงนั้นคือเพลงอะไร + ร่างที่ผูกอยู่มีสถานะอะไร ═══
select
  s.number                                        as เลขเพลง,
  s.title_th                                      as ชื่อเพลง,
  coalesce(s.category, '(ไม่มีเล่ม)')              as เล่ม,
  s.verified                                      as ธงเผยแพร่,
  d.status                                        as สถานะร่าง,
  d.created_at                                    as ร่างสร้างเมื่อ,
  d.updated_at                                    as ร่างแก้ล่าสุด,
  u.email                                         as คนเขียนร่าง
from public.songs s
join public.song_drafts d on d.song_id = s.id
left join auth.users u on u.id = d.author_id
where s.deleted_at is null
  and s.verified is not true
order by s.number nulls last, d.created_at;


-- ═══ 3. ไทม์ไลน์ของ 3 เพลงนั้น — ธงเผยแพร่เปลี่ยนจากอะไรเป็นอะไร ใครทำ เมื่อไหร่ ═══
--    หมายเหตุ: สมุดบันทึกเริ่มจดตั้งแต่ 5 ก.ค. 2026 — อะไรที่เกิดก่อนนั้นจะไม่ปรากฏที่นี่
with target as (
  select s.id
  from public.songs s
  where s.deleted_at is null
    and s.verified is not true
    and exists (select 1 from public.song_drafts d where d.song_id = s.id)
)
select
  r.created_at                                    as เมื่อ,
  coalesce(r.event, r.action)                     as เหตุการณ์,
  r.entity                                        as กระทำกับ,
  r.hand                                          as ฝ่าย,
  coalesce(r.actor_name, '(ไม่มีชื่อ)')            as ใครทำ,
  r.actor_role                                    as บทบาทตอนนั้น,
  (r.before -> 'verified')                        as ธงก่อน,
  (r.after  -> 'verified')                        as ธงหลัง,
  (r.before -> 'title_th')                        as ชื่อก่อน,
  r.note                                          as หมายเหตุ
from public.song_revisions r
join target t on t.id = coalesce(r.song_ref, r.song_id)
order by coalesce(r.song_ref, r.song_id), r.created_at;
