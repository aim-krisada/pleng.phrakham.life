// The approver's review queue — "อะไรเข้ามารอให้ฉันอนุมัติ".
//
// WHAT WAITS FOR AN APPROVER IS A DRAFT, NOT A SONG. The queue used to be read off
// `songs.verified === false`, which answers a different question: "which songs in the
// library has nobody ticked yet". Those are two different piles, and the `verified` pile
// never shrinks when a draft is approved (db/004-audit-log-events.sql:177 inserts the
// published row without the `verified` column), so a count taken from it can only grow.
// The real inbox is `song_drafts` with status `pending` — a person pressed "ส่งตรวจ" and
// is waiting for an answer.
//
// This file owns ONE thing: the predicate + the order. The landing chip's count and the
// editor's งานร่าง / รอตรวจ panel both go through it, so the number on the chip and the
// rows in the panel can never disagree (same discipline as bookshelf.unverifiedSongs
// for the `verified` badge).

// A draft is waiting for the approver only in `pending`: `draft` is still being typed,
// `rejected` went back to its author, `approved` is already published.
export const PENDING = 'pending'

// Newest submission first — matches the panel's `.order('updated_at', desc)` so the list
// reads the same wherever it is shown. `updated_at` is set by the drafts_updated_at trigger
// (db/002-draft-review-system.sql:52), so "ส่งตรวจ" is the latest touch on the row. Falls
// back to the id for rows with equal/missing timestamps, so the order is deterministic —
// the same defect B131 fixed for the song list (an unstable comparator relists the same
// items differently on each load).
function submittedDesc(a, b) {
  const ta = String(a.updated_at ?? '')
  const tb = String(b.updated_at ?? '')
  if (ta !== tb) return ta < tb ? 1 : -1
  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

// Every draft still waiting for an approver's decision. Defensive about the shape: a
// missing/failed query hands us undefined, and a null row must not throw the landing page.
export function pendingReview(drafts) {
  return (drafts || []).filter((d) => d && d.status === PENDING).sort(submittedDesc)
}
