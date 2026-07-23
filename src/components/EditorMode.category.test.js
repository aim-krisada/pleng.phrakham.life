// B108 (หมวดหาย) — the song's หมวด (category, e.g. lem-yai = เล่มใหญ่) was silently replaced
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

// A LEGACY draft row — saved before db/010. The columns exist now, but this row's values are
// NULL. Presence must therefore NOT count as knownness, or the old guess gets laundered back in.
const DRAFT_OF_EXISTING = {
  id: 'draft-7',
  song_id: 'song-42',
  number: 42,
  title_th: 'ร่างของเพลงที่เผยแพร่แล้ว',
  title_en: '',
  status: 'draft',
  content: CONTENT,
  category: null,
  theme: null,
}
const DRAFT_OF_NEW_SONG = { ...DRAFT_OF_EXISTING, id: 'draft-8', song_id: null }
// A draft saved AFTER db/010 by an author who picked a book — the value is really stored.
const DRAFT_WITH_OWN_BOOK = { ...DRAFT_OF_NEW_SONG, id: 'draft-9', category: 'lem-yai', theme: 'อาณาจักร' }

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
// the row handed to song_drafts.insert(...) / .update(...)
const writeToDrafts = () =>
  calls.find((c) => c.table === 'song_drafts' && (c.verb === 'insert' || c.verb === 'update'))?.args[0]

describe('B108 — opening a draft resolves the song’s REAL หมวด', () => {
  it('a draft of an existing song shows that song’s stored category/theme, not the อนุชน fallback', async () => {
    const w = mountEditor()
    await nextTick()

    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()

    expect(w.vm.meta.category).toBe('lem-yai') // ← the bug: this used to be 'anuchon'
    expect(w.vm.meta.theme).toBe('กิตติคุณ')
    expect(w.vm.categoryKnown).toBe(true)
    expect(w.vm.themeKnown).toBe(true) // one query answers for both fields
    // it asked the published row, scoped to this song
    expect(calls.some((c) => c.table === 'songs' && c.verb === 'eq' && c.args[1] === 'song-42')).toBe(true)
    w.unmount()
  })

  it('a legacy draft of a NEW song has nothing to ask → stays un-resolved (nothing is written)', async () => {
    const w = mountEditor()
    await nextTick()

    await w.vm.loadDraft(DRAFT_OF_NEW_SONG)
    await nextTick()

    expect(w.vm.categoryKnown).toBe(false) // nothing genuine to publish
    expect(w.vm.themeKnown).toBe(false)
    expect(w.vm.meta.category).toBe('anuchon') // the dropdown still has to show something
    // and it must NOT have gone looking for a song row that does not exist
    // (the shell's own song-list select is unrelated — match the book lookup specifically)
    expect(calls.some((c) => c.table === 'songs' && c.verb === 'select' && /category/.test(c.args[0] ?? ''))).toBe(false)
    w.unmount()
  })

  it('loading a published song marks both fields genuine', async () => {
    const w = mountEditor({ song: { id: 'song-9', number: 9, title_th: 'เพลง', content: CONTENT, category: 'dek-lek', theme: 'ประสบการณ์' } })
    await nextTick()
    expect(w.vm.categoryKnown).toBe(true)
    expect(w.vm.themeKnown).toBe(true)
    w.unmount()
  })

  // A published song that is genuinely unfiled (category null = the "ยังไม่จัดเล่ม" bucket) must
  // stay unfiled. Before B108 a plain re-publish wrote 'anuchon' over that null, quietly filing
  // it into อนุชน — the same corruption by another door.
  it('a published song with NO หมวด stays un-filed on re-publish (not defaulted to อนุชน)', async () => {
    const w = mountEditor({ song: { id: 'song-9', number: 9, title_th: 'เพลง', content: CONTENT, category: null, theme: null } })
    await nextTick()
    expect(w.vm.categoryKnown).toBe(false) // null is not a value

    await w.vm.saveDirect()
    await nextTick()

    const row = writeToSongs('update')
    expect('category' in row).toBe(false)
    w.unmount()
  })
})

describe('B108 — publishing never overwrites a stored หมวด with a default', () => {
  it('saveDirect on an existing song with an un-resolved book omits category/theme entirely', async () => {
    const w = mountEditor()
    await nextTick()
    // simulate the broken state: a draft of an existing song whose lookup did not resolve
    songRow.value = null // the songs lookup fails
    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()
    expect(w.vm.categoryKnown).toBe(false)

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
    expect(w.vm.categoryKnown).toBe(false)

    w.vm.pickCategory('dek-lek') // the human chose a book
    await nextTick()
    expect(w.vm.categoryKnown).toBe(true)

    await w.vm.saveDirect()
    await nextTick()
    expect(writeToSongs('update').category).toBe('dek-lek')
    w.unmount()
  })

  // R1 — the hole a single shared flag left open: touching ธีม vouched for the หมวด beside it,
  // so publish wrote the guessed 'anuchon' and re-filed the song. Each field owns its own flag.
  it('touching ธีม ONLY does not license writing a guessed หมวด', async () => {
    const w = mountEditor()
    await nextTick()
    songRow.value = null // the book lookup fails → neither field is genuine
    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()

    w.vm.pickTheme('พระคัมภีร์') // the human touched ธีม, and ONLY ธีม
    await nextTick()
    expect(w.vm.themeKnown).toBe(true)
    expect(w.vm.categoryKnown).toBe(false) // must NOT have been vouched for

    await w.vm.saveDirect()
    await nextTick()

    const row = writeToSongs('update')
    expect('category' in row).toBe(false) // ← R1: this used to be 'anuchon'
    expect(row.theme).toBe('พระคัมภีร์') // the field they did touch still saves
    w.unmount()
  })

  // R2 — the mirror hole: picking a หมวด vouched for the ธีม beside it, so publish wrote
  // theme: null and wiped it.
  it('picking a หมวด ONLY does not license writing a guessed ธีม', async () => {
    const w = mountEditor()
    await nextTick()
    songRow.value = null
    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()

    w.vm.pickCategory('dek-lek') // the human touched หมวด, and ONLY หมวด
    await nextTick()
    expect(w.vm.categoryKnown).toBe(true)
    expect(w.vm.themeKnown).toBe(false)

    await w.vm.saveDirect()
    await nextTick()

    const row = writeToSongs('update')
    expect(row.category).toBe('dek-lek') // the field they did touch still saves
    expect('theme' in row).toBe(false) // ← R2: this used to be null, wiping the ธีม
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

// Phase 1 (db/010 is live): song_drafts now has its own category/theme, so an author's pick
// survives save → close → reopen even for a song that was never published.
describe('B108 Phase 1 — a draft carries its own หมวด', () => {
  it('new song: the picked หมวด is persisted to song_drafts (not dropped)', async () => {
    const w = mountEditor()
    await nextTick()
    w.vm.meta.title_th = 'เพลงใหม่'
    w.vm.pickCategory('lem-yai')
    w.vm.pickTheme('อาณาจักร')
    await nextTick()

    await w.vm.saveDraft('draft')
    await nextTick()

    const row = writeToDrafts()
    expect(row.category).toBe('lem-yai') // ← used to be dropped entirely
    expect(row.theme).toBe('อาณาจักร')
    w.unmount()
  })

  it('new song round-trip: reopening that draft brings เล่มใหญ่ back (the old gap, now closed)', async () => {
    const w = mountEditor()
    await nextTick()

    await w.vm.loadDraft(DRAFT_WITH_OWN_BOOK) // song_id null → nothing to resolve from
    await nextTick()

    expect(w.vm.meta.category).toBe('lem-yai')
    expect(w.vm.meta.theme).toBe('อาณาจักร')
    expect(w.vm.categoryKnown).toBe(true)
    expect(w.vm.themeKnown).toBe(true)
    w.unmount()
  })

  it('a guess is never persisted into the draft as if it were a pick', async () => {
    const w = mountEditor()
    await nextTick()
    songRow.value = null
    await w.vm.loadDraft(DRAFT_OF_EXISTING) // legacy draft + failed resolve → nothing genuine
    await nextTick()
    expect(w.vm.categoryKnown).toBe(false)

    await w.vm.saveDraft('draft')
    await nextTick()

    // writing 'anuchon' here would make the next reopen treat the guess as a real pick
    expect(writeToDrafts().category).toBe(null)
    w.unmount()
  })

  it("the draft's own stored pick wins over what is currently published", async () => {
    const w = mountEditor()
    await nextTick()
    songRow.value = { category: 'anuchon', theme: 'กิตติคุณ' } // published under a different book

    // draft of an EXISTING song, author moved it to เล่มใหญ่ but left ธีม unset
    await w.vm.loadDraft({ ...DRAFT_OF_EXISTING, category: 'lem-yai', theme: null })
    await nextTick()

    expect(w.vm.meta.category).toBe('lem-yai') // the newer intent, NOT overwritten by resolve
    expect(w.vm.meta.theme).toBe('กิตติคุณ') // the gap was filled from the published song
    w.unmount()
  })
})

// 🔴 legacy drafts: db/010 added the columns to EVERY existing row, values NULL. Key-presence
// alone would now read as "known" and let that null be written back over real data.
describe('B108 — a legacy draft’s NULL is not a real value', () => {
  it('null in the draft → resolves from the published song instead', async () => {
    const w = mountEditor()
    await nextTick()

    await w.vm.loadDraft(DRAFT_OF_EXISTING) // category/theme present but null
    await nextTick()

    expect(w.vm.meta.category).toBe('lem-yai') // came from the published row
    expect(w.vm.categoryKnown).toBe(true)
    w.unmount()
  })

  it('null in the draft + resolve fails → writes NOTHING, never null', async () => {
    const w = mountEditor()
    await nextTick()
    songRow.value = null
    await w.vm.loadDraft(DRAFT_OF_EXISTING)
    await nextTick()
    expect(w.vm.categoryKnown).toBe(false)
    expect(w.vm.themeKnown).toBe(false)

    await w.vm.saveDirect()
    await nextTick()

    const row = writeToSongs('update')
    expect('category' in row).toBe(false) // a null here would unfile the song
    expect('theme' in row).toBe(false)
    w.unmount()
  })
})

describe('B108 — the approve+publish path is gated the same way', () => {
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

  it('still refuses when the approver picked a หมวด but the ธีม is a guess (R2 on the RPC path)', async () => {
    const w = mountEditor()
    await nextTick()
    songRow.value = null
    await w.vm.loadDraft({ ...DRAFT_OF_EXISTING, status: 'pending' })
    await nextTick()
    w.vm.pickCategory('dek-lek') // one field genuine, the other still a guess
    await nextTick()

    await w.vm.approve()
    await nextTick()

    // approve_and_publish assigns theme outright, so publishing here would wipe it
    expect(calls.some((c) => c.table === 'rpc:approve_and_publish')).toBe(false)
    w.unmount()
  })

  it('does NOT over-block: a draft of a brand-new song still publishes', async () => {
    const w = mountEditor()
    await nextTick()
    await w.vm.loadDraft({ ...DRAFT_OF_NEW_SONG, status: 'pending' })
    await nextTick()
    expect(w.vm.categoryKnown).toBe(false) // unknown, but there is no stored song to protect

    await w.vm.approve()
    await nextTick()

    expect(calls.some((c) => c.table === 'rpc:approve_and_publish')).toBe(true)
    w.unmount()
  })
})
