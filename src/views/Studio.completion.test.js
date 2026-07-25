// BI-007 — the inline completion-flow WIRING through the real Studio shell: which table each tier
// action writes (approver→songs · editor→song_drafts pending · draft→draft), auto-save on a pause,
// withdraw, and picking up a song's open-draft status on load so the stepper survives a reload.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'

const h = vi.hoisted(() => ({
  route: null, push: null, songRow: null, openDraftRows: [],
  draftInserted: [], draftUpdated: [], songUpdated: [], songInserted: [],
}))

vi.mock('vue-router', () => ({
  useRoute: () => h.route,
  useRouter: () => ({ push: h.push }),
  onBeforeRouteLeave: () => {},
}))
vi.mock('../lib/midi.js', () => ({
  playSong: vi.fn(() => new Promise(() => {})),
  playEnsemble: vi.fn(() => new Promise(() => {})),
  stopPlayback: () => {},
  setTranspose: () => {},
  keyTranspose: () => 0,
  songToNotes: () => [],
  buildPlayNotes: () => [],
  effectiveOrder: () => undefined,
  TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
}))
vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = { _table: table, _payload: null }
    for (const m of ['select', 'order', 'eq', 'in', 'limit', 'delete']) q[m] = () => q
    q.insert = (row) => { q._payload = row; (table === 'songs' ? h.songInserted : h.draftInserted).push(row); return q }
    q.update = (row) => { q._payload = row; (table === 'songs' ? h.songUpdated : h.draftUpdated).push(row); return q }
    q.single = () => Promise.resolve(q._payload ? { data: { id: 'song-1' }, error: null } : { data: table === 'songs' ? h.songRow : null, error: null })
    q.then = (res) => Promise.resolve({ data: table === 'song_drafts' && !q._payload ? h.openDraftRows : [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (t) => makeQuery(t),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  }
})

import Studio from './Studio.vue'
import { session, legacy, profile } from '../store.js'

const CONTENT = () => ({
  version: 2, key: 'C', timeSignature: '4/4', bpm: 92,
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }],
  arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['ก', 'ข'] }],
})
const ROW = () => ({ id: 'song-1', number: 141, title_th: 'โอ พระเยซู', title_en: null, category: 'anuchon', theme: 'ประสบการณ์', content: CONTENT() })

const stubs = {
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'displayKey'], template: '<div class="stub-sheet" />' },
  SingTransport: { name: 'SingTransport', template: '<div class="stub-dock" />' },
  NoteInputBar: { name: 'NoteInputBar', template: '<div class="stub-inputbar" />' },
}

async function mountEditing({ approver }) {
  const w = mount(Studio, { global: { stubs } })
  await nextTick(); await nextTick(); await nextTick()
  session.value = { user: { id: 'u1' } }
  legacy.value = approver
  profile.value = approver ? { role: 'approver' } : { role: 'editor' }
  await nextTick()
  await w.find('.sv-fab').trigger('click')
  await nextTick()
  return w
}
const viewer = (w) => w.findComponent({ name: 'SongViewer' })

beforeEach(() => {
  h.route = reactive({ params: { id: 'song-1' }, query: {} })
  h.push = vi.fn()
  h.songRow = ROW()
  h.openDraftRows = []
  h.draftInserted = []; h.draftUpdated = []; h.songUpdated = []; h.songInserted = []
  session.value = null; legacy.value = false; profile.value = null
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  window.matchMedia = window.matchMedia || (() => ({ matches: false }))
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
})

describe('BI-007 — completion-flow wiring through the shell', () => {
  it('approver "เผยแพร่" → UPDATE the public `songs` row (not a draft)', async () => {
    const w = await mountEditing({ approver: true })
    await viewer(w).vm.$emit('save', 'publish')
    await nextTick(); await nextTick(); await nextTick()
    expect(h.songUpdated).toHaveLength(1)
    expect(h.songUpdated[0].title_th).toBe('โอ พระเยซู')
    expect(h.draftInserted).toHaveLength(0)
  })

  it('editor "ส่งตรวจ" → a song_drafts row at status=pending', async () => {
    const w = await mountEditing({ approver: false })
    await viewer(w).vm.$emit('save', 'pending')
    await nextTick(); await nextTick(); await nextTick()
    expect(h.songUpdated).toHaveLength(0)
    expect(h.draftInserted).toHaveLength(1)
    expect(h.draftInserted[0].status).toBe('pending')
  })

  it('บันทึกร่าง stays a plain draft', async () => {
    const w = await mountEditing({ approver: false })
    await viewer(w).vm.$emit('save')
    await nextTick(); await nextTick(); await nextTick()
    expect(h.draftInserted).toHaveLength(1)
    expect(h.draftInserted[0].status).toBe('draft')
  })

  it('withdraw → flips the open draft back to status=draft', async () => {
    h.openDraftRows = [{ id: 'd-9', status: 'pending', review_comment: null, updated_at: '2026-07-24' }]
    const w = await mountEditing({ approver: false })
    await nextTick()
    await viewer(w).vm.$emit('withdraw')
    await nextTick(); await nextTick()
    expect(h.draftUpdated).toHaveLength(1)
    expect(h.draftUpdated[0].status).toBe('draft')
  })

  it('a song with an open pending draft loads with the stepper at รออนุมัติ (survives reload · G2)', async () => {
    h.openDraftRows = [{ id: 'd-1', status: 'pending', review_comment: null, updated_at: '2026-07-24' }]
    const w = await mountEditing({ approver: false })
    await nextTick(); await nextTick()
    expect(viewer(w).props('draftStatus')).toBe('pending')
    expect(w.findComponent({ name: 'CompletionStatus' }).props('current')).toBe(3) // รออนุมัติ
  })

  it('auto-save: an edit + a pause writes a draft on its own (no button press · D-C)', async () => {
    vi.useFakeTimers()
    try {
      const w = await mountEditing({ approver: false })
      await viewer(w).vm.$emit('update-content', { ...CONTENT(), key: 'D' })
      await nextTick()
      expect(h.draftInserted).toHaveLength(0) // debounced
      await vi.advanceTimersByTimeAsync(2600)
      await nextTick()
      expect(h.draftInserted).toHaveLength(1)
      expect(h.draftInserted[0].status).toBe('draft')
    } finally {
      vi.useRealTimers()
    }
  })

  it('auto-save does NOT fire while a draft is รอตรวจ (must withdraw first)', async () => {
    vi.useFakeTimers()
    try {
      h.openDraftRows = [{ id: 'd-2', status: 'pending', review_comment: null, updated_at: '2026-07-24' }]
      const w = await mountEditing({ approver: false })
      await nextTick()
      await viewer(w).vm.$emit('update-content', { ...CONTENT(), key: 'E' })
      await vi.advanceTimersByTimeAsync(3000)
      await nextTick()
      expect(h.draftInserted).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
