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

// B110 — the beam OVERLAY is drawn one bar per beam LEVEL, so a run that mixes เขบ็ต 1 ชั้น
// and 2 ชั้น no longer paints a double bar over the 1-ชั้น note. jsdom has no layout, so the
// pixel geometry is verified live in the browser (docs/reports/b110-beam-levels.md); what is
// assertable here is the STRUCTURE NoteRow emits — which is the contract v-beam draws from.
describe('NoteRow beam levels (B110)', () => {
  const bars = (notes) =>
    mount(NoteRow, { props: { notes } })
      .findAll('.beam')
      .map((b) => {
        const d = b.attributes()
        return `L${d['data-beam-level']}:${d['data-beam-start']}-${d['data-beam-end']}` +
          (d['data-beam-partial'] ? '/' + d['data-beam-partial'] : '')
      })

  it('.7_. 1__ — TWO bars: a full level 1 and a LEFT stub at level 2', () => {
    expect(bars('.7_. 1__')).toEqual(['L1:0-1', 'L2:1-1/left'])
  })

  it('1__ .7_. — the level-2 stub points RIGHT when the sixteenth leads', () => {
    expect(bars('1__ .7_.')).toEqual(['L1:0-1', 'L2:0-0/right'])
  })

  it('5_ 6__ 7_ — a sixteenth between two eighths gets a LEFT stub', () => {
    expect(bars('5_ 6__ 7_')).toEqual(['L1:0-2', 'L2:1-1/left'])
  })

  it('A4 — all eighths still draw exactly ONE bar (no regression)', () => {
    expect(bars('5_ 6_')).toEqual(['L1:0-1'])
  })

  it('A4 — all sixteenths still draw a full double beam (two bars, same span)', () => {
    expect(bars('1__ 2__ 3__ 4__')).toEqual(['L1:0-3', 'L2:0-3'])
  })

  it('adjacent sixteenths make ONE full level-2 bar, not two stubs', () => {
    expect(bars('1_ 2__ 3__')).toEqual(['L1:0-2', 'L2:1-2'])
  })

  it('the old single-thickness .beam-u2 class is gone (every bar is one 1.5px line)', () => {
    const w = mount(NoteRow, { props: { notes: '1__ 2__ 3__ 4__' } })
    expect(w.findAll('.beam-u2').length).toBe(0)
  })

  // A4 fallback — with no layout (jsdom / some print paths) every bar hides itself and the
  // per-note underlines (.num.u1 / .num.u2) carry the reading, which were ALWAYS per-note
  // correct. This is the graceful degradation that must survive.
  it('no layout → bars hide themselves and per-note underlines remain correct', () => {
    const w = mount(NoteRow, { props: { notes: '.7_. 1__' }, attachTo: document.body })
    for (const b of w.findAll('.beam')) expect(b.element.style.display).toBe('none')
    const nums = w.findAll('.num')
    expect(nums[0].classes()).toContain('u1') // the dotted eighth keeps ONE underline
    expect(nums[1].classes()).toContain('u2') // the sixteenth keeps TWO
    w.unmount()
  })
})

// B114 — a NoteRow can MOUNT while its tab is still `display:none` (Studio.vue keeps all
// three modes mounted behind `v-show`). Every rect then reads 0, applyBeam hides each bar,
// and nothing has asked it to measure again. This test drives exactly that sequence:
//
//   1. mount with NO layout (every rect 0)      → bars hide themselves
//   2. let the mount-time rAF passes run        → still no layout, still hidden
//   3. layout appears (the tab was shown)       → but no resize / no RO delivery
//   4. the browser reports the row is rendered  → bars must measure themselves
//
// Step 4 is an IntersectionObserver delivery. On the pre-B114 code no IntersectionObserver
// is constructed at all, so the first assertion fails — this test genuinely discriminates.
describe('NoteRow beams re-measure when their tab becomes visible (B114)', () => {
  const LAYOUT = { on: false }
  let realRect, realIO, ioInstances

  // fake geometry: the row is 100x40; digit i sits at x = i*20 .. i*20+10, bottom 30
  function fakeRect() {
    if (!LAYOUT.on) return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }
    if (this.classList && this.classList.contains('note-row')) {
      return { left: 0, right: 100, top: 0, bottom: 40, width: 100, height: 40 }
    }
    const nt = this.closest && this.closest('.nt')
    if (nt) {
      const i = Number(nt.dataset.idx || 0)
      return { left: i * 20, right: i * 20 + 10, top: 10, bottom: 30, width: 10, height: 20 }
    }
    return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }
  }

  beforeEach(() => {
    LAYOUT.on = false
    ioInstances = []
    realRect = Element.prototype.getBoundingClientRect
    realIO = global.IntersectionObserver
    Element.prototype.getBoundingClientRect = fakeRect
    global.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; this.targets = []; ioInstances.push(this) }
      observe(t) { this.targets.push(t) }
      disconnect() { this.targets = [] }
    }
  })

  afterEach(() => {
    Element.prototype.getBoundingClientRect = realRect
    global.IntersectionObserver = realIO
  })

  const settle = () => new Promise((r) => setTimeout(r, 60))

  it('a bar mounted in a hidden tab measures itself once the row is reported visible', async () => {
    const w = mount(NoteRow, { props: { notes: '.7_. 1__' }, attachTo: document.body })
    await settle() // the mount-time rAF passes run here — still no layout, so still hidden
    const bars = w.findAll('.beam')
    expect(bars.length).toBe(2)
    for (const b of bars) expect(b.element.style.display).toBe('none')

    // the observer must exist and must watch the ROW (the element that gains a box), not
    // the zero-sized bar itself — this is what pre-B114 code is missing entirely
    expect(ioInstances.length).toBe(2)
    for (const io of ioInstances) {
      expect(io.targets.length).toBe(1)
      expect(io.targets[0].classList.contains('note-row')).toBe(true)
    }

    // the tab is shown: layout exists, but NOTHING fires resize and no RO is delivered
    LAYOUT.on = true
    expect(bars[0].element.style.display).toBe('none') // still stale — nobody asked yet

    // ...now the browser reports the row is rendered on screen
    ioInstances[0].cb([{ isIntersecting: true }])
    await settle()

    for (const b of w.findAll('.beam')) expect(b.element.style.display).not.toBe('none')
    w.unmount()
  })

  it('one row appearing re-measures EVERY bar, so bars further down the sheet are correct', async () => {
    const w = mount(NoteRow, { props: { notes: '.7_. 1__' }, attachTo: document.body })
    await settle()
    LAYOUT.on = true
    // only the FIRST bar's observer fires; the second bar must be measured too
    ioInstances[0].cb([{ isIntersecting: true }])
    await settle()
    const bars = w.findAll('.beam')
    // level 1 spans digit0.left(0) .. digit1.right(30); baseline = digit bottom (30)
    expect(bars[0].element.style.width).toBe('30px')
    expect(bars[0].element.style.top).toBe('30px')
    // level 2 is the stub on the sixteenth: digit1 (20..30) + ext = min(10, gap 10 / 2) = 5
    expect(bars[1].element.style.width).toBe('15px')
    expect(bars[1].element.style.left).toBe('15px')
    expect(bars[1].element.style.top).toBe('32.5px')
    w.unmount()
  })

  it('an already-measured bar does not re-sweep on ordinary scrolling', async () => {
    const w = mount(NoteRow, { props: { notes: '.7_. 1__' }, attachTo: document.body })
    await settle()
    LAYOUT.on = true
    ioInstances[0].cb([{ isIntersecting: true }])
    await settle()
    // scrolling delivers more intersections; with every bar already measured the guard
    // (display !== 'none') means no further work is scheduled and nothing changes
    const before = w.findAll('.beam').map((b) => b.element.getAttribute('style'))
    ioInstances[0].cb([{ isIntersecting: true }])
    ioInstances[1].cb([{ isIntersecting: true }])
    await settle()
    expect(w.findAll('.beam').map((b) => b.element.getAttribute('style'))).toEqual(before)
    w.unmount()
  })

  it('beforeprint still re-measures every bar (A6 unchanged)', async () => {
    const w = mount(NoteRow, { props: { notes: '.7_. 1__' }, attachTo: document.body })
    await settle()
    LAYOUT.on = true
    window.dispatchEvent(new Event('beforeprint'))
    for (const b of w.findAll('.beam')) expect(b.element.style.display).not.toBe('none')
    w.unmount()
  })
})
