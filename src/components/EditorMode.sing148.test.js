// ใบ v3/pleng#148 (พี่เปา 4 พ.ย. 2569) — "กดเล่น แล้ว karaoke วิ่งในแผ่นเพลงตรงนั้นเลย เหมือนหน้าฝึกร้อง".
// ฟังทั้งเพลง tells the sheet windows which word it is singing; ฟังท่อน/บรรทัด (one melody) do not.
// With the sheet beside the editor, it plays the lyric set that sheet shows (playContent).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, playEnsembleSpy, ctl } = vi.hoisted(() => ({
  playSongSpy: vi.fn(),
  playEnsembleSpy: vi.fn(),
  ctl: { done: null },
}))
vi.mock('../lib/midi.js', () => ({ playSong: playSongSpy, playEnsemble: playEnsembleSpy, stopPlayback: () => {} }))
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
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

const SONG = {
  id: 's-148', number: 9, title_th: 'ร้องตาม', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['ก', 'ข', 'ค', 'ง'] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  // a play that keeps going until the test ends it
  const hold = () => new Promise((r) => { ctl.done = () => r(true) })
  playSongSpy.mockReset().mockImplementation(hold)
  playEnsembleSpy.mockReset().mockImplementation(hold)
})

async function mountEd(props = {}) {
  const w = mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true, ...props },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, ExportTool: true, DockKey: true, ComboSelect: true, SongSheet: true, StudioDock: true } },
  })
  await nextTick()
  await nextTick()
  return w
}
const run = (w, re) => w.vm.editItems.find((it) => re.test(it.name || it.label || '')).run()
const lastCall = () => (playSongSpy.mock.calls.at(-1) || playEnsembleSpy.mock.calls.at(-1))
const flush = async () => { await Promise.resolve(); await nextTick(); await nextTick() }

describe('ใบ#148 — karaoke ในแผ่นเพลงของหน้าแก้ไข', () => {
  it('ฟังทั้งเพลง lights the word being sung, and clears it when the song ends', async () => {
    const w = await mountEd()
    run(w, /^ฟังทั้งเพลง$/)
    await nextTick()
    const onNote = lastCall()[1].onNote
    expect(typeof onNote).toBe('function')
    onNote({ li: 0, si: 0, syk: 2 }, 2)
    expect(w.vm.sungSeg).toEqual({ li: 0, si: 0 })
    expect(w.vm.sungSyl).toEqual({ li: 0, si: 0, syk: 2 })
    ctl.done()
    await flush()
    expect(w.vm.sungSyl).toBe(null)
    expect(w.vm.sungSeg).toBe(null)
  })

  it('stopping the song clears the lit word too', async () => {
    const w = await mountEd()
    run(w, /^ฟังทั้งเพลง$/)
    await nextTick()
    lastCall()[1].onNote({ li: 0, si: 0, syk: 1 }, 1)
    run(w, /^ฟังทั้งเพลง$/) // the same button again = stop
    await nextTick()
    expect(w.vm.sungSyl).toBe(null)
  })

  it('ฟังท่อน plays one melody — the sheet is not lit by it', async () => {
    const w = await mountEd()
    await w.findAll('button[aria-label="ฟังท่อนนี้"]')[0].trigger('click')
    await nextTick()
    lastCall()[1].onNote?.({ li: 0, si: 0, bi: 0, syk: 0 }, 0)
    expect(w.vm.sungSyl).toBe(null)
  })

  it('with the sheet beside the editor, ฟังทั้งเพลง plays what that sheet shows', async () => {
    const shown = { key: 'C', timeSignature: '4/4', lines: [{ marker: 'set-2' }] }
    const w = await mountEd({ sidePaper: true, playContent: shown })
    run(w, /^ฟังทั้งเพลง$/)
    await nextTick()
    expect(lastCall()[0]).toStrictEqual(shown) // (a props proxy of it, not the same object)
  })

  it('the floating ดูผลทั้งเพลง window draws the lit word', async () => {
    const w = await mountEd()
    await w.find('button[aria-pressed][title^="ดูผลทั้งเพลง"]').trigger('click')
    run(w, /^ฟังทั้งเพลง$/)
    await nextTick()
    lastCall()[1].onNote({ li: 0, si: 0, syk: 3 }, 3)
    await nextTick()
    const sheet = w.find('.ed-float-body').findComponent({ name: 'SongSheet' })
    expect(sheet.props('playingSyl')).toEqual({ li: 0, si: 0, syk: 3 })
    expect(sheet.props('playingSeg')).toEqual({ li: 0, si: 0 })
  })

  it('the window has its own play/stop (on a phone it covers the whole screen, ฟังทั้งเพลง included)', async () => {
    const w = await mountEd()
    await w.find('button[aria-pressed][title^="ดูผลทั้งเพลง"]').trigger('click')
    const btn = () => w.find('.ed-float-play')
    expect(btn().attributes('aria-label')).toBe('ฟังทั้งเพลง')
    await btn().trigger('click')
    expect(playSongSpy.mock.calls.length + playEnsembleSpy.mock.calls.length).toBe(1)
    expect(btn().attributes('aria-label')).toBe('หยุด')
    lastCall()[1].onNote({ li: 0, si: 0, syk: 0 }, 0)
    await btn().trigger('click')
    expect(btn().attributes('aria-label')).toBe('ฟังทั้งเพลง')
    expect(w.vm.sungSyl).toBe(null)
  })
})
