-- ============================================================================
-- song-import-template.sql — the ONE safe shape for putting a song into
-- public.songs by hand (Supabase SQL Editor). Copy this file per song.
--
-- Run by P'Aim / an approver. Claude does NOT run this.
--
-- ⛔ NEVER use `on conflict (number) do update set … content = excluded.content`.
--    That overwrites whatever is already in that slot — including work พี่เปา
--    already did — silently, with no undo. This template exists so that cannot
--    happen by accident.
--
-- THE RULE: adding a song NEVER overwrites. If the slot (เล่ม + เลขเพลง) is
-- already taken by something that is not exactly what you are importing, this
-- refuses, names the song sitting there, and writes nothing at all.
-- Overwriting is a separate, deliberate act: tools/song-overwrite-template.sql
--
-- Fill in: <CATEGORY> <NUMBER> <TITLE_TH> <TITLE_EN> <CONTENT JSON>
-- ============================================================================


-- ---------------------------------------------------------------------------
-- STEP 1 · LOOK FIRST (read-only — safe to run any time, changes nothing)
--   0 rows  = the slot is free. Go to step 2.
--   Any row = a real song lives there, and someone may have edited it. Read it.
--             Note that it searches EVERY เล่ม: if `number` is unique across the
--             whole table, a song with the same number in another เล่ม will make
--             step 2 fail too, and this is where you find that out.
-- ---------------------------------------------------------------------------
select
  case when s.category is not distinct from '<CATEGORY>'
       then 'ช่องนี้มีเพลงอยู่แล้ว'
       else 'เลขนี้ถูกใช้ในเล่มอื่น' end                    as สถานะ,
  s.category                                                as เล่ม,
  s.number                                                  as เลข,
  s.title_th                                                as ชื่อเดิม,
  s.title_en                                                as ชื่ออังกฤษเดิม,
  s.verified                                                as ตรวจแล้ว,
  s.updated_at                                              as แก้ล่าสุด,
  md5(coalesce(s.title_th, '') || '␟' ||
      coalesce(s.title_en, '') || '␟' || s.content::text)    as ลายนิ้วมือแถวเดิม
from public.songs s
where s.number = <NUMBER>;


-- ---------------------------------------------------------------------------
-- STEP 2 · ADD THE SONG — can only ADD, never overwrite. All-or-nothing.
--
--   ✅ เข้าใหม่             — the slot was free; the song is now in.
--   ⏩ มีอยู่แล้ว (เหมือนกัน) — the identical song is already there; nothing to do
--                            (so re-running the same import is harmless).
--   ⛔ เลขชน               — a DIFFERENT song holds that slot. The whole thing
--                            is rolled back — NOTHING was written — and the error
--                            names every clashing เลข + ชื่อเดิม.
-- ---------------------------------------------------------------------------
begin;

with incoming (category, number, title_th, title_en, content) as (
  values
    -- one row per song — add more lines to import several at once
    ('<CATEGORY>', <NUMBER>, '<TITLE_TH>', <TITLE_EN>::text,
     $json$<CONTENT JSON on one line>$json$::jsonb)
),
existing as (
  select i.number, i.title_th as ชื่อใหม่,
         s.title_th as ชื่อเดิม, s.updated_at,
         -- value comparison (`is not distinct from`), NOT the md5 above: jsonb
         -- compares by value, so a re-run is recognised as identical.
         (s.title_th is not distinct from i.title_th
          and s.title_en is not distinct from i.title_en
          and s.content  is not distinct from i.content) as เหมือนกันทุกอย่าง
  from incoming i
  join public.songs s
    on s.category is not distinct from i.category and s.number = i.number
),
inserted as (
  insert into public.songs
    (category, number, title_th, title_en, content, verified, review_flags)
  select i.category, i.number, i.title_th, i.title_en, i.content,
         false, '["unverified-import"]'::jsonb
  from incoming i
  where not exists (
    select 1 from public.songs s
     where s.category is not distinct from i.category and s.number = i.number
  )
  returning number, title_th
)
select '✅ เข้าใหม่' as ผล, number as เลข, title_th as ชื่อ, ''::text as หมายเหตุ
  from inserted
union all
select case when เหมือนกันทุกอย่าง then '⏩ มีอยู่แล้ว (เหมือนกัน)' else '⛔ เลขชน — ไม่ได้เขียนทับ' end,
       number, ชื่อเดิม,
       case when เหมือนกันทุกอย่าง then 'ไม่ต้องทำอะไร'
            else 'ของที่จะนำเข้าชื่อ "' || ชื่อใหม่ || '" · แถวเดิมแก้ล่าสุด ' || updated_at end
  from existing
order by 1, 2;

-- The alarm. If any slot holds a DIFFERENT song this raises, and because we are
-- inside begin/commit the whole import is undone — nothing half-imported to
-- untangle. Fix the เลขเพลง (or use the overwrite template on purpose) and re-run.
do $$
declare msg text;
begin
  select string_agg(format('เลข %s = "%s"', s.number, s.title_th), ' · ')
    into msg
    from (values
      ('<CATEGORY>', <NUMBER>, '<TITLE_TH>', <TITLE_EN>::text,
       $json$<CONTENT JSON on one line>$json$::jsonb)
    ) as i(category, number, title_th, title_en, content)
    join public.songs s
      on s.category is not distinct from i.category and s.number = i.number
   where s.title_th is distinct from i.title_th
      or s.title_en is distinct from i.title_en
      or s.content  is distinct from i.content;

  if msg is not null then
    raise exception '⛔ เลขเพลงชนกับเพลงที่มีอยู่ — ไม่ได้เขียนอะไรลงฐานข้อมูลเลย: % · อ่าน "ถ้าเจอเลขชนต้องทำยังไง" ใน docs/importing-songs.md', msg;
  end if;
end $$;

commit;
