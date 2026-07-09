-- --- schema prep (idempotent) ------------------------------------------
-- category = key code (frontend maps 'anuchon' -> 'อนุชน'); number is unique
-- PER category, so (category, number) is the real key (เลข 1 อนุชน != เลข 1 ยุวชน).
alter table public.songs add column if not exists category text not null default 'anuchon';
alter table public.songs add column if not exists verified boolean not null default false;
-- split-out title metadata (P'Aim 9-Jul): title_th is now the clean title;
-- theme = 1 of 8 topics (layer-2 sub-category); book_refs = cross-refs to other
-- hymnals [{book: <thai code>, no: N}]; scripture = a bible reference or null.
alter table public.songs add column if not exists theme text;
alter table public.songs add column if not exists book_refs jsonb not null default '[]'::jsonb;
alter table public.songs add column if not exists scripture text;
-- drop the old single-column unique on (number) so (category, number) can coexist:
do $$
declare c text;
begin
  select con.conname into c from pg_constraint con
  join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any(con.conkey)
  where con.conrelid = 'public.songs'::regclass and con.contype = 'u'
    and array_length(con.conkey, 1) = 1 and a.attname = 'number';
  if c is not null then execute format('alter table public.songs drop constraint %I', c); end if;
end $$;
create unique index if not exists songs_category_number_key
  on public.songs (category, number);
-- ------------------------------------------------------------------------

-- Seed song #61 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * header key "D" != stored sounding key "C" (from chords; movable-do). Numbers still reference do; transpose uses "C". Verify tonic.
--   * system ร้อง1: 40 syllables vs 43 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 61, 'ไม่ย่อท้อ', null, $json${"version": 2, "key": "C", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "C", "note": "1_. 2_ 3_ 2_ 1_ .6_ 1_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "1 0 0 0"}], [{"type": "segment", "chord": "C", "note": "5_. 6_ 1_ 6_ 5_ 3_ 5_ 6_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5 0 0 0"}], [{"type": "segment", "chord": "F", "note": "1_. 1_ 6_ 5_"}, {"type": "segment", "chord": "G", "note": "6_ 5_ 0"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "3_. 5_ 3_ 2_"}, {"type": "segment", "chord": "Am", "note": "3_ 1_ 0"}], [{"type": "segment", "chord": "Dm", "note": "1_. 2_ 3_ 2_"}, {"type": "segment", "chord": "F/G", "note": "1_ .6_ 1_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "1 0 0 0 1 5_. 5_ 1 0"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["ดื่ม", "กิน", "พระ", "คำ", "พระ", "องค์", "ไม่", "ท้อ", "ใจ", "", "", "", "ชื่น", "ชม", "อา", "เมน", "ใช่", "เป็น", "การ", "ฝืน", "ใจ", "", "", "", "พระ", "คำ", "ชุ่ม", "ฉ่ำ", "ภาย", "ใน", "", "วน", "จน", "สุข", "ใน", "ร่าง", "กาย", "", "มาตร", "แม้น", "เว", "ลา", "หา", "ยาก", "สัก", "เพียง", "ใด", "", "", "", ".", "", "", "", ""]}], "headerKey": "D"}$json$::jsonb, false, 'ประสบการณ์', $refs$[{"book": "ล", "no": 87}]$refs$::jsonb, null)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
