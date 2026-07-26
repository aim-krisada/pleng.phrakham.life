// 717 — the SEARCH CARD itself, mounted.
//
// The lib-level tests prove searchSnippet picks the right set; these prove the card actually
// RENDERS that set and says so, because that is the thing a reader complained about: a result
// whose visible text contains none of the words they typed.
//
// SongList is mounted in isolation the way the Studio tests do it — supabase and the router are
// mocked, everything else is the real component (its own template, its own v-ifs).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import live717 from '../components/__fixtures__/717-live.json'

const h = vi.hoisted(() => ({ rows: [] }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push() {} }),
  useRoute: () => ({ params: {}, query: {} }),
}))
vi.mock('../supabase.js', () => ({
  supabase: {
    from: () => {
      const q = {}
      q.select = () => q
      q.order = () => Promise.resolve({ data: h.rows, error: null })
      return q
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

import SongList from './SongList.vue'

const RouterLink = { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' }

const live = JSON.parse(JSON.stringify(live717))
const SET_1_FIRST_LINE = live.content.lyricSets[0].name
const SET_2_FIRST_LINE = live.content.lyricSets[1].name

// the multi-set song as the catalog stores it, plus an ordinary single-set neighbour
const song717 = { ...live, id: 's717', verified: true, category: 'ก' }
const plainSong = {
  id: 's1',
  number: 5,
  title_th: 'เพลงปกติ',
  verified: true,
  category: 'ก',
  content: {
    version: 2,
    key: 'C',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }],
    arrangement: [{ stanza: 'A', syllables: ['ดวง', 'ตะวัน'] }],
  },
}

const bare = (s) => (s || '').replace(/\s+/g, '')

async function searchFor(q) {
  const wrapper = mount(SongList, { global: { stubs: { RouterLink }, components: { RouterLink } } })
  await new Promise((r) => setTimeout(r, 0)) // let onMounted's supabase promise settle
  await nextTick()
  await wrapper.find('input.song-search').setValue(q)
  await nextTick()
  return wrapper
}

describe('717 — the search card says WHICH set matched', () => {
  beforeEach(() => {
    h.rows = [plainSong, song717]
  })

  it('typing set 2’s first line: one card, it SHOWS those words, and it is labelled set 2', async () => {
    const w = await searchFor(SET_2_FIRST_LINE)
    const cards = w.findAll('.song-card')
    expect(cards).toHaveLength(1)

    const card = cards[0]
    expect(card.text()).toContain('717')
    // the fix, stated as the reader experiences it: the words typed are ON the card
    expect(bare(card.text())).toContain(bare(SET_2_FIRST_LINE))
    // …and the card explains why this song came up
    expect(card.find('.found-in').exists()).toBe(true)
    expect(card.find('.found-in').text()).toBe('พบใน เนื้อร้องที่ 2')
    // the generic "this song has 2 sets" line stands down — the label already implies it
    expect(card.find('.lset-tag').exists()).toBe(false)
    w.unmount()
  })

  it('typing set 1’s first line: no label, and the plain set-count line as before', async () => {
    const w = await searchFor(SET_1_FIRST_LINE)
    const cards = w.findAll('.song-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].find('.found-in').exists()).toBe(false)
    expect(cards[0].find('.lset-tag').exists()).toBe(true)
    expect(cards[0].find('.lset-tag').text()).toContain('2 ชุดเนื้อร้อง')
    w.unmount()
  })

  it('an ordinary single-set song never grows the label', async () => {
    const w = await searchFor('ดวงตะวัน')
    const cards = w.findAll('.song-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('เพลงปกติ')
    expect(cards[0].find('.found-in').exists()).toBe(false)
    expect(cards[0].find('.lset-tag').exists()).toBe(false)
    w.unmount()
  })

  it('searching by number keeps the first set’s preview and shows no label', async () => {
    const w = await searchFor('717')
    const card = w.findAll('.song-card')[0]
    expect(card.find('.found-in').exists()).toBe(false)
    expect(card.find('.lset-tag').exists()).toBe(true)
    w.unmount()
  })

  it('negative control — typing the caption matches nothing at all', async () => {
    // if the caption ever leaked into the index, EVERY multi-set song would answer this and
    // carry a label. Zero results is the guard holding.
    const w = await searchFor('เนื้อร้อง')
    expect(w.findAll('.song-card')).toHaveLength(0)
    expect(w.find('.empty').exists()).toBe(true)
    w.unmount()
  })
})
