// US-01 / DS-01 — one surface, three modes, and "switching modes never loses work".
// Studio is tested in isolation: the three mode components are stubbed, so this exercises
// the shell's own job — pick a mode, keep the central song, feed it to each surface.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// no routed id → the shell should open a brand-new song straight in the editor
vi.mock('vue-router', () => ({ useRoute: () => ({ params: {} }), useRouter: () => ({ push() {} }), onBeforeRouteLeave: () => {} }))

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
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
  Icon: true,
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

function modeButtons() {
  return [...document.querySelectorAll('#shell-menus .sb-mode-btn')]
}

describe('Studio shell — three modes on one surface (US-01)', () => {
  it('a bare /studio opens in the editor mode', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(true)
  })

  it('renders one component per mode (ดู→Viewer · แผ่น→Sheet · แก้→Editor)', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    const [view, sheet, edit] = modeButtons()
    expect(modeButtons().length).toBe(3)

    // give the shell a song so the reading surfaces have something to show
    wrapper.findComponent(EditorMode).vm.$emit('change', {
      id: null, number: null, title_th: 'x', title_en: '',
      content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] },
    })
    await nextTick()

    // the editor is always mounted (v-show) so its state persists; assert via `active`
    view.click(); await nextTick()
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(false)
    expect(wrapper.findComponent(SongViewer).exists()).toBe(true)

    sheet.click(); await nextTick()
    expect(wrapper.findComponent(SongSheet).exists()).toBe(true)

    edit.click(); await nextTick()
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(true)
  })

  it('an edit is not lost on switch: change() → shell keeps it → the reading view gets it', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    const edited = { id: null, number: 7, title_th: 'เพลงทดสอบ', title_en: '', content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] } }

    // the editor reports an edit …
    wrapper.findComponent(EditorMode).vm.$emit('change', edited)
    await nextTick()

    // … switch to ดู and the reading view receives that same song (work survived)
    modeButtons()[0].click()
    await nextTick()
    expect(wrapper.findComponent(SongViewer).props('song')).toMatchObject({ number: 7, title_th: 'เพลงทดสอบ' })
  })

  it('แผ่น mode shows the song title centered at the top of the sheet (US-I3)', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    wrapper.findComponent(EditorMode).vm.$emit('change', {
      id: null, number: 7, title_th: 'เพลงทดสอบ', title_en: '',
      content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] },
    })
    await nextTick()
    modeButtons()[1].click() // แผ่น
    await nextTick()
    // title prints in the sheet body (<h2>), NOT passed into SongSheet's footer
    expect(wrapper.find('.sheet-title').text()).toBe('7. เพลงทดสอบ')
  })

  it('gating flows from the store into every mode via the tier prop (DS-02/DS-04)', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    // logged-out session → anon tier handed to the editor
    expect(wrapper.findComponent(EditorMode).props('tier')).toBe('anon')
  })
})
