-- ============================================================================
-- song-overwrite-template.sql — REPLACE a song that is already in the library.
--
-- ⚠️ This is the only file in the repo allowed to overwrite a song, and it is
--    kept separate from tools/song-import-template.sql on purpose: importing a
--    song must never be able to overwrite one by accident.
--
-- Run it ONLY after STEP 1 of the import template showed you what is in that
-- slot. It refuses unless the row is still EXACTLY the one you looked at — you
-- paste back the ชื่อเดิม and the ลายนิ้วมือแถวเดิม (md5) you saw there. If anyone
-- edited the song in between, the fingerprint no longer matches and this aborts,
-- changing nothing. That is the whole point.
--
-- The fingerprint covers title_th + title_en + content together, so an overwrite
-- cannot quietly blank a field you were not looking at.
--
-- Note on the fingerprint: jsonb normalises key order, whitespace and unicode
-- escapes, so the md5 is stable for the same content (verified against Postgres).
-- The one case where it differs for logically-equal JSON is a number written
-- `1` vs `1.0` — and that errs on the side of REFUSING, never of overwriting.
--
-- กู้คืน: public.song_revisions เก็บของเดิมไว้ทุกครั้ง (db/002) — but look before
-- you overwrite; do not lean on the net.
--
-- Fill in: <CATEGORY> <NUMBER> <TITLE_TH> <TITLE_EN> <CONTENT JSON>
--          <OLD_TITLE> <OLD_FINGERPRINT>   ← both copied from STEP 1's result
-- ============================================================================

begin;

do $$
declare hit int;
begin
  update public.songs set
    title_th = '<TITLE_TH>',
    title_en = <TITLE_EN>::text,
    content  = $json$<CONTENT JSON on one line>$json$::jsonb,
    verified = false
  where category is not distinct from '<CATEGORY>'
    and number   = <NUMBER>
    and title_th = '<OLD_TITLE>'
    and md5(coalesce(title_th, '') || '␟' ||
            coalesce(title_en, '') || '␟' || content::text) = '<OLD_FINGERPRINT>';

  get diagnostics hit = row_count;
  if hit <> 1 then
    raise exception '⛔ แถวเปลี่ยนไปแล้ว (หรือไม่มี) — มีคนแก้เพลงนี้หลังจากที่คุณดู · ไม่ได้เขียนทับอะไรเลย. รันขั้นที่ 1 ใหม่ ดูของเดิมอีกที แล้วค่อยตัดสินใจ (แถวที่ตรง = %)', hit;
  end if;
end $$;

commit;
