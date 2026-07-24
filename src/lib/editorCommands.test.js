// CP-0 — the note-symbol registry is the SINGLE source of truth, and the keyboard path and the
// button/applySymbol path share ONE classification. Before this, SongViewer had TWO independent
// char→behavior tables (the keydown handler and applySymbol) plus SYMBOL_CHARS, and NoteInputBar
// had SYMBOL_GROUPS — four places that could drift so a symbol typed-but-the-button-failed (or
// the reverse). These tests PROVE the drift is structurally impossible now.
import { describe, it, expect } from 'vitest'
import {
  SYMBOLS,
  SYMBOL_CHARS,
  SYMBOL_GROUPS,
  symbolCharsOf,
  buildSymbolGroups,
  symbolIndex,
  symbolForKey,
  symbolBehavior,
  effectFor,
  applySymbolToContent,
} from './editorCommands.js'
import { withNoteMark, withInsertedBox, withAccidental, withOctaveShift, withBarAfter } from './songEdit.js'

// one stanza (2 notes) + two verses linked to it, so a box insert's ripple is observable — the
// same fixture shape songEdit.symbols.test.js uses, so the engine sees a realistic selection.
function makeContent() {
  return {
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 's1', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }],
    arrangement: [
      { stanza: 's1', syllables: ['สรร', 'เส'] },
      { stanza: 's1', syllables: ['พระ', 'เจ้า'] },
    ],
  }
}
const LINE = { _stanza: 's1', _stanzaLine: 0, _entryIndex: 0 }
const at = (syk) => ({ resolvedLine: LINE, si: 0, syk })

// the exact set that used to be hard-coded in SongViewer (`SYMBOL_CHARS`) and, in effect, across
// NoteInputBar's SYMBOL_GROUPS. If the registry ever loses/gains an on-bar symbol, this fails.
const ON_BAR = ['_', '.', '-', '~', '^', 'n', "'", '(', ')', '{', '}', '|']

describe('registry = single source of the symbol set', () => {
  it('SYMBOL_CHARS is exactly the on-bar characters (was the hard-coded "_.-~^(){}|n\'")', () => {
    expect([...SYMBOL_CHARS].sort()).toEqual([...ON_BAR].sort())
    expect(SYMBOL_CHARS.length).toBe(ON_BAR.length)
  })

  it('SYMBOL_GROUPS reproduces the toolbar strip the const used to give, in order', () => {
    expect(SYMBOL_GROUPS.map((g) => g.name)).toEqual(['ความยาว', 'เสียง', 'กลุ่ม/ห้อง'])
    expect(SYMBOL_GROUPS.map((g) => g.keys.map((k) => k.ch))).toEqual([
      ['_', '.', '-', '~', '^'],
      ['n', "'"],
      ['(', ')', '{', '}', '|'],
    ])
    for (const g of SYMBOL_GROUPS) for (const k of g.keys) expect(k.th.length).toBeGreaterThan(0)
  })

  it('# and b are classified here but are NOT on the toolbar strip', () => {
    expect(symbolBehavior('#')).toBe('accidental')
    expect(symbolBehavior('b')).toBe('accidental')
    expect([...SYMBOL_CHARS]).not.toContain('#')
    expect([...SYMBOL_CHARS]).not.toContain('b')
  })

  it('every entry has a behavior the dispatch understands — nothing dangling', () => {
    const known = new Set(['mark', 'box', 'accidental', 'octaveUp', 'bar'])
    for (const s of SYMBOLS) expect(known.has(s.behavior)).toBe(true)
  })

  it("resolves aliases: ' and the curly quote ’ are the same command; junk is null", () => {
    expect(symbolForKey("'")).toBe("'")
    expect(symbolForKey('’')).toBe("'") // some keyboards emit U+2019 for the apostrophe key
    expect(symbolForKey(',')).toBe(null) // parser gives it no meaning → not a symbol
    expect(symbolForKey('x')).toBe(null)
  })
})

describe('⭐ drift-killer: the keyboard door and the button door are ONE dispatch', () => {
  // The keyboard passes `e.key`; the toolbar passes the button's `ch`. SongViewer feeds BOTH into
  // applySymbol → applySymbolToContent. Model each door as the input it supplies, then assert the
  // content effect is identical for every registered symbol — and equals the raw engine call.
  const ENGINE = {
    mark: (c, loc, ch) => withNoteMark(c, loc, ch),
    box: (c, loc, ch) => withInsertedBox(c, loc, ch, ch === '(' || ch === '{'),
    accidental: (c, loc, ch) => withAccidental(c, loc, ch),
    octaveUp: (c, loc) => withOctaveShift(c, loc, 1),
    bar: (c, loc) => withBarAfter(c, loc),
  }

  it('every symbol: keydown input, button input, and the raw engine all agree on content', () => {
    for (const s of SYMBOLS) {
      const loc = at(0)
      const viaButton = applySymbolToContent(makeContent(), loc, s.ch) // toolbar tap sends s.ch
      const viaEngine = ENGINE[s.behavior](makeContent(), loc, s.ch) // what the engine does directly
      expect(viaButton).toEqual(viaEngine) // the single dispatch matches the engine for this symbol

      // every key-form the KEYBOARD can produce for this symbol (its char + any alias) must land
      // on the identical content as the button — this is the exact drift the two tables allowed.
      for (const keyForm of [s.ch, ...(s.aliasKeys || [])]) {
        const viaKeydown = applySymbolToContent(makeContent(), loc, keyForm)
        expect(viaKeydown).toEqual(viaButton)
      }
    }
  })

  it('the keyboard GATE and the button DISPATCH recognize exactly the same keys', () => {
    // A key the keyboard would treat as a symbol (`symbolForKey` truthy) must also be classifiable
    // by the dispatch (its canonical char has a behavior), and vice-versa. No key alive on one
    // door and dead on the other — that asymmetry is precisely what CP-0 removes.
    const { byKey, behavior } = symbolIndex()
    for (const key of byKey.keys()) {
      const ch = symbolForKey(key)
      expect(ch).not.toBe(null)
      expect(behavior.get(ch)).toBeTruthy()
    }
  })

  it('a non-symbol key changes nothing on either door', () => {
    const c = makeContent()
    expect(applySymbolToContent(c, at(0), ',')).toBe(c) // reference-equal = untouched
    expect(applySymbolToContent(c, at(0), '5')).toBe(c)
  })

  it('no selection = no change (both doors guard on loc)', () => {
    const c = makeContent()
    expect(applySymbolToContent(c, null, '_')).toBe(c)
  })
})

describe('⭐ adding ONE registry entry wires BOTH doors — no other code change', () => {
  it('a synthetic symbol is typable AND tappable from a single new entry', () => {
    // Add one entry, aliased, mapped to an existing behavior. We touch nothing but the list.
    const synthetic = { id: 'sym-test', ch: '@', group: 'ทดสอบ', th: 'ทดสอบ', behavior: 'bar', onBar: false, aliasKeys: ['×'] }
    const idx = symbolIndex([...SYMBOLS, synthetic])

    // keyboard door: the gate now recognizes the new char and its alias, resolving to canonical.
    expect(idx.byKey.get('@')).toBe('@')
    expect(idx.byKey.get('×')).toBe('@')

    // button + keyboard doors: dispatch routes '@' (and its alias) to the SAME effect as the real
    // symbol of that behavior ('|' → bar), with zero changes anywhere else in the codebase.
    const loc = at(0)
    const asBar = applySymbolToContent(makeContent(), loc, '|', idx)
    expect(applySymbolToContent(makeContent(), loc, '@', idx)).toEqual(asBar)
    expect(applySymbolToContent(makeContent(), loc, '×', idx)).toEqual(asBar)
  })

  it('removing an on-bar entry drops its toolbar button, nothing else to edit (AC-0.2)', () => {
    const without = buildSymbolGroups(SYMBOLS.filter((s) => s.ch !== '^'))
    const chars = without.flatMap((g) => g.keys.map((k) => k.ch))
    expect(chars).not.toContain('^')
    expect(chars.length).toBe(ON_BAR.length - 1)
    // and the learn-set derivation drops it too, in lockstep — one list drives both
    expect(symbolCharsOf(SYMBOLS.filter((s) => s.ch !== '^'))).not.toContain('^')
  })
})

describe('effectFor — the pure classification→engine table (belt + braces)', () => {
  it('unknown behavior is a no-op, never a throw', () => {
    const c = makeContent()
    expect(effectFor('nonsense', c, at(0), '?')).toBe(c)
  })
})
