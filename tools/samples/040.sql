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

-- Seed song #40 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system 1: repeat/volta markers [(45.384, '║'), (519.79, '║')] — NEEDS manual repeat/volta
--   * system 2: repeat/volta markers [(45.384, '║'), (277.73, '║')] — NEEDS manual repeat/volta
--   * system 3: repeat/volta markers [(273.77, '║')] — NEEDS manual repeat/volta
--   * system ร้อง1: 43 syllables vs 51 attack notes
--   * system ร้อง2: 78 syllables vs 51 attack notes
--   * system ร้อง3: 83 syllables vs 51 attack notes
--   * system ร้อง4: 80 syllables vs 51 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 40, 'การสรรเสริญของคริสตจักร', null, $json${"version": 2, "key": "D", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "Dm", "note": ".6_ .7_ 1_ 2_ 3 3"}, {"type": "bar"}, {"type": "segment", "chord": "Gm", "note": "4_ 3_ 4_ 6_"}, {"type": "segment", "chord": "Dm", "note": "3 -"}, {"type": "bar"}, {"type": "segment", "chord": "Gm", "note": "2 2_ 3_"}, {"type": "segment", "chord": "Dm", "note": "1 1"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".7_ .6_ .7_ 1_"}, {"type": "segment", "chord": "Dm", "note": ".6 -"}], [{"type": "segment", "chord": "Bb", "note": "6 6_ 6_"}, {"type": "segment", "chord": "Gm", "note": "6 6"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5_ 6_ 5_ 4_"}, {"type": "segment", "chord": "F", "note": "3 -"}, {"type": "bar"}, {"type": "segment", "chord": "Gm", "note": "2 2_ 3_"}, {"type": "segment", "chord": "Dm", "note": "1 1"}, {"type": "bar"}, {"type": "segment", "chord": "Gm", "note": "2_ 3_"}, {"type": "segment", "chord": "C", "note": "4_ 6_"}, {"type": "segment", "chord": "F", "note": "3 -"}], [{"type": "segment", "chord": "Gm", "note": "2 2_ 3_"}, {"type": "segment", "chord": "Dm", "note": "1 1"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".7_ .6_ .7_ 1_"}, {"type": "segment", "chord": "Dm", "note": ".6 -"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["ไย", "เรา", "จึง", "ไม่", "ร่วม", "ร้อง", "สรร", "เสริญ", "แด่", "พระ", "เจ้า", "", "เรา", "รับ", "พระ", "คุณ", "อยู่", "พร้อม", "เพรียง", "บน", "ภู", "เขา", "", "ชี", "วิต", "ใน", "คริส", "ต", "จักร", "เที่ยง", "แท้", "และ", "อุ", "", "ดม", "เรา", "โลด", "เต้น", "รื่น", "รมย์", "ใจ", "ชื่น", "ชม", "ยิน", "", "ดี", ".", "", "", "", "", "", "", "", "", ""]}, {"stanza": "A", "label": "ร้อง 2", "syllables": ["ทรง", "ประ", "ทับ", "บน", "สวรรค์", "เท่า", "เทียม", "กับ", "พระ", "เจ้า", "มา", "", "เป็น", "บุตร", "มนุษย์", "ทร", "มาน", "เพื่อ", "เรา", "ทรง", "เป็น", "ขึ้น", "", "จาก", "ตาย", "นั่ง", "บัล", "ลังก์", "เป็น", "กษัต", "ริย์", "ความ", "อุ", "", "ดม", "เป็น", "ขึ้น", "เรา", "ลิ้ม", "รส", "สัม", "ผัส", "สรร", "เสริญ", "", "องค์", "สม", "บูรณ์", "เติม", "เต็ม", "สาร", "พัน", "เรา", "เป็น", "ที่", ""]}, {"stanza": "A", "label": "ร้อง 3", "syllables": ["สรร", "เสริญ", "พระ", "วิญ", "ญาณ", "ทรง", "อยู่", "ใน", "วิญ", "ญาณ", "ข้า", "", "ไม่", "ขอ", "พึ่ง", "พิง", "ใน", "พิ", "ธี", "ศา", "สนา", "ให้", "", "เรา", "รับ", "สุข", "เสมอ", "รับ", "สุข", "พระ", "องค์", "เจ้า", "ความ", "", "สม", "บูรณ์", "พระ", "องค์", "เป็น", "ความ", "จริง", "ของ", "เรา", "เรา", "", "ร่า", "เริง", "ร่วม", "กัน", "ใน", "คริส", "ต", "จักร", "ท้อง", "ถิ่น", ""]}, {"stanza": "A", "label": "ร้อง 4", "syllables": ["ยาม", "พระ", "องค์", "ทรง", "รา", "ศี", "เติม", "เต็ม", "ใน", "คริส", "ต", "", "จักร", "พยาน", "ของ", "คริส", "ต", "จักร", "มี", "ชัย", "สม", "ยศ", "", "ศักดิ์", "เปี่ยม", "สม", "บูรณ์", "ใน", "วิญ", "ญาณ", "สรร", "เสริญ", "ก้อง", "", "นภา", "เพื่อ", "โลก", "รู้", "จัก", "องค์", "รา", "ชา", "เหนือ", "รา", "", "ชา", "ละ", "ทิ้ง", "ขอบ", "เขต", "อัน", "จำ", "กัด", "ของ", "มนุษย์", ""]}]}$json$::jsonb, false, 'คริสตจักร', $refs$[{"book": "ล", "no": 172}, {"book": "สอ", "no": 284}]$refs$::jsonb, null)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
