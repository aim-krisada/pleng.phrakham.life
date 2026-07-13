// B062 — slur/tie draw as continuous SVG arcs (not CSS pseudo-arcs that break into
// pieces once a group grows). These assertions ARE B062's acceptance criteria for the
// NoteRow layer: one arc per slur group at ANY length, and tie half-arcs at bar edges.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteRow from './NoteRow.vue'

describe('NoteRow slur/tie SVG (B062)', () => {
  it('draws exactly ONE slur arc path for a 4-note slur group', () => {
    const w = mount(NoteRow, { props: { notes: '(1 2 3 4)' } })
    expect(w.findAll('.slur-arc').length).toBe(1)
    expect(w.findAll('.slur-arc path').length).toBe(1)
  })

  it('a long slur stays ONE path (does not break into pieces)', () => {
    const w = mount(NoteRow, { props: { notes: "(1 2 3 4 5 6 7 1')" } })
    // one group -> one arc -> one path, regardless of how many notes it spans
    expect(w.findAll('.slur-arc').length).toBe(1)
    expect(w.findAll('.slur-arc path').length).toBe(1)
  })

  it('draws one arc per slur group when there are several', () => {
    const w = mount(NoteRow, { props: { notes: '(1 2) 3 (4 5) 6' } })
    expect(w.findAll('.slur-arc').length).toBe(2)
  })

  it('renders no slur arc when there is no slur', () => {
    const w = mount(NoteRow, { props: { notes: '1 2 3 4' } })
    expect(w.findAll('.slur-arc').length).toBe(0)
  })

  it('does not put a slur arc on a triplet group', () => {
    const w = mount(NoteRow, { props: { notes: '{1 2 3}' } })
    expect(w.findAll('.slur-arc').length).toBe(0)
    expect(w.findAll('.g-triplet').length).toBe(1)
  })

  it('draws SVG half-arcs for a tie (start + end), not the old CSS hooks', () => {
    const w = mount(NoteRow, { props: { notes: '1~ ~1' } })
    expect(w.findAll('.tie-start-arc').length).toBe(1)
    expect(w.findAll('.tie-end-arc').length).toBe(1)
    expect(w.findAll('.tie-arc path').length).toBe(2)
  })

  it('a bar-crossing tie end (leading ~) still renders its half-arc', () => {
    // the note after a bar carries only tieEnd; its half-arc must still draw so it can
    // meet the previous segment's start-half over the bar line
    const w = mount(NoteRow, { props: { notes: '~5' } })
    expect(w.findAll('.tie-end-arc').length).toBe(1)
    expect(w.findAll('.tie-start-arc').length).toBe(0)
  })
})

// B076 — the arc `d`/viewBox are COMPUTED from the real width (not a fixed path stretched
// with preserveAspectRatio), so a long เอื้อน keeps a clean, constant-height curve instead
// of a flattened/warped one. jsdom reports width 0, so v-arc uses its fallback widths — we
// assert the directive actually wrote a well-formed, closed lens/half-lens path.
describe('NoteRow slur/tie width-driven geometry (B076)', () => {
  const slurD = (w) => w.find('.slur-arc path').attributes('d')
  const closedLens = /^M[\d.]+,33 C.* C.* Z$/ // two Béziers forming a filled lens, closed

  it('slur path is a closed two-Bézier lens the directive built', () => {
    const w = mount(NoteRow, { props: { notes: '(1 2 3 4)' }, attachTo: document.body })
    expect(slurD(w)).toMatch(closedLens)
    w.unmount()
  })

  it('a long 8-note slur produces the SAME shaped closed lens (not broken/warped)', () => {
    const w = mount(NoteRow, { props: { notes: "(1 2 3 4 5 6 7 1')" }, attachTo: document.body })
    expect(w.findAll('.slur-arc path').length).toBe(1)
    expect(slurD(w)).toMatch(closedLens)
    // ends still sit on the baseline (y=33) and the apex control still reaches y=3 —
    // constant height regardless of how many notes the slur spans
    expect(slurD(w)).toContain(',33 C')
    expect(slurD(w)).toContain(',3 ')
    w.unmount()
  })

  it('both tie halves are closed paths the directive built', () => {
    const w = mount(NoteRow, { props: { notes: '1~ ~1' }, attachTo: document.body })
    const ds = w.findAll('.tie-arc path').map((p) => p.attributes('d'))
    expect(ds.length).toBe(2)
    for (const d of ds) expect(d).toMatch(/^M.*L.* Z$/) // square-cut edge (L) + closed
    w.unmount()
  })
})

// A held note tied across a bar ("2 - - - | ~2") is drawn by SongSheet's overlay as ONE
// arc from the SOURCE DIGIT to the receiver digit. To find the source digit it walks back
// over the '-' extensions, which it identifies by the `nt-ext` class NoteRow stamps on each
// dash. This class is that contract — if it ever drops, the overlay anchors the arc on the
// last dash again and the tie reads as broken (พี่เปา issues1). Guard it here.
describe('NoteRow marks extension dashes with nt-ext (tie-overlay source anchor)', () => {
  it('every "-" extension token gets the nt-ext class; digits do not', () => {
    const w = mount(NoteRow, { props: { notes: '2 - - -' } })
    const nts = w.findAll('.nt')
    expect(nts.length).toBe(4)
    expect(nts[0].classes()).not.toContain('nt-ext') // the digit
    for (const i of [1, 2, 3]) expect(nts[i].classes()).toContain('nt-ext') // the dashes
  })
})

// Beat-based beaming (issues2 / พี่เปา): a within-beat run of eighths/sixteenths is drawn as
// ONE beam (a .beam element per run), and a slur that IS just such a run drops its arc — the
// เอื้อน is engraved as a beam, like the songbook, not a slur curve. (These come from the note
// string, so they're assertable in jsdom even though the beam's pixel position needs layout.)
describe('NoteRow beaming (issues2)', () => {
  it('a within-beat "(6_ 5_)" เอื้อน draws ONE beam and NO slur arc', () => {
    const w = mount(NoteRow, { props: { notes: '(6_ 5_)' } })
    expect(w.findAll('.slur-arc').length).toBe(0) // arc suppressed — it's a beam, not a slur
    expect(w.findAll('.beam').length).toBe(1)
    expect(w.findAll('.nt.beamed').length).toBe(2)
  })

  it('a run crossing a beat is TWO beams, not one long beam', () => {
    // 3(quarter) - 3_ 4_ 5_ 6_  →  3_4_ (beat 3) and 5_6_ (beat 4) beam separately
    const w = mount(NoteRow, { props: { notes: '(3 - 3_) 4_ 5_ 6_' } })
    expect(w.findAll('.beam').length).toBe(2)
    // the slur here holds a quarter + '-' , so it keeps its arc (a phrase melisma, not a beam)
    expect(w.findAll('.slur-arc').length).toBe(1)
  })

  it('a lone eighth is not beamed; an eighth+quarter pair has no beam', () => {
    expect(mount(NoteRow, { props: { notes: '1_ 2' } }).findAll('.beam').length).toBe(0)
    expect(mount(NoteRow, { props: { notes: '5' } }).findAll('.beam').length).toBe(0)
  })

  it('triplets are not swept into beam runs (they keep their own bracket + underline)', () => {
    const w = mount(NoteRow, { props: { notes: '{1_ 2_ 3_}' } })
    expect(w.findAll('.beam').length).toBe(0)
    expect(w.findAll('.g-triplet').length).toBe(1)
  })

  it('viewBox is set to a 0 0 W 40 box (1:1 x, constant-height y)', () => {
    const w = mount(NoteRow, { props: { notes: '(1 2 3 4)' }, attachTo: document.body })
    expect(w.find('.slur-arc').attributes('viewBox')).toMatch(/^0 0 [\d.]+ 40$/)
    w.unmount()
  })
})
