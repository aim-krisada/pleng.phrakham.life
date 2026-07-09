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

-- Seed song #50 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system 1: 21 syllables vs 22 attack notes
--   * system 2: 19 syllables vs 20 attack notes
--   * system 6: repeat/volta markers [(551.14, '║')] — NEEDS manual repeat/volta
--   * system 6: 21 syllables vs 20 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 50, 'ทรงนำเชลยกลับถิ่น', null, $json${"version": 2, "key": "F", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "", "note": ".5_ 1_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "5 5_ 6_ 5 4_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "5 5 0_ .5_ 1_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "5 5_ 6_ 5 4_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "4 4 0_"}]]}, {"id": "B", "lines": [[{"type": "segment", "chord": "", "note": ".5_ .7_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "4 4_ 5_ 4 3_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "4 4 0 5_ 4_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3_ 0_ 2_ 1_"}, {"type": "segment", "chord": "C", "note": "2_ 0_ 1_ .7_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 - - 0"}]]}, {"id": "C", "lines": [[{"type": "segment", "chord": "Bb", "note": ".6_ 1_ 1_ 2_ 1. .6_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": ".5 3 - 0"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": ".5_ 2_ 2_ 3_ 2. 1_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3 - - 0"}]]}, {"id": "D", "lines": [[{"type": "segment", "chord": "Bb", "note": ".6_ 1_ 1_ 2_ 1. .6_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": ".5 3 - 0"}, {"type": "bar"}, {"type": "segment", "chord": "Dm", "note": "1_ 1_ 1_ 2_"}, {"type": "segment", "chord": "G", "note": "3 2_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "2 - 0_"}]]}, {"id": "E", "lines": [[{"type": "segment", "chord": "", "note": ".5_ 1_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "5 5_ 6_ 5 4_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "5 5 0_ .5_ 1_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "5 5_ 6_ 5 4_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "4 - 0_"}]]}, {"id": "F", "lines": [[{"type": "segment", "chord": "", "note": ".5_ .7_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "4 4_ 5_ 4 3_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "4 4 0 5_ 4_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3_ 0_ 2_ 1_"}, {"type": "segment", "chord": "C", "note": "2_ 0_ 1_ .7_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 - 0_"}]]}], "arrangement": [{"stanza": "A", "label": "", "syllables": ["เมื่อ", "คราว", "พระ", "เจ้า", "นำ", "เชลย", "กลับ", "สู่", "ซี", "โอน", "เรา", "", "รู้", "สึก", "เหมือน", "นอน", "หลับ", "ฝัน", "อยู่", "ทุก", "ผู้", "คน", "", ""]}, {"stanza": "B", "label": "", "syllables": ["ปาก", "ข้า", "หัว", "เราะ", "ลิ้น", "ประ", "กอบ", "ขับ", "ร้อง", "เบิก", "บาน", "", "เพื่อ", "พวก", "เรา", "", "ทรง", "ทำ", "การ", "", "มโห", "ฬาร", "", "", "", ""]}, {"stanza": "C", "label": "", "syllables": ["ขอ", "โปรด", "นำ", "ให้", "เรา", "ยิ่ง", "กลับ", "มา", "", "", "ดุจ", "ลำ", "ธาร", "ทิศ", "ใต้", "ไหล", "บ่า", "", "", ""]}, {"stanza": "D", "label": "", "syllables": ["ดู", "เถิด", "คน", "ช", "รา", "ร้อง", "ขับ", "ขาน", "", "", "ฟัง", "เถิด", "อ", "-นุ", "ชน", "ร้อง", "ประ", "สาน", "", ""]}, {"stanza": "E", "label": "", "syllables": ["บัด", "นี้", "เรา", "ร่วม", "งาน", "ตราก", "ตรำ", "ร้อง", "รำ", "เปรม", "ปรีดิ์", "", "หว่าน", "ด้วย", "น้ำ", "ตา", "จะ", "เก็บ", "เกี่ยว", "ด้วย", "ยิน", "ดี", "", ""]}, {"stanza": "F", "label": "", "syllables": ["ฮา", "ลี", "-ลู", "ยา", "แบก", "ฟ่อน", "ข้าว", "กลับ", "ที่", "พัก", "ตน", "", "เทิด", "เกียรติ", "พระ", "", "ยะ", "โฮ", "วา", "", "ที่", "ซี", "โอ", "", ""]}]}$json$::jsonb, false, 'คริสตจักร', $refs$[{"book": "ล", "no": 60}, {"book": "บพส", "no": 126}]$refs$::jsonb, null)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
