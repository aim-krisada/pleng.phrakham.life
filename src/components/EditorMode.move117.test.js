// ใบ v3/pleng#117 — "ย้ายห้องด้วย ← → แล้วโน้ตไป แต่เนื้ออยู่ที่เดิม". Words are a flat list per
// ท่อน (arrangement row), one entry per note slot of its melody, so a ห้อง that swaps with its
// neighbour must take its slice of words along — in EVERY row on that melody (all linked ท่อน,
// every lyric set, shown or hidden), the way ▲▼ on a บรรทัด already does. These tests fail on the
// old code (words stayed put → they ended up under the other ห้อง's notes):
//  1. → / ← inside a line: the ห้อง's words go with it; other ห้อง keep theirs; held / tie /
//     เอื้อน slots (empty words) stay lined up
//  2. a shared melody: every linked ท่อน and every lyric set moves its own words, nothing mixes
//  3. hop across lines (last ห้อง →, first ห้อง ←): every word still sits under its note — the
//     hop needs no word shuffle (those two ห้อง are already neighbours in the word order), so
//     these two tests also pass on the old code; they guard that the fix does not break it
//  4. one Ctrl+Z brings back notes AND words
//  5. a move on melody B leaves the words of melody A alone
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { noteBoxKinds } from '../lib/notation.js'

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

// Melody A: two lines, ห้อง of DIFFERENT lengths with held / tie / เอื้อน slots, so a wrong
// slice shows up at once. Slots per ห้อง: 3 · 2 · 1 | 2 · 3
//   '1 - 2'      attack, held('-'), attack
//   '3 4'        attack, attack
//   '5'          attack
//   '6 0'        attack, rest (held box, no word)
//   '( 2 2 ) 7'  slur bracket, attack, เอื้อน (same pitch under the slur), bracket, attack
const A_LINES = [['1 - 2', '3 4', '5'], ['6 0', '( 2 2 ) 7']]
const B_LINES = [['1 2', '3']]
const v2Line = (bars) => bars.flatMap((note, k) => [...(k ? [{ type: 'bar' }] : []), { type: 'segment', note }])
// words for one ท่อน: "<tag><line><bar>-<n>" on attack slots, '' on held slots
function wordsFor(tag, lines) {
  const out = []
  lines.forEach((bars, li) =>
    bars.forEach((note, bi) => {
      let n = 0
      for (const k of noteBoxKinds(note)) {
        if (k === 'struct') continue
        out.push(k === 'held' ? '' : `${tag}${li}${bi}-${n++}`)
      }
    }),
  )
  return out
}

function makeSong() {
  return {
    id: 's-117',
    number: 627,
    title_th: 'ทดสอบย้ายห้อง',
    title_en: '',
    content: {
      version: 2,
      key: 'C',
      timeSignature: '4/4',
      lyricSets: [{ label: 'ชุด ๑' }, { label: 'ชุด ๒' }],
      stanzas: [
        { id: 'A', lines: A_LINES.map(v2Line) },
        { id: 'B', lines: B_LINES.map(v2Line) },
      ],
      arrangement: [
        { stanza: 'A', label: 'ข้อ1', set: 0, syllables: wordsFor('ก', A_LINES) },
        { stanza: 'A', label: 'ข้อ2', set: 0, syllables: wordsFor('ข', A_LINES) },
        { stanza: 'B', label: 'รับ', set: 0, syllables: wordsFor('ร', B_LINES) },
        // the other lyric set — hidden while set 0 is shown, same melody A
        { stanza: 'A', label: 'ข้อ1', set: 1, syllables: wordsFor('E', A_LINES) },
        // a ท่อน whose words stop early (only the first ห้อง typed) + one stray word past the end
        { stanza: 'A', label: 'ข้อ2', set: 1, syllables: [...wordsFor('F', [['1 - 2']]), '', '', '', '', '', '', '', '', 'เกิน'] },
      ],
    },
  }
}

let w
beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  w?.unmount()
  w = null
  vi.useRealTimers()
})

async function mountEd(song = makeSong()) {
  w = mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, ComboSelect: true } },
  })
  await flush()
  return w
}
const flush = async () => { await nextTick(); await nextTick() }
async function press(el) {
  expect(el, 'button exists').toBeTruthy()
  expect(el.disabled).toBe(false)
  el.focus()
  el.click()
  await flush()
  return document.activeElement
}
const mv = (li, bi, dir) =>
  document.querySelector(`.ed-bar-mv[data-mvbar="${li}-${bi}"][aria-label^="${dir > 0 ? 'ย้ายห้องไปทางขวา' : 'ย้ายห้องไปทางซ้าย'}"]`)
function ctrlZ() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
}

// What the singer sees: for one ท่อน, each ห้อง as "notes = words under them", line by line.
// Walks the melody exactly like the editor (one slot per non-bracket box, in order).
function bound(rowIdx) {
  const row = w.vm.arrangement[rowIdx]
  const s = w.vm.stanzas.find((x) => x.id === row.stanza)
  let slot = 0
  return s.lines.map((line) =>
    line.bars.map((bar) => {
      const notes = bar.segments.map((g) => g.note).join(' ')
      const words = []
      for (const g of bar.segments)
        for (const k of noteBoxKinds(g.note)) if (k !== 'struct') words.push(row.syllables[slot++] || '')
      return `${notes} = ${words.join(',')}`
    }),
  )
}
const snapshotAll = () => w.vm.arrangement.map((_, i) => bound(i))
// the same pairs, ignoring which line/position a ห้อง sits in (a move only reorders ห้อง)
const pairSet = (b) => b.flat().filter((x) => !x.startsWith(' = ')).sort()

describe('ใบ #117 — ← → on a ห้อง carries its words', () => {
  it('→ inside a line: the ห้อง and its words go right together; held slots stay lined up; other ห้อง keep their words', async () => {
    await mountEd()
    expect(bound(0)[0]).toEqual(['1 - 2 = ก00-0,,ก00-1', '3 4 = ก01-0,ก01-1', '5 = ก02-0'])

    await press(mv(0, 1, 1))

    // notes moved…
    expect(w.vm.stanzas[0].lines[0].bars.map((b) => b.segments[0].note)).toEqual(['1 - 2', '5', '3 4'])
    // …and the words with them (old code: '5 = ก01-0' / '3 4 = ก01-1,ก02-0')
    expect(bound(0)[0]).toEqual(['1 - 2 = ก00-0,,ก00-1', '5 = ก02-0', '3 4 = ก01-0,ก01-1'])
    // the next line is untouched (held rest and เอื้อน slot still empty, words in place)
    expect(bound(0)[1]).toEqual(['6 0 = ก10-0,', '( 2 2 ) 7 = ก11-0,,ก11-1'])
    // the lyric box under the moved ห้อง's first note shows its own word
    const boxes = [...document.querySelectorAll('[data-bar="0-2"] .syl-box')].map((i) => i.value)
    expect(boxes).toEqual(['ก01-0', 'ก01-1'])
  })

  it('← inside a line, with held slots on both sides (ห้อง of 2 and 3 slots trade places)', async () => {
    await mountEd()
    await press(mv(1, 1, -1))
    expect(bound(0)[1]).toEqual(['( 2 2 ) 7 = ก11-0,,ก11-1', '6 0 = ก10-0,'])
    expect(bound(0)[0]).toEqual(['1 - 2 = ก00-0,,ก00-1', '3 4 = ก01-0,ก01-1', '5 = ก02-0'])
  })

  it('shared melody + lyric sets: every ท่อน on the melody (shown and hidden sets) moves its own words; nothing mixes', async () => {
    await mountEd()
    const before = snapshotAll()
    await press(mv(0, 0, 1))
    const after = snapshotAll()
    for (const i of [0, 1, 3]) {
      const t = ['ก', 'ข', '', 'E'][i]
      expect(after[i][0]).toEqual([`3 4 = ${t}01-0,${t}01-1`, `1 - 2 = ${t}00-0,,${t}00-1`, `5 = ${t}02-0`])
      expect(pairSet(after[i])).toEqual(pairSet(before[i])) // same note↔word pairs, only reordered
    }
    // the short ท่อน (words for the first ห้อง only): its words follow that ห้อง, the stray word
    // past the end of the melody stays where it was
    expect(after[4][0]).toEqual(['3 4 = ,', '1 - 2 = F00-0,,F00-1', '5 = '])
    expect(w.vm.arrangement[4].syllables.at(-1)).toBe('เกิน')
    expect(w.vm.arrangement[4].syllables.length).toBe(12)
    // melody B (another stanza) is not touched
    expect(w.vm.arrangement[2].syllables).toEqual(wordsFor('ร', B_LINES))
    // and the saved song carries the moved words
    const saved = w.emitted('change').at(-1)[0].content.arrangement
    expect(saved[3].syllables.slice(0, 6)).toEqual(['E01-0', 'E01-1', 'E00-0', '', 'E00-1', 'E02-0'])
  })

  it('hop across lines: last ห้อง → goes to the next line, first ห้อง ← back — every word stays under its note', async () => {
    await mountEd()
    const before = snapshotAll()
    const after1 = await press(mv(0, 2, 1))
    expect(w.vm.stanzas[0].lines.map((l) => l.bars.map((b) => b.segments[0].note))).toEqual([['1 - 2', '3 4'], ['5', '6 0', '( 2 2 ) 7']])
    expect(bound(0)).toEqual([
      ['1 - 2 = ก00-0,,ก00-1', '3 4 = ก01-0,ก01-1'],
      ['5 = ก02-0', '6 0 = ก10-0,', '( 2 2 ) 7 = ก11-0,,ก11-1'],
    ])
    for (const i of [0, 1, 3, 4]) expect(pairSet(snapshotAll()[i])).toEqual(pairSet(before[i]))
    // ← on that ห้อง (now first of line 2) sends it back to the end of line 1
    expect(after1.getAttribute('data-mvbar')).toBe('1-0')
    await press(mv(1, 0, -1))
    expect(snapshotAll()).toEqual(before)
  })

  it('hop that empties a line: the left-behind empty ห้อง takes no words', async () => {
    const song = makeSong()
    // line 2 is a single ห้อง → moving it ← leaves an empty ห้อง behind
    song.content.stanzas[0].lines = [v2Line(['1 - 2', '3 4']), v2Line(['5']), v2Line(['6 0'])]
    const L = [['1 - 2', '3 4'], ['5'], ['6 0']]
    song.content.arrangement = [{ stanza: 'A', label: '', syllables: wordsFor('ก', L) }]
    delete song.content.lyricSets
    await mountEd(song)
    await press(mv(1, 0, -1))
    expect(bound(0)).toEqual([['1 - 2 = ก00-0,,ก00-1', '3 4 = ก01-0,ก01-1', '5 = ก10-0'], [' = '], ['6 0 = ก20-0,']])
  })

  it('one Ctrl+Z brings back the notes AND the words', async () => {
    vi.useFakeTimers()
    await mountEd()
    const before = snapshotAll()
    await press(mv(0, 1, 1))
    vi.advanceTimersByTime(500)
    await flush()
    expect(bound(0)[0]).toEqual(['1 - 2 = ก00-0,,ก00-1', '5 = ก02-0', '3 4 = ก01-0,ก01-1']) // moved together

    ctrlZ()
    await flush()
    expect(w.vm.stanzas[0].lines[0].bars.map((b) => b.segments[0].note)).toEqual(['1 - 2', '3 4', '5'])
    expect(snapshotAll()).toEqual(before)
    expect(w.vm.arrangement.map((r) => r.syllables)).toEqual(makeSong().content.arrangement.map((r) => r.syllables))
  })

  it('a move on melody B moves only melody B’s words', async () => {
    await mountEd()
    w.vm.focusRow(2) // ท่อน "รับ" → melody B becomes the one being edited
    await flush()
    expect(w.vm.activeStanzaId).toBe('B')
    await press(mv(0, 0, 1))
    expect(bound(2)).toEqual([['3 = ร01-0', '1 2 = ร00-0,ร00-1']])
    for (const i of [0, 1, 3, 4]) expect(w.vm.arrangement[i].syllables).toEqual(makeSong().content.arrangement[i].syllables)
  })
})
