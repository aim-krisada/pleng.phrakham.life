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

-- Seed song #53 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system ร้อง1: 44 syllables vs 48 attack notes
--   * system ร้อง2: 53 syllables vs 48 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 53, 'ในเวลาของพระคริสต์', null, $json${"version": 2, "key": "D", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "D", "note": "1 3"}, {"type": "bar"}, {"type": "segment", "chord": "Em", "note": "2 - - -"}, {"type": "bar"}, {"type": "segment", "chord": "Em", "note": "2 -"}, {"type": "segment", "chord": "A", "note": ".7 2"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "1 - - -"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": "1 -"}], [{"type": "segment", "chord": "", "note": "3 5"}, {"type": "bar"}, {"type": "segment", "chord": "Em", "note": "4. 4_ 4 4"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "4. 4_ 4 6"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "5 - - -"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "5 -"}], [{"type": "segment", "chord": "", "note": "4 5"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "6 6 6 4_. 3_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "2 - 3 4"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "5 5 5 3_. 2_"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": "1 -"}], [{"type": "segment", "chord": "", "note": "2 3"}, {"type": "bar"}, {"type": "segment", "chord": "Em", "note": "4. 4_ 4 2_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".7 - .7 2"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "1 - - -"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "1 -"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["ใน", "เว", "ลา", "", "", "", "ของ", "", "พระ", "คริสต์", "ทรง", "", "", "", "ลิ", "", "ขิต", "ชี", "วิ", "ต", "ของ", "ข้า", "ตาม", "น้ำ", "พระ", "-ทัย", "ขอ", "", "", "", "โปรด", "", "ให้", "ข้า", "เรียน", "รู้", "ว่า", "ตราบ", "ที่", "ข้า", "", "เดิน", "ใน", "มร", "ร", "คา", "ดวง", "ชี", "วา", "", "อยู่", "ใน", "เว", "ลา", "ของ", "พระ", "องค์", ".", "", "", "", "", "", "", "", "", ""]}, {"stanza": "A", "label": "ร้อง 2", "syllables": ["ใน", "เว", "ลา", "", "", "", "(", "", "ใน", "เว", "ลา", "", "", "", ")", "", "ของ", "พระ", "องค์", "(", "ใน", "เว", "ลา", "พระ", "องค์", ")", "ทรง", "", "", "", "เฝ้า", "", "ดู", "ชี", "วิต", "ให้", "อยู่", "ใน", "น้ำ", "พระ", "", "ทัย", "โอ", "พระ", "องค์", "ข้า", "ขอ", "มอบ", "ใจ", "", "มอ", "บถ", "วาย", "ชี", "วิต", "ทั้ง", "กาย", "เพื่อ", "", "จะ", "ได้", "อยู่", "", "", "", "ใน", ""]}]}$json$::jsonb, false, 'ประสบการณ์', $refs$[]$refs$::jsonb, null)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
