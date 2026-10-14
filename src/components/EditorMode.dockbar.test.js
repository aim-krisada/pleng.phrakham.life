// ใบ v3/pleng#108 made the phone bottom BAR for ฝึกร้อง and แผ่นเพลง only; ใบ#111 gives the แก้ไข
// dock the same bar at every width (no grip, no fold, no โปร่งใส).
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

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const SONG = {
  id: 's1', number: 5, title_th: 'เพลงทดสอบ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

const realMM = window.matchMedia
function setWidth(px) {
  window.matchMedia = (q) => {
    const m = /max-width:\s*(\d+)px/.exec(q)
    return { matches: m ? px <= +m[1] : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}
beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})
afterEach(() => { window.matchMedia = realMM })

const mountEd = () => mount(EditorMode, {
  props: { song: SONG, tier: 'approver', active: true },
  attachTo: document.body,
  global: { stubs: { Icon: true, 'router-link': true, ExportTool: true, ComboSelect: true } },
})

// ใบ v3/pleng#111 — the แก้ไข dock is now the same fixed bottom bar as the other two pages, at
// every width: no grip (no drag, no fold), no โปร่งใส, a named toolbar, the key band on top.
describe('แก้ไข dock is the bottom bar at every width (ใบ#111)', () => {
  for (const [label, px] of [['phone 375', 375], ['tablet 712', 712], ['desktop 1280', 1280], ['wide 1920', 1920]]) {
    it(`${label}: bar, no grip, named toolbar, key band + buttons`, async () => {
      setWidth(px)
      const w = mountEd()
      await nextTick()
      const host = w.find('.dk-host')
      expect(host.exists()).toBe(true)
      expect(host.classes()).toContain('dk-bar')
      expect(w.find('.dk-host [data-grip]').exists()).toBe(false)
      expect(w.find('.dk-mini').exists()).toBe(false)
      const dock = w.find('.dk-host .dk-dock')
      expect(dock.attributes('role')).toBe('toolbar')
      expect(dock.attributes('aria-label')).toBe('แถบแก้ไข')
      if (px < 1024) {
        // ใบ#114 — on a phone the note keypad shows only while a note cell is being edited
        // (ใบ#118: every screen narrower than 1024px)
        expect(w.find('.dk-host .dk-keys').exists()).toBe(false)
        const note = w.find('input.note-box').element
        note.focus()
        note.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
        await nextTick()
      }
      expect(w.find('.dk-host .dk-keys .dk-key').exists()).toBe(true)
      // the first button is ย้อน (it used to sit right of the grip)
      expect(w.find('.dk-host .dk-btnrow [data-cell]').attributes('data-cell')).toBe('undo')
      w.unmount()
    })
  }

  it('an old remembered fold / see-through for the editor is ignored and cleared', async () => {
    setWidth(1280)
    localStorage.setItem('pleng.dockkey.edit.collapsed', '1')
    localStorage.setItem('pleng.dockkey.edit.alpha', '0.4')
    const w = mountEd()
    await nextTick()
    expect(w.find('.dk-mini').exists()).toBe(false)
    expect(w.find('.dk-host .dk-keys').exists()).toBe(true)
    expect(localStorage.getItem('pleng.dockkey.edit.collapsed')).toBeNull()
    expect(localStorage.getItem('pleng.dockkey.edit.alpha')).toBeNull()
    w.unmount()
  })
})

// ใบ#111 ข้อ 3 — on a touch screen the on-screen keyboard comes up for a text field; the bar
// steps aside while a field in the editor has focus, and comes back when it loses focus.
describe('แก้ไข bar steps aside for the on-screen keyboard (ใบ#111)', () => {
  const touch = (on) => {
    window.matchMedia = (q) => ({
      matches: /pointer: coarse/.test(q) ? on : false,
      media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    })
  }
  const field = (w) => w.findAll('input').find((i) => ['text', 'search', null, undefined, ''].includes(i.attributes('type')) && !i.element.closest('.dk-host'))

  it('touch: focusing a field hides the bar; leaving it brings the bar back', async () => {
    touch(true)
    const w = mountEd()
    await nextTick()
    const f = field(w)
    expect(f).toBeTruthy()
    f.element.focus()
    f.element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await nextTick()
    expect(w.find('.dk-host').classes()).toContain('dk-kbd')
    f.element.blur()
    f.element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 5))
    await nextTick()
    expect(w.find('.dk-host').classes()).not.toContain('dk-kbd')
    w.unmount()
  })

  it('mouse + keyboard (no touch): the bar stays while typing', async () => {
    touch(false)
    const w = mountEd()
    await nextTick()
    const f = field(w)
    f.element.focus()
    f.element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await nextTick()
    expect(w.find('.dk-host').classes()).not.toContain('dk-kbd')
    w.unmount()
  })
})
