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

-- Seed song #66 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * repeat (‖: :‖) กางอัตโนมัติจากภาพ/โครง — verify
--   * system x: 31 syllables vs 32 attack notes
--   * system x: 34 syllables vs 32 attack notes
--   * system x: 30 syllables vs 32 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 66, 'พระคริสต์ปลดปล่อยข้าให้เป็นไท', null, $json${"version": 2, "key": "G", "timeSignature": "3/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "", "note": ".5_. .5_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 1 1_. .7_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": ".6 .6 .6_ .6_"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": ".7 .7 .6_ .7_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 1"}], [{"type": "segment", "chord": "", "note": ".5_. .5_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 1 1_. .7_"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": ".6 .6 .6_ .6_"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": ".7 .7 .6_ .7_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 1"}]]}, {"id": "B", "lines": [[{"type": "segment", "chord": "", "note": "0"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "3 - 5"}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "5 4 0"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "2 - 4"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "4 3 0"}], [{"type": "segment", "chord": "G", "note": "1 - 3"}, {"type": "bar"}, {"type": "segment", "chord": "Am", "note": "3 2 0"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": ".7 - .6_ .7_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 1"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["พระ", "คริสต์", "ปลด", "ปล่อย", "ข้า", "ให้", "เป็น", "ไท", "ข้า", "ก็", "ปลด", "ปล่อย", "พระ", "คริสต์", "ภาย", "ใน", "ชี", "วิต", "พระ", "องค์", "ช่วย", "พ้น", "บาป", "ผิด", "ขอ", "เป็น", "พยาน", "สำ", "แดง", "พระ", "คริสต์", "."]}, {"stanza": "B", "label": "รับ", "syllables": ["", "ฮา", "", "ลี", "ลู", "ยา", "", "ทรง", "", "ปลด", "ปล่อย", "ข้า", "", "ร่วม", "", "การ", "งาน", "ใหญ่", "", "ตาม", "", "น้ำ", "พระ", "ทัย", "."]}, {"stanza": "A", "label": "ร้อง 2", "syllables": ["ใน", "องค์", "พระ", "คริสต์", "ชี", "วิต", "เป็น", "ไท", "พ้น", "อำ", "นาจ", "โลก", "ครอบ", "ครอง", "ลอง", "ใจ", "ภา", "ระ", "เบื้อง", "หน้า", "ข้า", "ขอ", "วาง", "ลง", "ใน", "วิญ", "ญาณ", "เป็น", "พยาน", "พระ", "องค์", ""]}, {"stanza": "A", "label": "ร้อง 3", "syllables": ["พระ", "คริสต์", "มั่ง", "คั่ง", "อยู่", "ใน", "วิญ", "ญาณ", "รอ", "คอย", "ข้า", "มา", "พบ", "ประ", "สบ", "การณ์", "เมื่อ", "ปลด", "ปล่อย", "ใน", "วิญ", "ญาณ", "ทุก", "ครา", "ฤท", "ธา", "ปัญ", "ญา", "ล้วน", "เป็น", "ของ", "ข้า"]}, {"stanza": "A", "label": "ร้อง 4", "syllables": ["พระ", "องค์", "ขอ", "ทรง", "ช่วย", "ข้า", "รอด", "พ้น", "“", "หลัก", "ธรรม", "”", "คำ", "สอน", "เก่า", "แก่", "ปลอม", "ปน", "ฝึก", "ฝน", "ทุก", "วัน", "วิญ", "ญาณ", "อิ่ม", "เอม", "สำ", "แดง", "พระ", "คริสต์", "รา", "ศี"]}, {"stanza": "A", "label": "ร้อง 5", "syllables": ["พระ", "คริสต์", "ฤท", "ธา", "ให้", "ข้า", "สำ", "แดง", "รา", "ศี", "สง่า", "ประ", "ชา", "เห็น", "แจ้ง", "ปลด", "ปล่อย", "พระ", "องค์", "ใน", "เว", "ลา", "ใด", "ความ", "สุข", "เกษม", "เติม", "เต็ม", "ดวง", "ใจ", "", ""]}]}$json$::jsonb, false, 'ความสุขแห่งความรอด', $refs$[{"book": "ล", "no": 88}]$refs$::jsonb, null)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
