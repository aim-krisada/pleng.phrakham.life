// Scope-by-book search (พี่เปา) — the SEARCH view mounted (/v2).
//
// The reader complaint: after picking a เล่ม, typing a query still searched the WHOLE catalog,
// so a title that also exists in another book surfaced the other book's copy. These prove that
// while a book is open, search stays inside it — and that an un-drilled search (landing) is
// unchanged. Same mount recipe as SongList.card.test.js: supabase + router mocked, real SFC.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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

function song(id, number, title, category) {
  return {
    id,
    number,
    title_th: title,
    verified: true,
    category,
    content: { version: 1, key: 'C', lines: [[{ type: 'segment', note: '1', lyric: 'x' }]] },
  }
}

// อนุชน = 2 songs, เล่มใหญ่ = 1 song; the word "พระเจ้า" appears in one title of EACH book.
const anuA = song('a1', 1, 'พระเจ้าทรงเป็นความรัก', 'anuchon')
const anuB = song('a2', 2, 'สรรเสริญพระองค์', 'anuchon')
const lemA = song('l1', 3, 'พระเจ้าผู้ยิ่งใหญ่', 'lem-yai')

async function mountList() {
  const w = mount(SongList, { global: { stubs: { RouterLink }, components: { RouterLink } } })
  await new Promise((r) => setTimeout(r, 0)) // onMounted supabase promise
  await nextTick()
  return w
}
async function openBook(w, i) {
  await w.findAll('.book-row')[i].trigger('click')
  await nextTick()
}
async function search(w, q) {
  await w.find('input.song-search').setValue(q)
  await nextTick()
}
const titles = (w) => w.findAll('.song-card .song-title').map((n) => n.text())

describe('search scope follows the open เล่ม (/v2)', () => {
  beforeEach(() => {
    h.rows = [anuA, anuB, lemA]
  })

  it('landing (no book open): "พระเจ้า" searches the WHOLE catalog — both books answer', async () => {
    const w = await mountList()
    await search(w, 'พระเจ้า')
    const t = titles(w)
    expect(t).toHaveLength(2)
    expect(t.join(' ')).toContain('พระเจ้าทรงเป็นความรัก')
    expect(t.join(' ')).toContain('พระเจ้าผู้ยิ่งใหญ่')
    w.unmount()
  })

  it('inside อนุชน: "พระเจ้า" returns ONLY อนุชน — the เล่มใหญ่ copy is not surfaced', async () => {
    const w = await mountList()
    await openBook(w, 1) // shelf order [เล่มใหญ่, อนุชน]; อนุชน = index 1
    await search(w, 'พระเจ้า')
    const t = titles(w)
    expect(t).toHaveLength(1)
    expect(t[0]).toBe('1. พระเจ้าทรงเป็นความรัก')
    expect(t.join(' ')).not.toContain('พระเจ้าผู้ยิ่งใหญ่')
    w.unmount()
  })

  it('inside เล่มใหญ่: the same query returns only เล่มใหญ่', async () => {
    const w = await mountList()
    await openBook(w, 0)
    await search(w, 'พระเจ้า')
    const t = titles(w)
    expect(t).toHaveLength(1)
    expect(t[0]).toBe('3. พระเจ้าผู้ยิ่งใหญ่')
    w.unmount()
  })

  it('the search box placeholder names the open เล่ม (i18n key list.searchInBook)', async () => {
    const w = await mountList()
    // landing placeholder is the plain "ค้นหาเพลง" (t('list.searchPlaceholder'))
    expect(w.find('input.song-search').attributes('placeholder')).not.toContain('ค้นในเล่ม')
    await openBook(w, 1) // อนุชน
    expect(w.find('input.song-search').attributes('placeholder')).toBe('ค้นในเล่ม อนุชน…')
    w.unmount()
  })

  it('leaving the book (← เล่มทั้งหมด) restores the whole-catalog scope', async () => {
    const w = await mountList()
    await openBook(w, 1) // อนุชน
    await w.find('.crumb').trigger('click') // backToBooks
    await nextTick()
    await search(w, 'พระเจ้า')
    expect(titles(w)).toHaveLength(2)
    w.unmount()
  })
})
