-- 007 — Back-fill songs.author_id with the true WRITER for already-published songs.
-- ⛔ QUEUE + OPT-IN: run only after 006, and only if P'Aim wants historical rows corrected.
--    LOW urgency: songs.author_id is NOT read anywhere in the app today (the UI reads
--    song_drafts.author_id + the audit snapshot song_revisions.actor_name, both already
--    correct). This is DATA-INTEGRITY / future-proofing, not a user-visible fix.
--
-- BUG (fixed forward by 006): approve_and_publish wrote author_id = auth.uid() (approver)
-- for new songs, so every song published through the approve flow credits the approver.
--
-- RECOVERY SOURCE: the draft that produced the song still exists and its author_id is the
-- writer (set at INSERT, never overwritten). approve_and_publish set draft.song_id = the
-- published id, so we can join them. Where a song was NOT published through a draft (bulk
-- import — e.g. the 120-song YS batch, hymnal), there is no "writer" to recover → LEAVE AS IS
-- (do not null it). Only touch rows where a linkable draft author exists AND differs.
--
-- AUDIT: this UPDATE fires songs_audit (004) → one 'edit_published' row per corrected song
-- (actor = whoever runs this). That is intended + transparent (before/after shows only
-- author_id changed). We do NOT disable the trigger — 004 forbids bypassing the audit log
-- (ISO 27001 A.12.4). The batch is identifiable by its common timestamp.

-- --- Pre-flight: measure the blast radius FIRST (run, read, decide) ---
--   with writer as (
--     select d.song_id, min(d.created_at) as first_at,
--            (array_agg(d.author_id order by d.created_at))[1] as author_id
--     from public.song_drafts d
--     where d.song_id is not null and d.author_id is not null
--     group by d.song_id
--   )
--   select
--     count(*) filter (where s.author_id is distinct from w.author_id) as will_fix,
--     count(*)                                                          as songs_with_draft,
--     (select count(*) from public.songs)                              as songs_total
--   from public.songs s join writer w on w.song_id = s.id;

-- --- The back-fill (idempotent — re-running changes nothing once correct) ---
with writer as (
  -- the ORIGINAL draft author per published song (earliest draft = the create)
  select d.song_id,
         (array_agg(d.author_id order by d.created_at))[1] as author_id
  from public.song_drafts d
  where d.song_id is not null and d.author_id is not null
  group by d.song_id
)
update public.songs s
   set author_id = w.author_id
  from writer w
 where w.song_id = s.id
   and s.author_id is distinct from w.author_id;   -- only actually-wrong rows

-- --- Verify after ---
--   select count(*) from public.songs s
--   join public.song_drafts d on d.song_id = s.id
--   where s.author_id is distinct from d.author_id;   -- expect 0 for single-draft songs

-- NOTE: songs with no draft keep their existing author_id (nothing to recover). If P'Aim
-- later wants those attributed too, the only other source is song_revisions actor_id of the
-- 'create' event — but for bulk-imported songs that event is the importer, not a "writer",
-- so leaving them is the honest choice.
