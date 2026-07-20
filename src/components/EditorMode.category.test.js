// B104 (หมวดหาย) — the song's หมวด (category, e.g. lem-yai = เล่มใหญ่) was silently replaced
// by 'anuchon'. Chain: `song_drafts` has no category/theme columns → draftRow() cannot store
// them → reopening a draft made applyRow() fall back to 'anuchon' → publishing wrote that
// fallback over the song's real book. Reported for real: an author filed a song under เล่มใหญ่,
// พี่เปา opened it and it showed อนุชน.
//
// These tests mount the REAL editor and assert on the payload that reaches Supabase, because
// the bug lived exactly in what the write payload contained — a test on meta alone would have
// passed while the song was still being re-filed.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// every from(<table>).<verb>(...) and rpc(...) is recorded so a test can prove what was written
const calls = vi.hoisted(() => [])
// what `songs`.select(...).single() should answer with (the published row's stored book)
const songRow = vi.hoisted(() => ({ value: { category: 'lem-yai', theme: 'กิตติคุณ' } }))

vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) {
      q[m] = (...args) => {
        calls.push({ table, verb: m, args })
        return q
      }
    }
    q.single = () =>
      Promise.resolve(
        table === 'songs'
          ? { data: songRow.value, error: songRow.value ? null : { message: 'boom' } }
          : { data: { id: 'draft-new-1' }, error: null },
      )
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (table) => makeQuery(table),
      rpc: (name, args) => {
        calls.push({ table: 'rpc:' + name, verb: 'rpc', args: [args] })
        return Promise.resolve({ data: 'song-42', error: null })
      },
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { session, legacy } from '../store.js'

const CONTENT = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
  arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
}

// a draft row as it really comes out of `song_drafts`: NO category, NO theme columns exist
const DRAFT_OF_EXISTING = {
  id: 'draft-7',
  song_id: 'song-42',
  number: 42,
  title_th: 'ร่างของเพลงที่เผยแพร่แล้ว',
  title_en: '',
  status: 'draft',
  content: CONTENT,
}
const DRAFT_OF_NEW_SONG = { ...DRAFT_OF_EXISTING, id: 'draft-8', song_id: null }

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'user-1', email: 'e@x.com' } }
  legacy.value = false
  calls.length = 0
  songRow.value = { category: 'lem-yai', theme: 'กิตติคุณ' }
  localStorage.clear()
})

const mountEditor = (props = {}) =>
  mount(EditorMode, {
    props: { song: null, tier: 'approver', active: true, ...props },
    global: { stubs: { Icon: true, SongSheet: true, 'router-link': true } },
  })

// the row handed to songs.update(...) / songs.insert(...)
const writeToSongs = (verb) => calls.find((c) => c.table === 'songs' && c.verb === verb)?.args[0]

describe('B104 — opening a draft resolves the song’s REAL หมวด', () => {
  it('a draft of an existing song shows that song’s stored category/theme, not the อนุชน fallback', async () => {
    const w = mountEditor()
    await nextTick()

    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()

    expect(w.vm.meta.category).toBe('lem-yai') // ← the bug: this used to be 'anuchon'
    expect(w.vm.meta.theme).toBe('กิตติคุณ')
    expect(w.vm.bookKnown).toBe(true)
    // it asked the published row, scoped to this song
    expect(calls.some((c) => c.table === 'songs' && c.verb === 'eq' && c.args[1] === 'song-42')).toBe(true)
    w.unmount()
  })

  it('a draft of a NEW song has no song to ask → category stays un-resolved (documented gap)', async () => {
    const w = mountEditor()
    await nextTick()

    await w.vm.loadDraft(DRAFT_OF_NEW_SONG)
    await nextTick()

    expect(w.vm.bookKnown).toBe(false) // nothing genuine to publish
    expect(w.vm.meta.category).toBe('anuchon') // the dropdown still has to show something
    // and it must NOT have gone looking for a song row that does not exist
    // (the shell's own song-list select is unrelated — match the book lookup specifically)
    expect(calls.some((c) => c.table === 'songs' && c.verb === 'select' && /category/.test(c.args[0] ?? ''))).toBe(false)
    w.unmount()
  })

  it('loading a published song marks its หมวด genuine (even when stored null)', async () => {
    const w = mountEditor({ song: { id: 'song-9', number: 9, title_th: 'เพลง', content: CONTENT, category: null, theme: null } })
    await nextTick()
    expect(w.vm.bookKnown).toBe(true)
    w.unmount()
  })
})

describe('B104 — publishing never overwrites a stored หมวด with a default', () => {
  it('saveDirect on an existing song with an un-resolved book omits category/theme entirely', async () => {
    const w = mountEditor()
    await nextTick()
    // simulate the broken state: a draft of an existing song whose lookup did not resolve
    songRow.value = null // the songs lookup fails
    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()
    expect(w.vm.bookKnown).toBe(false)

    await w.vm.saveDirect()
    await nextTick()

    const row = writeToSongs('update')
    expect(row).toBeTruthy()
    // omitted keys → PostgREST leaves those columns untouched → the real book survives
    expect('category' in row).toBe(false)
    expect('theme' in row).toBe(false)
    w.unmount()
  })

  it('saveDirect writes the resolved category through unchanged (no anuchon anywhere)', async () => {
    const w = mountEditor()
    await nextTick()
    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()

    await w.vm.saveDirect()
    await nextTick()

    const row = writeToSongs('update')
    expect(row.category).toBe('lem-yai')
    expect(row.theme).toBe('กิตติคุณ')
    w.unmount()
  })

  it('a category the user actually picks IS written', async () => {
    const w = mountEditor()
    await nextTick()
    songRow.value = null
    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()
    expect(w.vm.bookKnown).toBe(false)

    w.vm.pickCategory('dek-lek') // the human chose a book
    await nextTick()
    expect(w.vm.bookKnown).toBe(true)

    await w.vm.saveDirect()
    await nextTick()
    expect(writeToSongs('update').category).toBe('dek-lek')
    w.unmount()
  })

  it('a brand-new song still inserts with the editor default (INSERT has nothing to preserve)', async () => {
    const w = mountEditor()
    await nextTick()
    w.vm.meta.title_th = 'เพลงใหม่'
    await nextTick()

    await w.vm.saveDirect()
    await nextTick()

    const row = writeToSongs('insert')
    expect(row).toBeTruthy()
    expect(row.category).toBe('anuchon')
    w.unmount()
  })
})

describe('B104 — the approve+publish path is gated the same way', () => {
  it('approving a draft of an existing song sends its real หมวด to the RPC', async () => {
    const w = mountEditor()
    await nextTick()
    await w.vm.loadDraft({ ...DRAFT_OF_EXISTING, status: 'pending' })
    await nextTick()
    expect(w.vm.reviewingDraft).toBeTruthy() // tier=approver + pending → review mode

    await w.vm.approve()
    await nextTick()

    const p = calls.find((c) => c.table === 'rpc:approve_and_publish')?.args[0]
    expect(p).toBeTruthy()
    expect(p.p_song.category).toBe('lem-yai')
    expect(p.p_song.theme).toBe('กิตติคุณ')
    w.unmount()
  })

  it('refuses to publish rather than guess when the song’s book cannot be read', async () => {
    const w = mountEditor()
    await nextTick()
    songRow.value = null // both the load-time resolve and the approve-time retry fail
    await w.vm.loadDraft({ ...DRAFT_OF_EXISTING, status: 'pending' })
    await nextTick()

    await w.vm.approve()
    await nextTick()

    // no publish happened — the RPC would have assigned theme outright and wiped it
    expect(calls.some((c) => c.table === 'rpc:approve_and_publish')).toBe(false)
    w.unmount()
  })
})
