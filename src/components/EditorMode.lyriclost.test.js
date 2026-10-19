// "การแก้ไขในเนื้อเพลงบางทีเนื้อหาย" (พี่เปา, 19 ต.ค. 2569)
//
// The 📝 แก้เนื้อแบบย่อหน้า box is the free-text view of ONE ข้อ. It used to read back only the
// words sitting on ATTACK slots, and write back only onto attack slots. A word on a held/rest
// box is ordinary data though — the per-note boxes offer one, the sheet prints it, and words
// arrive there by themselves:
//   · ◀▶ (pushSlot/pullSlot) ripple across EVERY slot, held ones included;
//   · a melody edit that turns an attack into a hold keeps the slot count the same, so
//     noteSlotEdit() moves nothing and the word stays where it is while its box becomes 'held'
//     — e.g. wrapping two same-pitch notes in a ( ) สเลอร์ for เอื้อน, or typing a tie.
// Those words vanished from the box (the "เนื้อหาย" on screen) and the next keystroke there
// rewrote the ข้อ from what the box showed, deleting them for good. ✂ แยกพยางค์อัตโนมัติ
// round-trips through the same pair, so one tap did it too.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

const mountEd = (song) =>
  mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: {
      stubs: { Icon: true, 'router-link': true, SongSheet: true, DockKey: true, ComboSelect: true },
    },
  })
const inner = (w) => w.vm.$.setupState

// melody "1 - 2 3" → slot kinds attack · HELD · attack · attack. The 2nd word sits on the hold.
const song = (notes, syllables) => ({
  id: 's1',
  number: 1,
  title_th: 'เพลงทดสอบ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [notes.map((n) => ({ type: 'segment', note: n }))] }],
    arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables }],
  },
})
const HELD_SONG = () => song(['1', '-', '2', '3'], ['พระ', 'เย', 'ซู', 'เจ้า'])

describe('แก้เนื้อแบบย่อหน้า — no word may disappear', () => {
  it('shows EVERY word of the ข้อ, including one on a held note', async () => {
    const w = mountEd(HELD_SONG())
    await nextTick()
    const s = inner(w)
    expect(s.stanzaKindList('A')).toEqual(['attack', 'held', 'attack', 'attack'])
    expect(s.rowLyricText(s.arrangement[0])).toBe('พระ เย ซู เจ้า')
    w.unmount()
  })

  it('writing the same text back changes nothing at all', async () => {
    const w = mountEd(HELD_SONG())
    await nextTick()
    const s = inner(w)
    const row = s.arrangement[0]
    s.setRowLyricText(row, s.rowLyricText(row))
    expect(row.syllables).toEqual(['พระ', 'เย', 'ซู', 'เจ้า'])
    w.unmount()
  })

  it('fixing one typo moves nothing else — every word keeps its own note', async () => {
    const w = mountEd(HELD_SONG())
    await nextTick()
    const s = inner(w)
    const row = s.arrangement[0]
    s.setRowLyricText(row, 'พระ เย ซู เอ๋ย')
    expect(row.syllables).toEqual(['พระ', 'เย', 'ซู', 'เอ๋ย'])
    w.unmount()
  })

  it('a word added at the end does not re-align the words before it', async () => {
    const w = mountEd(HELD_SONG())
    await nextTick()
    const s = inner(w)
    const row = s.arrangement[0]
    s.setRowLyricText(row, 'พระ เย ซู เจ้า ข้า')
    expect(row.syllables.slice(0, 4)).toEqual(['พระ', 'เย', 'ซู', 'เจ้า'])
    expect(row.syllables[4]).toBe('ข้า') // beyond the melody → a visible overflow slot
    w.unmount()
  })

  it('✂ แยกพยางค์อัตโนมัติ keeps the words it was given (it used to eat the held one)', async () => {
    const w = mountEd(HELD_SONG())
    await nextTick()
    const s = inner(w)
    s.lensChoice = 0
    await nextTick()
    s.autoSyllable()
    expect(s.arrangement[0].syllables.filter(Boolean)).toContain('เย')
    w.unmount()
  })

  it('a word pushed onto a hold by ◀▶ survives the next edit in the box', async () => {
    // all 4 words start on their own notes; ▶ opens a blank at slot 1 and ripples the rest
    const w = mountEd(song(['1', '-', '2', '3'], ['พระ', 'ซู', 'เจ้า']))
    await nextTick()
    const s = inner(w)
    s.lensChoice = 0
    await nextTick()
    s.pushSlot(1) // → ['พระ', '', 'ซู', 'เจ้า'] … then the author types a word into the hold
    s.setSyl(s.arrangement[0], 1, 'เย')
    expect(s.rowLyricText(s.arrangement[0])).toBe('พระ เย ซู เจ้า')
    s.setRowLyricText(s.arrangement[0], 'พระ เย ซู เจ้า')
    expect(s.arrangement[0].syllables).toEqual(['พระ', 'เย', 'ซู', 'เจ้า'])
    w.unmount()
  })

  it('a สเลอร์ (เอื้อน) added to the melody does not swallow the word under it', async () => {
    // "( 5 5 )" = two same-pitch notes under a slur → attack + HELD, same slot count as "5 5",
    // so the words stay put and the second one lands on a held box.
    const w = mountEd(song(['( 5 5 )', '3'], ['ขอ', 'บ', 'คุณ']))
    await nextTick()
    const s = inner(w)
    expect(s.stanzaKindList('A')).toEqual(['attack', 'held', 'attack'])
    expect(s.rowLyricText(s.arrangement[0])).toBe('ขอ บ คุณ')
    s.setRowLyricText(s.arrangement[0], 'ขอ บ คุณ')
    expect(s.arrangement[0].syllables).toEqual(['ขอ', 'บ', 'คุณ'])
    w.unmount()
  })

  it('pasting a fresh verse still lands one word per attack note (held boxes stay blank)', async () => {
    const w = mountEd(song(['1', '-', '2', '3'], []))
    await nextTick()
    const s = inner(w)
    s.setRowLyricText(s.arrangement[0], 'พระ เย ซู')
    expect(s.arrangement[0].syllables).toEqual(['พระ', '', 'เย', 'ซู'])
    w.unmount()
  })

  it('clearing the box clears the ข้อ', async () => {
    const w = mountEd(HELD_SONG())
    await nextTick()
    const s = inner(w)
    s.setRowLyricText(s.arrangement[0], '')
    expect(s.arrangement[0].syllables).toEqual([])
    w.unmount()
  })
})
