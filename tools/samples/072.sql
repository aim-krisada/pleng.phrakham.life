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

-- Seed song #72 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system 1: repeat/volta markers [(62.328, '║')] — NEEDS manual repeat/volta
--   * system 2: repeat/volta markers [(287.09, '║')] — NEEDS manual repeat/volta
--   * system 5: repeat/volta markers [(304.03, '║')] — NEEDS manual repeat/volta
--   * system ร้อง1: 77 syllables vs 84 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 72, 'รอคอยองค์พระเยซู', null, $json${"version": 2, "key": "C", "timeSignature": "2/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "", "note": "5_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "1_ 1_ 1_ 2_ 3_ 4_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5_ 5_ 5_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "6_ 6_ 6_. 5_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "6_. 5_ 6_ 7_ 1_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "3."}], [{"type": "segment", "chord": "", "note": "1_ 5_"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "1. 5_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "5. 2_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "1 0_"}], [{"type": "segment", "chord": "", "note": "5_ 6_ 7_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "1_ 3_ 2_. 1_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "6_ 1 6_"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "2. 6_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "2 0_ 5_ 6_ 7_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "1_ 3_ 2_. 1_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "6_ 7_ 1_."}], [{"type": "segment", "chord": "", "note": "6_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5_ 3_ 1_. 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "3_ 2 3_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "1. 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "2. 6_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5_ 3_ 1_. 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "2_"}, {"type": "segment", "chord": "C", "note": "1"}], [{"type": "segment", "chord": "", "note": "3_"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "1. 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "2. 6_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5_ 3_ 3_. 1_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "2_"}, {"type": "segment", "chord": "C", "note": "1"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["เรา", "จง", "บาก", "บั่น", "มุ่ง", "ไป", "ข้าง", "หน้า", "ละ", "ทิ้ง", "ของ", "หนัก", "ที่", "ถ่วง", "กา", "ยา", "เฝ้า", "รอ", "คอย", "เฝ้า", "รอ", "คอย", "เฝ้า", "รอ", "คอย", "เฝ้า", "รอ", "คอย", ".", "เพราะ", "พระ", "องค์", "", "ทรง", "นำ", "พา", "เรา", "บุก", "ไป", "บุก", "ไป", "ทรง", "ชนะ", "นั่ง", "เบื้อง", "ขวา", "", "พระ", "เจ้า", "จะ", "ทรง", "นำ", "เรา", "เข้า", "รา", "ศี", "รอ", "คอย", "รอ", "คอย", "เฝ้า", "รอ", "คอย", "องค์", "พระ", "เย", "ซู", "รอ", "คอย", "รอ", "คอย", "เฝ้า", "รอ", "คอย", "องค์", "พระ", "เย", "ซู", ".", "", "", "", "", "", "", ""]}]}$json$::jsonb, false, 'อาณาจักร', $refs$[{"book": "ล", "no": 189}]$refs$::jsonb, null)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
