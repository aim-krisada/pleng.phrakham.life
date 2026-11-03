// US-05 / DS-05 — "เปิด/เลือกเพลง" lives on the shell (works in every mode, no jump to แก้).
// US-06 / DS-06 — a print button on the แผ่น page triggers window.print() (ใบ#146: in the ก่อนพิมพ์ panel).
// Studio is mounted in isolation; the three mode components + ComboSelect are stubbed, so
// this exercises the shell's own job: expose the picker everywhere, open a song while
// KEEPING the current mode, and trigger print from the sheet page.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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

import Studio from './Studio.vue'
import SongViewer from '../components/SongViewer.vue'
import EditorMode from '../components/EditorMode.vue'
import { shellMenu } from '../store.js'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
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

const isEditActive = (w) => w.findComponent(EditorMode).props('active')

// ใบ v3/pleng#141 — the song page's second row (เพลง ▾ + ฝึกร้อง · แผ่นเพลง · แก้ไข) is gone: another song is
// found with the top bar's ค้นหา, แก้ไข is ✎ (ใบ#145) and ก่อนพิมพ์ is ดาวน์โหลด › พิมพ์ (ใบ#146) or ดูแผ่นเพลง.
describe('Studio shell — no second row (ใบ#141)', () => {
  it('Studio puts nothing of its own on the shell bar, on any page', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    const own = () => document.querySelectorAll('#shell-menus .sb-mode-btn, #shell-menus .sb-modes, #shell-menus .sb-open-btn')
    expect(own().length).toBe(0) // แก้ไข (a bare /studio)
    await w.find('.ed-sheet-btn').trigger('click')
    expect(own().length).toBe(0) // ก่อนพิมพ์
    h.route.params.id = 'song-7'
    await nextTick(); await nextTick()
    expect(isEditActive(w)).toBe(false)
    expect(own().length).toBe(0) // ฝึกร้อง
  })

  // the top-bar ค้นหา goes to the home list (ShellBar goSearch); a song picked there mounts this page anew
  it('a song opened from the list or a link lands in ฝึกร้อง, never in แก้ไข', async () => {
    h.route = reactive({ params: { id: 'song-7' }, query: {} }) // a real route always has a query
    const w = mount(Studio, { global: { stubs } })
    await flushPromises()
    expect(isEditActive(w)).toBe(false)
    expect(w.find('.sheet-workspace').element.style.display).toBe('none')
  })
})

describe('Studio shell — print in โหมดแผ่น (US-06)', () => {
  it('the ก่อนพิมพ์ panel has a พิมพ์ button that calls window.print() (N1 · ใบ#146)', async () => {
    const spy = vi.spyOn(window, 'print').mockImplementation(() => {})
    const w = mount(Studio, { global: { stubs } })
    await nextTick()
    await w.find('.ed-sheet-btn').trigger('click') // ดูแผ่นเพลง (ใบ#141)
    // ใบ#146 — the bottom bar is gone; พิมพ์ ends the settings panel beside the paper
    const btn = w.find('.pv-set .pv-print')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
