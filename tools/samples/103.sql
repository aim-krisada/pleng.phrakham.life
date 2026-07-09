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

-- Seed song #103 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * header key "Ab" != stored sounding key "F" (from chords; movable-do). Numbers still reference do; transpose uses "F". Verify tonic.
--   * PDF systems (6) != DOCX staves (4) — structure may drift; verify
--   * system 4: no printed barlines — bars inferred by beat count (verify)
--   * system 6: no printed barlines — bars inferred by beat count (verify)
--   * system ร้อง1: 57 syllables vs 67 attack notes
--   * system ร้อง2: 56 syllables vs 67 attack notes
--   * system ร้อง3: 55 syllables vs 67 attack notes
--   * system ร้อง4: 54 syllables vs 67 attack notes
--   * system ร้อง5: 55 syllables vs 67 attack notes
--   * system ร้อง6: 57 syllables vs 67 attack notes
insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)
values ('anuchon', 103, 'พระคริสต์ทรงเป็นทุกสิ่งแดนงาม', null, $json${"version": 2, "key": "F", "timeSignature": "6/8", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "G", "note": "3_. 2_ 1_"}, {"type": "segment", "chord": "C/G", "note": "4 3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "3 2_ 1 .5_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1 1_"}, {"type": "segment", "chord": "D", "note": "2 2_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "3. 3 5_"}], [{"type": "segment", "chord": "C", "note": "5 2_"}, {"type": "segment", "chord": "D/C", "note": "2 5_"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": "5 3_"}, {"type": "segment", "chord": "Em", "note": "3 3_"}, {"type": "bar"}, {"type": "segment", "chord": "Am", "note": "2 1_"}, {"type": "segment", "chord": "A", "note": ".6_ .7_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "2. 2 0_"}], [{"type": "segment", "chord": "G", "note": ".5_ .6_ 1_"}, {"type": "segment", "chord": "C/G", "note": ".6 .3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": ".5 .6_ .5."}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": ".5_ .6_ 1_"}, {"type": "segment", "chord": "C", "note": ".6 .3_"}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": ".5 .6_ .5."}], [{"type": "segment", "chord": "Em/D", "note": "7"}, {"type": "segment", "chord": "Bm", "note": "7"}, {"type": "segment", "chord": "Am", "note": "7"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "7"}, {"type": "segment", "chord": "G", "note": "4"}], [{"type": "segment", "chord": "Em", "note": "1_ 1_ 1_"}, {"type": "segment", "chord": "Em/D", "note": "1."}, {"type": "bar"}, {"type": "segment", "chord": "C", "note": "1_ 1_ 1_"}, {"type": "segment", "chord": "Bm", "note": "5'."}, {"type": "bar"}, {"type": "segment", "chord": "Am", "note": "1."}, {"type": "segment", "chord": "D", "note": "2."}, {"type": "bar"}, {"type": "segment", "chord": "G", "note": "1. 1 0_"}], [{"type": "segment", "chord": "Flowing", "note": "1 0 3."}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "2"}]]}], "arrangement": [{"stanza": "A", "label": "ร้อง 1", "syllables": ["พระ", "คริสต์", "–", "แดน", "งาม", "อุ", "ดม", "แท้", "จริง", "ทรง", "ครอบ", "คลุม", "สรรพ", "สิ่ง", "แหล่ง", "น้ำ", "ลำ", "ธาร", "สด", "ใส", "วิ", "สุทธิ์", "วัน", "คืน", "หลั่ง", "ไหล", "ไม่", "หยุด", "มี", "น้ำ", "ไหล", "", "บ่า", "มา", "จาก", "หุบ", "เขา", "เติม", "เต็ม", "ถี่", "ถ้วน", "ทุก", "ส่วน", "ของ", "เรา", "ทรง", "รด", "น้ำ", "ข้า", "รา", "ศี", "ศักดิ์", "สิทธิ์", "ทรง", "เป็น", "ชี", "วิ", "ต.", "", "", "", "", "", "", "", "", "", "", "", ""]}, {"stanza": "A", "label": "ร้อง 2", "syllables": ["พระ", "เย", "ซู", "เป็น", "ทุ่ง", "ข้าว", "สา", "ลี", "บัง", "เกิด", "ตรึง", "ตาย", "ทรง", "พลี", "พระ", "องค์", "เป็น", "ขึ้น", "ทรง", "มี", "ฤท", "ธี", "หมาย", "ถึง", "ข้าว", "บา", "ระ", "ลี", "ดิน", "แดน", "มะ", "", "เดื่อ", "องุ่น", "พร้อม", "มูล", "เพียบ", "พร้อม", "น้ำ", "จัณฑ์", "บัน", "ดาล", "เพิ่ม", "พูน", "หล่อ", "เลี้ยง", "ชื่น", "ชม", "อุ", "ดม", "ทุก", "ยาม", "พระ", "คริสต์", "–", "แดน", "งาม", "", "", "", "", "", "", "", "", "", "", "", "", ""]}, {"stanza": "A", "label": "ร้อง 3", "syllables": ["โอ", "แสน", "อุ", "ดม", "องค์", "พระ", "คริสต์", "เจ้า", "เป็น", "ต้น", "ทับ", "ทิม", "ของ", "เรา", "ทั้ง", "ทรง", "เป็น", "ต้น", "มะ", "กอก", "งาม", "ตา", "น้ำ", "มัน", "ชโลม", "ลง", "มา", "ประ", "ทาน", "น้ำ", "นม", "", "น้ำ", "ผึ้ง", "แก่", "ข้า", "หวาน", "ชื่น", "รื่น", "รมย์", "อุ", "ดม", "เหนือ", "กว่า", "พระ", "องค์", "มั่ง", "คั่ง", "พร้อม", "ทั้ง", "มั่ง", "มี", "พระ", "คริสต์", "ผู้", "นี้", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]}, {"stanza": "A", "label": "ร้อง 4", "syllables": ["กิน", "ขนม", "ปัง", "ใน", "แดน", "วิ", "ไล", "ไม่", "ต้อง", "ขาด", "แคลน", "สิ่ง", "ใด", "อยู่", "ใน", "พระ", "องค์", "ไม่", "มี", "ขัด", "สน", "อุ", "ดม", "สม", "บูรณ์", "พูน", "ผล", "ทรง", "เป็น", "แผ่น", "ดิน", "", "ไพ", "ศาล", "กว้าง", "ไกล", "พระ", "องค์", "พร้อม", "มูล", "เพิ่ม", "พูน", "ปัจ", "จัย", "ทรง", "แผ่", "ขยาย", "เหนือ", "แดน", "อื่น", "ใด", "เข้า", "สู่", "ดวง", "ใจ", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]}, {"stanza": "A", "label": "ร้อง 5", "syllables": ["พระ", "คริสต์", "–", "ดิน", "แดน", "แห่ง", "เหล็ก", "ศิ", "ลา", "ทรง", "เปี่ยม", "อำ", "นาจ", "ฤท", "ธา", "จง", "ขุด", "ค้น", "หา", "พระ", "คริสต์", "ผู้", "นี้", "ผูก", "มัด", "ศัตรู", "ไพ", "รี", "ผ่าน", "ทุกข์", "มาก", "", "ล้น", "ฝึก", "ฝน", "ทน", "ทาน", "กลาย", "เป็น", "ทอง", "เหลือง", "วิ", "สุทธิ์", "ตราบ", "นาน", "เหล็ก", "กล้า", "ศิ", "ลา", "ทอง", "เหลือง", "สง่า", "ข้า", "ปรา", "รถ", "นา", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]}, {"stanza": "A", "label": "ร้อง 6", "syllables": ["ข้า", "ขอบ", "พระ", "คุณ", "พระ", "คริสต์", "ไม่", "วาย", "ทรง", "ครอบ", "คลุม", "สิ่ง", "ทั้ง", "หลาย", "กิน", "ดื่ม", "พระ", "องค์", "ทรง", "เติม", "เต็ม", "ข้า", "หล่อ", "เลี้ยง", "เพียง", "พอ", "นำ", "พา", "สอน", "ข้า", "บาก", "", "บั่น", "มั่น", "คง", "สืบ", "ไป", "ความ", "จริง", "แดน", "งาม", "จำ", "เริญ", "เติบ", "ใหญ่", "เป็น", "การ", "งาน", "ข้า", "ปรี", "ดา", "ทุก", "ยาม", "พระ", "คริสต์", "–", "แดน", "งาม", "", "", "", "", "", "", "", "", "", "", "", ""]}], "headerKey": "Ab"}$json$::jsonb, false, 'คริสตจักร', $refs$[{"book": "ฟ", "no": 227}, {"book": "ย", "no": 227}]$refs$::jsonb, 'พบญ.8:7-10')
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false,
      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;
