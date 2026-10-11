// ใบ v3/pleng#108 — on a phone (≤760px) the ฝึกร้อง and แผ่นเพลง docks become a BAR fixed to the
// bottom edge: full width, no drag, no collapse grip, no โปร่งใส, solid. Above 760px nothing
// changes, and the แก้ไข dock (which does not opt in) never changes at any width.
// jsdom has no layout, so the viewport is faked through window.matchMedia — the same switch
// DockKey reads ('(max-width: 760px)').
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
const PHONE = 375
const DESKTOP = 1280

const items = () => [
  { id: 'grip', kind: 'grip', name: 'ย้าย', place: { anchor: 'left', row: 1 } },
  { id: 'play', kind: 'play', name: 'เล่น', place: { anchor: 'rightOf:grip', row: 1 }, control: { value: false }, run: () => {} },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'repeat', kind: 'toggle', name: 'วนซ้ำ', icon: 'repeat', default: 'inSetting', pinnable: true, control: { value: false, onToggle: () => {} } },
  { id: 'alpha', kind: 'slider', name: 'โปร่งใส', icon: 'blend', default: 'inSetting', pinnable: true, hideOnBar: true, control: { min: 40, max: 100, value: 60, onInput: () => {} } },
]
const mountDK = (props = {}) => mount(DockKey, {
  props: { items: items(), storeKey: 'bar', alpha: 0.6, ...props },
  global: { stubs: { Icon: true } },
  attachTo: document.body,
})
const openSetting = async (w) => { await w.find('.dk-gear').trigger('click'); await nextTick() }

beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
afterEach(() => { window.matchMedia = realMM })

describe('DockKey bar-on-mobile — phone (≤760px)', () => {
  beforeEach(() => setWidth(PHONE))

  it('is a fixed bottom bar: .dk-bar, no grip, solid (no see-through)', async () => {
    const w = mountDK({ barOnMobile: true })
    await nextTick()
    expect(w.find('.dk-host').classes()).toContain('dk-bar')
    expect(w.find('[data-grip]').exists()).toBe(false)
    expect(w.find('.dk-host').attributes('style')).toContain('--a: 1')
  })

  it('the ⚙ panel has no โปร่งใส row, other rows stay', async () => {
    const w = mountDK({ barOnMobile: true })
    await nextTick()
    await openSetting(w)
    expect(w.find('.dk-panel [data-setting="alpha"]').exists()).toBe(false)
    expect(w.find('.dk-panel [data-setting="repeat"]').exists()).toBe(true)
  })

  it('a โปร่งใส pinned on the wide screen does not show on the bar either', async () => {
    localStorage.setItem('pleng.dockkey.bar.pins', JSON.stringify(['alpha', 'repeat']))
    const w = mountDK({ barOnMobile: true })
    await nextTick()
    expect(w.find('.dk-row [data-cell="alpha"]').exists()).toBe(false)
    expect(w.find('.dk-row [data-cell="repeat"]').exists()).toBe(true)
  })

  it('never shows the collapsed mini dock — and keeps the saved choice for the wide screen', async () => {
    localStorage.setItem('pleng.dockkey.bar.collapsed', '1')
    const w = mountDK({ barOnMobile: true })
    await nextTick()
    expect(w.find('.dk-mini').exists()).toBe(false)
    expect(w.find('.dk-dock .dk-play').exists()).toBe(true)
    expect(localStorage.getItem('pleng.dockkey.bar.collapsed')).toBe('1')
  })

  it('a dock without the opt-in (the แก้ไข page) is unchanged on a phone', async () => {
    const w = mountDK()
    await nextTick()
    expect(w.find('.dk-host').classes()).not.toContain('dk-bar')
    expect(w.find('[data-grip]').exists()).toBe(true)
    expect(w.find('.dk-host').attributes('style')).toContain('--a: 0.6')
    await openSetting(w)
    expect(w.find('.dk-panel [data-setting="alpha"]').exists()).toBe(true)
  })
})

describe('DockKey bar-on-mobile — wide screen (>760px) is unchanged', () => {
  beforeEach(() => setWidth(DESKTOP))

  it('floats as before: grip, transparency, ⚙ โปร่งใส row', async () => {
    const w = mountDK({ barOnMobile: true })
    await nextTick()
    expect(w.find('.dk-host').classes()).not.toContain('dk-bar')
    expect(w.find('[data-grip]').exists()).toBe(true)
    expect(w.find('.dk-host').attributes('style')).toContain('--a: 0.6')
    await openSetting(w)
    expect(w.find('.dk-panel [data-setting="alpha"]').exists()).toBe(true)
  })

  it('the saved collapsed state still shows the mini dock', async () => {
    localStorage.setItem('pleng.dockkey.bar.collapsed', '1')
    const w = mountDK({ barOnMobile: true })
    await nextTick()
    expect(w.find('.dk-mini').exists()).toBe(true)
  })

  it('the grip still drags the dock', async () => {
    const w = mountDK({ barOnMobile: true })
    await nextTick()
    const g = w.find('[data-grip]')
    await g.trigger('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 })
    await g.trigger('pointermove', { clientX: 140, clientY: 60, pointerId: 1 })
    await g.trigger('pointerup', { clientX: 140, clientY: 60, pointerId: 1 })
    await nextTick()
    expect(w.find('.dk-dock').attributes('style') || '').toContain('translate(')
  })
})

// ---------- the real pages ----------
const singProps = {
  playing: false, loop: false, frac: 0, totalSec: 60, markers: [], tags: [], selected: new Set(), hasSections: false,
  settings: [{ id: 'chord', icon: 'guitar', label: 'คอร์ด', kind: 'menu', value: 'letter', badge: 'ABC', options: [{ value: 'letter', label: 'ตัวอักษร' }], onPick: () => {} }],
}
const mountSing = () => mount(SingTransport, { props: singProps, global: { stubs: { Icon: true } }, attachTo: document.body })

describe('ฝึกร้อง dock (SingTransport)', () => {
  it('phone: bar, no grip, no โปร่งใส in ⚙', async () => {
    setWidth(PHONE)
    const w = mountSing()
    await nextTick()
    expect(w.find('.dk-host').classes()).toContain('dk-bar')
    expect(w.find('[data-grip]').exists()).toBe(false)
    await openSetting(w)
    expect(w.find('.dk-panel [data-setting="alpha"]').exists()).toBe(false)
    expect(w.find('.dk-panel [data-setting="chord"]').exists()).toBe(true)
  })

  it('wide: floating dock with grip and โปร่งใส as before', async () => {
    setWidth(DESKTOP)
    const w = mountSing()
    await nextTick()
    expect(w.find('.dk-host').classes()).not.toContain('dk-bar')
    expect(w.find('[data-grip]').exists()).toBe(true)
    await openSetting(w)
    expect(w.find('.dk-panel [data-setting="alpha"]').exists()).toBe(true)
  })
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
  it('phone: bar, no grip', async () => {
    setWidth(PHONE)
    const w = mountStudio()
    await nextTick()
    const host = w.find('.sheet-workspace .dk-host')
    expect(host.exists()).toBe(true)
    expect(host.classes()).toContain('dk-bar')
    expect(w.find('.sheet-workspace [data-grip]').exists()).toBe(false)
  })

  it('wide: floating dock with grip as before', async () => {
    setWidth(DESKTOP)
    const w = mountStudio()
    await nextTick()
    const host = w.find('.sheet-workspace .dk-host')
    expect(host.classes()).not.toContain('dk-bar')
    expect(w.find('.sheet-workspace [data-grip]').exists()).toBe(true)
  })
})
