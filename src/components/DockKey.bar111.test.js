// ใบ v3/pleng#111 — ONE bottom bar at every width, on ฝึกร้อง · แผ่นเพลง · แก้ไข.
//   ข้อ 1  fixed, full width, solid, no drag / fold / see-through · role="toolbar" + a name
//   ข้อ 2  from 600px up: seek row on top, ONE centred button row below, contents in a centred
//          column ≤ 1200px (the buttons never run out to the screen edges)
//   ข้อ 3  touch screen + a text field focused (on-screen keyboard): the bar steps aside
//   ข้อ 4  short window (< 500px tall · 400% zoom): the bar joins the page flow, not fixed
//   ข้อ 5  popovers open upward, fit the screen, close with Esc, stay open until dismissed
//   ข้อ 8  old remembered fold / see-through values are ignored and cleared
// jsdom has no layout: the media queries are faked through window.matchMedia, and where a size
// matters it is stubbed on the elements. The CSS half is checked in the stylesheet itself.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'
import DockKey from './DockKey.vue'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const realMM = window.matchMedia
// fake viewport: width / height / a touch screen (no mouse)
function setView({ width = 1280, height = 800, touch = false } = {}) {
  window.matchMedia = (q) => {
    let matches = false
    const mw = /max-width:\s*(\d+)px/.exec(q)
    const mh = /max-height:\s*(\d+)px/.exec(q)
    if (mw) matches = width <= +mw[1]
    else if (mh) matches = height <= +mh[1]
    else if (/pointer:\s*coarse/.test(q)) matches = touch
    return { matches, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}

const items = () => [
  { id: 'back', kind: 'btn', name: 'ท่อนก่อน', icon: 'skip-back', place: { anchor: 'left', row: 1 }, run: () => {} },
  { id: 'play', kind: 'play', name: 'เล่น', place: { anchor: 'rightOf:back', row: 1 }, control: { value: false }, run: () => {} },
  { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 } },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'timeslide', kind: 'timeline', name: 'ไทม์ไลน์', place: { row: 2, col: 1 }, flex: '1 1 auto' },
  { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', place: { row: 2, col: 4 }, control: { options: [{ value: 'C', label: 'C' }, { value: 'D', label: 'D' }], value: 'C', badge: 'C', onPick: () => {} } },
  { id: 'speed', kind: 'slot', name: 'ความเร็ว', place: { row: 2, col: 5 } },
  { id: 'repeat', kind: 'toggle', name: 'วนซ้ำ', icon: 'repeat', default: 'inSetting', pinnable: true, control: { value: false, onToggle: () => {} } },
]
// page-drawn cells: a trigger + a popover with a field in it (like ความเร็ว / ขนาดตัวอักษร)
const Host = {
  components: { DockKey },
  props: ['items'],
  template: `<div>
    <input class="page-field" type="text" aria-label="ช่องในหน้า" />
    <DockKey :items="items" store-key="b111" label="แถบทดสอบ">
      <template #cell-timeslide><span class="t-seek" /></template>
      <template #cell-scale="{ open, toggle }"><button class="t-aa" aria-label="ขนาดตัวอักษร" :aria-expanded="open" @click.stop="toggle">Aa</button><div v-if="open" class="dk-pop p-aa" role="dialog" aria-label="ขนาดตัวอักษร"><input class="pop-field" type="range" aria-label="ขนาด" /></div></template>
      <template #cell-speed="{ open, toggle }"><button class="t-speed" aria-label="ความเร็ว" :aria-expanded="open" @click.stop="toggle">92</button><div v-if="open" class="dk-pop p-speed" role="dialog" aria-label="ความเร็ว"><input class="pop-num" type="number" aria-label="ความเร็ว" /></div></template>
    </DockKey>
  </div>`,
}
const mountBar = () => mount(Host, { props: { items: items() }, global: { stubs: { Icon: true } }, attachTo: document.body })
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }
const tick = () => new Promise((r) => setTimeout(r, 5))
const pops = (w) => w.findAll('.dk-pop')

const css = fs.readFileSync(path.resolve(__dirname, 'DockKey.vue'), 'utf8').split('<style scoped>')[1]
const rule = (sel) => {
  const i = css.indexOf(sel + ' {')
  return i < 0 ? '' : css.slice(i, css.indexOf('}', i) + 1)
}

beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
afterEach(() => { window.matchMedia = realMM })

describe('ข้อ 1 — a fixed, solid, full-width bar on every width', () => {
  for (const width of [375, 600, 1024, 1920]) {
    it(`${width}px: one bar, a named toolbar, nothing to drag or fold`, async () => {
      setView({ width })
      const w = mountBar()
      await flush()
      const host = w.find('.dk-host')
      expect(host.classes()).toEqual(expect.arrayContaining(['dk-host', 'dk-bar', 'no-print']))
      expect(host.classes()).not.toContain('dk-flow')
      const dock = w.find('.dk-dock')
      expect(dock.attributes('role')).toBe('toolbar')
      expect(dock.attributes('aria-label')).toBe('แถบทดสอบ')
      expect(w.find('[data-grip]').exists()).toBe(false)
      expect(w.find('.dk-mini').exists()).toBe(false)
    })
  }

  it('stylesheet: fixed to the bottom edge, edge to edge, opaque white, no blur / see-through', () => {
    expect(rule('.dk-host')).toMatch(/position: fixed;/)
    expect(rule('.dk-host')).toMatch(/left: 0;[\s\S]*right: 0;[\s\S]*bottom: 0;/)
    expect(rule('.dk-dock')).toMatch(/width: 100%;/)
    expect(rule('.dk-dock')).toMatch(/background: #fff;/)
    expect(css).not.toMatch(/rgba\(255, 255, 255, var\(--a/)
    expect(css).not.toMatch(/backdrop-filter/)
    expect(css).not.toMatch(/\.dk-grip|\.dk-mini/)
  })

  it('the page cannot ask for a see-through bar any more (no alpha prop)', () => {
    expect(DockKey.props.alpha).toBeUndefined()
    expect(DockKey.props.barOnMobile).toBeUndefined()
  })
})

describe('ข้อ 2 — from 600px up: seek row on top, one centred button row, ≤ 1200px column', () => {
  for (const width of [600, 1024, 1280, 1920]) {
    it(`${width}px: [seek] then [ท่อนก่อน เล่น Aa คีย์ ความเร็ว ⚙] in one row`, async () => {
      setView({ width })
      const w = mountBar()
      await flush()
      const rows = w.findAll('.dk-inner > .dk-row')
      expect(rows).toHaveLength(2)
      expect(rows[0].classes()).toContain('dk-seekrow')
      expect(rows[1].classes()).toContain('dk-btnrow')
      expect(rows[1].findAll(':scope > [data-cell]').map((e) => e.attributes('data-cell')))
        .toEqual(['back', 'play', 'scale', 'key', 'speed', 'setting'])
    })
  }

  it('stylesheet: the contents sit in a centred column at most 1200px wide; buttons centred, never spread', () => {
    expect(rule('.dk-inner')).toMatch(/max-width: 1200px;/)
    expect(rule('.dk-inner')).toMatch(/margin: 0 auto;/)
    expect(css).toMatch(/\.dk-bar \.dk-btnrow \{ justify-content: safe center;/)
    expect(css).not.toMatch(/space-(between|around|evenly)/)
  })
})

describe('ข้อ 3 — touch screen: the bar steps aside while a text field has focus', () => {
  it('a page field focused on a touch screen hides the bar (dk-kbd), and it returns on blur', async () => {
    setView({ width: 375, height: 812, touch: true })
    const w = mountBar()
    await flush()
    const f = w.find('.page-field').element
    f.focus()
    await flush()
    expect(w.find('.dk-host').classes()).toContain('dk-kbd')
    expect(css).toMatch(/\.dk-host\.dk-kbd \.dk-dock \{ display: none; \}/)
    f.blur()
    await tick()
    await flush()
    expect(w.find('.dk-host').classes()).not.toContain('dk-kbd')
  })

  it('a number box inside the bar’s own popover does not hide the bar under itself', async () => {
    setView({ width: 375, height: 812, touch: true })
    const w = mountBar()
    await flush()
    await w.find('.t-speed').trigger('click')
    await flush()
    w.find('.pop-num').element.focus()
    await flush()
    expect(w.find('.dk-host').classes()).not.toContain('dk-kbd')
  })

  it('with a mouse (no touch) the bar stays while typing', async () => {
    setView({ width: 1280, height: 800, touch: false })
    const w = mountBar()
    await flush()
    w.find('.page-field').element.focus()
    await flush()
    expect(w.find('.dk-host').classes()).not.toContain('dk-kbd')
  })
})

describe('ข้อ 4 — short window: the bar joins the page instead of covering it', () => {
  for (const [label, view] of [['1280×480', { width: 1280, height: 480 }], ['400% zoom of 1280×1024 = 320×256', { width: 320, height: 256 }], ['phone on its side 812×375', { width: 812, height: 375 }]]) {
    it(`${label}: dk-flow (not fixed), every button still there`, async () => {
      setView(view)
      const w = mountBar()
      await flush()
      expect(w.find('.dk-host').classes()).toContain('dk-flow')
      expect(w.findAll('.dk-btnrow [data-cell]').map((e) => e.attributes('data-cell'))).toEqual(['back', 'play', 'scale', 'key', 'speed', 'setting'])
    })
  }

  it('a tall window keeps the fixed bar; resizing across 500px switches back and forth', async () => {
    setView({ width: 1280, height: 800 })
    const w = mountBar()
    await flush()
    expect(w.find('.dk-host').classes()).not.toContain('dk-flow')
    setView({ width: 1280, height: 480 })
    window.dispatchEvent(new Event('resize'))
    await flush()
    expect(w.find('.dk-host').classes()).toContain('dk-flow')
    setView({ width: 1280, height: 800 })
    window.dispatchEvent(new Event('resize'))
    await flush()
    expect(w.find('.dk-host').classes()).not.toContain('dk-flow')
  })

  it('stylesheet: in a short window the bar is static (in the page flow)', () => {
    expect(css).toMatch(/\.dk-host\.dk-flow \{ position: static;/)
  })
})

describe('ข้อ 5 — popovers: upward, on screen, Esc, stay until dismissed', () => {
  it('every popover opens ABOVE the bar (bottom: 100% + 8px)', () => {
    expect(rule('.dk-pop')).toMatch(/position: absolute; bottom: calc\(100% \+ 8px\)/)
  })

  for (const [name, open, popSel] of [
    ['คีย์ (engine menu)', '[data-cell="key"] .dk-pbtn', '.dk-dd'],
    ['ความเร็ว (page popover)', '.t-speed', '.p-speed'],
    ['ขนาดตัวอักษร (page popover)', '.t-aa', '.p-aa'],
    ['⚙ ตั้งค่า', '.dk-gear', '.dk-panel'],
  ]) {
    it(`${name}: Esc closes it and focus goes back to its button`, async () => {
      setView({ width: 1280 })
      const w = mountBar()
      await flush()
      await w.find(open).trigger('click')
      await flush()
      expect(w.find(popSel).exists()).toBe(true)
      const inner = w.find(popSel).find('input, button, select')
      if (inner.exists()) inner.element.focus()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flush()
      expect(pops(w)).toHaveLength(0)
      if (inner.exists()) expect(document.activeElement).toBe(w.find(open).element)
    })
  }

  it('stays open when the pointer leaves, focus moves inside it, or the window scrolls — closes only on Esc / a click outside', async () => {
    setView({ width: 1280 })
    const w = mountBar()
    await flush()
    await w.find('.t-speed').trigger('click')
    await flush()
    const pop = w.find('.p-speed')
    await pop.trigger('mouseleave')
    await w.find('.dk-dock').trigger('mouseleave')
    w.find('.pop-num').element.focus()
    window.dispatchEvent(new Event('scroll'))
    await tick()
    await flush()
    expect(w.find('.p-speed').exists()).toBe(true)
    // a click on the bar itself (not on another trigger) keeps it open too
    w.find('.dk-dock').element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flush()
    expect(w.find('.p-speed').exists()).toBe(true)
    // a click outside the bar dismisses it
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flush()
    expect(w.find('.p-speed').exists()).toBe(false)
  })

  it('fits the screen: no taller than the room above the bar, right edge lined up with the button group', async () => {
    setView({ width: 1920, height: 1080 })
    const realRect = Element.prototype.getBoundingClientRect
    const realW = window.innerWidth, realH = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 })
    // the bar: 1920 wide, its top at 960; the button group ends at x = 1260; a popover 300×1200
    Element.prototype.getBoundingClientRect = function () {
      if (this.classList?.contains('dk-dock')) return { top: 960, bottom: 1080, left: 0, right: 1920, width: 1920, height: 120 }
      if (this.dataset?.cell === 'setting') return { top: 1020, bottom: 1068, left: 1212, right: 1260, width: 48, height: 48 }
      if (this.dataset?.cell) return { top: 1020, bottom: 1068, left: 700, right: 748, width: 48, height: 48 }
      if (this.classList?.contains('dk-pop')) {
        const right = 1920 - parseFloat(this.style.right || '8')
        const h = Math.min(1200, parseFloat(this.style.maxHeight) || 1200)
        return { top: 952 - h, bottom: 952, left: right - 300, right, width: 300, height: h }
      }
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }
    }
    try {
      const w = mountBar()
      await flush()
      await w.find('.dk-gear').trigger('click')
      await flush()
      const el = w.find('.dk-panel').element
      expect(el.style.right).toBe('660px') // 1920 − 1260: right edge = end of the button group
      expect(el.style.maxHeight).toBe('944px') // bar top 960 − 16
      expect(el.style.overflowY).toBe('auto')
      expect(el.style.transform).toBe('') // already fully on screen
    } finally {
      Element.prototype.getBoundingClientRect = realRect
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: realW })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: realH })
    }
  })
})

describe('ข้อ 8 — old remembered dock values are ignored and cannot break anything', () => {
  const junk = [
    ['collapsed', '1'], ['collapsed', 'yes'], ['alpha', '0.4'], ['alpha', 'NaN'], ['alpha', '{"x":1}'],
    ['pos', '{"x":-9999,"y":-9999}'], ['pins', '{not json'], ['pins', '[1,null,"repeat","nope"]'],
  ]
  it('a full bar shows whatever was saved; fold and see-through values are cleared', async () => {
    for (const [k, v] of junk) localStorage.setItem(`pleng.dockkey.b111.${k}`, v)
    setView({ width: 1280 })
    const w = mountBar()
    await flush()
    expect(w.find('.dk-mini').exists()).toBe(false)
    expect(w.find('.dk-dock').attributes('style') || '').not.toMatch(/translate|opacity/)
    expect(w.find('.dk-host').attributes('style') || '').not.toContain('--a')
    expect(w.findAll('.dk-btnrow [data-cell]').map((e) => e.attributes('data-cell'))).toEqual(['back', 'play', 'scale', 'key', 'speed', 'repeat', 'setting'])
    expect(localStorage.getItem('pleng.dockkey.b111.collapsed')).toBeNull()
    expect(localStorage.getItem('pleng.dockkey.b111.alpha')).toBeNull()
  })

  it('storage that throws (private mode) does not break the bar', async () => {
    const realGet = Storage.prototype.getItem, realSet = Storage.prototype.setItem, realRm = Storage.prototype.removeItem
    Storage.prototype.getItem = () => { throw new Error('blocked') }
    Storage.prototype.setItem = () => { throw new Error('blocked') }
    Storage.prototype.removeItem = () => { throw new Error('blocked') }
    try {
      setView({ width: 375 })
      const w = mountBar()
      await flush()
      expect(w.find('.dk-dock .dk-play').exists()).toBe(true)
    } finally {
      Storage.prototype.getItem = realGet
      Storage.prototype.setItem = realSet
      Storage.prototype.removeItem = realRm
    }
  })
})

describe('ข้อ 7 — printing: the bar never prints', () => {
  it('the host carries no-print (styles.css hides it in @media print)', async () => {
    setView({ width: 1280 })
    const w = mountBar()
    await flush()
    expect(w.find('.dk-host').classes()).toContain('no-print')
    const app = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8')
    expect(app).toMatch(/@media print \{[\s\S]*?\.no-print, footer\.site-footer \{ display: none !important; \}/)
  })

  // the room below the song shrank on screen only: the old rules stay as they were, because a
  // printed page reads them too (A4 is narrower than 760px) — so the page count cannot change
  it('the smaller gap below the song is screen-only; the rules print reads are untouched', () => {
    const viewer = fs.readFileSync(path.resolve(__dirname, 'SongViewer.vue'), 'utf8')
    expect(viewer).toMatch(/\.sheet-scale \{ padding-bottom: calc\(160px \+ env\(safe-area-inset-bottom, 0px\)\); \}/)
    expect(viewer).toMatch(/@media \(max-width: 480px\) \{\s*\.sheet-scale \{ padding-bottom: calc\(210px/)
    expect(viewer).toMatch(/@media \(max-width: 760px\) \{\s*\.sheet-scale \{ padding-bottom: 24px; \}\s*\}/)
    expect(viewer).toMatch(/@media screen \{\s*\.sheet-scale \{ padding-bottom: 24px; \}\s*\}/)
    const studio = fs.readFileSync(path.resolve(__dirname, '../views/Studio.vue'), 'utf8')
    expect(studio).toMatch(/\.sheet-workspace \{\s*padding-bottom: 88px;\s*\}/)
    expect(studio).toMatch(/@media \(max-width: 760px\) \{\s*\.sheet-workspace \{ padding-bottom: 24px; \}\s*\}/)
    expect(studio).toMatch(/@media screen \{\s*\.sheet-workspace \{ padding-bottom: 24px; \}\s*\}/)
  })
})
