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

-- Seed song #90 [anuchon] — upsert by (category, number); overwrites
-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):
--   * header key "B" != stored sounding key "D" (from chords; movable-do). Numbers still reference do; transpose uses "D". Verify tonic.
--   * PDF systems (9) != DOCX staff lines (8) — pairing by order may drift
--   * system 2: 12 syllables vs 11 attack notes
--   * system 4: 12 syllables vs 11 attack notes
--   * system 5: 14 syllables vs 15 attack notes
--   * system 6: 10 syllables vs 11 attack notes
--   * system 7: 12 syllables vs 13 attack notes
--   * system 8: repeat/volta markers [(470.81, '║')] — NEEDS manual repeat/volta
--   * system 9: no printed barlines — bars inferred by beat count (verify)
--   * system 9: repeat/volta markers [(307.20968, ':')] — NEEDS manual repeat/volta
insert into public.songs (category, number, title_th, title_en, content, verified)
values ('anuchon', 90, 'ตักน้ำด้วยความชื่นชมยินดี  (ล.212) (พระคัมภีร์)', null, $json${"version": 2, "key": "D", "timeSignature": "3/4", "stanzas": [{"id": "A", "lines": [[{"type": "segment", "chord": "", "note": ".5_ .5_ .5_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".5. .5_ .5_ .4_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".3_ .5 1_ 1_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "3 3. 2_"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "1 .6_"}]]}, {"id": "B", "lines": [[{"type": "segment", "chord": "", "note": "1_ 1_ .6_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".5 - .6_ .5_"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": ".3 - .4_ .3_"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": ".2 - -"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": ".2."}]]}, {"id": "C", "lines": [[{"type": "segment", "chord": "", "note": "1_ 1_ .6_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": ".5 - 1_ .6_"}, {"type": "bar"}, {"type": "segment", "chord": "B", "note": ".7 - 1_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "1 - -"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "1 - -"}]]}, {"id": "D", "lines": [[{"type": "segment", "chord": "D", "note": "1. .6_ .6_ .4_"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": ".6. 1_ 1_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "1 1_ 1_ .7_ .6_"}, {"type": "bar"}, {"type": "segment", "chord": "F#m", "note": ".5 .3"}]]}, {"id": "E", "lines": [[{"type": "segment", "chord": "", "note": ".5"}, {"type": "bar"}, {"type": "segment", "chord": "Bm", "note": ".6. .6_ .6_ .7_"}, {"type": "bar"}, {"type": "segment", "chord": "B", "note": "1 2 3"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": "2 .5 -"}, {"type": "bar"}, {"type": "segment", "chord": "E", "note": ".5 0_"}]]}, {"id": "F", "lines": [[{"type": "segment", "chord": "", "note": ".5_ .5_ .5_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "1 - 1_ 2_"}, {"type": "bar"}, {"type": "segment", "chord": "A", "note": "3. 3_ 2_ 1_"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": "1 .6 -"}, {"type": "bar"}, {"type": "segment", "chord": "D", "note": ".6 0_"}]]}, {"id": "G", "lines": [[{"type": "segment", "chord": "D", "note": "1_ 1_ .6_ 1_"}, {"type": "segment", "chord": "E", "note": ".7 .7 .6_ .5_ .7_ .7_ .7_. .7_ 1_ 2_"}, {"type": "segment", "chord": "A", "note": "1 - - 1 0_"}]]}, {"id": "H", "lines": [[{"type": "segment", "chord": "", "note": "1 2 3"}, {"type": "bar"}, {"type": "segment", "chord": "", "note": "- 4 6"}, {"type": "bar"}]]}], "arrangement": [{"stanza": "A", "label": "", "syllables": ["เจ้า", "จะ", "ตัก", "น้ำ", "ออก", "จาก", "บ่อ", "น้ำ", "พุ", "แห่ง", "ความ", "รอด", "ด้วย", "ชื่น", "ชม", "ยิน", "ดี"]}, {"stanza": "B", "label": "", "syllables": ["ใน", "วัน", "นั้น", "เจ้า", "", "จะ", "กล่าว", "ว่า", "", "“", "ขอบ", "พระ", "", "", "คุณ"]}, {"stanza": "A", "label": "", "syllables": ["เจ้า", "จะ", "ตัก", "น้ำ", "ออก", "จาก", "บ่อ", "น้ำ", "พุ", "แห่ง", "ความ", "รอด", "ด้วย", "ชื่น", "ชม", "ยิน", "ดี"]}, {"stanza": "C", "label": "", "syllables": ["ใน", "วัน", "นั้น", "เจ้า", "", "จะ", "กล่าว", "ว่า", "", "“", "ขอบ", "พระ", "", "", "คุณ", "", ""]}, {"stanza": "D", "label": "", "syllables": ["ออก", "พระ", "นาม", "พระ", "องค์", "ประ", "กาศ", "ราช", "กิจ", "ยิ่ง", "ใหญ่", "ใน", "หมู่", "ชน", ""]}, {"stanza": "E", "label": "", "syllables": ["พระ", "นาม", "พระ", "องค์", "จง", "ยก", "ชู", "สู่", "เบื้อง", "บน", "", "", ""]}, {"stanza": "F", "label": "", "syllables": ["โอ", "ชาว", "ซี", "โอน", "", "จง", "เปล่ง", "เสียง", "ด้วย", "ยิน", "ดี", "ชื่น", "ใจ", "", "", ""]}, {"stanza": "G", "label": "", "syllables": ["เพราะ", "องค์", "บริ", "สุทธิ์", "แห่ง", "ยิ", "ศ", "รา", "เอ", "ล", "ทรง", "ยิ่ง", "ใหญ่", "เกรียง", "ไก", "", "", "ร.", ""]}, {"stanza": "H", "label": "", "syllables": ["", "", "", "", "", ""]}], "headerKey": "B"}$json$::jsonb, false)
on conflict (category, number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en,
      content = excluded.content, verified = false;
