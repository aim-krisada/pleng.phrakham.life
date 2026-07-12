// B088 — copy/delete line must reslice each verse's words like B086 (move) does. Words are
// a flat per-arrangement-row syllables[] indexed by cumulative slot (line→bar→seg). Deleting
// a melody line must drop that line's word slice from EVERY verse; copying must duplicate it
// — else the words of later lines drift onto the wrong notes. Case: many verses on one melody.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

// one melody A, THREE lines (3 + 2 + 3 attack notes), TWO verses with distinct words
const SONG = {
  id: 's-cl',
  number: 2,
  title_th: 'ของขวัญ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      {
        id: 'A',
        lines: [
          [{ type: 'segment', chord: 'C', note: '1 2 3' }],
          [{ type: 'segment', chord: 'F', note: '4 5' }],
          [{ type: 'segment', chord: 'G', note: '6 7 1' }],
        ],
      },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
      { stanza: 'A', label: 'รับ', syllables: ['p', 'q', 'r', 's', 't', 'u', 'v', 'w'] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  window.confirm = () => true // qDeleteLine asks to confirm
})

function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const contentOf = (w) => w.emitted('change').at(-1)[0].content

describe('B088 — copy/delete line reslices every verse\'s words', () => {
  it('deleting the middle line drops that line\'s word slice from BOTH verses', async () => {
    const w = mountEd()
    await nextTick()
    // focus line index 1 (the middle line) so it becomes the active line
    await w.findAll('.ed-line')[1].trigger('focusin')
    await nextTick()
    await w.find('button[aria-label="ลบบรรทัด"]').trigger('click')
    await nextTick()

    const c = contentOf(w)
    // melody lost the middle line
    expect(c.stanzas[0].lines.map((l) => l[0].note)).toEqual(['1 2 3', '6 7 1'])
    // line 1's slice [d,e] / [s,t] is dropped; later line's words stay aligned
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'f', 'g', 'h'])
    expect(c.arrangement[1].syllables).toEqual(['p', 'q', 'r', 'u', 'v', 'w'])
  })

  it('copying line 0 duplicates its word slice in BOTH verses (later words stay put)', async () => {
    const w = mountEd()
    await nextTick()
    // active line defaults to 0; ทำซ้ำ (duplicate-in-place, B088) — B101 renamed the label
    await w.find('button[aria-label="ทำซ้ำบรรทัด"]').trigger('click')
    await nextTick()

    const c = contentOf(w)
    // melody line 0 duplicated after itself
    expect(c.stanzas[0].lines.map((l) => l[0].note)).toEqual(['1 2 3', '1 2 3', '4 5', '6 7 1'])
    // line 0's slice [a,b,c] is duplicated; [d,e,f,g,h] follows unshifted
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    expect(c.arrangement[1].syllables).toEqual(['p', 'q', 'r', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w'])
  })

  it('deleting the last line trims cleanly (no leftover/undropped words)', async () => {
    const w = mountEd()
    await nextTick()
    await w.findAll('.ed-line')[2].trigger('focusin') // last line
    await nextTick()
    await w.find('button[aria-label="ลบบรรทัด"]').trigger('click')
    await nextTick()
    const c = contentOf(w)
    expect(c.stanzas[0].lines.map((l) => l[0].note)).toEqual(['1 2 3', '4 5'])
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(c.arrangement[1].syllables).toEqual(['p', 'q', 'r', 's', 't'])
  })
})
