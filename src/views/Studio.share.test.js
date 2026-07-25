// EPIC H — the ↗ share button on the song surface. The engine (lib/share.js · lib/qr.js ·
// ShareSheet) already shipped with the playlists; this covers the WIRING: the button opens the
// sheet for the OPEN song, at the key it is being read, and a link built here opens back on that
// same song + key (the round-trip).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, onMounted } from 'vue'

const SONG = {
  id: 'abc-123',
  number: 7,
  title_th: 'พระเจ้าทรงเป็นความรัก',
  title_en: null,
  content: { key: 'C', timeSignature: '4/4', lines: [] },
}

// the route is swapped per test (a bare /song/:id vs one opened from a shared ?key= link)
let routeStub = { params: { id: SONG.id }, query: {} }
vi.mock('vue-router', () => ({
  useRoute: () => routeStub,
  useRouter: () => ({ push() {} }),
  onBeforeRouteLeave: () => {},
}))

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: SONG, error: null })
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
import ShareSheet from '../components/ShareSheet.vue'

// SongViewer is stubbed down to the two things this wiring depends on: it takes a start key and
// reports the key being read back up.
const stubs = {
  SongViewer: {
    name: 'SongViewer',
    props: ['song', 'startKey'],
    emits: ['key-change'],
    template: '<div class="stub-viewer" />',
  },
  SongSheet: { name: 'SongSheet', props: ['content', 'displayKey'], template: '<div class="stub-sheet" />' },
  // FAITHFUL TO PRODUCTION: the editor is mounted alongside the reading surfaces (v-show) and
  // hands its BLANK draft up on mount — i.e. BEFORE the routed song's fetch resolves. Every test
  // below therefore runs through the same ordering the live app has, which is where the ?key=
  // round-trip first broke.
  EditorMode: {
    name: 'EditorMode',
    props: ['song', 'tier', 'active'],
    emits: ['change', 'save'],
    setup(_, { emit }) {
      onMounted(() => emit('change', { id: null, number: null, title_th: '', content: { key: 'C', timeSignature: '4/4', lines: [] } }))
    },
    template: '<div class="stub-editor" />',
  },
  DockKey: true,
  ExportTool: true,
  ComboSelect: true,
  Icon: true,
}

beforeEach(() => {
  routeStub = { params: { id: SONG.id }, query: {} }
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

const shareBtn = () => document.querySelector('#shell-menus .sb-share-btn')

// enough ticks for the whole real sequence to settle: editor mounts and emits its blank draft →
// the routed fetch resolves → the song + key watchers run
async function openSong(query = {}) {
  routeStub = { params: { id: SONG.id }, query }
  const wrapper = mount(Studio, { global: { stubs }, attachTo: document.body })
  for (let i = 0; i < 6; i++) await nextTick()
  return wrapper
}

describe('Studio — ↗ แชร์ wiring (EPIC H)', () => {
  it('shows the ↗ button only once a song is open', async () => {
    routeStub = { params: {}, query: {} } // bare /studio = no song yet
    const wrapper = mount(Studio, { global: { stubs }, attachTo: document.body })
    await nextTick()
    expect(shareBtn()).toBe(null)
    wrapper.unmount()

    await openSong()
    expect(shareBtn()).not.toBe(null)
  })

  it('the button is a labelled dialog trigger (WCAG 2.2 — name + role, not a bare glyph)', async () => {
    await openSong()
    const b = shareBtn()
    expect(b.getAttribute('aria-label')).toBeTruthy()
    expect(b.getAttribute('aria-haspopup')).toBe('dialog')
    expect(b.getAttribute('aria-expanded')).toBe('false')
  })

  it('clicking it opens ShareSheet with a link to THIS song', async () => {
    const wrapper = await openSong()
    expect(wrapper.findComponent(ShareSheet).exists()).toBe(false)

    shareBtn().click()
    await nextTick()

    const sheet = wrapper.findComponent(ShareSheet)
    expect(sheet.exists()).toBe(true)
    expect(sheet.props('url')).toContain('#/song/' + SONG.id)
    expect(sheet.props('title')).toContain(SONG.title_th)
    expect(shareBtn().getAttribute('aria-expanded')).toBe('true')
  })

  it('an untouched song shares a clean link (no ?key=)', async () => {
    const wrapper = await openSong()
    shareBtn().click()
    await nextTick()
    expect(wrapper.findComponent(ShareSheet).props('url')).not.toContain('key=')
  })

  it('a transposed reading shares THAT key (?key=), so the link opens where the user is', async () => {
    const wrapper = await openSong()
    wrapper.findComponent({ name: 'SongViewer' }).vm.$emit('key-change', 'G')
    await nextTick()

    shareBtn().click()
    await nextTick()
    expect(wrapper.findComponent(ShareSheet).props('url')).toContain('key=G')
  })

  it('round-trip: opening that link starts ฝึกร้อง on the shared key', async () => {
    const wrapper = await openSong({ key: 'G' })
    expect(wrapper.findComponent({ name: 'SongViewer' }).props('startKey')).toBe('G')
  })

  it('a junk ?key= is ignored — the reader never lands on a key we cannot render', async () => {
    const wrapper = await openSong({ key: 'H#dim' })
    expect(wrapper.findComponent({ name: 'SongViewer' }).props('startKey')).toBe('')
  })

  // REGRESSION (found live at :5342, not by a test): the blank draft the editor emits on mount
  // arrives BEFORE the routed song. Spending the link key on that blank song put แผ่นเพลง back
  // on the stored key, so a shared link opened at the wrong key.
  it('the blank draft emitted before the routed song does not spend the link key', async () => {
    const wrapper = await openSong({ key: 'D' })
    expect(wrapper.findComponent({ name: 'SongSheet' }).props('displayKey')).toBe('D')
  })

  it('the link key does not leak to the NEXT song opened', async () => {
    const wrapper = await openSong({ key: 'D' })
    expect(wrapper.findComponent({ name: 'SongSheet' }).props('displayKey')).toBe('D')

    // a different song loads into the same (still-mounted) shell — it must show its OWN key
    wrapper.findComponent({ name: 'EditorMode' }).vm.$emit('change', {
      id: 'other-9', number: 9, title_th: 'อีกเพลง', content: { key: 'E', timeSignature: '4/4', lines: [] },
    })
    await nextTick()
    expect(wrapper.findComponent({ name: 'SongSheet' }).props('displayKey')).toBe('E')
  })

  it('closing the sheet leaves the button ready to open it again', async () => {
    const wrapper = await openSong()
    shareBtn().click()
    await nextTick()
    wrapper.findComponent(ShareSheet).vm.$emit('close')
    await nextTick()
    expect(wrapper.findComponent(ShareSheet).exists()).toBe(false)
    expect(shareBtn().getAttribute('aria-expanded')).toBe('false')
  })
})
