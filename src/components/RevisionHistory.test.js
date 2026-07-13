// B028 — RevisionHistory panel: renders the timeline, colours each hand, shows the
// snapshot name even with no profiles map, and emits restore. loadSongHistory is mocked;
// the pure helpers (eventMeta/actorLabel/rowDiff) run for real.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const history = vi.fn()
vi.mock('../lib/auditLog.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, loadSongHistory: (...a) => history(...a) }
})

import RevisionHistory from './RevisionHistory.vue'

const mountIt = (props) =>
  mount(RevisionHistory, { props, global: { stubs: { Icon: true } } })

beforeEach(() => history.mockReset())

describe('RevisionHistory', () => {
  it('shows the empty state when there is no history', async () => {
    history.mockResolvedValue([])
    const w = mountIt({ songId: 'song-1' })
    await flushPromises()
    expect(w.text()).toContain('ยังไม่มีประวัติ')
  })

  it('renders each entry with its event label and colours the hand', async () => {
    history.mockResolvedValue([
      { id: 3, event: 'approve_publish', actor_name: 'พี่เปา', created_at: '2026-07-13T03:00:00Z', after: { title_th: 'x' } },
      { id: 2, event: 'submit', actor_name: 'น้องเอ', created_at: '2026-07-13T02:00:00Z' },
      { id: 1, event: 'create', actor_name: 'น้องเอ', created_at: '2026-07-13T01:00:00Z' },
    ])
    const w = mountIt({ songId: 'song-1' })
    await flushPromises()
    const text = w.text()
    expect(text).toContain('อนุมัติและเผยแพร่')
    expect(text).toContain('ส่งตรวจ')
    expect(text).toContain('สร้างร่าง')
    // approver row is coloured differently from editor rows
    expect(w.findAll('.rev-item.hand-approver')).toHaveLength(1)
    expect(w.findAll('.rev-item.hand-editor')).toHaveLength(2)
  })

  it('shows the snapshot name even when no profiles map is given (P\'Aim #4)', async () => {
    history.mockResolvedValue([{ id: 1, event: 'create', actor_name: 'พี่เปา', created_at: '2026-07-13T01:00:00Z' }])
    const w = mountIt({ songId: 'song-1' })
    await flushPromises()
    expect(w.text()).toContain('พี่เปา')
  })

  it('shows the reject reason (note)', async () => {
    history.mockResolvedValue([
      { id: 1, event: 'reject', actor_name: 'พี่เปา', note: 'แก้คีย์ก่อน', created_at: '2026-07-13T01:00:00Z' },
    ])
    const w = mountIt({ songId: 'song-1' })
    await flushPromises()
    expect(w.text()).toContain('แก้คีย์ก่อน')
  })

  it('offers restore only to approvers, and only on rows with an after-snapshot', async () => {
    const rows = [
      { id: 2, event: 'edit_published', actor_name: 'พี่เปา', after: { title_th: 'y' }, created_at: '2026-07-13T02:00:00Z' },
      { id: 1, event: 'submit', actor_name: 'น้องเอ', created_at: '2026-07-13T01:00:00Z' }, // no after
    ]
    history.mockResolvedValue(rows)
    // not an approver -> no restore buttons
    let w = mountIt({ songId: 'song-1', canRestore: false })
    await flushPromises()
    expect(w.findAll('.rev-restore')).toHaveLength(0)
    // approver -> one restore button (only the row with an after)
    w = mountIt({ songId: 'song-1', canRestore: true })
    await flushPromises()
    const btns = w.findAll('.rev-restore')
    expect(btns).toHaveLength(1)
    await btns[0].trigger('click')
    expect(w.emitted('restore')[0][0].event).toBe('edit_published')
  })

  it('does not query when there is nothing to identify the song', async () => {
    mountIt({})
    await flushPromises()
    expect(history).not.toHaveBeenCalled()
  })
})
