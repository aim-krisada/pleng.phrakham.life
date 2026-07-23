<script setup>
import { computed } from 'vue'
import { beamGroups } from '../lib/notation.js'

const props = defineProps({
  notes: { type: String, default: '' },
  // slot index (within this segment) of the note sounding now, or -1 for none. Counts
  // every rendered digit/dash left-to-right — the same slot midi.js puts on each attack
  // — so the played note lights up in step with its syllable (B006).
  active: { type: Number, default: -1 },
  // v2 per-syllable slots for this segment (blank = เอื้อน / held). Drives syllable-based
  // beaming (issue8): a beam breaks before a note that starts a NEW word. null (v1 / not
  // supplied) → beat-only beaming, unchanged.
  syllables: { type: Array, default: null },
  // inline-edit selection: the slot index of the note being EDITED (or -1), and whether the
  // NOTE layer is the one being edited (vs its word). A separate visual from `active` (which
  // is the moving playback highlight) so both can show at once in different colours.
  sel: { type: Number, default: -1 },
  selActive: { type: Boolean, default: false },
})
// flatten groups but stamp each rendered token with its running slot index so the
// template can match `active` without re-counting across the nested v-for.
const model = computed(() => {
  // --- Beaming (issues2 + issue8) -----------------------------------------------------
  // beamGroups stamps each token's running `.idx` (matching data-idx below) and returns the
  // beam runs. A เอื้อน run within one beat is engraved as ONE connected underline (a beam),
  // like the reference songbook — NOT a slur arc. issue8: a beam now also breaks before any
  // note that starts a new sung syllable (from `syllables`), so two words sharing a beat are
  // NOT joined. Logic lives in lib/notation.js so it is unit-tested without layout.
  const { groups: gs, beams } = beamGroups(props.notes, props.syllables)
  // A slur group that is entirely ONE within-beat beam (a short เอื้อน like "(6_ 5_)") is
  // drawn as that beam, so its arc is dropped — the arc form is reserved for phrase melismas
  // that span beats / hold notes (e.g. "(3 - 3_)"), which keep it.
  for (const g of gs) {
    if (g.group === 'slur') {
      g.beamOnly = g.tokens.length >= 2 && g.tokens.every((t) => t.type === 'note' && t.beamed)
    }
  }
  return { groups: gs, beams }
})
const groups = computed(() => model.value.groups)
// One drawn bar per BEAM LEVEL (B110), not one per run: a run that mixes เขบ็ต 1 ชั้น and
// 2 ชั้น (`.7_. 1__`) gets a full level-1 bar over the whole run plus a level-2 bar over
// only the sixteenths — a lone sixteenth getting a short partial beam (ขีดหัก). This matters
// much more since B120 made runs long: one flag for a whole run would over-paint widely.
const beams = computed(() =>
  model.value.beams.flatMap((b) =>
    b.levels && b.levels.length
      ? b.levels
      : [{ level: 1, start: b.start, end: b.end, partial: null }],
  ),
)
const ACC_GLYPH = { '#': '♯', b: '♭', n: '♮' }

// --- Engraved slur/tie geometry (B076) ------------------------------------------------
// The old arcs used one FIXED path stretched to the group width with
// preserveAspectRatio="none". That single-axis stretch flattened long slurs and blunted
// their tips (a long เอื้อน over 8 notes came out warped). The LilyPond principle (from
// docs/reports/jianpu-ly-study.md (ค)#2) is: don't stretch a ready-made shape — compute
// the curve from the REAL span each time so the apex height and end-taper stay constant
// while only the horizontal reach grows. We keep our filled-lens look (thin tips, thick
// middle) and do exactly that: the `v-arc` directive measures the arc's rendered pixel
// width and rebuilds `d` (and a matching 1:1 viewBox so the x-axis is never scaled).
const rnd = (n) => Math.round(n * 10) / 10

// slur = a filled lens spanning the whole group. Y values stay in the 0..40 viewBox
// (apex ~y=3, inner edge ~y=17, ends at y=33) so the curve height never changes; only x
// is driven by the measured width W. The control-point inset CX is held CONSTANT for long
// spans (sharp tips, the middle simply flattens like a real long slur) and only capped to
// a fraction of the span so a short 2-note slur can't overshoot into a loop.
const SLUR_INSET = 4 // tips sit just inside the span, floating above the first/last digit
const SLUR_CX = 26 // constant taper depth (px) for long slurs
const SLUR_CX_FRAC = 0.32 // ...but never more than this fraction of a short span
function slurArc(w) {
  const W = w > 0 ? w : 84 // pre-layout / jsdom fallback so a path always renders
  const x0 = SLUR_INSET
  const x1 = W - SLUR_INSET
  const span = Math.max(1, x1 - x0)
  const cx = Math.min(SLUR_CX, span * SLUR_CX_FRAC)
  const a = rnd(x0 + cx) // outer+inner control near the left tip
  const b = rnd(x1 - cx) // ...near the right tip
  // outer edge (apex, y=3) forward, then inner edge (y=17) back → a lens that tapers to a
  // point at each end and is thickest at the middle, at ANY width.
  const d = `M${rnd(x0)},33 C${a},3 ${b},3 ${rnd(x1)},33 C${b},17 ${a},17 ${rnd(x0)},33 Z`
  return { viewBox: `0 0 ${rnd(W)} 40`, d }
}
// tie halves: same principle, drawn across the measured width W. Each half tapers to a
// point at the held note and is cut square (full thickness) at the bar edge so the two
// halves butt into one curve over the bar line. Widths are small/steady (a fixed ~1em
// box), so these were never the warped case — computing from W keeps them stable and on
// the same footing as the slur.
function tieStartArc(w) {
  const W = w > 0 ? w : 16
  const d = `M0,31 C${rnd(0.3 * W)},9 ${rnd(0.7 * W)},5 ${rnd(W)},5 L${rnd(W)},16 C${rnd(0.7 * W)},18 ${rnd(0.3 * W)},26 0,31 Z`
  return { viewBox: `0 0 ${rnd(W)} 40`, d }
}
function tieEndArc(w) {
  const W = w > 0 ? w : 16
  const d = `M${rnd(W)},31 C${rnd(0.7 * W)},9 ${rnd(0.3 * W)},5 0,5 L0,16 C${rnd(0.3 * W)},18 ${rnd(0.7 * W)},26 ${rnd(W)},31 Z`
  return { viewBox: `0 0 ${rnd(W)} 40`, d }
}
const ARC_BUILDERS = { slur: slurArc, tieStart: tieStartArc, tieEnd: tieEndArc }

function applyArc(el, kind) {
  const build = ARC_BUILDERS[kind]
  if (!build) return
  // Slur: anchor the arc span to the FIRST→LAST note-head CENTRES of its group, MEASURED like
  // the beam — not a fixed % of the group box. A seg-grid column (B011) is sized to its (often
  // wider) syllable, so the digit is centred inside a box wider than itself; the old
  // left:8%/width:84% then started the arc at the column's left edge — overshooting left of the
  // "3" and across the bar line (พี่เอม). Spanning centre→centre puts the tips on the noteheads,
  // matching the overlay slurs (tie arcs are redrawn by SongSheet's overlay, so are unaffected).
  if (kind === 'slur') {
    const group = el.parentElement
    const nums = group ? group.querySelectorAll('.nt .num') : null
    if (group && nums && nums.length >= 2) {
      const gr = group.getBoundingClientRect()
      const a = nums[0].getBoundingClientRect()
      const b = nums[nums.length - 1].getBoundingClientRect()
      if (gr.width && a.width && b.width) {
        const x0 = a.left + a.width / 2 - gr.left
        const x1 = b.left + b.width / 2 - gr.left
        el.style.left = x0.toFixed(1) + 'px'
        el.style.width = Math.max(1, x1 - x0).toFixed(1) + 'px'
      }
    }
  }
  // clientWidth = the SVG's own rendered box; setting viewBox width to it makes the x-axis
  // 1:1, so preserveAspectRatio="none" no longer distorts horizontally.
  const w = el.clientWidth || (el.getBoundingClientRect && el.getBoundingClientRect().width) || 0
  const { viewBox, d } = build(w)
  el.setAttribute('viewBox', viewBox)
  const path = el.querySelector('path')
  if (path) path.setAttribute('d', d)
}

// Re-measure every live arc before the browser snapshots the print layout, since print
// can resize the notes and ResizeObserver may not fire in time (installed once per module).
const liveArcs = new Set()
function applyAllArcs() {
  for (const el of liveArcs) applyArc(el, el.__arcKind)
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', applyAllArcs)
  if (window.matchMedia) {
    try {
      window.matchMedia('print').addEventListener('change', applyAllArcs)
    } catch (_) {
      /* older Safari: no MediaQueryList.addEventListener — beforeprint still covers it */
    }
  }
}

// v-arc="'slur' | 'tieStart' | 'tieEnd'" — measure this arc and (re)build its path, then
// keep it in sync with layout via a ResizeObserver.
const vArc = {
  mounted(el, binding) {
    el.__arcKind = binding.value
    liveArcs.add(el)
    applyArc(el, binding.value)
    if (typeof ResizeObserver !== 'undefined') {
      el.__arcRO = new ResizeObserver(() => applyArc(el, el.__arcKind))
      el.__arcRO.observe(el)
    }
  },
  updated(el, binding) {
    el.__arcKind = binding.value
    applyArc(el, binding.value)
  },
  unmounted(el) {
    liveArcs.delete(el)
    if (el.__arcRO) {
      el.__arcRO.disconnect()
      delete el.__arcRO
    }
  },
}

// v-beam="{ level, start, end, partial }" — draw ONE beam bar spanning the first through
// last note it covers (issues2). The per-note underlines leave lyric-driven gaps between the
// digits; this bar bridges them into a single beam, overlaying the existing border-bottoms at
// the same y/thickness so it simply reads as one line. Positioned against the .note-row and
// re-measured on layout/resize/print. If there is no layout (jsdom), it hides itself and the
// per-note underlines remain as a graceful fallback.
//
// B110 — geometry is per LEVEL now. We anchor on the digit's CONTENT bottom (its own
// underline border stripped off), because a `.num.u2` box is taller than a `.num.u1` box;
// measuring raw rect.bottom made the y depend on which note happened to be first. From that
// baseline every level sits where the old `4px double` border drew it:
//   level 1 → baseline .. +1.5   ·   level 2 → +2.5 .. +4   ·   level 3 → +5 .. +6.5
// so an all-eighths run and an all-sixteenths run come out pixel-identical to before.
const BEAM_TH = 1.5 // bar thickness — matches `.num.u1`'s border-bottom
const BEAM_GAP = 1 // white space between two beam levels — matches the `double` border
const BEAM_STUB_MIN = 3 // a fractional beam never shrinks below this, however tight the gap
const liveBeams = new Set()
// The digit a partial beam points AT — the note it shares the beam with, one slot before
// (partial 'left') or after (partial 'right') it. Used only to clamp the stub's reach.
function neighbourRect(row, b) {
  const idx = b.partial === 'left' ? b.start - 1 : b.end + 1
  const el = row.querySelector(`.nt[data-idx="${idx}"] .num`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width ? r : null
}
function applyBeam(el) {
  const b = el.__beam
  const row = el.parentElement
  if (!row || !b) return
  const first = row.querySelector(`.nt[data-idx="${b.start}"] .num`)
  const last = row.querySelector(`.nt[data-idx="${b.end}"] .num`)
  if (!first || !last) { el.style.display = 'none'; return }
  const rr = row.getBoundingClientRect()
  const a = first.getBoundingClientRect()
  const c = last.getBoundingClientRect()
  if (!a.width || !rr.width) { el.style.display = 'none'; return }
  // strip the measured digit's own underline border so every level shares one baseline
  let border = 0
  if (typeof getComputedStyle === 'function') {
    const w = parseFloat(getComputedStyle(first).borderBottomWidth)
    if (!Number.isNaN(w)) border = w
  }
  const baseline = a.bottom - border
  const level = b.level || 1
  let left = a.left - rr.left
  let width = Math.max(0, c.right - a.left)
  if (b.partial) {
    // ขีดหัก (fractional beam). Gould, *Behind Bars*: a fractional beam runs about ONE
    // notehead — in numbered notation the "notehead" is the digit, so the stub covers this
    // digit and reaches a further digit-width toward the note it is beamed to. It is then
    // CLAMPED to half the white gap, so the stub can never reach the neighbouring digit —
    // the eye must still read a break, or it looks like a full beam again.
    const nb = neighbourRect(row, b)
    let ext = a.width
    if (nb) {
      const gap = b.partial === 'left' ? a.left - nb.right : nb.left - a.right
      if (gap > 0) ext = Math.min(ext, gap / 2)
    }
    ext = Math.max(BEAM_STUB_MIN, ext)
    width = a.width + ext
    if (b.partial === 'left') left -= ext
  }
  el.style.display = ''
  el.style.left = left + 'px'
  el.style.width = width + 'px'
  el.style.height = BEAM_TH + 'px'
  el.style.top = baseline - rr.top + (level - 1) * (BEAM_TH + BEAM_GAP) + 'px'
}
function applyAllBeams() { for (const el of liveBeams) applyBeam(el) }
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', applyAllBeams)
  // The beam is positioned from the digits' MEASURED positions, which shift when web fonts
  // swap in / the lyric row reflows AFTER the first paint — a resize of the note-row itself
  // may not fire (monospace digits keep the row width), so the per-el ResizeObserver alone
  // left the beam on stale coords. Re-measure on window resize + once fonts are ready so the
  // beam lands on the settled layout, same as SongSheet's tie overlay.
  window.addEventListener('resize', applyAllBeams)
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(applyAllBeams).catch(() => {})
  }
}
// Coalesce a re-measure of every live beam into ONE pass on the next frame, so several rows
// becoming visible at once (a whole tab appearing) cost a single sweep, not one per row.
let allBeamsQueued = false
function scheduleAllBeams() {
  if (allBeamsQueued) return
  allBeamsQueued = true
  const run = () => { allBeamsQueued = false; applyAllBeams() }
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(run)
  else run()
}
const vBeam = {
  mounted(el, binding) {
    el.__beam = binding.value
    liveBeams.add(el)
    applyBeam(el)
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => requestAnimationFrame(() => applyBeam(el)))
    }
    const target = el.parentElement || el
    if (typeof ResizeObserver !== 'undefined') {
      el.__beamRO = new ResizeObserver(() => applyBeam(el))
      el.__beamRO.observe(target)
    }
    // B114 — แผ่นเพลง is kept MOUNTED behind `v-show`, so a NoteRow mounts while its tab is
    // still `display:none`: every rect reads 0, applyBeam hides the bar, and the reader sees
    // NO beams at all. (Measured live on this branch: a `.sheet-workspace` that is
    // display:none holds a bar with width 0.) Nothing ever asks it to measure again — an
    // element with no box has no ResizeObserver box to change, so the RO above is not a
    // dependable signal for "an ancestor stopped being display:none". IntersectionObserver
    // is: an unrendered element never intersects, and the moment it gains a rendered box on
    // screen the observer delivers an entry. When it fires we re-measure ALL live bars
    // (coalesced to one frame), because one row appearing means the whole sheet just
    // appeared. Guarded on `display === 'none'` so ordinary scrolling costs nothing.
    if (typeof IntersectionObserver !== 'undefined') {
      el.__beamIO = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting && el.style.display === 'none') scheduleAllBeams()
        }
      })
      el.__beamIO.observe(target)
    }
  },
  updated(el, binding) {
    el.__beam = binding.value
    applyBeam(el)
  },
  unmounted(el) {
    liveBeams.delete(el)
    if (el.__beamRO) {
      el.__beamRO.disconnect()
      delete el.__beamRO
    }
    if (el.__beamIO) {
      el.__beamIO.disconnect()
      delete el.__beamIO
    }
  },
}
</script>

<template>
  <span class="note-row">
    <span
      v-for="(g, gi) in groups"
      :key="gi"
      :class="['note-group', g.group ? 'g-' + g.group : '']"
      :style="{ '--span': g.tokens.length }"
    >
      <!-- slur (เอื้อน) = ONE continuous SVG arc over the whole group, at any length
           (B062). The `v-arc` directive (B076) measures the group's real width and rebuilds
           the Bézier `d` so the apex height and tapered tips stay constant while only the
           reach grows — a long เอื้อน no longer flattens/warps the way a stretched fixed
           path did. viewBox is set 1:1 to the measured px width, so x is never scaled. -->
      <svg v-if="g.group === 'slur' && !g.beamOnly" class="slur-arc" v-arc="'slur'" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <!-- engraved slur: a FILLED lens (two Béziers) — tapered to fine points at the
             ends, thickest at the apex. `d` is (re)computed by v-arc from the real width;
             this initial value is just a pre-mount fallback. -->
        <path d="M4,33 C30,3 56,3 82,33 C56,17 30,17 4,33 Z" />
      </svg>
      <span
        v-for="(t, ti) in g.tokens"
        :key="ti"
        :data-idx="t.idx"
        :class="['nt', t.type === 'ext' ? 'nt-ext' : '', t.beamed ? 'beamed' : '', t.type === 'note' && t.dots ? 'dotted' : '', t.type === 'note' && t.dots === 2 ? 'dbldot' : '', t.type === 'note' && t.accidental ? 'has-acc' : '', t.tieStart ? 'tie-start' : '', t.tieEnd ? 'tie-end' : '', t.idx === active ? 'nt-playing' : '', t.idx === sel ? 'nt-sel' : '', t.idx === sel && selActive ? 'nt-sel-active' : '']"
      >
        <!-- tie across a bar (B062): each side draws a smooth SVG half-arc that rises to
             the segment edge, so the two halves in adjacent segments meet over the bar
             line into one curve. v-arc (B076) rebuilds `d` from the real width, same as the
             slur, keeping the tips consistent; the inline `d` is a pre-mount fallback. -->
        <svg v-if="t.tieStart" class="tie-arc tie-start-arc" v-arc="'tieStart'" viewBox="0 0 16 40" preserveAspectRatio="none" aria-hidden="true">
          <!-- left half of an engraved tie: fine point at the held note, cut square at
               the bar edge (full thickness) so it butts the next segment's end-half -->
          <path d="M0,31 C4.8,9 11.2,5 16,5 L16,16 C11.2,18 4.8,26 0,31 Z" />
        </svg>
        <svg v-if="t.tieEnd" class="tie-arc tie-end-arc" v-arc="'tieEnd'" viewBox="0 0 16 40" preserveAspectRatio="none" aria-hidden="true">
          <!-- right half: full thickness at the bar edge, tapering to a point at the note -->
          <path d="M16,31 C11.2,9 4.8,5 0,5 L0,16 C4.8,18 11.2,26 16,31 Z" />
        </svg>
        <template v-if="t.type === 'note'">
          <!-- octave dots stay centred on the DIGIT; more than one dot stacks
               VERTICALLY (like the book) growing away from the digit. The
               augmentation dot sits beside it (absolute) so it never nudges them. -->
          <span v-if="t.fermata" class="fermata" aria-hidden="true"></span>
          <span class="dots-hi" aria-hidden="true"><span v-for="k in t.high" :key="k" class="odot"></span></span>
          <span :class="['num', 'u' + t.underlines]"><span v-if="t.accidental" class="acc">{{ ACC_GLYPH[t.accidental] }}</span>{{ t.pitch }}<span v-if="t.dots" class="aug" aria-hidden="true">{{ '•'.repeat(t.dots) }}</span></span>
          <span class="dots-lo" aria-hidden="true"><span v-for="k in t.low" :key="k" class="odot"></span></span>
        </template>
        <template v-else-if="t.type === 'ext'">
          <span class="dots-hi"></span>
          <span class="num">–</span>
          <span class="dots-lo"></span>
        </template>
        <template v-else>
          <span class="dots-hi"></span>
          <span class="num">{{ t.text }}</span>
          <span class="dots-lo"></span>
        </template>
      </span>
    </span>
    <!-- beams (issues2): one continuous underline per same-beat run of eighths/sixteenths,
         positioned over the digits by v-beam so consecutive beamed notes read as one beam. -->
    <i
      v-for="b in beams"
      :key="'beam-' + b.level + '-' + b.start"
      class="beam"
      :class="['beam-l' + b.level, b.partial ? 'beam-partial' : '']"
      :data-beam-level="b.level"
      :data-beam-start="b.start"
      :data-beam-end="b.end"
      :data-beam-partial="b.partial || ''"
      v-beam="b"
      aria-hidden="true"
    ></i>
  </span>
</template>

<style scoped>
.note-row { display: inline-flex; align-items: flex-start; position: relative; }
.note-group { display: inline-flex; position: relative; }
.nt {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 1.05em;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  line-height: 1.05;
}
.nt.dotted { margin-right: 0.45em; }
.nt.dbldot { margin-right: 0.7em; } /* two aug dots need a touch more room */
/* the digit sounding right now — brand-tinted with a soft pill so the eye tracks the
   melody note by note (B006). Background on the digit itself keeps it above the row. */
.nt-playing .num {
  color: var(--brand, #8b4513);
  background: rgba(139, 69, 19, 0.16);
  border-radius: 5px;
}
/* inline-edit selection on the NOTE — a distinct BLUE box (edit) vs the brown playback pill,
   so a note can be "being edited" and "sounding" at the same time and stay readable. The box
   sits on the whole cell (digit + octave dots) so the selected note reads as one target. */
.nt-sel {
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.1);
  box-shadow: inset 0 0 0 1.5px rgba(37, 99, 235, 0.45);
}
/* the note LAYER is the one being edited (vs its word) — stronger, solid border */
.nt-sel-active {
  background: rgba(37, 99, 235, 0.18);
  box-shadow: inset 0 0 0 2px #2563eb;
}
/* fixed-height spacer above/below the digit — reserves room for ONE dot level so
   every note (0, 1 or 2 dots) keeps the same height and the digits stay aligned */
.dots-hi, .dots-lo { display: block; height: 0.46em; position: relative; }
/* CSS-drawn octave dots, stacked vertically away from the digit. A 2nd dot fits
   inside the reserved height, so a two-octave note never shifts the row. */
.odot {
  position: absolute; left: 50%;
  width: 0.16em; height: 0.16em;
  margin-left: -0.08em;
  border-radius: 50%;
  background: currentColor;
}
.dots-hi .odot { bottom: 0.08em; }
.dots-hi .odot:nth-child(2) { bottom: 0.30em; }
.dots-hi .odot:nth-child(3) { bottom: 0.52em; }
.dots-lo .odot { top: 0.08em; }
.dots-lo .odot:nth-child(2) { top: 0.30em; }
.dots-lo .odot:nth-child(3) { top: 0.52em; }
.num { display: block; padding: 0 1px; position: relative; }
.num.u1 { border-bottom: 1.5px solid currentColor; }
.num.u2 { border-bottom: 4px double currentColor; }
/* Every eighth/sixteenth note keeps its OWN separate underline so each note reads
   as its own เขบ็ต — a slur (เอื้อน) is only the arc above and must NOT join the
   underlines (a long connected underline means something else). Triplets still
   stretch their underlines to sit under the bracketed group. */
.g-triplet .num.u1, .g-triplet .num.u2 { align-self: stretch; text-align: center; }
/* Beam (issues2 / พี่เปา): one continuous underline spanning a same-beat run of eighths/
   sixteenths — a เอื้อน within a beat engraved like the reference songbook, distinct from the
   arc used for phrase melismas that span beats. Drawn as a bar (v-beam measures its left/width/
   top over the digits) that overlays the per-note border-bottoms and bridges the lyric-driven
   gaps between them into a single line. B110: ONE bar per beam LEVEL — level 2 only spans
   the notes that are really sixteenths, and a lone sixteenth gets a short partial stub —
   so a mixed run no longer shows two lines under a one-underline note. */
.beam {
  position: absolute;
  background: currentColor;
  pointer-events: none;
}
/* accidental: smaller than the digit, floating at its upper-left WITHOUT
   widening the digit column — so octave dots stay exactly under the digit */
.acc {
  position: absolute;
  font-size: 0.62em;
  top: -0.5em;
  left: -0.85em;
}
.nt.has-acc { margin-left: 0.55em; }
/* fermata: small arc with a centre dot floating above the note */
.fermata {
  position: absolute;
  top: -0.35em;
  left: 50%;
  transform: translateX(-50%);
  width: 0.75em;
  height: 0.4em;
  border: 1.5px solid currentColor;
  border-bottom: none;
  border-radius: 0.75em 0.75em 0 0 / 0.5em 0.5em 0 0;
}
.fermata::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0.03em;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  background: currentColor;
  border-radius: 50%;
}
/* augmentation dot: same size as the octave dots, sitting on the digit's
   baseline just to its right (absolute so it never shifts the octave dots) */
.aug {
  position: absolute;
  left: 100%;
  bottom: 0.12em;
  margin-left: 0.1em;
  font-size: 0.55em;
  line-height: 1;
}
/* slur (เอื้อน) — one SVG arc spanning the whole group. Its `d`/viewBox are computed
   from the measured width by v-arc (B076), so it is NOT stretched; width just sets the
   box the directive measures. */
.slur-arc {
  position: absolute;
  top: -0.15em;
  left: 8%;
  /* explicit width — an <svg> replaced element ignores left+right and falls back to its
     viewBox-ratio intrinsic width, so the arc must be sized to span the group directly */
  width: 84%;
  height: 0.5em;
  overflow: visible;
  pointer-events: none;
}
/* tie across a bar — SVG half-arc rising to the segment edge. Overflows its 1em note
   box toward the boundary so the start-half (right of the held note) and the end-half
   (left of the next note) line up over the bar line. */
.tie-arc {
  position: absolute;
  top: 0.02em;
  width: 1em;
  height: 0.5em;
  overflow: visible;
  pointer-events: none;
}
.tie-start-arc { left: 60%; }
.tie-end-arc { right: 60%; }
/* engraved slur/tie = a filled tapered shape (thin ends, thick middle), so the curve
   reads like real notation rather than a flat constant-width line. The path `d` is
   width-driven (B076) — see v-arc in the script. */
.slur-arc path,
.tie-arc path {
  fill: currentColor;
  stroke: none;
}
/* triplet: bracket + "3" above the group. The "3" is the reading cue a player scans for,
   so keep it clearly legible (พี่เปา): a larger, bold digit sitting on a thin bracket. The
   bracket keeps its slim 1px rules while the numeral itself is bumped up and weighted. */
.g-triplet::before {
  content: '3';
  position: absolute;
  top: -0.9em;
  left: 10%;
  right: 10%;
  font-size: 0.82em;
  font-weight: 700;
  text-align: center;
  border-top: 1px solid currentColor;
  border-left: 1px solid currentColor;
  border-right: 1px solid currentColor;
  height: 0.78em;
  line-height: 0.62em;
}
</style>
