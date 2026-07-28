-- ลบเพลงซ้ำ "หากใกล้ชิดพระองค์" — เก็บอันที่ ✓ตรวจแล้ว (พี่เปาสั่ง)
--   เก็บ  d9822ed6 (เล่ม dek-lek · verified · 1652 bytes = เพลงเต็มเดิม)
--   ลบ   360112a0 (เล่ม anuchon · ยังไม่ตรวจ · 199 bytes = ตัวซ้ำว่าง)
-- DRY RUN: จบด้วย rollback (ไม่เปลี่ยนอะไร) → อ่าน NOTICE → เปลี่ยน rollback ท้ายเป็น commit แล้วรันอีกที
begin;

create table if not exists public.songs_deleted_backup (
  id uuid, deleted_at timestamptz default now(), row jsonb
);

do $$
declare r public.songs%rowtype;
begin
  select * into r from public.songs where id = '360112a0-6040-4fdb-b9c7-3df6af11aa2a';
  if not found then raise exception 'ตัวที่จะลบไม่มีแล้ว — หยุด'; end if;
  if r.verified then raise exception 'ตัวที่จะลบเป็น verified — หยุด (กันลบผิดตัว)'; end if;
  if r.category <> 'anuchon' then raise exception 'เล่มไม่ตรง (%) — หยุด', r.category; end if;
  perform 1 from public.songs where id = 'd9822ed6-754c-4821-89ea-f9cd0727bf40' and verified;
  if not found then raise exception 'ตัวที่จะเก็บ (verified) หายไป — หยุด'; end if;
  raise notice 'OK: ลบ % (anuchon · ยังไม่ตรวจ) · เก็บ d9822ed6 (ตรวจแล้ว)', r.id;
end $$;

insert into public.songs_deleted_backup (id, row)
  select id, to_jsonb(s) from public.songs s where id = '360112a0-6040-4fdb-b9c7-3df6af11aa2a';

delete from public.songs where id = '360112a0-6040-4fdb-b9c7-3df6af11aa2a';

rollback;   -- ⬅️ เปลี่ยนเป็น  commit;  เมื่อพร้อมลบจริง
