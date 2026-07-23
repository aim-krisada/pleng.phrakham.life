-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ตรวจว่า "เลขเพลง / ธีม / ชื่ออังกฤษ" ที่หายไป เกิดจากบั๊ก หรือคนแก้เอง
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⛔ อ่านอย่างเดียวทั้งไฟล์ ไม่มีคำสั่งเขียน/แก้/ลบสักตัว — รันแล้วไม่มีอะไรเปลี่ยน
-- วิธีรัน: Supabase → SQL Editor → รัน **ทีละคำสั่ง** (วางอันเดียว กด Run แล้วค่อยอันถัดไป)
--          เพราะ SQL Editor แสดงผลลัพธ์ของคำสั่งสุดท้ายเท่านั้น
--
-- ทำไมถึงแยกออกว่าอันไหนบั๊ก อันไหนคนแก้:
--   ตอนกดปุ่ม "อนุมัติและเผยแพร่" ระบบเขียนประวัติ 2 แถวพร้อมกันโดยผูก `op_group` เดียวกัน
--   (แถวฝั่งร่าง = approve_publish · แถวฝั่งเพลง = edit_published)
--   ส่วนการแก้เพลงตรงๆ ในหน้าแก้ เขียนแถวเดียว ไม่มีคู่
--   → A: แถวที่ค่าหาย **มีคู่ฝั่งร่างผูก op_group เดียวกัน** = มาจากปุ่มอนุมัติ = บั๊กตัวนี้
--     B: ไม่มีคู่ แต่ **มีชื่อผู้กด** (`actor_name`) = คนแก้เพลงตรงๆ (พี่เปาอาจตั้งใจลบ)
--        → ห้ามเหมาว่าเป็นบั๊ก · การแก้ตรงๆ ไม่ผ่าน RPC จึงไม่มี op_group เหมือนกัน
--          ตัวแยกจริงคือ "มีคู่ฝั่งร่างไหม" ไม่ใช่ "op_group ว่างไหม"
--     C: ไม่มีคู่ และ **ไม่มีชื่อผู้กด** = แถวเก่าก่อน db/004 (ตอนนั้นไม่ได้บันทึกชื่อไว้)
--        → **บอกไม่ได้** ต้องไม่นับรวมกับสองกองบน
--
-- ⚠️ ชื่อคอลัมน์คือ `before` / `after` (ไม่ใช่ old_row / new_row — นั่นคือรูปแบบก่อน db/004
--    ซึ่ง db/004 ย้ายข้อมูลเข้ามาให้แล้ว ประวัติเก่าจึงค้นได้ครบเหมือนกัน)

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- คำสั่งที่ 1 — สรุปคำตอบ (รันอันนี้ก่อน)
-- ตอบ: เกิดกี่ครั้ง · กี่เพลง · ฟิลด์ไหน · ครั้งแรก/ครั้งสุดท้ายเมื่อไหร่ ·
--       ก่อน/หลัง 20 ก.ค. (วันที่ B108 ฝั่งแอปขึ้น live) · 24 ชม.ล่าสุดยังเกิดอยู่ไหม
-- ═══════════════════════════════════════════════════════════════════════════════════════
with ev as (
  select r.id, r.created_at, r.song_ref, r.actor_name, r.op_group,
         nullif(r.before->>'number', '')   as was_number,
         nullif(r.after ->>'number', '')   as now_number,
         nullif(r.before->>'theme', '')    as was_theme,
         nullif(r.after ->>'theme', '')    as now_theme,
         nullif(r.before->>'title_en', '') as was_title_en,
         nullif(r.after ->>'title_en', '') as now_title_en
  from public.song_revisions r
  where r.entity = 'song' and r.before is not null and r.after is not null
),
wiped as (
  select e.*,
    (e.was_number   is not null and e.now_number   is null) as lost_number,
    (e.was_theme    is not null and e.now_theme    is null) as lost_theme,
    (e.was_title_en is not null and e.now_title_en is null) as lost_title_en,
    case
      when e.op_group is not null and exists (
        select 1 from public.song_revisions g
        where g.op_group = e.op_group and g.entity = 'draft' and g.event = 'approve_publish'
      ) then 'A. บั๊ก — มาจากปุ่มอนุมัติ'
      when e.actor_name is not null then 'B. คนแก้เอง — แก้เพลงตรงๆ'
      else 'C. บอกไม่ได้ (แถวเก่าก่อน db/004 ไม่มีชื่อผู้กด)'
    end as cause
  from ev e
  where (e.was_number   is not null and e.now_number   is null)
     or (e.was_theme    is not null and e.now_theme    is null)
     or (e.was_title_en is not null and e.now_title_en is null)
)
select
  cause,
  count(*)                                                   as ครั้ง,
  count(distinct song_ref)                                   as เพลง,
  count(*) filter (where lost_number)                        as เลขเพลงหาย,
  count(*) filter (where lost_theme)                         as ธีมหาย,
  count(*) filter (where lost_title_en)                      as ชื่ออังกฤษหาย,
  min(created_at)                                            as ครั้งแรก,
  max(created_at)                                            as ครั้งล่าสุด,
  count(*) filter (where created_at <  date '2026-07-20')    as ก่อน_20ก_ค,
  count(*) filter (where created_at >= date '2026-07-20')    as ตั้งแต่_20ก_ค,
  count(*) filter (where created_at >= now() - interval '24 hours') as ใน_24ชม_ล่าสุด
from wiped
group by cause
order by 2 desc;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- คำสั่งที่ 2 — รายชื่อเพลงที่ยังเสียอยู่ + ค่าเดิมที่กู้ได้ (รันต่อจากอันแรก)
-- "ยังเสียอยู่" = ค่าที่หายไปตอนนั้น วันนี้ยังว่างอยู่ (ถ้ามีคนกรอกกลับไปแล้วจะไม่ขึ้น)
-- คอลัมน์ ค่าเดิม_* คือค่าที่กู้ได้ → ถ้าไม่ว่าง แปลว่าซ่อมได้โดยไม่ต้องเดา
-- ═══════════════════════════════════════════════════════════════════════════════════════
with ev as (
  select r.id, r.created_at, r.song_ref, r.actor_name, r.op_group,
         nullif(r.before->>'number', '')   as was_number,
         nullif(r.after ->>'number', '')   as now_number,
         nullif(r.before->>'theme', '')    as was_theme,
         nullif(r.after ->>'theme', '')    as now_theme,
         nullif(r.before->>'title_en', '') as was_title_en,
         nullif(r.after ->>'title_en', '') as now_title_en
  from public.song_revisions r
  where r.entity = 'song' and r.before is not null and r.after is not null
),
wiped as (
  select e.*,
    (e.was_number   is not null and e.now_number   is null) as lost_number,
    (e.was_theme    is not null and e.now_theme    is null) as lost_theme,
    (e.was_title_en is not null and e.now_title_en is null) as lost_title_en,
    case
      when e.op_group is not null and exists (
        select 1 from public.song_revisions g
        where g.op_group = e.op_group and g.entity = 'draft' and g.event = 'approve_publish'
      ) then 'A. บั๊ก (ปุ่มอนุมัติ)'
      when e.actor_name is not null then 'B. คนแก้เอง'
      else 'C. บอกไม่ได้'
    end as cause
  from ev e
  where (e.was_number   is not null and e.now_number   is null)
     or (e.was_theme    is not null and e.now_theme    is null)
     or (e.was_title_en is not null and e.now_title_en is null)
)
select
  s.title_th                                              as เพลง,
  w.cause                                                 as สาเหตุ,
  to_char(w.created_at, 'YYYY-MM-DD HH24:MI')             as เมื่อ,
  coalesce(w.actor_name, '(ไม่ทราบ)')                      as ใครกด,
  case when w.lost_number   then w.was_number   end       as ค่าเดิม_เลขเพลง,
  case when w.lost_theme    then w.was_theme    end       as ค่าเดิม_ธีม,
  case when w.lost_title_en then w.was_title_en end       as ค่าเดิม_ชื่ออังกฤษ,
  s.number                                                as ตอนนี้_เลขเพลง,
  s.theme                                                 as ตอนนี้_ธีม,
  s.title_en                                              as ตอนนี้_ชื่ออังกฤษ
from wiped w
join public.songs s on s.id = w.song_ref
where (w.lost_number   and s.number   is null)
   or (w.lost_theme    and (s.theme    is null or s.theme    = ''))
   or (w.lost_title_en and (s.title_en is null or s.title_en = ''))
order by w.created_at desc;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- คำสั่งที่ 3 — เพลงใหม่ที่เผยแพร่ครั้งแรกแล้วค่าจากร่างไม่ติดไปด้วย (เส้น INSERT)
-- อันนี้ไม่ใช่ "ค่าถูกลบ" แต่เป็น "ค่าไม่เคยถูกพาไป" จึงไม่ขึ้นในคำสั่งที่ 1
-- (ร่างเพิ่งมีคอลัมน์หมวด/ธีมตอน db/010 เพลงเก่ากว่านั้นจะไม่มีอะไรให้เทียบ = ปกติ)
-- ═══════════════════════════════════════════════════════════════════════════════════════
select
  coalesce(sg.after->>'title_th', '(ไม่ทราบชื่อ)')          as เพลง,
  to_char(sg.created_at, 'YYYY-MM-DD HH24:MI')             as เผยแพร่เมื่อ,
  dr.after->>'number'   as ร่างมี_เลขเพลง,  sg.after->>'number'   as เพลงได้_เลขเพลง,
  dr.after->>'theme'    as ร่างมี_ธีม,      sg.after->>'theme'    as เพลงได้_ธีม,
  dr.after->>'title_en' as ร่างมี_ชื่ออังกฤษ, sg.after->>'title_en' as เพลงได้_ชื่ออังกฤษ
from public.song_revisions sg
join public.song_revisions dr
  on dr.op_group = sg.op_group and dr.entity = 'draft' and dr.event = 'approve_publish'
where sg.entity = 'song' and sg.event = 'approve_publish' and sg.op_group is not null
  and (
       (nullif(dr.after->>'number','')   is not null and nullif(sg.after->>'number','')   is null)
    or (nullif(dr.after->>'theme','')    is not null and nullif(sg.after->>'theme','')    is null)
    or (nullif(dr.after->>'title_en','') is not null and nullif(sg.after->>'title_en','') is null)
  )
order by sg.created_at desc;
