<script setup>
import { computed } from 'vue'
import { displayChord } from '../lib/chords.js'
import NoteRow from './NoteRow.vue'

const props = defineProps({
  content: { type: Object, required: true }, // { key, timeSignature, lines }
  mode: { type: String, default: 'full' }, // 'full' | 'lyrics' — coarse fallback (see layer flags)
  chordSystem: { type: String, default: 'letter' }, // 'letter' | 'roman'
  displayKey: { type: String, default: '' }, // transpose target; '' = original
  playingSeg: { type: Object, default: null }, // { li, si } currently sounding
  playingSyl: { type: Object, default: null }, // { li, si, syk } syllable+note sounding now (B006)
  interactive: { type: Boolean, default: false }, // tap a syllable/note to jump there (reader)
  songTitle: { type: String, default: '' }, // prints as the centered heading above the song
  // Independent layer flags (B024 "แสดงผล" menu). null = fall back to `mode` so every
  // existing caller (print · editor preview · plain viewer) keeps its behaviour untouched;
  // the sing dock passes explicit booleans to get the finer presets (เนื้อ+คอร์ด, โน้ตล้วน …).
  showChord: { type: Boolean, default: null },
  showNote: { type: Boolean, default: null },
  showLyric: { type: Boolean, default: null },
})
const emit = defineEmits(['seek'])

// Resolve each layer: an explicit flag wins; otherwise derive from the coarse `mode`
// (full = chord+note+lyric · lyrics = lyric only) — the pre-B024 contract.
const sc = computed(() => (props.showChord != null ? props.showChord : props.mode === 'full'))
const sn = computed(() => (props.showNote != null ? props.showNote : props.mode === 'full'))
const sl = computed(() => (props.showLyric != null ? props.showLyric : true))
// Lyrics-only layout (centered, roomier) kicks in when just the words show.
const lyricsOnly = computed(() => sl.value && !sn.value && !sc.value)

// The running FOOTER (site · page X of Y · date) is drawn as @page margin boxes by
// lib/printChrome.js (injected on print) so all three items share one size + baseline.
// This component only owns the sheet BODY + the printed title heading above it.

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

// Group consecutive lines into ท่อน (a new group starts at each section label) so a
// whole ท่อน can be kept together across page breaks when printing (US-B02: "ไม่ตัด
// กลางท่อน"). Keeps each line's original index (li) for playback highlight / data-seg.
const renderGroups = computed(() => {
  const groups = []
  let cur = null
  renderLines.value.forEach((parts, li) => {
    const startsSection = parts.length && parts[0].type === 'section'
    if (startsSection || !cur) {
      cur = { lines: [] }
      groups.push(cur)
    }
    cur.lines.push({ li, parts })
  })
  return groups
})

function isPlaying(li, si) {
  return props.playingSeg && props.playingSeg.li === li && props.playingSeg.si === si
}
// which note-slot in this segment is sounding now (for NoteRow), or -1
function activeNote(li, si) {
  const p = props.playingSyl
  return p && p.li === li && p.si === si && p.syk != null ? p.syk : -1
}
// per-syllable highlight (v2 only): the exact word sounding now
function isSyl(li, si, k) {
  const p = props.playingSyl
  return !!(p && p.li === li && p.si === si && p.syk === k)
}
// tap to jump: emit the address of the syllable/note tapped so the reader restarts
// playback there (US H1 "แตะ = กระโดด"). syk defaults to the segment's first slot.
function seek(li, si, syk = 0) {
  if (props.interactive) emit('seek', { li, si, syk })
}
</script>

<template>
  <div :class="lyricsOnly ? 'sheet-mode-lyrics' : ''">
    <!-- Printed title — centered, above the song, on paper only (on screen the shell
         bar / Studio heading already show it). Owned here so it prints from ANY mode
         that renders the sheet (ดู or แผ่น), which is why P'Aim's ดู-mode print had none. -->
    <h1 v-if="songTitle" class="sheet-print-title">{{ songTitle }}</h1>
    <div v-for="(grp, gi) in renderGroups" :key="gi" class="song-section">
    <div v-for="row in grp.lines" :key="row.li" class="song-line">
      <template v-for="(part, pi) in row.parts" :key="pi">
        <span v-if="part.type === 'section'" class="section-label">♦ {{ part.name }}</span>
        <span v-else-if="part.type === 'marker'" class="section-marker">{{ part.label }}</span>
        <span v-else-if="part.type === 'label'" class="line-label">{{ part.text }}</span>
        <span v-else-if="part.type === 'end'" v-show="sn" class="bar-line bar-final" aria-hidden="true"></span>
        <span v-else-if="part.type === 'repeat-start'" v-show="sn" class="repeat-mark rep-start" aria-label="เริ่มเล่นซ้ำ"><i class="rep-bar" /><i class="rep-thin" /><i class="rep-dots" /></span>
        <span v-else-if="part.type === 'repeat-end'" v-show="sn" class="repeat-mark rep-end" aria-label="วนกลับไปเล่นซ้ำ"><i class="rep-dots" /><i class="rep-thin" /><i class="rep-bar" /></span>
        <span v-else-if="part.type === 'volta'" v-show="sn" class="volta-tag">{{ part.num }}.</span>
        <span v-else class="bar-group">
          <span v-if="part.barLine && sn" class="bar-line" aria-hidden="true"></span>
          <span
            v-for="seg in part.segments"
            :key="seg.si"
            class="segment"
            :class="{ 'seg-playing': isPlaying(row.li, seg.si) && !seg.syllables, 'seg-tap': interactive }"
            :data-seg="`${row.li}-${seg.si}`"
            @click="seek(row.li, seg.si)"
          >
            <span v-if="sc" class="chord">{{ chordText(seg.chord) }}&nbsp;</span>
            <span v-if="sn" class="note"><NoteRow :notes="seg.note" :active="activeNote(row.li, seg.si)" />&nbsp;</span>
            <!-- v2: one span per syllable-bearing note -> highlight walks note by note
                 (B006). v1 (no syllables array): the whole lyric as before. -->
            <template v-if="sl">
              <span v-if="seg.syllables" class="lyric lyric-syl">
                <span
                  v-for="(w, k) in seg.syllables"
                  :key="k"
                  class="syl"
                  :class="{ 'syl-playing': isSyl(row.li, seg.si, k) }"
                  :data-syl="`${row.li}-${seg.si}-${k}`"
                  @click.stop="seek(row.li, seg.si, k)"
                >{{ w || ' ' }}</span>
              </span>
              <span v-else class="lyric">{{ seg.lyric }}&nbsp;</span>
            </template>
          </span>
        </span>
      </template>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* per-syllable lyric row (v2): spread the words across the segment the same way the
   note row spreads its digits, so each word sits under its note. */
.lyric-syl {
  display: flex;
  width: 100%;
  justify-content: space-around;
}
.syl {
  white-space: pre;
  border-radius: 4px;
  padding: 0 0.1em;
  transition: background-color 0.12s, color 0.12s;
}
/* the word sounding right now — the karaoke step (B006) */
.syl-playing {
  background: var(--brand, #8b4513);
  color: #fff;
  font-weight: 700;
}
/* reader tap targets: a light hover hint that a syllable/segment can be jumped to */
.seg-tap { cursor: pointer; }
@media (hover: hover) {
  .seg-tap:hover .syl { background: rgba(139, 69, 19, 0.08); }
  .seg-tap .syl:hover { background: rgba(139, 69, 19, 0.18); }
  .seg-tap .syl-playing:hover { background: var(--brand, #8b4513); }
}
/* The ท่อน wrapper is invisible to on-screen layout (display: contents) so nothing
   changes in the ดู view; only when printing does it become a block that must not be
   split across pages (US-B02: "ไม่ตัดกลางท่อน"). */
.song-section {
  display: contents;
}
@media print {
  .song-section {
    display: block;
    break-inside: avoid;
  }
}
/* Printed title heading — hidden on screen (the shell bar shows the title there),
   shown centered above the song on paper only. */
.sheet-print-title {
  display: none;
}
@media print {
  .sheet-print-title {
    display: block;
    text-align: center;
    font-size: 16pt;
    font-weight: 700;
    color: #000;
    margin: 0 0 6mm;
  }
}
</style>
