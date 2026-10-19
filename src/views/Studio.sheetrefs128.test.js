// ใบ v3/pleng#128 — แผ่นเพลง is the only surface that asks the sheet for อ้างอิง, and it must reach the
// paper from BOTH places a song can keep them: the column DA imported (on the loaded row) and the
// box an author types into (inside content). ใบ#125 settled that the typed list wins, empty included.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

let ROUTE = { params: {}, query: {} }
let ROW = null

vi.mock('vue-router', () => ({ useRoute: () => ROUTE, useRouter: () => ({ push() {} }) }))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: ROW, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return { supabase: { from: () => makeQuery(), auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }
})

import Studio from './Studio.vue'
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle', 'songHead', 'bookRefs'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
  Icon: true,
}

const CONTENT = { version: 2, key: 'A', timeSignature: '4/4', stanzas: [], arrangement: [] }

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  ROUTE = { params: {}, query: {} }
  ROW = null
})

// mount + let onMounted's await loadSong() settle
async function open() {
  const w = mount(Studio, { global: { stubs } })
  await nextTick()
  await Promise.resolve()
  await nextTick()
  return w
}
const refsOn = (w) => w.findComponent(SongSheet).props('bookRefs')

describe('ใบ#128 — the sheet gets the song’s อ้างอิง', () => {
  it('refs an author typed reach the paper (they travel inside content)', async () => {
    const w = await open()
    w.findComponent(EditorMode).vm.$emit('change', {
      id: null, number: 143, title_th: 'มารับแผ่นดิน', title_en: '',
      content: { ...CONTENT, bookRefs: [{ book: 'ล', no: 305 }, { book: 'ย', no: 274 }] },
    })
    await nextTick()
    expect(refsOn(w)).toEqual([{ book: 'ล', no: 305 }, { book: 'ย', no: 274 }])
  })

  it('refs DA imported reach the paper too — they live on the row, not in content', async () => {
    ROUTE = { params: { id: 's1' }, query: {} }
    ROW = { id: 's1', number: 143, title_th: 'มารับแผ่นดิน', category: 'anuchon', content: CONTENT, book_refs: [{ book: 'ล', no: 282 }] }
    const w = await open()
    expect(refsOn(w)).toEqual([{ book: 'ล', no: 282 }])
  })

  it('clearing the box really clears the paper, even for an imported song (ใบ#125)', async () => {
    ROUTE = { params: { id: 's1' }, query: {} }
    ROW = { id: 's1', number: 143, title_th: 'มารับแผ่นดิน', category: 'anuchon', content: CONTENT, book_refs: [{ book: 'ล', no: 282 }] }
    const w = await open()
    w.findComponent(EditorMode).vm.$emit('change', { id: 's1', number: 143, title_th: 'มารับแผ่นดิน', title_en: '', content: { ...CONTENT, bookRefs: [] } })
    await nextTick()
    expect(refsOn(w)).toEqual([])
  })

  it('a song with no refs anywhere hands the sheet an empty list, not undefined', async () => {
    const w = await open()
    expect(refsOn(w)).toEqual([])
  })
})
