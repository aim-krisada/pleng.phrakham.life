<script setup>
import { computed } from 'vue'
import { parseNotes, groupNotes } from '../lib/notation.js'

const props = defineProps({ notes: { type: String, default: '' } })
const groups = computed(() => groupNotes(parseNotes(props.notes)))
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
        :class="['nt', t.type === 'note' && t.dotted ? 'dotted' : '', t.tieStart ? 'tie-start' : '', t.tieEnd ? 'tie-end' : '']"
      >
        <template v-if="t.type === 'note'">
          <!-- octave dots stay centred on the DIGIT; the augmentation dot sits
               beside it (absolute) so it never pushes the octave dots off-centre -->
          <span class="dots-hi">{{ '•'.repeat(t.high) || ' ' }}</span>
          <span :class="['num', 'u' + t.underlines]">{{ t.accidental === '#' ? '♯' : t.accidental === 'b' ? '♭' : '' }}{{ t.pitch }}</span>
          <span class="dots-lo">{{ '•'.repeat(t.low) || ' ' }}</span>
          <span v-if="t.dotted" class="aug" aria-hidden="true">·</span>
        </template>
        <template v-else-if="t.type === 'ext'">
          <span class="dots-hi">&nbsp;</span>
          <span class="num">–</span>
          <span class="dots-lo">&nbsp;</span>
        </template>
        <template v-else>
          <span class="dots-hi">&nbsp;</span>
          <span class="num">{{ t.text }}</span>
          <span class="dots-lo">&nbsp;</span>
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
.dots-hi, .dots-lo {
  display: block;
  font-size: 0.55em;
  height: 1.1em;
  line-height: 1.1em;
  letter-spacing: -1px;
}
.num { display: block; padding: 0 1px; }
/* underlines stretch across the whole token so adjacent underlined notes join
   into one continuous line, the way the hymnbook beams eighth notes */
.num.u1, .num.u2 { align-self: stretch; text-align: center; }
.num.u1 { border-bottom: 1.5px solid currentColor; }
.num.u2 { border-bottom: 4px double currentColor; }
/* augmentation dot: mid-height, just right of the digit (never above/below it) */
.aug {
  position: absolute;
  right: -0.4em;
  top: 50%;
  transform: translateY(-58%);
  font-size: 1em;
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
