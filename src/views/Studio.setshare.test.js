// 717 — a link shared out of a multi-set song ALWAYS names its set, the first set included.
//
// The link used to be built positionless when the reader was on the first set, "so the common
// link stays clean". That made the URL mean "whichever set happens to be first" rather than
// "this one" — harmless only while nobody could delete a set. /v2 now ships 🗑 ลบชุดนี้, so
// deleting set 1 promotes set 2 into its place and every copy of that link already in a group
// chat quietly starts opening different words. This pins the outgoing half; Studio.setlink
// covers the incoming half.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

let routeStub = { params: {}, query: {} }
vi.mock('vue-router', () => ({
  useRoute: () => routeStub,
  useRouter: () => ({ push() {} }),
  onBeforeRouteLeave: () => {},
}))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
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

import Studio from './Studio.vue'
import ShareSheet from '../components/ShareSheet.vue'
import EditorMode from '../components/EditorMode.vue'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song', 'startKey', 'startSet'], emits: ['set', 'key-change'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle', 'displayKey'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save', 'new-song'], template: '<div class="stub-editor" />' },
  ExportTool: { name: 'ExportTool', props: ['content', 'filenameBase'], template: '<div class="stub-export" />' },
  DockKey: true,
  ComboSelect: true,
  Icon: true,
}

beforeEach(() => {
  routeStub = { params: {}, query: {} }
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

const line = (n) => [{ type: 'segment', note: n, chord: 'C' }]
const entry = (set) => ({ stanza: 'A', set, label: '', syllables: [] })
const songWith = (lyricSets, arrangement) => ({
  id: 's717', number: 717, title_th: 'สองชุดเนื้อ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    ...(lyricSets ? { lyricSets } : {}),
    stanzas: [{ id: 'A', lines: [line('1'), line('2')] }],
    arrangement,
  },
})
// ids as mintLyricSetIds writes them on save
const song717 = songWith([{ id: 'sONE' }, { id: 'sTWO' }], [entry(0), entry(1)])
const plainSong = songWith(null, [{ stanza: 'A', label: '', syllables: [] }])

// open the shell on a song, then read the URL the ↗ share sheet is given
async function shareUrl(song, { set = 0, key = '' } = {}) {
  const w = mount(Studio, { global: { stubs }, attachTo: document.body })
  await nextTick()
  w.findComponent(EditorMode).vm.$emit('change', song) // the song lands
  await nextTick(); await nextTick()
  const viewer = w.findComponent({ name: 'SongViewer' })
  if (set) { viewer.vm.$emit('set', set); await nextTick() }
  if (key) { viewer.vm.$emit('key-change', key); await nextTick() }
  document.querySelector('#shell-menus .sb-share-btn').click()
  await nextTick()
  const url = w.findComponent(ShareSheet).props('url')
  w.unmount()
  return url
}

describe('Studio — every link out of a multi-set song carries its set id', () => {
  it('THE FIX: sharing from the FIRST set still carries ?set=', async () => {
    expect(await shareUrl(song717, { set: 0 })).toContain('set=sONE')
  })

  it('sharing from a later set carries that set’s id', async () => {
    expect(await shareUrl(song717, { set: 1 })).toContain('set=sTWO')
  })

  it('the id is the PERMANENT one, never the position', async () => {
    const url = await shareUrl(song717, { set: 1 })
    expect(url).not.toMatch(/set=[01](&|$)/)
  })

  it('an ordinary song still shares a clean, set-less link', async () => {
    const url = await shareUrl(plainSong)
    expect(url).toContain('#/song/s717')
    expect(url).not.toContain('set=')
  })

  it('a song declaring ONE set is an ordinary song — no ?set= either', async () => {
    const one = songWith([{ id: 'sONE' }], [entry(0)])
    expect(await shareUrl(one)).not.toContain('set=')
  })

  it('key AND set ride together — neither eats the other', async () => {
    const url = await shareUrl(song717, { set: 1, key: 'G' })
    expect(url).toContain('key=G')
    expect(url).toContain('set=sTWO')
  })

  // Sets made on /v2 are stored as `{}` and get their id from mintLyricSetIds on SAVE. Until
  // then there is no id to promise anything with, so the link goes out positionless rather than
  // wrongly — the reader falls back to the first set, which is the documented behaviour.
  it('a set with no id yet shares positionless rather than wrongly', async () => {
    const unsaved = songWith([{}, {}], [entry(0), entry(1)])
    const url = await shareUrl(unsaved, { set: 1 })
    expect(url).toContain('#/song/s717')
    expect(url).not.toContain('set=')
  })

  it('…and a half-minted song still names the set that HAS an id', async () => {
    const half = songWith([{ id: 'sONE' }, {}], [entry(0), entry(1)])
    expect(await shareUrl(half, { set: 0 })).toContain('set=sONE')
    expect(await shareUrl(half, { set: 1 })).not.toContain('set=')
  })
})
