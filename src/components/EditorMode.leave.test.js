// B100 — "unsaved changes" leave warning. The route guard + beforeunload both key off a
// single `isDirty` flag: the document differs from the last CLEAN checkpoint (song load /
// form reset / successful save). These assert that flag so the warning fires exactly when
// there is work to lose and stays silent otherwise. (The window/route wiring itself is thin
// glue over isDirty and is exercised by hand in the browser — see the B100 report.)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    // a full row (not a bare id): loadSong() feeds this straight into applyRow(), and the
    // 2026-07-27 picker-guard tests below drive that path. Saves only read `.id`.
    q.single = () =>
      Promise.resolve({
        data: {
          id: 'song-new-1',
          number: 2,
          title_th: 'เพลงปลายทาง',
          title_en: '',
          content: {
            version: 2,
            key: 'F',
            timeSignature: '4/4',
            stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'F', note: '5' }]] }],
            arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['ไป'] }],
          },
        },
        error: null,
      })
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

const SONG = {
  id: 'song-1',
  number: 1,
  title_th: 'เพลงเดิม',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['มา'] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'editor-1', email: 'e@x.com' } }
  legacy.value = false
})

const mountEditor = (tier = 'editor') =>
  mount(EditorMode, { props: { song: SONG, tier, active: true }, global: { stubs: { Icon: true } } })

// wait past the immediate props.song watcher + its nextTick(resetHistory) so the clean
// checkpoint reflects the loaded song
const settle = async () => {
  await nextTick()
  await nextTick()
}

describe('EditorMode — leave warning dirty state (B100)', () => {
  it('a freshly loaded song is NOT dirty (no false warning)', async () => {
    const w = mountEditor()
    await settle()
    expect(w.vm.isDirty).toBe(false)
  })

  it('editing a field marks the editor dirty', async () => {
    const w = mountEditor()
    await settle()
    w.vm.meta.title_th = 'แก้ชื่อใหม่'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)
  })

  it('editing the melody marks the editor dirty', async () => {
    const w = mountEditor()
    await settle()
    w.vm.opts.key = 'G'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)
  })

  it('saving a draft clears dirty (saved work no longer warns)', async () => {
    const w = mountEditor()
    await settle()
    w.vm.meta.title_th = 'แก้ชื่อใหม่'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)

    await w.vm.saveDraft('draft')
    await nextTick()
    expect(w.vm.isDirty).toBe(false)
  })

  it('publishing (approver) clears dirty', async () => {
    const w = mountEditor('approver')
    await settle()
    w.vm.meta.title_th = 'แก้แล้วเผยแพร่'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)

    await w.vm.saveDirect()
    await nextTick()
    expect(w.vm.isDirty).toBe(false)
  })
})

// 2026-07-27 — leaving the PAGE was guarded, but everything that replaces the document
// IN PLACE was not: switching songs from the picker, opening a draft, rolling back to an old
// version, importing a JSON. Unsaved work disappeared with no question asked. These pin the
// gate, including the classic watch+confirm trap: cancelling must put the picker back on the
// song still in the editor, not leave it naming a song it isn't showing.
describe('EditorMode — unsaved work is not replaced in place without asking', () => {
  let confirmSpy
  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm')
  })
  afterEach(() => confirmSpy.mockRestore())

  // dirty the editor, then let the pickerId watcher fire
  const dirtyEditor = async () => {
    const w = mountEditor()
    await settle()
    w.vm.meta.title_th = 'งานที่ยังไม่บันทึก'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)
    return w
  }

  it('switching songs with unsaved work ASKS first', async () => {
    const w = await dirtyEditor()
    confirmSpy.mockReturnValue(false)
    w.vm.pickerId = 'song-2'
    await nextTick()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(confirmSpy.mock.calls[0][0]).toMatch(/ยังไม่บันทึก/)
  })

  it('OK → the new song is loaded', async () => {
    const w = await dirtyEditor()
    confirmSpy.mockReturnValue(true)
    w.vm.pickerId = 'song-2'
    await nextTick()
    await flushPromises()
    expect(w.vm.meta.title_th).toBe('เพลงปลายทาง')
    expect(w.vm.pickerId).toBe('song-2')
  })

  it('ยกเลิก → the edit survives AND the picker bounces back (no asking twice)', async () => {
    const w = await dirtyEditor()
    confirmSpy.mockReturnValue(false)
    w.vm.pickerId = 'song-2'
    await nextTick()
    await flushPromises()
    await nextTick()
    expect(w.vm.meta.title_th).toBe('งานที่ยังไม่บันทึก') // every character still there
    expect(w.vm.isDirty).toBe(true)
    expect(w.vm.pickerId).toBe('') // the picker names the song actually on screen
    expect(confirmSpy).toHaveBeenCalledTimes(1) // the bounce must not re-ask
  })

  it('with NOTHING unsaved, switching songs does not nag', async () => {
    const w = mountEditor()
    await settle()
    expect(w.vm.isDirty).toBe(false)
    confirmSpy.mockReturnValue(true)
    w.vm.pickerId = 'song-2'
    await nextTick()
    await flushPromises()
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(w.vm.meta.title_th).toBe('เพลงปลายทาง')
  })

  const DRAFT = {
    id: 'draft-9',
    song_id: 'song-9',
    number: 9,
    title_th: 'ร่างอื่น',
    title_en: '',
    status: 'draft',
    content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] },
  }

  it('opening a draft with unsaved work asks — ยกเลิก keeps the work', async () => {
    const w = await dirtyEditor()
    confirmSpy.mockReturnValue(false)
    await w.vm.loadDraft(DRAFT)
    await nextTick()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(w.vm.meta.title_th).toBe('งานที่ยังไม่บันทึก')
    expect(w.vm.currentDraftId).not.toBe('draft-9')
  })

  it('opening a draft with nothing unsaved does not ask', async () => {
    const w = mountEditor()
    await settle()
    confirmSpy.mockReturnValue(true)
    await w.vm.loadDraft(DRAFT)
    await nextTick()
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(w.vm.currentDraftId).toBe('draft-9')
  })

  const REV = { after: { number: 1, title_th: 'เวอร์ชันเก่า', title_en: '', content: SONG.content } }

  it('rolling back a version says what will be lost when there is unsaved work', async () => {
    const w = await dirtyEditor()
    confirmSpy.mockReturnValue(false)
    await w.vm.restore(REV)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(confirmSpy.mock.calls[0][0]).toMatch(/ยังไม่บันทึก/)
    expect(w.vm.meta.title_th).toBe('งานที่ยังไม่บันทึก')
  })

  // G-verify 2026-07-27: "สร้างเพลงใหม่" wiped the document synchronously, so the work was
  // already gone before the picker watcher could ask. And the picker move that a delete /
  // a fresh start makes must not produce a SECOND question about work that is already handled.
  it('สร้างเพลงใหม่ with unsaved work asks — ยกเลิก keeps the work', async () => {
    const w = await dirtyEditor()
    confirmSpy.mockReturnValue(false)
    w.vm.fileNew()
    await nextTick()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(w.vm.meta.title_th).toBe('งานที่ยังไม่บันทึก')
  })

  it('สร้างเพลงใหม่ + ตกลง clears the form and asks exactly once', async () => {
    const w = await dirtyEditor()
    w.vm.pickerId = 'song-2' // land on a real song first (answer OK)
    confirmSpy.mockReturnValue(true)
    await nextTick()
    await flushPromises()
    confirmSpy.mockClear()
    w.vm.meta.title_th = 'แก้ต่ออีกรอบ'
    await nextTick()
    w.vm.fileNew()
    await nextTick()
    await flushPromises()
    expect(confirmSpy).toHaveBeenCalledTimes(1) // not twice — the picker move is pre-approved
    expect(w.vm.meta.title_th).toBe('')
    expect(w.vm.pickerId).toBe('')
  })

  it('rolling back with nothing unsaved keeps the plain question (one dialog, not two)', async () => {
    const w = mountEditor()
    await settle()
    confirmSpy.mockReturnValue(false)
    await w.vm.restore(REV)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(confirmSpy.mock.calls[0][0]).not.toMatch(/ยังไม่บันทึก/)
  })
})
