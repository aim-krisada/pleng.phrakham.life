// GATE leak fix #2 — the shell's "เพลง ▾ → เปิดเพลงที่มีอยู่" picker on Studio must obey the
// same public visibility gate as the home list (SongList) and the editor's own picker
// (EditorMode): anon (not logged in) sees ONLY verified songs; the logged-in team sees
// everything (so they can open unverified songs to review/fix). Round 24 fixed EditorMode's
// picker but MISSED this one — a separate code path (the shell menu) that still pulled every
// song unfiltered, leaking unverified songs to the public. The filter reuses
// bookshelf.visibleSongs (single source of truth) inside the pickerOptions computed, so it
// re-filters on login/logout without reloading the list.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

// no routed id → the shell just needs to mount; we drive the picker directly
vi.mock('vue-router', () => ({ useRoute: () => ({ params: {} }), useRouter: () => ({ push() {} }), onBeforeRouteLeave: () => {} }))

// chainable Supabase stub — every query resolves empty; this suite seeds songList directly so
// the picker gate is tested in isolation from the network.
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
import { session, legacy, profile } from '../store.js'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle'], template: '<div />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div />' },
  DockKey: true,
  ExportTool: true,
  ComboSelect: true,
  Icon: true,
}

// two verified + one unverified — the picker must hide the unverified one from anon only.
const SONGS = [
  { id: 's1', number: 1, title_th: 'เพลงตรวจแล้วหนึ่ง', title_en: '', verified: true },
  { id: 's2', number: 2, title_th: 'เพลงยังไม่ตรวจ', title_en: '', verified: false },
  { id: 's3', number: 3, title_th: 'เพลงตรวจแล้วสอง', title_en: '', verified: true },
]

// tier is derived in the store from session/legacy/profile — drive it there (the shell reads
// the store's `tier`, not a prop). null session → anon · truthy session (non-approver) → editor.
function setTier(t) {
  if (t === 'anon') {
    session.value = null
  } else {
    session.value = { user: { id: 'u1' } }
    legacy.value = false
    profile.value = { role: 'editor' }
  }
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = null
  legacy.value = false
  profile.value = null
})

// mount + let onMounted's async loadSongList settle (mock → []) BEFORE we seed songList, so the
// seed isn't clobbered by the initial empty load resolving late.
const mountStudio = async (tier) => {
  setTier(tier)
  const w = mount(Studio, { global: { stubs } })
  await flushPromises()
  w.vm.songList = SONGS
  await nextTick()
  return w
}

const songLabels = (w) => w.vm.pickerOptions.map((o) => o.label)

describe('Studio shell — "เปิดเพลงที่มีอยู่" picker visibility gate (leak #2)', () => {
  it('anon sees only verified songs in the picker', async () => {
    const w = await mountStudio('anon')
    const labels = songLabels(w)
    expect(labels).toEqual(['1. เพลงตรวจแล้วหนึ่ง', '3. เพลงตรวจแล้วสอง'])
    expect(labels.some((l) => l.includes('ยังไม่ตรวจ'))).toBe(false)
  })

  it('a logged-in editor sees every song (verified + unverified) to review/fix', async () => {
    const w = await mountStudio('editor')
    const labels = songLabels(w)
    expect(labels).toHaveLength(3)
    expect(labels).toContain('2. เพลงยังไม่ตรวจ')
  })

  it('re-filters on login/logout without reloading the list', async () => {
    const w = await mountStudio('anon')
    expect(songLabels(w)).toHaveLength(2) // anon → verified only

    setTier('editor') // logs in — no reload
    await nextTick()
    expect(songLabels(w)).toHaveLength(3) // team → all appear

    setTier('anon') // logs out
    await nextTick()
    expect(songLabels(w)).toHaveLength(2) // unverified hidden again
  })

  it('search options carry the same gate (anon has no unverified haystack)', async () => {
    const w = await mountStudio('anon')
    const haystacks = w.vm.pickerOptions.map((o) => o.search).join(' ')
    expect(haystacks).not.toContain('ยังไม่ตรวจ')
  })
})
