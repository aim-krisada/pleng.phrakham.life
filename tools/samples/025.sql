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

-- Seed song #25 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system 2: repeat/volta markers [(439.1, ':')] — NEEDS manual repeat/volta
--   * system ร้อง1: 19 syllables vs 18 attack notes
--   * system รับ: 40 syllables vs 39 attack notes
--   * system ร้อง2: 91 syllables vs 18 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 25, 'จากดวงใจหลั่งไหลเสียงดนตรี', null, $json${"version": 2, "key": "D", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "D", "note": "1 -"}, {"type": "segment", "chord": "F#m", "note": "5 -"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": "1 - - 2_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "4 -"}, {"type": "segment", "chord": "D", "note": "3 -"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "2 - -"}], [{"type": "segment", "chord": "", "note": ".5"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": ".6 -"}, {"type": "segment", "chord": "A", "note": ".7 -"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": "1 -"}, {"type": "segment", "chord": "G", "note": "2 3 4"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "3 -"}, {"type": "segment", "chord": "A", "note": "2 -"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "1 - - -"}]]}, {"id": "B", "lines": [[{"type": "segment", "chord": "F#m", "note": "1_ 3_ 5_ 7_"}, {"type": "segment", "chord": "Bm", "note": "6 -"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "1_ 3_ 5_ 7_"}, {"type": "segment", "chord": "Bm", "note": "6 -"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "1_ 3_ 5_ 7_"}, {"type": "segment", "chord": "Bm", "note": "6 -"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "3_ 5 3_ 5 3"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "4 -"}, {"type": "segment", "chord": "A", "note": "- -"}], [{"type": "segment", "chord": "D", "note": "1 -"}, {"type": "segment", "chord": "F#m", "note": "5 -"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": "1 - - 2_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "4 -"}, {"type": "segment", "chord": "D", "note": "3 -"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "2 - -"}], [{"type": "segment", "chord": "", "note": ".5"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": ".6 -"}, {"type": "segment", "chord": "A", "note": ".7 -"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": "1 -"}, {"type": "segment", "chord": "G", "note": "2 3 4"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "3 -"}, {"type": "segment", "chord": "A", "note": "2 -"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "1 - - -"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["จาก", "", "ดวง", "", "ใจ", "", "", "หลั่ง", "ไหล", "เสียง", "", "ดน", "", "ตรี", "", "", "สู่", "สุด", "", "ที่", "", "รัก", "", "ผู้", "วาย", "พระ", "ชนม์", "", "ยอม", "", "พลี", "", "", ""]}, {"stanza": "B", "label": "รับ", "syllables": ["รับ", "สุข", "แสน", "สม", "บูรณ์", "", "ชี", "วิต", "จริง", "เพิ่ม", "พูน", "", "เปรม", "ปรีดิ์", "เปี่ยม", "อุ", "รา", "", "โอ", "ทรง", "ได้", "ดวง", "ใจ", "ข้า", "", "", "", "ได้", "", "ทั้ง", "", "ใจ", "", "", "และ", "ได้", "ทั้ง", "", "กา", "", "ยา", "", "", "พระ", "องค์", "", "ข้า", "", "ขอ", "", "มอบ", "ทั้ง", "หมด", "ทูล", "", "ถ", "", "วาย", "", "", ""]}, {"stanza": "A", "label": "ร้อง 2", "syllables": ["จาก", "", "วัน", "", "นั้น", "", "", "ที่", "ได้", "พบ", "", "พระ", "", "องค์", "", "", "ข้า", "ขอ", "", "จม", "", "ดิ่ง", "", "ใน", "ห้วง", "รัก", "ลึก", "", "พระ", "", "องค์", "", "", ""]}]}$json$::jsonb, false, 'รักปรารถนา', $refs$[{"book": "ล", "no": 194}, {"book": "ย", "no": 65}, {"book": "สอ", "no": 260}]$refs$::jsonb, null)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
