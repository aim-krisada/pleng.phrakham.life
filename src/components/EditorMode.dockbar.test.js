// ใบ v3/pleng#108 — the phone bottom BAR is for ฝึกร้อง and แผ่นเพลง only. The แก้ไข dock must
// stay exactly as it was at every width: floating, with its grip (drag + collapse) and โปร่งใส.
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

describe('แก้ไข dock is not a bar at any width (ใบ#108)', () => {
  for (const [label, px] of [['phone 375', 375], ['desktop 1280', 1280]]) {
    it(`${label}: floating dock, grip kept`, async () => {
      setWidth(px)
      const w = mountEd()
      await nextTick()
      const host = w.find('.dk-host')
      expect(host.exists()).toBe(true)
      expect(host.classes()).not.toContain('dk-bar')
      expect(w.find('.dk-host [data-grip]').exists()).toBe(true)
      w.unmount()
    })
  }
})
