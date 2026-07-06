<script setup>
import { displayChord } from '../lib/chords.js'
import NoteRow from './NoteRow.vue'

const props = defineProps({
  content: { type: Object, required: true }, // { key, timeSignature, lines }
  mode: { type: String, default: 'full' }, // 'full' | 'lyrics'
  chordSystem: { type: String, default: 'letter' }, // 'letter' | 'number'
  displayKey: { type: String, default: '' }, // transpose target; '' = original
})

function chordText(chord) {
  return displayChord(chord, {
    system: props.chordSystem,
    originalKey: props.content.key,
    displayKey: props.displayKey || props.content.key,
  })
}
</script>

<template>
  <div :class="mode === 'lyrics' ? 'sheet-mode-lyrics' : ''">
    <div v-for="(line, li) in content.lines" :key="li" class="song-line">
      <template v-for="(item, ii) in line" :key="ii">
        <span v-if="item.type === 'segment'" class="segment">
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
