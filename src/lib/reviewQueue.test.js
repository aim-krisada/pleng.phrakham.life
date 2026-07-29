// The approver's inbox is a DRAFT queue, not a "songs nobody ticked" list. These tests pin
// the predicate (only `pending` waits for an approver) and the order (deterministic, newest
// submission first) — the two facts the landing chip's count and the editor panel share.
import { describe, it, expect } from 'vitest'
import { pendingReview, PENDING } from './reviewQueue.js'

// Minimal draft fixtures — only the fields the queue reads.
const d = (id, status, updated_at) => ({ id, status, updated_at, title_th: 'เพลง ' + id })

describe('pendingReview (approver review queue)', () => {
  it('keeps only drafts that were actually sent for review', () => {
    const rows = [
      d('a', 'draft', '2026-07-01'), // still being typed — nobody is waiting on the approver
      d('b', 'pending', '2026-07-02'),
      d('c', 'approved', '2026-07-03'), // already published
      d('d', 'rejected', '2026-07-04'), // sent back to its author
      d('e', 'pending', '2026-07-05'),
    ]
    expect(pendingReview(rows).map((x) => x.id)).toEqual(['e', 'b'])
  })

  it('counts drafts, NOT unverified published songs (the old, ever-growing source)', () => {
    // a song row carries `verified`; it is not a draft and must never reach this queue
    const rows = [{ id: 's1', verified: false }, d('p', 'pending', '2026-07-02')]
    expect(pendingReview(rows).map((x) => x.id)).toEqual(['p'])
  })

  it('orders newest submission first', () => {
    const rows = [d('old', 'pending', '2026-07-01'), d('new', 'pending', '2026-07-09'), d('mid', 'pending', '2026-07-05')]
    expect(pendingReview(rows).map((x) => x.id)).toEqual(['new', 'mid', 'old'])
  })

  it('is deterministic when timestamps tie or are missing (B131 defect class)', () => {
    const rows = [d('b2', 'pending', '2026-07-01'), d('a1', 'pending', '2026-07-01'), d('c3', 'pending', undefined)]
    const expected = pendingReview(rows).map((x) => x.id)
    expect(pendingReview([...rows].reverse()).map((x) => x.id)).toEqual(expected)
    // the tie is broken by id, so equal-timestamp rows read a1 before b2
    expect(expected.slice(0, 2)).toEqual(['a1', 'b2'])
  })

  it('never throws on a failed query or a null row', () => {
    expect(pendingReview(undefined)).toEqual([])
    expect(pendingReview(null)).toEqual([])
    expect(pendingReview([null, undefined])).toEqual([])
  })

  it('does not mutate the caller’s array', () => {
    const rows = [d('a', 'pending', '2026-07-01'), d('b', 'pending', '2026-07-09')]
    const before = rows.map((x) => x.id)
    pendingReview(rows)
    expect(rows.map((x) => x.id)).toEqual(before)
  })

  it('exports the status it gates on', () => {
    expect(PENDING).toBe('pending')
  })
})
