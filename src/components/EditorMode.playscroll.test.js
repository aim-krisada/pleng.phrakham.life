// แก้ไข playback must NOT move the page (พี่เปา, 2026-07-27). While a ท่อน plays back in the
// editor, only the bar HIGHLIGHT advances — the person editing keeps full control of the
// scroll position. (Karaoke follow-scroll lives in ฝึกร้อง / SongViewer, not here.) This is the
// regression guard for the fix that dropped followBar's scrollIntoView.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, playEnsembleSpy } = vi.hoisted(() => ({
  playSongSpy: vi.fn(() => new Promise(() => {})), // never resolves → stays "playing"
  playEnsembleSpy: vi.fn(() => new Promise(() => {})),
}))
vi.mock('../lib/midi.js', () => ({
  playSong: playSongSpy,
  playEnsemble: playEnsembleSpy,
  stopPlayback: () => {},
}))
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

// one stanza with TWO lines so [data-bar="0-0"] and [data-bar="1-0"] both render — enough to
// prove the follow callback moves the highlight to a later bar without scrolling the page.
const SONG = {
  id: 's1',
  number: 5,
  title_th: 'เพลงทดสอบเลื่อน',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [
      [{ type: 'segment', chord: 'C', note: '1 2 3 4' }],
      [{ type: 'segment', chord: 'G', note: '5 6 5 3' }],
    ] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
  playSongSpy.mockClear()
  playEnsembleSpy.mockClear()
})
afterEach(() => { vi.restoreAllMocks() })

function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, ExportTool: true, DockKey: true, ComboSelect: true } },
  })
}

// grab the onNote the editor handed the (mocked) player when a ท่อน starts playing
function onNoteFromPlay() {
  const call = playSongSpy.mock.calls.at(-1) || playEnsembleSpy.mock.calls.at(-1)
  return call && call[1] && call[1].onNote
}

describe('EditorMode playback — no auto-scroll (พี่เปา 2026-07-27)', () => {
  it('ฟังท่อน advances the bar highlight but never scrolls the page', async () => {
    const w = mountEd()
    await nextTick()
    const playBtn = w.findAll('button').find((b) => /ฟังท่อน/.test(b.attributes('aria-label') || b.attributes('title') || b.text()))
    expect(playBtn, 'a "ฟังท่อน" play control renders').toBeTruthy()

    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    await playBtn.trigger('click')
    await nextTick()

    const onNote = onNoteFromPlay()
    expect(onNote, 'the editor passes an onNote follow callback').toBeTypeOf('function')

    // simulate the player reaching the SECOND line's bar (would have been scrolled to before the fix)
    onNote({ li: 1, bi: 0 })
    await nextTick()

    // highlight moved to that bar…
    expect(w.find('[data-bar="1-0"]').classes()).toContain('bar-playing')
    // …but the page was never scrolled — the editor leaves scroll to the user
    expect(scrollSpy).not.toHaveBeenCalled()
  })
})
