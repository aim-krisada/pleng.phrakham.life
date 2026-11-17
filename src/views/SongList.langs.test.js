// พี่เอม 17 พ.ย. 2569 — each song in the list says which languages it has ("ไทย · English · 中文"),
// only when it has more than one. A Thai-only song shows nothing (same rule as the language
// buttons on the song page, ใบ v3/pleng#158 AC 2 · ui-standards: minimalist).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => ({ rows: [] }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push() {}, replace() {} }),
  useRoute: () => ({ params: {}, query: {} }),
}))
vi.mock('../supabase.js', () => ({
  supabase: {
    from: () => {
      const q = {}
      q.select = () => q
      q.is = () => q
      q.order = () => q
      q.range = () => q
      q.then = (ok, bad) => Promise.resolve({ data: h.rows, error: null }).then(ok, bad)
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
const song = (id, number, title, lyrics) => ({
  id, number, title_th: title, verified: true, category: 'anuchon',
  content: { version: 2, key: 'C', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }],
    arrangement: [{ stanza: 'A', syllables: ['ดวง', 'ตะวัน'], ...(lyrics ? { lyrics } : {}) }] },
})
const thai = song('a', 1, 'เพลงไทยล้วน')
const two = song('b', 2, 'เพลงสองภาษา', { en: ['Sun', 'shine'] })
const three = song('c', 3, 'เพลงสามภาษา', { en: ['Sun', 'shine'], zh: ['太', '阳'] })

async function searchFor(q) {
  const w = mount(SongList, { global: { stubs: { RouterLink }, components: { RouterLink } } })
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
  await w.find('input.song-search').setValue(q)
  await nextTick()
  return w
}

describe('song list — languages on each song', () => {
  beforeEach(() => { h.rows = [thai, two, three] })

  it('a card lists the languages the song has, in the fixed order', async () => {
    const w = await searchFor('เพลง')
    const chip = (t) => w.findAll('.song-card').find((c) => c.text().includes(t)).find('.lang-chip')
    expect(chip('เพลงสองภาษา').text()).toBe('ไทย · English')
    expect(chip('เพลงสามภาษา').text()).toBe('ไทย · English · 中文')
    expect(chip('เพลงสามภาษา').attributes('aria-label')).toBe('ภาษา ไทย · English · 中文')
  })

  it('a row in a book carries the full names and the short phone names', async () => {
    const w = mount(SongList, { global: { stubs: { RouterLink }, components: { RouterLink } } })
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()
    const vm = w.vm.$.setupState
    expect(vm.langNames(three)).toBe('ไทย · English · 中文')
    expect(vm.langNames(three, true)).toBe('ไทย · EN · 中')
    expect(vm.langNames(thai, true)).toBe('')
  })

  it('a Thai-only song shows no language label', async () => {
    const w = await searchFor('เพลงไทยล้วน')
    const card = w.findAll('.song-card').find((c) => c.text().includes('เพลงไทยล้วน'))
    expect(card.find('.lang-chip').exists()).toBe(false)
  })
})
