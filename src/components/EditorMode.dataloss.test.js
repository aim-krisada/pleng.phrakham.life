// SILENT-DATA-LOSS GATE (v1) — the editor must never destroy what it does not model.
//
// Root cause of the 717 `?set=` blocker: EditorMode rebuilds `content` from its own state on
// every save, so any key it doesn't know about was deleted the first time someone pressed
// บันทึก. The lyric-set `id` behind a shared link was only the FIRST such key — the fix is a
// general pass-through (capture unknowns on load, spread them back on save) at every level the
// editor rebuilds: content top-level · stanza · arrangement row · lyric set.
//
// `previewContent` is the single choke point every v1 write funnels through (draftRow →
// saveDraft/saveDirect, the approve RPC, downloadJson) and applyRow is the single load path
// (loadSong · loadDraft · the JSON upload), so proving this pair proves every save path.
//
// NOT covered here (deliberately — v1's line serde is the older narrow one): unknown ITEM
// types and unknown per-segment keys inside a line. See the report in
// C:/gl/pm-inbox/pleng/2026-07-26-v1-carry-unknown-fields.md.
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
// script-setup internals (addLyricSet / doRemoveLyricSet / …) are not in defineExpose; the
// tests below drive them the way the buttons do.
const inner = (w) => w.vm.$.setupState
const clone = (x) => JSON.parse(JSON.stringify(x))

// A song carrying, at EVERY level the editor rebuilds, something this version doesn't model.
// Shaped so an untouched open→save must come back byte-identical (labels/syllables already
// trimmed, `set` on every row, bpm present) — anything the editor added or dropped shows up.
const RICH = {
  id: 'song-1',
  number: 717,
  title_th: 'เพลงที่มีของแปลก',
  title_en: '',
  content: {
    version: 2,
    key: 'G',
    timeSignature: '4/4',
    bpm: 90,
    capo: 3, // unknown content top-level key
    _future: { experiment: true, list: [1, 2] }, // …and a nested one
    stanzas: [
      {
        id: 'A',
        mystery: { imported: 'keep-me' }, // unknown per-stanza key
        lines: [
          [
            { type: 'segment', chord: 'G', note: '1' },
            { type: 'bar' },
            { type: 'segment', chord: 'D', note: '3' },
          ],
        ],
      },
    ],
    // the real blocker: a permanent id a shared ?set= link points at, plus a second unknown
    lyricSets: [
      { name: 'บรรดาคนบาป', label: 'บรรดาคนบาป', id: 's0a7d42c7e7' },
      { name: 'ผู้ที่ถูกบาป', label: 'ผู้ที่ถูกบาป', id: 's3b87476c4f', origin: 'da-import' },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: ['พระ', 'เจ้า'], set: 0, futureFlag: 'repeat-each' },
      { stanza: 'A', label: 'ร้อง 1', syllables: ['ทรง', 'ดี'], set: 1 },
    ],
  },
}

// An ordinary song — no sets, no unknown keys. Must stay byte-identical, i.e. the pass-through
// can never add an `_extra` (or any other) key of its own to what gets written.
const PLAIN = {
  id: 'song-2',
  number: 12,
  title_th: 'เพลงธรรมดา',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['พระ'] }],
  },
}

// every key name anywhere in the saved payload — the editor's private bookkeeping must not leak
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

describe('EditorMode (v1) — unknown fields survive load → save', () => {
  it('opening and saving untouched returns the content byte-identical, unknowns included', () => {
    const pc = clone(mountEd(RICH).vm.previewContent)
    expect(pc).toEqual(RICH.content)
  })

  it('the lyric-set ids survive — the actual ?set= blocker', () => {
    const pc = mountEd(RICH).vm.previewContent
    expect(pc.lyricSets.map((s) => s.id)).toEqual(['s0a7d42c7e7', 's3b87476c4f'])
  })

  it('unknowns survive at content / stanza / arrangement level too, not just in lyricSets', () => {
    const pc = mountEd(RICH).vm.previewContent
    expect(pc.capo).toBe(3)
    expect(pc._future).toEqual({ experiment: true, list: [1, 2] })
    expect(pc.stanzas[0].mystery).toEqual({ imported: 'keep-me' })
    expect(pc.arrangement[0].futureFlag).toBe('repeat-each')
    expect(pc.lyricSets[1].origin).toBe('da-import')
  })

  it('no editor bookkeeping key (_extra) leaks into what gets written', () => {
    const keys = allKeys(clone(mountEd(RICH).vm.previewContent))
    expect([...keys].filter((k) => k.startsWith('_') && k !== '_future')).toEqual([])
  })

  it('an ordinary song with no sets and no unknowns is unchanged (no behaviour change)', () => {
    const pc = clone(mountEd(PLAIN).vm.previewContent)
    expect(pc).toEqual(PLAIN.content)
    expect(pc.lyricSets).toBeUndefined()
  })

  it('a plain song loaded after a rich one inherits none of its unknown keys', async () => {
    const w = mountEd(RICH)
    await w.setProps({ song: PLAIN })
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect(pc).toEqual(PLAIN.content)
  })
})

// ── the maintenance hazard behind the whole pass-through ───────────────────────────────────
// `_extra` is spread LAST, so if a key the editor DOES emit ever went missing from its
// CONTENT_KEYS / STANZA_KEYS / ARRANGEMENT_KEYS / LYRIC_SET_KEYS list, rest() would stash a
// stale copy of it and that stale copy would silently overwrite the author's edit on save.
// The lists are only correct while they cover everything previewContent emits at that level —
// so assert exactly that, against a song whose every modelled key carries a value.
describe('EditorMode (v1) — the key lists cover everything previewContent emits', () => {
  const FULL = {
    id: 'song-3',
    number: 1,
    title_th: 'ครบทุกคีย์',
    title_en: '',
    content: {
      version: 2,
      key: 'F',
      timeSignature: '3/4',
      bpm: 112,
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'F', note: '1' }]] }],
      lyricSets: [
        { name: 'ชุด 1', label: 'ชุด 1' },
        { name: 'ชุด 2', label: 'ชุด 2' },
      ],
      arrangement: [
        { stanza: 'A', label: 'ร้อง 1', syllables: ['พระ'], key: 'G', set: 0, afterEachVerse: true },
        { stanza: 'A', label: 'ร้อง 2', syllables: ['เจ้า'], set: 1 },
      ],
    },
  }

  it('no _extra bucket holds a key the editor emits at that level', () => {
    const w = mountEd(FULL)
    const s = inner(w)
    const pc = w.vm.previewContent
    const clash = (extra, emitted) => Object.keys(extra || {}).filter((k) => k in emitted)
    // content level: contentExtras vs the top-level keys previewContent emits
    expect(clash(s.contentExtras, pc)).toEqual([])
    // and each per-item bucket vs the item that item produced
    s.stanzas.forEach((x, i) => expect(clash(x._extra, pc.stanzas[i])).toEqual([]))
    s.arrangement.forEach((x, i) => expect(clash(x._extra, pc.arrangement[i])).toEqual([]))
    s.lyricSets.forEach((x, i) => expect(clash(x._extra, pc.lyricSets[i])).toEqual([]))
    // every bucket is in fact EMPTY for this song — it carries nothing the editor can't model
    expect(s.contentExtras).toEqual({})
    expect(s.stanzas.map((x) => x._extra)).toEqual([{}])
    expect(s.arrangement.map((x) => x._extra)).toEqual([{}, {}])
    expect(s.lyricSets.map((x) => x._extra)).toEqual([{}, {}])
  })

  it('a song using every modelled key round-trips byte-identical', () => {
    expect(clone(mountEd(FULL).vm.previewContent)).toEqual(FULL.content)
  })
})

// ── the regression the blocker really needs: EDITING must not cost an unrelated field ──────
describe('EditorMode (v1) — editing the words never drops an unrelated field', () => {
  it('typing a syllable keeps every id and every unknown key', async () => {
    const w = mountEd(RICH)
    inner(w).arrangement[0].syllables[0] = 'องค์'
    await nextTick()
    const pc = w.vm.previewContent
    expect(pc.arrangement[0].syllables[0]).toBe('องค์') // the edit landed
    expect(pc.lyricSets.map((s) => s.id)).toEqual(['s0a7d42c7e7', 's3b87476c4f'])
    expect(pc.arrangement[0].futureFlag).toBe('repeat-each')
    expect(pc.capo).toBe(3)
    expect(pc.stanzas[0].mystery).toEqual({ imported: 'keep-me' })
  })

  // The editor no longer authors a set's name (the tabs are positional since 26 ก.ค.), so the
  // question is no longer "does a rename keep the ids" but the stricter one: does editing the
  // WORDS leave the whole set row — the name nobody displays, the id a share link points at, the
  // importer's own fields — exactly as it was found?
  it('editing a set’s words touches nothing else on the set row', async () => {
    const w = mountEd(RICH)
    const before = clone(w.vm.previewContent.lyricSets)
    inner(w).arrangement[0].syllables[0] = 'องค์'
    await nextTick()
    const pc = w.vm.previewContent
    expect(pc.lyricSets).toEqual(before) // name, label, id, origin — all byte-identical
    expect(pc.lyricSets.map((x) => x.id)).toEqual(['s0a7d42c7e7', 's3b87476c4f'])
    expect(pc.lyricSets[1].origin).toBe('da-import')
  })

  it('adding a third set keeps the two existing ids (and the new set carries no leftovers)', async () => {
    const w = mountEd(RICH)
    inner(w).addLyricSet()
    await nextTick()
    const pc = w.vm.previewContent
    expect(pc.lyricSets).toHaveLength(3)
    expect(pc.lyricSets.slice(0, 2).map((x) => x.id)).toEqual(['s0a7d42c7e7', 's3b87476c4f'])
    expect(pc.lyricSets[2].id).toBeUndefined() // a brand-new set has no id until one is minted
    // and no caption either: it is derived from position, so there is nothing to store
    expect(Object.keys(pc.lyricSets[2])).toEqual([])
  })

  it('deleting a set keeps the surviving sets’ ids', async () => {
    // 3 sets, so the delete does NOT collapse the song back to an ordinary one
    const three = clone(RICH)
    three.content.lyricSets.push({ name: 'ชุดสาม', label: 'ชุดสาม', id: 's9c0000000' })
    three.content.arrangement.push({ stanza: 'A', label: 'ร้อง 1', syllables: ['ก', 'ข'], set: 2 })
    const w = mountEd(three)
    const s = inner(w)
    s.askRemoveLyricSet(1) // the ✕ on the set tab, then the confirm dialog's ลบ
    s.doRemoveLyricSet()
    await nextTick()
    const pc = w.vm.previewContent
    expect(pc.lyricSets.map((x) => x.id)).toEqual(['s0a7d42c7e7', 's9c0000000'])
  })

  // G-verify (adversarial, 2026-07-26) claimed `_extra` would leak into the DB after an undo,
  // because the snapshot JSON.stringify's stanzas/arrangement WITH their `_extra` and restores
  // them. previewContent builds a fresh literal per item (it never spreads `s` itself), so it
  // should not — but undo/redo IS a real user path, so pin it instead of arguing about it.
  it('undo/redo keeps the unknowns and still leaks no _extra into what gets written', async () => {
    const w = mountEd(RICH)
    inner(w).arrangement[0].syllables[0] = 'องค์'
    await nextTick()
    w.vm.undo()
    await nextTick()
    w.vm.redo()
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect([...allKeys(pc)].filter((k) => k.startsWith('_') && k !== '_future')).toEqual([])
    expect(pc.stanzas[0].mystery).toEqual({ imported: 'keep-me' })
    expect(pc.arrangement[0].futureFlag).toBe('repeat-each')
    expect(pc.lyricSets.map((s) => s.id)).toEqual(['s0a7d42c7e7', 's3b87476c4f'])
  })

  // …and the same review's other live concern: `_extra` now rides inside docState(), so a song
  // must still open CLEAN — otherwise every reader who merely opens #717 gets the
  // "มีงานที่ยังไม่บันทึก" nag on the way out (B100).
  it('a song carrying unknown keys still opens clean (no false unsaved-work warning)', async () => {
    const w = mountEd(RICH)
    await nextTick()
    expect(w.vm.isDirty).toBe(false)
  })

  it('an ordinary song stays ordinary through an edit — the pass-through adds nothing', async () => {
    const w = mountEd(PLAIN)
    inner(w).arrangement[0].syllables[0] = 'องค์'
    await nextTick()
    const pc = clone(w.vm.previewContent)
    expect(pc).toEqual({
      ...PLAIN.content,
      arrangement: [{ stanza: 'A', label: '', syllables: ['องค์'] }],
    })
  })
})
