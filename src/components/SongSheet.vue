<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { displayChord, transposeKey } from '../lib/chords.js'
import { parseNotes, beatCount, expectedBeats, slurSpans, segmentBeamLink, syllableSlots } from '../lib/notation.js'
import { buildArc, planArcs, makeHalfHider } from '../lib/slurArcs.js'
import { pixelRatio, levelTop, lineThickness } from '../lib/pixelSnap.js'
import { phraseBreaks, songBreathBeats, wordEnds } from '../lib/lyricPhrase.js'
import { lyricLineSplits } from '../lib/lyricLineSplit.js'
import { fitScale } from '../lib/fitLine.js'
import { bookRefsCodeText } from '../lib/bookCodes.js'
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
  // ใบ v3/pleng#100 — เนื้อล้วน written "ติดกันเป็นวรรค" (songbook style) instead of one space per syllable
  lyricJoin: { type: Boolean, default: false },
  // ใบ v3/pleng#105 — this song's phrases as the PRINTED book drew them (lib/bookPhrases.js).
  // null = none asked for / none known, and the breaks come off the tune exactly as before.
  bookPhrases: { type: Object, default: null },
  // Songbook layout (B059): print each melody (stanza) once. The first verse that uses a
  // stanza shows note+chord+lyric; later verses that reuse the same stanza show lyrics only
  // (verse number + words), like a printed hymn book. Off = every line keeps its own layers
  // (the ฝึกร้อง/sing view + editor preview never set this, so notes stay on every verse).
  songbook: { type: Boolean, default: false },
  // ใบ v3/pleng#123 — แผ่นเพลง states the song's key and meter once at the very top, before the first
  // note, like any printed score. Off by default so ฝึกร้อง and the editor preview stay as they are.
  songHead: { type: Boolean, default: false },
  // ใบ v3/pleng#128 — the song's cross-references to other books, shown next to key + meter in the
  // head (so they print). SHORT form here ("ล.305 · ย.274") — พี่เปา asked for the abbreviations on
  // paper, while the catalog card and ฝึกร้อง keep the long reading form ("เล่มเล็ก 305").
  // The caller passes them because this component takes `content`, not the whole song row, and an
  // imported song keeps its refs in a column outside content (see lib/bookCodes songBookRefs).
  bookRefs: { type: Array, default: () => [] },
  // ใบ v3/pleng#132 — พี่เปา: "ขอให้หน้าแผ่นเพลงทำให้ซ้าย-ขวาขยายเต็ม A4 สวยๆ … ตามบรรทัดที่ที่เราใส่ไว้".
  // ONE entered line = ONE printed row, filling the page: the bars of a line spread to both
  // margins, and a line too long to fit is scaled down rather than spilling onto a second row.
  // แผ่นเพลง only — ฝึกร้อง and the editor preview read on screen and keep their free wrapping.
  fitLines: { type: Boolean, default: false },
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
// each sheet line's syllable-bearing segments, as phraseBreaks takes them
const phraseLines = computed(() => renderLines.value.map(({ parts }) => {
  const segs = []
  for (const p of parts) for (const seg of p.segments || []) if (Array.isArray(seg.syllables)) segs.push({ si: seg.si, note: seg.note, syllables: seg.syllables })
  return segs
}))
// "long" is measured against this song's own syllables
const breathBeats = computed(() => songBreathBeats(phraseLines.value))
// ใบ#100 — per line, the syllables a space follows when เนื้อล้วน is written joined (lib/lyricPhrase.js):
// where the tune breathes, never inside a word. Split mode = a space after every syllable, as before.
const joinBreaks = computed(() => {
  const out = {}
  if (!props.lyricJoin) return out
  phraseLines.value.forEach((segs, li) => { out[li] = phraseBreaks(segs, { breathBeats: breathBeats.value, book: props.bookPhrases }) })
  return out
})
// ใบ v3/pleng#116 — เนื้อล้วน only: a sheet line clearly longer than the song's normal line (เพลง 627: 8 bars among
// 4-bar lines) is written as two lyric lines, cut where the วรรค the reader sees ends on a bar line
// (lib/lyricLineSplit.js). li → Set of si: a new lyric line starts at the bar that opens with segment si.
// Only when the WHOLE sheet is words alone — a notation sheet (and its songbook verses below the notes) keeps
// its lines exactly as typed. แยกพยางค์ has a space after every syllable, so it cuts at the tune's วรรค.
const lineCuts = computed(() => {
  if (!lyricsOnly.value) return {}
  const breaks = props.lyricJoin
    ? joinBreaks.value
    : phraseLines.value.map((segs) => phraseBreaks(segs, { breathBeats: breathBeats.value }))
  return lyricLineSplits(props.content.lines || [], { timeSignature: props.content.timeSignature, breaks })
})
function cutBefore(li, part) {
  const c = lineCuts.value[li]
  return !!(c && part.type === 'bar' && part.segments.length && c.has(part.segments[0].si))
}
function spaceAfter(li, si, k) {
  if (!props.lyricJoin) return true
  const b = joinBreaks.value[li]
  return !!(b && b.has(`${si}-${k}`))
}
// ใบ v3/pleng#104 — a วรรค must never be torn in half by the wrap. The syllables of one วรรค are separate
// <span>s with nothing between them, and the browser's Thai word breaker happily wraps between any two of
// them, so half a วรรค ended up on the next row (พี่เอม 11 ต.ค. 2569: "ถ้าตกบรรทัดใหม่ ให้ไปทั้งวรรค").
// WORD JOINER (U+2060) is Unicode's own "do not break here": zero width, invisible, no glyph, so it adds
// NOTHING to the printed line — the sheet keeps exactly the same words in exactly the same boxes, which is
// why the printed page count cannot grow (ใบ#101).
//
// ใบ v3/pleng#110 — but a วรรค WIDER than the whole line then had nowhere to wrap, and the old last resort
// (overflow-wrap: anywhere) cut it at any letter: "ประจัก|ษ์", "ทั้งม|วล", "ครบถ้ว|น" (เพลง 141 on a phone).
// Now each วรรค is its own box (.phrase, an inline-block no wider than the line):
//   * a วรรค that fits the line is ONE box, so it moves to the next line whole (ใบ#104 unchanged);
//   * a วรรค that does not fit wraps INSIDE its box, and only where one word ends and the next begins
//     (an invisible <wbr> there, from the browser's own Thai word breaker — lyricPhrase.wordEnds);
//   * the joints inside a word keep the WORD JOINER, and a syllable itself never wraps (white-space: nowrap),
//     so the browser has no other place to cut.
// The spaces at the วรรค ends are still the only real spaces (where they go is ใบ#100/#105, not this).
const WORD_JOINER = '\u2060'
// li → { pi → the words of the run of bars that starts at part pi | null for the later bars of that run }.
// A run = { pieces: [{ items: [{ key, si, k, w, glue: 'wj'|'wbr'|'' }], space }, …] } — one piece per วรรค;
// a v1 segment (no syllable array) is a piece of its own: { v1: true, seg }.
const joinRuns = computed(() => {
  const out = {}
  if (!props.lyricJoin) return out
  renderLines.value.forEach(({ parts }, li) => {
    const segs = []
    for (const p of parts) for (const seg of p.segments || []) if (Array.isArray(seg.syllables)) segs.push(seg)
    const ends = wordEnds(segs) // null = no word breaker in this browser: leave the joints to the browser
    let lastKey = ''
    for (const s of segs) s.syllables.forEach((w, k) => { if (w) lastKey = `${s.si}-${k}` })
    const runs = {}
    let run = null
    let phrase = null
    parts.forEach((part, pi) => {
      if (part.type !== 'bar') { run = null; phrase = null; return } // a marker / label closes the run
      if (cutBefore(li, part)) { run = null; phrase = null } // ใบ#116 — a new lyric line starts here
      if (run) runs[pi] = null
      else { run = { pieces: [] }; runs[pi] = run }
      for (const seg of part.segments) {
        if (!Array.isArray(seg.syllables)) { phrase = null; run.pieces.push({ v1: true, seg }); continue }
        seg.syllables.forEach((w, k) => {
          if (!phrase) { phrase = { items: [], space: false }; run.pieces.push(phrase) }
          const key = `${seg.si}-${k}`
          const item = { key, si: seg.si, k, w, glue: '' }
          // a slot that holds several words with spaces ("(เปลี่ยนเป็นคีย์ A Major)") may still wrap at its own
          // spaces — only the words themselves are kept whole
          if (/\S\s+\S/.test(w)) item.parts = w.split(/(\s+)/)
          phrase.items.push(item)
          if (!w) return // an empty slot (เอื้อน) stays a span with nothing in it, as before
          if (spaceAfter(li, seg.si, k)) { phrase.space = true; phrase = null; return }
          if (key === lastKey || !ends) return
          item.glue = ends.has(key) ? 'wbr' : 'wj'
        })
      }
    })
    out[li] = runs
  })
  return out
})
function joinRun(li, pi) {
  const r = joinRuns.value[li]
  return r ? r[pi] : null
}
// ใบ v3/pleng#107 — the joiner is for the screen only. A reader who copies the words and pastes them into a
// chat or a document must get plain Thai: left in, the invisible marks ride along, and searching that pasted
// text for a word that spans one of them finds nothing. So whenever a selection touches this sheet, the copy
// carries the same text with every joiner taken out (plain text only — the sheet's own boxes, hidden rows
// and drawn arcs are not something to paste anyway). Find-in-page needs nothing: the browser already looks
// straight past a joiner when it matches. (ใบ#110's word-end wrap points are <wbr> elements, not characters,
// so they never reach the clipboard and need no cleaning.)
function stripJoiners(s) { return s.split(WORD_JOINER).join('') }
function onCopy(e) {
  if (e.defaultPrevented || !e.clipboardData || !rootEl.value) return // another sheet on the page already did it
  const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null
  if (!sel || sel.isCollapsed) return
  let touches = false
  for (let i = 0; i < sel.rangeCount; i++) if (sel.getRangeAt(i).intersectsNode(rootEl.value)) touches = true
  if (!touches) return // a copy somewhere else on the page is none of this sheet's business
  const text = sel.toString()
  if (!text.includes(WORD_JOINER)) return // nothing to clean: let the browser copy as it always has
  e.clipboardData.setData('text/plain', stripJoiners(text))
  e.preventDefault()
}
// A reused verse's melody-only line (no words) prints as an empty gap — hide it, unless it
// carries a section heading. Only ever hides lines that are lyrics-only to begin with.
function isEmptyLyricLine(row) {
  return lineLyricsOnly(row.first) && !row.hasText && !(row.parts[0] && row.parts[0].type === 'section')
}

// The running FOOTER (site · page X of Y · date) is drawn as @page margin boxes by
// lib/printChrome.js (injected on print) so all three items share one size + baseline.
// This component only owns the sheet BODY + the printed title heading above it.

// ใบ v3/pleng#123 — the key and meter the song OPENS in (the first line's own, when its ท่อน sets one —
// ใบ#95/#96 — else the song's). The key follows the key the sheet is shown in (displayKey), exactly
// like the chords, so a sheet printed in D says คีย์ D. The notes themselves never change (โด = the key).
const songKeyOf = () => props.content.key
const shownKey = (k) => transposeKey(k, songKeyOf(), props.displayKey || songKeyOf())
const openKey = computed(() => {
  const first = (props.content.lines || [])[0]
  return (first && first._key) || songKeyOf() || ''
})
const openMeter = computed(() => {
  const first = (props.content.lines || [])[0]
  return (first && first._ts) || props.content.timeSignature || ''
})
const head = computed(() => ({
  key: openKey.value ? shownKey(openKey.value) : '',
  meter: openMeter.value,
  refs: bookRefsCodeText(props.bookRefs),
}))
// Any head item at all — a song with no key, meter or refs must print exactly as it did before
// (no empty line, no gap), which is why the <p> and the title's `has-head` both hang off this.
const hasHead = computed(() => !!(head.value.key || head.value.meter || head.value.refs))

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
  (props.content.lines || []).map((line, li) => {
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
        // ใบ#96 — `meter` rides it where the melody's meter changes (the book prints 4/4 before รับ)
        // ใบ#123 — `key` rides it where a ท่อน's key changes (ใบ#95). The very first heading drops a key or
        // meter the head at the top already states, so the opening is never said twice.
        const opening = props.songHead && li === 0
        parts.push({
          type: 'section',
          name: item.name,
          rubric: item.rubric,
          key: item.key && !(opening && item.key === openKey.value) ? shownKey(item.key) : '',
          meter: item.meter && !(opening && item.meter === openMeter.value) ? item.meter : '',
        })
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
      const exp = expectedBeats(line._ts || props.content.timeSignature) // ใบ#96 — this line's own meter
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

// ใบ v3/pleng#131 (2) — พี่เปา 22 ต.ค. 2569: "บรรทัดที่ 7 ตัวอักษรทำแยกให้ตรงกับโน้ตในบรรทัดที่ 6 ด้วยได้มั้ย".
// A line sung to the same tune as the line just above it (resolveContent's `_sameTuneAbove`, rule (b))
// printed as one run of text under the music, so the reader could not tell which word goes on which note.
// Now its words are a second row of syllables INSIDE the line above — one more row under that line's
// words, slot for slot, the way a hymn book stacks verses under one melody.
// Slot for slot, not segment for segment: the two lines may split their chords differently, and the
// melody signature ignores chords. Same notes means the same number of syllable slots, so each slot of
// the stacked line maps to the host's slot at the same position. If the counts differ (a silent pickup
// the signature drops), or a bar of the line is not plain notes, it keeps the old paragraph — never
// words under the wrong notes. Only while the notes AND the words are shown: without notes there is
// nothing to stack under.
// ใบ v3/pleng#139 — พี่เอม 25 ต.ค. 2569 ("do as her request"), the rest of what พี่เปา was offered in ใบ#131:
// a WHOLE ท่อน sung again to a melody already printed (rule (a): ร้อง 2, ร้อง 3, รับ 2 …) also stacks its
// words under that melody's notes, line by line, the way a hymn book prints every verse under one tune —
// instead of a paragraph of text below the music. Each of its lines goes under the line that printed the
// same melody line (`_stanzaLine`), or under that line's own host when it was itself stacked (rule (b)).
// The same guards as rule (b): slot counts must match, and a ท่อน in another key or meter keeps its
// paragraph (its chords or bars would not be the host's). Only while the words are written แยกพยางค์.
// A ท่อน sung again WORD FOR WORD (a second รับ 1) adds nothing under the notes, so it shrinks to its
// heading with "(ร้องซ้ำ)". Where a host carries rows from more than one ท่อน, each ท่อน's first row
// is named at the start of the row (`label`) so the reader knows which words belong together.
// host li → [{ li, slots: { 'si-k': { si, k, w } }, label }], the set of lines drawn inside a host (or
// folded into a "(ร้องซ้ำ)" heading), host li → its own row's name, and the heading-only lines.
const stacks = computed(() => {
  const under = {}
  const stacked = new Set()
  const hostLabel = {}
  const heads = new Set()
  if (!props.songbook || !sn.value || !sl.value) return { under, stacked, hostLabel, heads }
  const lines = props.content.lines || []
  const rows = renderLines.value
  // A ท่อน heading, a closing bar or a repeat sign on the stacked line belongs to the melody the host already
  // prints (the heading becomes the row's name), so only its bars count. And slots are counted by the NOTE
  // boxes, not by the words typed: one verse may leave the last held box of a line empty and the next fill it
  // (song 77: ร้อง 1 has 2 words on its closing "~1 - - 0", ร้อง 2 and 3 have 3). ใบ#131 counted words, so
  // such a line kept its paragraph (เล่มใหญ่ 736) — and every later verse of that line with it. The same tune
  // has the same note boxes, so counting boxes never pairs a word with the wrong note; a pickup the melody
  // signature ignores still changes the box count, and that line still keeps its paragraph.
  const slotCount = (seg) => syllableSlots(seg.note || '')
  const slotsOf = (row) => {
    const out = []
    for (const p of row.parts) {
      if (p.type !== 'bar') { if (!p.segments) continue; return null }
      for (const seg of p.segments) {
        if (!Array.isArray(seg.syllables)) return null
        for (let k = 0; k < slotCount(seg); k++) out.push({ si: seg.si, k, w: seg.syllables[k] || '' })
      }
    }
    return out
  }
  const hostKeys = (h) => {
    const hs = []
    for (const p of rows[h].parts) for (const seg of p.segments || []) for (let k = 0; k < slotCount(seg); k++) hs.push(`${seg.si}-${k}`)
    return hs
  }
  // each ท่อน (arrangement entry): its name, its melody, its words — to spot one sung again word for word
  const entryName = {}
  const entryWords = {}
  lines.forEach((l) => {
    const ei = l._entryIndex
    if (ei == null) return
    const sec = l.find((x) => x && x.type === 'section')
    if (sec && !(ei in entryName)) entryName[ei] = sec.name
    entryWords[ei] = (entryWords[ei] || '') + '|' + l.filter((x) => x.type === 'segment').map((x) => (x.syllables || []).join(' ')).join(' ')
  })
  const repeatOf = {}
  lines.forEach((l) => {
    const ei = l._entryIndex
    if (ei == null || ei in repeatOf) return
    repeatOf[ei] = null
    for (let e = 0; e < ei; e++) {
      const first = lines.find((x) => x._entryIndex === e)
      if (first && first._stanza === l._stanza && entryWords[e] === entryWords[ei] && entryWords[ei].trim().replace(/\|/g, '')) { repeatOf[ei] = e; break }
    }
  })
  const firstSung = {} // 'stanza:line' → li of the first time that melody line is sung
  const hostOf = {} // li → the li whose notes its words sit under (itself for a line that prints notes)
  let run = -1 // the host rule (b) stacks under: the last line that printed notes, while lines keep repeating it
  const stack = (host, li, row) => {
    const hs = hostKeys(host)
    const ms = slotsOf(row)
    if (!ms || ms.length !== hs.length) return false
    const slots = {}
    hs.forEach((key, i) => { slots[key] = ms[i] })
    ;(under[host] ||= []).push({ li, slots, label: '' })
    stacked.add(li)
    hostOf[li] = host
    return true
  }
  rows.forEach((row, li) => {
    const l = lines[li]
    const key = `${l._stanza}:${l._stanzaLine}`
    if (l._melodyFirst) {
      if (!(key in firstSung)) firstSung[key] = li
      run = row.first ? li : -1
      if (row.first) hostOf[li] = li
      return
    }
    if (l._sameTuneAbove) { // rule (b) — ใบ#131
      if (!(key in firstSung)) firstSung[key] = li
      if (run < 0 || !row.hasText) return
      if (!stack(run, li, row)) run = -1
      return
    }
    // rule (a) — a ท่อน sung again to a melody printed above. Only in แยกพยางค์: the other two ways of writing
    // the words (ติดกันเป็นวรรค · ตามต้นฉบับ, ใบ#100/#105) exist for exactly these paragraphs, so they keep them.
    if (props.lyricJoin || l._stanza == null || l._stanzaLine == null || l._entryIndex == null) return
    if (repeatOf[l._entryIndex] != null) {
      if (row.parts[0] && row.parts[0].type === 'section') heads.add(li)
      else stacked.add(li)
      return
    }
    const host = hostOf[firstSung[key]]
    if (host == null || !row.hasText) return
    if ((l._key || '') !== (lines[host]._key || '') || (l._ts || '') !== (lines[host]._ts || '')) return
    stack(host, li, row)
  })
  // name the rows of a host that carries more than one ท่อน: each ท่อน's first row there
  for (const [h, items] of Object.entries(under)) {
    const hostEntry = lines[h]._entryIndex
    if (items.every((it) => lines[it.li]._entryIndex === hostEntry)) continue
    hostLabel[h] = entryName[hostEntry] || ''
    let prev = hostEntry
    for (const it of items) {
      const ei = lines[it.li]._entryIndex
      it.label = ei !== prev ? entryName[ei] || '' : ''
      prev = ei
    }
  }
  return { under, stacked, hostLabel, heads }
})
function stacksUnder(li) { return stacks.value.under[li] || [] }
// ใบ#139 — the names at the start of a host's rows (its own first), or null when it needs none
function rowLabels(li) {
  const h = stacks.value.hostLabel[li]
  return h == null ? null : [h, ...stacksUnder(li).map((it) => it.label)]
}
const firstBar = (row) => row.parts.findIndex((p) => p.type === 'bar')
// the stacked line's syllable for each slot of one host segment, with that slot's number (a stacked ท่อน may
// fill a held box the host left empty, so this walks the segment's note boxes, not the host's words)
function stackRow(st, seg) {
  const n = Math.max(seg.syllables.length, syllableSlots(seg.note || ''))
  const out = []
  for (let k = 0; k < n; k++) { const m = st.slots[`${seg.si}-${k}`]; if (m) out.push({ ...m, slot: k }) }
  return out
}

// Group consecutive lines into ท่อน (a new group starts at each section label) so a
// whole ท่อน can be kept together across page breaks when printing (US-B02: "ไม่ตัด
// กลางท่อน"). Keeps each line's original index (li) for playback highlight / data-seg.
// A line stacked under the line above (ใบ#131) is drawn inside that line, so it has no row of its own.
const renderGroups = computed(() => {
  const groups = []
  let cur = null
  renderLines.value.forEach(({ parts, first, hasText }, li) => {
    if (stacks.value.stacked.has(li)) return
    // ใบ#139 — a ท่อน sung again word for word: just its heading, "(ร้องซ้ำ)"
    if (stacks.value.heads.has(li)) {
      parts = parts.filter((p) => p.type === 'section').map((p) => ({ ...p, rubric: p.rubric || 'ร้องซ้ำ' }))
      hasText = false
    }
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

// The engraved-arc geometry (buildArc / planArcs) and the hidden-half bookkeeping now live
// in lib/slurArcs.js, because the EDITOR draws the very same arcs over its own per-ห้อง
// previews (B118) and the two surfaces must not drift apart.
const halves = makeHalfHider()
const restoreHalves = halves.restore
const hideHalf = halves.hide
// ใบ#99 — digits whose own underline a bridge stands in for (data-ul="bridge"); given back on every re-measure
let bridged = []
function restoreBridged() {
  for (const n of bridged) if (n.getAttribute('data-ul') === 'bridge') n.removeAttribute('data-ul')
  bridged = []
}

function measureTies() {
  const root = rootEl.value
  restoreHalves()
  restoreBridged()
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
      // The tie's SOURCE is the DIGIT this receiver ties back to. When that note is held by
      // one or more '-' extensions ("2 - - - | ~2"), the immediately-previous .nt is a dash,
      // not the digit — anchoring the arc there started the curve at the last dash and left
      // the whole held run uncovered, so the tie read as broken (พี่เปา: "ต่อโยงจากตัวเลข
      // ไปตัวเลข ไม่เส้นขาด"). Skip back over the ext dashes to the real source digit so the
      // arc spans notehead→notehead, over the held dashes and the bar line, as one curve.
      let pi = i - 1
      while (pi >= 0 && nts[pi].classList.contains('nt-ext')) pi--
      const prev = nts[pi]
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
    // --- issues5: cross-segment slur arcs -------------------------------------------------
    // A slur whose '(' and ')' land in different segments (open at a bar's end, close at the
    // next bar's / line's start) can't be paired by NoteRow — it leaves a stray one-note arc
    // on the open box and nothing on the close. Redraw those as ONE line-level arc spanning
    // open→close across the bar (same overlay + look as the cross-bar tie above). Within-
    // segment slurs (sameSegment) are left to NoteRow untouched (B062/B076 — no regression).
    const line = renderLines.value[Number(li)]
    if (line) {
      const notesBySi = []
      line.parts.forEach((p) => {
        if (p.segments) p.segments.forEach((s) => { notesBySi[s.si] = s.note || '' })
      })
      const spans = slurSpans(notesBySi).filter((sp) => !sp.sameSegment)
      for (const sp of spans) {
        const openNt = lineEl.querySelector(`.segment[data-seg="${li}-${sp.open.si}"] .nt[data-idx="${sp.open.idx}"]`)
        const closeNt = lineEl.querySelector(`.segment[data-seg="${li}-${sp.close.si}"] .nt[data-idx="${sp.close.idx}"]`)
        if (!openNt || !closeNt) continue
        // single continuous arc when both anchors sit on the same visual row, or the
        // standard two-half engraving when a line wrap fell between them — shared with the
        // editor's overlay so both surfaces split a wrapped slur identically (B118).
        const produced = planArcs(
          openNt.getBoundingClientRect(),
          closeNt.getBoundingClientRect(),
          lr,
          nts.map((el) => el.getBoundingClientRect()),
        )
        // only claim (hide) the stray NoteRow arc once we actually drew a replacement — a
        // wrap we couldn't measure keeps NoteRow's own arc as a fallback (like ties above).
        if (produced.length) {
          const grp = openNt.closest('.note-group')
          hideHalf(grp && grp.querySelector('.slur-arc'))
          arcs.push(...produced)
        }
      }
      // --- ใบ v3/pleng#99 แบบ ก: an underline that runs on into the NEXT chord segment ----------
      // Each segment is its own NoteRow, so a เอื้อน note sitting in the next segment of the same
      // bar (เพลง 424: `1_.` ใจ | `2__`) could not join the underline. segmentBeamLink applies the
      // same rule at the seam; here we bridge the gap between the two digits at each shared level,
      // on the very baseline NoteRow's beam bars use (digit bottom minus its own underline border,
      // 1.5px thick, 1px apart). Bar lines break it: only segments of ONE bar part are paired.
      if (line.hasText) {
        const dpr = pixelRatio()
        const th = lineThickness(dpr)
        for (const p of line.parts) {
          if (!p.segments || p.segments.length < 2) continue
          for (let k = 0; k + 1 < p.segments.length; k++) {
            const s1 = p.segments[k]
            const s2 = p.segments[k + 1]
            const link = segmentBeamLink(s1, s2, true)
            if (!link) continue
            const aEl = lineEl.querySelector(`.segment[data-seg="${li}-${s1.si}"] .nt[data-idx="${link.from}"] .num`)
            const bEl = lineEl.querySelector(`.segment[data-seg="${li}-${s2.si}"] .nt[data-idx="${link.to}"] .num`)
            if (!aEl || !bEl) continue
            const a = aEl.getBoundingClientRect()
            const b = bEl.getBoundingClientRect()
            if (!a.width || !b.width) continue
            if (Math.abs(a.top - b.top) > Math.max(a.height, b.height) * 0.6) continue // wrapped apart
            // ใบ#99 (พี่เปา: ขนาดปกติเส้นดูขีดซ้อน) — a digit NOT under a beam bar of its own has only its
            // CSS border for an underline, which the browser lays on whole pixels; the bridge would meet it
            // a pixel row off. So the bridge runs ACROSS that digit and its border is hidden (`data-ul`) —
            // when the bridge carries every level the digit has. Bars and bridges share one snapped y.
            const overA = !link.fromBeamed && link.fromLevels <= link.levels
            const overB = !link.toBeamed && link.toLevels <= link.levels
            const x1 = (overA ? a.left : a.right) - lr.left
            const x2 = (overB ? b.right : b.left) - lr.left
            if (x2 - x1 <= 0) continue
            const border = parseFloat(getComputedStyle(aEl).borderBottomWidth) || 0
            const baseline = a.bottom - border // viewport px, the digit's content bottom
            for (let lv = 1; lv <= link.levels; lv++) {
              const y = levelTop(baseline, lv, dpr) - lr.top
              arcs.push({ key: `bb-${s1.si}-${lv}`, d: `M${x1} ${y}h${x2 - x1}v${th}h${x1 - x2}Z` })
            }
            if (overA) { aEl.setAttribute('data-ul', 'bridge'); bridged.push(aEl) }
            if (overB) { bEl.setAttribute('data-ul', 'bridge'); bridged.push(bEl) }
          }
        }
      }
    }
    if (arcs.length) byLine[li] = { paths: arcs, w: lr.width, h: lr.height }
  })
  lineArcs.value = byLine
}

// ใบ#132 — fit each entered line onto one row of the page.
// A line is a no-wrap flex row (the .sheet-fit-lines rules below), so a line that is too long
// OVERFLOWS instead of wrapping; shrinking its type until it fits is what keeps the author's
// line breaks. The whole sheet is measured in `em` since ใบ#130, so one font-size on the line
// scales its notes, its bar lines and its words together — the layout stays proportional.
// Text does not scale perfectly linearly (hinting rounds glyph widths), so this converges in
// up to three passes instead of trusting the first ratio.
function fitLineWidths() {
  const root = rootEl.value
  if (!root) return
  for (const line of root.querySelectorAll('.song-line')) {
    line.style.fontSize = '' // always measure from the page's own size, never from last time
    if (!props.fitLines || line.classList.contains('song-line-lyrics')) continue
    const apply = (scale) => {
      line.style.fontSize = scale === 1 ? '' : scale * 100 + '%'
    }
    // What has to fit on one row is the BARS. The line box is not the measure: the tie overlay is
    // absolutely positioned, and a ท่อน heading sometimes takes a full-width row of its own above
    // the bars (♦ รับ 1) and sometimes sits beside them on the same row (the *** marker). Count the
    // heading only in the second case — reading its CURRENT row tells us which it is — or a headed
    // line measures twice too wide and gets shrunk to a quarter size (song 77, 20 ต.ค. 2569).
    // Summing the bars' own widths reads the same whether they have already wrapped or not.
    // ใบ#139: the ท่อน names beside stacked rows take room on the row too
    const groups = [...line.querySelectorAll(':scope > .bar-group, :scope > .stack-labels')]
    const label = line.querySelector(':scope > .section-label')
    const naturalWidth = () => {
      if (!groups.length) return line.scrollWidth
      let w = groups.reduce((sum, g) => sum + g.getBoundingClientRect().width, 0)
      if (label) {
        const lr = label.getBoundingClientRect()
        const gr = groups[0].getBoundingClientRect()
        if (Math.abs(lr.top - gr.top) < 2) w += lr.width // the heading shares the bars' row
      }
      return w
    }
    // the last step of fitScale may end without a confirming measure, so apply its answer here.
    // `fit-measure` holds the bars at their natural width while measuring: once they grow into the
    // slack (the CSS below), every line would measure exactly full and never shrink.
    line.classList.add('fit-measure')
    apply(fitScale(line.clientWidth, (scale) => {
      apply(scale)
      return naturalWidth()
    }))
    line.classList.remove('fit-measure')
  }
}

// Debounce with a short timer (fires reliably in every context, unlike rAF which is
// paused in non-painting/headless tabs) — coalesces resize/print storms into one measure
// after layout settles.
function measureSheet() {
  widenNoteSlots()
  fitLineWidths()
  pinWords()
  measureTies()
}

// Each word sits exactly under its note. The note row and the word row are two separate rows, and
// they spread across a bar in different ways: the notes in beamed groups, the words one by one (and a
// general page rule made the word row a plain block, so its words were packed at the left). Once
// ใบ#132 let a short line's bars grow to the margins the notes moved apart and the words did not —
// song 114 measured words up to 81 px away from their own note.
// So the words follow the notes, in two steps around the line fit:
//  1. before the fit, every note slot is made at least as wide as the widest word sung on it (all rows,
//     ใบ#131's stacked lines included) plus a small gap, in `em`, so the fit's scaling keeps it — this is
//     what stops two long words on two close notes from running into each other;
//  2. after the fit, each word is placed with its centre on its note's centre.
// A bar with a word that has no note to sit under, or a page with no layout (tests), keeps the plain row.
function wordSlotSets() {
  const root = rootEl.value
  if (!root) return []
  const sets = []
  for (const box of root.querySelectorAll('.lyric-syl')) {
    const seg = box.closest('.segment')
    const nts = seg ? [...seg.querySelectorAll('.note-row .nt[data-idx]')] : []
    const syls = [...box.querySelectorAll(':scope > .syl[data-slot]')]
    const slots = new Map(nts.map((n) => [n.dataset.idx, n]))
    const main = syls.filter((s) => !s.dataset.row)
    // one word slot per note box, held notes included (song-model-v2.md) — so slot k is note k; a bar
    // may end with notes that have no word yet, never with a word that has no note
    const ok = nts.length && main.length <= nts.length && syls.every((s) => slots.has(s.dataset.slot)) &&
      nts.some((n) => n.getBoundingClientRect().width > 0)
    sets.push({ box, nts, syls, slots, ok })
  }
  return sets
}
function unpinWords({ box, nts, syls }) {
  box.removeAttribute('data-pin')
  box.style.height = ''
  for (const s of syls) { s.style.left = ''; s.style.top = '' }
  for (const n of nts) n.style.minWidth = ''
}
function widenNoteSlots() {
  for (const set of wordSlotSets()) {
    if (!set.ok) { unpinWords(set); continue }
    const widest = new Map()
    for (const s of set.syls) {
      const w = s.getBoundingClientRect().width
      widest.set(s.dataset.slot, Math.max(widest.get(s.dataset.slot) || 0, w))
    }
    const gap = 0.3 * (parseFloat(getComputedStyle(set.box).fontSize) || 16)
    for (const [k, n] of set.slots) {
      const px = parseFloat(getComputedStyle(n).fontSize) || 16
      n.style.minWidth = widest.get(k) ? `max(1.05em, ${((widest.get(k) + gap) / px).toFixed(3)}em)` : ''
    }
  }
}
function pinWords() {
  for (const set of wordSlotSets()) {
    if (!set.ok) { unpinWords(set); continue }
    const { box, syls, slots } = set
    box.setAttribute('data-pin', '')
    const rows = 1 + Math.max(0, ...syls.map((s) => Number(s.dataset.row) || 0))
    box.style.height = `calc(${rows} * 1em * var(--lh-snug))`
    const left = box.getBoundingClientRect().left
    for (const s of syls) {
      const r = slots.get(s.dataset.slot).getBoundingClientRect()
      const w = s.getBoundingClientRect().width
      s.style.left = (r.left + r.width / 2 - left - w / 2).toFixed(2) + 'px'
      s.style.top = s.dataset.row ? `calc(${s.dataset.row} * 1em * var(--lh-snug))` : ''
    }
  }
  // ใบ#139 — the ท่อน names start level with the first row of words of their line
  for (const col of rootEl.value?.querySelectorAll('.stack-labels') || []) {
    col.style.paddingTop = ''
    const box = col.closest('.song-line')?.querySelector('.lyric-syl[data-pin]')
    if (!box) continue
    const d = box.getBoundingClientRect().top - col.getBoundingClientRect().top
    if (d > 0) col.style.paddingTop = d.toFixed(2) + 'px'
  }
}
let timer = 0
function scheduleMeasure() {
  clearTimeout(timer)
  timer = setTimeout(measureSheet, 16)
}

let ro = null
onMounted(() => {
  nextTick(scheduleMeasure)
  // Cold load: web fonts swap in AFTER the first paint, shifting each note's width without
  // resizing the sheet ROOT — so the ResizeObserver never fires, and the first measure ran
  // against pre-font (often zero-width) positions and drew nothing. The ties then stayed
  // unpainted until a manual resize forced a re-measure — exactly the broken tie พี่เปา saw
  // on a fresh open. Re-measure once fonts are ready and once more after two frames so the
  // arcs land on the settled layout without needing any user interaction.
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleMeasure).catch(() => {})
  }
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => requestAnimationFrame(scheduleMeasure))
  }
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    ro = new ResizeObserver(scheduleMeasure)
    ro.observe(rootEl.value)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('beforeprint', measureSheet)
  }
  // on the document, not the sheet: a selection that starts above the sheet fires copy there, not here
  if (typeof document !== 'undefined') document.addEventListener('copy', onCopy)
})
onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleMeasure)
    window.removeEventListener('beforeprint', measureSheet)
  }
  if (typeof document !== 'undefined') document.removeEventListener('copy', onCopy)
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
  <div ref="rootEl" class="sheet-root" :class="[lyricsOnly ? 'sheet-mode-lyrics' : '', sn && !sc ? 'sheet-no-chord' : '', fitLines ? 'sheet-fit-lines' : '']">
    <!-- Printed title — centered, above the song, on paper only (on screen the shell
         bar / Studio heading already show it). Owned here so it prints from ANY mode
         that renders the sheet (ดู or แผ่น), which is why P'Aim's ดู-mode print had none. -->
    <h1 v-if="songTitle" class="sheet-print-title" :class="{ 'has-head': songHead && hasHead }">{{ songTitle }}</h1>
    <!-- ใบ v3/pleng#123 — the song's key and meter, once, at the top left above the first line of music
         (where a printed score and a โน้ตตัวเลข book put them). On screen and on paper. -->
    <p v-if="songHead && hasHead" class="sheet-head">
      <span v-if="head.key" class="sheet-head-item">คีย์ <b>{{ head.key }}</b></span>{{ head.key && head.meter ? ' ' : '' }}<span v-if="head.meter" class="sheet-head-item">จังหวะ <b>{{ head.meter }}</b></span>{{ (head.key || head.meter) && head.refs ? ' ' : '' }}<span v-if="head.refs" class="sheet-head-item sheet-head-refs">อ้างอิง <b>{{ head.refs }}</b></span>
    </p>
    <div v-for="(grp, gi) in renderGroups" :key="gi" class="song-section">
    <div v-for="row in grp.lines" :key="row.li" v-show="!isEmptyLyricLine(row)" :data-li="row.li" class="song-line" :class="{ 'song-line-lyrics': lineLyricsOnly(row.first), 'song-line-join': lyricJoin && lineLyricsOnly(row.first), 'song-line-stacked': stacksUnder(row.li).length }" :style="stacksUnder(row.li).length ? { '--stack-rows': stacksUnder(row.li).length } : null">
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
        <!-- ใบ#139 — which ท่อน each row of words under these notes belongs to, at the start of the row -->
        <span v-if="pi === firstBar(row) && rowLabels(row.li)" class="stack-labels" aria-hidden="true"><span v-for="(lb, ri) in rowLabels(row.li)" :key="ri" class="stack-label">{{ lb }}</span></span>
        <!-- ใบ#116 — a long line written as two lyric lines: an empty full-width box that ends the row -->
        <span v-if="cutBefore(row.li, part)" class="lyric-cut" aria-hidden="true" />
        <span v-if="part.type === 'section'" class="section-label">♦ {{ part.name }}<span v-if="part.rubric" class="section-rubric">({{ part.rubric }})</span><span v-if="part.key" class="section-key">คีย์ {{ part.key }}</span><span v-if="part.meter" class="section-meter" :aria-label="'จังหวะ ' + part.meter">{{ part.meter }}</span></span>
        <span v-else-if="part.type === 'marker'" class="section-marker">{{ part.label }}</span>
        <span v-else-if="part.type === 'label'" class="line-label">{{ part.text }}</span>
        <span v-else-if="part.type === 'end'" v-show="noteOn(row.first)" class="bar-final" aria-hidden="true"><i class="bf-thin" /><i class="bf-thick" /></span>
        <span v-else-if="part.type === 'repeat-start'" v-show="noteOn(row.first)" class="repeat-mark rep-start" aria-label="เริ่มเล่นซ้ำ"><i class="rep-bar" /><i class="rep-thin" /><i class="rep-dots" /></span>
        <span v-else-if="part.type === 'repeat-end'" v-show="noteOn(row.first)" class="repeat-mark rep-end" aria-label="วนกลับไปเล่นซ้ำ"><i class="rep-dots" /><i class="rep-thin" /><i class="rep-bar" /></span>
        <span v-else-if="part.type === 'volta'" v-show="noteOn(row.first)" class="volta-tag">{{ part.num }}.</span>
        <!-- ใบ#100/#104/#110 — เนื้อล้วน written joined: the bars of the line flow as ONE run of words, each วรรค
             in its own box (.phrase) so it moves to the next line whole, or — wider than the line — wraps
             only between two words (<wbr>). Same per-syllable spans, so the karaoke still walks syllable by
             syllable. The run is drawn once, at its first bar; the bars after it draw nothing. -->
        <template v-else-if="lyricJoin && lineLyricsOnly(row.first)"><span
          v-if="sl && joinRun(row.li, pi)"
          class="lyric lyric-words"
        ><template v-for="(pc, ci) in joinRun(row.li, pi).pieces" :key="ci"><span
          v-if="pc.v1"
          class="lyric"
          :class="{ 'seg-playing': isPlaying(row.li, pc.seg.si) }"
          :data-seg="`${row.li}-${pc.seg.si}`"
          @click="seek(row.li, pc.seg.si)"
        >{{ pc.seg.lyric }}&nbsp;</span><span v-else class="phrase" :class="{ 'seg-tap': interactive }"><template v-for="it in pc.items" :key="it.key"><span
          class="syl"
          :class="{ 'syl-playing': isSyl(row.li, it.si, it.k), 'syl-spaced': it.parts }"
          :data-syl="`${row.li}-${it.si}-${it.k}`"
          @click.stop="seek(row.li, it.si, it.k)"
        ><template v-if="it.parts"><template v-for="(p, pk) in it.parts" :key="pk"><span v-if="p.trim()" class="syl-word">{{ p }}</span><template v-else>{{ p }}</template></template></template><template v-else>{{ it.w }}</template></span><wbr v-if="it.glue === 'wbr'" />{{ it.glue === 'wj' ? WORD_JOINER : '' }}</template></span>{{ pc.space ? ' ' : '' }}</template></span></template>
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
            <span v-if="noteOn(row.first)" class="note"><NoteRow :notes="seg.note" :syllables="seg.syllables || null" :lyrics="row.hasText" :active="activeNote(row.li, seg.si)" />&nbsp;</span>
            <!-- v2: one span per syllable-bearing note -> highlight walks note by note (B006). -->
            <template v-if="sl">
              <!-- FULL display: syllable spans spread UNDER the notes (flex, karaoke alignment). -->
              <!-- ใบ#131 — with lines stacked under this one, the rows share ONE grid: a column per slot, as
                   wide as its widest word, so a stacked word sits exactly under the word above it (two
                   separate flex rows each spread their own words and drifted up to 21px apart). -->
              <span
                v-if="seg.syllables && !lineLyricsOnly(row.first)"
                class="lyric lyric-syl"
                :class="{ 'lyric-grid': stacksUnder(row.li).length && seg.syllables.length }"
                :style="stacksUnder(row.li).length && seg.syllables.length ? { gridTemplateColumns: `repeat(${seg.syllables.length}, auto)` } : null"
              >
                <span
                  v-for="(w, k) in seg.syllables"
                  :key="k"
                  class="syl"
                  :class="{ 'syl-playing': isSyl(row.li, seg.si, k) }"
                  :data-syl="`${row.li}-${seg.si}-${k}`"
                  :data-slot="k"
                  @click.stop="seek(row.li, seg.si, k)"
                >{{ w || ' ' }}</span>
                <!-- the words of each line sung to this same tune, one more grid row each, slot for slot.
                     Each syllable keeps its OWN line's address, so the karaoke and tap-to-seek reach it. -->
                <template v-for="(st, ri) in stacksUnder(row.li)" :key="'st' + st.li">
                  <span
                    v-for="m in stackRow(st, seg)"
                    :key="'st' + st.li + '-' + m.slot"
                    class="syl syl-stacked"
                    :class="{ 'syl-playing': isSyl(st.li, m.si, m.k) }"
                    :data-syl="`${st.li}-${m.si}-${m.k}`"
                    :data-slot="m.slot"
                    :data-row="ri + 1"
                    @click.stop="seek(st.li, m.si, m.k)"
                  >{{ m.w || ' ' }}</span>
                </template>
              </span>
              <!-- เนื้อล้วน display: same per-syllable spans but INLINE (natural reading, a space after
                   each word) so the karaoke still walks SYLLABLE-by-syllable, not whole-segment
                   (P'Aim 14 ก.ค. "อยากได้เป็นพยางค์"). Empty slots (melisma) render nothing. -->
              <span v-else-if="seg.syllables" class="lyric lyric-words">
                <template v-for="(w, k) in seg.syllables" :key="k"><span
                  class="syl"
                  :class="{ 'syl-playing': isSyl(row.li, seg.si, k) }"
                  :data-syl="`${row.li}-${seg.si}-${k}`"
                  @click.stop="seek(row.li, seg.si, k)"
                >{{ w }}</span>{{ w ? ' ' : '' }}</template>
              </span>
              <!-- v1 (no syllables array): the whole lyric as before (seg-playing highlight). -->
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
/* ใบ v3/pleng#132 — on แผ่นเพลง a music line is ONE row that reaches both margins, and the row never
   wraps. A line that does not fit is scaled down by fitLineWidths() instead — the author's line breaks
   are the layout, so the page must not invent new ones. Reused-verse lines (lyrics only, under a melody
   printed above) keep their ordinary text flow: spreading words to the margins would only pull them apart.
   HOW a short line reaches the margins — พี่เปา 22 ต.ค. 2569: "ถ้าสั้นเกินก็ขยายช่องไฟออก แทน". The first
   version spread the BARS apart (space-between on the row): each bar kept its notes packed at its left
   and the slack piled up as one big hole before the next bar line — "ตอนนี้หน้าตามันไม่ได้เลย" (song 114).
   Now the slack goes INSIDE the bars: every bar grows by the same share, and every chord segment inside a bar
   grows with it, so the notes (.note-row) and the words (.lyric-syl), which already spread across their
   segment with space-around, simply get more room between them — wider ช่องไฟ, no holes.
   ⛔ Nothing SHRINKS. A flex item gives way before it overflows, and a squeezed bar quietly breaks its words
   onto a second line inside their own cell — the same ugly result as wrapping, just harder to see.
   ⛔ The row still WRAPS on purpose: a ท่อน heading (.section-label) is a full-width item that has to sit on
   its own row above the bars. Forcing nowrap put the heading and the bars on one row and made every headed
   line measure ~2x too wide — so the fit chased a number that could not be met and shrank a line to a
   quarter size (song 77, 20 ต.ค. 2569). */
.sheet-fit-lines .song-line:not(.song-line-lyrics) > .bar-group {
  flex: 1 0 auto;
}
.sheet-fit-lines .song-line:not(.song-line-lyrics) > .bar-group > .segment {
  flex: 1 0 auto;
}
/* while fitLineWidths() measures a line, nothing grows — it needs the bars' NATURAL width */
.sheet-fit-lines .song-line.fit-measure > .bar-group,
.sheet-fit-lines .song-line.fit-measure > .bar-group > .segment {
  flex-grow: 0;
}
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
/* ใบ v3/pleng#131 — a line with words of later lines stacked under its own: each stacked row is one more
   lyric row (1.06em type × 1.4 line-height = 1.484em of the line's own size), so the bar lines and repeat
   marks grow by that much per row and still reach the last row of words. Heights stay in em (ใบ#130). */
.song-line-stacked :deep(.bar-line),
.song-line-stacked :deep(.bar-final),
.song-line-stacked :deep(.repeat-mark) {
  height: calc(3.25em + var(--stack-rows) * 1.484em);
}
.lyric-syl.lyric-grid {
  display: grid;
  justify-content: space-around;
  justify-items: center;
}
/* each word pinned under its own note (pinWords): the row keeps its height — one line per row of words —
   and every word is placed by its note's centre. Comes after the grid rule so it wins over it. */
.lyric-syl[data-pin] {
  display: block;
  position: relative;
}
.lyric-syl[data-pin] > .syl {
  position: absolute;
  top: 0;
}
/* ใบ#139 — the ท่อน names beside a host's rows of words: one box per row, as tall as a row of words
   (the words' 1.06em type × the 1.4 snug line height = 1.484em of the line), lined up with those rows by
   pinWords(). Set smaller than the words (0.8em), so the column takes less of the row: 1.484 / 0.8 = 1.855em. */
.stack-labels {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  padding-right: 0.4em; /* padding, not margin: the line fit measures the box (fitLineWidths) */
  color: var(--brand, #8b4513);
  font-weight: 700;
}
.stack-label {
  font-size: 0.8em;
  line-height: 1.855em;
  height: 1.855em;
  white-space: nowrap;
}
/* ใบ v3/pleng#100 — เนื้อล้วน "ติดกันเป็นวรรค": the line flows as ONE run of text, with no chord-segment boxes and
   no per-syllable padding — the only spaces are the breath spaces lyricPhrase.js puts in. Split mode (no
   .song-line-join) is untouched. */
.song-line-join { display: block; } /* not the bar-wrapping flex row */
/* ใบ#104 + ใบ#110 — each วรรค is one box no wider than the line. A วรรค that fits moves to the next line whole;
   one that is wider than the line wraps inside its box, and only at a <wbr> — the end of a word (inside a
   word every joint carries a WORD JOINER, and a syllable never wraps). Nothing here may cut a word: the old
   `overflow-wrap: anywhere` last resort is gone, because that is what cut "ประจัก|ษ์" on a phone. */
.song-line-join .phrase { display: inline-block; max-width: 100%; }
.song-line-join .lyric-words .syl { white-space: nowrap; padding: 0; }
/* …except a slot that holds several words with spaces: it may wrap at those spaces, each word kept whole */
.song-line-join .lyric-words .syl.syl-spaced { white-space: normal; }
.song-line-join .lyric-words .syl-word { white-space: nowrap; }
/* the ♦ heading sits on its own line above, as in split mode; a *** marker / line label stays inline with
   the words (ใบ#101: as a block it added a row to every refrain and pushed a printed sheet onto a 2nd page) */
.song-line-join .section-label { display: block; }
.song-line-join .section-marker,
.song-line-join .line-label { margin-right: 0.4em; }
/* ใบ v3/pleng#116 — where a long sheet line is cut into two lyric lines: a box as wide as the line and no height,
   so what follows starts a new row — in แยกพยางค์ (the bar-wrapping flex row) and in the joined block alike */
.lyric-cut { display: block; flex-basis: 100%; width: 100%; height: 0; }
/* เนื้อล้วน display: per-syllable spans read as natural inline words (a space text-node sits after
   each), so the karaoke walks syllable-by-syllable while the line still reads like a plain verse. */
.lyric-words { display: inline; }
.lyric-words .syl { white-space: normal; }
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
  gap: 0.125em; /* ใบ#130 — em, so the sheet wraps like paper at any reading size */
  width: auto;
  height: 3.25em;
  margin: 1em 0.6em 0;
  border: none;
  vertical-align: top;
}
/* ใบ#129 — border, not background, or the closing double bar never reaches paper (see .odot) */
.bar-final .bf-thin { width: 0.125em; border-left: 0.125em solid #8a7a62; }
.bar-final .bf-thick { width: 0.25em; border-left: 0.25em solid #8a7a62; }
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
/* ใบ v3/pleng#123 — the key + meter head. Left, above the first line, plain text that wraps (never runs off a
   narrow screen or a 200% reading size); the values bold like the printed signs. */
.sheet-head {
  margin: 0 0 0.8em;
  font-size: 0.95em;
  line-height: 1.4;
  color: var(--ink);
}
.sheet-head-item { display: inline-block; white-space: nowrap; margin-right: 1em; }
.sheet-head b {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
/* On paper the head lives INSIDE the gap the title always left above the music (6mm): 0.5mm + a 4mm line +
   1.5mm = the same 6mm, so nothing below it moves and no song gets a page more (ใบ#101). Measured on all 653
   published songs: a head on a line of its own pushed 29 one-page songs onto a second page. */
@media print {
  .sheet-head {
    font-size: 10pt;
    line-height: 4mm;
    height: 4mm;
    white-space: nowrap;
    color: #000;
    margin: 0 0 1.5mm;
  }
  /* ใบ#128 — อ้างอิง shares that one fixed-height, no-wrap line. A song with an unusually long
     list would otherwise run off the right edge and be clipped by the page with nothing to show
     for it, so the refs are the item that gives: they shrink and end in an ellipsis, which at
     least says there is more. Key and meter never shrink — they are the ones a singer needs. */
  .sheet-head-refs {
    max-width: 55%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
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
  /* ใบ#123 — the key + meter head sits in this gap (see .sheet-head): 0.5mm here + 4mm + 1.5mm = 6mm */
  .sheet-print-title.has-head { margin-bottom: 0.5mm; }
}
</style>
