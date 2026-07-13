// Audit log helpers — read + present "who did what to a song" (B028).
// The DB trigger (db/004-audit-log-events.sql) is the runtime source of truth; this file
// mirrors its event vocabulary for the UI and provides read/format helpers. Pure functions
// here are unit-tested in auditLog.test.js; the real trigger is tested in
// db/004-audit-log-events.test.js.

import { supabase } from '../supabase.js'
import { diffSongRows } from './diff.js'

// How a raw DB change maps to a MEANINGFUL event. Mirror of the SQL trigger's mapping
// table — keep the two in sync. Returns null when the change is not logged (draft discard).
export function classifyChange({ table, op, oldStatus, newStatus }) {
  if (table === 'song_drafts') {
    if (op === 'INSERT') return { event: 'create', hand: 'editor' }
    if (op === 'DELETE') return null // discard — outside the approved event set
    if (oldStatus !== newStatus) {
      if (newStatus === 'pending') return { event: 'submit', hand: 'editor' }
      if (newStatus === 'approved') return { event: 'approve_publish', hand: 'approver' }
      if (newStatus === 'rejected') return { event: 'reject', hand: 'approver' }
    }
    return { event: 'edit', hand: 'editor' }
  }
  // songs (published library)
  if (op === 'INSERT') return { event: 'approve_publish', hand: 'approver' }
  if (op === 'UPDATE') return { event: 'edit_published', hand: 'approver' }
  return { event: 'unpublish', hand: 'approver' }
}

// Thai label + icon + which hand, per event. `hand` here drives the editor/approver colour.
export const EVENT_META = {
  create: { label: 'สร้างร่าง', icon: 'file-plus', hand: 'editor' },
  edit: { label: 'แก้ร่าง', icon: 'pencil', hand: 'editor' },
  submit: { label: 'ส่งตรวจ', icon: 'send', hand: 'editor' },
  approve_publish: { label: 'อนุมัติและเผยแพร่', icon: 'badge-check', hand: 'approver' },
  reject: { label: 'ตีกลับให้แก้', icon: 'undo-2', hand: 'approver' },
  edit_published: { label: 'แก้เพลงในคลัง', icon: 'pencil', hand: 'approver' },
  unpublish: { label: 'ถอนออกจากคลัง', icon: 'trash-2', hand: 'approver' },
}

export function eventMeta(event) {
  return EVENT_META[event] || { label: event || 'เปลี่ยนแปลง', icon: 'circle', hand: 'editor' }
}

// Who did it — ALWAYS prefer the snapshot taken at write time (actor_name), so a renamed
// or deleted profile never erases the name. The live profiles map is a fallback only for
// pre-004 rows that have no snapshot.
export function actorLabel(row, profilesMap = {}) {
  return (
    row.actor_name ||
    profilesMap[row.actor_id] ||
    profilesMap[row.editor_id] ||
    'ไม่ทราบชื่อ'
  )
}

// Human-readable summary of what changed, from the full before/after snapshots
// (falls back to the legacy old_row/new_row columns for pre-004 rows).
export function rowDiff(row) {
  const before = row.before ?? row.old_row ?? null
  const after = row.after ?? row.new_row ?? null
  if (!before && !after) return [] // nothing snapshotted for this row (e.g. status-only)
  return diffSongRows(before, after)
}

// When several rows share an op_group they are ONE logical event (e.g. approve+publish
// writes a songs row AND flips the draft). Collapse them to a single entry and show the
// most meaningful event. Input must be newest-first; output stays newest-first.
const EVENT_RANK = [
  'approve_publish',
  'unpublish',
  'edit_published',
  'reject',
  'submit',
  'edit',
  'create',
]
function primaryEvent(events) {
  for (const e of EVENT_RANK) if (events.includes(e)) return e
  return events[0]
}

export function collapseOpGroups(rows) {
  const out = []
  const at = new Map() // op_group -> index in out
  for (const r of rows) {
    if (r.op_group && at.has(r.op_group)) {
      out[at.get(r.op_group)].members.push(r)
      continue
    }
    if (r.op_group) at.set(r.op_group, out.length)
    out.push({ ...r, members: [r] })
  }
  return out.map((entry) => {
    if (entry.members.length === 1) return entry
    const events = entry.members.map((m) => m.event)
    const ev = primaryEvent(events)
    // pick the representative row for this event; prefer the published-song copy so the
    // before/after diff reflects what actually went into the library
    const rep =
      entry.members.find((m) => m.event === ev && m.entity === 'song') ||
      entry.members.find((m) => m.event === ev) ||
      entry.members[0]
    return {
      ...entry,
      event: ev,
      hand: rep.hand,
      entity: rep.entity,
      before: rep.before ?? rep.old_row ?? null,
      after: rep.after ?? rep.new_row ?? null,
      actor_name: rep.actor_name,
      actor_id: rep.actor_id,
      note: entry.members.map((m) => m.note).find(Boolean) || null,
    }
  })
}

// Load the full timeline of one song (draft rows + published rows), newest-first, with
// op_groups collapsed. Pass songId for a published song, draftId for a not-yet-published
// draft, or both. `client` is injectable for tests.
export async function loadSongHistory({ songId = null, draftId = null } = {}, client = supabase) {
  const refs = new Set()
  if (songId) refs.add(songId)
  if (draftId) refs.add(draftId)
  // a new song's early draft rows are keyed by the draft id (song_id was null then);
  // pull the linked draft ids so the whole timeline unifies without a schema bridge
  if (songId) {
    const { data: drafts } = await client
      .from('song_drafts')
      .select('id')
      .eq('song_id', songId)
    for (const d of drafts ?? []) refs.add(d.id)
  }
  if (!refs.size) return []
  const { data, error } = await client
    .from('song_revisions')
    .select('*')
    .in('song_ref', [...refs])
    .order('id', { ascending: false })
    .limit(100)
  if (error || !data) return []
  return collapseOpGroups(data)
}
