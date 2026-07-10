<script setup>
import { computed } from 'vue'
import { parseNotes, groupNotes } from '../lib/notation.js'

const props = defineProps({
  notes: { type: String, default: '' },
  // slot index (within this segment) of the note sounding now, or -1 for none. Counts
  // every rendered digit/dash left-to-right — the same slot midi.js puts on each attack
  // — so the played note lights up in step with its syllable (B006).
  active: { type: Number, default: -1 },
})
// flatten groups but stamp each rendered token with its running slot index so the
// template can match `active` without re-counting across the nested v-for.
const groups = computed(() => {
  const gs = groupNotes(parseNotes(props.notes))
  let idx = -1
  for (const g of gs) for (const t of g.tokens) t.idx = ++idx
  return gs
})
const ACC_GLYPH = { '#': '♯', b: '♭', n: '♮' }
</script>

<template>
  <span class="note-row">
    <span
      v-for="(g, gi) in groups"
      :key="gi"
      :class="['note-group', g.group ? 'g-' + g.group : '']"
    >
      <!-- slur (เอื้อน) = ONE continuous SVG arc over the whole group, at any length
           (B062). preserveAspectRatio=none stretches the curve to the group width while
           non-scaling-stroke keeps the line weight even — so it never breaks into pieces
           the way the old CSS pseudo-arc did once a group grew past a couple of notes. -->
      <svg v-if="g.group === 'slur'" class="slur-arc" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <!-- engraved slur: a FILLED lens (two Béziers) — tapered to fine points at the
             ends, thickest at the apex — the way a slur is drawn in real notation, not a
             uniform-width line. Endpoints sit low near the digits; apex arcs above. -->
        <path d="M5,33 C26,3 74,3 95,33 C74,17 26,17 5,33 Z" />
      </svg>
      <span
        v-for="(t, ti) in g.tokens"
        :key="ti"
        :class="['nt', t.type === 'note' && t.dots ? 'dotted' : '', t.type === 'note' && t.dots === 2 ? 'dbldot' : '', t.type === 'note' && t.accidental ? 'has-acc' : '', t.tieStart ? 'tie-start' : '', t.tieEnd ? 'tie-end' : '', t.idx === active ? 'nt-playing' : '']"
      >
        <!-- tie across a bar (B062): each side draws a smooth SVG half-arc that rises to
             the segment edge, so the two halves in adjacent segments meet over the bar
             line into one curve (replaces the old CSS border-radius hooks). -->
        <svg v-if="t.tieStart" class="tie-arc tie-start-arc" viewBox="0 0 10 40" preserveAspectRatio="none" aria-hidden="true">
          <!-- left half of an engraved tie: fine point at the held note, cut square at
               the bar edge (full thickness) so it butts the next segment's end-half -->
          <path d="M0,31 C3,9 7,5 10,5 L10,16 C7,18 3,26 0,31 Z" />
        </svg>
        <svg v-if="t.tieEnd" class="tie-arc tie-end-arc" viewBox="0 0 10 40" preserveAspectRatio="none" aria-hidden="true">
          <!-- right half: full thickness at the bar edge, tapering to a point at the note -->
          <path d="M10,31 C7,9 3,5 0,5 L0,16 C3,18 7,26 10,31 Z" />
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
  </span>
</template>

<style scoped>
.note-row { display: inline-flex; align-items: flex-start; }
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
/* slur (เอื้อน) — one SVG arc spanning the whole group, stretched to its width.
   vector-effect keeps the stroke even no matter how wide the group gets. */
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
   reads like real notation rather than a flat constant-width line */
.slur-arc path,
.tie-arc path {
  fill: currentColor;
  stroke: none;
}
/* triplet: bracket + "3" above the group */
.g-triplet::before {
  content: '3';
  position: absolute;
  top: -0.75em;
  left: 10%;
  right: 10%;
  font-size: 0.6em;
  text-align: center;
  border-top: 1px solid currentColor;
  border-left: 1px solid currentColor;
  border-right: 1px solid currentColor;
  height: 0.9em;
  line-height: 0.6em;
}
</style>
