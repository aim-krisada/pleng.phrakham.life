// GATE leak fix — the "เปิดเพลงที่มีอยู่" picker in the editor must obey the same public
// visibility gate as the home list (SongList): anon (not logged in) sees ONLY verified songs;
// the logged-in team sees everything (so they can open unverified songs to fix/review). Before
// the fix, loadSongList() pulled every song with no filter, so the picker exposed unverified
// songs to the public. The filter reuses bookshelf.visibleSongs (single source of truth) inside
// the pickerOptions computed, so it re-filters on login/logout without reloading the list.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

// select/list calls resolve empty — this suite seeds songList directly so the picker gate is
// tested in isolation from the network.
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
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { session, legacy } from '../store.js'

// two verified + one unverified — the picker must hide the unverified one from anon only.
const SONGS = [
  { id: 's1', number: 1, title_th: 'เพลงตรวจแล้วหนึ่ง', title_en: '', verified: true },
  { id: 's2', number: 2, title_th: 'เพลงยังไม่ตรวจ', title_en: '', verified: false },
  { id: 's3', number: 3, title_th: 'เพลงตรวจแล้วสอง', title_en: '', verified: true },
]

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = null
  legacy.value = false
})

// mount + let onMounted's async loadSongList settle (mock → []) BEFORE we seed songList, so
// the seed isn't clobbered by the initial empty load resolving late.
const mountEd = async (tier) => {
  const w = mount(EditorMode, {
    props: { song: null, tier, active: true },
    global: { stubs: { Icon: true, 'router-link': true, ComboSelect: true } },
  })
  await flushPromises()
  w.vm.songList = SONGS
  await nextTick()
  return w
}

// picker labels minus the leading "— เพลงใหม่ —" sentinel
const songLabels = (w) => w.vm.pickerOptions.slice(1).map((o) => o.label)

describe('EditorMode — "เปิดเพลงที่มีอยู่" picker visibility gate', () => {
  it('anon sees only verified songs in the picker', async () => {
    const w = await mountEd('anon')
    const labels = songLabels(w)
    expect(labels).toEqual(['1. เพลงตรวจแล้วหนึ่ง', '3. เพลงตรวจแล้วสอง'])
    expect(labels.some((l) => l.includes('ยังไม่ตรวจ'))).toBe(false)
  })

  it('a logged-in editor sees every song (verified + unverified) to review/fix', async () => {
    const w = await mountEd('editor')
    const labels = songLabels(w)
    expect(labels).toHaveLength(3)
    expect(labels).toContain('2. เพลงยังไม่ตรวจ')
  })

  it('re-filters on login/logout without reloading the list', async () => {
    const w = await mountEd('anon')
    expect(songLabels(w)).toHaveLength(2) // anon → verified only

    await w.setProps({ tier: 'editor' }) // logs in — no reload
    expect(songLabels(w)).toHaveLength(3) // team → all appear

    await w.setProps({ tier: 'anon' }) // logs out
    expect(songLabels(w)).toHaveLength(2) // unverified hidden again
  })

  it('search options carry the same gate (anon has no unverified haystack)', async () => {
    const w = await mountEd('anon')
    const haystacks = w.vm.pickerOptions.slice(1).map((o) => o.search).join(' ')
    expect(haystacks).not.toContain('ยังไม่ตรวจ')
  })
})
