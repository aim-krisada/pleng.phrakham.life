// ใบ v3/pleng#120 — "ยังเลื่อนย้ายบรรทัดขึ้นไม่ได้ … ipad ย้ายได้ แต่ android ย้ายไม่ได้".
// On a phone (≤ 760px) the edit header with the line ▲▼ is NOT pinned and a บรรทัด is ~1,500px tall.
// After one ▲ the page slid to the moved line (ใบ#115), ▲ left the screen, and the next tap at the
// same spot landed on whatever slid under the finger (measured on a 360×780 touch screen: the chord
// "+" of the next line opened; at 412: a note "+" was added). On iPad / desktop the header is pinned,
// so ▲ stayed under the finger — that is why it "worked on iPad".
// These fail on the old code:
//   1. each บรรทัด has its own ▲▼ on its head (phone): tap ▲ twice → the SAME line goes up two
//      places, the page shifts by exactly how far the line moved (it stays under the finger)
//   2. the edit header's ▲ on a phone keeps the page still (▲ stays under the finger): tap twice →
//      two places; wide screens still follow the moved line as before (ใบ#115)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../lib/midi.js', () => ({ playSong: vi.fn(), playEnsemble: vi.fn(), stopPlayback: () => {} }))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
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

// like song 627: three บรรทัด on one melody, two ข้อ of words
const SONG = {
  id: 's-120', number: 627, title_th: 'ทดสอบย้ายบรรทัด', title_en: '',
  content: {
    version: 2, key: 'D', timeSignature: '6/8',
    stanzas: [{
      id: 'A',
      lines: [
        [{ type: 'segment', chord: 'D', note: '3' }],
        [{ type: 'segment', chord: 'G', note: '2' }],
        [{ type: 'segment', chord: 'A', note: '4' }],
      ],
    }],
    arrangement: [
      { stanza: 'A', label: '', syllables: ['ก1', 'ก2', 'ก3'] },
      { stanza: 'A', label: 'ข้อ2', syllables: ['ข1', 'ข2', 'ข3'] },
    ],
  },
}

const realMM = window.matchMedia
function setWidth(px) {
  window.matchMedia = (q) => {
    const max = /max-width:\s*(\d+)px/.exec(q)
    const min = /min-width:\s*(\d+)px/.exec(q)
    return { matches: max ? px <= +max[1] : min ? px >= +min[1] : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}
// a phone: each บรรทัด is 1,500px tall, its head at the top of it
let realRect
beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  window.scrollBy = vi.fn()
  window.scrollTo = vi.fn()
  realRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList?.contains('ed-line-head')) {
      const i = [...document.querySelectorAll('.ed-line')].indexOf(this.closest('.ed-line'))
      const top = 200 + i * 1500
      return { top, bottom: top + 48, height: 48, left: 0, right: 360, width: 360 }
    }
    return realRect.call(this)
  }
})
afterEach(() => {
  window.matchMedia = realMM
  Element.prototype.getBoundingClientRect = realRect
})

const mountEd = () => mount(EditorMode, {
  props: { song: SONG, tier: 'approver', active: true },
  attachTo: document.body,
  global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, ComboSelect: true, ExportTool: true } },
})
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }
const order = (w) => w.findAll('.ed-line').map((l) => l.find('input.note-box').element.value)

describe('phone: ▲▼ on the บรรทัด itself', () => {
  it('every บรรทัด head has ▲ and ▼ (named for the line; ▲ greyed on the first, ▼ on the last)', async () => {
    setWidth(360)
    const w = mountEd()
    await flush()
    for (const n of [1, 2, 3]) {
      expect(w.find(`button[aria-label="ย้ายบรรทัด ${n} ขึ้น"]`).exists()).toBe(true)
      expect(w.find(`button[aria-label="ย้ายบรรทัด ${n} ลง"]`).exists()).toBe(true)
    }
    expect(w.find('button[aria-label="ย้ายบรรทัด 1 ขึ้น"]').attributes('disabled')).toBeDefined()
    expect(w.find('button[aria-label="ย้ายบรรทัด 3 ลง"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it('tap ▲ on บรรทัด 3 twice: the same line goes to the top, staying under the finger', async () => {
    setWidth(360)
    const w = mountEd()
    await flush()
    expect(order(w)).toEqual(['3', '2', '4'])
    await w.find('button[aria-label="ย้ายบรรทัด 3 ขึ้น"]').trigger('click')
    await flush()
    expect(order(w)).toEqual(['3', '4', '2'])
    // its head was 3,200px down the page and is now 1,700px: the page moves up by the same 1,500px,
    // at once, so the line (and its ▲) did not move on the screen
    expect(window.scrollBy).toHaveBeenLastCalledWith({ top: -1500, left: 0, behavior: 'instant' })
    expect(window.scrollTo).not.toHaveBeenCalled()
    // focus is on the moved line's ▲ — a second tap / Enter moves the SAME line again
    expect(document.activeElement?.getAttribute('aria-label')).toBe('ย้ายบรรทัด 2 ขึ้น')
    await w.find('button[aria-label="ย้ายบรรทัด 2 ขึ้น"]').trigger('click')
    await flush()
    expect(order(w)).toEqual(['4', '3', '2'])
    // the words of every ข้อ moved with it
    expect(w.vm.$.setupState.arrangement[0].syllables).toEqual(['ก3', 'ก1', 'ก2'])
    expect(w.vm.$.setupState.arrangement[1].syllables).toEqual(['ข3', 'ข1', 'ข2'])
    // now the first line: ▲ is greyed, focus went to its ▼ (never dropped to the page)
    expect(document.activeElement?.getAttribute('aria-label')).toBe('ย้ายบรรทัด 1 ลง')
    expect(document.querySelector('.dk-msg')?.textContent).toContain('ย้ายบรรทัด 2 ขึ้นไปเป็นบรรทัดที่ 1 แล้ว')
    w.unmount()
  })
})

describe('the edit header ▲▼', () => {
  async function headerTwice(width) {
    setWidth(width)
    const w = mountEd()
    await flush()
    await w.findAll('.ed-line')[2].find('input.note-box').trigger('focusin') // editing บรรทัด 3
    const up = w.find('.ed-mvline[aria-label="ย้ายบรรทัดขึ้น"]')
    await up.trigger('click')
    await flush()
    const once = order(w)
    await up.trigger('click')
    await flush()
    return { w, once, twice: order(w) }
  }

  it('phone: the page stays still (▲ stays under the finger) and every tap moves the line once more', async () => {
    const { w, once, twice } = await headerTwice(360)
    expect(once).toEqual(['3', '4', '2'])
    expect(twice).toEqual(['4', '3', '2'])
    expect(window.scrollTo).not.toHaveBeenCalled()
    expect(window.scrollBy).not.toHaveBeenCalled()
    // and the header carries no `top` there (it is not pinned on a phone)
    expect(w.find('.edhead').attributes('style') || '').not.toContain('top')
    w.unmount()
  })

  it('wide screen (pinned header): unchanged — the page still follows the moved line (ใบ#115)', async () => {
    const { w, once, twice } = await headerTwice(1280)
    expect(once).toEqual(['3', '4', '2'])
    expect(twice).toEqual(['4', '3', '2'])
    expect(window.scrollTo).toHaveBeenCalled()
    expect(w.find('.edhead').attributes('style')).toContain('top:')
    w.unmount()
  })
})
