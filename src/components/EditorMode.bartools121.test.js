// ใบ v3/pleng#121 — ลบห้อง · ทำซ้ำห้อง · วางห้อง moved the notes but left the words where they were.
// Words are a flat list per ท่อน (arrangement row), one entry per note slot of its melody, so a
// ห้อง that goes away / is added must take its slice of words with it — in EVERY row on that
// melody (all linked ท่อน, every lyric set, shown or hidden), the way the บรรทัด tools already do
// (removeLine / copyLine). These tests fail on the old code (later words slid onto wrong notes):
//  1. ลบห้อง → its words go; every other ห้อง keeps its words; held / tie / เอื้อน slots stay lined up
//  2. ทำซ้ำห้อง → the copy gets the same words in every row; later ห้อง do not shift
//  3. วางห้อง, same melody → each row gets the words it had under the copied ห้อง
//  4. วางห้อง, another melody / another song → empty word slots; later words stay in place
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

// Melody A: two lines, ห้อง of DIFFERENT lengths with held / tie / เอื้อน slots, so a wrong
// slice shows up at once. Slots per ห้อง: 3 · 2 · 1 | 2 · 3
const A_LINES = [['1 - 2', '3 4', '5'], ['6 0', '( 2 2 ) 7']]
// Melody B: two lines, so a ห้อง pasted on its first line lands in the MIDDLE of the word list
const B_LINES = [['1 2'], ['3']]
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

function makeSong(id = 's-121') {
  return {
    id,
    number: 627,
    title_th: 'ทดสอบเครื่องมือห้อง',
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
const A_ROWS = [0, 1, 3] // full rows on melody A, and their tags
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
// the always-shown bar-foot buttons of ห้อง li-bi
const barBtn = (li, bi, label) => document.querySelector(`.ed-bar[data-bar="${li}-${bi}"] .ed-bar-acts button[aria-label="${label}"]`)
const delBar = (li, bi) => press(barBtn(li, bi, 'ลบห้องนี้'))
const dupBar = (li, bi) => press(barBtn(li, bi, 'ทำซ้ำห้องนี้เป็นห้องถัดไป'))
async function copyBar(li, bi) {
  await press(document.querySelector(`.ed-bar[data-bar="${li}-${bi}"] button[aria-label^="เครื่องมือห้องนี้"]`))
  await press(document.querySelector('button[aria-label="คัดลอกห้องนี้ไปวางที่ท่อนหรือบรรทัดอื่น"]'))
}
const pasteBar = (li) => press(document.querySelectorAll('button[aria-label="วางห้องที่นี่"]')[li])
function ctrlZ() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
}

// What the singer sees: for one ท่อน, each ห้อง as "notes = words under them", line by line.
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
const sylsOf = (song) => song.content.arrangement.map((r) => r.syllables)

describe('ใบ #121 — ลบห้อง: the ห้อง’s words go with it', () => {
  it('every row on the melody (both lyric sets) loses only that ห้อง’s words; the rest stay under their notes', async () => {
    await mountEd()
    await delBar(0, 1) // '3 4'
    expect(w.vm.stanzas[0].lines[0].bars.map((b) => b.segments[0].note)).toEqual(['1 - 2', '5'])
    for (const i of A_ROWS) {
      const t = TAG[i]
      // old code: '5 = <t>01-0' — the deleted ห้อง's word slid onto the next note
      expect(bound(i)).toEqual([
        [`1 - 2 = ${t}00-0,,${t}00-1`, `5 = ${t}02-0`],
        [`6 0 = ${t}10-0,`, `( 2 2 ) 7 = ${t}11-0,,${t}11-1`],
      ])
    }
    // the short ท่อน: its first ห้อง keeps its words, the stray word stays past the end
    expect(bound(4)[0]).toEqual(['1 - 2 = F00-0,,F00-1', '5 = '])
    expect(w.vm.arrangement[4].syllables.at(-1)).toBe('เกิน')
    expect(w.vm.arrangement[4].syllables.length).toBe(10)
    // melody B is not touched
    expect(w.vm.arrangement[2].syllables).toEqual(wordsFor('ร', B_LINES))
    // and the saved song carries it
    const saved = w.emitted('change').at(-1)[0].content.arrangement
    expect(saved[0].syllables).toEqual(['ก00-0', '', 'ก00-1', 'ก02-0', 'ก10-0', '', 'ก11-0', '', 'ก11-1'])
  })

  it('a ห้อง with held slots (rest + เอื้อน) goes cleanly; the next line keeps its words', async () => {
    await mountEd()
    await delBar(1, 0) // '6 0'
    expect(bound(0)).toEqual([
      ['1 - 2 = ก00-0,,ก00-1', '3 4 = ก01-0,ก01-1', '5 = ก02-0'],
      ['( 2 2 ) 7 = ก11-0,,ก11-1'],
    ])
  })

  it('the only ห้อง of a line: the line keeps one empty ห้อง (no words), the next line keeps its words', async () => {
    const song = makeSong()
    const L = [['1 - 2'], ['5'], ['6 0']]
    song.content.stanzas[0].lines = L.map(v2Line)
    song.content.arrangement = [{ stanza: 'A', label: '', syllables: wordsFor('ก', L) }]
    delete song.content.lyricSets
    await mountEd(song)
    await delBar(1, 0)
    expect(bound(0)).toEqual([['1 - 2 = ก00-0,,ก00-1'], [' = '], ['6 0 = ก20-0,']])
  })
})

describe('ใบ #121 — ทำซ้ำห้อง: the copy gets the same words', () => {
  it('every row on the melody copies its own words; later ห้อง do not shift', async () => {
    await mountEd()
    await dupBar(0, 0) // '1 - 2' (attack, held, attack)
    for (const i of A_ROWS) {
      const t = TAG[i]
      // old code: the copy took '<t>01-0,,<t>01-1' and every later word slid 3 slots
      expect(bound(i)).toEqual([
        [`1 - 2 = ${t}00-0,,${t}00-1`, `1 - 2 = ${t}00-0,,${t}00-1`, `3 4 = ${t}01-0,${t}01-1`, `5 = ${t}02-0`],
        [`6 0 = ${t}10-0,`, `( 2 2 ) 7 = ${t}11-0,,${t}11-1`],
      ])
    }
    // the short ท่อน copies what it has; the stray word stays past the end
    expect(bound(4)[0]).toEqual(['1 - 2 = F00-0,,F00-1', '1 - 2 = F00-0,,F00-1', '3 4 = ,', '5 = '])
    expect(w.vm.arrangement[4].syllables.at(-1)).toBe('เกิน')
    expect(w.vm.arrangement[4].syllables.length).toBe(15)
    expect(w.vm.arrangement[2].syllables).toEqual(wordsFor('ร', B_LINES))
  })

  it('a ห้อง with a slur (เอื้อน) on the next line: copy is lined up too', async () => {
    await mountEd()
    await dupBar(1, 1) // '( 2 2 ) 7'
    expect(bound(3)[1]).toEqual(['6 0 = E10-0,', '( 2 2 ) 7 = E11-0,,E11-1', '( 2 2 ) 7 = E11-0,,E11-1'])
    expect(bound(3)[0]).toEqual(['1 - 2 = E00-0,,E00-1', '3 4 = E01-0,E01-1', '5 = E02-0'])
  })

  it('on melody B: only melody B’s words are copied', async () => {
    await mountEd()
    w.vm.focusRow(2)
    await flush()
    expect(w.vm.activeStanzaId).toBe('B')
    await dupBar(0, 0)
    expect(bound(2)).toEqual([['1 2 = ร00-0,ร00-1', '1 2 = ร00-0,ร00-1'], ['3 = ร10-0']])
    for (const i of [0, 1, 3, 4]) expect(w.vm.arrangement[i].syllables).toEqual(sylsOf(makeSong())[i])
  })
})

describe('ใบ #121 — วางห้อง', () => {
  it('same melody: the pasted ห้อง brings each row’s own words; the next line keeps its words', async () => {
    await mountEd()
    await copyBar(1, 1) // '( 2 2 ) 7'
    await pasteBar(0) // end of line 1 → middle of the word list
    expect(w.vm.stanzas[0].lines[0].bars.map((b) => b.segments[0].note)).toEqual(['1 - 2', '3 4', '5', '( 2 2 ) 7'])
    for (const i of A_ROWS) {
      const t = TAG[i]
      // old code: the pasted ห้อง took '<t>10-0,,' and line 2 lost its words
      expect(bound(i)).toEqual([
        [`1 - 2 = ${t}00-0,,${t}00-1`, `3 4 = ${t}01-0,${t}01-1`, `5 = ${t}02-0`, `( 2 2 ) 7 = ${t}11-0,,${t}11-1`],
        [`6 0 = ${t}10-0,`, `( 2 2 ) 7 = ${t}11-0,,${t}11-1`],
      ])
    }
    // the short ท่อน had no words there → empty slots; the stray word stays past the end
    expect(bound(4)[0][3]).toBe('( 2 2 ) 7 = ,,')
    expect(w.vm.arrangement[4].syllables.at(-1)).toBe('เกิน')
    expect(w.vm.arrangement[4].syllables.length).toBe(15)
    expect(w.vm.arrangement[2].syllables).toEqual(wordsFor('ร', B_LINES))
  })

  it('another melody: empty word slots under the pasted ห้อง; its later words stay put; melody A untouched', async () => {
    await mountEd()
    await copyBar(0, 0) // '1 - 2' from melody A
    w.vm.focusRow(2) // → melody B
    await flush()
    await pasteBar(0)
    // old code: '1 - 2 = ร10-0,,' — line 2's word slid onto the pasted ห้อง
    expect(bound(2)).toEqual([['1 2 = ร00-0,ร00-1', '1 - 2 = ,,'], ['3 = ร10-0']])
    for (const i of [0, 1, 3, 4]) expect(w.vm.arrangement[i].syllables).toEqual(sylsOf(makeSong())[i])
  })

  it('another song (same melody name A): empty word slots, the first song’s words do not leak in', async () => {
    await mountEd()
    await copyBar(0, 0)
    const other = makeSong('s-121-other')
    other.content.lyricSets = undefined
    const L = [['5'], ['6']]
    other.content.stanzas = [{ id: 'A', lines: L.map(v2Line) }]
    other.content.arrangement = [{ stanza: 'A', label: '', syllables: wordsFor('ซ', L) }]
    await w.setProps({ song: other })
    await flush()
    expect(w.find('.ed-clip').exists()).toBe(true) // the ห้อง is still held
    await pasteBar(0)
    expect(bound(0)).toEqual([['5 = ซ00-0', '1 - 2 = ,,'], ['6 = ซ10-0']])
  })
})

describe('ใบ #121 — one Ctrl+Z brings back notes AND words', () => {
  for (const [name, act] of [
    ['ลบห้อง', () => delBar(0, 1)],
    ['ทำซ้ำห้อง', () => dupBar(0, 1)],
    ['วางห้อง', async () => { await copyBar(1, 0); vi.advanceTimersByTime(500); await flush(); await pasteBar(0) }],
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
