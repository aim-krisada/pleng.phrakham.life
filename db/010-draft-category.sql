-- 010 — Give song_drafts its own category/theme (B108 "หมวดหาย").
-- Run once in the Supabase SQL Editor, AFTER 002/003/004 (independent of 005-009).
--
-- ℹ️ NUMBERING: the PM brief said "008". 008 (notifications) and 009 (security-hardening)
--    already exist on other, unmerged branches, so this is 010 — the next free number — to
--    avoid two different files claiming the same migration number.
--
-- WHY: `category` (หมวด = which เล่ม a song belongs to) and `theme` (ธีม) are columns on
-- `songs` only. `song_drafts` has never had them, so a หมวด chosen while writing a NEW song is
-- dropped the moment the draft is saved, and reopening that draft shows the editor's fallback
-- ('อนุชน') instead of what the author picked. Publishing then wrote that fallback to `songs`,
-- silently re-filing songs out of เล่มใหญ่ / เด็กเล็ก into อนุชน.
--
-- The client-side half of the fix (this round) already stops the overwrite: for a draft OF AN
-- EXISTING song the editor reads the real หมวด/ธีม off the published row, and neither publish
-- path writes a guessed value over a stored one. What it still cannot do is carry a หมวด
-- through a draft of a brand-NEW song — there is no published row to read it back from. These
-- two columns close that last gap.
--
-- SAFETY: additive only. Both columns are nullable, no default, no backfill — every existing
-- draft row keeps working unchanged and null simply means "not recorded" (exactly today's
-- behaviour). Nothing is dropped, renamed, or re-typed. `add column if not exists` makes it
-- idempotent, so it is safe to re-run.
--
-- PERMISSIONS: unchanged on purpose. song_drafts already has row level security enabled with
-- its four policies from 002 ("Read own drafts or all as approver", "Insert own drafts",
-- "Update own or as approver", "Delete own or as approver"). Those are table-scoped, so the new
-- columns inherit exactly the same access — no new policy and no grant is needed here.
--
-- AUDIT: log_song_event() (004) snapshots whole rows via to_jsonb(new/old), so the new columns
-- appear in the revision history automatically. No trigger change.
--
-- ⚠️ ORDER MATTERS: the application code does NOT write these columns yet. Run this SQL FIRST;
--    the follow-up code change (draftRow() sends category/theme, applyRow() reads them back)
--    ships after, so the client can never write to a column that does not exist.
--    See docs/reports/fix-draft-category.md § "Phase 1 — after SQL".

alter table public.song_drafts
  add column if not exists category text,   -- book code: 'lem-yai' | 'anuchon' | 'dek-lek' (null = not recorded)
  add column if not exists theme    text;   -- one of the 8 library themes (null = not recorded)

comment on column public.song_drafts.category is
  'หมวด (book) chosen while drafting. Copied to songs.category on publish. Null = not recorded.';
comment on column public.song_drafts.theme is
  'ธีม chosen while drafting. Copied to songs.theme on publish. Null = not recorded.';

-- --- Verify (run after) ---
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'song_drafts'
--     and column_name in ('category', 'theme');
