-- ลบเพลงซ้ำคู่สุดท้าย "พระดำรัสชิมหวานสักปานใด" (เล่มเด็กเล็ก) — 2026-07-27
-- รันใน Supabase SQL Editor · จบด้วย ROLLBACK ให้ลองก่อน
-- ถูกต้องแล้ว → เปลี่ยนบรรทัดสุดท้ายเป็น commit;  แล้วรันใหม่ทั้งไฟล์
--
-- พี่เปายืนยัน: "เก็บอันที่ส่งมา" = เก็บ 89355e79… (ลิงก์ที่ส่งให้เขาดู · bpm 92)
--   ✅ เก็บ  89355e79-e015-4f03-9885-cbb5bfc6bf2e  สร้าง 19 ก.ค. · bpm 92
--   🗑 ลบ   e83c4309-78d4-4052-b0fd-57a8f25412b3  สร้าง 20 ก.ค. · ไม่มี bpm
--
-- ⚠️ หมายเหตุ: แถวที่จะลบมี updated_at = 27 ก.ค. 13:02 (วันนี้) — เชื่อว่าเกิดจาก
--    autosave ของ /v2 ตอนพี่เปาเปิดดู ไม่ใช่การแก้จริง · §0.2 ด้านล่างเทียบเนื้อ
--    ทั้งสองแถวให้ดูก่อนลบ ถ้าเนื้อต่างกันมากผิดคาด ให้หยุดแล้วบอก PM

begin;

-- ─────────────────────────────────────────────
-- §0.1  อ่านอย่างเดียว — ยืนยันว่าเล็งถูกตัว
-- ─────────────────────────────────────────────
select case id::text
         when '89355e79-e015-4f03-9885-cbb5bfc6bf2e' then '✅ เก็บ'
         else '🗑 ลบ'
       end as จะทำอะไร,
       id, created_at, updated_at,
       content->>'bpm' as ความเร็ว,
       length(content::text) as ขนาดเนื้อ
from public.songs
where category = 'dek-lek' and title_th = 'พระดำรัสชิมหวานสักปานใด'
order by created_at;

-- §0.2  เนื้อสองแถวเหมือนกันไหม (เทียบทั้งก้อน ไม่ใช่แค่ต้น ๆ)
select (a.content = b.content)                      as เนื้อเหมือนกันเป๊ะ,
       (a.content - 'bpm' = b.content - 'bpm')      as เหมือนกันถ้าไม่นับความเร็ว,
       length(a.content::text) as ขนาด_ที่เก็บ,
       length(b.content::text) as ขนาด_ที่ลบ
from public.songs a, public.songs b
where a.id = '89355e79-e015-4f03-9885-cbb5bfc6bf2e'
  and b.id = 'e83c4309-78d4-4052-b0fd-57a8f25412b3';

-- ─────────────────────────────────────────────
-- §1  สำรองก่อนลบ (ตารางเดิมที่สร้างไว้รอบก่อน)
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
       'ซ้ำกับ 89355e79 — เก็บอันที่มี bpm 92 ตามที่พี่เปาเลือก', to_jsonb(s)
from public.songs s
where s.id = 'e83c4309-78d4-4052-b0fd-57a8f25412b3'
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- §2  ลบ — ยาม 3 ชั้น (ผิดชั้นไหนก็หยุด ไม่ลบอะไรเลย)
-- ─────────────────────────────────────────────
do $$
declare
  v_kill uuid := 'e83c4309-78d4-4052-b0fd-57a8f25412b3';
  v_keep uuid := '89355e79-e015-4f03-9885-cbb5bfc6bf2e';
  v_left int;
begin
  if not exists (select 1 from public.songs where id = v_keep) then
    raise exception 'หยุด: ไม่พบเพลงที่จะเก็บ (%) — ไม่ลบอะไรทั้งนั้น', v_keep;
  end if;

  if not exists (select 1 from public.songs where id = v_kill) then
    raise exception 'หยุด: ไม่พบเพลงที่จะลบ (%) — อาจถูกลบไปแล้ว', v_kill;
  end if;

  if not exists (select 1 from public.songs_deleted_backup where id = v_kill) then
    raise exception 'หยุด: สำรองไม่สำเร็จ — ไม่ลบ';
  end if;

  delete from public.songs where id = v_kill;

  select count(*) into v_left
  from public.songs where category = 'dek-lek' and title_th = 'พระดำรัสชิมหวานสักปานใด';
  raise notice 'ลบแล้ว · เหลือ % เพลง (ควรเป็น 1)', v_left;
end $$;

-- §3  ตรวจผล — ทั้งคลังควรไม่เหลือชื่อซ้ำในเล่มเดียวกันอีกเลย
select 'ชื่อซ้ำที่ยังเหลือทั้งคลัง' as กลุ่ม, category, title_th, count(*) as จำนวน
from public.songs
group by category, title_th
having count(*) > 1
order by category, title_th;
-- ↑ ถ้าไม่มีแถวเลย = เคลียร์ครบ · พร้อมรัน db/011 (ตัวกันชื่อซ้ำระดับฐานข้อมูล)

select 'ถังขยะสำรอง' as กลุ่ม, id, deleted_at, reason
from public.songs_deleted_backup
order by deleted_at;

-- ─────────────────────────────────────────────
-- ⛔ จบด้วย ROLLBACK — รอบแรกยังไม่เปลี่ยนอะไรจริง
-- ─────────────────────────────────────────────
rollback;
