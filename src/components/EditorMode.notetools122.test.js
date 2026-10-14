// ใบ v3/pleng#122 — the NOTE tools moved the notes but left the words where they were, so every
// later word slid onto the wrong note. Words are a flat list per ท่อน (arrangement row), one entry
// per note slot of its melody, so a note that goes away / is added must take its word slot with
// it — in EVERY row on that melody (all linked ท่อน, every lyric set, shown or hidden), the way the
// ห้อง and บรรทัด tools already do (#121 · B088). These tests fail on the old code:
//  1. ลบโน้ต → its words go; every other note keeps its words
//  2. ทำซ้ำโน้ต → the copy gets the same words (MuseScore "repeat selection" = copy + paste right
//     after, lyrics included); later notes do not shift
//  3. typing in a note cell that adds / removes notes → added notes get empty word slots, removed
//     notes take their words, the rest stay; clearing a note and typing a new one keeps its word
//  4. วางบรรทัด, same melody → each row gets the words it had under the copied บรรทัด
//     (another melody / another song → empty slots)
//  5. one Ctrl+Z brings back notes AND words
//  6. a tool used on melody B leaves the words of melody A alone
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

// Melody A: lines → ห้อง → note cells (segments). ห้อง 0-1 has TWO cells (chord change mid-ห้อง),
// with held / tie / เอื้อน / rest slots and a repeated note, so a wrong slice shows up at once.
const A_LINES = [
  [['1 - 2'], ['3 4', '5']],
  [['6 0'], ['( 2 2 ) 7'], ['5 5 5']],
]
const B_LINES = [[['1 2']], [['3']]]
const v2Line = (bars) =>
  bars.flatMap((cells, k) => [
    ...(k ? [{ type: 'bar' }] : []),
    ...cells.map((note, si) => ({ type: 'segment', note, chord: si ? 'G' : '' })),
  ])
// words for one ท่อน: "<tag><line><bar><cell>-<n>" on attack slots, '' on held slots
function wordsFor(tag, lines) {
  const out = []
  lines.forEach((bars, li) =>
    bars.forEach((cells, bi) =>
      cells.forEach((note, si) => {
        let n = 0
        for (const k of noteBoxKinds(note)) {
          if (k === 'struct') continue
          out.push(k === 'held' ? '' : `${tag}${li}${bi}${si}-${n++}`)
        }
      }),
    ),
  )
  return out
}

function makeSong(id = 's-122') {
  return {
    id,
    number: 628,
    title_th: 'ทดสอบเครื่องมือโน้ต',
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
      ],
    },
  }
}
const A_ROWS = [0, 1, 3]
const TAG = { 0: 'ก', 1: 'ข', 3: 'E' }

let w
beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  window.confirm = () => true
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
  el.focus()
  el.click()
  await flush()
}
const cellEl = (li, bi, si) => document.querySelectorAll(`.ed-bar[data-bar="${li}-${bi}"] .seg-col`)[si]
const boxes = (li, bi, si) => [...cellEl(li, bi, si).querySelectorAll('input.note-box')]
const delNote = (li, bi, si) => press(cellEl(li, bi, si).querySelector('button[aria-label="ลบโน้ตนี้"]'))
const dupNote = (li, bi, si) => press(cellEl(li, bi, si).querySelector('button[aria-label="คัดลอกโน้ตนี้"]'))
// type into note box k of a cell the way the browser does: the box's value changes, then `input`
async function typeBox(li, bi, si, k, value) {
  const el = boxes(li, bi, si)[k]
  expect(el, 'note box exists').toBeTruthy()
  el.focus()
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await flush()
}
async function keyBox(li, bi, si, k, key, caret) {
  const el = boxes(li, bi, si)[k]
  el.focus()
  el.setSelectionRange(caret, caret)
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  await flush()
}
async function copyLine(li) {
  // the line's ⋯ menu acts on the line being edited → touch a note of line li first
  boxes(li, 0, 0)[0].dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  await flush()
  await press(document.querySelector('button[aria-label="เพิ่มเติม"]'))
  await press(document.querySelector('button[aria-label="คัดลอกบรรทัดนี้ไปวางที่ท่อนอื่น"]'))
}
const pasteLine = () => press(document.querySelector('button[aria-label="วางบรรทัดที่นี่"]'))
function ctrlZ() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
}

// What the singer sees: for one ท่อน, each note cell as "notes = words under them", line by line.
function bound(rowIdx) {
  const row = w.vm.arrangement[rowIdx]
  const s = w.vm.stanzas.find((x) => x.id === row.stanza)
  let slot = 0
  return s.lines.map((line) =>
    line.bars.flatMap((bar) =>
      bar.segments.map((g) => {
        const words = []
        for (const k of noteBoxKinds(g.note)) if (k !== 'struct') words.push(row.syllables[slot++] || '')
        return `${g.note} = ${words.join(',')}`
      }),
    ),
  )
}
// the cells of melody A as they start, with row tag t
const startA = (t) => [
  [`1 - 2 = ${t}000-0,,${t}000-1`, `3 4 = ${t}010-0,${t}010-1`, `5 = ${t}011-0`],
  [`6 0 = ${t}100-0,`, `( 2 2 ) 7 = ${t}110-0,,${t}110-1`, `5 5 5 = ${t}120-0,${t}120-1,${t}120-2`],
]
const snapshotAll = () => w.vm.arrangement.map((_, i) => bound(i))
const sylsOf = (song) => song.content.arrangement.map((r) => r.syllables)
const untouched = (rows) => {
  for (const i of rows) expect(w.vm.arrangement[i].syllables).toEqual(sylsOf(makeSong())[i])
}

describe('ใบ #122 — ลบโน้ต: the note’s words go with it', () => {
  it('every row on the melody (both lyric sets) loses only that cell’s words; the rest stay under their notes', async () => {
    await mountEd()
    await delNote(0, 1, 0) // '3 4' — the first cell of a two-cell ห้อง
    for (const i of A_ROWS) {
      const t = TAG[i]
      const want = startA(t)
      want[0].splice(1, 1)
      // old code: '5 = <t>010-0' and every later word two notes too early
      expect(bound(i)).toEqual(want)
    }
    untouched([2])
    const saved = w.emitted('change').at(-1)[0].content.arrangement
    expect(saved[0].syllables.slice(0, 4)).toEqual(['ก000-0', '', 'ก000-1', 'ก011-0'])
  })

  it('a cell with held slots (rest) goes cleanly; the next cells keep their words', async () => {
    await mountEd()
    await delNote(1, 0, 0) // '6 0' — the only cell of its ห้อง → an empty cell stays
    const want = startA('ก')
    want[1][0] = ' = '
    expect(bound(0)).toEqual(want)
  })

  it('on melody B: only melody B’s words go', async () => {
    await mountEd()
    w.vm.focusRow(2)
    await flush()
    await delNote(0, 0, 0)
    expect(bound(2)).toEqual([[' = '], ['3 = ร100-0']])
    untouched([0, 1, 3])
  })
})

describe('ใบ #122 — ทำซ้ำโน้ต: the copy gets the same words', () => {
  it('every row on the melody copies its own words; later notes do not shift', async () => {
    await mountEd()
    await dupNote(0, 0, 0) // '1 - 2'
    for (const i of A_ROWS) {
      const t = TAG[i]
      const want = startA(t)
      want[0].splice(1, 0, `1 - 2 = ${t}000-0,,${t}000-1`)
      // old code: the copy took '<t>010-0,<t>010-1,' and every later word slid 3 notes
      expect(bound(i)).toEqual(want)
    }
    untouched([2])
  })

  it('a slur (เอื้อน) cell on the next line: copy is lined up too', async () => {
    await mountEd()
    await dupNote(1, 1, 0) // '( 2 2 ) 7'
    const want = startA('E')
    want[1].splice(2, 0, '( 2 2 ) 7 = E110-0,,E110-1')
    expect(bound(3)).toEqual(want)
  })
})

describe('ใบ #122 — typing in a note cell that adds or removes notes', () => {
  it('a note added (two notes typed in one box) → an empty word slot for it; the rest stay', async () => {
    await mountEd()
    await typeBox(0, 1, 0, 0, '3 6') // '3 4' → '3 6 4'
    for (const i of A_ROWS) {
      const t = TAG[i]
      const want = startA(t)
      want[0][1] = `3 6 4 = ${t}010-0,,${t}010-1`
      // old code: '3 6 4 = <t>010-0,<t>010-1,<t>011-0' — every later word one note early
      expect(bound(i)).toEqual(want)
    }
    untouched([2])
  })

  it('Space splits a box → the new note gets an empty word slot', async () => {
    await mountEd()
    await typeBox(0, 1, 0, 1, '46') // '3 4' → '3 46' (still two notes: no change)
    await keyBox(0, 1, 0, 1, ' ', 1) // '46' → '4' | '6'
    const want = startA('ข')
    want[0][1] = '3 4 6 = ข010-0,ข010-1,'
    expect(bound(1)).toEqual(want)
  })

  it('a note added in a new box (Space at the end, then type) → an empty word slot at its place', async () => {
    await mountEd()
    await keyBox(0, 1, 0, 0, ' ', 1) // a new empty box after '3' — no note yet, nothing moves
    expect(bound(0)).toEqual(startA('ก'))
    await typeBox(0, 1, 0, 1, '2') // '3 2 4'
    const want = startA('ก')
    want[0][1] = '3 2 4 = ก010-0,,ก010-1'
    expect(bound(0)).toEqual(want)
  })

  it('a note cleared → its word goes; the other notes keep theirs', async () => {
    await mountEd()
    await typeBox(0, 1, 0, 0, '') // '3 4' → '4'
    for (const i of A_ROWS) {
      const t = TAG[i]
      const want = startA(t)
      want[0][1] = `4 = ${t}010-1`
      // old code: '4 = <t>010-0' — the cleared note's word stayed and everything slid left
      expect(bound(i)).toEqual(want)
    }
  })

  it('a note cleared and a new one typed in its place → the word comes back (a pitch change)', async () => {
    await mountEd()
    await typeBox(0, 1, 0, 0, '') // clear '3'
    await typeBox(0, 1, 0, 0, '#') // not a note yet
    await typeBox(0, 1, 0, 0, '#4') // the new note
    const want = startA('ก')
    want[0][1] = '#4 4 = ก010-0,ก010-1'
    expect(bound(0)).toEqual(want)
  })

  it('the same note repeated: the one cleared is the one whose word goes', async () => {
    await mountEd()
    await typeBox(1, 2, 0, 1, '') // the middle '5' of '5 5 5'
    const want = startA('ข')
    want[1][2] = '5 5 = ข120-0,ข120-2'
    expect(bound(1)).toEqual(want)
  })

  it('Backspace at the start of a box joins it to the one before → the joined note’s word goes', async () => {
    await mountEd()
    await keyBox(0, 1, 0, 1, 'Backspace', 0) // '3 4' → '34'
    const want = startA('ก')
    want[0][1] = '34 = ก010-0'
    expect(bound(0)).toEqual(want)
  })

  it('a bracket typed or removed (no word) moves nothing', async () => {
    await mountEd()
    await typeBox(1, 1, 0, 0, '') // '( 2 2 ) 7' → '2 2 ) 7'
    expect(bound(0)[1][1]).toBe('2 2 ) 7 = ก110-0,,ก110-1')
    expect(bound(0)[1][2]).toBe('5 5 5 = ก120-0,ก120-1,ก120-2')
  })
})

describe('ใบ #122 — วางบรรทัด', () => {
  it('same melody: the pasted บรรทัด brings each row’s own words', async () => {
    await mountEd()
    await copyLine(0)
    await pasteLine()
    expect(w.vm.stanzas[0].lines.length).toBe(3)
    for (const i of A_ROWS) {
      const t = TAG[i]
      const want = startA(t)
      want.push(want[0])
      // old code: the pasted บรรทัด had no words at all
      expect(bound(i)).toEqual(want)
    }
    untouched([2])
  })

  it('a word past the end of the melody stays after the pasted บรรทัด', async () => {
    const song = makeSong()
    song.content.arrangement[1].syllables.push('เกิน')
    await mountEd(song)
    await copyLine(1)
    await pasteLine()
    expect(w.vm.arrangement[1].syllables.at(-1)).toBe('เกิน')
    expect(bound(1)[2]).toEqual(startA('ข')[1])
  })

  it('another melody: empty word slots under the pasted บรรทัด; melody A untouched', async () => {
    await mountEd()
    await copyLine(1)
    w.vm.focusRow(2) // → melody B
    await flush()
    await pasteLine()
    expect(bound(2)).toEqual([['1 2 = ร000-0,ร000-1'], ['3 = ร100-0'], ['6 0 = ,', '( 2 2 ) 7 = ,,', '5 5 5 = ,,']])
    untouched([0, 1, 3])
  })

  it('another song: empty word slots, the first song’s words do not leak in', async () => {
    await mountEd()
    await copyLine(0)
    const other = makeSong('s-122-other')
    other.content.lyricSets = undefined
    const L = [[['5']]]
    other.content.stanzas = [{ id: 'A', lines: L.map(v2Line) }]
    other.content.arrangement = [{ stanza: 'A', label: '', syllables: wordsFor('ซ', L) }, { stanza: 'A', label: '', syllables: ['x', 'y'] }]
    await w.setProps({ song: other })
    await flush()
    await pasteLine()
    expect(bound(0)).toEqual([['5 = ซ000-0'], ['1 - 2 = ,,', '3 4 = ,', '5 = ']])
    expect(w.vm.arrangement[1].syllables).toEqual(['x', '', '', '', '', '', '', 'y']) // 'y' was past the end
  })
})

describe('ใบ #122 — one Ctrl+Z brings back notes AND words', () => {
  for (const [name, act] of [
    ['ลบโน้ต', () => delNote(0, 1, 0)],
    ['ทำซ้ำโน้ต', () => dupNote(0, 0, 0)],
    ['พิมพ์เพิ่มโน้ต', () => typeBox(0, 1, 0, 0, '3 6')],
    ['ลบโน้ตในช่อง', () => typeBox(0, 1, 0, 0, '')],
    ['วางบรรทัด', async () => { await copyLine(0); vi.advanceTimersByTime(500); await flush(); await pasteLine() }],
  ]) {
    it(name, async () => {
      vi.useFakeTimers()
      await mountEd()
      const before = snapshotAll()
      await act()
      vi.advanceTimersByTime(500)
      await flush()
      expect(snapshotAll()).not.toEqual(before)
      expect(w.vm.arrangement.map((r) => r.syllables)).not.toEqual(sylsOf(makeSong())) // the words changed too
      ctrlZ()
      await flush()
      expect(snapshotAll()).toEqual(before)
      expect(w.vm.arrangement.map((r) => r.syllables)).toEqual(sylsOf(makeSong()))
    })
  }
})
