// B091 — clear just the WORDS of a line (all verses), keeping the melody. Reuses the B086/
// B088 slot model: blank the line's slice in every arrangement row's syllables[], leaving
// later lines' words in place. (Clear-notes is a separate action pending a PM decision.)
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
  id: 's-lc',
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
  window.confirm = () => true
})

function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const contentOf = (w) => w.emitted('change').at(-1)[0].content

async function clearLyricsOfActiveLine(w) {
  await w.find('button[aria-label="เพิ่มเติม"]').trigger('click') // open the ⋯ menu
  await nextTick()
  const act = w.findAll('.ed-more-act').find((b) => b.text().includes('ล้างเนื้อ'))
  await act.trigger('click')
  await nextTick()
}

describe('B091 — clear just the words of a line (all verses; melody kept)', () => {
  it('clearing the MIDDLE line blanks only that line\'s words in every verse; notes untouched', async () => {
    const w = mountEd()
    await nextTick()
    await w.findAll('.ed-line')[1].trigger('focusin') // active line = middle
    await nextTick()
    await clearLyricsOfActiveLine(w)

    const c = contentOf(w)
    // melody unchanged (all three lines intact)
    expect(c.stanzas[0].lines.map((l) => l[0].note)).toEqual(['1 2 3', '4 5', '6 7 1'])
    // line 1's slots [3,5) blanked; lines 0 and 2 keep their words, still aligned
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', '', '', 'f', 'g', 'h'])
    expect(c.arrangement[1].syllables).toEqual(['p', 'q', 'r', '', '', 'u', 'v', 'w'])
  })

  it('clearing the LAST line trims cleanly (both verses)', async () => {
    const w = mountEd()
    await nextTick()
    await w.findAll('.ed-line')[2].trigger('focusin') // last line
    await nextTick()
    await clearLyricsOfActiveLine(w)
    const c = contentOf(w)
    expect(c.stanzas[0].lines.length).toBe(3) // melody kept
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'd', 'e']) // line-2 words gone
    expect(c.arrangement[1].syllables).toEqual(['p', 'q', 'r', 's', 't'])
  })
})
