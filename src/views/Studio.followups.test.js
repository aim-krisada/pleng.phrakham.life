// US-05 / DS-05 — "เปิด/เลือกเพลง" lives on the shell (works in every mode, no jump to แก้).
// US-06 / DS-06 — a 🖨 print button in the แผ่น toolbar triggers window.print().
// Studio is mounted in isolation; the three mode components + ComboSelect are stubbed, so
// this exercises the shell's own job: expose the picker everywhere, open a song while
// KEEPING the current mode, and trigger print from the sheet toolbar.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'

// a mutable, reactive route + a router.push that navigates it (so the shell's route
// watcher actually fires, letting us prove a song-switch preserves the current mode)
const h = vi.hoisted(() => ({ route: null, push: null }))
vi.mock('vue-router', () => ({
  useRoute: () => h.route,
  useRouter: () => ({ push: h.push }),
}))

// chainable Supabase stub — every query resolves empty; nothing hits the network
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
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  }
})

import Studio from './Studio.vue'
import SongViewer from '../components/SongViewer.vue'
import EditorMode from '../components/EditorMode.vue'
import { shellMenu } from '../store.js'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
  ComboSelect: { name: 'ComboSelect', props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<input class="stub-combo" />' },
  Icon: true,
}

beforeEach(() => {
  h.route = reactive({ params: {} })
  h.push = vi.fn((to) => {
    const m = /^\/song\/(.+)$/.exec(to)
    if (m) h.route.params.id = m[1]
  })
  shellMenu.value = null
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

const openBtn = () => document.querySelector('#shell-menus .sb-open-btn')
const modeBtns = () => [...document.querySelectorAll('#shell-menus .sb-mode-btn')]
const isEditActive = (w) => w.findComponent(EditorMode).props('active')

describe('Studio shell — "เพลง ▾" panel on the shell (US-05 / S2)', () => {
  it('the "เพลง ▾" button shows in อ่าน/แผ่น; in แก้ไข the editor owns the menu (no dup, B003)', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    const [view, sheet, edit] = modeBtns()
    view.click(); await nextTick(); expect(openBtn()).toBeTruthy()
    sheet.click(); await nextTick(); expect(openBtn()).toBeTruthy()
    edit.click(); await nextTick(); expect(openBtn()).toBeFalsy()
  })

  it('จิ้มเพลง = เปิดเลย — picking a song navigates to /song/:id immediately (no OK button)', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    modeBtns()[0].click(); await nextTick() // ดู (so the "เพลง ▾" button is present)
    openBtn().click(); await nextTick() // open the panel
    expect(document.querySelector('.sb-open-go')).toBeFalsy() // there is no OK button anymore
    w.findComponent({ name: 'ComboSelect' }).vm.$emit('update:modelValue', 'song-42')
    await nextTick()
    expect(h.push).toHaveBeenCalledWith('/song/song-42') // opened on pick, no extra click
  })

  it('opening a song from ดู stays in ดู — never jumps into แก้', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    modeBtns()[0].click(); await nextTick() // switch to ดู
    expect(isEditActive(w)).toBe(false)

    openBtn().click(); await nextTick()
    w.findComponent({ name: 'ComboSelect' }).vm.$emit('update:modelValue', 'song-7')
    await nextTick(); await nextTick() // let the route watcher run
    expect(h.route.params.id).toBe('song-7') // the song did switch
    expect(isEditActive(w)).toBe(false) // …and the mode was preserved (still ดู)
  })
})

describe('Studio shell — print in โหมดแผ่น (US-06)', () => {
  it('the shared dock exposes a print tool that calls window.print() (N1)', async () => {
    const spy = vi.spyOn(window, 'print').mockImplementation(() => {})
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    modeBtns()[1].click(); await nextTick() // switch to แผ่น
    // print moved into the ONE shared <StudioDock> (dock-core / N1), no separate toolbar
    const btn = w.find('.sd-tools .sd-tbtn[data-tool="print"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
