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

-- Seed song #73 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * header key "B" != stored sounding key "D" (from chords; movable-do). Numbers still reference do; transpose uses "D". Verify tonic.
--   * system 1: no printed barlines — bars inferred by beat count (verify)
--   * system 2: no printed barlines — bars inferred by beat count (verify)
--   * system 3: repeat/volta markers [(432.48, '║')] — NEEDS manual repeat/volta
--   * system 4: no printed barlines — bars inferred by beat count (verify)
--   * system 5: no printed barlines — bars inferred by beat count (verify)
--   * system ร้อง1: 67 syllables vs 68 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 73, 'ข้ามีจิตใจเดียวเท่านั้น', null, $json${"version": 2, "key": "D", "timeSignature": "2/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "", "note": ".5_. .5_"}, {"type": "segment", "chord": "A", "note": "1_."}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "3_ 5_. 3_ 1"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "1_ 1_"}, {"type": "segment", "chord": "D", "note": "1_"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".6_ .6_ .6_ .6."}, {"type": "bar"}], [{"type": "segment", "chord": "", "note": "1_"}, {"type": "segment", "chord": "A", "note": "1."}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".5_ .5 1"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": ".7 -"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".7 .5_"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".5_"}, {"type": "segment", "chord": "A", "note": "1_. 1_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "2_ 1"}], [{"type": "segment", "chord": "", "note": "1_ .7_ .6_. .6_ .6_ .5_ .4 .3_ .4_ .5 .3 .2 .2 .1 - .1"}], [{"type": "segment", "chord": "", "note": ".1_. .1_"}, {"type": "segment", "chord": "A", "note": ".1_."}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".1_ .1_ .1_ .1"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".3_. .3_"}, {"type": "segment", "chord": "E", "note": ".2_."}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".4_ .3_ .2_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".1"}], [{"type": "segment", "chord": "", "note": ".3_. .3_ .2_."}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".2_ .2_ .2_ .3_"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": ".2_ .3_ .#4_ .5"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "- .5"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "-"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["ข้า", "มี", "จิต", "ใจ", "เดียว", "เท่า", "นั้น", "มุ่ง", "สู่", "ธง", "ชัย", "ด้วย", "บาก", "บั่น", "เพื่อ", "ได้", "บำ", "เหน็จ", "ราง", "วัล", "", "ลืม", "ทุก", "สิ่ง", "ไว้", "เบื้อง", "หลัง", "นั้น", "สรร", "-พ", "-สิ่ง", "ไร้", "ค่า", "สำ", "คัญ", "พระ", "คริสต์", "ทรง", "ประ", "เสริฐ", "นิ", "รันดร์", ".", "", "ทิ้ง", "ทุก", "สิ่ง", "เหมือน", "ดัง", "หยาก", "เยื่อ", "ตะ", "เกียก", "ตะ", "กาย", "ไป", "ทุก", "เมื่อ", "เพื่อ", "รู้", "จัก", "พระ", "คริสต์", "ผู้", "เป็น", "ขึ้น", "ที่", "ข้า", "เชื่อ", "", "", ""]}], "headerKey": "B"}$json$::jsonb, false, 'อาณาจักร', $refs$[{"book": "ล", "no": 155}]$refs$::jsonb, 'ฟป.1:19-21,3:8,10,13-14')
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
