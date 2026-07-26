// 717 multi-lyric on /v2 — the viewer switches WORD SETS under one shared melody, and (the
// important half) leaves every EXISTING song untouched. Back-compat is asserted with a song
// fixture that declares NO lyricSets: no tabs, identical words, untouched print heading.
// Also covers the tab filter (set N shows only its rows) and the SHARED entry (no `set`)
// appearing in every set.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../lib/midi.js', () => ({
  playSong: vi.fn(() => new Promise(() => {})),
  playEnsemble: vi.fn(() => new Promise(() => {})),
  stopPlayback: () => {},
  setTranspose: vi.fn(),
  keyTranspose: () => 0,
  songToNotes: () => [],
  buildPlayNotes: () => [],
  effectiveOrder: () => undefined,
  TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
}))
window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'

const Harness = {
  components: { SongViewer },
  props: { song: { type: Object, required: true } },
  template: `<div><SongViewer :song="song" tier="guest" /></div>`,
}
const mountSong = (song) => mount(Harness, { props: { song } })

// an ORDINARY song (v2 shape, NO lyricSets) — the 100+ existing library
const plainSong = {
  number: 1,
  title_th: 'เพลงปกติ',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['กา', 'ขา'] }],
  },
}
// a 717 song: one melody (A) + a shared refrain (B), two word sets, and B shared across both
const twoSetSong = {
  number: 717,
  title_th: '717',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    lyricSets: [{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }],
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] },
      { id: 'B', lines: [[{ type: 'segment', note: '3', chord: 'G' }]] },
    ],
    arrangement: [
      { stanza: 'A', set: 0, syllables: ['เนื้อหนึ่งเอ', 'เนื้อหนึ่งบี'] },
      { stanza: 'A', set: 1, syllables: ['เนื้อสองเอ', 'เนื้อสองบี'] },
      { stanza: 'B', syllables: ['รับรวม'] }, // no `set` → shared in every set
    ],
  },
}

describe('SongViewer /v2 — 717 lyric sets + back-compat', () => {
  it('back-compat: a song with NO lyricSets shows no tabs and renders its words', () => {
    const w = mountSong(plainSong)
    expect(w.find('.lyric-set-tabs').exists()).toBe(false)
    expect(w.text()).toContain('กา')
    expect(w.text()).toContain('ขา')
  })

  it('a song declaring 1 set (edge) still shows no tabs', () => {
    const one = { ...twoSetSong, content: { ...twoSetSong.content, lyricSets: [{ label: 'ทำนอง ๑' }] } }
    expect(mountSong(one).find('.lyric-set-tabs').exists()).toBe(false)
  })

  it('a 717 song (>1 set) shows one tab per set, first active', () => {
    const w = mountSong(twoSetSong)
    const tabs = w.findAll('.lset-tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].text()).toBe('เนื้อร้องที่ 1')
    expect(tabs[0].classes()).toContain('active')
  })

  it('THE BUG: /v2 no longer stacks the other set’s words on as a further ข้อ', async () => {
    const w = mountSong(twoSetSong)
    expect(w.text()).toContain('เนื้อหนึ่งเอ')
    expect(w.text()).not.toContain('เนื้อสองเอ')
    // this song has 3 arrangement entries; each SET shows 2 of them (its verse + the shared
    // refrain), so the auto numbering stops at ข้อ 2. Stacking both sets — the /v2 bug — put
    // the other set's words on the same sheet as a third ข้อ.
    expect(w.text()).toContain('ข้อ 2')
    expect(w.text()).not.toContain('ข้อ 3')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.text()).not.toContain('ข้อ 3')
  })

  it('the active set filters words; the shared (no-set) entry shows in BOTH sets', async () => {
    const w = mountSong(twoSetSong)
    expect(w.text()).toContain('รับรวม')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.text()).toContain('เนื้อสองเอ')
    expect(w.text()).toContain('รับรวม') // shared refrain still there
    expect(w.text()).not.toContain('เนื้อหนึ่งเอ')
  })
})

// ---- set CAPTIONS are SEQUENTIAL (พี่เปา via P'Aim, 26 ก.ค.) -----------------------------
// "ในส่วนของชื่อ ให้เขียนว่า เนื้อร้องที่ 1 เนื้อร้องที่ 2 ... ไม่ต้องใส่ชื่อ". A set's stored name is
// its own first line, so the tabs were two long Thai phrases to read before choosing. The tab
// now reads its POSITION, whatever the row happens to store.
const SET1 = 'เนื้อร้องชุดที่หนึ่งของเพลงนี้'
const SET2 = 'เนื้อร้องชุดที่สองของเพลงนี้'
const withSets = (lyricSets) => ({
  ...twoSetSong,
  content: { ...twoSetSong.content, lyricSets },
})

describe('SongViewer /v2 — lyric-set captions are sequential, never the stored name', () => {
  it('a stored `name`+`label` is NOT displayed — the tab reads its position', () => {
    // the merge SQL writes name AND label with the same value (live song 717's shape)
    const w = mountSong(withSets([{ name: SET1, label: SET1 }, { name: SET2, label: SET2 }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2'])
    // and the name appears NOWHERE in the switcher, not even in a title/aria attribute
    expect(w.find('.lyric-set-wrap').html()).not.toContain(SET1)
    expect(w.find('.lyric-set-wrap').html()).not.toContain(SET2)
  })

  it('a legacy caption stored in `label` is not displayed either (no "ทำนอง" survives)', () => {
    const w = mountSong(withSets([{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2'])
    expect(w.find('.lyric-set-wrap').text()).not.toContain('ทำนอง')
  })

  it('a set carrying nothing at all reads the same — the caption is derived, not stored', () => {
    const w = mountSong(withSets([{}, {}]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2'])
  })

  it('counts on past 2 in order (a 3-set song reads 1·2·3)', () => {
    const w = mountSong(withSets([{ name: SET1 }, {}, { label: 'ทำนอง ๓' }]))
    expect(w.findAll('.lset-tab').map((t) => t.text()))
      .toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2', 'เนื้อร้องที่ 3'])
  })

  it('no Thai numeral reaches the tabs — the app numbers everything else in arabic', () => {
    const w = mountSong(withSets([{}, {}, {}]))
    expect(w.find('.lyric-set-wrap').text()).not.toMatch(/[๐-๙]/)
  })

  it('tabs are a proper ARIA tablist: selected state, roving tabindex, panel link', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    await w.find('.lset-summary').trigger('click') // tab semantics only exist while the tabs do
    const tabs = w.findAll('.lset-tab')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
    expect(tabs[0].attributes('tabindex')).toBe('0')
    expect(tabs[1].attributes('tabindex')).toBe('-1') // roving: only the active tab is tabbable
    const panel = w.find('#lset-panel')
    expect(panel.attributes('role')).toBe('tabpanel')
    expect(tabs[0].attributes('aria-controls')).toBe('lset-panel')
    expect(panel.attributes('aria-labelledby')).toBe(tabs[0].attributes('id'))
    expect(w.find('.lyric-set-tabs').attributes('aria-label')).toBe('เลือกเนื้อร้อง')
  })

  it('a live region announces which set is showing', async () => {
    const w = mountSong(withSets([{}, {}]))
    const live = w.find('[aria-live="polite"]')
    expect(live.text()).toContain('เนื้อร้องที่ 1')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.find('[aria-live="polite"]').text()).toContain('เนื้อร้องที่ 2')
  })

  it('← → Home End move between tabs (keyboard, no pointer)', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const list = w.find('.lyric-set-tabs')
    await list.trigger('keydown', { key: 'ArrowRight' })
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true')
    await list.trigger('keydown', { key: 'ArrowRight' }) // wraps back to the first
    expect(w.findAll('.lset-tab')[0].attributes('aria-selected')).toBe('true')
    await list.trigger('keydown', { key: 'End' })
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true')
    await list.trigger('keydown', { key: 'Home' })
    expect(w.findAll('.lset-tab')[0].attributes('aria-selected')).toBe('true')
  })

  it('the print heading carries the set being printed (print = the selected set only)', async () => {
    // two printouts of the same song number carry DIFFERENT words, so the paper has to say which
    // — now by number, matching what the singer read on screen when they pressed print
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const viewer = w.findComponent(SongViewer)
    expect(viewer.vm.printTitle).toBe('717. 717 — เนื้อร้องที่ 1')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(viewer.vm.printTitle).toBe('717. 717 — เนื้อร้องที่ 2')
    expect(viewer.vm.printTitle).not.toContain(SET2)
  })

  // ---- hostile state (adversarial review, 26 ก.ค.) ----
  it('a set disappearing without the song id changing does not leave a dangling tab', async () => {
    // the id watcher can't see this: the same song object comes back with one set deleted.
    const three = withSets([{ name: 'ก' }, { name: 'ข' }, { name: 'ค' }])
    const w = mountSong(three)
    await w.find('.lset-summary').trigger('click')
    await w.findAll('.lset-tab')[2].trigger('click')
    await nextTick()
    await w.find('.lset-summary').trigger('click') // picking folds it — reopen to inspect the tabs
    expect(w.findAll('.lset-tab')[2].attributes('aria-selected')).toBe('true')
    // now the third set is gone, same id
    await w.setProps({ song: { ...three, content: { ...three.content, lyricSets: [{ name: 'ก' }, { name: 'ข' }] } } })
    await nextTick()
    const tabs = w.findAll('.lset-tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].attributes('aria-selected')).toBe('true') // clamped back, not "nothing selected"
    // …and the panel names a tab that actually exists
    expect(w.find('#lset-panel').attributes('aria-labelledby')).toBe(tabs[0].attributes('id'))
  })

  it('the play-order breadcrumb numbers ท่อน by position on THIS sheet, not by raw index', () => {
    // set 1's only verse is arrangement[1]; it is ท่อน 1 of that set, not ท่อน 2.
    const jumpy = {
      number: 717, title_th: '717',
      content: {
        version: 2, key: 'C', timeSignature: '4/4',
        lyricSets: [{ name: SET1 }, { name: SET2 }],
        stanzas: [{ id: 'A', lines: [[
          { type: 'segment', note: '1 2', chord: 'C' },
          { type: 'jump', kind: 'segno' }, { type: 'jump', kind: 'dc' },
        ]] }],
        arrangement: [
          { stanza: 'A', set: 0, syllables: ['ก1', 'ก2'] },
          { stanza: 'A', set: 1, syllables: ['ข1', 'ข2'] },
        ],
      },
    }
    const w = mountSong(jumpy)
    const vm = w.findComponent(SongViewer).vm
    expect(vm.playOrderCrumbs.every((c) => c === 'ท่อน 1')).toBe(true)
  })

  it('the tabpanel is reachable by keyboard when it holds no focusable content (WAI-ARIA APG)', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    await w.find('.lset-summary').trigger('click')
    expect(w.find('#lset-panel').attributes('tabindex')).toBe('0')
    // an ordinary song is not a tabpanel at all, so it gains no tab stop
    expect(mountSong(plainSong).find('.sheet-scale').attributes('tabindex')).toBeUndefined()
  })

  // G-verify (26 ก.ค.) — the one finding that survived source-checking. A role="tabpanel" whose
  // tablist is nowhere on the page is a broken widget: the sheet was naming itself after a tab
  // no screen-reader user could reach. Folded, the sheet is just the sheet.
  it('the sheet is only a tabpanel while the tabs are actually there', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const folded = w.find('.sheet-scale')
    expect(folded.attributes('role')).toBeUndefined()
    expect(folded.attributes('aria-labelledby')).toBeUndefined()
    expect(folded.attributes('tabindex')).toBeUndefined()
    await w.find('.lset-summary').trigger('click')
    const open = w.find('.sheet-scale')
    expect(open.attributes('role')).toBe('tabpanel')
    expect(open.attributes('aria-labelledby')).toBe('lset-tab-0')
    // the id stays put throughout, so the tabs' aria-controls always resolves
    expect(w.find('#lset-panel').exists()).toBe(true)
  })

  it('back-compat: an ordinary song’s print heading is untouched (no set suffix, no tabpanel)', () => {
    const w = mountSong(plainSong)
    expect(w.findComponent(SongViewer).vm.printTitle).toBe('1. เพลงปกติ')
    expect(w.find('#lset-panel').exists()).toBe(false)
  })
})

// ---- the switcher folds away (P'Aim, 26 ก.ค. — "accordion, ยุบได้ เพราะไม่ได้ใช้บ่อย") ----
// Collapsed by default, but the summary must still SAY which words are on the sheet: folding
// the tabs away must not fold away the answer to "what am I singing?".
describe('SongViewer /v2 — the lyric-set switcher is a collapsed disclosure', () => {
  it('starts collapsed, and the summary still says which set is on the sheet', () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const sum = w.find('.lset-summary')
    expect(sum.exists()).toBe(true)
    expect(sum.attributes('aria-expanded')).toBe('false')
    expect(sum.text()).toContain('เนื้อร้องที่ 1') // the singer still knows WHICH words these are
    expect(sum.text()).not.toContain(SET1) // …by number, not by the stored first line
    expect(w.find('.lyric-set-tabs').attributes('style')).toContain('display: none')
  })

  it('the summary opens and closes the tabs, and says so to a screen reader', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const sum = w.find('.lset-summary')
    expect(sum.attributes('aria-controls')).toBe('lset-tabs')
    expect(w.find('#lset-tabs').exists()).toBe(true)
    await sum.trigger('click')
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('true')
    expect(w.find('.lyric-set-tabs').attributes('style') || '').not.toContain('display: none')
    await w.find('.lset-summary').trigger('click')
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('false')
  })

  it('picking a set applies it, folds the panel back and re-labels the summary', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    await w.find('.lset-summary').trigger('click')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    const sum = w.find('.lset-summary')
    expect(sum.attributes('aria-expanded')).toBe('false') // a choice closes the chooser
    expect(sum.text()).toContain('เนื้อร้องที่ 2')
    expect(w.text()).toContain('เนื้อสองเอ') // and the WORDS actually changed
    expect(w.text()).not.toContain('เนื้อหนึ่งเอ')
  })

  it('arrow keys browse without the panel shutting; Esc closes without changing the set', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    await w.find('.lset-summary').trigger('click')
    const list = w.find('.lyric-set-tabs')
    await list.trigger('keydown', { key: 'ArrowRight' })
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('true') // still browsable
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true')
    await list.trigger('keydown', { key: 'Escape' })
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('false')
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true') // Esc ≠ undo
  })

  it('the collapsed summary always carries the COUNT (P’Aim, 26 ก.ค.)', () => {
    // progressive disclosure: you must be able to learn this song has other words WITHOUT
    // opening anything — a switcher that folds away silently would hide the whole feature.
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    expect(w.find('.lset-count').text()).toBe('2 ชุด')
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('false')
    const three = mountSong(withSets([{ name: SET1 }, { name: SET2 }, { name: 'ค' }]))
    expect(three.find('.lset-count').text()).toBe('3 ชุด')
  })

  it('back-compat: an ordinary song gets no summary at all', () => {
    expect(mountSong(plainSong).find('.lset-summary').exists()).toBe(false)
  })
})

// ---- EDITING never folds the switcher (P'Aim, 26 ก.ค.) -----------------------------------
// /v2 has no separate editor — the inline ✏️ one is it — so the folded switcher IS the control
// the person editing needs. Reading folds; editing must not, or "which words am I typing into?"
// is a click away at all times. And since this is the only editor, a NEW set of words has to be
// makeable from here too.
describe('SongViewer /v2 — the switcher in the inline editor', () => {
  const enterEdit = async (w) => {
    w.findComponent(SongViewer).vm.toggleEdit()
    await nextTick(); await nextTick()
    return w
  }

  it('entering edit mode opens the tabs and drops the fold control', async () => {
    const w = await enterEdit(mountSong(withSets([{ name: SET1 }, { name: SET2 }])))
    expect(w.find('.lyric-set-tabs').attributes('style') || '').not.toContain('display: none')
    expect(w.find('.lset-summary').exists()).toBe(false) // nothing to collapse it with
    expect(w.findAll('.lset-tab')).toHaveLength(2)
  })

  it('picking a set while editing leaves the tabs open', async () => {
    const w = await enterEdit(mountSong(withSets([{ name: SET1 }, { name: SET2 }])))
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true')
    expect(w.find('.lyric-set-tabs').attributes('style') || '').not.toContain('display: none')
  })

  it('leaving edit mode folds it back, and the summary returns', async () => {
    const w = await enterEdit(mountSong(withSets([{ name: SET1 }, { name: SET2 }])))
    w.findComponent(SongViewer).vm.toggleEdit()
    await nextTick(); await nextTick()
    expect(w.find('.lset-summary').exists()).toBe(true)
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('false')
    expect(w.find('.lyric-set-tabs').attributes('style')).toContain('display: none')
  })

  it('a MULTI-set song gets ＋ เพิ่มชุด in the strip while editing, and never while reading', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    expect(w.find('.lset-add').exists()).toBe(false)
    await enterEdit(w)
    expect(w.find('.lset-add').exists()).toBe(true)
  })

  it('a ONE-set song gets only the light ＋ เพิ่มชุดเนื้อร้อง — and only while editing', async () => {
    const w = mountSong(plainSong)
    expect(w.find('.lset-add-lone').exists()).toBe(false) // reading an ordinary song: nothing
    expect(w.find('.lyric-set-wrap').exists()).toBe(false)
    await enterEdit(w)
    const add = w.find('.lset-add-lone')
    expect(add.exists()).toBe(true)
    expect(add.text()).toContain('เพิ่มชุดเนื้อร้อง')
    expect(w.find('.lyric-set-tabs').exists()).toBe(false) // still no tabs — there is one set
  })

  it('＋ on a one-set song proposes the two-set content up to the shell', async () => {
    const w = await enterEdit(mountSong(plainSong))
    await w.find('.lset-add-lone').trigger('click')
    await nextTick()
    const viewer = w.findComponent(SongViewer)
    const emitted = viewer.emitted('update-content')
    expect(emitted).toBeTruthy()
    const next = emitted[emitted.length - 1][0]
    expect(next.lyricSets).toHaveLength(2)
    // the song's existing words become set 0 — untagged they would show under the new set too
    expect(next.arrangement[0].set).toBe(0)
    expect(next.arrangement[0].syllables).toEqual(['กา', 'ขา'])
    expect(next.arrangement[1].set).toBe(1)
    expect(next.arrangement[1].syllables).toEqual([])
    // …and the viewer never mutated the song it was given
    expect('lyricSets' in plainSong.content).toBe(false)
  })
})
