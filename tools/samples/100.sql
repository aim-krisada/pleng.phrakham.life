-- --- schema prep (idempotent) ------------------------------------------
-- category = key code (frontend maps 'anuchon' -> 'อนุชน'); number is unique
-- PER category, so (category, number) is the real key (เลข 1 อนุชน != เลข 1 ยุวชน).
alter table public.songs add column if not exists category text not null default 'anuchon';
alter table public.songs add column if not exists verified boolean not null default false;
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

-- Seed song #100 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system 2: no printed barlines — bars inferred by beat count (verify)
--   * system 2: repeat/volta markers [(418.98, ':')] — NEEDS manual repeat/volta
--   * system 2: 13 syllables vs 12 attack notes
--   * system 3: no printed barlines — bars inferred by beat count (verify)
--   * system 4: repeat/volta markers [(73.92, ':')] — NEEDS manual repeat/volta
--   * system 4: 14 syllables vs 15 attack notes
--   * system 5: repeat/volta markers [(417.48, ':')] — NEEDS manual repeat/volta
--   * system 5: 11 syllables vs 12 attack notes
--   * system 6: extra/overflow verse text (48 syllables vs 12 notes) NOT auto-placed — add as its own ข้อ manually
--   * system 6: extra/overflow verse text (48 syllables vs 12 notes) NOT auto-placed — add as its own ข้อ manually
insert into public.songs (category, number, title_th, title_en, content)
values ('anuchon', 100, 'ขอสรรเสริญพระเจ้าโดยไม่หยุดยั้ง (ล.282, ย.274)', null, $json${"version": 2, "key": "G", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "", "note": "3_ 3_. 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "3 .5 - .6"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 1 3 -"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "0 3 3. #2_"}, {"type": "bar"}, {"type": "segment", "chord": "Em", "note": "3 2 1 -"}]]}, {"id": "B", "lines": [[{"type": "segment", "chord": "D", "note": "0 2 2. #1_"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "2 1 7 -"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "0 3 3. #2_"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "3 2 1_"}]]}, {"id": "C", "lines": [[{"type": "segment", "chord": "Am", "note": "2 2 - 4"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "3 - 2 -"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 - - -"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "1"}]]}, {"id": "D", "lines": [[{"type": "segment", "chord": "", "note": "1 2 3"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "4 4 4 4"}, {"type": "bar"}, {"type": "segment", "chord": "Cm", "note": "4 - 1 2"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "3 3 3 2"}, {"type": "bar"}, {"type": "segment", "chord": "Em", "note": "1 -"}]]}, {"id": "E", "lines": [[{"type": "segment", "chord": "", "note": "1 3"}, {"type": "bar"}, {"type": "segment", "chord": "Am", "note": "2 2 2 1"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": ".7 .5 1 2"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "3 - - -"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "3"}]]}, {"id": "F", "lines": [[{"type": "segment", "chord": "", "note": "1 3"}, {"type": "bar"}, {"type": "segment", "chord": "Am", "note": "2 2 2 1"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": ".7 .5 3 2"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 - - -"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 - 0_"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["ขอ", "สรร", "เสริญ", "พระ", "เจ้า", "", "โดย", "ไม่", "หยุด", "ยั้ง", "", "", "เพราะ", "ทรง", "เป็น", "อยู่", "ใน", "ข้า", ""]}, {"stanza": "A", "label": "", "syllables": ["ขอ", "สรร", "เสริญ", "พระ", "เจ้า", "", "โดย", "ไม่", "หยุด", "ยั้ง", "", "", "เพราะ", "ทรง", "เป็น", "อยู่", "ภาย", "ใน", ""]}, {"stanza": "B", "label": "", "syllables": ["", "ทรง", "เป็น", "ทุก", "สิ่ง", "นา", "นา", "", "", "หล่อ", "เลี้ยง", "ชี", "วิ", "ต", "นำ"]}, {"stanza": "C", "label": "", "syllables": ["ไม่", "พราก", "", "จาก", "ข้า", "", "สืบ", "", "ไป", "", "", "", "."]}, {"stanza": "D", "label": "รับ", "syllables": ["บัด", "นี้", "อยู่", "ใน", "วิญ", "ญาณ", "รับ", "สุข", "", "พระ", "คริสต์", "เป็น", "ทุก", "สิ่ง", "นา", "นา", ""]}, {"stanza": "D", "label": "", "syllables": ["เพียง", "เปิด", "ปาก", "ท่าน", "จะ", "ลิ้ม", "รส", "พลัน", "", "พระ", "องค์", "ทรง", "อุ", "ดม", "อนันต์", "", ""]}, {"stanza": "E", "label": "", "syllables": ["ออก", "พระ", "นาม", "ยาม", "ใด", "ทรง", "เป็น", "ความ", "จริง", "ของ", "ข้า", "", "", "", ""]}, {"stanza": "F", "label": "", "syllables": ["ทรง", "เตรียม", "การ", "หล่อ", "เลี้ยง", "ครบ", "ครัน", "แสน", "อั", "-ศ", "-จรรย์", "", "", "", ".", "", ""]}]}$json$::jsonb)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en, content = excluded.content;
