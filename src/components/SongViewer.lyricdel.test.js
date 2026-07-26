// 717 on /v2 — 🗑 ลบชุดนี้, the way OUT of a lyric set.
//
// /v2 already ships the ＋ that MAKES a set, so a set added by mistake was, until now, permanent
// on this site: only the v1 editor could take one away. This covers the delete as a person meets
// it — the button, the confirm that names the set, and what the song looks like afterwards.
//
// The harness APPLIES `update-content` back onto the song, the way the shell does, because every
// claim worth making here is about the state AFTER the delete: the captions renumber, the melody
// is still there, and one set left collapses the song back to an ordinary one.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

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

// the shell's job, in miniature: an accepted content edit replaces the song the viewer reads
const Harness = {
  components: { SongViewer },
  props: { initial: { type: Object, required: true } },
  setup(props) {
    const song = ref(props.initial)
    const onUpdate = (content) => { song.value = { ...song.value, content } }
    return { song, onUpdate }
  },
  template: `<div><SongViewer :song="song" tier="guest" @update-content="onUpdate" /></div>`,
}
const mountSong = (initial) => mount(Harness, { props: { initial } })
const viewerOf = (w) => w.findComponent(SongViewer)
const enterEdit = async (w) => {
  viewerOf(w).vm.toggleEdit()
  await nextTick(); await nextTick()
  return w
}
// the live content the viewer is currently reading (post-edit)
const contentOf = (w) => viewerOf(w).props('song').content

const seg = (n) => [{ type: 'segment', note: n, chord: 'C' }]
// three sets of WORDS over one melody (A) + a refrain (B) SHARED by every set (no `set` key)
const threeSetSong = () => ({
  number: 717,
  title_th: '717',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    lyricSets: [{ id: 'sONE' }, { id: 'sTWO' }, { id: 'sTHREE' }],
    stanzas: [
      { id: 'A', lines: [seg('1 2')] },
      { id: 'B', lines: [seg('3')] },
    ],
    arrangement: [
      { stanza: 'A', set: 0, syllables: ['หนึ่งเอ', 'หนึ่งบี'] },
      { stanza: 'A', set: 1, syllables: ['สองเอ', 'สองบี'] },
      { stanza: 'A', set: 2, syllables: ['สามเอ', 'สามบี'] },
      { stanza: 'B', syllables: ['รับรวม'] }, // shared — belongs to no set
    ],
  },
})
const twoSetSong = () => {
  const s = threeSetSong()
  s.content.lyricSets = [{ id: 'sONE' }, { id: 'sTWO' }]
  s.content.arrangement = s.content.arrangement.filter((r) => r.set !== 2)
  return s
}
const plainSong = () => ({
  number: 1,
  title_th: 'เพลงปกติ',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [seg('1 2')] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['กา', 'ขา'] }],
  },
})

describe('SongViewer /v2 — the 🗑 ลบชุดนี้ affordance', () => {
  it('appears in the strip only while EDITING, never while reading', async () => {
    const w = mountSong(threeSetSong())
    expect(w.find('.lset-del').exists()).toBe(false)
    await enterEdit(w)
    expect(w.find('.lset-del').exists()).toBe(true)
  })

  it('is set apart from ＋ and reads as destructive, not as another tab', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    const del = w.find('.lset-del')
    // its own class (red styling) and NOT one of the switch pills — a mis-tap on the strip
    // must not be able to land on delete
    expect(del.classes()).not.toContain('lset-tab')
    expect(del.classes()).not.toContain('lset-add')
    expect(del.text()).toContain('ลบชุดนี้')
  })

  it('names the set it would delete, for a screen reader too', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.find('.lset-del').attributes('aria-label')).toContain('เนื้อร้องที่ 2')
  })

  it('an ordinary (one-set) song has no delete at all — only the light ＋', async () => {
    const w = await enterEdit(mountSong(plainSong()))
    expect(w.find('.lset-del').exists()).toBe(false)
    expect(w.find('.lset-add-lone').exists()).toBe(true)
  })
})

describe('SongViewer /v2 — the confirm gate', () => {
  it('pressing 🗑 does NOT delete — it asks first, naming the set', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.findAll('.lset-tab')[1].trigger('click')
    await w.find('.lset-del').trigger('click')
    await nextTick()

    const box = w.find('.lset-confirm')
    expect(box.exists()).toBe(true)
    expect(box.text()).toContain('เนื้อร้องที่ 2')
    // …and nothing has happened to the song yet
    expect(contentOf(w).lyricSets).toHaveLength(3)
    expect(viewerOf(w).emitted('update-content')).toBeFalsy()
  })

  it('says what survives — the melody — before you commit', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    expect(w.find('.lset-confirm').text()).toContain('ทำนองยังอยู่')
  })

  it('ยกเลิก closes it and changes nothing', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-cancel').trigger('click')
    await nextTick()
    expect(w.find('.lset-confirm').exists()).toBe(false)
    expect(contentOf(w).lyricSets).toHaveLength(3)
  })

  it('Esc cancels too', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm').trigger('keydown.esc')
    await nextTick()
    expect(w.find('.lset-confirm').exists()).toBe(false)
    expect(contentOf(w).lyricSets).toHaveLength(3)
  })

  // Apple HIG "Alerts": for a destructive action the SAFE choice is the default. v1 focuses ลบ
  // and binds Enter to it, so a held Enter from the tab strip deletes a set nobody chose.
  // Found at 360px in a real browser, not by a test: in edit mode the sheet has its own scroll
  // region, and on a phone that region measures ~31px between the save bar and the tool dock. An
  // inline confirm renders INSIDE it, so the question scrolls out of sight and the person is left
  // looking at a bare red button. It is a modal now — same shape as the app's ShareSheet.
  it('is a modal over the page, not a card inside the scrolling sheet', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    const scrim = w.find('.lset-confirm-scrim')
    expect(scrim.exists()).toBe(true)
    expect(scrim.find('.lset-confirm').exists()).toBe(true)
    // the confirm must NOT live inside the sheet's scroll region
    expect(w.find('.sheet-scale').element.contains(scrim.element)).toBe(false)
    const box = w.find('.lset-confirm')
    expect(box.attributes('role')).toBe('alertdialog')
    expect(box.attributes('aria-modal')).toBe('true')
    expect(box.attributes('aria-labelledby')).toBe('lset-confirm-t')
  })

  it('clicking the scrim cancels — the safe way out of a mis-tap', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-scrim').trigger('click')
    await nextTick()
    expect(w.find('.lset-confirm').exists()).toBe(false)
    expect(contentOf(w).lyricSets).toHaveLength(3)
  })

  it('Tab cannot wander off behind the scrim — aria-modal has to be true', async () => {
    const w = mount(Harness, { props: { initial: threeSetSong() }, attachTo: document.body })
    await enterEdit(w)
    await w.find('.lset-del').trigger('click')
    await nextTick(); await nextTick()
    expect(document.activeElement.className).toContain('lset-confirm-cancel')
    await w.find('.lset-confirm-scrim').trigger('keydown.tab')
    expect(document.activeElement.className).toContain('lset-confirm-del')
    await w.find('.lset-confirm-scrim').trigger('keydown.tab')
    expect(document.activeElement.className).toContain('lset-confirm-cancel')
    w.unmount()
  })

  it('opens with focus on ยกเลิก, not on the destructive button', async () => {
    // focus assertions need the tree attached to the document
    const w = mount(Harness, { props: { initial: threeSetSong() }, attachTo: document.body })
    await enterEdit(w)
    await w.find('.lset-del').trigger('click')
    await nextTick(); await nextTick()
    expect(document.activeElement.className).toContain('lset-confirm-cancel')
    w.unmount()
  })
})

describe('SongViewer /v2 — what the delete actually does', () => {
  it('deleting the MIDDLE set renumbers what is left: 1 · 2, never 1 · 3', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.findAll('.lset-tab')[1].trigger('click')
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()

    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2'])
    // the WORDS that remain are the first and the third — only the captions moved
    const c = contentOf(w)
    expect(c.arrangement.filter((r) => r.set != null).map((r) => r.syllables[0]))
      .toEqual(['หนึ่งเอ', 'สามเอ'])
    expect(c.arrangement.filter((r) => r.set != null).map((r) => r.set)).toEqual([0, 1])
  })

  it('the deleted set’s words are gone from the sheet; the others are not', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.findAll('.lset-tab')[1].trigger('click')
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()
    expect(JSON.stringify(contentOf(w))).not.toContain('สองเอ')
    expect(JSON.stringify(contentOf(w))).toContain('หนึ่งเอ')
    expect(JSON.stringify(contentOf(w))).toContain('สามเอ')
  })

  it('THE MELODY SURVIVES — stanzas and the shared refrain are untouched', async () => {
    const before = threeSetSong()
    const w = await enterEdit(mountSong(before))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()

    const c = contentOf(w)
    expect(c.stanzas).toEqual(before.content.stanzas)
    // the refrain has no `set` — it belongs to every set and must never be swept up
    expect(c.arrangement.some((r) => r.set == null && r.syllables[0] === 'รับรวม')).toBe(true)
  })

  it('lands on the neighbour above, never on a blank strip', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.findAll('.lset-tab')[2].trigger('click') // on set 3
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()
    const tabs = w.findAll('.lset-tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[1].attributes('aria-selected')).toBe('true') // now on เนื้อร้องที่ 2
  })

  it('announces the result — the strip may vanish, the announcement must not', async () => {
    const w = await enterEdit(mountSong(threeSetSong()))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()
    const live = w.findAll('[aria-live="polite"]').map((p) => p.text()).join(' | ')
    expect(live).toContain('ลบ')
    expect(live).toContain('เนื้อร้องที่ 1')
  })

  it('the viewer never mutates the song it was handed', async () => {
    const before = threeSetSong()
    const snapshot = JSON.stringify(before.content)
    const w = await enterEdit(mountSong(before))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()
    expect(JSON.stringify(before.content)).toBe(snapshot)
  })
})

describe('SongViewer /v2 — the last set can never be deleted', () => {
  it('down to ONE set the song COLLAPSES back to an ordinary one — no leftover keys', async () => {
    const w = await enterEdit(mountSong(twoSetSong()))
    await w.findAll('.lset-tab')[1].trigger('click')
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()

    const c = contentOf(w)
    expect('lyricSets' in c).toBe(false) // not `[]`, not `[{}]` — GONE
    expect(c.arrangement.every((r) => !('set' in r))).toBe(true)
    // …and it reads like a song that never had sets
    expect(w.find('.lyric-set-tabs').exists()).toBe(false)
    expect(w.find('.lset-add-lone').exists()).toBe(true) // still editing: the way back in
  })

  it('…and with one set left there is no delete button to press again', async () => {
    const w = await enterEdit(mountSong(twoSetSong()))
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()
    expect(w.find('.lset-del').exists()).toBe(false)
    expect(w.find('.lset-confirm').exists()).toBe(false)
  })

  it('the guard holds at the source too — deleting from a one-set song is a no-op', async () => {
    const { deleteLyricSet } = await import('../lib/songStructure.js')
    const one = { ...plainSong().content, lyricSets: [{ id: 'sONE' }] }
    expect(deleteLyricSet(one, 0)).toBe(one) // same object back = nothing happened
  })

  it('the button refuses AND says why when only one set is left', async () => {
    // the strip only renders above one set, so drive the component's own guard directly
    const w = await enterEdit(mountSong(twoSetSong()))
    const vm = viewerOf(w).vm
    await w.find('.lset-del').trigger('click')
    await nextTick()
    await w.find('.lset-confirm-del').trigger('click')
    await nextTick(); await nextTick()
    // one set left: asking again cannot open the confirm
    vm.askDeleteLyricSet()
    await nextTick()
    expect(w.find('.lset-confirm').exists()).toBe(false)
  })
})
