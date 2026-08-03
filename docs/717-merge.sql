-- ============================================================================
-- 717 MERGE — 717-1 + 717-2  →  one song #717 with TWO lyric sets
-- ⛔⛔ DO NOT RUN. This is a GUARDED SKETCH only. P'Aim runs it manually,
--    after review, in a transaction he can ROLLBACK. (memory: pleng-no-song-reimport)
--    session นี้ ⛔ ไม่แตะ DB · ไม่ bulk-write · ไม่รัน.
-- ============================================================================
--
-- Rows today (number=null on both — the "-" number workaround broke them):
--   717-1  id = b036d020...   (lyric set 1)
--   717-2  id = 99128d10...   (lyric set 2)
--
-- Target content (v2 · locked model docs/717-multi-lyric-scope.md):
--   { version:2, key, timeSignature, bpm,
--     lyricSets: [ {label:'ทำนอง ๑'}, {label:'ทำนอง ๒'} ],   -- >1 → viewer shows tabs
--     stanzas:  [ {id:'A', lines:[ <the ONE shared melody> ]} ],
--     arrangement: [ {stanza:'A', set:0, syllables:[…เนื้อ717-1…]},
--                    {stanza:'A', set:1, syllables:[…เนื้อ717-2…]} ] }
--
-- ── STEP 0 (do FIRST, read-only, NOT in this file) ─────────────────────────
-- A separate READ-ONLY session must:
--   (a) SELECT content FROM songs WHERE id IN ('b036d020…','99128d10…');
--   (b) migrateToV2() each → stanza + arrangement per row;
--   (c) ✅ VERIFY the two melodies are IDENTICAL via melodyLineSignature()
--       — ถ้าต่าง (จังหวะ/พยางค์ไม่ตรง) → ⛔ STOP, flag ให้คนทำเพลง ไม่เดา (N เตือน);
--   (d) hand P'Aim the FINAL <merged_content_jsonb> literal to paste below.
-- Do not guess the merged JSON here — it must come from the real row content.
--
-- ── STEP 1 (P'Aim runs, manually, with rollback ready) ─────────────────────
BEGIN;

-- guard 1 — both rows still exist and are still un-numbered (fail loud otherwise)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM songs
    WHERE id IN ('b036d020…REPLACE','99128d10…REPLACE') AND number IS NULL;
  IF n <> 2 THEN RAISE EXCEPTION '717 merge guard: expected 2 un-numbered rows, found %', n; END IF;
END $$;

-- guard 2 — #717 must be free (no other song already claims it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM songs WHERE number = 717) THEN
    RAISE EXCEPTION '717 merge guard: number 717 already taken';
  END IF;
END $$;

-- promote 717-1 into the merged 2-set song
UPDATE songs
   SET number  = 717,
       content = '<PASTE merged_content_jsonb from STEP 0>'::jsonb
 WHERE id = 'b036d020…REPLACE';

-- retire 717-2 (SOFT — never hard-delete; the exact archive mechanism must match the
-- real schema: a `status`/`archived_at`/`is_deleted` column, or move to an archive table.
-- STEP 0 confirms which one this DB uses; adjust the line below to it.)
UPDATE songs
   SET /* status = 'archived'  — TODO: match real schema */ number = NULL
 WHERE id = '99128d10…REPLACE';

-- ── verify BEFORE committing ───────────────────────────────────────────────
-- SELECT id, number, jsonb_array_length(content->'lyricSets') AS sets
--   FROM songs WHERE id IN ('b036d020…REPLACE','99128d10…REPLACE');
-- expect: b036d020 → number 717, sets = 2 ;  99128d10 → archived
--
-- ✅ ถ้าถูก:  COMMIT;
-- ↩️ ถ้าผิด:  ROLLBACK;
ROLLBACK;   -- ⛔ default = ROLLBACK. เปลี่ยนเป็น COMMIT เมื่อ P'Aim ตรวจแล้วเท่านั้น.
