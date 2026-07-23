// G1 — the swapped-order warning must be ON SCREEN. The parser now reads any modifier
// order, so a swapped note counts its beats correctly and its ❌ disappears — which would
// make the swap invisible, exactly how five of them sat unnoticed in the library. The bar
// carries its own chip instead: what is stored, what it is read as. Data is not rewritten.
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

// 3/4, one stanza. Bar 0 is #103's real broken bar ("5^." — จุดเพิ่มค่า written after the
// fermata); bar 1 is the same bar written the canonical way.
const SONG = {
  id: 'song-1',
  number: 103,
  title_th: 'ทดสอบลำดับสลับ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '3/4',
    stanzas: [
      {
        id: 'A',
        lines: [
          [
            { type: 'segment', note: '1_ 1_ 1_ 5^.' },
            { type: 'bar' },
            { type: 'segment', note: '1_ 1_ 1_ 5.^' },
          ],
        ],
      },
    ],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

const mountEditor = () => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  return mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true },
    global: { stubs: { Icon: true } },
  })
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

describe('G1 — the swapped-order bar says so on screen', () => {
  it('shows the chip on the swapped bar, naming what is stored and how it reads', async () => {
    const w = mountEditor()
    await nextTick()
    const chip = w.element.querySelector('.ed-bar[data-bar="0-0"] .ed-bar-order')
    expect(chip).toBeTruthy()
    expect(chip.textContent).toContain('5^.')
    expect(chip.textContent).toContain('5.^')
    expect(chip.getAttribute('title')).toContain('หนังสือต้นฉบับ')
    w.unmount()
  })

  it('the canonical bar gets no chip', async () => {
    const w = mountEditor()
    await nextTick()
    expect(w.element.querySelector('.ed-bar[data-bar="0-1"] .ed-bar-order')).toBe(null)
    w.unmount()
  })

  it('the bar reads fine now — beats are right and it is not marked ❌', async () => {
    const w = mountEditor()
    await nextTick()
    const status = w.element.querySelector('.ed-bar[data-bar="0-0"] .ed-bar-status')
    expect(status.textContent).toContain('3/3')
    expect(status.classList.contains('bad')).toBe(false)
    w.unmount()
  })

  it('the stored note string is left exactly as it was', async () => {
    const w = mountEditor()
    await nextTick()
    expect(SONG.content.stanzas[0].lines[0][0].note).toBe('1_ 1_ 1_ 5^.')
    w.unmount()
  })
})
