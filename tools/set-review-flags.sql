-- Review flags for the app to badge songs needing a human pass (P Aim/พี่เปา).
-- Run AFTER import-all-120.sql. Idempotent. codes: repeat|lint|words
--   repeat = has เล่นซ้ำ/จบ2แบบ, set repeat in Studio (16)
--   lint   = notationLint unreadable token, check notes (6)
--   words  = PDF systems != DOCX lyric lines, check word placement (28)

begin;
alter table public.songs add column if not exists review_flags jsonb not null default '[]'::jsonb;

update public.songs set review_flags = '["repeat", "words"]'::jsonb where category = 'anuchon' and number = 2;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 5;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 7;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 8;
update public.songs set review_flags = '["repeat", "words"]'::jsonb where category = 'anuchon' and number = 20;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 25;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 26;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 36;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 40;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 48;
update public.songs set review_flags = '["lint", "words"]'::jsonb where category = 'anuchon' and number = 49;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 51;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 52;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 53;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 56;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 61;
update public.songs set review_flags = '["lint"]'::jsonb where category = 'anuchon' and number = 64;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 66;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 69;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 72;
update public.songs set review_flags = '["repeat", "lint"]'::jsonb where category = 'anuchon' and number = 73;
update public.songs set review_flags = '["repeat", "words"]'::jsonb where category = 'anuchon' and number = 74;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 75;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 76;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 80;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 81;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 82;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 83;
update public.songs set review_flags = '["repeat", "words"]'::jsonb where category = 'anuchon' and number = 85;
update public.songs set review_flags = '["repeat"]'::jsonb where category = 'anuchon' and number = 88;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 89;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 90;
update public.songs set review_flags = '["lint"]'::jsonb where category = 'anuchon' and number = 92;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 101;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 102;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 103;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 107;
update public.songs set review_flags = '["lint", "words"]'::jsonb where category = 'anuchon' and number = 109;
update public.songs set review_flags = '["lint", "words"]'::jsonb where category = 'anuchon' and number = 111;
update public.songs set review_flags = '["repeat", "words"]'::jsonb where category = 'anuchon' and number = 117;
update public.songs set review_flags = '["words"]'::jsonb where category = 'anuchon' and number = 119;

-- verify: songs flagged for review
select number, title_th, review_flags from public.songs where category='anuchon' and review_flags <> '[]'::jsonb order by number;
commit;
