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

// Group each line into bar-units so the line can WRAP at bar boundaries (no
// horizontal scroll) instead of overflowing — a bar never splits across rows.
// Segments carry si (index within the line) for playback highlight + auto-scroll.
const renderLines = computed(() =>
  (props.content.lines || []).map((line) => {
    const parts = []
    let si = -1
    let bar = null
    const flush = () => {
      if (bar && bar.segments.length) parts.push(bar)
      bar = null
    }
    for (const item of line) {
      if (item.type === 'segment') {
        si++
        if (!bar) bar = { type: 'bar', barLine: false, segments: [] }
        bar.segments.push({ ...item, si })
      } else if (item.type === 'bar') {
        flush()
        bar = { type: 'bar', barLine: true, segments: [] }
      } else if (item.type === 'section') {
        flush()
        parts.push({ type: 'section', name: item.name })
      } else if (item.type === 'end') {
        flush()
        parts.push({ type: 'end' })
      } else if (item.type === 'repeat-start') {
        flush()
        parts.push({ type: 'repeat-start' })
      } else if (item.type === 'repeat-end') {
        flush()
        parts.push({ type: 'repeat-end' })
      } else if (item.type === 'volta') {
        flush()
        parts.push({ type: 'volta', num: item.num })
      } else if (item.type === 'marker') {
        flush()
        parts.push({ type: 'marker', label: item.label })
      } else if (item.type === 'label') {
        flush()
        parts.push({ type: 'label', text: item.text })
      }
    }
    flush()
    return parts
  }),
)

function isPlaying(li, si) {
  return props.playingSeg && props.playingSeg.li === li && props.playingSeg.si === si
}
</script>

<template>
  <div :class="mode === 'lyrics' ? 'sheet-mode-lyrics' : ''">
    <div v-for="(line, li) in renderLines" :key="li" class="song-line">
      <template v-for="(part, pi) in line" :key="pi">
        <span v-if="part.type === 'section'" class="section-label">♦ {{ part.name }}</span>
        <span v-else-if="part.type === 'marker'" class="section-marker">{{ part.label }}</span>
        <span v-else-if="part.type === 'label'" class="line-label">{{ part.text }}</span>
        <span v-else-if="part.type === 'end'" v-show="mode === 'full'" class="bar-line bar-final" aria-hidden="true"></span>
        <span v-else-if="part.type === 'repeat-start'" v-show="mode === 'full'" class="repeat-mark rep-start" aria-label="เริ่มเล่นซ้ำ"><i class="rep-bar" /><i class="rep-thin" /><i class="rep-dots" /></span>
        <span v-else-if="part.type === 'repeat-end'" v-show="mode === 'full'" class="repeat-mark rep-end" aria-label="วนกลับไปเล่นซ้ำ"><i class="rep-dots" /><i class="rep-thin" /><i class="rep-bar" /></span>
        <span v-else-if="part.type === 'volta'" v-show="mode === 'full'" class="volta-tag">{{ part.num }}.</span>
        <span v-else class="bar-group">
          <span v-if="part.barLine && mode === 'full'" class="bar-line" aria-hidden="true"></span>
          <span
            v-for="seg in part.segments"
            :key="seg.si"
            class="segment"
            :class="{ 'seg-playing': isPlaying(li, seg.si) }"
            :data-seg="`${li}-${seg.si}`"
          >
            <span v-if="mode === 'full'" class="chord">{{ chordText(seg.chord) }}&nbsp;</span>
            <span v-if="mode === 'full'" class="note"><NoteRow :notes="seg.note" />&nbsp;</span>
            <span class="lyric">{{ seg.lyric }}&nbsp;</span>
          </span>
        </span>
      </template>
    </div>
  </div>
</template>
