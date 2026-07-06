<script setup>
import { computed } from 'vue'
import { displayChord } from '../lib/chords.js'
import NoteRow from './NoteRow.vue'

const props = defineProps({
  content: { type: Object, required: true }, // { key, timeSignature, lines }
  mode: { type: String, default: 'full' }, // 'full' | 'lyrics'
  chordSystem: { type: String, default: 'letter' }, // 'letter' | 'number'
  displayKey: { type: String, default: '' }, // transpose target; '' = original
  playingSeg: { type: Object, default: null }, // { li, si } currently sounding
})

function chordText(chord) {
  return displayChord(chord, {
    system: props.chordSystem,
    originalKey: props.content.key,
    displayKey: props.displayKey || props.content.key,
  })
}

// Tag each segment with its index within the line (counts every segment item, the
// same way midi.js songToNotes does) so playback highlight + auto-scroll can target it.
const renderLines = computed(() =>
  (props.content.lines || []).map((line) => {
    let si = -1
    return line.map((item) => (item.type === 'segment' ? { ...item, si: ++si } : item))
  }),
)

function isPlaying(li, si) {
  return props.playingSeg && props.playingSeg.li === li && props.playingSeg.si === si
}
</script>

<template>
  <div :class="mode === 'lyrics' ? 'sheet-mode-lyrics' : ''">
    <div v-for="(line, li) in renderLines" :key="li" class="song-line">
      <template v-for="(item, ii) in line" :key="ii">
        <span
          v-if="item.type === 'segment'"
          class="segment"
          :class="{ 'seg-playing': isPlaying(li, item.si) }"
          :data-seg="`${li}-${item.si}`"
        >
          <span v-if="mode === 'full'" class="chord">{{ chordText(item.chord) }}&nbsp;</span>
          <span v-if="mode === 'full'" class="note"><NoteRow :notes="item.note" />&nbsp;</span>
          <span class="lyric">{{ item.lyric }}&nbsp;</span>
        </span>
        <span v-else-if="item.type === 'bar' && mode === 'full'" class="bar-line" aria-hidden="true"></span>
        <span v-else-if="item.type === 'marker'" class="section-marker">{{ item.label }}</span>
        <span v-else-if="item.type === 'label'" class="line-label">{{ item.text }}</span>
      </template>
    </div>
  </div>
</template>
