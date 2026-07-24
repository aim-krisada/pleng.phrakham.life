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

// The mode tab-strip is gone (บริบท B). Navigation now: ‹ back returns any secondary surface
// to the reading view; the ⋮ overflow holds the surface switches (แผ่นเพลง / ตัวแก้แบบเต็ม).
async function modeButtons() {
  const more = document.querySelector('#shell-menus .sb-more-btn')
  if (more && more.getAttribute('aria-expanded') !== 'true') { more.click(); await nextTick() }
  return [...document.querySelectorAll('#shell-menus .sb-mode-btn')]
}
// ‹ back — the return path to the reading view (present in every mode, incl. แก้ไข).
async function back() {
  document.querySelector('#shell-title .sb-back-btn')?.click()
  await nextTick()
}

describe('Studio shell — three modes on one surface (US-01)', () => {
  it('a bare /studio opens in the editor mode', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(true)
  })

  it('renders one component per mode (‹→Viewer · ⋮แผ่น→Sheet · ⋮ตัวแก้เต็ม→Editor)', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()

    // bare /studio opens in the full editor; give the shell a song so the reading surfaces show
    wrapper.findComponent(EditorMode).vm.$emit('change', {
      id: null, number: null, title_th: 'x', title_en: '',
      content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] },
    })
    await nextTick()

    // ‹ back → the reading view (the editor is always mounted via v-show; assert via `active`)
    await back()
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(false)
    expect(wrapper.findComponent(SongViewer).exists()).toBe(true)
    expect((await modeButtons()).length).toBe(3) // three surface switches live in the ⋮

    // ⋮ → แผ่นเพลง
    ;(await modeButtons())[1].click(); await nextTick()
    expect(wrapper.findComponent(SongSheet).exists()).toBe(true)

    // ⋮ → ตัวแก้แบบเต็ม (เดิม)
    ;(await modeButtons())[2].click(); await nextTick()
    expect(wrapper.findComponent(EditorMode).props('active')).toBe(true)
  })

  it('an edit is not lost on switch: change() → shell keeps it → the reading view gets it', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    const edited = { id: null, number: 7, title_th: 'เพลงทดสอบ', title_en: '', content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] } }

    // the editor reports an edit …
    wrapper.findComponent(EditorMode).vm.$emit('change', edited)
    await nextTick()

    // … ‹ back to the reading view and it receives that same song (work survived)
    await back()
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
    await back() // ‹ → reading view (the ⋮ is hidden in edit; reach the sheet from view)
    ;(await modeButtons())[1].click() // ⋮ → แผ่น
    await nextTick()
    // title prints in the sheet body (<h2>), NOT passed into SongSheet's footer
    expect(wrapper.find('.sheet-title').text()).toBe('7. เพลงทดสอบ')
  })

  // 24 ก.ค. — the tab strip vs the ✏️ inline editor (which lives INSIDE ฝึกร้อง).
  // Before: ฝึกร้อง read as the current view while the user was clearly in an editor, and
  // pressing it did nothing at all — a dead control reads as "the site is broken". The other
  // two switched away without a word, unsaved work and all.
  describe('the mode tabs while the ✏️ editor is open', () => {
    const exitStub = (ok) => ({
      SongViewer: {
        name: 'SongViewer', props: ['song'], emits: ['update:editing'],
        template: '<div class="stub-viewer" />',
        methods: { requestExitEdit: () => ok },
      },
    })

    // get the shell into ฝึกร้อง with a song, then open the inline ✏️ editor. Order matters:
    // ‹ back reaches the reading view FIRST (nothing is being edited yet, so it is not gated),
    // and only THEN does the viewer report ✏️ is on — matching a real click-into-edit.
    async function openViewer(ok) {
      const wrapper = mount(Studio, { global: { stubs: { ...stubs, ...exitStub(ok) } } })
      await nextTick()
      wrapper.findComponent(EditorMode).vm.$emit('change', {
        id: null, number: 7, title_th: 'เพลงทดสอบ', title_en: '',
        content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] },
      })
      await nextTick()
      await back() // ‹ → ฝึกร้อง (reading view)
      wrapper.findComponent(SongViewer).vm.$emit('update:editing', true) // now the ✏️ editor opens
      await nextTick(); await nextTick()
      return wrapper
    }

    it('no tab reads as current while editing — so pressing one is a real change', async () => {
      await openViewer(true)
      expect((await modeButtons()).map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false'])
    })

    it('pressing a tab asks the editor to leave first, and obeys a refusal', async () => {
      const wrapper = await openViewer(false)
      ;(await modeButtons())[1].click() // ⋮ → แผ่นเพลง
      await nextTick()
      expect(wrapper.find('.sheet-workspace').isVisible()).toBe(false) // refused → we stayed put
    })

    it('an accepted exit lets the tab through', async () => {
      const wrapper = await openViewer(true)
      ;(await modeButtons())[1].click() // ⋮ → แผ่นเพลง
      await nextTick()
      expect(wrapper.find('.sheet-workspace').isVisible()).toBe(true)
    })

    // Leaving with unsaved work is announced in flow, with the way back — not with a dialog
    // (the work is mirrored locally) and not with a floating toast (nothing floats over the
    // sheet any more). G cross-check 24 ก.ค.
    it('leaving with unsaved work shows an in-flow banner with a way back', async () => {
      const wrapper = await openViewer(true)
      expect(wrapper.find('.sv-leftdirty').exists()).toBe(false)
      wrapper.findComponent(SongViewer).vm.$emit('left-dirty')
      await nextTick()
      const banner = wrapper.find('.sv-leftdirty')
      expect(banner.exists()).toBe(true)
      expect(banner.text()).toContain('ยังอยู่ครบ')
      expect(banner.find('.rec-btn.primary').text()).toContain('กลับไปแก้')
    })
  })

  it('gating flows from the store into every mode via the tier prop (DS-02/DS-04)', async () => {
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    // logged-out session → anon tier handed to the editor
    expect(wrapper.findComponent(EditorMode).props('tier')).toBe('anon')
  })
})
