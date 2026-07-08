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
      <span
        v-for="(t, ti) in g.tokens"
        :key="ti"
        :class="['nt', t.type === 'note' && t.dotted ? 'dotted' : '', t.type === 'note' && t.accidental ? 'has-acc' : '', t.tieStart ? 'tie-start' : '', t.tieEnd ? 'tie-end' : '', t.idx === active ? 'nt-playing' : '']"
      >
        <template v-if="t.type === 'note'">
          <!-- octave dots stay centred on the DIGIT; more than one dot stacks
               VERTICALLY (like the book) growing away from the digit. The
               augmentation dot sits beside it (absolute) so it never nudges them. -->
          <span v-if="t.fermata" class="fermata" aria-hidden="true"></span>
          <span class="dots-hi" aria-hidden="true"><span v-for="k in t.high" :key="k" class="odot"></span></span>
          <span :class="['num', 'u' + t.underlines]"><span v-if="t.accidental" class="acc">{{ ACC_GLYPH[t.accidental] }}</span>{{ t.pitch }}<span v-if="t.dotted" class="aug" aria-hidden="true">•</span></span>
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
/* tie across a bar: half-arc opening right (start) / closing from left (end) */
.nt.tie-start::after,
.nt.tie-end::before {
  content: '';
  position: absolute;
  top: 0.05em;
  width: 1em;
  height: 0.5em;
  border-top: 1.5px solid currentColor;
}
.nt.tie-start::after {
  left: 60%;
  border-top-left-radius: 100% 200%;
}
.nt.tie-end::before {
  right: 60%;
  border-top-right-radius: 100% 200%;
}
/* slur/tie arc above the group */
.g-slur::before {
  content: '';
  position: absolute;
  top: -0.05em;
  left: 12%;
  right: 12%;
  height: 0.45em;
  border-top: 1.5px solid currentColor;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
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
