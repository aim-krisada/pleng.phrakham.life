// 717 — opening a shared ?set=<permanent id> link lands on THAT lyric set.
//
// The outgoing half (buildSongUrl) is pinned in lib/share.canonical; the id semantics in
// lib/songModel.setid. This is the round-trip through the shell: a link arrives, the song
// loads, and both reading surfaces start on the set the link names — or on the first set if
// that set is gone, never on an error or an empty sheet.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// mutable so each test can arrive on a different link
const routeQuery = { value: {} }
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, query: routeQuery.value }),
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
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'
import { lyricSetIdAt } from '../lib/songModel.js'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song', 'startKey', 'startSet'], emits: ['set'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save', 'new-song'], template: '<div class="stub-editor" />' },
  ExportTool: { name: 'ExportTool', props: ['content', 'filenameBase'], template: '<div class="stub-export" />' },
  Icon: true,
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  routeQuery.value = {}
})

const line = (n) => [{ type: 'segment', note: n, chord: 'C' }]
const entry = (set, label) => ({ stanza: 'A', set, label, syllables: [] })
// ids as they would look after a save (mintLyricSetIds writes these)
const song717 = {
  id: 's717', number: 717, title_th: 'สองชุดเนื้อ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    lyricSets: [{ name: 'ชุดหนึ่ง', id: 'sONE' }, { name: 'ชุดสอง', id: 'sTWO' }],
    stanzas: [{ id: 'A', lines: [line('1'), line('2')] }],
    arrangement: [entry(0, ''), entry(1, ''), entry(1, 'ข้อ2')],
  },
}

async function openLink(query, song = song717) {
  routeQuery.value = query
  const w = mount(Studio, { global: { stubs } })
  await nextTick()
  w.findComponent(EditorMode).vm.$emit('change', song) // the song lands
  await nextTick()
  await nextTick()
  return w
}
const startSetOf = (w) => w.findComponent({ name: 'SongViewer' }).props('startSet')

describe('Studio — a shared ?set= link opens on that lyric set', () => {
  it('?set=<id of set 2> starts the reading surface on set 2', async () => {
    const w = await openLink({ set: 'sTWO' })
    expect(startSetOf(w)).toBe(1)
  })

  it('?set=<id of set 1> starts on set 1', async () => {
    expect(startSetOf(await openLink({ set: 'sONE' }))).toBe(0)
  })

  it('no ?set= at all starts on the first set', async () => {
    expect(startSetOf(await openLink({}))).toBe(0)
  })

  it('an id whose set was DELETED falls back to the first set, no error', async () => {
    const w = await openLink({ set: 'sGONE' })
    expect(startSetOf(w)).toBe(0)
  })

  it('junk in ?set= is harmless', async () => {
    for (const bad of ['', '../../etc', '999', 'null']) {
      expect(startSetOf(await openLink({ set: bad }))).toBe(0)
    }
  })

  it('the link follows the SET, not the slot, after an earlier set is deleted', async () => {
    // the whole point of ids: this link was made when ชุดสอง was second; it is now first.
    const shifted = {
      ...song717,
      content: {
        ...song717.content,
        lyricSets: [{ name: 'ชุดสอง', id: 'sTWO' }, { name: 'ชุดสาม', id: 'sTHREE' }],
      },
    }
    expect(startSetOf(await openLink({ set: 'sTWO' }, shifted))).toBe(0)
  })

  it('แผ่นเพลง follows the shared link too', async () => {
    const w = await openLink({ set: 'sTWO' })
    const more = document.querySelector('#shell-menus .sb-more-btn')
    if (more && more.getAttribute('aria-expanded') !== 'true') { more.click(); await nextTick() }
    const sheetBtn = [...document.querySelectorAll('#shell-menus .sb-mode-btn')].find((b) => /แผ่น/.test(b.textContent))
    sheetBtn.click()
    await nextTick()
    const c = w.findComponent(SongSheet).props('content')
    const sets = (c.lines || []).map((l) => c.arrangement[l._entryIndex]?.set).filter((s) => s != null)
    expect(sets.every((s) => s === 1), `printed sets: ${sets.join(',')}`).toBe(true)
  })

  it('?key= still works alongside ?set= — one does not eat the other', async () => {
    const w = await openLink({ key: 'G', set: 'sTWO' })
    expect(w.findComponent({ name: 'SongViewer' }).props('startKey')).toBe('G')
    expect(startSetOf(w)).toBe(1)
  })

  it('back-compat — an ordinary song ignores ?set= entirely', async () => {
    const plain = {
      id: 'p', number: 9, title_th: 'ธรรมดา', title_en: '',
      content: { ...song717.content, lyricSets: undefined, arrangement: [entry(undefined, '')] },
    }
    expect(startSetOf(await openLink({ set: 'sTWO' }, plain))).toBe(0)
    expect(lyricSetIdAt(plain.content, 0)).toBe('')
  })
})

// Now that a set can be DELETED from /v2, "falls back to the first set" is no longer the whole
// answer. Falling back keeps the link usable — one that opens nothing is worse — but handing the
// first set's words over in silence, looking exactly like the link always did, is the one failure
// a public link cannot have. So the fallback is SAID, once, quietly.
describe('Studio — a link whose lyric set is GONE says so', () => {
  const GONE = /ถูกลบไปแล้ว/
  const noticeBox = (w) => w.findAll('.sv-import-msg').find((n) => GONE.test(n.text()))

  it('an unknown set id opens the first set AND tells the reader why', async () => {
    const w = await openLink({ set: 'sGONE' })
    expect(startSetOf(w)).toBe(0) // still opens — never an error, never a blank sheet
    expect(noticeBox(w)).toBeTruthy()
  })

  it('a set id that still exists says NOTHING — no notice on the common path', async () => {
    expect(noticeBox(await openLink({ set: 'sTWO' }))).toBeFalsy()
  })

  it('the first set’s own id is silent too — the link kept its promise', async () => {
    expect(noticeBox(await openLink({ set: 'sONE' }))).toBeFalsy()
  })

  it('no ?set= at all is silent — nothing was promised', async () => {
    expect(noticeBox(await openLink({}))).toBeFalsy()
  })

  it('a link that outlived the sets entirely (song collapsed back to one) still says so', async () => {
    const collapsed = {
      id: 's717', number: 717, title_th: 'สองชุดเนื้อ', title_en: '',
      content: {
        version: 2, key: 'C', timeSignature: '4/4',
        stanzas: [{ id: 'A', lines: [line('1')] }],
        arrangement: [{ stanza: 'A', label: '', syllables: [] }],
      },
    }
    const w = await openLink({ set: 'sTWO' }, collapsed)
    expect(startSetOf(w)).toBe(0)
    expect(noticeBox(w)).toBeTruthy()
  })

  it('the notice is a dismissible status, not a toast that vanishes unread (WCAG 3.3.1)', async () => {
    const w = await openLink({ set: 'sGONE' })
    const box = noticeBox(w)
    expect(box.attributes('role')).toBe('status')
    const close = box.findAll('button').find((b) => /ปิด/.test(b.text()))
    expect(close).toBeTruthy()
    await close.trigger('click')
    expect(noticeBox(w)).toBeFalsy()
  })
})
