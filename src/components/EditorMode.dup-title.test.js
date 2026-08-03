// B-DUP — the duplicate-title guard where it matters: the editor's WRITE PATHS. The comparison
// core has its own tests (lib/songTitleKey.test.js); these mount the real editor and assert on
// what reaches Supabase, because "we warned the user" is worthless if the row still went in.
//
// P'Aim's three rules (27 ก.ค.): same name + same เล่ม = refused (approver may force past with
// an explicit confirm) · similar name = warn, passes · same name in another เล่ม = passes quietly.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const calls = vi.hoisted(() => [])
// the library the editor compares against — the real เด็กเล็ก/อนุชน shape, served through the
// same select the component makes on mount
const LIBRARY = vi.hoisted(() => [
  { id: 'song-1', number: 91, title_th: 'เรามาประชุมพร้อมหน้า', category: 'anuchon', verified: true },
  { id: 'song-2', number: null, title_th: 'พระเยซูทรงรักเด็กๆ', category: 'dek-lek', verified: true },
])

vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) {
      q[m] = (...args) => {
        calls.push({ table, verb: m, args })
        return q
      }
    }
    q.single = () => Promise.resolve({ data: { id: 'new-1' }, error: null })
    q.then = (res) => Promise.resolve({ data: table === 'songs' ? LIBRARY : [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (table) => makeQuery(table),
      rpc: (name, args) => {
        calls.push({ table: 'rpc:' + name, verb: 'rpc', args: [args] })
        return Promise.resolve({ data: 'song-42', error: null })
      },
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { session, legacy } from '../store.js'

const CONTENT = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
  arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'user-1', email: 'e@x.com' } }
  legacy.value = false
  calls.length = 0
  localStorage.clear()
  vi.restoreAllMocks()
})

const mountEditor = (props = {}) =>
  mount(EditorMode, {
    props: { song: null, tier: 'approver', active: true, ...props },
    global: { stubs: { Icon: true, SongSheet: true, 'router-link': true } },
  })

// a fresh editor holding a brand-new song called `title` filed under `category`
async function newSongNamed(title, category = 'anuchon', props = {}) {
  const w = mountEditor(props)
  await flush()
  w.vm.meta.title_th = title
  w.vm.pickCategory(category) // a human pick → genuine, so the เล่ม is certain
  await nextTick()
  return w
}

// let the on-mount loads (song list, drafts) settle before touching the editor
const flush = async () => { await nextTick(); await Promise.resolve(); await nextTick() }

const wroteToSongs = () => calls.filter((c) => c.table === 'songs' && (c.verb === 'insert' || c.verb === 'update'))

describe('rule 1 — same name, same เล่ม: the save is refused', () => {
  it('does not write to songs, and says which song it clashed with', async () => {
    const w = await newSongNamed(' 91.  เรามา ประชุมพร้อมหน้า ', 'anuchon') // spacing + pasted number
    vi.spyOn(window, 'confirm').mockReturnValue(false) // approver declines the override
    expect(await w.vm.saveDirect()).toBe(false)
    expect(wroteToSongs()).toEqual([])
    expect(w.vm.saveMsg).toContain('91. เรามาประชุมพร้อมหน้า')
  })

  it('a non-approver gets no way past it at all (no confirm is even offered)', async () => {
    const w = await newSongNamed('เรามาประชุมพร้อมหน้า', 'anuchon', { tier: 'member' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    expect(await w.vm.saveDirect()).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(wroteToSongs()).toEqual([])
    expect(w.vm.saveMsg).toContain('⛔')
  })

  it('an approver CAN force past it, but only through an explicit confirm', async () => {
    const w = await newSongNamed('เรามาประชุมพร้อมหน้า', 'anuchon')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    expect(await w.vm.saveDirect()).toBe(true)
    expect(confirm).toHaveBeenCalled()
    expect(confirm.mock.calls[0][0]).toContain('เรามาประชุมพร้อมหน้า') // it names what is being duplicated
    expect(wroteToSongs()).toHaveLength(1)
  })

  it('"ส่งตรวจ" is gated the same way — a known duplicate never reaches the approver', async () => {
    const w = await newSongNamed('เรามาประชุมพร้อมหน้า', 'anuchon', { tier: 'member' })
    await w.vm.saveDraft('pending')
    expect(calls.filter((c) => c.table === 'song_drafts' && c.verb === 'insert')).toEqual([])
  })

  it('a plain private ร่าง is NOT blocked (it is not the library) — the banner is the warning', async () => {
    const w = await newSongNamed('เรามาประชุมพร้อมหน้า', 'anuchon', { tier: 'member' })
    await w.vm.saveDraft('draft')
    expect(w.vm.titleConflicts.level).toBe('block')
    expect(w.vm.saveMsg).not.toContain('⛔')
  })
})

describe('rule 2 — similar name, same เล่ม: warn, but it saves', () => {
  it('saves without any confirm, and the banner says what it resembles', async () => {
    const w = await newSongNamed('เรามาประชุมพร้อมหนา', 'anuchon') // one vowel short
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    expect(w.vm.titleConflicts.level).toBe('warn')
    expect(w.vm.titleConflictMsg).toContain('คล้าย')
    expect(await w.vm.saveDirect()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    expect(wroteToSongs()).toHaveLength(1)
  })
})

describe('rule 3 — same name, another เล่ม: passes, and just says so', () => {
  it('saves silently and tells the user where else that name lives', async () => {
    const w = await newSongNamed('เรามาประชุมพร้อมหน้า', 'dek-lek')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    expect(w.vm.titleConflicts.level).toBe('info')
    expect(w.vm.titleConflictMsg).toContain('เล่มอื่น')
    expect(await w.vm.saveDirect()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    expect(wroteToSongs()).toHaveLength(1)
  })
})

describe('the banner (live, while typing)', () => {
  it('appears as soon as the name clashes — no save needed — and links to the song', async () => {
    const w = await newSongNamed('เรามาประชุมพร้อมหน้า', 'anuchon')
    const alert = w.find('.dup-alert')
    expect(alert.exists()).toBe(true)
    expect(alert.classes()).toContain('dup-block')
    expect(alert.text()).toContain('เรามาประชุมพร้อมหน้า')
    expect(alert.find('a').attributes('href')).toBe('#/song/song-1')
  })

  it('is silent for a genuinely new name', async () => {
    const w = await newSongNamed('เพลงที่ไม่เคยมีใครใส่', 'anuchon')
    expect(w.vm.titleConflicts.level).toBe('ok')
    expect(w.find('.dup-alert').exists()).toBe(false)
  })

  it('never fires on the song being edited itself', async () => {
    const w = mountEditor()
    await flush()
    w.vm.applyRow({ id: 'song-1', number: 91, title_th: 'เรามาประชุมพร้อมหน้า', content: CONTENT, category: 'anuchon' })
    w.vm.editingId = 'song-1'
    await nextTick()
    expect(w.vm.titleConflicts.level).toBe('ok')
  })
})

// NEGATIVE CONTROL — take the guard out (make the library look empty to the comparison) and
// the very save rule 1 refused goes straight through. If this passes while the tests above
// also pass, the gate is doing the blocking, not something incidental.
describe('negative control', () => {
  it('with nothing to compare against, the same save writes to songs', async () => {
    const w = await newSongNamed('เรามาประชุมพร้อมหน้า', 'anuchon')
    w.vm.songList = [] // ← the guard has nothing to see
    await nextTick()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    expect(await w.vm.saveDirect()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    expect(wroteToSongs()).toHaveLength(1)
  })
})
