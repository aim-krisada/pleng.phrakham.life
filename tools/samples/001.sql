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

-- Seed song #1 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system ร้อง1: 61 syllables vs 63 attack notes
--   * system รับ: 64 syllables vs 63 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 1, 'พระเจ้าเป็นความรัก', null, $json${"version": 2, "key": "E", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "E", "note": ".5. .5_ .5 .6"}, {"type": "bar"}, {"type": "segment", "chord": "C#m", "note": "1 - - .6_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "2_ 2_ 2_ 2_"}, {"type": "segment", "chord": "B", "note": "2 1_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": "3 - -"}], [{"type": "segment", "chord": "", "note": "2_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G#m", "note": "5. 6_ 5 3"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "2. 3_ 2 1"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".6. .5_ .6 1_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "B", "note": "2 - - -"}], [{"type": "segment", "chord": "E", "note": ".5. .5_ .5 .6"}, {"type": "bar"}, {"type": "segment", "chord": "C#m", "note": "1 - - .6_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "2_ 2_ 2_ 2_"}, {"type": "segment", "chord": "B", "note": "2 1_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": "3 - -"}], [{"type": "segment", "chord": "", "note": "2_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G#m", "note": "5. 6_ 5 3"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "2. 3_ 2 1"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".6. .5_ .6 1"}, {"type": "bar"}, {"type": "segment", "chord": "B", "note": "2 - - 1"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": "1 - -"}]]}, {"id": "B", "lines": [[{"type": "segment", "chord": "", "note": "3_ 5_"}, {"type": "bar"}, {"type": "segment", "chord": "C#m", "note": "6 - 6_ 7_ 6_ 5_"}, {"type": "bar"}, {"type": "segment", "chord": "G#m", "note": "3 - - 3_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "1. 1_"}, {"type": "segment", "chord": "B", "note": "2 1_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": "3 - -"}], [{"type": "segment", "chord": "", "note": "6_ 7_"}, {"type": "bar"}, {"type": "segment", "chord": "C#m", "note": "1. 1_"}, {"type": "segment", "chord": "G#m", "note": "7 5"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "6. 6_"}, {"type": "segment", "chord": "E", "note": "5 3"}, {"type": "bar"}, {"type": "segment", "chord": "F#", "note": "2. 1_ 2 6"}, {"type": "bar"}, {"type": "segment", "chord": "B", "note": "5 - - -"}], [{"type": "segment", "chord": "E", "note": ".5. .5_ .5 .6"}, {"type": "bar"}, {"type": "segment", "chord": "C#m", "note": "1 - - .6_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "2_ 2_ 2_ 2_"}, {"type": "segment", "chord": "B", "note": "2 1_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": "3 - -"}], [{"type": "segment", "chord": "", "note": "2_ 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G#m", "note": "5. 6_ 5 3"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": "2. 3_ 2 1"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".6. .5_ .6 1"}, {"type": "bar"}, {"type": "segment", "chord": "B", "note": "2 - - 1"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": "1 - - -"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["พระ", "เจ้า", "เป็น", "ความ", "รัก", "", "", "ให้", "ข้า", "พัก", "ใน", "ทุ่ง", "หญ้า", "ริม", "ฝั่ง", "น้ำ", "ทรง", "", "", "ช่วย", "นำ", "สำ", "รวจ", "ใจ", "ข้า", "ที่", "มืด", "มน", "ร่วม", "ผ่าน", "พ้น", "แต่", "ละ", "วัน", "พระ", "", "", "", "เจ้า", "เป็น", "ความ", "รัก", "ทรง", "", "", "ปก", "ปัก", "รัก", "ษา", "ใน", "ความ", "ทุกข์", "ตรม", "พระ", "คุณ", "", "", "อัน", "อุ", "ดม", "เพื่อ", "ข้า", "ทรง", "เตรียม", "ไว้", "แม้", "มี", "ภัย", "ไม่", "แปร", "เปลี่ยน", "ไป", "", "", "", "", "", ""]}, {"stanza": "B", "label": "รับ", "syllables": ["ใน", "โลก", "นี้", "", "พระ", "คุณ", "ส", "ถิ", "ต", "", "", "รัก", "ส", "นิ", "ท", "ใน", "จิต", "ทุก", "เว", "", "", "ลา", "พระ", "เจ้า", "ทรง", "ประ", "ทาน", "พระ", "คุณ", "หนุน", "นำ", "พา", "ร่วม", "ดำ", "เนิน", "ชี", "", "", "", "วา", "พระ", "เจ้า", "เป็น", "ความ", "", "", "รัก", "ให้", "ข้า", "พัก", "ใน", "ทุ่ง", "หญ้า", "ริม", "ฝั่ง", "น้ำ", "", "", "ความ", "อิ่ม", "หนำ", "ชื่น", "ชม", "ล้น", "ไหล", "ใน", "ดวง", "ใจ", "แม้", "มี", "ภัย", "ไม่", "แปร", "", "", "เปลี่ยน", "ไป", "", "", ""]}]}$json$::jsonb, false, 'กิตติคุณ', $refs$[]$refs$::jsonb, 'บพส.23:2')
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
