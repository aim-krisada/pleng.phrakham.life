// US-01 / DS-01 — one surface, three modes, and "switching modes never loses work".
// Studio is tested in isolation: the three mode components are stubbed, so this exercises
// the shell's own job — pick a mode, keep the central song, feed it to each surface.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// no routed id → the shell should open a brand-new song straight in the editor
vi.mock('vue-router', () => ({ useRoute: () => ({ params: {} }), useRouter: () => ({ push() {} }) }))

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
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: { content: null, songTitle: null, screenTitle: Boolean }, template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
  Icon: true,
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

const SONG = { id: null, number: 7, title_th: 'เพลงทดสอบ', title_en: '', content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] } }
const shown = (w, sel) => w.find(sel).element.style.display !== 'none'

// ใบ v3/pleng#141 — no mode switch any more: the pages are reached by what is on them.
describe('Studio shell — three pages on one surface (US-01 · ใบ#141)', () => {
  it('a bare /studio opens in the editor mode', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(true)
  })

  it('แก้ไข › ดูแผ่นเพลง opens ก่อนพิมพ์, and its ← comes back to แก้ไข', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    wrapper.findComponent(EditorMode).vm.$emit('change', SONG)
    await nextTick()
    const btn = wrapper.find('.ed-back .ed-sheet-btn')
    expect(btn.text()).toContain('ดูแผ่นเพลง')
    await btn.trigger('click')
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(false)
    expect(shown(wrapper, '.sheet-workspace')).toBe(true)
    const back = wrapper.find('.pv-back')
    expect(back.attributes('aria-label')).toBe('กลับไปแก้ไข')
    await back.trigger('click')
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(true)
    expect(shown(wrapper, '.sheet-workspace')).toBe(false)
  })

  it('an unsaved edit reaches ก่อนพิมพ์ and ฝึกร้อง: change() → shell keeps it → every page gets it', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    // the editor reports an edit, nothing saved …
    wrapper.findComponent(EditorMode).vm.$emit('change', SONG)
    await nextTick()
    await wrapper.find('.ed-sheet-btn').trigger('click')
    // … and the paper and the reading view both draw that same song
    const sheetEl = wrapper.findAllComponents(SongSheet).find((c) => c.element.closest('.sheet-workspace'))
    expect(sheetEl.props('songTitle')).toBe('7. เพลงทดสอบ')
    expect(wrapper.findComponent(SongViewer).props('song')).toMatchObject({ number: 7, title_th: 'เพลงทดสอบ' })
  })

  it('ก่อนพิมพ์ shows the song title centered at the top of the sheet (US-I3)', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    wrapper.findComponent(EditorMode).vm.$emit('change', SONG)
    await nextTick()
    await wrapper.find('.ed-sheet-btn').trigger('click')
    // title heads the sheet on screen (SongHead · ใบ#144), NOT passed into SongSheet's footer
    const sheetEl = wrapper.findAllComponents(SongSheet).find((c) => c.element.closest('.sheet-workspace'))
    expect(sheetEl.props('screenTitle')).toBe(true)
    expect(wrapper.find('.sheet-workspace h2').exists()).toBe(false) // the old separate heading is gone
  })

  it('gating flows from the store into every mode via the tier prop (DS-02/DS-04)', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    // logged-out session → anon tier handed to the editor
    expect(wrapper.findComponent(EditorMode).props('tier')).toBe('anon')
  })
})
