// B131 follow-up — ★ เพลงโปรด must go through the app's ONE ordering rule (lib/songSort.js).
//
// The bug this locks down: `favSongs` used to filter `shownSongs` straight out of the DB
// response. The `.order('number', …)` query pushes songs whose `number` is blank to the end but
// gives that group NO secondary key, so Postgres may hand them back in any order — and a plain
// `.filter()` preserves whatever order arrived. So a reader who starred songs from a book with
// no catalog numbers (เด็กเล็ก = 52 of 53) could open ★ twice and see two different orders:
// exactly the complaint พี่เปา raised for the in-book list in B131.
//
// These cases mount the REAL view so they prove the wiring in SongList.vue, not just that
// sortSongs() works (songSort.test.js already covers the comparator). Same shape as the B131
// block in bookshelf.test.js: feed the same starred songs in every rotation plus reversed, and
// assert one single rendered order.
//
// SCOPE (P'Aim 29 ก.ค.): ordering only — no sort buttons, no ก-ฮ/ฮ-ก direction toggle.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push() {} }),
  useRoute: () => ({ params: {}, query: {} }),
}))

// The rows the "DB" hands back for the next mount — reassigned per case to emulate Postgres
// returning the number-less group in a different order each time.
let arrival = []

// chainable Supabase stub: from().select().order() resolves to { data: arrival, error: null }
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: arrival, error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  }
})

import SongList from './SongList.vue'
import { favorites } from '../lib/favorites.js'

const stubs = {
  RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' },
  FavStar: true,
  ShareSheet: true,
  Icon: true,
}

// `verified: true` throughout so the public visibility gate (bookshelf.visibleSongs) keeps every
// row — this suite is about ORDER, not the login gate (that gate has its own tests).
const song = (id, number, title_th) => ({
  id, number, title_th, title_en: '', verified: true, category: 'dek-lek', content: null,
})

// 4 starred songs: one has a catalog number, three do not (the เด็กเล็ก shape) + 2 unstarred
// songs that must never appear in the ★ list.
const STARRED = [
  song('f-a', null, 'ขอบพระคุณ'),
  song('f-b', null, 'กราบพระบาท'),
  song('f-c', null, 'ฮาเลลูยา'),
  song('f-d', 1, 'สรรเสริญ'),
]
const UNSTARRED = [song('u-1', 2, 'ไม่ได้ติดดาว'), song('u-2', null, 'ก ไม่ได้ติดดาว')]

// numbered song first · then the number-less three ก-ฮ by Thai title (ก < ข < ฮ)
const EXPECTED = ['สรรเสริญ', 'กราบพระบาท', 'ขอบพระคุณ', 'ฮาเลลูยา']

// mount, switch to the ★ tab, read the rendered titles in DOM order
async function favTitlesFor(rows) {
  arrival = rows
  const wrapper = mount(SongList, { global: { stubs } })
  await flushPromises()
  await wrapper.find('.fav-chip').trigger('click')
  await flushPromises()
  const titles = wrapper.findAll('.song-row .ttl').map((el) => el.text())
  wrapper.unmount()
  return titles
}

describe('SongList ★ เพลงโปรด — ordered through songSort.js', () => {
  beforeEach(() => {
    favorites.value = new Set(STARRED.map((s) => s.id))
  })

  it('puts the numbered song first, then the number-less ones ก-ฮ', async () => {
    expect(await favTitlesFor([...STARRED, ...UNSTARRED])).toEqual(EXPECTED)
  })

  it('shows only starred songs', async () => {
    const titles = await favTitlesFor([...STARRED, ...UNSTARRED])
    expect(titles).toHaveLength(STARRED.length)
    expect(titles).not.toContain('ไม่ได้ติดดาว')
    expect(titles).not.toContain('ก ไม่ได้ติดดาว')
  })

  // THE regression case: identical starred set, every possible arrival order → one output.
  it('gives the same order whatever order the DB returned the rows in', async () => {
    const pool = [...STARRED, ...UNSTARRED]
    for (let i = 0; i < pool.length; i++) {
      const rotated = [...pool.slice(i), ...pool.slice(0, i)]
      expect(await favTitlesFor(rotated)).toEqual(EXPECTED)
    }
    expect(await favTitlesFor([...pool].reverse())).toEqual(EXPECTED)
  })

  it('renders nothing when no song is starred', async () => {
    favorites.value = new Set()
    expect(await favTitlesFor([...STARRED, ...UNSTARRED])).toEqual([])
  })
})
