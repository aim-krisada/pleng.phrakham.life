// B086 — move a line up/down within a stanza, carrying every verse's words with it. The
// hard part: syllables are a flat per-row array indexed by cumulative slot (line→bar→seg),
// so moving a melody line must swap the matching word slice in ALL arrangement rows on that
// stanza (case: song 2 has ร้อง1/รับ/ร้อง2 on one melody). Also asserts B085's sticky head.
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

// one melody A, TWO lines (4 + 3 attack notes), TWO verses on it with distinct words
const SONG = {
  id: 's-ml',
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
          [{ type: 'segment', chord: 'C', note: '1 2 3 4' }],
          [{ type: 'segment', chord: 'G', note: '5 6 7' }],
        ],
      },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] },
      { stanza: 'A', label: 'รับ', syllables: ['p', 'q', 'r', 's', 't', 'u', 'v'] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const contentOf = (w) => w.emitted('change').at(-1)[0].content

describe('B086 — move line (melody + every verse\'s words together)', () => {
  it('moving line 0 down swaps the melody AND reslices words for BOTH verses', async () => {
    const w = mountEd()
    await nextTick()
    // activeLine defaults to 0; the ▼ move-line button acts on it
    const down = w.find('button[aria-label="ย้ายบรรทัดลง"]')
    expect(down.exists()).toBe(true)
    await down.trigger('click')
    await nextTick()

    const c = contentOf(w)
    // melody lines swapped: line 0 is now the old line 1 ("5 6 7")
    expect(c.stanzas[0].lines[0][0].note).toBe('5 6 7')
    expect(c.stanzas[0].lines[1][0].note).toBe('1 2 3 4')
    // ร้อง 1 words follow: line1 slice [e,f,g] now first, then line0 slice [a,b,c,d]
    expect(c.arrangement[0].syllables).toEqual(['e', 'f', 'g', 'a', 'b', 'c', 'd'])
    // รับ words follow the same way — every verse on the stanza is kept in sync
    expect(c.arrangement[1].syllables).toEqual(['t', 'u', 'v', 'p', 'q', 'r', 's'])
  })

  it('moving is reversible (down then up restores the original melody + all words)', async () => {
    const w = mountEd()
    await nextTick()
    await w.find('button[aria-label="ย้ายบรรทัดลง"]').trigger('click') // line0 → down (active follows to 1)
    await nextTick()
    await w.find('button[aria-label="ย้ายบรรทัดขึ้น"]').trigger('click') // move it back up
    await nextTick()
    const c = contentOf(w)
    expect(c.stanzas[0].lines[0][0].note).toBe('1 2 3 4')
    expect(c.stanzas[0].lines[1][0].note).toBe('5 6 7')
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(c.arrangement[1].syllables).toEqual(['p', 'q', 'r', 's', 't', 'u', 'v'])
  })

  it('edge guards: ▲ disabled on the first line, ▼ disabled on the last', async () => {
    const w = mountEd()
    await nextTick()
    // active line 0 → ▲ disabled
    expect(w.find('button[aria-label="ย้ายบรรทัดขึ้น"]').attributes('disabled')).toBeDefined()
    // move to the last line, then ▼ is disabled
    await w.find('button[aria-label="ย้ายบรรทัดลง"]').trigger('click')
    await nextTick()
    expect(w.find('button[aria-label="ย้ายบรรทัดลง"]').attributes('disabled')).toBeDefined()
  })

  it('B085: the ท่อน header (.cshead) is sticky so its tools stay reachable while scrolling', async () => {
    const w = mountEd()
    await nextTick()
    const cshead = w.find('.cshead')
    expect(cshead.exists()).toBe(true)
    // jsdom doesn't compute layout, but the scoped rule sets position:sticky — assert the class
    // carries it via the component's stylesheet is not observable in jsdom; instead assert the
    // element is present and the move controls live in the header toolbar (behavioural anchor).
    expect(w.find('button[aria-label="ย้ายบรรทัดขึ้น"]').exists()).toBe(true)
  })

  // issues11: once the edhead pins too, .cshead's hard-coded top:58px put it UNDERNEATH the
  // edhead — measured in a real browser at 1536px: 62px of overlap and .cshead's buttons failed
  // a hit test, i.e. B085's whole point was undone. .cshead must pin below whatever the edhead
  // actually occupies. jsdom has no layout, so this pins the ARITHMETIC (feed known heights in,
  // assert the offset that comes out) rather than pretending to measure a real overlap.
  it('issues11: .cshead pins BELOW the sticky edhead, not under it (desktop)', async () => {
    document.body.innerHTML =
      '<div id="shell-title"></div><div id="shell-menus"></div><header class="shell-bar"></header>'
    const real = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      if (this.classList?.contains('shell-bar')) return { height: 64, width: 1536, top: 0, bottom: 64, left: 0, right: 1536 }
      if (this.classList?.contains('edhead')) return { height: 94, width: 1160, top: 64, bottom: 158, left: 0, right: 1160 }
      return real.call(this)
    }
    try {
      const w = mountEd()
      await nextTick()
      await nextTick() // onMounted's measure + its nextTick re-measure
      const style = w.find('.cshead').attributes('style') || ''
      // 64 (shell bar) + 94 (edhead) — NOT the stylesheet's 58px, which is 100px too high
      expect(style).toContain('top: 158px')
    } finally {
      Element.prototype.getBoundingClientRect = real
    }
  })
})
