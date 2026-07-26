// SILENT-DATA-LOSS GATE (v1) — the LINE level: `deserializeLine` / `serializeLine`.
//
// Companion to EditorMode.dataloss.test.js, which pins the content / stanza / arrangement-row /
// lyric-set levels. This file pins what that one deliberately left out: everything INSIDE a line.
//
// Why it matters even though no published song carries these shapes today (measured 2026-07-26,
// 0 of 199 songs): the /v2 editor deployed at /v2 already ships the D.S./Coda + "ร้องกี่รอบ"
// buttons and writes to the SAME database. The moment anyone uses one, the next plain บันทึก on
// `/` used to delete it — silently, no error, only audible when someone sings from the sheet.
//
// The five loss classes measured at the source (report: C:/gl/pm-inbox/pleng/
// 2026-07-26-v1-serde-blast-radius.md), each with a test below:
//   1. item types v1 has no branch for — {type:'jump'} (D.S./D.C./Segno/Coda), ornaments, imported
//      symbols → dropped whole (v1 was if/else-if with no `default`)
//   2. `id` on marker / repeat-start / repeat-end / volta — the anchors arrangement[].flow points at
//   3. `repeat-end.times` — "เล่นซ้ำ 3 รอบ" collapsed back to the 2× default
//   4. unknown per-segment keys (a future/imported field)
//   5. repeat / volta / pickup sitting on a bar with no note → the whole bar filtered away
//
// PLUS the second lane, which is why 2 and 3 cannot be fixed separately: the carry-unknown fix
// (4ef278c) made v1 PRESERVE `arrangement[].flow` while still stripping the `id`s that flow points
// at, so a save left directives aimed at nothing. songFlow (/v2) treats an unknown id as an orphan
// and ignores the directive — the verse silently sings the default number of rounds. So the ids
// must survive alongside the flow, and `flow` must never end up orphaned by a save.
//
// Everything asserts on `previewContent` (mounted component), the single choke point every v1
// write funnels through — draftRow → saveDraft/saveDirect, the approve RPC and downloadJson all
// serialise exactly this object — so passing here means passing on every save path.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
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
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, DockKey: true, ComboSelect: true } },
  })
const inner = (w) => w.vm.$.setupState
const clone = (x) => JSON.parse(JSON.stringify(x))
const seg = (note, extra = {}) => ({ type: 'segment', chord: '', note, ...extra })

// a song whose single stanza holds `items` as its only line
const songWith = (items, arrangement = [{ stanza: 'A', label: '', syllables: [] }]) => ({
  id: 'song-ls',
  number: 900,
  title_th: 'เพลงทดสอบเส้นบรรทัด',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [items] }],
    arrangement,
  },
})

// what an untouched open → บันทึก would write for this line
const savedLine = (items, arrangement) => clone(mountEd(songWith(items, arrangement)).vm.previewContent).stanzas[0].lines[0]

// every key name anywhere in x — used to prove the editor's own carriers never reach the DB
function allKeys(x, out = new Set()) {
  if (Array.isArray(x)) x.forEach((v) => allKeys(v, out))
  else if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x)) {
      out.add(k)
      allKeys(v, out)
    }
  }
  return out
}

describe('v1 line serde — 1. item types this editor does not model', () => {
  it('a D.S. al Coda jump survives a plain save', () => {
    const items = [seg('1'), seg('2'), { type: 'jump', kind: 'ds', target: 'segno', label: 'D.S. al Coda' }]
    expect(savedLine(items)).toEqual(items)
  })

  it('the jump keeps its POSITION — a mid-line D.S. is not flushed to the line end', () => {
    // position IS the meaning: a D.S. moved past the last note reroutes playback silently
    const jump = { type: 'jump', kind: 'ds', target: 'segno' }
    const items = [seg('1'), jump, { type: 'bar' }, seg('2'), seg('3')]
    expect(savedLine(items)).toEqual(items)
    expect(savedLine(items)[1]).toEqual(jump) // still between note 1 and the barline
  })

  it('a jump BEFORE the first note stays before it', () => {
    const items = [{ type: 'marker', label: '***' }, { type: 'jump', kind: 'coda' }, seg('1')]
    expect(savedLine(items)).toEqual(items)
  })

  it('an imported ornament and a Segno/Coda sign all survive together, in order', () => {
    const items = [
      { type: 'segno' },
      seg('1', { lyric: 'ก' }),
      { type: 'ornament', kind: 'trill' },
      seg('2'),
      { type: 'coda' },
    ]
    expect(savedLine(items)).toEqual(items)
  })

  it('several unknowns anchored to the SAME note keep their load order', () => {
    const items = [seg('1'), { type: 'ornament', kind: 'a' }, { type: 'ornament', kind: 'b' }, seg('2')]
    expect(savedLine(items)).toEqual(items)
  })
})

describe('v1 line serde — 2. `id` on marker / repeat / volta (the flow anchors)', () => {
  it('keeps the id of a repeat pair, a marker and a volta', () => {
    const items = [
      { type: 'marker', label: '***', id: 'm1' },
      { type: 'repeat-start', id: 'r1' },
      seg('1'),
      { type: 'bar' },
      { type: 'volta', num: 1, id: 'v1' },
      seg('2'),
      { type: 'repeat-end', id: 'r1' },
    ]
    expect(savedLine(items)).toEqual(items)
  })

  it('a marker/repeat WITHOUT an id stays without one (no key invented)', () => {
    const items = [{ type: 'marker', label: '***' }, { type: 'repeat-start' }, seg('1'), { type: 'repeat-end' }]
    const out = savedLine(items)
    expect(out).toEqual(items)
    expect('id' in out[0]).toBe(false)
    expect('id' in out[1]).toBe(false)
  })
})

describe('v1 line serde — 3. `repeat-end.times` (how many rounds)', () => {
  it('keeps times: 3 — the refrain still sings three times after a save', () => {
    const items = [{ type: 'repeat-start' }, seg('1'), seg('2'), { type: 'repeat-end', times: 3 }]
    expect(savedLine(items)).toEqual(items)
    expect(savedLine(items).at(-1).times).toBe(3)
  })

  it('keeps id and times together on one repeat-end', () => {
    const items = [{ type: 'repeat-start', id: 'r1' }, seg('1'), { type: 'repeat-end', id: 'r1', times: 4 }]
    expect(savedLine(items).at(-1)).toEqual({ type: 'repeat-end', id: 'r1', times: 4 })
  })

  it('a repeat-end with no times stays clean (no times: null written)', () => {
    const out = savedLine([{ type: 'repeat-start' }, seg('1'), { type: 'repeat-end' }])
    expect(out.at(-1)).toEqual({ type: 'repeat-end' })
    expect('times' in out.at(-1)).toBe(false)
  })
})

describe('v1 line serde — 4. unknown per-segment keys', () => {
  it('keeps a future/imported key on a segment', () => {
    const items = [seg('1', { articulation: 'staccato', _src: { page: 12 } }), seg('2')]
    expect(savedLine(items)).toEqual(items)
  })

  it('still prunes stale fermata holds (the modelled behaviour is unchanged)', () => {
    // 5^ keeps its hold; the second box has no fermata so its hold is dropped
    const out = savedLine([seg('5^ 3', { holds: { 0: 2, 1: 5 } })])
    expect(out[0].holds).toEqual({ 0: 2 })
    // …and a hold with no fermata box left goes away entirely
    expect('holds' in savedLine([seg('5 3', { holds: { 0: 2 } })])[0]).toBe(false)
  })

  it('an unknown segment key survives ALONGSIDE holds pruning', () => {
    const out = savedLine([seg('5^ 3', { holds: { 0: 2, 1: 5 }, articulation: 'accent' })])
    expect(out[0].articulation).toBe('accent')
    expect(out[0].holds).toEqual({ 0: 2 })
  })
})

describe('v1 line serde — 5. a bar that carries only a marker', () => {
  it('keeps a note-less repeat-end bar (‖: … :‖ split across bars)', () => {
    const items = [seg('1'), seg('2'), { type: 'bar' }, { type: 'repeat-end' }]
    expect(savedLine(items)).toEqual(items)
  })

  it('keeps a note-less volta ending bar — marks AND the bar itself', () => {
    const items = [
      { type: 'repeat-start' },
      seg('1'),
      { type: 'bar' },
      { type: 'volta', num: 2 },
      { type: 'repeat-end' },
    ]
    expect(savedLine(items)).toEqual(items)
  })

  it('keeps a note-less pickup bar', () => {
    const items = [seg('1'), { type: 'bar' }, { type: 'pickup' }]
    expect(savedLine(items)).toEqual(items)
  })

  it('a truly empty trailing bar is still dropped (unchanged behaviour)', () => {
    expect(savedLine([seg('1'), { type: 'bar' }])).toEqual([seg('1')])
  })
})

describe('v1 line serde — volta list [2,3] (regression guard: this already worked)', () => {
  it('round-trips the list, and with an id', () => {
    const items = [
      { type: 'repeat-start' },
      seg('1'),
      { type: 'bar' },
      { type: 'volta', num: [2, 3], id: 'v9' },
      seg('2'),
      { type: 'repeat-end' },
    ]
    expect(savedLine(items)).toEqual(items)
  })
})

// ── LANE 2 — the ids the arrangement's `flow` points at ─────────────────────────────────────
// `flow` rides through v1 untouched (it is not in ARRANGEMENT_KEYS → `_extra`). If the ids it
// references are stripped from the line, songFlow (/v2) sees an orphan and silently ignores the
// directive: ข้อ 1 asked for 3 rounds, ข้อ 2 for 1, both end up singing the 2× default. So the
// invariant is not "ids survive" in the abstract — it is "no flow is left pointing at nothing".
describe('v1 line serde — LANE 2: a saved song leaves no flow pointing at a missing id', () => {
  // the melody: ‖: … :‖ ×3, with ข้อ 2 told to sing it once
  const FLOW_ITEMS = [
    { type: 'repeat-start', id: 'r1' },
    seg('1'),
    seg('2'),
    { type: 'repeat-end', id: 'r1', times: 3 },
  ]
  const FLOW_ARR = [
    { stanza: 'A', label: 'ข้อ 1', syllables: ['ก', 'ข'] },
    { stanza: 'A', label: 'ข้อ 2', syllables: ['ค', 'ง'], flow: { skip: ['r1'] } },
  ]

  // the ids that actually exist in a saved content (same rule as songFlow.allMarkerIds: the id of
  // any marker / repeat-start / repeat-end / volta item)
  const idsIn = (content) => {
    const out = new Set()
    for (const s of content.stanzas || []) {
      for (const items of s.lines || []) {
        for (const it of items) if (it?.id) out.add(it.id)
      }
    }
    return out
  }
  // every id referenced by any verse's flow
  const referenced = (content) => {
    const out = new Set()
    for (const r of content.arrangement || []) {
      for (const v of Object.values(r.flow || {})) {
        if (Array.isArray(v)) v.forEach((x) => typeof x === 'string' && out.add(x))
        else if (typeof v === 'string') out.add(v)
      }
    }
    return out
  }

  it('the flow AND its target id both survive one plain save', () => {
    const pc = clone(mountEd(songWith(FLOW_ITEMS, FLOW_ARR)).vm.previewContent)
    expect(pc.arrangement[1].flow).toEqual({ skip: ['r1'] }) // the directive
    expect([...idsIn(pc)]).toEqual(['r1']) // …and what it points at
    expect([...referenced(pc)].filter((id) => !idsIn(pc).has(id))).toEqual([]) // no orphan
  })

  it('the round count that decides "how many times" survives with it', () => {
    const pc = clone(mountEd(songWith(FLOW_ITEMS, FLOW_ARR)).vm.previewContent)
    const end = pc.stanzas[0].lines[0].find((i) => i.type === 'repeat-end')
    expect(end).toEqual({ type: 'repeat-end', id: 'r1', times: 3 })
  })

  it('EDITING the melody keeps the anchor — the flow still resolves after a real edit', async () => {
    const w = mountEd(songWith(FLOW_ITEMS, FLOW_ARR))
    inner(w).stanzas[0].lines[0].bars[0].segments[1].note = '5' // retype a note
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect(pc.stanzas[0].lines[0].find((i) => i.type === 'segment' && i.note === '5')).toBeTruthy()
    expect(pc.arrangement[1].flow).toEqual({ skip: ['r1'] })
    expect([...referenced(pc)].filter((id) => !idsIn(pc).has(id))).toEqual([])
    expect(pc.stanzas[0].lines[0].at(-1).times).toBe(3)
  })

  it('editing the WORDS keeps the anchor too (พี่เปา\u2019s everyday path)', async () => {
    const w = mountEd(songWith(FLOW_ITEMS, FLOW_ARR))
    inner(w).arrangement[0].syllables[0] = 'องค์'
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect(pc.arrangement[0].syllables[0]).toBe('องค์')
    expect([...referenced(pc)].filter((id) => !idsIn(pc).has(id))).toEqual([])
  })
})

// ── the whole risk surface at once, plus the no-leak guarantee ──────────────────────────────
describe('v1 line serde — a song carrying every risky shape', () => {
  const RICH_LINE = [
    { type: 'section', name: 'ท่อน 1' },
    { type: 'marker', label: '***', id: 'm1' },
    { type: 'segno' },
    { type: 'repeat-start', id: 'r1' },
    seg('1^', { holds: { 0: 2 }, articulation: 'accent' }),
    { type: 'jump', kind: 'ds', target: 'segno' },
    { type: 'bar' },
    { type: 'pickup' },
    { type: 'volta', num: [1, 2], id: 'v1' },
    seg('2', { lyric: 'ก' }),
    { type: 'repeat-end', id: 'r1', times: 3 },
    { type: 'bar' },
    { type: 'volta', num: 2, id: 'v2' },
    { type: 'repeat-end', id: 'r2', times: 2 },
    { type: 'label', text: 'จบ' },
    { type: 'end' },
  ]
  const ARR = [{ stanza: 'A', label: 'ข้อ 1', syllables: ['ก'], flow: { skip: ['r1'], only: ['v1'] } }]

  it('round-trips byte-identical through a plain save', () => {
    expect(savedLine(RICH_LINE, ARR)).toEqual(RICH_LINE)
  })

  it('and after an edit elsewhere in the line', async () => {
    const w = mountEd(songWith(RICH_LINE, ARR))
    inner(w).stanzas[0].lines[0].bars[0].segments[0].chord = 'G'
    await nextTick()
    const out = clone(w.vm.previewContent).stanzas[0].lines[0]
    expect(out.find((i) => i.type === 'segment').chord).toBe('G') // the edit landed
    expect(out.filter((i) => i.type !== 'segment')).toEqual(RICH_LINE.filter((i) => i.type !== 'segment'))
    expect(out.find((i) => i.note === '1^').articulation).toBe('accent')
  })

  it('no carrier of the editor (`_raw` / `_unknown`) ever reaches the database', () => {
    const keys = allKeys(clone(mountEd(songWith(RICH_LINE, ARR)).vm.previewContent))
    expect([...keys].filter((k) => k === '_raw' || k === '_unknown')).toEqual([])
    expect([...keys].filter((k) => k.startsWith('_') && k !== '_src')).toEqual([])
  })

  it('opening such a song does not look like unsaved work (no false nag on the way out)', async () => {
    const w = mountEd(songWith(RICH_LINE, ARR))
    await nextTick()
    expect(w.vm.isDirty).toBe(false)
  })

  it('a plain line is untouched — no key added, nothing reordered', () => {
    const plain = [seg('1', { lyric: 'ก' }), { type: 'bar' }, seg('2')]
    expect(savedLine(plain)).toEqual(plain)
  })

  it('undo/redo keeps the carriers working and still leaks nothing', async () => {
    const w = mountEd(songWith(RICH_LINE, ARR))
    inner(w).stanzas[0].lines[0].bars[0].segments[0].chord = 'G'
    await nextTick()
    w.vm.undo()
    await nextTick()
    w.vm.redo()
    await nextTick()
    const pc = clone(w.vm.previewContent)
    const out = pc.stanzas[0].lines[0]
    expect([...allKeys(pc)].filter((k) => k === '_raw' || k === '_unknown')).toEqual([])
    expect(out.filter((i) => i.type !== 'segment')).toEqual(RICH_LINE.filter((i) => i.type !== 'segment'))
    expect(out.find((i) => i.type === 'repeat-end').times).toBe(3)
  })
})

// ── one id = one marker ─────────────────────────────────────────────────────────────────────
// The carriers make v1 hold ids it has no UI to mint — so every path that CLONES a bar or a line
// has to drop them, or the song ends up with two markers answering to one id and a verse's `flow`
// becomes ambiguous (the directive would apply to a copy nobody asked for). /v2 does exactly this
// on its clone paths (songFlow.stripEditorMarkerIds, "R1 rule 2: fresh ids"); this is the v1 half.
// Found by the adversarial review of this patch, 2026-07-26 — the copy buttons are พี่เปา's
// everyday tools, so the hazard is not theoretical.
describe('v1 line serde — a COPY never inherits an id', () => {
  const WITH_IDS = [
    { type: 'marker', label: '***', id: 'm1' },
    { type: 'repeat-start', id: 'r1' },
    seg('1'),
    { type: 'bar' },
    { type: 'volta', num: 1, id: 'v1' },
    seg('2'),
    { type: 'repeat-end', id: 'r1' },
    { type: 'jump', kind: 'ds', id: 'j1' },
  ]
  // every id in the saved song, in document order. `r1` legitimately appears TWICE — a ‖: … :‖
  // pair shares one id — so the test is "the id list is UNCHANGED by a copy", not "all unique".
  const idList = (pc) => pc.stanzas.flatMap((s) => s.lines.flat()).filter((i) => i.id).map((i) => i.id)
  const ORIGINAL_IDS = ['m1', 'r1', 'v1', 'r1', 'j1']
  // Adding notes can move an `_unknown` item that used to be trailing back to its note anchor, so
  // the ORDER of ids may shift after a copy; what must never change is WHICH ids exist and how
  // many times each one does (a `‖: … :‖` pair shares one id — that is the only legal repeat).
  const idBag = (pc) => idList(pc).slice().sort()

  it('the ids of the loaded song are what we think they are (baseline for the copies below)', () => {
    expect(idList(clone(mountEd(songWith(WITH_IDS)).vm.previewContent))).toEqual(ORIGINAL_IDS)
  })

  it('ทำซ้ำห้องนี้ (duplicate bar) copies the bar but not its volta/repeat id', async () => {
    const w = mountEd(songWith(WITH_IDS))
    const s = inner(w)
    s.duplicateBar(s.stanzas[0].lines[0], 1) // the bar carrying the volta + repeat-end
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect(pc.stanzas[0].lines[0].filter((i) => i.type === 'repeat-end')).toHaveLength(2) // it did copy
    expect(pc.stanzas[0].lines[0].filter((i) => i.type === 'volta')).toHaveLength(2)
    expect(idBag(pc)).toEqual(ORIGINAL_IDS.slice().sort()) // …and no id was cloned
  })

  it('ทำซ้ำบรรทัด (copy line) copies the marker/repeat/volta/jump but none of their ids', async () => {
    const w = mountEd(songWith(WITH_IDS))
    inner(w).copyLine(0)
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect(pc.stanzas[0].lines).toHaveLength(2) // the copy exists
    expect(pc.stanzas[0].lines[1].filter((i) => i.type === 'jump')).toHaveLength(1) // jump copied…
    expect(pc.stanzas[0].lines[1].some((i) => i.id)).toBe(false) // …without any id
    expect(idList(pc)).toEqual(ORIGINAL_IDS)
  })

  it('copy → paste a bar carries no id', async () => {
    const w = mountEd(songWith(WITH_IDS))
    const s = inner(w)
    s.copyBarToClip(0, 1)
    s.pasteBarAt(0)
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect(pc.stanzas[0].lines[0].filter((i) => i.type === 'repeat-end')).toHaveLength(2) // pasted
    expect(idBag(pc)).toEqual(ORIGINAL_IDS.slice().sort())
  })

  it('copy → paste a line, and paste-as-new-stanza, carry no id', async () => {
    const w = mountEd(songWith(WITH_IDS))
    const s = inner(w)
    s.copyLineToClip(0)
    s.pasteLineHere()
    s.pasteLineAsStanza()
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect(pc.stanzas).toHaveLength(2) // the new ท่อน
    expect(pc.stanzas[0].lines).toHaveLength(2) // the pasted line
    // the ORIGINAL line still owns its ids — stripping applies to the copy only
    expect(idList(pc)).toEqual(ORIGINAL_IDS)
  })

  it('duplicating a NOTE keeps its unknown fields (a note is data, not an identity)', async () => {
    const w = mountEd(songWith([seg('1', { articulation: 'accent' }), seg('2')]))
    const s = inner(w)
    s.duplicateSegment(s.stanzas[0].lines[0].bars[0], 0)
    await nextTick()
    const out = clone(w.vm.previewContent).stanzas[0].lines[0]
    expect(out.filter((i) => i.articulation === 'accent')).toHaveLength(2)
  })
})

// ── limits this patch deliberately does NOT fix (pinned so a later change is a CHOICE) ───────
// Both come straight from the adversarial review and both are shared with /v2, so "fixing" one of
// them in v1 alone would make the two editors disagree about the same song.
describe('v1 line serde — known, shared-with-/v2 limits', () => {
  it('an unknown item anchored past the last remaining note lands at the line end (never lost)', async () => {
    const items = [seg('1'), seg('2'), seg('3'), { type: 'jump', kind: 'ds' }, seg('4')]
    const w = mountEd(songWith(items))
    const bar = inner(w).stanzas[0].lines[0].bars[0]
    inner(w).removeSegment(bar, 3) // delete note 4 …
    inner(w).removeSegment(bar, 2) // … and note 3, so the anchor (3 notes) is past the end
    await nextTick()
    const out = clone(w.vm.previewContent).stanzas[0].lines[0]
    expect(out.filter((i) => i.type === 'jump')).toHaveLength(1) // still there
    expect(out.at(-1).type).toBe('jump') // at the line end, not deleted, not mid-line
  })

  it('an unknown item stays anchored to its NOTE, so adding a bar can move it off the line end', async () => {
    // {jump} written after the last note is "trailing" on load; duplicate a bar and there are now
    // notes after it, so it re-emits at its note anchor instead. The item is never lost, but its
    // place relative to LATER material can change — the price of anchoring by note count.
    const items = [seg('1'), seg('2'), { type: 'jump', kind: 'ds' }]
    const w = mountEd(songWith(items))
    const s = inner(w)
    expect(clone(w.vm.previewContent).stanzas[0].lines[0].at(-1).type).toBe('jump') // before: at the end
    s.duplicateBar(s.stanzas[0].lines[0], 0)
    await nextTick()
    const out = clone(w.vm.previewContent).stanzas[0].lines[0]
    expect(out.filter((i) => i.type === 'jump')).toHaveLength(1) // still exactly one
    expect(out.findIndex((i) => i.type === 'jump')).toBe(2) // after note 2, ahead of the new bar
  })

  it('a volta written mid-bar comes back at the head of its bar (position normalised, kept)', () => {
    const items = [{ type: 'repeat-start' }, seg('1'), { type: 'volta', num: 1, id: 'v1' }, seg('2'), { type: 'repeat-end' }]
    const out = savedLine(items)
    expect(out.filter((i) => i.type === 'volta')).toEqual([{ type: 'volta', num: 1, id: 'v1' }])
    expect(out.findIndex((i) => i.type === 'volta')).toBe(1) // moved ahead of the notes of its bar
  })
})
