-- ลบเพลงซ้ำที่พี่เปายืนยัน — 2026-07-27
-- รันใน Supabase SQL Editor  ·  ไฟล์นี้ "จบด้วย ROLLBACK" ตั้งใจให้ลองก่อน
-- ถ้าผลที่เห็นถูกต้องแล้ว → เปลี่ยนบรรทัดสุดท้ายเป็น COMMIT; แล้วรันใหม่
--
-- เป้าหมาย: ลบ e83c4309-78d4-4052-b0fd-57a8f25412b3  ("อันบน" ที่พี่เปาชี้)
-- ⚠️ คีย์สาธารณะมองไม่เห็นแถวนี้ (แต่พี่เปาเห็นบนเว็บ) → §0 มีไว้ตอบว่าทำไม ก่อนจะลบอะไร

begin;

-- ─────────────────────────────────────────────────────────────
-- §0  อ่านอย่างเดียว — ดูให้ชัดก่อนว่ามีอะไรอยู่จริง
--     (รันทั้งไฟล์แล้วอ่านผลทีละตาราง · ยังไม่มีอะไรถูกลบในขั้นนี้)
-- ─────────────────────────────────────────────────────────────

-- 0.1 สองเพลงที่พี่เปาส่งลิงก์มา ยังอยู่ไหม
select 'ที่พี่เปาส่งมา' as กลุ่ม, id, number, title_th, category, updated_at
from public.songs
where id in ('e83c4309-78d4-4052-b0fd-57a8f25412b3',
             '1970bac7-46fc-461a-b20b-7afbf1938f5c');

-- 0.2 ชื่อซ้ำในเล่มเดียวกันทั้งคลัง (ตอนนี้เหลือคู่ไหนบ้าง)
select 'ชื่อซ้ำในเล่มเดียวกัน' as กลุ่ม,
       category, title_th, count(*) as จำนวน,
       array_agg(id::text order by created_at) as ทุก_id
from public.songs
group by category, title_th
having count(*) > 1
order by category, title_th;

-- 0.3 เพลงในเล่มเด็กเล็กทั้งหมด (พี่เปาเทียบกับที่เห็นบนจอได้)
select 'เด็กเล็กทั้งเล่ม' as กลุ่ม, id, title_th, created_at, updated_at
from public.songs
where category = 'dek-lek'
order by title_th, created_at;

-- ─────────────────────────────────────────────────────────────
-- §1  สำรองก่อนลบ — เก็บทั้งแถวไว้เป็น JSON กู้คืนได้
--     (ระบบยังไม่มีถังขยะ ตารางนี้คือถังขยะชั่วคราว)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.songs_deleted_backup (
  id          uuid primary key,
  deleted_at  timestamptz not null default now(),
  deleted_by  text,
  reason      text,
  row_json    jsonb not null
);

insert into public.songs_deleted_backup (id, deleted_by, reason, row_json)
select s.id, 'P''Aim (พี่เปายืนยัน)', 'เพลงซ้ำในเล่มเด็กเล็ก 2026-07-27', to_jsonb(s)
from public.songs s
where s.id = 'e83c4309-78d4-4052-b0fd-57a8f25412b3'
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- §2  ลบ — ยาม 2 ชั้น
--     ชั้น 1: ต้องสำรองสำเร็จก่อน  ·  ชั้น 2: ต้องยังมีชื่อซ้ำเหลืออยู่จริง
--     (กันเคส "เผลอลบเพลงสุดท้ายที่เหลืออยู่ตัวเดียว")
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_id      uuid := 'e83c4309-78d4-4052-b0fd-57a8f25412b3';
  v_title   text;
  v_cat     text;
  v_same    int;
  v_backed  int;
begin
  select title_th, category into v_title, v_cat
  from public.songs where id = v_id;

  if v_title is null then
    raise exception E'หยุด: ไม่มีเพลง id นี้ในคลังแล้ว (%) — อาจถูกลบไปก่อนหน้านี้\nอ่านผล §0 ก่อนแล้วค่อยตัดสินใจใหม่', v_id;
  end if;

  select count(*) into v_backed
  from public.songs_deleted_backup where id = v_id;
  if v_backed <> 1 then
    raise exception 'หยุด: สำรองข้อมูลไม่สำเร็จ ยังไม่ลบอะไรทั้งนั้น';
  end if;

  select count(*) into v_same
  from public.songs
  where category is not distinct from v_cat and title_th = v_title;

  if v_same < 2 then
    raise exception E'หยุด: "%" ในเล่ม % เหลือแค่ % เพลง — ลบแล้วจะไม่เหลือเลย', v_title, v_cat, v_same;
  end if;

  delete from public.songs where id = v_id;
  raise notice 'ลบแล้ว: % (เล่ม %) — เหลืออีก % เพลงชื่อเดียวกัน', v_title, v_cat, v_same - 1;
end $$;

-- §3  ตรวจผลหลังลบ (ยังอยู่ในทรานแซกชัน ยังไม่จริงจนกว่าจะ COMMIT)
select 'หลังลบ' as กลุ่ม, category, title_th, count(*) as จำนวน
from public.songs
where category = 'dek-lek'
group by category, title_th
having count(*) > 1;

-- ─────────────────────────────────────────────────────────────
-- ⛔ จบด้วย ROLLBACK — ยังไม่มีอะไรเปลี่ยนจริง
--    พอใจผลแล้ว: เปลี่ยนบรรทัดล่างเป็น  commit;  แล้วรันไฟล์ใหม่ทั้งไฟล์
-- ─────────────────────────────────────────────────────────────
rollback;
