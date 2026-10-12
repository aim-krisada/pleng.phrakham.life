// ใบ v3/pleng#108 → #111 — the dock is a BAR fixed to the bottom edge: full width, no drag, no
// collapse grip, no โปร่งใส, solid. ใบ#108 did this on a phone for ฝึกร้อง and แผ่นเพลง;
// ใบ#111 makes it the ONLY dock — every width, all three pages (ฝึกร้อง · แผ่นเพลง · แก้ไข).
// jsdom has no layout, so the viewport is faked through window.matchMedia.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import DockKey from './DockKey.vue'
import SingTransport from './SingTransport.vue'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}

const realMM = window.matchMedia
function setWidth(px) {
  window.matchMedia = (q) => {
    const m = /max-width:\s*(\d+)px/.exec(q)
    return { matches: m ? px <= +m[1] : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}
const WIDTHS = [375, 712, 1024, 1280, 1920]

// a page that still hands over the old grip + โปร่งใส items must not get them back
const items = () => [
  { id: 'grip', kind: 'grip', name: 'ย้าย', place: { anchor: 'left', row: 1 } },
  { id: 'play', kind: 'play', name: 'เล่น', place: { anchor: 'rightOf:grip', row: 1 }, control: { value: false }, run: () => {} },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'repeat', kind: 'toggle', name: 'วนซ้ำ', icon: 'repeat', default: 'inSetting', pinnable: true, control: { value: false, onToggle: () => {} } },
  { id: 'alpha', kind: 'slider', name: 'โปร่งใส', icon: 'blend', default: 'inSetting', pinnable: true, hideOnBar: true, control: { min: 40, max: 100, value: 60, onInput: () => {} } },
]
const mountDK = (props = {}) => mount(DockKey, {
  props: { items: items(), storeKey: 'bar', ...props },
  global: { stubs: { Icon: true } },
  attachTo: document.body,
})
const openSetting = async (w) => { await w.find('.dk-gear').trigger('click'); await nextTick() }

beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
afterEach(() => { window.matchMedia = realMM })

describe('DockKey — one bar at every width (ใบ#111)', () => {
  for (const px of WIDTHS) {
    it(`${px}px: fixed bottom bar, no grip, no see-through, no mini dock`, async () => {
      setWidth(px)
      const w = mountDK()
      await nextTick()
      expect(w.find('.dk-host').classes()).toContain('dk-bar')
      expect(w.find('[data-grip]').exists()).toBe(false)
      expect(w.find('.dk-mini').exists()).toBe(false)
      expect(w.find('.dk-host').attributes('style') || '').not.toContain('--a')
      expect(w.find('.dk-dock').attributes('style') || '').not.toContain('translate')
    })
  }

  it('the ⚙ panel has no โปร่งใส row, other rows stay', async () => {
    setWidth(1280)
    const w = mountDK()
    await nextTick()
    await openSetting(w)
    expect(w.find('.dk-panel [data-setting="alpha"]').exists()).toBe(false)
    expect(w.find('.dk-panel [data-setting="repeat"]').exists()).toBe(true)
  })

  it('a โปร่งใส pinned in the past does not come back on the bar', async () => {
    setWidth(1280)
    localStorage.setItem('pleng.dockkey.bar.pins', JSON.stringify(['alpha', 'repeat']))
    const w = mountDK()
    await nextTick()
    expect(w.find('.dk-row [data-cell="alpha"]').exists()).toBe(false)
    expect(w.find('.dk-row [data-cell="repeat"]').exists()).toBe(true)
  })
})

// ---------- the real pages ----------
const singProps = {
  playing: false, loop: false, frac: 0, totalSec: 60, markers: [], tags: [], selected: new Set(), hasSections: false,
  settings: [{ id: 'chord', icon: 'guitar', label: 'คอร์ด', kind: 'menu', value: 'letter', badge: 'ABC', options: [{ value: 'letter', label: 'ตัวอักษร' }], onPick: () => {} }],
}
const mountSing = () => mount(SingTransport, { props: singProps, global: { stubs: { Icon: true } }, attachTo: document.body })

describe('ฝึกร้อง dock (SingTransport)', () => {
  for (const px of [375, 1280]) {
    it(`${px}px: bar, no grip, no โปร่งใส in ⚙, named toolbar`, async () => {
      setWidth(px)
      const w = mountSing()
      await nextTick()
      expect(w.find('.dk-host').classes()).toContain('dk-bar')
      expect(w.find('[data-grip]').exists()).toBe(false)
      expect(w.find('.dk-dock').attributes('role')).toBe('toolbar')
      expect(w.find('.dk-dock').attributes('aria-label')).toBe('แถบเล่นเพลง')
      await openSetting(w)
      expect(w.find('.dk-panel [data-setting="alpha"]').exists()).toBe(false)
      expect(w.find('.dk-panel [data-setting="chord"]').exists()).toBe(true)
    })
  }
})

// แผ่นเพลง lives in Studio; mount it with the other modes stubbed (as Studio.followups does)
const h = vi.hoisted(() => ({ route: null }))
vi.mock('vue-router', () => ({ useRoute: () => h.route, useRouter: () => ({ push: () => {} }) }))
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
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  }
})
const Studio = (await import('../views/Studio.vue')).default
const studioStubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], template: '<div class="stub-editor" />' },
  ComboSelect: { name: 'ComboSelect', template: '<input />' },
  ExportTool: true,
  Icon: true,
}
const mountStudio = () => {
  h.route = reactive({ params: {} })
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  return mount(Studio, { global: { stubs: studioStubs }, attachTo: document.body })
}

describe('แผ่นเพลง dock (Studio print)', () => {
  for (const px of [375, 1280]) {
    it(`${px}px: bar, no grip, named toolbar, พิมพ์ first`, async () => {
      setWidth(px)
      const w = mountStudio()
      await nextTick()
      const host = w.find('.sheet-workspace .dk-host')
      expect(host.exists()).toBe(true)
      expect(host.classes()).toContain('dk-bar')
      expect(w.find('.sheet-workspace [data-grip]').exists()).toBe(false)
      expect(w.find('.sheet-workspace .dk-dock').attributes('aria-label')).toBe('แถบแผ่นเพลง')
      expect(w.find('.sheet-workspace .dk-btnrow [data-cell]').attributes('data-cell')).toBe('print')
    })
  }
})
