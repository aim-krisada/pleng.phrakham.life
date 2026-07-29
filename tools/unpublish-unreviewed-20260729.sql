-- ถอนเพลงที่ "ไม่เคยผ่านตาผู้ตรวจ" ออกจากหน้าสาธารณะ — 29 ก.ค. 2026
--
-- มติพี่เอม: **ทุกเพลงต้องผ่านตาพี่เปา ไม่มีข้อยกเว้น รวมของที่นำเข้าเป็นก้อน**
-- ⇒ เพลงที่เผยแพร่อยู่แต่ไม่มีร่างผูก (= ไม่เคยเดินผ่านด่านอนุมัติ) ต้องหลุดจากหน้าสาธารณะ
--    คาดว่า 139 เพลง (จากการนับ 29 ก.ค.: 131 ผ่านด่าน + 139 ไม่ผ่าน + 3 + 52 = 325)
--
-- ⚠️ ไฟล์นี้ "เขียน" ข้อมูล ต่างจากไฟล์สำรวจก่อนหน้า:
--    1) รันครั้งแรกได้เลย — จบด้วย ROLLBACK ไม่มีอะไรเปลี่ยน แค่โชว์ว่าจะทำอะไร
--    2) อ่าน NOTICE + ตารางผลให้ครบ
--    3) พอใจแล้วเปลี่ยน  rollback;  ท้ายไฟล์เป็น  commit;  แล้วรันอีกครั้ง
--
-- ผลที่จะเกิด: คนทั่วไปเห็นเพลงเหลือ ~186 จาก 325 · ทีมที่ล็อกอินยังเห็นครบทุกเพลง
-- ถอยกลับได้: ดูคำสั่ง UNDO ท้ายไฟล์ (ใช้ตารางสำรองที่สร้างในนี้ ระบุ id เป๊ะทุกเพลง)

begin;

-- ── 1. ตารางสำรอง: จดไว้ว่าถอนเพลงไหนไป (ทำให้ UNDO แม่นเป๊ะ ไม่เดา) ──
create table if not exists public.songs_unpublished_20260729 (
  id           uuid primary key,
  number       int,
  title_th     text,
  category     text,
  unpublished_at timestamptz default now()
);

-- ── 2. ยาม: ถ้าจำนวนไม่ตรงกับที่นับไว้ ให้หยุด (กันข้อมูลเปลี่ยนไปแล้วเราไม่รู้) ──
do $$
declare
  n_target int;
  n_public_before int;
begin
  select count(*) into n_target
    from public.songs s
   where s.deleted_at is null
     and s.verified is true
     and not exists (select 1 from public.song_drafts d where d.song_id = s.id);

  select count(*) into n_public_before
    from public.songs where deleted_at is null and verified is true;

  raise notice 'ก่อนถอน: เพลงที่คนทั่วไปเห็น = % เพลง', n_public_before;
  raise notice 'จะถอน (เผยแพร่อยู่ แต่ไม่มีร่างผูก = ไม่เคยผ่านด่าน) = % เพลง', n_target;
  raise notice 'หลังถอน: คนทั่วไปจะเห็น = % เพลง', n_public_before - n_target;

  if n_target = 0 then
    raise exception 'ไม่มีเพลงเข้าเงื่อนไข — หยุด (ถอนไปแล้วหรือเงื่อนไขเปลี่ยน)';
  end if;
  if n_target > 200 then
    raise exception 'จะถอน % เพลง มากกว่าที่คาด (139) เกินไป — หยุด ให้ตรวจก่อน', n_target;
  end if;
end $$;

-- ── 3. จดลงตารางสำรองก่อนแตะของจริง ──
insert into public.songs_unpublished_20260729 (id, number, title_th, category)
select s.id, s.number, s.title_th, s.category
  from public.songs s
 where s.deleted_at is null
   and s.verified is true
   and not exists (select 1 from public.song_drafts d where d.song_id = s.id)
on conflict (id) do nothing;

-- ── 4. ถอนจากหน้าสาธารณะ (แตะคอลัมน์ verified อย่างเดียว เนื้อเพลง/โน้ตไม่ถูกแตะเลย) ──
--     หมายเหตุ: การ UPDATE นี้จะทำให้ trigger บันทึกประวัติ (db/004) จดเหตุการณ์
--     'edit_published' หนึ่งแถวต่อเพลง โดยผู้กระทำ = บัญชีที่รันคำสั่งนี้ — ตั้งใจให้เป็นเช่นนั้น
--     (db/004 ห้ามข้ามการบันทึกประวัติ) · ก้อนนี้ระบุตัวได้จากเวลาที่ตรงกัน
update public.songs s
   set verified = false
 where s.deleted_at is null
   and s.verified is true
   and not exists (select 1 from public.song_drafts d where d.song_id = s.id);

-- ── 5. ตรวจผลหลังทำ ──
select
  (select count(*) from public.songs where deleted_at is null and verified is true)      as คนทั่วไปเห็น,
  (select count(*) from public.songs where deleted_at is null and verified is not true)  as รอพี่เปาตรวจ,
  (select count(*) from public.songs_unpublished_20260729)                               as จดไว้ในตารางสำรอง;

-- ตัวอย่าง 10 เพลงแรกที่ถอน (ดูว่าหน้าตาถูกไหม)
select number, title_th, category
  from public.songs_unpublished_20260729
 order by number nulls last
 limit 10;

rollback;   -- ⬅️ เปลี่ยนเป็น  commit;  เมื่อพร้อมถอนจริง


-- ════════════════════════════════════════════════════════════════════
-- UNDO — ถ้าถอนแล้วอยากได้กลับขึ้นเว็บทั้งหมดเหมือนเดิม
-- (คืนเฉพาะเพลงที่ถอนไปในรอบนี้ ไม่กระทบเพลงอื่นที่ยังไม่ตรวจอยู่ก่อนแล้ว)
-- ════════════════════════════════════════════════════════════════════
-- begin;
--   update public.songs s
--      set verified = true
--     from public.songs_unpublished_20260729 b
--    where b.id = s.id and s.deleted_at is null;
--   select count(*) as คืนแล้ว from public.songs_unpublished_20260729;
-- rollback;   -- เปลี่ยนเป็น commit; เมื่อแน่ใจ
