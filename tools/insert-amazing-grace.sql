-- ============================================================================
-- insert-amazing-grace.sql
-- Bring the PUBLIC-DOMAIN test song "Amazing Grace" into public.songs.
-- Run by P'Aim (approver) in the Supabase SQL Editor. Claude does NOT run this.
--
-- SAFE + IDEMPOTENT:
--   * Target slot: category='anuchon', number=900 (proposed — high, so it
--     will not collide with the ~120 real YS songs). If that slot already holds a
--     DIFFERENT song the script ABORTS (never overwrites) — change the two 900s
--     below to a free number and re-run.
--   * Re-runnable: if Amazing Grace is already in that slot it is UPDATED in place;
--     otherwise it is INSERTED. Does not rely on a unique (category,number) index.
--   * verified = false  (melody entered SYLLABIC = เอื้อนต้นฉบับถูกทำให้เรียบ →
--     พี่เปา must ear-check pitches before this is trusted).
--   * review_flags = ["test","melody-syllabic","pd-cc0"]
--   * Copyright provenance stored in content->'copyright_note':
--       Words (EN): John Newton 1779 — public domain
--       Tune: New Britain (Virginia Harmony 1835) — public domain
--       Words (TH): self-written for this test, released CC0 (no published translation)
--   * Touches NO other row. No schema change. author_id omitted (nullable — real
--     song rows carry no author_id; if your DB makes it NOT NULL, add it and re-run).
--
-- Source of truth: docs/samples/amazing-grace.json
-- Verified app-side: beat-checker 11/11 bars = 3 beats · syllable align 35 slots /
--   28 words on every arrangement row · renders in production SongSheet.
-- ============================================================================

begin;

-- 1. Safety guard — refuse to clobber a different song sitting in this slot.
do $$
begin
  if exists (
    select 1 from public.songs
    where category = 'anuchon' and number = 900
      and coalesce(title_en, '') <> 'Amazing Grace'
  ) then
    raise exception 'slot anuchon/900 is occupied by a different song — choose another number and re-run';
  end if;
end $$;

-- 2a. Update in place if Amazing Grace is already in this slot (re-run path).
update public.songs set
  title_th     = 'พระคุณล้ำเลิศ (Amazing Grace)',
  title_en     = 'Amazing Grace',
  theme        = 'พระคุณ',
  verified     = false,
  scripture    = 'เอเฟซัส 2:8',
  book_refs    = '[]'::jsonb,
  review_flags = '["test","melody-syllabic","pd-cc0"]'::jsonb,
  content      = $json${"key":"G","version":2,"timeSignature":"3/4","headerKey":"G","stanzas":[{"id":"A","lines":[[{"note":"0 0 .5","type":"segment","chord":"G"},{"type":"bar"},{"note":"1. 3_ 1","type":"segment","chord":"G"},{"type":"bar"},{"note":"3. 2_ 1","type":"segment","chord":"C"},{"type":"bar"},{"note":"1 - -","type":"segment","chord":"G"}],[{"note":".5 1. 3_","type":"segment","chord":"G"},{"type":"bar"},{"note":"1_ 3_ 2 -","type":"segment","chord":"D"}],[{"note":".5 1. 3_","type":"segment","chord":"G"},{"type":"bar"},{"note":"1. 3_ 1'","type":"segment","chord":"C"},{"type":"bar"},{"note":"6 5 -","type":"segment","chord":"G"}],[{"note":"1. 3_ 1","type":"segment","chord":"D"},{"type":"bar"},{"note":"3_ 2_ 1 -","type":"segment","chord":"G"}]]}],"arrangement":[{"label":"Verse 1 (EN)","stanza":"A","syllables":["","","A","ma","zing","grace","how","sweet","the","sound","","","that","saved","a","wretch","like","me","","I","once","was","lost","but","now","am","found","","was","blind","but","now","I","see",""]},{"label":"ร้อง 1 (ไทย)","stanza":"A","syllables":["","","พระ","คุณ","ล้ำ","เลิศ","ประ","-เสริฐ","เกิน","คำ","","","ช่วย","คน","บาป","อย่าง","ฉัน","ไว้","","เคย","หลง","ทาง","ไกล","บัด","-นี้","กลับ","-มา","","เคย","มืด","บอด","นี้","ตา","เห็น",""]},{"label":"Verse 2 (EN)","stanza":"A","syllables":["","","'Twas","grace","that","taught","my","heart","to","fear","","","and","grace","my","fears","re","-lieved","","how","pre","-cious","did","that","grace","ap","-pear","","the","hour","I","first","be","-lieved",""]}],"copyright_note":{"words_en":"John Newton, 1779 — public domain worldwide.","tune":"New Britain (Virginia Harmony, 1835) — public domain.","words_th":"แปลไทยแบบร้องได้ แต่งขึ้นเองสำหรับทดสอบระบบ (มอบให้เป็นสาธารณะ / CC0). ไม่ใช้คำแปลไทยฉบับตีพิมพ์ใด ๆ เพื่อเลี่ยงลิขสิทธิ์ผู้แปล.","notation_note":"ทำนองบันทึกแบบ 1 พยางค์/1 โน้ต (syllabic) ตามที่ร้องในโบสถ์ทั่วไป — melisma (เอื้อนหลายเสียงต่อพยางค์) ของฉบับดั้งเดิมถูกทำให้เรียบเพื่อให้ตรงกับโมเดล v2 (1 พยางค์/attack note). ควรให้นักดนตรี (พี่เปา) ตรวจเสียงก่อนใช้จริง."}}$json$::jsonb
where category = 'anuchon' and number = 900;

-- 2b. Otherwise insert it (first-run path). Guarded by NOT EXISTS so re-runs no-op.
insert into public.songs
  (number, title_th, title_en, category, theme, verified, scripture, book_refs, review_flags, content)
select
  900, 'พระคุณล้ำเลิศ (Amazing Grace)', 'Amazing Grace', 'anuchon', 'พระคุณ', false,
  'เอเฟซัส 2:8', '[]'::jsonb, '["test","melody-syllabic","pd-cc0"]'::jsonb, $json${"key":"G","version":2,"timeSignature":"3/4","headerKey":"G","stanzas":[{"id":"A","lines":[[{"note":"0 0 .5","type":"segment","chord":"G"},{"type":"bar"},{"note":"1. 3_ 1","type":"segment","chord":"G"},{"type":"bar"},{"note":"3. 2_ 1","type":"segment","chord":"C"},{"type":"bar"},{"note":"1 - -","type":"segment","chord":"G"}],[{"note":".5 1. 3_","type":"segment","chord":"G"},{"type":"bar"},{"note":"1_ 3_ 2 -","type":"segment","chord":"D"}],[{"note":".5 1. 3_","type":"segment","chord":"G"},{"type":"bar"},{"note":"1. 3_ 1'","type":"segment","chord":"C"},{"type":"bar"},{"note":"6 5 -","type":"segment","chord":"G"}],[{"note":"1. 3_ 1","type":"segment","chord":"D"},{"type":"bar"},{"note":"3_ 2_ 1 -","type":"segment","chord":"G"}]]}],"arrangement":[{"label":"Verse 1 (EN)","stanza":"A","syllables":["","","A","ma","zing","grace","how","sweet","the","sound","","","that","saved","a","wretch","like","me","","I","once","was","lost","but","now","am","found","","was","blind","but","now","I","see",""]},{"label":"ร้อง 1 (ไทย)","stanza":"A","syllables":["","","พระ","คุณ","ล้ำ","เลิศ","ประ","-เสริฐ","เกิน","คำ","","","ช่วย","คน","บาป","อย่าง","ฉัน","ไว้","","เคย","หลง","ทาง","ไกล","บัด","-นี้","กลับ","-มา","","เคย","มืด","บอด","นี้","ตา","เห็น",""]},{"label":"Verse 2 (EN)","stanza":"A","syllables":["","","'Twas","grace","that","taught","my","heart","to","fear","","","and","grace","my","fears","re","-lieved","","how","pre","-cious","did","that","grace","ap","-pear","","the","hour","I","first","be","-lieved",""]}],"copyright_note":{"words_en":"John Newton, 1779 — public domain worldwide.","tune":"New Britain (Virginia Harmony, 1835) — public domain.","words_th":"แปลไทยแบบร้องได้ แต่งขึ้นเองสำหรับทดสอบระบบ (มอบให้เป็นสาธารณะ / CC0). ไม่ใช้คำแปลไทยฉบับตีพิมพ์ใด ๆ เพื่อเลี่ยงลิขสิทธิ์ผู้แปล.","notation_note":"ทำนองบันทึกแบบ 1 พยางค์/1 โน้ต (syllabic) ตามที่ร้องในโบสถ์ทั่วไป — melisma (เอื้อนหลายเสียงต่อพยางค์) ของฉบับดั้งเดิมถูกทำให้เรียบเพื่อให้ตรงกับโมเดล v2 (1 พยางค์/attack note). ควรให้นักดนตรี (พี่เปา) ตรวจเสียงก่อนใช้จริง."}}$json$::jsonb
where not exists (
  select 1 from public.songs where category = 'anuchon' and number = 900
);

commit;

-- Verify (optional):
-- select number, title_en, verified, review_flags, content->'copyright_note'
-- from public.songs where category = 'anuchon' and number = 900;
