<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { displayChord } from '../lib/chords.js'
import { parseNotes, beatCount, expectedBeats } from '../lib/notation.js'
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
  // Songbook layout (B059): print each melody (stanza) once. The first verse that uses a
  // stanza shows note+chord+lyric; later verses that reuse the same stanza show lyrics only
  // (verse number + words), like a printed hymn book. Off = every line keeps its own layers
  // (the ฝึกร้อง/sing view + editor preview never set this, so notes stay on every verse).
  songbook: { type: Boolean, default: false },
})
const emit = defineEmits(['seek'])

// Resolve each layer: an explicit flag wins; otherwise derive from the coarse `mode`
// (full = chord+note+lyric · lyrics = lyric only) — the pre-B024 contract.
const sc = computed(() => (props.showChord != null ? props.showChord : props.mode === 'full'))
const sn = computed(() => (props.showNote != null ? props.showNote : props.mode === 'full'))
const sl = computed(() => (props.showLyric != null ? props.showLyric : true))
// Lyrics-only layout (centered, roomier) kicks in when just the words show.
const lyricsOnly = computed(() => sl.value && !sn.value && !sc.value)

// Per-line layer gates. In songbook mode a line that reuses an already-printed stanza
// (resolveContent tags it `_stanzaFirst === false`) drops its note + chord rows and prints
// as lyrics only. Everywhere else the global layer flags apply to every line unchanged.
function noteOn(first) { return sn.value && (!props.songbook || first) }
function chordOn(first) { return sc.value && (!props.songbook || first) }
function lineLyricsOnly(first) { return sl.value && !noteOn(first) && !chordOn(first) }
// A reused verse's melody-only line (no words) prints as an empty gap — hide it, unless it
// carries a section heading. Only ever hides lines that are lyrics-only to begin with.
function isEmptyLyricLine(row) {
  return lineLyricsOnly(row.first) && !row.hasText && !(row.parts[0] && row.parts[0].type === 'section')
}

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
    // `_melodyFirst` is set by resolveContent (v2): false = this line repeats a melody (a
    // reused stanza, or the line just above it), so the songbook shows its words only. v1 /
    // undefined = treat as first so notes always show — only genuine repeats are collapsed.
    const first = line._melodyFirst !== false
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
        // B102 — `rubric` (e.g. "ร้องรับทุกข้อ") rides the section marker when the refrain
        // carries the strophic directive; shown once next to the label, refrain still once.
        parts.push({ type: 'section', name: item.name, rubric: item.rubric })
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
    // B082 — close the LAST bar of a line on its right when it holds a FULL measure. Mid-line
    // bars are already closed by the next bar's left bar-line; the final bar has no successor,
    // so without this it stayed open (some lines closed, some not — พี่เปา). A short final bar
    // — a pickup, or a measure whose beats complete only across the line break — is left open
    // so we never draw a barline through an incomplete measure. A line ending in a final/repeat
    // barline (Fine ‖ / :‖) isn't a plain bar here, so it's skipped (no double line).
    const tail = parts.length ? parts[parts.length - 1] : null
    if (tail && tail.type === 'bar' && tail.segments.length) {
      const exp = expectedBeats(props.content.timeSignature)
      const got = tail.segments.reduce((n, seg) => n + beatCount(parseNotes(seg.note || '')), 0)
      if (exp && Math.abs(got - exp) < 1e-9) tail.closeRight = true
    }
    // hasText = any real word on this line. A melody-only line (held notes / เอื้อน with
    // blank syllables) has none — in the songbook it prints as an empty gap, so we drop it
    // from reused (lyrics-only) verses. First-use lines keep it (they still show the notes).
    const hasText = parts.some(
      (p) => p.segments && p.segments.some((s) => (s.lyric || '').trim() || (s.syllables || []).some((w) => (w || '').trim())),
    )
    return { parts, first, hasText }
  }),
)

// Group consecutive lines into ท่อน (a new group starts at each section label) so a
// whole ท่อน can be kept together across page breaks when printing (US-B02: "ไม่ตัด
// กลางท่อน"). Keeps each line's original index (li) for playback highlight / data-seg.
const renderGroups = computed(() => {
  const groups = []
  let cur = null
  renderLines.value.forEach(({ parts, first, hasText }, li) => {
    const startsSection = parts.length && parts[0].type === 'section'
    if (startsSection || !cur) {
      cur = { lines: [] }
      groups.push(cur)
    }
    cur.lines.push({ li, parts, first, hasText })
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

// ---- B069: cross-bar ties as ONE continuous line-level arc -------------------
// A tie that crosses a bar line (the receiving note is the first note of a new
// segment, e.g. "1 - - -" | "~1") is drawn by NoteRow as a lone end-half that butts
// the bar line, leaving a gap over the rule. Here we redraw those ties as a single
// SVG path spanning from the source digit to the tie-end digit, arcing over the bar.
// We MEASURE the rendered note positions (they depend on width/wrap/font-scale) and
// re-measure on resize + print + content change. NoteRow is untouched; its end-half
// for these first-of-segment ties is hidden via CSS below (within-segment ties keep it).
const rootEl = ref(null)
// Per-LINE arc sets, keyed by the line index (data-li). Each line owns its own small SVG
// overlay so the arcs paginate with their line when printing — a single sheet-wide absolute
// SVG would only paint on the first page. { [li]: { paths: [{d,key}], w, h } }.
const lineArcs = ref({})

// One engraved tie: a filled lens (thin points at each note, thickest at the apex),
// bowing above the digits — same look as NoteRow's arcs, drawn at line scale.
function buildArc(x1, x2, yTop, h) {
  const span = Math.max(x2 - x1, 6)
  const y = yTop + h * 0.14 // just above the digit, in the octave-dot band
  const rise = Math.min(Math.max(span * 0.12, h * 0.16), h * 0.42)
  const th = Math.max(h * 0.06, 1.1) // apex thickness
  const cx1 = x1 + span * 0.24
  const cx2 = x2 - span * 0.24
  const top = y - rise
  const r = (n) => n.toFixed(1)
  const d =
    `M${r(x1)},${r(y)} C${r(cx1)},${r(top)} ${r(cx2)},${r(top)} ${r(x2)},${r(y)}` +
    ` C${r(cx2)},${r(top + th)} ${r(cx1)},${r(top + th)} ${r(x1)},${r(y)} Z`
  return { d, key: `${x1.toFixed(0)}_${x2.toFixed(0)}_${yTop.toFixed(0)}` }
}

// NoteRow half-arcs we've hidden because the overlay replaces them — restored before every
// re-measure so hide/draw never drift apart (a half only stays hidden while its overlay
// arc is actually drawn; a wrapped tie we skip keeps both NoteRow halves as a fallback).
let hiddenHalves = []
function restoreHalves() {
  for (const el of hiddenHalves) el.style.display = ''
  hiddenHalves = []
}
function hideHalf(el) {
  if (el) { el.style.display = 'none'; hiddenHalves.push(el) }
}

function measureTies() {
  const root = rootEl.value
  restoreHalves()
  if (!root) { lineArcs.value = {}; return }
  if (!root.getBoundingClientRect().width) { lineArcs.value = {}; return } // no layout (unit tests / hidden)
  const byLine = {}
  root.querySelectorAll('.song-line').forEach((lineEl) => {
    const li = lineEl.dataset.li
    // measure relative to THIS line so the arcs live in the line's own SVG (prints per page)
    const lr = lineEl.getBoundingClientRect()
    const nts = Array.from(lineEl.querySelectorAll('.note-row .nt'))
    const arcs = []
    nts.forEach((nt, i) => {
      if (!nt.classList.contains('tie-end')) return
      const prev = nts[i - 1]
      if (!prev) return
      // B099: draw EVERY tie as one overlay arc — cross-bar AND within-segment. A
      // within-segment tie (both notes in the same NoteRow) used to be left to NoteRow's
      // two half-arcs, but with no bar line between the notes those opposing halves overlap
      // and cross into a bowtie (พี่เอม 12 ก.ค.). The overlay spans source→receiver as a
      // single lens, so it repairs both cases the same way.
      const srcSeg = prev.closest('.segment')
      const sameSeg = srcSeg === nt.closest('.segment')
      const a = prev.getBoundingClientRect()
      const b = nt.getBoundingClientRect()
      if (!b.width) return
      const h = Math.max(a.height, b.height)
      // the bar-group wrapped and the two notes fell onto different visual rows —
      // an arc between them would slash across the line, so skip (rare on A4 print)
      if (Math.abs(a.top - b.top) > h * 0.6) return
      const x1 = a.left + a.width / 2 - lr.left
      const x2 = b.left + b.width / 2 - lr.left
      if (x2 - x1 < 2) return // receiver left of / on top of source (wrapped) — no arc
      const yTop = Math.min(a.top, b.top) - lr.top
      arcs.push(buildArc(x1, x2, yTop, h))
      // hide the two NoteRow halves this overlay arc replaces: the receiver's end-half AND
      // the source's start-half. Cross-bar: the source's start-arc may sit on ANY note of
      // its segment (e.g. "5~ - - -" marks the FIRST note, then holds) — a position-based CSS
      // selector missed that, leaving a stray hook (B069/พี่เปา), so hide by segment. Within
      // a segment (B099) the source IS `prev`, so hide its own start-arc precisely — avoids
      // grabbing an unrelated earlier tie-start in the same segment.
      hideHalf(nt.querySelector('.tie-end-arc'))
      hideHalf((sameSeg ? prev : srcSeg) && (sameSeg ? prev : srcSeg).querySelector('.tie-start-arc'))
    })
    if (arcs.length) byLine[li] = { paths: arcs, w: lr.width, h: lr.height }
  })
  lineArcs.value = byLine
}

// Debounce with a short timer (fires reliably in every context, unlike rAF which is
// paused in non-painting/headless tabs) — coalesces resize/print storms into one measure
// after layout settles.
let timer = 0
function scheduleMeasure() {
  clearTimeout(timer)
  timer = setTimeout(measureTies, 16)
}

let ro = null
onMounted(() => {
  nextTick(scheduleMeasure)
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    ro = new ResizeObserver(scheduleMeasure)
    ro.observe(rootEl.value)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('beforeprint', measureTies)
  }
})
onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleMeasure)
    window.removeEventListener('beforeprint', measureTies)
  }
  clearTimeout(timer)
  restoreHalves()
})
// Layer/content/transpose changes re-flow the notes → re-measure after the DOM settles.
watch(
  () => [props.content, sc.value, sn.value, props.songbook, props.displayKey, props.mode],
  () => nextTick(scheduleMeasure),
  { deep: true },
)
</script>

<template>
  <div ref="rootEl" class="sheet-root" :class="[lyricsOnly ? 'sheet-mode-lyrics' : '', sn && !sc ? 'sheet-no-chord' : '']">
    <!-- Printed title — centered, above the song, on paper only (on screen the shell
         bar / Studio heading already show it). Owned here so it prints from ANY mode
         that renders the sheet (ดู or แผ่น), which is why P'Aim's ดู-mode print had none. -->
    <h1 v-if="songTitle" class="sheet-print-title">{{ songTitle }}</h1>
    <div v-for="(grp, gi) in renderGroups" :key="gi" class="song-section">
    <div v-for="row in grp.lines" :key="row.li" v-show="!isEmptyLyricLine(row)" :data-li="row.li" class="song-line" :class="{ 'song-line-lyrics': lineLyricsOnly(row.first) }">
      <!-- B069: cross-bar ties as ONE continuous arc, drawn in this line's own overlay so
           NoteRow's per-segment halves (hidden in JS) are replaced by a curve that spans the
           bar line. Per-line (not sheet-wide) so it prints on whatever page the line lands. -->
      <svg
        v-if="lineArcs[row.li]"
        class="tie-overlay"
        :viewBox="`0 0 ${lineArcs[row.li].w} ${lineArcs[row.li].h}`"
        :width="lineArcs[row.li].w"
        :height="lineArcs[row.li].h"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path v-for="a in lineArcs[row.li].paths" :key="a.key" :d="a.d" />
      </svg>
      <template v-for="(part, pi) in row.parts" :key="pi">
        <span v-if="part.type === 'section'" class="section-label">♦ {{ part.name }}<span v-if="part.rubric" class="section-rubric">({{ part.rubric }})</span></span>
        <span v-else-if="part.type === 'marker'" class="section-marker">{{ part.label }}</span>
        <span v-else-if="part.type === 'label'" class="line-label">{{ part.text }}</span>
        <span v-else-if="part.type === 'end'" v-show="noteOn(row.first)" class="bar-final" aria-hidden="true"><i class="bf-thin" /><i class="bf-thick" /></span>
        <span v-else-if="part.type === 'repeat-start'" v-show="noteOn(row.first)" class="repeat-mark rep-start" aria-label="เริ่มเล่นซ้ำ"><i class="rep-bar" /><i class="rep-thin" /><i class="rep-dots" /></span>
        <span v-else-if="part.type === 'repeat-end'" v-show="noteOn(row.first)" class="repeat-mark rep-end" aria-label="วนกลับไปเล่นซ้ำ"><i class="rep-dots" /><i class="rep-thin" /><i class="rep-bar" /></span>
        <span v-else-if="part.type === 'volta'" v-show="noteOn(row.first)" class="volta-tag">{{ part.num }}.</span>
        <span v-else class="bar-group">
          <span v-if="part.barLine && noteOn(row.first)" class="bar-line" aria-hidden="true"></span>
          <span
            v-for="seg in part.segments"
            :key="seg.si"
            class="segment"
            :class="{ 'seg-playing': isPlaying(row.li, seg.si) && !seg.syllables, 'seg-tap': interactive }"
            :data-seg="`${row.li}-${seg.si}`"
            @click="seek(row.li, seg.si)"
          >
            <span v-if="chordOn(row.first)" class="chord">{{ chordText(seg.chord) }}&nbsp;</span>
            <span v-if="noteOn(row.first)" class="note"><NoteRow :notes="seg.note" :active="activeNote(row.li, seg.si)" />&nbsp;</span>
            <!-- v2: one span per syllable-bearing note -> highlight walks note by note
                 (B006). v1 (no syllables array): the whole lyric as before. -->
            <template v-if="sl">
              <!-- syllable spans spread under the notes (karaoke alignment). A songbook
                   reused-verse line has no notes, so fall back to the joined lyric text —
                   words keep their spaces and read as a plain hymn-book verse. -->
              <span v-if="seg.syllables && !lineLyricsOnly(row.first)" class="lyric lyric-syl">
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
          <!-- B082: close the last bar of the line (only when it is a full measure). -->
          <span v-if="part.closeRight && noteOn(row.first)" class="bar-line bar-close" aria-hidden="true"></span>
        </span>
      </template>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* B044 — tighten the note↔lyric vertical gap so a note and its word read as ONE block,
   and widen the gap BETWEEN line-blocks so verses/phrases separate clearly (P'Aim, real
   image). Applies wherever the sheet renders — print sheet, sing view, AND the editor
   preview that reuses this render — so all three match.
   • in-block: the .note block carried the parent line-height around its inline note-row +
     trailing space, floating the lyric ~31px below the digits. line-height:0 collapses the
     block to exactly the note-row height, so the word sits right under the note (~7px, just
     the reserved low-octave-dot band). NoteRow keeps its own internal line-height. */
.sheet-root .segment .note { line-height: 0; }
/* • between-block: lift note-bearing lines apart (songbook lyrics-only lines keep their own
     tight 2px spacing below, so they are excluded). */
.sheet-root .song-line:not(.song-line-lyrics) { margin-bottom: 16px; }
/* B069 — cross-bar tie overlay. One small SVG per line, absolutely positioned over that
   line so its arcs can span across bar lines / segments; it never affects layout
   (pointer-events: none) so measuring it can't feed back into a resize loop. The line is
   the offset parent, so a printed page break carries each line's arcs with it. Coloured
   with the note token. */
.song-line { position: relative; }
.tie-overlay {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 1;
}
.tie-overlay path {
  fill: var(--note-blue);
  stroke: none;
}
/* NoteRow's own start/end half-arcs for a cross-bar tie are hidden in JS (measureTies),
   in lockstep with the overlay arc that replaces them — a position-based CSS selector
   missed source hooks that sit on the FIRST note of a held segment ("5~ - - -"), leaving a
   stray half (B069/พี่เปา). Doing it in JS also keeps hide + draw in sync so a wrapped tie
   we skip falls back to NoteRow's two halves instead of showing a lone one. */
/* Songbook reused-verse lines have no notes, so the note-row spacing (margin-bottom 20px)
   leaves them floating far apart. Pull them into a tight lyric block, like a hymn book. */
.song-line-lyrics {
  margin-bottom: 2px;
  padding-bottom: 0;
  line-height: 1.35;
}
.song-line-lyrics .lyric {
  font-size: 1em;
  line-height: 1.35;
}
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
/* B090 — end-of-song final barline ‖ = a THIN stroke + a THICK stroke (music standard).
   The shared .bar-final (styles.css) drew this as border-left+border-right on one 5px box,
   which read as a single line (พี่เปา). Render it instead as two bars — like .repeat-mark —
   and override the shared border/width here (SongSheet-only change). Height + top offset
   match the normal .bar-line so it sits on the same baseline; the .sheet-no-chord rule below
   still zeroes the offset when the chord row is hidden (it targets .bar-final too). */
.bar-final {
  display: inline-flex;
  align-items: stretch;
  gap: 2px;
  width: auto;
  height: 3.25em;
  margin: 1em 0.6em 0;
  border: none;
  vertical-align: top;
}
.bar-final .bf-thin { width: 2px; background: #8a7a62; }
.bar-final .bf-thick { width: 4px; background: #8a7a62; }
/* B065 — with a chord row above, the barline/repeat marks carry margin-top:1em to drop
   past that row onto the note line. When the chord layer is hidden (เนื้อ+โน้ต / โน้ตล้วน)
   there is no chord row, so that 1em pushed the barline BELOW the notes and the digits
   spilled above it. Remove the top offset so the barline starts at the note row instead. */
.sheet-no-chord :deep(.bar-line),
.sheet-no-chord :deep(.bar-final),
.sheet-no-chord :deep(.repeat-mark) {
  margin-top: 0;
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
