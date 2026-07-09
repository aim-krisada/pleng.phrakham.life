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

-- Seed song #80 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system ร้อง1: 105 syllables vs 106 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 80, 'ยิศราเอลจงฟังเถิด', null, $json${"version": 2, "key": "F", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "Bb", "note": ".6 .5_. .6_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 -"}, {"type": "segment", "chord": "C", "note": "2 1_. 2_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3 -"}, {"type": "segment", "chord": "Bb", "note": ".6 .6"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3_ 5_ 6_ 5_"}, {"type": "segment", "chord": "C", "note": "3 2"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 -"}], [{"type": "segment", "chord": "", "note": "0_ 5_ 5_ 5_"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": "6 7_. 6_"}, {"type": "segment", "chord": "C", "note": "5 2"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3. 5_ 3_. 2_ 1"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "2. 3_ 5_. 3_ 5"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5"}], [{"type": "segment", "chord": "", "note": "3_ 5_ 2 1"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": ".6 1_. 2_"}, {"type": "segment", "chord": "F", "note": "3_ 2_ 1_ .5_"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": ".6 1_. 2_"}, {"type": "segment", "chord": "C", "note": "3 2"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 -"}], [{"type": "segment", "chord": "Bb", "note": ".6 .5_. .6_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 -"}, {"type": "segment", "chord": "C", "note": "2 1_. 2_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3 -"}, {"type": "segment", "chord": "Bb", "note": ".6 .6"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3_ 5_ 6_ 5_"}, {"type": "segment", "chord": "C", "note": "3 2"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 -"}], [{"type": "segment", "chord": "", "note": "0_ 5_ 5_ 5_"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": "6 7_. 6_"}, {"type": "segment", "chord": "C", "note": "5 2"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3. 5_ 3_. 2_ 1"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "2. 3_ 5_. 3_ 5"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5"}], [{"type": "segment", "chord": "", "note": "3_ 5_ 2 1"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": ".6 1_. 2_"}, {"type": "segment", "chord": "F", "note": "3_ 2_ 1_ .5_"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": ".6 1_. 2_"}, {"type": "segment", "chord": "C", "note": "3 2"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 -"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["ยิ", "ศ", "รา", "เอ", "", "ล", "จง", "ฟัง", "เถิด", "", "ยะ", "-โฮ", "วา", "พระ", "เจ้า", "ของ", "เรา", "เป็น", "เอก", "", "", "จง", "รัก", "พระ", "เจ้า", "ของ", "เจ้า", "ด้วย", "สุด", "ใจ", "สุด", "จิต", "สุด", "กำ", "ลัง", "ถ้อย", "คำ", "เหล่า", "นี้", "ซึ่ง", "เรา", "ได้", "สั่ง", "ไว้", "แก่", "เจ้า", "ทั้ง", "หลาย", "ใน", "วัน", "นี้", "ให้", "ตั้ง", "อยู่", "ใน", "ใจ", "จง", "", "อุ", "ต", "ส่าห์", "สอน", "", "บุตร", "ทั้ง", "หลาย", "ของ", "", "เจ้า", "ด้วย", "ถ้อย", "คำ", "เหล่า", "นี้", "และ", "เมื่อ", "เจ้า", "", "", "ทั้ง", "หลาย", "จะ", "นั่ง", "อยู่", "ใน", "เรือน", "หรือ", "เดิน", "ใน", "หน", "ทาง", "หรือ", "นอน", "ลง", "ตื่น", "ขึ้น", "จง", "พร", "ร", "-ณ", "-นา", "ตาม", "เอา", "ถ้อย", "คำ", "พัน", "ไว้", "ที่", "มือ", "จา", "รึก", "ที่", "หว่าง", "คิ้ว", "", ""]}]}$json$::jsonb, false, 'พระคัมภีร์', $refs$[]$refs$::jsonb, 'พบญ.6:4-9')
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
