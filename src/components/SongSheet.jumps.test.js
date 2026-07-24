// Repeat / navigation NOTATION GLYPHS on the song sheet — Segno 𝄋 · Coda 𝄌 ·
// D.C./D.S. (+ al Fine / al Coda) · To Coda · Fine · final barline ‖. RENDER-only:
// a marker in the model must draw the right glyph, at the marker's own spot in the line,
// in every layer preset, with the music SIGNS drawn as inline SVG (no font tofu).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'

// One line = [ segment, jump-marker, segment ] so we can assert the glyph sits BETWEEN
// the two notes (generic positioning — not bar-boundary only).
const withMarker = (marker, extra = {}) =>
  mount(SongSheet, {
    props: {
      content: {
        key: 'C',
        timeSignature: '4/4',
        lines: [[
          { type: 'segment', chord: 'C', note: '1', lyric: 'ก' },
          marker,
          { type: 'segment', chord: 'G', note: '2', lyric: 'ข' },
        ]],
      },
      mode: 'full',
      ...extra,
    },
  })

describe('SongSheet — repeat/navigation glyphs', () => {
  // ---- Segno / Coda draw as inline SVG (deterministic, tofu-proof) ----
  it('Segno renders an SVG sign (not a font glyph) with an accessible label', () => {
    const w = withMarker({ type: 'segno' })
    const sign = w.find('.jump-sign')
    expect(sign.exists()).toBe(true)
    expect(sign.find('svg.jm-glyph').exists()).toBe(true) // drawn, no ▯ risk
    expect(sign.attributes('aria-label')).toContain('Segno')
    expect(sign.text()).toBe('') // no text node — purely the glyph
  })

  it('Coda renders an SVG sign with an accessible label', () => {
    const w = withMarker({ type: 'coda' })
    const sign = w.find('.jump-sign')
    expect(sign.exists()).toBe(true)
    expect(sign.find('svg.jm-glyph').exists()).toBe(true)
    expect(sign.attributes('aria-label')).toContain('Coda')
  })

  // ---- Letter directives draw as text ----
  it.each([
    [{ type: 'dc' }, 'D.C.'],
    [{ type: 'dc', al: 'fine' }, 'D.C. al Fine'],
    [{ type: 'dc', al: 'coda' }, 'D.C. al Coda'],
    [{ type: 'ds' }, 'D.S.'],
    [{ type: 'ds', al: 'fine' }, 'D.S. al Fine'],
    [{ type: 'ds', al: 'coda' }, 'D.S. al Coda'],
    [{ type: 'to-coda' }, 'To Coda'],
    [{ type: 'fine' }, 'Fine'],
  ])('directive %o renders "%s"', (marker, text) => {
    const w = withMarker(marker)
    const el = w.find('.jump-text')
    expect(el.exists()).toBe(true)
    expect(el.text()).toBe(text)
  })

  // ---- The engine lane's shape is flexible: accept the canonical {type:'jump',kind} and a
  //      kind-tagged generic marker too, so whatever it emits renders the same. ----
  it('accepts the canonical {type:"jump", kind} shape', () => {
    expect(withMarker({ type: 'jump', kind: 'segno' }).find('.jump-sign svg').exists()).toBe(true)
    expect(withMarker({ type: 'jump', kind: 'ds', al: 'coda' }).find('.jump-text').text()).toBe('D.S. al Coda')
  })

  it('accepts a kind-tagged generic marker {type:"marker", kind}', () => {
    expect(withMarker({ type: 'marker', kind: 'coda' }).find('.jump-sign svg').exists()).toBe(true)
  })

  it('a plain {type:"marker", label} (no kind) is untouched — still the free-text marker', () => {
    const w = withMarker({ type: 'marker', label: 'x2' })
    expect(w.find('.jump-mark').exists()).toBe(false) // not treated as a jump
    expect(w.find('.section-marker').text()).toBe('x2') // old behaviour preserved
  })

  // ---- Position: the glyph sits at the marker's own spot, between the two notes ----
  it('positions the glyph BETWEEN the surrounding notes (generic, not bar-only)', () => {
    const w = withMarker({ type: 'segno' })
    const spots = w.findAll('.segment, .jump-mark')
    // segment(ก) · segno · segment(ข)  →  glyph is the middle child in DOM order
    expect(spots.length).toBe(3)
    expect(spots[1].classes()).toContain('jump-sign')
  })

  // ---- Visible in the words-only preset too (hymn-book form needs the jumps) ----
  it('stays drawn in lyrics-only mode (a singer still needs the jumps)', () => {
    const w = withMarker({ type: 'fine' }, { mode: 'lyrics' })
    expect(w.find('.jump-text').text()).toBe('Fine')
    const seg = withMarker({ type: 'segno' }, { mode: 'lyrics' })
    expect(seg.find('.jump-sign svg').exists()).toBe(true)
  })

  // ---- "Fine" (the word) and the final barline ‖ (end) are distinct, and coexist ----
  it('Fine directive and the final barline ‖ are separate marks', () => {
    const w = mount(SongSheet, {
      props: {
        content: {
          key: 'C', timeSignature: '4/4',
          lines: [[{ type: 'segment', chord: 'C', note: '1', lyric: 'ก' }, { type: 'fine' }, { type: 'end' }]],
        },
        mode: 'full',
      },
    })
    expect(w.find('.jump-text').text()).toBe('Fine') // the word
    expect(w.find('.bar-final').exists()).toBe(true)  // the ‖ strokes
  })

  it('unknown marker kinds are ignored (render nothing, do not throw)', () => {
    const w = withMarker({ type: 'jump', kind: 'wat' })
    expect(w.find('.jump-mark').exists()).toBe(false)
    expect(w.findAll('.segment').length).toBe(2) // the two real notes still render
  })
})
