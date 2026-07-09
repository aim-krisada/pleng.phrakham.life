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

-- Seed song #88 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * system 2: repeat/volta markers [(535.3, ':')] — NEEDS manual repeat/volta
--   * system ร้อง1: 35 syllables vs 44 attack notes
--   * system ร้อง2: 71 syllables vs 44 attack notes
--   * system ร้อง3: 70 syllables vs 44 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 88, 'ขอรักพระองค์มากยิ่งขึ้นทุกวัน', null, $json${"version": 2, "key": "F", "timeSignature": "4/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "F", "note": "0 5_ 3_ 3_ 2_ 2_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "Gm", "note": "1_ 2_ 2_ 3_ .6 -"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "0 4_ 3_ 3_ 2_ 2_ .5_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": ".5_ 1_ 1_ 2_ 3 -"}], [{"type": "segment", "chord": "F", "note": "0 5_ 3_ 3_ 2_ 2_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "Gm", "note": "1_ 2_ 2_ 3_ .6 -"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "0 4_ 3_ 3_ 2_ 2_ .5_"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": ".6_ 1_ 1"}, {"type": "segment", "chord": "C", "note": "- 2"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "1 - - -"}]]}, {"id": "B", "lines": [[{"type": "segment", "chord": "Dm", "note": "0 6 3 6"}, {"type": "bar"}, {"type": "segment", "chord": "Am", "note": "5 - 3 -"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": "0 6"}, {"type": "segment", "chord": "C", "note": "5. 4_"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "5 - - -"}], [{"type": "segment", "chord": "Dm", "note": "0 6 3 6"}, {"type": "bar"}, {"type": "segment", "chord": "Am", "note": "5 - 3 2"}, {"type": "bar"}, {"type": "segment", "chord": "Bb", "note": "1 - - 1"}, {"type": "bar"}, {"type": "segment", "chord": "Gm", "note": "2 -"}, {"type": "segment", "chord": "C", "note": "- 5"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3 - - -"}, {"type": "bar"}, {"type": "segment", "chord": "F", "note": "3 - - 0"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["", "ขอ", "รัก", "พระ", "องค์", "มาก", "ยิ่ง", "ขึ้น", "ทุก", "วัน", "เว", "ลา", "", "", "ที่", "มี", "รัก", "มาก", "ยิ่ง", "ผูก", "พัน", "ขาด", "พระ", "องค์", "จะ", "", "", "เป็น", "อยู่", "ได้", "หรือ", "ไร", "ไม่", "ขอ", "เป็น", "เช่น", "อดีต", "กาล", "", "", "ผ่าน", "ไป", "", "", "", "", "", "", "", "", "", "", "", "", ""]}, {"stanza": "B", "label": "รับ", "syllables": ["", "ข้า", "ขอ", "รัก", "พระ", "", "องค์", "", "", "มาก", "ขึ้น", "ทุก", "ครา", "", "", "", "", "ขอ", "รัก", "พระ", "องค์", "", "มาก", "ยิ่ง", "ขึ้น", "", "", "ทุก", "วัน", "", "", "เว", "ลา", "", "", "", ".", "", "", ""]}, {"stanza": "A", "label": "ร้อง 2", "syllables": ["", "โอ", "ความ", "กระ", "หาย", "ที่", "กัด", "กิน", "ใจ", "ข้า", "นำ", "พา", "", "", "ไป", "สู่", "สิ่ง", "ซึ่ง", "ใจ", "ใฝ่", "หา", "เนิ่น", "นาน", "มา", "แม้", "", "", "เสาะ", "หา", "มาก", "เพียง", "ไร", "แต่", "ไม่", "อาจ", "ดับ", "กระ", "หาย", "", "", "ให้", "อิ่ม", "ใจ", "แม้", "คอย", "ไขว่", "คว้า", "ไม่", "ลด", "", "ละ", "เรื่อย", "", "", ""]}, {"stanza": "A", "label": "ร้อง 3", "syllables": ["", "พระ", "องค์", "เชิญ", "เสด็จ", "มา", "เติม", "เต็ม", "ข้า", "ทรง", "หวาน", "เลิศ", "", "", "จริง", "ยิ่ง", "น่า", "ปรา", "รถ", "นา", "บัด", "นี้", "มี", "พระ", "องค์", "", "", "ทรง", "เป็น", "ทุก", "สิ่ง", "พระ", "วิญ", "ญาณ", "ซาบ", "ซ่าน", "ภาย", "ใน", "", "", "แท้", "จริง", "พระ", "องค์", "ทรง", "มา", "ข้า", "ขอบ", "คุณ", "", "ไม่", "วาย", "", "", ""]}]}$json$::jsonb, false, 'รักปรารถนา', $refs$[{"book": "สอ", "no": 290}]$refs$::jsonb, null)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
