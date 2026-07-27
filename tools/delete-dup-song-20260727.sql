-- ลบเพลงซ้ำ "พระเยซูทรงรักเด็กๆ" (เล่มเด็กเล็ก) — 2026-07-27
-- รันใน Supabase SQL Editor · ไฟล์นี้จบด้วย ROLLBACK ตั้งใจให้ลองก่อน
-- พอใจผลแล้ว → เปลี่ยนบรรทัดสุดท้ายเป็น commit;  แล้วรันใหม่ทั้งไฟล์
--
-- ══════════════════════════════════════════════════════════════
-- ⚠️ อ่านตรงนี้ก่อน — ผมตีความคำตอบพี่เปาแบบนี้ ถ้าผิดให้หยุดทันที
--    คำถามที่ส่งไป: "จะเก็บอันไหน — อันที่ 1 (bpm 104) หรือ อันที่ 2 (bpm 117)"
--    คำตอบที่ได้:   "ลบ 1"
--    ผมอ่านว่า:     ลบอันที่ 1 (357cc3c5… bpm 104)  →  เก็บอันที่ 2 (bc7d1664… bpm 117)
--    เหตุผลประกอบ:  bc7d1664 คืออันที่ถูกแก้ล่าสุด (26 ก.ค.) = งานล่าสุดของพี่เปา
--    ⛔ ถ้าพี่เปาหมายถึง "เก็บอันที่ 1" ห้ามรัน — บอกผม เดี๋ยวสลับให้
-- ══════════════════════════════════════════════════════════════
--
-- สรุปสิ่งที่จะเกิด:  ลบ 3 เหลือ 1
--   ลบ  1970bac7…  ดิบ ไม่มีคอร์ด ไม่เคยถูกแก้
--   ลบ  ecb7cd1e…  ดิบ ไม่มีคอร์ด ไม่เคยถูกแก้
--   ลบ  357cc3c5…  bpm 104 (พี่เปาสั่งลบ)
--   เก็บ bc7d1664…  bpm 117 · แก้ล่าสุด 26 ก.ค.  ← เหลืออันนี้อันเดียว

begin;

-- ─────────────────────────────────────────────
-- §0  อ่านอย่างเดียว — ดูก่อนว่าตรงกับที่เข้าใจไหม
-- ─────────────────────────────────────────────
select case id::text
         when 'bc7d1664-a70a-4239-bfd4-135857150c2b' then '✅ เก็บ'
         else '🗑 ลบ'
       end as จะทำอะไร,
       id, title_th, category, created_at, updated_at,
       content->>'bpm' as ความเร็ว
from public.songs
where category = 'dek-lek' and title_th = 'พระเยซูทรงรักเด็กๆ'
order by created_at;

-- เพลงอีกคู่ที่ยังค้างคำถาม (ยังไม่แตะ — แค่ดูว่าสถานะจริงเป็นยังไง)
select 'ยังไม่ตัดสิน' as หมายเหตุ, id, title_th, category, created_at, updated_at
from public.songs
where title_th like '%ดำรัส%' or id = 'e83c4309-78d4-4052-b0fd-57a8f25412b3'
order by created_at;

-- ─────────────────────────────────────────────
-- §1  สำรองทั้งแถวก่อนลบ (ระบบยังไม่มีถังขยะ — ตารางนี้ทำหน้าที่แทน)
-- ─────────────────────────────────────────────
create table if not exists public.songs_deleted_backup (
  id          uuid primary key,
  deleted_at  timestamptz not null default now(),
  deleted_by  text,
  reason      text,
  row_json    jsonb not null
);

insert into public.songs_deleted_backup (id, deleted_by, reason, row_json)
select s.id, 'P''Aim (พี่เปายืนยัน 27 ก.ค.)',
       'นำเข้าซ้ำ 4 อัน 25 ก.ค. — เก็บ bc7d1664 (bpm 117 แก้ล่าสุด)', to_jsonb(s)
from public.songs s
where s.id in ('1970bac7-46fc-461a-b20b-7afbf1938f5c',
               'ecb7cd1e-c346-449b-b2b6-a48dc115c418',
               '357cc3c5-e433-43bd-b552-87823387a31f')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- §2  ลบ — ยาม 3 ชั้น (ผิดชั้นไหนก็หยุดทั้งหมด ไม่ลบอะไรเลย)
-- ─────────────────────────────────────────────
do $$
declare
  v_kill  uuid[] := array['1970bac7-46fc-461a-b20b-7afbf1938f5c',
                          'ecb7cd1e-c346-449b-b2b6-a48dc115c418',
                          '357cc3c5-e433-43bd-b552-87823387a31f']::uuid[];
  v_keep  uuid   := 'bc7d1664-a70a-4239-bfd4-135857150c2b';
  v_found int;
  v_saved int;
  v_left  int;
begin
  -- ชั้น 1: อันที่จะเก็บต้องมีอยู่จริง (กันลบหมดเกลี้ยง)
  if not exists (select 1 from public.songs where id = v_keep) then
    raise exception 'หยุด: ไม่พบเพลงที่จะเก็บ (%) — ไม่ลบอะไรทั้งนั้น', v_keep;
  end if;

  -- ชั้น 2: อันที่จะลบต้องอยู่ครบทั้ง 3
  select count(*) into v_found from public.songs where id = any(v_kill);
  if v_found <> 3 then
    raise exception E'หยุด: เจอเพลงที่จะลบ % อัน ไม่ใช่ 3 — อาจมีคนลบไปก่อนแล้ว\nอ่านผล §0 แล้วบอก PM ก่อน', v_found;
  end if;

  -- ชั้น 3: ต้องสำรองครบทั้ง 3 ก่อน
  select count(*) into v_saved from public.songs_deleted_backup where id = any(v_kill);
  if v_saved <> 3 then
    raise exception 'หยุด: สำรองได้ % จาก 3 — ไม่ลบ', v_saved;
  end if;

  delete from public.songs where id = any(v_kill);

  select count(*) into v_left
  from public.songs where category = 'dek-lek' and title_th = 'พระเยซูทรงรักเด็กๆ';
  raise notice 'ลบ 3 แล้ว · เหลือ % เพลง (ควรเป็น 1)', v_left;
end $$;

-- §3  ผลหลังลบ (ยังไม่จริงจนกว่าจะ commit)
select 'หลังลบ' as กลุ่ม, id, title_th, content->>'bpm' as ความเร็ว, updated_at
from public.songs
where category = 'dek-lek' and title_th = 'พระเยซูทรงรักเด็กๆ';

-- ยังมีชื่อซ้ำในเล่มเดียวกันเหลืออีกไหมทั้งคลัง
select 'ชื่อซ้ำที่ยังเหลือ' as กลุ่ม, category, title_th, count(*) as จำนวน
from public.songs
group by category, title_th
having count(*) > 1
order by category, title_th;

-- ─────────────────────────────────────────────
-- ⛔ จบด้วย ROLLBACK — รันรอบแรกยังไม่มีอะไรเปลี่ยนจริง
--    ถูกต้องแล้ว: เปลี่ยนเป็น  commit;  แล้วรันใหม่ทั้งไฟล์
-- ─────────────────────────────────────────────
rollback;
