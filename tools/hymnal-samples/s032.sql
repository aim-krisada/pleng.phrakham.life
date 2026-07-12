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
-- SAFE + IDEMPOTENT (same pattern as insert-amazing-grace.sql):
--   * Target slot: category='lem-yai', number=32. If that slot already holds a
--     DIFFERENT song the script ABORTS (never overwrites).
--   * Re-runnable: UPDATE in place if already there, else INSERT.
--   * verified = false  (human must check lyrics vs the scanned page).
--   * review_flags = ["melody-empty","unverified-import"]  (team adds melody in
--     the B083 editor; migrate v1→v2 there).
-- ============================================================================

begin;

-- 1. Safety guard — refuse to clobber a different song in this slot.
do $$
begin
  if exists (
    select 1 from public.songs
    where category = 'lem-yai' and number = 32
      and coalesce(title_th, '') <> 'นมัสการพระบิดา'
  ) then
    raise exception 'slot lem-yai/32 is occupied by a different song — resolve before re-running';
  end if;
end $$;

-- 2a. Update in place (re-run path).
update public.songs set
  title_th     = 'นมัสการพระบิดา',
  title_en     = null,
  theme        = null,
  verified     = false,
  scripture    = null,
  book_refs    = '[]'::jsonb,
  review_flags = '["melody-empty","unverified-import"]'::jsonb,
  content      = $json${"version":1,"key":"C","credits":{"music":"Henry T. Smart","words":"P. Van den Berg (fr. Dutch)"},"tempo":"Moderato","subtitles":["การกำหนดล่วงหน้าของพระองค์","การไถ่ของพระองค์"],"source":{"book":"บทเพลงสรรเสริญ (ฉบับปรับปรุงครั้งที่ 2, ค.ศ. 2003)","number":32,"pdfPage":20,"bookPage":32},"lines":[[{"type":"label","text":"การกำหนดล่วงหน้าของพระองค์"}],[{"type":"section","name":"ร้อง 1"}],[{"type":"segment","note":"","chord":"","lyric":"สรรเสริญพระบิดาราศี, ข้าเป็นคู่หมายพระคุณ,"}],[{"type":"segment","note":"","chord":"","lyric":"บัดนี้เพื่อพระทัยเปรมปรีดิ์, ร่วมสรรเสริญพระการุณย์,"}],[{"type":"segment","note":"","chord":"","lyric":"ในนิรันดร์กาล, บุตรทั้งหลาย, ให้เข้าราศีวิไล,"}],[{"type":"segment","note":"","chord":"","lyric":"ร่วมกับพระคริสต์บุตรที่รัก, เป็นคู่เคียงสุดสูงศักดิ์."}],[{"type":"section","name":"ร้อง 2"}],[{"type":"segment","note":"","chord":"","lyric":"ทรงเลือกข้าก่อนสร้างโลกา ให้วิสุทธิ์ทั่วกายา"}],[{"type":"segment","note":"","chord":"","lyric":"กำหนดเราได้พระคุณนี้ เป็นทรัพย์ประเสริฐราศี"}],[{"type":"segment","note":"","chord":"","lyric":"เพื่อส่วนสิทธิแห่งบุตรา ทรงหมายข้าไว้ล่วงหน้า"}],[{"type":"segment","note":"","chord":"","lyric":"จนกว่าเติบโตเป็นผู้ใหญ่ รับพรตามน้ำพระทัย"}],[{"type":"section","name":"ร้อง 3"}],[{"type":"segment","note":"","chord":"","lyric":"ตามพระดำรินิรันดร์กาล เรียกโดยพระคุณโปรดปราน"}],[{"type":"segment","note":"","chord":"","lyric":"ให้มีชีวิตพระองค์เจ้า ขจัดบาปหายเกลี้ยงเกลา"}],[{"type":"segment","note":"","chord":"","lyric":"พระวิญญาณมาเป็นตราหมาย หล่อเลี้ยงด้วยสิ่งทั้งหลาย"}],[{"type":"segment","note":"","chord":"","lyric":"ข้าเป็นของพระองค์สืบไป รับสุขสมบูรณ์มากมาย"}],[{"type":"label","text":"การไถ่ของพระองค์"}],[{"type":"section","name":"ร้อง 4"}],[{"type":"segment","note":"","chord":"","lyric":"โอ นอกจากพระบิดาเจ้า ใครอาจให้พรแก่เรา"}],[{"type":"segment","note":"","chord":"","lyric":"ให้ข้ามีส่วนพระวิญญาณ พระคุณชีวิตซาบซ่าน?"}],[{"type":"segment","note":"","chord":"","lyric":"จะมีราศีไม่ช้านาน กับพระองค์นิรันดร์กาล"}],[{"type":"segment","note":"","chord":"","lyric":"เราร่วมเป็นอยู่เบื้องพระพักตร์ ฉายาราศีประจักษ์!"}]]}$json$::jsonb
where category = 'lem-yai' and number = 32;

-- 2b. Otherwise insert (first-run path).
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
