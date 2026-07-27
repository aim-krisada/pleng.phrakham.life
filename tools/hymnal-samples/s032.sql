-- ============================================================================
-- s032.sql — REFERENCE import: hymnal "บทเพลงสรรเสริญ" song #32 "นมัสการพระบิดา"
-- Source book: บทเพลงสรรเสริญ (ฉบับปรับปรุงครั้งที่ 2, ค.ศ. 2003 · ห้องสมุดกิตติคุณกรุงเทพฯ)
-- Run by P'Aim (approver) in the Supabase SQL Editor. Claude/DA does NOT run this.
--
-- ✅ APPROVED to run — P'Aim 11 ก.ค.: import ONLY song 32 for พี่เปา to review first.
--   * category = 'lem-yai' (book "เล่มใหญ่" = บทเพลงสรรเสริญ) — its own slot, never
--     collides with 'anuchon' (that book's #32 is a different song).
--   * storage = LYRICS-ONLY v1 (viewable now, melody empty for the team to add).
--
-- ⚠️ FIXED 27 ก.ค. — this file used to guard on `title_th` ALONE and then UPDATE the
--    whole row. Same title + edited content (พี่เปา fixing the melody) = the edit was
--    overwritten SILENTLY. It is now add-only, like tools/song-import-template.sql:
--    if the slot holds anything that is not byte-for-byte this song, it writes NOTHING
--    and raises. To replace it on purpose use tools/song-overwrite-template.sql.
--
-- SAFE + IDEMPOTENT:
--   * Target slot: category='lem-yai', number=32. If that slot already holds a
--     DIFFERENT song (or the SAME song with edits) the script ABORTS, writing nothing.
--   * Re-runnable: identical re-run is a no-op.
--   * verified = false  (human must check lyrics vs the scanned page).
--   * review_flags = ["melody-empty","unverified-import"]  (team adds melody in
--     the B083 editor; migrate v1→v2 there).
-- ============================================================================

begin;

-- 1. Safety guard — refuse to touch this slot unless it is free, or already holds
--    EXACTLY this song. "Same title" is not good enough: the content must match too,
--    otherwise an edit made after the first import would be overwritten silently.
do $$
begin
  if exists (
    select 1 from public.songs
    where category = 'lem-yai' and number = 32
      and (coalesce(title_th, '') <> 'นมัสการพระบิดา'
           or content is distinct from $json${"version":1,"key":"C","credits":{"music":"Henry T. Smart","words":"P. Van den Berg (fr. Dutch)"},"tempo":"Moderato","subtitles":["การกำหนดล่วงหน้าของพระองค์","การไถ่ของพระองค์"],"source":{"book":"บทเพลงสรรเสริญ (ฉบับปรับปรุงครั้งที่ 2, ค.ศ. 2003)","number":32,"pdfPage":20,"bookPage":32},"lines":[[{"type":"label","text":"การกำหนดล่วงหน้าของพระองค์"}],[{"type":"section","name":"ร้อง 1"}],[{"type":"segment","note":"","chord":"","lyric":"สรรเสริญพระบิดาราศี, ข้าเป็นคู่หมายพระคุณ,"}],[{"type":"segment","note":"","chord":"","lyric":"บัดนี้เพื่อพระทัยเปรมปรีดิ์, ร่วมสรรเสริญพระการุณย์,"}],[{"type":"segment","note":"","chord":"","lyric":"ในนิรันดร์กาล, บุตรทั้งหลาย, ให้เข้าราศีวิไล,"}],[{"type":"segment","note":"","chord":"","lyric":"ร่วมกับพระคริสต์บุตรที่รัก, เป็นคู่เคียงสุดสูงศักดิ์."}],[{"type":"section","name":"ร้อง 2"}],[{"type":"segment","note":"","chord":"","lyric":"ทรงเลือกข้าก่อนสร้างโลกา ให้วิสุทธิ์ทั่วกายา"}],[{"type":"segment","note":"","chord":"","lyric":"กำหนดเราได้พระคุณนี้ เป็นทรัพย์ประเสริฐราศี"}],[{"type":"segment","note":"","chord":"","lyric":"เพื่อส่วนสิทธิแห่งบุตรา ทรงหมายข้าไว้ล่วงหน้า"}],[{"type":"segment","note":"","chord":"","lyric":"จนกว่าเติบโตเป็นผู้ใหญ่ รับพรตามน้ำพระทัย"}],[{"type":"section","name":"ร้อง 3"}],[{"type":"segment","note":"","chord":"","lyric":"ตามพระดำรินิรันดร์กาล เรียกโดยพระคุณโปรดปราน"}],[{"type":"segment","note":"","chord":"","lyric":"ให้มีชีวิตพระองค์เจ้า ขจัดบาปหายเกลี้ยงเกลา"}],[{"type":"segment","note":"","chord":"","lyric":"พระวิญญาณมาเป็นตราหมาย หล่อเลี้ยงด้วยสิ่งทั้งหลาย"}],[{"type":"segment","note":"","chord":"","lyric":"ข้าเป็นของพระองค์สืบไป รับสุขสมบูรณ์มากมาย"}],[{"type":"label","text":"การไถ่ของพระองค์"}],[{"type":"section","name":"ร้อง 4"}],[{"type":"segment","note":"","chord":"","lyric":"โอ นอกจากพระบิดาเจ้า ใครอาจให้พรแก่เรา"}],[{"type":"segment","note":"","chord":"","lyric":"ให้ข้ามีส่วนพระวิญญาณ พระคุณชีวิตซาบซ่าน?"}],[{"type":"segment","note":"","chord":"","lyric":"จะมีราศีไม่ช้านาน กับพระองค์นิรันดร์กาล"}],[{"type":"segment","note":"","chord":"","lyric":"เราร่วมเป็นอยู่เบื้องพระพักตร์ ฉายาราศีประจักษ์!"}]]}$json$::jsonb)
  ) then
    raise exception '⛔ ช่อง lem-yai/32 มีเพลงอื่น (หรือเพลงนี้ที่ถูกแก้ไปแล้ว) อยู่ — ไม่ได้เขียนทับอะไรเลย. ถ้าตั้งใจจะทับ ใช้ tools/song-overwrite-template.sql';
  end if;
end $$;

-- 2. Insert — add-only. The guard above already proved the slot is free or holds
--    exactly this song, so `where not exists` makes a re-run a clean no-op.
insert into public.songs
  (number, title_th, title_en, category, theme, verified, scripture, book_refs, review_flags, content)
select
  32, 'นมัสการพระบิดา', null, 'lem-yai', null, false,
  null, '[]'::jsonb, '["melody-empty","unverified-import"]'::jsonb, $json${"version":1,"key":"C","credits":{"music":"Henry T. Smart","words":"P. Van den Berg (fr. Dutch)"},"tempo":"Moderato","subtitles":["การกำหนดล่วงหน้าของพระองค์","การไถ่ของพระองค์"],"source":{"book":"บทเพลงสรรเสริญ (ฉบับปรับปรุงครั้งที่ 2, ค.ศ. 2003)","number":32,"pdfPage":20,"bookPage":32},"lines":[[{"type":"label","text":"การกำหนดล่วงหน้าของพระองค์"}],[{"type":"section","name":"ร้อง 1"}],[{"type":"segment","note":"","chord":"","lyric":"สรรเสริญพระบิดาราศี, ข้าเป็นคู่หมายพระคุณ,"}],[{"type":"segment","note":"","chord":"","lyric":"บัดนี้เพื่อพระทัยเปรมปรีดิ์, ร่วมสรรเสริญพระการุณย์,"}],[{"type":"segment","note":"","chord":"","lyric":"ในนิรันดร์กาล, บุตรทั้งหลาย, ให้เข้าราศีวิไล,"}],[{"type":"segment","note":"","chord":"","lyric":"ร่วมกับพระคริสต์บุตรที่รัก, เป็นคู่เคียงสุดสูงศักดิ์."}],[{"type":"section","name":"ร้อง 2"}],[{"type":"segment","note":"","chord":"","lyric":"ทรงเลือกข้าก่อนสร้างโลกา ให้วิสุทธิ์ทั่วกายา"}],[{"type":"segment","note":"","chord":"","lyric":"กำหนดเราได้พระคุณนี้ เป็นทรัพย์ประเสริฐราศี"}],[{"type":"segment","note":"","chord":"","lyric":"เพื่อส่วนสิทธิแห่งบุตรา ทรงหมายข้าไว้ล่วงหน้า"}],[{"type":"segment","note":"","chord":"","lyric":"จนกว่าเติบโตเป็นผู้ใหญ่ รับพรตามน้ำพระทัย"}],[{"type":"section","name":"ร้อง 3"}],[{"type":"segment","note":"","chord":"","lyric":"ตามพระดำรินิรันดร์กาล เรียกโดยพระคุณโปรดปราน"}],[{"type":"segment","note":"","chord":"","lyric":"ให้มีชีวิตพระองค์เจ้า ขจัดบาปหายเกลี้ยงเกลา"}],[{"type":"segment","note":"","chord":"","lyric":"พระวิญญาณมาเป็นตราหมาย หล่อเลี้ยงด้วยสิ่งทั้งหลาย"}],[{"type":"segment","note":"","chord":"","lyric":"ข้าเป็นของพระองค์สืบไป รับสุขสมบูรณ์มากมาย"}],[{"type":"label","text":"การไถ่ของพระองค์"}],[{"type":"section","name":"ร้อง 4"}],[{"type":"segment","note":"","chord":"","lyric":"โอ นอกจากพระบิดาเจ้า ใครอาจให้พรแก่เรา"}],[{"type":"segment","note":"","chord":"","lyric":"ให้ข้ามีส่วนพระวิญญาณ พระคุณชีวิตซาบซ่าน?"}],[{"type":"segment","note":"","chord":"","lyric":"จะมีราศีไม่ช้านาน กับพระองค์นิรันดร์กาล"}],[{"type":"segment","note":"","chord":"","lyric":"เราร่วมเป็นอยู่เบื้องพระพักตร์ ฉายาราศีประจักษ์!"}]]}$json$::jsonb
where not exists (
  select 1 from public.songs where category = 'lem-yai' and number = 32
);

commit;

-- Verify (optional):
-- select number, title_th, verified, review_flags, jsonb_array_length(content->'lines') as lines
-- from public.songs where category = 'lem-yai' and number = 32;
