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
  onBeforeRouteLeave: () => {}, // Studio guards the inline editor's unsaved work (A-fix)
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

// item 6 — "เพลง ▾" became the ⋮ เพิ่มเติม overflow. Open it, then reveal "เปิดเพลงอื่น…" to
// get the search box (สร้างเพลงใหม่ is gone — create lives on the home catalog now).
const moreBtn = () => document.querySelector('#shell-menus .sb-more-btn')
const openOther = async () => { document.querySelector('#shell-menus .sb-more-item')?.click(); await nextTick() }
const modeBtns = () => [...document.querySelectorAll('#shell-menus .sb-mode-btn')]
const isEditActive = (w) => w.findComponent(EditorMode).props('active')

describe('Studio shell — ⋮ เพิ่มเติม overflow on the shell (US-05 / item 6)', () => {
  it('the ⋮ button shows in อ่าน/แผ่น; in แก้ไข the editor owns the menu (no dup, B003)', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    const [view, sheet, edit] = modeBtns()
    view.click(); await nextTick(); expect(moreBtn()).toBeTruthy()
    sheet.click(); await nextTick(); expect(moreBtn()).toBeTruthy()
    edit.click(); await nextTick(); expect(moreBtn()).toBeFalsy()
  })

  it('no "สร้างเพลงใหม่" in the menu (create lives on home) — only "เปิดเพลงอื่น…"', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    modeBtns()[0].click(); await nextTick() // ดู
    moreBtn().click(); await nextTick() // open ⋮
    expect(document.querySelector('.sb-song-new')).toBeFalsy() // create button is gone
    const item = document.querySelector('#shell-menus .sb-more-item')
    expect(item.textContent).toContain('เปิดเพลงอื่น')
  })

  it('จิ้มเพลง = เปิดเลย — picking a song navigates to /song/:id immediately (no OK button)', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    modeBtns()[0].click(); await nextTick() // ดู
    moreBtn().click(); await nextTick() // open ⋮
    await openOther() // reveal the search box
    expect(document.querySelector('.sb-open-go')).toBeFalsy() // no OK button
    w.findComponent({ name: 'ComboSelect' }).vm.$emit('update:modelValue', 'song-42')
    await nextTick()
    expect(h.push).toHaveBeenCalledWith('/song/song-42') // opened on pick, no extra click
  })

  it('opening a song from ดู stays in ดู — never jumps into แก้', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    modeBtns()[0].click(); await nextTick() // switch to ดู
    expect(isEditActive(w)).toBe(false)

    moreBtn().click(); await nextTick()
    await openOther()
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
    // print is the prime button on the แผ่นเพลง DockKey (ITEMS_PRINT), no separate toolbar
    const btn = w.find('.dk-dock [data-cell="print"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
