// Silent-data-loss gate at the COMPONENT level (2026-07-24). editorSerde.test.js proves the
// pure serde; this proves the WIRING — that EditorMode.applyRow → previewContent (the single
// choke point every save path funnels through: saveDraft, saveDirect, approve RPC, downloadJson,
// JSON import, Studio's inline save) does not drop a segment's `holds`, an imported symbol
// (unknown item type), or unknown keys at the content/stanza/arrangement levels.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const q = {}
  for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
  q.single = () => Promise.resolve({ data: null, error: null })
  q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
  return {
    supabase: {
      from: () => q,
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { session } from '../store.js'

// a real-shaped v2 song carrying things THIS editor version doesn't model at every level
const SONG = {
  id: 'song-1',
  number: 12,
  title_th: 'เพลงมีของแปลก',
  title_en: '',
  content: {
    version: 2,
    key: 'G',
    timeSignature: '4/4',
    capo: 3, // unknown content top-level key
    stanzas: [
      {
        id: 'A',
        mystery: 'keep-me', // unknown per-stanza key
        lines: [
          [
            { type: 'segment', chord: 'G', note: '1', holds: 2 }, // holds = the real lost field
            { type: 'segment', chord: '', note: '2', foo: 'bar' }, // synthetic future segment field
            { type: 'ornament', kind: 'trill' }, // unknown ITEM TYPE (imported symbol)
          ],
        ],
      },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: ['พระ', 'เจ้า'], futureFlag: 'x' }, // unknown row key
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'ed-1', email: 'e@x.com' } }
  localStorage.clear()
})

const mountWith = (song) =>
  mount(EditorMode, { props: { song, tier: 'approver', active: true }, global: { stubs: { Icon: true } } })

describe('EditorMode — no silent data loss through the save path', () => {
  it('opening & saving untouched preserves every unknown thing (byte-for-byte content)', async () => {
    const w = mountWith(SONG)
    await nextTick()
    // previewContent is exactly what draftRow()/saveDirect()/approve()/downloadJson() serialize
    expect(w.vm.previewContent).toEqual(SONG.content)
  })

  it('editing an unrelated segment keeps holds / unknown item / unknown keys intact', async () => {
    const w = mountWith(SONG)
    await nextTick()
    // edit a normal thing (last real segment's note) far from any of the unknowns
    w.vm.stanzas[0].lines[0].bars[0].segments[1].note = '5'
    await nextTick()
    const items = w.vm.previewContent.stanzas[0].lines[0]
    expect(items.find((it) => it.type === 'segment' && it.chord === 'G').holds).toBe(2)
    expect(items.find((it) => it.note === '5').foo).toBe('bar') // (edited segment, foo survives via _raw)
    expect(items.find((it) => it.type === 'ornament')).toEqual({ type: 'ornament', kind: 'trill' })
    expect(w.vm.previewContent.capo).toBe(3)
    expect(w.vm.previewContent.stanzas[0].mystery).toBe('keep-me')
    expect(w.vm.previewContent.arrangement[0].futureFlag).toBe('x')
  })

  it('loading a plain song does not inherit a previously-loaded song’s unknown keys', async () => {
    const w = mountWith(SONG)
    await nextTick()
    // switch to a plain song with no extras — the captured contentExtras/_extra must be cleared
    await w.setProps({ song: { id: 's2', number: 1, title_th: 'x', title_en: '', content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1' }]] }], arrangement: [{ stanza: 'A', label: '', syllables: [''] }] } } })
    await nextTick()
    expect(w.vm.previewContent.capo).toBeUndefined()
    expect(w.vm.previewContent.stanzas[0].mystery).toBeUndefined()
  })
})
