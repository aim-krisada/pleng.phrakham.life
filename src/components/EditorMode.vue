<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase.js'
import { KEYS, TIME_SIGNATURES, chordOptions } from '../lib/chords.js'
import { parseNotes, beatCount, expectedBeats, syllableSlots, noteBoxKinds } from '../lib/notation.js'
import { migrateToV2, splitSyllables, joinSyllables, resolveContent } from '../lib/songModel.js'
import { songHaystack } from '../lib/songSearch.js'
import { diffSongRows } from '../lib/diff.js'
import { playSong, stopPlayback } from '../lib/midi.js'
import SongSheet from './SongSheet.vue'
import NoteBoxes from './NoteBoxes.vue'
import ComboSelect from './ComboSelect.vue'
import Icon from './Icon.vue'

// ---------- mode contract (DS-04) ----------
// EditorMode is the "แก้ไข" surface, extracted whole from Studio.vue. The shell owns
// which mode is shown and the canonical song; this mode only edits.
//   props.song   : the current song (v2 row: { id, number, title_th, title_en, content })
//   props.tier   : 'anon' | 'editor' | 'approver' (from the store — single gating source)
//   props.active : true while this mode is the visible one (guards the teleported chrome,
//                  which lives OUTSIDE this component's root so v-show can't hide it)
// emits:
//   change(song) : the song was edited — the shell keeps it as central state so switching
//                  modes never loses in-progress work
//   save(kind)   : a save button was pressed · kind ∈ 'json' | 'draft' | 'pending' | 'publish'
const props = defineProps({
  song: { type: Object, default: null },
  tier: { type: String, default: 'anon' },
  active: { type: Boolean, default: false },
})
const emit = defineEmits(['change', 'save', 'dock'])

// ---------- auth + role (gating comes from the store via props.tier · DS-02) ----------
import { session, legacy, shellMenu, saveDraftRow } from '../store.js'

// derive the two flags the editor already reads from the single tier source, so the rest
// of the editor body is untouched (isApprover / loggedIn keep their meaning)
const isApprover = computed(() => props.tier === 'approver')
const loggedIn = computed(() => props.tier !== 'anon')
// the teleported chrome (title input + เพลง/จัดการ menus) renders only while this mode is on
const editing = computed(() => props.active)

onMounted(() => {
  loadSongList()
  loadDrafts()
  loadProfilesMap()
})
onUnmounted(stopPlayback)

// login/logout happen in the navbar — refresh drafts/profiles when auth changes
watch(session, () => {
  loadDrafts()
  loadProfilesMap()
})
// NOTE: the props.song ↔ change/save wiring lives at the END of this script, after the
// editing state (editingId / meta / previewContent / applyRow …) it depends on is defined
// — otherwise the immediate watchers would touch those consts inside their TDZ.

// ---------- editing model (song model v2) ----------
// A song is a set of MELODIES (stanzas, entered once, no lyrics) plus an
// ARRANGEMENT (play order — each row links a stanza and supplies only its words).
// The bar/segment editor below is unchanged: it edits the ACTIVE stanza's lines via
// the `lines` computed, so all the existing line/bar/segment code keeps working.
function newSegment() {
  return { chord: '', note: '', lyric: '' }
}
// A bar can carry repeat marks: repeatStart '‖:' (loop back to here), repeatEnd ':‖'
// (jump back to the last repeatStart), and volta 1/2 (this bar is the 1st / 2nd ending).
// `pickup` (ห้องยก / anacrusis) marks a bar that is intentionally short because its
// beats are completed by another partial bar — a stanza-opening pickup paired with the
// short final bar, or a bar split across a line. Flagged bars are validated as a GROUP
// (their beats must sum to a whole number of bars), never red individually (B055).
function barShell() {
  return { segments: [], repeatStart: false, repeatEnd: false, volta: 0, pickup: false }
}
function newBar() {
  return { ...barShell(), segments: [newSegment()] }
}
function newLine() {
  return { marker: '', cont: false, label: '', section: '', end: false, bars: [newBar()] }
}

function deserializeLine(items) {
  const line = { marker: '', cont: false, label: '', section: '', end: false, bars: [] }
  let bar = barShell()
  for (const it of items) {
    if (it.type === 'continue') line.cont = true
    else if (it.type === 'section') line.section = it.name || ''
    else if (it.type === 'label') line.label = it.text || ''
    else if (it.type === 'end') line.end = true
    else if (it.type === 'marker') line.marker = it.label || '***'
    else if (it.type === 'repeat-start') bar.repeatStart = true
    else if (it.type === 'repeat-end') bar.repeatEnd = true
    else if (it.type === 'pickup') bar.pickup = true
    else if (it.type === 'volta') bar.volta = it.num || 0
    else if (it.type === 'bar') {
      line.bars.push(bar)
      bar = barShell()
    } else if (it.type === 'segment') {
      bar.segments.push({ chord: it.chord || '', note: it.note || '', lyric: it.lyric || '' })
    }
  }
  line.bars.push(bar)
  line.bars = line.bars.filter((b) => b.segments.length)
  if (!line.bars.length) line.bars = [newBar()]
  return line
}

// A stanza is a melody — segments carry no lyric (the arrangement supplies words),
// so an empty lyric is dropped from the serialized item to keep the v2 JSON clean.
function serializeLine(line) {
  const items = []
  if (line.section?.trim()) items.push({ type: 'section', name: line.section.trim() })
  if (line.cont) items.push({ type: 'continue' })
  if (line.marker) items.push({ type: 'marker', label: line.marker })
  line.bars.forEach((b, i) => {
    // a repeat-start IS the left barline; otherwise a plain barline between bars
    if (b.repeatStart) items.push({ type: 'repeat-start' })
    else if (i > 0) items.push({ type: 'bar' })
    if (b.pickup) items.push({ type: 'pickup' })
    if (b.volta) items.push({ type: 'volta', num: b.volta })
    for (const s of b.segments) {
      const seg = { type: 'segment', chord: s.chord, note: s.note }
      if (s.lyric) seg.lyric = s.lyric
      items.push(seg)
    }
    if (b.repeatEnd) items.push({ type: 'repeat-end' })
  })
  if (line.label?.trim()) items.push({ type: 'label', text: line.label.trim() })
  if (line.end) items.push({ type: 'end' })
  return items
}

const editingId = ref(null)
const currentDraftId = ref(null)
const reviewingDraft = ref(null)
const reviewComment = ref('')
const pickerId = ref('')
const meta = reactive({ number: null, title_th: '', title_en: '', category: 'anuchon', theme: '' })
const opts = reactive({ key: 'C', timeSignature: '4/4', bpm: null })

// verified flag of the loaded song (songs.verified) — surfaced as the "✓ ตรวจแล้ว" toggle
const verified = ref(false)

// B060: song settings live inline now (no "เพลง ▾" menu needed). ธีม = the 8 themes the
// library uses (from the songs.theme column); หมวด = the book/collection code (anuchon =
// ไทยอนุชน 120 · docs/pm/book-codes.md). Both are set-and-forget dropdowns so พี่เปา can
// fill them without fear of leaving the page.
const THEMES = [
  'กิตติคุณ',
  'ความสุขแห่งความรอด',
  'คริสตจักร',
  'ประสบการณ์',
  'พระคัมภีร์',
  'มอบถวาย',
  'รักปรารถนา',
  'อาณาจักร',
]
const themeOptions = [{ value: '', label: '— ไม่ระบุธีม —' }, ...THEMES.map((t) => ({ value: t, label: t }))]
const CATEGORY_OPTIONS = [{ value: 'anuchon', label: 'ไทยอนุชน 120 (anuchon)' }]

// melodies + play order (v2). An arrangement row stores its words as a `syllables`
// array (one token per syllable-bearing note) so the per-note lyric boxes under the
// melody can bind slot-by-slot; the bulk textarea joins/splits the same array.
const stanzas = ref([{ id: 'A', lines: [newLine()] }])
const activeStanza = ref(0)
const arrangement = ref([{ stanza: 'A', label: '', syllables: [], key: '' }])
const migrateWarnings = ref([]) // set when a v1 song is auto-split on load (author reviews)

// verse lens: which arrangement row's words to show under the active stanza's notes
// (-1 = hidden). Lets the author type each syllable right under its note — the old
// "words with the melody" feel, now per syllable (a blank box marks a missing word).
const lensChoice = ref(-1)
const paraOpen = ref(false) // paragraph (free-text) editor for the selected ข้อ

const saveMsg = ref('')
const playing = ref(false)

// the bar/segment editor operates on the ACTIVE stanza's lines through this computed
const lines = computed({
  get: () => stanzas.value[activeStanza.value]?.lines ?? [],
  set: (v) => {
    const s = stanzas.value[activeStanza.value]
    if (s) s.lines = v
  },
})
const activeStanzaId = computed(() => stanzas.value[activeStanza.value]?.id ?? '')

const previewContent = computed(() => ({
  version: 2,
  key: opts.key,
  timeSignature: opts.timeSignature,
  bpm: opts.bpm || undefined,
  stanzas: stanzas.value.map((s) => ({ id: s.id, lines: s.lines.map(serializeLine) })),
  arrangement: arrangement.value.map((r) => ({
    stanza: r.stanza,
    label: r.label?.trim() || '',
    syllables: r.syllables.map((t) => (t || '').trim()),
    ...(r.key ? { key: r.key } : {}),
  })),
}))

// The sheet + playback read v1-shaped `lines`, so resolve the arrangement first.
const resolvedPreview = computed(() => ({
  ...previewContent.value,
  lines: resolveContent(previewContent.value),
}))

// valid chords only, diatonic chords of the current key listed first. chordOptions
// already leads with a "— ไม่มีคอร์ด —" entry (value ''), so the picker reuses it —
// picking that clears/merges a chord at a note (no duplicate "no chord" row).
const chordOpts = computed(() => chordOptions(opts.key))
const chordPickOpts = chordOpts

// ---------- verse lens (words under the notes) ----------
// arrangement rows that link the stanza currently being edited
const lensRowsForActiveStanza = computed(() =>
  arrangement.value.map((r, i) => ({ i, r })).filter((x) => x.r.stanza === activeStanzaId.value),
)
const lensOptions = computed(() => [
  { value: -1, label: '— ซ่อนเนื้อ —' },
  ...lensRowsForActiveStanza.value.map((x) => ({
    value: x.i,
    label: 'ข้อ ' + (x.i + 1) + (x.r.label ? ' (' + x.r.label + ')' : ''),
  })),
])
const lensRow = computed(() => (lensChoice.value >= 0 ? arrangement.value[lensChoice.value] : null))
const lensActive = computed(() => !!lensRow.value && lensRow.value.stanza === activeStanzaId.value)
// global syllable-slot index where each segment of the active stanza starts, so a
// per-note box binds to lensRow.syllables[start + k]. Keyed "li-bi-si".
const slotStarts = computed(() => {
  const map = {}
  const s = stanzas.value[activeStanza.value]
  if (!s) return map
  let idx = 0
  s.lines.forEach((line, li) =>
    line.bars.forEach((bar, bi) =>
      bar.segments.forEach((seg, si) => {
        map[`${li}-${bi}-${si}`] = idx
        idx += syllableSlots(seg.note || '')
      }),
    ),
  )
  return map
})
function segSlotCount(note) {
  return syllableSlots(note || '')
}
// One lyric cell per note box of a segment. EVERY note gets its own box: an attack
// note bears a word (red when empty = missing word); a held '-' / rest box gets an
// optional box too (blank is fine — it just holds the sustain). Only ( ) { } brackets
// are spacers (slot: null), so each word still lines up under its note.
function sylCells(li, bi, si, note) {
  let slot = slotStarts.value[`${li}-${bi}-${si}`] ?? 0
  return noteBoxKinds(note).map((kind) =>
    kind === 'struct' ? { slot: null } : { slot: slot++, held: kind === 'held' },
  )
}
// total notes the active stanza bears, and any syllables typed BEYOND that — shown as
// note-less boxes so an overflow (more words than notes) is visible, never dropped.
const activeSlotTotal = computed(() => stanzaSlots(activeStanzaId.value))
const overflowSlots = computed(() => {
  if (!lensActive.value) return []
  const out = []
  for (let i = activeSlotTotal.value; i < lensRow.value.syllables.length; i++) out.push(i)
  return out
})
function sylAt(row, i) {
  return row?.syllables[i] || ''
}
// write one syllable slot; pad gaps with '' and trim trailing blanks to stay tidy
function setSyl(row, i, val) {
  const arr = row.syllables
  while (arr.length <= i) arr.push('')
  arr[i] = val.trim()
  while (arr.length && arr[arr.length - 1] === '') arr.pop()
}

// ---------- align helpers (shift the whole verse to re-align with the notes) ----------
// A missing/extra syllable in the middle shifts every later word off its note. These
// insert/remove one slot and RIPPLE the rest across the whole ข้อ (past bars & lines).
const focusedSlot = ref(-1) // global slot index whose ◀ ▶ tools are shown
function slotIdx(li, bi, si, k) {
  return (slotStarts.value[`${li}-${bi}-${si}`] ?? 0) + k - 1
}
// ▶ push: open a blank at slot i, everything from i shifts right
function pushSlot(i) {
  if (!lensRow.value) return
  const arr = lensRow.value.syllables
  while (arr.length < i) arr.push('')
  arr.splice(i, 0, '')
}
// ◀ pull: drop slot i, everything after it shifts left
function pullSlot(i) {
  if (!lensRow.value) return
  const arr = lensRow.value.syllables
  if (i < arr.length) arr.splice(i, 1)
}
// Space/Enter inside a syllable box: split a multi-syllable box (e.g. "พระเจ้า" typed
// as one) into one syllable per box — the first stays here, the rest ripple into the
// following notes — then move focus on. Space splits at the caret; Enter splits on any
// space already in the box, else just advances. Feels like the note-box entry.
async function focusSlot(target, caret) {
  focusedSlot.value = target
  await nextTick()
  const el = document.querySelector(`[data-slot="${target}"]`)
  if (el) {
    el.focus()
    const n = caret == null ? el.value.length : Math.min(caret, el.value.length)
    el.setSelectionRange?.(n, n)
  }
}
function distribute(i, val) {
  if (!lensRow.value) return
  const arr = lensRow.value.syllables
  const tokens = val.split(/\s+/).filter(Boolean)
  while (arr.length <= i) arr.push('')
  if (tokens.length <= 1) {
    arr[i] = tokens[0] ?? ''
    return focusSlot(i + 1) // nothing to split — just advance
  }
  arr[i] = tokens[0]
  for (let j = tokens.length - 1; j >= 1; j--) arr.splice(i + 1, 0, tokens[j])
  return focusSlot(i + tokens.length) // continue past the words we just placed
}
// Make a syllable box feel like a text field: Space (or Enter) splits at the caret,
// Backspace at the very start merges into the previous box, Delete at the very end
// pulls the next box in — all rippling the whole verse, nothing dropped.
function onSylKey(e, i) {
  const el = e.target
  const arr = lensRow.value?.syllables
  if (!arr) return
  if (e.key === 'Enter') {
    e.preventDefault()
    distribute(i, el.value)
  } else if (e.key === ' ') {
    // Space inserts a syllable break at the caret: text before stays here, text after
    // (even empty) moves to a new box and everything ripples right — so a space at the
    // very start pushes the whole syllable right (bug: it used to do nothing).
    e.preventDefault()
    const c = el.selectionStart ?? el.value.length
    arr[i] = el.value.slice(0, c)
    arr.splice(i + 1, 0, el.value.slice(c))
    focusSlot(i + 1, 0)
  } else if (e.key === 'Backspace') {
    if (i > 0 && (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0) {
      e.preventDefault()
      const prevLen = (arr[i - 1] ?? '').length
      arr[i - 1] = (arr[i - 1] ?? '') + (arr[i] ?? '')
      arr.splice(i, 1)
      focusSlot(i - 1, prevLen)
    }
  } else if (e.key === 'Delete') {
    if (i + 1 < arr.length && (el.selectionStart ?? 0) === el.value.length && (el.selectionEnd ?? 0) === el.value.length) {
      e.preventDefault()
      const curLen = el.value.length
      arr[i] = (arr[i] ?? '') + (arr[i + 1] ?? '')
      arr.splice(i + 1, 1)
      focusSlot(i, curLen)
    }
  }
}
// point the lens at the first row that uses the active stanza (or hide it)
function resetLens() {
  lensChoice.value = arrangement.value.findIndex((r) => r.stanza === activeStanzaId.value)
}
watch(activeStanzaId, resetLens)

// ---------- chord at a note box ----------
// A chord lives on a segment (it covers all that segment's notes). To let the author
// set/insert a chord right above ANY note, note box p of a segment gets a chord cell:
// p===0 shows/edits the segment's own chord; p>0 splits the segment there into a new
// segment that starts with the picked chord. Clearing the chord on a later segment's
// first note merges it back (removes the chord change).
const editingChord = ref(null) // { li, bi, si, p }
function noteBoxCount(note) {
  const t = (note || '').trim()
  return t ? t.split(/\s+/).length : 1
}
function chordEditing(li, bi, si, p) {
  const e = editingChord.value
  return e && e.li === li && e.bi === bi && e.si === si && e.p === p
}
function openChord(li, bi, si, p) {
  editingChord.value = chordEditing(li, bi, si, p) ? null : { li, bi, si, p }
}
function applyChordAt(bar, si, p, chord) {
  const seg = bar.segments[si]
  if (p === 0) {
    if (!chord && si > 0) {
      // clearing a later segment's chord merges its notes back into the previous one
      const prev = bar.segments[si - 1]
      prev.note = [prev.note, seg.note].filter((x) => x && x.trim()).join(' ')
      bar.segments.splice(si, 1)
    } else {
      seg.chord = chord
    }
  } else if (chord) {
    // split the segment at note p; the tail becomes a new segment with this chord
    const toks = (seg.note || '').split(/\s+/).filter(Boolean)
    seg.note = toks.slice(0, p).join(' ')
    bar.segments.splice(si + 1, 0, { chord, note: toks.slice(p).join(' '), lyric: '' })
  }
  editingChord.value = null
}
function onChordOutside(e) {
  if (!e.target.closest?.('.chord-cell')) editingChord.value = null
}
watch(editingChord, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onChordOutside), 0)
  else document.removeEventListener('mousedown', onChordOutside)
})
onUnmounted(() => document.removeEventListener('mousedown', onChordOutside))

// ---------- stanza (melody) operations ----------
function nextStanzaId() {
  const used = new Set(stanzas.value.map((s) => s.id))
  for (let c = 65; c <= 90; c++) {
    const l = String.fromCharCode(c)
    if (!used.has(l)) return l
  }
  return 'A' + stanzas.value.length
}
function addStanza() {
  stanzas.value.push({ id: nextStanzaId(), lines: [newLine()] })
  activeStanza.value = stanzas.value.length - 1
  activeLine.value = 0
}
function selectStanza(idx) {
  activeStanza.value = idx
  activeLine.value = 0
}
function removeStanza(idx) {
  if (stanzas.value.length <= 1) return
  const id = stanzas.value[idx].id
  if (arrangement.value.some((r) => r.stanza === id)) {
    if (!window.confirm(`ท่อนทำนอง ${id} ถูกใช้ในลำดับเพลงอยู่ — ลบทำนองและแถวที่ใช้มันด้วย?`)) return
  }
  stanzas.value.splice(idx, 1)
  arrangement.value = arrangement.value.filter((r) => r.stanza !== id)
  if (!arrangement.value.length) {
    arrangement.value = [{ stanza: stanzas.value[0].id, label: '', syllables: [], key: '' }]
  }
  activeStanza.value = Math.min(activeStanza.value, stanzas.value.length - 1)
  activeLine.value = 0
  resetLens()
}

// ---------- arrangement (verses/refrains) operations ----------
// syllable slots a stanza's melody bears = sum of syllable-bearing notes across it.
function stanzaSlots(id) {
  const s = stanzas.value.find((x) => x.id === id)
  if (!s) return 0
  let n = 0
  for (const line of s.lines) {
    for (const bar of line.bars) {
      for (const seg of bar.segments) n += syllableSlots(seg.note || '')
    }
  }
  return n
}
// live word-count check per arrangement row (like barStatus). Every note box has a
// lyric slot, but only ATTACK notes require a word — held/rest boxes may stay blank.
// So we count words present on attack slots against the number of attack notes.
function rowStatus(row) {
  const s = stanzas.value.find((x) => x.id === row.stanza)
  if (!s) return { need: 0, got: 0, ok: true }
  let idx = 0
  let need = 0
  let got = 0
  for (const line of s.lines)
    for (const bar of line.bars)
      for (const seg of bar.segments)
        for (const kind of noteBoxKinds(seg.note || '')) {
          if (kind === 'struct') continue
          if (kind === 'attack') {
            need++
            if ((row.syllables[idx] || '').trim()) got++
          }
          idx++
        }
  return { need, got, ok: got === need }
}
// ---------- bulk lyric textarea <-> per-note slots (melody-aware) ----------
// The textarea is the "type the words" view: one word per ATTACK note. The per-note
// boxes above expose every slot (incl. held). These map between the two: words land on
// attack slots, held slots stay blank; reading back shows only the attack words. Keeps
// the paste-a-verse workflow 1:1 with the sung syllables even though held notes now
// have their own boxes.
function stanzaKindList(stanzaId) {
  const s = stanzas.value.find((x) => x.id === stanzaId)
  const out = []
  if (!s) return out
  for (const line of s.lines)
    for (const bar of line.bars)
      for (const seg of bar.segments)
        for (const kind of noteBoxKinds(seg.note || '')) {
          if (kind !== 'struct') out.push(kind)
        }
  return out
}
function wordsToSyllables(words, stanzaId) {
  const kinds = stanzaKindList(stanzaId)
  const out = []
  let w = 0
  for (const k of kinds) out.push(k === 'attack' ? (words[w++] ?? '') : '')
  while (w < words.length) out.push(words[w++]) // extra words → overflow slots
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}
function syllablesToWords(syllables, stanzaId) {
  const kinds = stanzaKindList(stanzaId)
  const out = []
  syllables.forEach((t, i) => {
    if (kinds[i] === undefined || kinds[i] === 'attack') out.push(t)
  })
  return out
}
function rowLyricText(row) {
  return joinSyllables(syllablesToWords(row.syllables, row.stanza))
}
function setRowLyricText(row, text) {
  row.syllables = wordsToSyllables(splitSyllables(text), row.stanza)
}

function addRow() {
  arrangement.value.push({ stanza: activeStanzaId.value || stanzas.value[0].id, label: '', syllables: [], key: '' })
}
function removeRow(i) {
  arrangement.value.splice(i, 1)
  if (!arrangement.value.length) addRow()
  resetLens()
}
function moveRow(i, dir) {
  const to = i + dir
  if (to < 0 || to >= arrangement.value.length) return
  const [r] = arrangement.value.splice(i, 1)
  arrangement.value.splice(to, 0, r)
  resetLens()
}
const stanzaIdOptions = computed(() => stanzas.value.map((s) => ({ value: s.id, label: 'ท่อน ' + s.id })))
const rowKeyOptions = computed(() => [{ value: '', label: 'คีย์เดิม' }, ...KEYS.map((k) => ({ value: k, label: k }))])

// beats per bar vs. time signature — honest: unreadable input is an error, never a pass.
// A line marked "cont" continues the previous line's last bar: those two bars are
// counted as ONE bar (the sheet just broke it at the line end).
const expBeats = computed(() => expectedBeats(opts.timeSignature))
function barTokensAt(li, bi) {
  return lines.value[li]?.bars[bi]?.segments.flatMap((s) => parseNotes(s.note)) ?? []
}
// Total beats across every bar the user flagged as ห้องยก (pickup) in the ACTIVE stanza.
// A pickup (stanza-opening short bar) plus its complementary short final bar should sum
// to a whole number of full bars — so we validate the flagged bars together, not each
// one against the full bar length. Covers non-adjacent pairs (first↔last) that the
// line-level `cont` join can't express (B055).
const pickupTotal = computed(() => {
  let sum = 0
  for (const ln of lines.value) {
    for (const b of ln.bars) {
      if (b.pickup) sum += beatCount(b.segments.flatMap((s) => parseNotes(s.note)))
    }
  }
  return sum
})
function barStatus(li, bi) {
  const line = lines.value[li]
  const bar = line.bars[bi]
  let tokens = bar.segments.flatMap((s) => parseNotes(s.note))
  let hasText = bar.segments.some((s) => s.note.trim())
  let joined = false
  // an explicit pickup bar is counted with its group, not joined to a neighbour
  if (!bar.pickup) {
    if (bi === 0 && line.cont && li > 0) {
      const prev = lines.value[li - 1]
      tokens = [...barTokensAt(li - 1, prev.bars.length - 1), ...tokens]
      joined = true
    } else if (bi === line.bars.length - 1 && lines.value[li + 1]?.cont && !lines.value[li + 1].bars[0]?.pickup) {
      tokens = [...tokens, ...barTokensAt(li + 1, 0)]
      joined = true
    }
  }
  if (joined) hasText = tokens.length > 0
  const pre = joined ? '⤷ ' : ''
  if (!hasText) return { text: 'ว่าง', ok: true }
  const rawTokens = tokens.filter((t) => t.type === 'raw')
  if (rawTokens.length) {
    return { text: `${pre}อ่านไม่ได้: ${rawTokens.map((t) => t.text).join(' ')}`, ok: false }
  }
  const got = beatCount(tokens)
  if (expBeats.value == null) return { text: pre + fmt(got), ok: true }
  // ห้องยก: valid when the flagged bars together fill a whole number of bars.
  if (bar.pickup) {
    const sum = pickupTotal.value
    const mult = sum / expBeats.value
    const ok = sum > 0.01 && Math.abs(mult - Math.round(mult)) < 0.01
    const text = ok
      ? `⤷ ห้องต่อกัน ${fmt(got)} จังหวะ`
      : `⤷ ห้องต่อกัน ${fmt(got)} — รวมห้องต่อกัน ${fmt(sum)}/${fmt(expBeats.value)}`
    return { text, ok, pickup: true }
  }
  const ok = Math.abs(got - expBeats.value) < 0.01
  // a bar that is merely short (not empty, not full) can be a pickup/continuation —
  // surface the quick ห้องยก toggle right here so the fix is discoverable (B055).
  const short = !joined && got > 0.01 && got < expBeats.value - 0.01
  return { text: `${pre}${fmt(got)}/${fmt(expBeats.value)} จังหวะ`, ok, short }
}
function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// ---------- symbol palette ----------
// B033: two rows so the 21 jianpu keys are big enough to tap on mobile — row 1 = numbers
// / rest / dash / tie, row 2 = dots / octave / brackets / accidentals (P'Aim-approved).
const PALETTE = [
  ['1', '2', '3', '4', '5', '6', '7', '0', '-', '~'],
  ['.', "'", '_', '^', '(', ')', '{', '}', '#', 'b', 'n'],
]
let activeInput = null
const activeLine = ref(0) // line the user last touched — target of the floating ▶
function editorFocusIn(e, li) {
  if (li != null) activeLine.value = li
  if (e.target.classList?.contains('note-box') && e.target.tagName === 'INPUT') {
    activeInput = e.target
  }
}
function insertSym(sym) {
  if (!activeInput || !activeInput.isConnected) return
  const start = activeInput.selectionStart ?? activeInput.value.length
  const end = activeInput.selectionEnd ?? start
  activeInput.setRangeText(sym, start, end, 'end')
  activeInput.dispatchEvent(new Event('input', { bubbles: true }))
  activeInput.focus()
}

// ---------- line/bar/segment operations (act on the active stanza) ----------
function addBar(line) {
  line.bars.push(newBar())
}
function removeBar(line, bi) {
  line.bars.splice(bi, 1)
  if (!line.bars.length) line.bars.push(newBar())
}
// Reorder bars (dir -1 = left, +1 = right). Within a line it swaps neighbours; at a line
// edge it HOPS to the adjacent line (B063): the last bar moving right lands at the start
// of the next line, the first bar moving left lands at the end of the previous line — so a
// bar keyed in the wrong line can be walked over without cut/paste. Undo is handled by the
// debounced snapshot watcher, so no explicit history call is needed.
function moveBar(li, bi, dir) {
  const line = lines.value[li]
  if (!line) return
  const to = bi + dir
  if (to >= 0 && to < line.bars.length) {
    const [b] = line.bars.splice(bi, 1)
    line.bars.splice(to, 0, b)
    return
  }
  // past the edge → hop to the neighbouring line. Leaving a line empty would break the
  // "every line has ≥1 bar" invariant, so drop a fresh empty bar in its place (like
  // removeBar). The ⋯ popover is keyed by "li-bi", now stale, so close it.
  if (dir > 0 && bi === line.bars.length - 1) {
    const next = lines.value[li + 1]
    if (!next) return
    const [b] = line.bars.splice(bi, 1)
    next.bars.unshift(b)
    if (!line.bars.length) line.bars.push(newBar())
    barMenuOpen.value = ''
  } else if (dir < 0 && bi === 0) {
    const prev = lines.value[li - 1]
    if (!prev) return
    const [b] = line.bars.splice(bi, 1)
    prev.bars.push(b)
    if (!line.bars.length) line.bars.push(newBar())
    barMenuOpen.value = ''
  }
}
// Duplicate bar bi: drop an exact copy (chords + notes) right after it. Faster than
// re-keying a repeated bar; tweak the copy afterwards.
function duplicateBar(line, bi) {
  const copy = JSON.parse(JSON.stringify(line.bars[bi]))
  line.bars.splice(bi + 1, 0, copy)
}
function removeSegment(bar, si) {
  bar.segments.splice(si, 1)
  if (!bar.segments.length) bar.segments.push(newSegment())
}
function addLine() {
  lines.value.push(newLine())
}
function copyLine(li) {
  const copy = JSON.parse(JSON.stringify(lines.value[li]))
  lines.value.splice(li + 1, 0, copy)
}
function removeLine(li) {
  lines.value.splice(li, 1)
  if (!lines.value.length) lines.value.push(newLine())
}

// ---------- song list / picker ----------
const songList = ref([])

async function loadSongList() {
  const { data } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content')
    .order('number', { ascending: true })
  songList.value = data ?? []
}

const pickerOptions = computed(() => [
  { value: '', label: '— เพลงใหม่ —', search: 'เพลงใหม่ new' },
  ...songList.value.map((s) => ({
    value: s.id,
    label: (s.number != null ? s.number + '. ' : '') + s.title_th,
    search: songHaystack(s),
  })),
])

watch(pickerId, (id) => loadSong(id))

async function loadSong(id) {
  if (!id) return resetForm()
  const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
  if (error || !data) return
  applyRow(data)
  editingId.value = data.id
  currentDraftId.value = null
  reviewingDraft.value = null
  saveMsg.value = ''
  loadRevisions()
  nextTick(resetHistory)
}

// Load a stored song into the editor. v2 songs load directly; v1 songs are migrated
// to v2 on the way in (Claude seeds the syllable split, the author fixes) — any
// segment whose words don't line up with its notes is flagged for manual review.
function applyRow(data) {
  meta.number = data.number
  meta.title_th = data.title_th
  meta.title_en = data.title_en
  // category/theme/verified exist on published songs (not on draft rows) — default when absent
  meta.category = data.category ?? 'anuchon'
  meta.theme = data.theme ?? ''
  verified.value = data.verified ?? false
  const { content, warnings } = migrateToV2(data.content)
  opts.key = content.key || 'C'
  opts.timeSignature = content.timeSignature || '4/4'
  opts.bpm = content.bpm ?? null
  stanzas.value = (content.stanzas || []).map((s) => ({
    id: s.id,
    lines: (s.lines || []).map(deserializeLine),
  }))
  if (!stanzas.value.length) stanzas.value = [{ id: 'A', lines: [newLine()] }]
  arrangement.value = (content.arrangement || []).map((r) => ({
    stanza: r.stanza,
    label: r.label || '',
    syllables: [...(r.syllables || [])],
    key: r.key || '',
  }))
  if (!arrangement.value.length) {
    arrangement.value = [{ stanza: stanzas.value[0].id, label: '', syllables: [], key: '' }]
  }
  activeStanza.value = 0
  activeLine.value = 0
  migrateWarnings.value = warnings
  resetLens()
}

function resetForm() {
  editingId.value = null
  currentDraftId.value = null
  reviewingDraft.value = null
  meta.number = null
  meta.title_th = ''
  meta.title_en = ''
  meta.category = 'anuchon'
  meta.theme = ''
  verified.value = false
  opts.key = 'C'
  opts.timeSignature = '4/4'
  opts.bpm = null
  stanzas.value = [{ id: 'A', lines: [newLine()] }]
  arrangement.value = [{ stanza: 'A', label: '', syllables: [], key: '' }]
  activeStanza.value = 0
  activeLine.value = 0
  migrateWarnings.value = []
  saveMsg.value = ''
  revisions.value = []
  resetLens()
  nextTick(resetHistory)
}

// ---------- drafts ----------
const myDrafts = ref([])
const pendingDrafts = ref([])
const profilesMap = ref({})

async function loadProfilesMap() {
  if (legacy.value || !session.value) return
  const { data } = await supabase.from('profiles').select('id, display_name')
  profilesMap.value = Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name]))
}

async function loadDrafts() {
  myDrafts.value = []
  pendingDrafts.value = []
  if (legacy.value || !session.value) return
  const { data, error } = await supabase
    .from('song_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') legacy.value = true
    return
  }
  const uid = session.value.user.id
  myDrafts.value = (data ?? []).filter((d) => d.author_id === uid && d.status !== 'approved')
  pendingDrafts.value = (data ?? []).filter((d) => d.status === 'pending')
}

function loadDraft(d) {
  applyRow(d)
  editingId.value = d.song_id
  currentDraftId.value = d.id
  reviewingDraft.value = isApprover.value && d.status === 'pending' ? d : null
  reviewComment.value = d.review_comment || ''
  saveMsg.value = d.status === 'rejected' && d.review_comment ? '↩ ถูกส่งกลับ: ' + d.review_comment : ''
  loadRevisions()
  nextTick(resetHistory)
}

const draftRow = () => ({
  song_id: editingId.value,
  number: meta.number || null,
  title_th: meta.title_th.trim(),
  title_en: meta.title_en?.trim() || null,
  content: JSON.parse(JSON.stringify(previewContent.value)),
})

async function saveDraft(status) {
  saveMsg.value = ''
  const row = draftRow()
  if (!row.title_th) {
    saveMsg.value = '⚠️ กรุณาใส่ชื่อเพลงภาษาไทย'
    return
  }
  emit('save', status === 'pending' ? 'pending' : 'draft')
  row.status = status
  // reuse an existing own draft for this song if we did not start from one
  if (!currentDraftId.value && editingId.value) {
    const { data } = await supabase
      .from('song_drafts')
      .select('id')
      .eq('author_id', session.value.user.id)
      .eq('song_id', editingId.value)
      .in('status', ['draft', 'pending', 'rejected'])
      .limit(1)
    if (data?.[0]) currentDraftId.value = data[0].id
  }
  // the store owns the Supabase write (DS-D01); the editor owns which draft it edits
  const { id, error } = await saveDraftRow(row, currentDraftId.value)
  if (id) currentDraftId.value = id
  saveMsg.value = error
    ? '❌ บันทึกไม่สำเร็จ: ' + error.message
    : status === 'pending'
      ? '📨 ส่งตรวจแล้ว — รอผู้อนุมัติ'
      : '💾 บันทึกร่างแล้ว (ยังไม่เผยแพร่)'
  loadDrafts()
}

// ---------- publish (approver) ----------
async function saveDirect() {
  saveMsg.value = ''
  const row = draftRow()
  delete row.song_id
  delete row.status
  // category/theme are columns on `songs` (not on `song_drafts`) — set them only on the
  // published write. draftRow() stays lean so saving a draft never touches these columns.
  row.category = meta.category || 'anuchon'
  row.theme = meta.theme || null
  if (!row.title_th) {
    saveMsg.value = '⚠️ กรุณาใส่ชื่อเพลงภาษาไทย'
    return
  }
  emit('save', 'publish')
  let error
  if (editingId.value) {
    ;({ error } = await supabase.from('songs').update(row).eq('id', editingId.value))
  } else {
    row.author_id = session.value?.user?.id
    const res = await supabase.from('songs').insert(row).select('id').single()
    error = res.error
    if (res.data) editingId.value = res.data.id
  }
  saveMsg.value = error ? '❌ บันทึกไม่สำเร็จ: ' + error.message : '✅ เผยแพร่แล้ว'
  if (!error) {
    // publishing from one's own draft closes that draft
    if (currentDraftId.value && !reviewingDraft.value) {
      await supabase
        .from('song_drafts')
        .update({ status: 'approved', song_id: editingId.value })
        .eq('id', currentDraftId.value)
      currentDraftId.value = null
      loadDrafts()
    }
    loadSongList()
    loadRevisions()
  }
}

async function approve() {
  const d = reviewingDraft.value
  await saveDirect()
  if (saveMsg.value.startsWith('❌') || saveMsg.value.startsWith('⚠️')) return
  await supabase
    .from('song_drafts')
    .update({ status: 'approved', song_id: editingId.value, review_comment: reviewComment.value || null })
    .eq('id', d.id)
  saveMsg.value = '✅ อนุมัติและเผยแพร่แล้ว'
  reviewingDraft.value = null
  currentDraftId.value = null
  loadDrafts()
}

async function reject() {
  const d = reviewingDraft.value
  const { error } = await supabase
    .from('song_drafts')
    .update({ status: 'rejected', review_comment: reviewComment.value || null })
    .eq('id', d.id)
  saveMsg.value = error ? '❌ ' + error.message : '↩ ส่งกลับให้ผู้เขียนแก้แล้ว'
  reviewingDraft.value = null
  currentDraftId.value = null
  loadDrafts()
}

async function deleteSong() {
  if (!editingId.value) return
  if (!window.confirm(`ลบเพลง "${meta.title_th}" ออกจากรายการเพลงถาวร?`)) return
  const { error } = await supabase.from('songs').delete().eq('id', editingId.value)
  saveMsg.value = error ? '❌ ลบไม่สำเร็จ: ' + error.message : '🗑️ ลบแล้ว'
  if (!error) {
    resetForm()
    pickerId.value = ''
    loadSongList()
  }
}

function save() {
  if (legacy.value || (isApprover.value && !reviewingDraft.value)) return saveDirect()
  return saveDraft(reviewingDraft.value ? 'pending' : 'draft')
}

// "✓ ตรวจแล้ว": mark this song as human-checked (songs.verified). The catalog reads this
// flag to show which of the 120 imported songs พี่เปา has already reviewed. Toggles, so a
// mistaken tick can be undone. Writes straight to `songs` (RLS: team/approver write) — the
// song must already be saved, so editingId is required.
async function markVerified() {
  if (!editingId.value) {
    saveMsg.value = '⚠️ บันทึก/เผยแพร่เพลงก่อน จึงกด “ตรวจแล้ว” ได้'
    return
  }
  const next = !verified.value
  const { error } = await supabase.from('songs').update({ verified: next }).eq('id', editingId.value)
  if (error) {
    saveMsg.value = '❌ ทำเครื่องหมายไม่สำเร็จ: ' + error.message
    return
  }
  verified.value = next
  saveMsg.value = next ? '✓ ทำเครื่องหมาย “ตรวจแล้ว”' : '↩ ยกเลิก “ตรวจแล้ว”'
  loadSongList()
}

// ---------- history ----------
const revisions = ref([])
const showHistory = ref(false)

async function loadRevisions() {
  revisions.value = []
  if (legacy.value || !session.value || !editingId.value) return
  const { data, error } = await supabase
    .from('song_revisions')
    .select('*')
    .eq('song_id', editingId.value)
    .order('id', { ascending: false })
    .limit(30)
  if (!error) revisions.value = data ?? []
}

function revName(rev) {
  return profilesMap.value[rev.editor_id] || 'ไม่ทราบชื่อ'
}
function revDiff(rev) {
  return diffSongRows(rev.old_row, rev.new_row)
}
async function restore(rev) {
  if (!rev.new_row) return
  if (!window.confirm('ย้อนเพลงกลับไปเป็นเวอร์ชันนี้?')) return
  const r = rev.new_row
  const { error } = await supabase
    .from('songs')
    .update({ number: r.number, title_th: r.title_th, title_en: r.title_en, content: r.content })
    .eq('id', editingId.value)
  saveMsg.value = error ? '❌ ' + error.message : '⏪ ย้อนเวอร์ชันแล้ว'
  if (!error) loadSong(editingId.value)
}

// ---------- misc ----------
function downloadJson() {
  emit('save', 'json')
  const data = { ...meta, content: JSON.parse(JSON.stringify(previewContent.value)) }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = (meta.title_th || 'song') + '.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

const AUDIO_BLOCKED_MSG = '🔇 อุปกรณ์ปิดเสียงอยู่ — ตรวจปุ่มปิดเสียง/โหมดเงียบของเครื่อง แล้วลองใหม่'
const playingBar = ref(null) // "li-bi" of the bar currently sounding
let playSeq = 0 // invalidates stale playbacks so `playing` can't flip out of sync

function stopAll() {
  stopPlayback()
  playSeq++
  playing.value = false
  playingBar.value = null
}

function followBar(liOffset) {
  return (n) => {
    const key = `${n.li + liOffset}-${n.bi}`
    if (playingBar.value === key) return
    playingBar.value = key
    const el = document.querySelector(`[data-bar="${key}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 90 || r.bottom > window.innerHeight - 110) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }
}

// follow = highlight editor bars (only valid when the played lines ARE the editor's
// active-stanza lines). Full-song play walks the resolved arrangement, whose line
// indices don't map to editor bars, so it plays without highlight.
async function runPlay(content, liOffset, follow = true) {
  if (playing.value) return stopAll()
  const id = ++playSeq
  playing.value = true
  const onNote = follow ? followBar(liOffset) : undefined
  const ok = await playSong(content, { bpm: opts.bpm || 80, onNote })
  if (ok === false) saveMsg.value = AUDIO_BLOCKED_MSG
  if (id === playSeq) {
    playing.value = false
    playingBar.value = null
  }
}

function playStanza() {
  const s = stanzas.value[activeStanza.value]
  return runPlay({ key: opts.key, timeSignature: opts.timeSignature, lines: s.lines.map(serializeLine) }, 0, true)
}
function playFull() {
  return runPlay(resolvedPreview.value, 0, false)
}
function playLine(li) {
  return runPlay({ key: opts.key, lines: [serializeLine(lines.value[li])] }, li, true)
}
function playBar(li, bi) {
  const line = lines.value[li]
  if (!line || !line.bars[bi]) return
  const one = { ...line, bars: [line.bars[bi]], cont: false }
  return runPlay({ key: opts.key, timeSignature: opts.timeSignature, lines: [serializeLine(one)] }, li, false)
}

// ---------- undo / redo ----------
// Debounced JSON snapshots of the whole editing state (meta + opts + stanzas +
// arrangement + which stanza is active).
const history = ref([])
const histPos = ref(-1)
let applyingHistory = false
let histTimer = null

function snapshotState() {
  return JSON.stringify({
    meta: { ...meta },
    opts: { ...opts },
    stanzas: stanzas.value,
    arrangement: arrangement.value,
    activeStanza: activeStanza.value,
  })
}
function commitSnapshot() {
  const snap = snapshotState()
  if (history.value[histPos.value] === snap) return
  history.value.splice(histPos.value + 1) // typing after undo drops the redo tail
  history.value.push(snap)
  if (history.value.length > 100) history.value.shift()
  histPos.value = history.value.length - 1
}
watch(snapshotState, () => {
  if (applyingHistory) return
  clearTimeout(histTimer)
  histTimer = setTimeout(commitSnapshot, 400)
})
function resetHistory() {
  clearTimeout(histTimer)
  history.value = [snapshotState()]
  histPos.value = 0
}
function applyState(snap) {
  applyingHistory = true
  const s = JSON.parse(snap)
  Object.assign(meta, s.meta)
  Object.assign(opts, s.opts)
  stanzas.value = s.stanzas
  arrangement.value = s.arrangement
  activeStanza.value = Math.min(s.activeStanza ?? 0, s.stanzas.length - 1)
  resetLens()
  nextTick(() => (applyingHistory = false))
}
const canUndo = computed(() => histPos.value > 0)
const canRedo = computed(() => histPos.value < history.value.length - 1)
function undo() {
  clearTimeout(histTimer)
  commitSnapshot()
  if (histPos.value > 0) {
    histPos.value--
    applyState(history.value[histPos.value])
  }
}
function redo() {
  if (histPos.value < history.value.length - 1) {
    histPos.value++
    applyState(history.value[histPos.value])
  }
}
function onUndoKeys(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return
  const k = e.key.toLowerCase()
  if (k === 'z') {
    e.preventDefault()
    e.shiftKey ? redo() : undo()
  } else if (k === 'y') {
    e.preventDefault()
    redo()
  }
}
onMounted(() => {
  window.addEventListener('keydown', onUndoKeys)
  resetHistory()
})
onUnmounted(() => window.removeEventListener('keydown', onUndoKeys))

// ---------- floating toolbar + sheet overlay ----------
const showSheet = ref(false)
const primaryLabel = computed(() =>
  reviewingDraft.value ? '✅ อนุมัติ' : isApprover.value ? '✅ เผยแพร่' : '📨 ส่งตรวจ'
)
function primaryAction() {
  if (reviewingDraft.value) return approve()
  if (isApprover.value) return saveDirect()
  return saveDraft('pending')
}

// ---------- dock tool set (edit mode) ----------
// The dock ENGINE (layout · collapse · transparency · pick-your-buttons · dynamic
// overflow · drag) was lifted out to the shared <StudioDock> (ps4 คลื่น 1). Here we only
// declare WHICH buttons the edit dock offers + their handlers; StudioDock owns the rest
// and persists the layout under key `pleng.dock.edit.tools`. Each def carries a `visible`
// guard so a saved layout only ever renders what applies to the current login / role /
// playback state. DS ps3-dock: default drops "บันทึกร่าง" (auto-save covers it) and adds
// "ฟังทั้งเพลง"; "บันทึกร่าง" stays in the registry so it can be re-added via ตั้งค่าปุ่ม.
const DOCK_DEFAULT = ['undo', 'redo', 'play', 'playAll', 'stop', 'send', 'download']
const editDockTools = computed(() => [
  { id: 'undo', icon: 'undo-2', label: 'ย้อน', run: undo, disabled: !canUndo.value },
  { id: 'redo', icon: 'redo-2', label: 'ทำซ้ำ', run: redo, disabled: !canRedo.value },
  { id: 'play', icon: 'play', label: 'ฟังท่อน ' + activeStanzaId.value, run: playStanza, visible: !playing.value },
  { id: 'playAll', icon: 'circle-play', label: 'ฟังทั้งเพลง', run: playFull, visible: !playing.value },
  { id: 'stop', icon: 'square', label: 'หยุด', run: stopAll, visible: playing.value, danger: true },
  { id: 'draft', icon: 'save', label: 'บันทึกร่าง', run: () => saveDraft('draft'), visible: loggedIn.value && !legacy.value },
  { id: 'send', icon: isApprover.value ? 'badge-check' : 'send', label: primaryLabel.value, run: primaryAction, visible: loggedIn.value, prime: true },
  { id: 'download', icon: 'download', label: 'ดาวน์โหลด JSON', run: downloadJson },
])

// dock-core / N1: the dock is mounted ONCE by Studio (no longer here). Push this mode's
// dock config up whenever it changes — the edit tool set, the jianpu key rows, the status
// message, and the note-insert handler (so pressing a key routes back into the focused
// note box). Studio feeds all this into the single shared <StudioDock> while แก้ไข is on.
watch(
  () => ({ tools: editDockTools.value, message: saveMsg.value }),
  ({ tools, message }) =>
    emit('dock', { tools, message, defaultTools: DOCK_DEFAULT, paletteKeys: PALETTE, onInsert: insertSym }),
  { immediate: true },
)

const STATUS_TH = { draft: 'ร่าง', pending: 'รอตรวจ', rejected: 'ถูกส่งกลับ', approved: 'อนุมัติแล้ว' }

// ---------- studio shell (phase 1: header chrome + edit/sheet mode) ----------
// The redesign wraps the EXISTING editor in a Google-Docs-style shell. Phase 1 = the
// single-row top bar (site menu · title · file menu · mode toggle · login) and the
// edit⇄sheet mode. The parts rail / catalog drawer come in phase 2.
const openMenu = shellMenu // shared with the app-wide ShellBar (one menu open at a time)
// This surface is always "the editor"; the shell owns which mode (view/sheet/edit) shows.
// viewMode stays as an internal constant so the editor's existing guards/actions are
// untouched (the several `viewMode.value = 'edit'` calls below are harmless no-ops now).
const viewMode = ref('edit')
function toggleMenu(m) {
  openMenu.value = openMenu.value === m ? null : m
}
function fileNew() {
  openMenu.value = null
  viewMode.value = 'edit'
  pickerId.value = ''
  resetForm()
}
// Close: leave the current song (clear the editor). Confirm if an existing song is
// open so an accidental click can't discard unsaved edits.
function fileClose() {
  openMenu.value = null
  if (editingId.value && !window.confirm('ออกจากเพลงนี้? การแก้ที่ยังไม่ได้บันทึกจะหาย')) return
  viewMode.value = 'edit'
  pickerId.value = ''
  resetForm()
}
function scrollToCard(id) {
  openMenu.value = null
  viewMode.value = 'edit'
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
// ---------- studio shell (phase 2: parts rail / catalog drawer) ----------
// The rail is the song's table of contents: ทำนอง (stanzas) · เนื้อร้อง (arrangement
// rows / ข้อ) · ลำดับเพลง. Desktop = a sticky left column (📖 collapses it); mobile =
// a slide-in drawer (📖 opens it). Clicking an item selects + scrolls to it.
const railHidden = ref(false) // desktop: collapse the rail to full-width content
const drawerOpen = ref(false) // mobile: slide-in drawer

// clean-editor affordances: the busy per-bar controls are tucked away so the strip reads
// like the wireframe. barMenuOpen = "li-bi" of the bar whose tools popover is open (only
// one at a time). (Line structure moved to the header edhead — US E3.)
const barMenuOpen = ref('')
function toggleBarMenu(li, bi) {
  const k = `${li}-${bi}`
  barMenuOpen.value = barMenuOpen.value === k ? '' : k
}
// the per-bar ⋯ tools popover closes when clicking anywhere outside it
function onBarMenuOutside(e) {
  if (!e.target.closest?.('.ed-bar-more-wrap')) barMenuOpen.value = ''
}
watch(barMenuOpen, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onBarMenuOutside), 0)
  else document.removeEventListener('mousedown', onBarMenuOutside)
})
onUnmounted(() => document.removeEventListener('mousedown', onBarMenuOutside))
function isMobileView() {
  return window.matchMedia('(max-width: 760px)').matches
}
function toggleCatalog() {
  if (isMobileView()) drawerOpen.value = !drawerOpen.value
  else railHidden.value = !railHidden.value
}
function closeDrawer() {
  drawerOpen.value = false
}
function scrollToEl(id, block = 'start') {
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block }))
}
function railSelectStanza(i) {
  viewMode.value = 'edit'
  selectStanza(i)
  closeDrawer()
  scrollToEl('pk-editor')
}
function railSelectRow(i) {
  viewMode.value = 'edit'
  const row = arrangement.value[i]
  const s = stanzas.value.findIndex((x) => x.id === row.stanza)
  if (s >= 0) selectStanza(s) // resets the lens via the activeStanzaId watcher…
  closeDrawer()
  // …so set THIS verse as the lens after the reset flushes (master-detail sync: picking a
  // ข้อ in the rail shows its words under the notes + scrolls to the notes, not far below)
  nextTick(() => {
    lensChoice.value = i
    scrollToEl('pk-editor')
  })
}
function railGoArrange() {
  viewMode.value = 'edit'
  closeDrawer()
  scrollToEl('pk-arrange')
}
function rowLabel(row, i) {
  return row.label?.trim() || 'ข้อ ' + (i + 1)
}
// verse options for the breadcrumb's ข้อ selector (clean labels, no "ข้อ ข้อ" doubling)
const edLyrOptions = computed(() => [
  { value: -1, label: '— ซ่อนเนื้อ —' },
  ...lensRowsForActiveStanza.value.map((x) => ({ value: x.i, label: rowLabel(x.r, x.i) })),
])

// ---------- edit header (edhead — prototype ps2 §③) ----------
// The header is a BREADCRUMB that opens the rail (the rail is the only navigation — no
// duplicate ท่อน/ข้อ dropdowns: B031/B003/E1) + in-context help + layout/preview toggles
// + line-level quick structure. Everything structural is line-level; a bar keeps only its
// ▶ + ดูผล (US E3). The model still stores repeat/volta per bar (v2) — UI just sets lines.
const showTip = ref(false) // (i) how-to blurb (was always-on; now on demand like the proto)
const showLegend = ref(false) // (?) symbol legend
const barLayout = ref('flow') // default = ห้องต่อกัน (B048) · 'stack' = 1 ห้อง/แถว · 'flow' = ต่อกัน (B035)
const lineMoreOpen = ref(false) // ⋯ advanced settings for the active line (Fine/D.C. · ต่อห้อง · ชื่อ)

// breadcrumb text: "ท่อน A · ข้อ 1" — shows position only; selecting happens in the rail
const crumbLabel = computed(() => {
  const mel = 'ท่อน ' + activeStanzaId.value
  return lensActive.value ? mel + ' · ' + rowLabel(lensRow.value, lensChoice.value) : mel
})

// quick structure acts on the ACTIVE line (the one last focused; selectStanza resets to 0)
function curLine() {
  return lines.value[activeLine.value] || null
}
function qHook() {
  const l = curLine()
  if (l) l.marker = l.marker ? '' : '***'
}
// "ซ้ำ" wraps the whole active line in repeat marks — the model keeps them per bar (‖: on
// the first bar, :‖ on the last), toggling off if the line is already wrapped.
function qRepeat() {
  const l = curLine()
  if (!l || !l.bars.length) return
  const first = l.bars[0]
  const last = l.bars[l.bars.length - 1]
  const on = first.repeatStart && last.repeatEnd
  first.repeatStart = !on
  last.repeatEnd = !on
}
function qCopyLine() {
  copyLine(activeLine.value)
}
function qDeleteLine() {
  if (!curLine()) return
  if (!window.confirm(`ลบบรรทัด ${activeLine.value + 1} ทั้งบรรทัด?`)) return
  removeLine(activeLine.value)
  activeLine.value = Math.min(activeLine.value, lines.value.length - 1)
  lineMoreOpen.value = false
}
const curLineHook = computed(() => !!curLine()?.marker)
const curLineRepeat = computed(() => {
  const l = curLine()
  return !!(l && l.bars.length && l.bars[0].repeatStart && l.bars[l.bars.length - 1].repeatEnd)
})
function toggleLineMore() {
  lineMoreOpen.value = !lineMoreOpen.value
}
function onLineMoreOutside(e) {
  if (!e.target.closest?.('.ed-more-wrap')) lineMoreOpen.value = false
}
watch(lineMoreOpen, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onLineMoreOutside), 0)
  else document.removeEventListener('mousedown', onLineMoreOutside)
})
onUnmounted(() => document.removeEventListener('mousedown', onLineMoreOutside))

// ---------- whole-song preview (ดูผลทั้งเพลง) + per-bar ดูผล (B035) ----------
// Each bar flips between the edit grid and a clean jianpu render (ดูผล — REPLACES the grid,
// never stacks a second row). The header master flips every bar of the active stanza at
// once; its label is authoritative — it reflects whether all bars are currently rendered.
const shownBars = ref({}) // key "li-bi" -> true when that bar shows its render
function barShown(li, bi) {
  return !!shownBars.value[`${li}-${bi}`]
}
function toggleBarShown(li, bi) {
  const k = `${li}-${bi}`
  shownBars.value = { ...shownBars.value, [k]: !shownBars.value[k] }
}
function allBarKeys() {
  const out = []
  lines.value.forEach((line, li) => line.bars.forEach((_, bi) => out.push(`${li}-${bi}`)))
  return out
}
const allShown = computed(() => {
  const keys = allBarKeys()
  return keys.length > 0 && keys.every((k) => shownBars.value[k])
})
function toggleShowAll() {
  const on = !allShown.value
  const next = {}
  if (on) for (const k of allBarKeys()) next[k] = true
  shownBars.value = next
}
// a bar's clean render: a one-line, one-bar content object the SongSheet can draw. Words
// come from the lens verse (if shown) so the render matches what the singer sees.
function barContent(li, bi) {
  const line = lines.value[li]
  if (!line || !line.bars[bi]) return { key: opts.key, lines: [] }
  const isFirst = bi === 0
  const isLast = bi === line.bars.length - 1
  // Each bar renders as its own mini-sheet, so line-level heads/tails must NOT repeat:
  // section + hook marker show only on the first bar, จบเพลง/ป้าย only on the last —
  // otherwise the "♦ ร้อง 1" head stamps every box (B051).
  const one = {
    ...line,
    bars: [line.bars[bi]],
    cont: false,
    section: isFirst ? line.section : '',
    marker: isFirst ? line.marker : '',
    end: isLast ? line.end : false,
    label: isLast ? line.label : '',
  }
  const serial = serializeLine(one)
  // Show the selected verse's words under the notes so the preview matches the sung
  // sheet (B050) — a melody stanza carries no lyric of its own, so pull this bar's
  // slice from the lens row at its global slot offset (same mapping as resolveContent).
  if (lensActive.value && lensRow.value) {
    let slot = slotStarts.value[`${li}-${bi}-0`] ?? 0
    for (const item of serial) {
      if (item.type === 'segment') {
        const n = syllableSlots(item.note || '')
        const slots = lensRow.value.syllables.slice(slot, slot + n)
        item.lyric = joinSyllables(slots)
        item.syllables = slots
        slot += n
      }
    }
  }
  return { version: 2, key: opts.key, timeSignature: opts.timeSignature, lines: [serial] }
}
// B061: the live inline preview above each line's edit strip — the SAME jianpu the sheet
// draws (octave dots · held dashes · ties), rendered from the current line as you type, no
// button. Reuses serializeLine + the shown verse's words exactly like barContent, but for
// the whole line at once so it reads like the printed sheet. Read-only; the boxes below stay
// the edit surface. livePreview lets a small screen turn the strip off (default on).
const livePreview = ref(true)
const settingsOpen = ref(true) // B060: inline song-settings card, open by default
function lineHasNotes(li) {
  const line = lines.value[li]
  return !!line && line.bars.some((b) => b.segments.some((s) => (s.note || '').trim()))
}
function lineContent(li) {
  const line = lines.value[li]
  if (!line) return { version: 2, key: opts.key, timeSignature: opts.timeSignature, lines: [] }
  const serial = serializeLine(line)
  // segment items in `serial` follow model bar/segment order, so zip them with the line's
  // (bi, si) coords to pull each segment's words from the shown verse at its global slot.
  if (lensActive.value && lensRow.value) {
    const coords = []
    line.bars.forEach((bar, bi) => bar.segments.forEach((_, si) => coords.push([bi, si])))
    let ci = 0
    for (const item of serial) {
      if (item.type !== 'segment') continue
      const [bi, si] = coords[ci++] ?? []
      if (bi == null) continue
      const start = slotStarts.value[`${li}-${bi}-${si}`] ?? 0
      const n = syllableSlots(item.note || '')
      const slots = lensRow.value.syllables.slice(start, start + n)
      item.lyric = joinSyllables(slots)
      item.syllables = slots
    }
  }
  return { version: 2, key: opts.key, timeSignature: opts.timeSignature, lines: [serial] }
}

// dropping the lens/stanza switch also clears any stale per-bar renders so the fresh
// stanza starts in edit mode (indices would otherwise point at the wrong bars)
watch([activeStanza, lines], () => {
  shownBars.value = {}
})

// ---------- studio shell (phase 4: menus/panels) ----------
// Set-once / occasional things live in menus now (เพลง = New/Open/Properties,
// จัดการ = drafts/history/download/delete) opened as panels, so the editor page
// stays as clean as the wireframe.
const activePanel = ref(null) // 'open' | 'properties' | 'history' | 'drafts'
const pendingPick = ref('') // Open dialog: the song chosen, applied only on "เปิดเพลง"
function openPanel(p) {
  openMenu.value = null
  viewMode.value = 'edit'
  if (p === 'history') loadRevisions()
  if (p === 'open') pendingPick.value = pickerId.value
  activePanel.value = p
}
function closePanel() {
  activePanel.value = null
}
// Open dialog OK: apply the pick (the pickerId watcher loads it; '' = เพลงใหม่)
function confirmOpen() {
  pickerId.value = pendingPick.value
  closePanel()
}
function manageDownload() {
  openMenu.value = null
  downloadJson()
}
// bring back a previously downloaded JSON to keep editing (the anonymous "save")
function manageUpload() {
  openMenu.value = null
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'application/json,.json'
  inp.onchange = async () => {
    const file = inp.files && inp.files[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      applyRow({
        number: data.number ?? null,
        title_th: data.title_th || '',
        title_en: data.title_en || '',
        content: data.content || data,
      })
      editingId.value = null
      currentDraftId.value = null
      viewMode.value = 'edit'
      saveMsg.value = '📂 โหลดไฟล์ JSON แล้ว — แก้ต่อได้เลย'
      nextTick(resetHistory)
    } catch {
      saveMsg.value = '❌ ไฟล์ JSON ไม่ถูกต้อง'
    }
  }
  inp.click()
}
function manageDelete() {
  openMenu.value = null
  deleteSong()
}
// NOTE: the editor strip itself is the read+edit surface (note boxes + a lyric box under
// each note, aligned). We tried a separate per-line sheet preview above it (US-D05) but it
// duplicated the strip and pushed the boxes off-screen — removed per พี่เอม. Full-song
// sheet is still the 🎼 mode button.
const panelTitle = computed(
  () =>
    ({ open: 'เลือกเพลงเพื่อแก้', properties: 'ตั้งค่าเพลง', history: 'ประวัติการแก้ไข', drafts: 'งานร่าง / รอตรวจ' })[
      activePanel.value
    ] || '',
)

// ---------- mode contract wiring (DS-04) — kept last: depends on the editing state above ----------
// The shell hands us the current song. Load it into the editor whenever a genuinely new
// one arrives (route navigation / shell load) — NOT on our own edits (props.song is fed
// from the shell's loadedSong, which changes only on load, so there is no echo loop).
watch(
  () => props.song,
  (s) => {
    if (!s) return
    applyRow(s)
    editingId.value = s.id ?? null
    currentDraftId.value = null
    reviewingDraft.value = null
    saveMsg.value = ''
    loadRevisions()
    nextTick(resetHistory)
  },
  { immediate: true },
)

// Broadcast every edit upward so the shell's central song (and the ดู/แผ่น previews) stay
// in sync — this is what makes "switch mode, work is not lost" true.
const songOut = computed(() => ({
  id: editingId.value,
  number: meta.number,
  title_th: meta.title_th,
  title_en: meta.title_en,
  content: previewContent.value,
}))
watch(songOut, (s) => emit('change', s), { immediate: true })

// Surfaced for US-D01 unit tests (save a draft · reopen an existing draft to continue).
// These are the same functions the dock button / drafts panel call — exposing them lets
// the AC be asserted without reaching through teleported chrome.
defineExpose({ saveDraft, loadDraft, meta, editingId, currentDraftId, previewContent })
</script>

<template>
  <div style="padding-bottom: 150px">
    <!-- editor chrome teleported into the app-wide ShellBar — only while this mode is on
         (the shell owns the mode toggle + the static title for view/sheet) -->
    <Teleport to="#shell-title">
      <template v-if="editing">
        <span class="sb-sep" aria-hidden="true"></span>
        <input v-model="meta.title_th" class="sb-title" placeholder="ชื่อเพลง" aria-label="ชื่อเพลง" />
      </template>
    </Teleport>
    <Teleport to="#shell-menus">
      <div v-if="editing" class="sb-menu">
        <button class="sb-text" :aria-expanded="openMenu === 'file'" aria-haspopup="true" @click.stop="toggleMenu('file')">เพลง</button>
        <div v-if="openMenu === 'file'" class="sb-dropdown" role="menu">
          <button class="sb-item" role="menuitem" @click="fileNew"><Icon name="file-plus" /> สร้างเพลงใหม่ <span class="sb-k">New</span></button>
          <button class="sb-item" role="menuitem" @click="openPanel('open')"><Icon name="folder-open" /> เลือกเพลงเพื่อแก้… <span class="sb-k">Open</span></button>
          <button class="sb-item" role="menuitem" @click="fileClose"><Icon name="x" /> ออกจากเพลงนี้ <span class="sb-k">Close</span></button>
          <!-- "ตั้งค่าเพลง" เอาออกจากเมนู (P'Aim 10 ก.ค.) — ซ้ำกับการ์ด inline #pk-settings (B060) -->
        </div>
      </div>
      <div v-if="editing" class="sb-menu">
        <button class="sb-text" :aria-expanded="openMenu === 'manage'" aria-haspopup="true" @click.stop="toggleMenu('manage')">จัดการ</button>
        <div v-if="openMenu === 'manage'" class="sb-dropdown" role="menu">
          <button class="sb-item" role="menuitem" @click="manageDownload"><Icon name="download" /> ดาวน์โหลด JSON</button>
          <button class="sb-item" role="menuitem" @click="manageUpload"><Icon name="folder-open" /> อัปโหลด JSON</button>
          <template v-if="loggedIn && !legacy">
            <div class="sep"></div>
            <button class="sb-item" role="menuitem" @click="openPanel('drafts')"><Icon name="file-text" /> งานร่าง / รอตรวจ</button>
            <button v-if="editingId" class="sb-item" role="menuitem" @click="openPanel('history')"><Icon name="undo-2" /> ประวัติการแก้ไข</button>
          </template>
          <button v-if="isApprover && loggedIn && editingId && !reviewingDraft" class="sb-item sb-danger" role="menuitem" @click="manageDelete"><Icon name="x" /> ลบเพลง</button>
        </div>
      </div>
    </Teleport>

    <!-- ===== edit workspace: parts rail + the existing editor (unchanged) ===== -->
    <div v-show="viewMode === 'edit'" class="studio-app" :class="{ 'rail-hidden': railHidden }">
      <nav id="studioRail" class="rail" :class="{ open: drawerOpen }" aria-label="ส่วนของเพลง">
        <div class="rail-mhead">
          <span><Icon name="list-music" :size="18" /> ส่วนของเพลง</span>
          <button class="rail-x" aria-label="ปิด" @click="closeDrawer"><Icon name="x" :size="16" /></button>
        </div>
        <div class="rail-group">ทำนอง</div>
        <!-- each row = a select button + a delete (B032) — a wrapper, so no nested buttons -->
        <div v-for="(s, si) in stanzas" :key="s.id" class="rail-rowwrap mel" :class="{ sel: si === activeStanza }">
          <button class="rail-row" @click="railSelectStanza(si)"><Icon name="music" :size="17" /> ท่อน {{ s.id }}</button>
          <button v-if="stanzas.length > 1" class="rail-del" title="ลบทำนองนี้" aria-label="ลบท่อนทำนองนี้" @click.stop="removeStanza(si)"><Icon name="trash-2" :size="14" /></button>
        </div>
        <button class="rail-row add" @click="addStanza(); closeDrawer()"><Icon name="plus" :size="16" /> เพิ่มทำนอง</button>
        <div class="rail-group">เนื้อร้อง</div>
        <div v-for="(row, ri) in arrangement" :key="ri" class="rail-rowwrap lyr" :class="{ sel: ri === lensChoice }">
          <button class="rail-row" @click="railSelectRow(ri)"><Icon name="file-text" :size="17" /> {{ rowLabel(row, ri) }}</button>
          <button v-if="arrangement.length > 1" class="rail-del" title="ลบข้อนี้" aria-label="ลบข้อเนื้อร้องนี้" @click.stop="removeRow(ri)"><Icon name="trash-2" :size="14" /></button>
        </div>
        <button class="rail-row add" @click="addRow(); closeDrawer()"><Icon name="plus" :size="16" /> เพิ่มเนื้อ</button>
        <div class="rail-sep"></div>
        <div class="rail-group">ขั้นสูง</div>
        <button class="rail-row arr" @click="railGoArrange"><Icon name="list-ordered" :size="17" /> ลำดับเพลง</button>
      </nav>
      <div class="rail-backdrop" :class="{ open: drawerOpen }" aria-hidden="true" @click="closeDrawer"></div>
      <div class="content">
    <!-- B060: song settings inline. These used to hide in the "เพลง ▾ ▸ ตั้งค่า" menu, which
         พี่เปา avoided (afraid a menu would switch the page). Now every field sits right on
         the sheet being edited. "✓ ตรวจแล้ว" marks the song human-checked (catalog reads it). -->
    <div id="pk-settings" class="card ed-settings no-print">
      <div class="ed-settings-head">
        <button class="ed-settings-toggle" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">
          <Icon name="settings" :size="16" /> ตั้งค่าเพลง
          <Icon name="chevron-down" :size="15" :class="{ 'ed-chev-open': settingsOpen }" />
        </button>
        <span class="ed-grow"></span>
        <button
          v-if="loggedIn"
          class="ed-verify"
          :class="{ on: verified }"
          :aria-pressed="verified"
          :title="verified ? 'ตรวจแล้ว — กดเพื่อยกเลิก' : 'ทำเครื่องหมายว่าตรวจเพลงนี้แล้ว'"
          @click="markVerified"
        >
          <Icon :name="verified ? 'badge-check' : 'check'" :size="15" /> {{ verified ? 'ตรวจแล้ว' : 'ตรวจแล้ว?' }}
        </button>
      </div>
      <div v-if="settingsOpen" class="ed-settings-grid">
        <label>เลขเพลง<input v-model.number="meta.number" type="number" placeholder="เลขเพลง" /></label>
        <label>ชื่อเพลง (ไทย)<input v-model="meta.title_th" placeholder="ชื่อเพลง (ไทย)" /></label>
        <label>ชื่อเพลง (อังกฤษ)<input v-model="meta.title_en" placeholder="ถ้ามี" /></label>
        <label>คีย์<ComboSelect v-model="opts.key" :options="KEYS" width="100%" /></label>
        <label>จังหวะ<ComboSelect v-model="opts.timeSignature" :options="TIME_SIGNATURES" allow-custom width="100%" /></label>
        <label>ความเร็ว (BPM)<input v-model.number="opts.bpm" type="number" min="30" max="240" placeholder="BPM" /></label>
        <label>ธีม<ComboSelect v-model="meta.theme" :options="themeOptions" width="100%" /></label>
        <label>หมวด<ComboSelect v-model="meta.category" :options="CATEGORY_OPTIONS" allow-custom width="100%" /></label>
      </div>
    </div>

    <!-- review banner (contextual — while an approver is reviewing a draft) -->
    <div v-if="reviewingDraft" class="card review-banner no-print">
      <strong>🔍 กำลังตรวจฉบับร่างของ {{ profilesMap[reviewingDraft.author_id] || '?' }}</strong>
      <span class="muted"> — แก้ไขในฟอร์มด้านล่างได้ก่อนอนุมัติ</span>
      <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; align-items: center">
        <button @click="approve">✅ อนุมัติและเผยแพร่</button>
        <button class="danger" @click="reject">↩ ส่งกลับให้แก้</button>
        <input v-model="reviewComment" placeholder="ความเห็นถึงผู้เขียน (ถ้ามี)" style="flex: 1; min-width: 200px" />
      </div>
    </div>

    <!-- picker → "เพลง › Open" panel · metadata → "เพลง › Properties" panel (below) -->

    <!-- migrate notice: v1 song auto-split into v2, some rows need a human check -->
    <div v-if="migrateWarnings.length" class="card no-print migrate-note">
      <strong>⚠️ แปลงจากรูปแบบเดิม (v1) — ตรวจ {{ migrateWarnings.length }} จุดที่พยางค์ไม่พอดีโน้ต</strong>
      <ul class="muted" style="margin: 6px 0 0 18px">
        <li v-for="(w, i) in migrateWarnings" :key="i">
          โน้ต "{{ w.note }}" ต้องการ {{ w.slots }} พยางค์ แต่เนื้อ "{{ w.lyric }}" มี {{ w.got }} — แก้ในกล่องใต้โน้ต หรือแผง “📝 แก้เนื้อแบบย่อหน้า”
        </li>
      </ul>
    </div>

    <!-- ===== edit header (edhead) — ps2 prototype §③: breadcrumb OPENS the rail (the rail
         is the only navigation, no duplicate ท่อน/ข้อ dropdowns · B031/B003/E1) · in-context
         help · layout / whole-song-preview toggles · line-level quick structure ===== -->
    <div id="pk-editor" class="edhead no-print">
      <button
        class="ed-crumb"
        aria-label="เปิดแถบองค์ประกอบเพลง (ทำนอง·เนื้อ·ลำดับ)"
        title="องค์ประกอบเพลง — เลือกท่อน/ข้อจากแถบซ้าย"
        @click.stop="toggleCatalog"
      >
        <Icon name="panel-left-open" :size="17" /> <span class="ed-crumb-t">{{ crumbLabel }}</span>
      </button>
      <button class="ed-ico" :class="{ on: showTip }" title="วิธีใช้โต๊ะแก้" aria-label="วิธีใช้โต๊ะแก้" @click="showTip = !showTip"><Icon name="info" :size="16" /></button>
      <button class="ed-ico" :class="{ on: showLegend }" title="ความหมายสัญลักษณ์โน้ต" aria-label="ความหมายสัญลักษณ์โน้ต" @click="showLegend = !showLegend"><Icon name="circle-help" :size="16" /></button>
      <span class="ed-grow"></span>
      <div class="ed-lay" role="group" aria-label="เค้าโครงห้อง">
        <button :class="{ on: barLayout === 'stack' }" :aria-pressed="barLayout === 'stack'" @click="barLayout = 'stack'">1 ห้อง/แถว</button>
        <button :class="{ on: barLayout === 'flow' }" :aria-pressed="barLayout === 'flow'" @click="barLayout = 'flow'">ต่อกัน</button>
      </div>
      <button class="ed-chip" :class="{ act: allShown }" title="แสดง/ซ่อน โน้ตแบบแผ่นเพลงทั้งเพลง" @click="toggleShowAll">
        <Icon :name="allShown ? 'pencil' : 'music'" :size="15" /> {{ allShown ? 'กลับไปแก้ทั้งเพลง' : 'ดูผลทั้งเพลง' }}
      </button>
      <button class="ed-chip" :class="{ act: livePreview }" :aria-pressed="livePreview" title="แสดงตัวอย่างโน้ตสดเหนือแต่ละบรรทัด (อัปเดตขณะพิมพ์)" @click="livePreview = !livePreview">
        <Icon name="eye" :size="15" /> ตัวอย่างสด
      </button>
      <button class="ed-ico" title="ฟังท่อนนี้" aria-label="ฟังท่อนนี้" @click="playStanza"><Icon name="play" :size="16" /></button>
      <span class="ed-quick" aria-label="โครงเพลงด่วน (บรรทัดที่กำลังแก้)">
        <button class="ed-ico" :class="{ on: curLineHook }" title="ทำเครื่องหมายท่อนฮุกให้บรรทัดที่กำลังแก้" aria-label="ท่อนฮุก" @click="qHook"><Icon name="fishing-hook" :size="16" /></button>
        <button class="ed-ico" :class="{ on: curLineRepeat }" title="เล่นซ้ำบรรทัดที่กำลังแก้ ‖: :‖" aria-label="เล่นซ้ำบรรทัด" @click="qRepeat"><Icon name="repeat" :size="16" /></button>
        <button class="ed-ico" title="คัดลอกบรรทัดที่กำลังแก้" aria-label="คัดลอกบรรทัด" @click="qCopyLine"><Icon name="copy" :size="16" /></button>
        <button class="ed-ico danger-ic" title="ลบบรรทัดที่กำลังแก้" aria-label="ลบบรรทัด" @click="qDeleteLine"><Icon name="trash-2" :size="16" /></button>
      </span>
      <span class="ed-more-wrap">
        <button class="ed-ico" :class="{ on: lineMoreOpen }" :aria-expanded="lineMoreOpen" title="เพิ่มเติม — ชื่อบรรทัด · ต่อห้อง · ป้าย (Fine/D.C.)" aria-label="เพิ่มเติม" @click.stop="toggleLineMore"><Icon name="ellipsis" :size="16" /></button>
        <div v-if="lineMoreOpen && curLine()" class="ed-more-menu" role="menu">
          <div class="ed-more-title">บรรทัด {{ activeLine + 1 }}</div>
          <input v-model="curLine().section" class="ed-opt-input" placeholder="ชื่อบรรทัด (เว้นว่างได้)" aria-label="ชื่อกำกับบรรทัดนี้" />
          <label v-if="activeLine > 0" class="ed-opt-check"><input v-model="curLine().cont" type="checkbox" /> ⤷ ต่อห้องจากบรรทัดก่อน</label>
          <!-- B056: "จบเพลง" ยกออกไปเป็นปุ่มเห็นชัดในหัวแต่ละบรรทัด (ed-line-end) แล้ว -->
          <input v-model="curLine().label" class="ed-opt-input" placeholder="ป้าย เช่น Fine, D.C. al Fine" aria-label="ข้อความกำกับท้ายบรรทัด" />
        </div>
      </span>
    </div>
    <!-- (?) legend + (i) how-to — in-context help, hidden until asked (prototype) -->
    <div v-if="showLegend" class="ed-legend no-print">
      <span><b>1–7</b> ระดับเสียง</span><span><b>5'</b> จุดบน=สูงทบ</span><span><b>.5</b> จุดล่าง=ต่ำทบ</span>
      <span><b>5_</b> ขีดใต้=เขบ็ต</span><span><b>5.</b> จุดขวา=เพิ่มครึ่ง</span><span><b>6~6</b> โค้ง=เอื้อน</span>
      <span><b>–</b> ลากเสียง</span><span><b>|</b> เส้นแบ่งห้อง</span>
    </div>
    <p v-if="showTip" class="muted no-print ed-tip">
      พิมพ์โน้ตในช่อง — <b>1 ช่อง = 1 โน้ต</b> · กด <b>Enter</b>/<b>เว้นวรรค</b> ขึ้นช่องถัดไป · <b>← →</b> เลื่อนช่อง ·
      จุด/ขีด/เครื่องหมายอื่นแตะช่องแล้วจิ้มปุ่มแถบล่าง · แต่ละห้องกด “ดูผล” เห็นแบบแผ่นเพลง ·
      เนื้อร้องพิมพ์ในกล่องใต้โน้ต หรือแผง “📝 แก้เนื้อแบบย่อหน้า” (เลือกข้อจากแถบซ้าย)
      <router-link class="pk-info" style="margin-left: 6px" :to="{ path: '/guide', hash: '#notation' }" aria-label="คู่มือโน้ตตัวเลข">เปิดคู่มือ →</router-link>
    </p>
    <p v-if="lensActive" class="muted no-print" style="margin: 0 0 8px">
      พิมพ์คำร้องในช่องใต้โน้ต · ช่องสีแดง = ยังไม่ได้ใส่คำ · ช่องเส้นประ = โน้ตลากเสียง (เว้นว่างได้ หรือใส่ “-”)
    </p>

    <!-- line editor (edits the ACTIVE stanza) — clean strip like the wireframe: the
         busy per-line / per-bar controls are tucked behind ⋯ so the notes read first,
         but every one of them is still here (revealed on tap, never removed) -->
    <div
      v-for="(line, li) in lines"
      :key="`${activeStanzaId}-${li}`"
      class="ed-line"
      :class="{ 'line-active': li === activeLine }"
      @focusin="editorFocusIn($event, li)"
    >
      <div class="ed-line-head no-print">
        <strong class="ed-line-no">บรรทัด {{ li + 1 }}</strong>
        <span v-if="line.section" class="ed-line-tag">{{ line.section }}</span>
        <span v-if="line.marker" class="ed-line-tag">*** ฮุก</span>
        <span v-if="line.cont" class="ed-line-tag">⤷ ต่อห้อง</span>
        <span v-if="line.label" class="ed-line-tag">{{ line.label }}</span>
        <span class="ed-line-actions">
          <!-- B056: "จบเพลง" — ปุ่มเห็นชัดต่อบรรทัด (ยกออกจาก ⋯) · เปิด = เส้นจบเพลง (final
               barline) สำหรับเพลงที่ไม่มีย้อนซ้ำ · ไม่ผูก repeat/volta -->
          <button
            class="ed-line-end"
            :class="{ on: line.end }"
            :aria-pressed="line.end"
            title="จบเพลง — ทำเส้นจบเพลง (สำหรับเพลงที่ไม่มีย้อนซ้ำ)"
            aria-label="ทำเครื่องหมายจบเพลงที่บรรทัดนี้"
            @click="line.end = !line.end"
          >‖ จบเพลง</button>
          <button class="ed-mini" title="ฟังบรรทัดนี้" aria-label="ฟังบรรทัดนี้" @click="playLine(li)"><Icon name="play" :size="14" /></button>
        </span>
      </div>
      <!-- B061: live jianpu preview of this line — the SAME render the sheet draws, updating
           as you type (read-only; the edit boxes are below). Skipped while the line is still
           empty so a blank preview never shows. Toggle off via "ตัวอย่างสด" in the header. -->
      <div v-if="livePreview && lineHasNotes(li)" class="ed-line-live no-print" aria-label="ตัวอย่างโน้ตบรรทัดนี้ (อ่านอย่างเดียว)">
        <SongSheet :content="lineContent(li)" mode="full" chord-system="letter" :display-key="opts.key" />
      </div>
      <!-- line structure (ชื่อ · ฮุก · ต่อห้อง · จบเพลง · ป้าย · สำเนา · ลบ) now lives in the
           header quick-struct + ⋯, acting on the focused line — US E3 "all structure is
           line-level in the header; a bar keeps only ▶ + ดูผล". The tags above echo state. -->
      <!-- the strip: bars flow left→right with a drawn barline between them. This IS the
           read+edit surface — note boxes (ripple) with a lyric box under each note (ripple),
           aligned in one column, chords on top. No separate sheet preview (would duplicate
           this and overflow the screen). -->
      <div class="ed-strip" :class="'lay-' + barLayout">
        <template v-for="(bar, bi) in line.bars" :key="bi">
          <span v-if="bi > 0" class="ed-barline" aria-hidden="true"></span>
          <div
            class="ed-bar"
            :class="{ 'bar-playing': playingBar === `${li}-${bi}` }"
            :data-bar="`${li}-${bi}`"
          >
            <!-- one column per note: chord on top, note box, then the syllable box
                 directly under its note (edit everything here — no duplicate preview) -->
            <div v-if="!barShown(li, bi)" class="seg-strip">
              <div v-for="(seg, si) in bar.segments" :key="si" class="seg-col">
                <div class="chord-row">
                  <span v-for="p in noteBoxCount(seg.note)" :key="'c' + (p - 1)" class="chord-cell">
                    <ComboSelect
                      v-if="chordEditing(li, bi, si, p - 1)"
                      :model-value="p - 1 === 0 ? seg.chord : ''"
                      :options="p - 1 === 0 ? chordPickOpts : chordOpts"
                      placeholder="คอร์ด"
                      aria-label="เลือกคอร์ด"
                      width="120px"
                      class="chord-pick"
                      autofocus
                      @update:model-value="applyChordAt(bar, si, p - 1, $event)"
                    />
                    <button
                      v-else
                      class="chord-btn"
                      :class="p - 1 === 0 && seg.chord ? 'chord-set' : 'chord-add'"
                      :aria-label="p - 1 === 0 ? 'คอร์ดของช่วงนี้' : 'ใส่คอร์ดที่โน้ตนี้'"
                      @click="openChord(li, bi, si, p - 1)"
                    >{{ p - 1 === 0 && seg.chord ? seg.chord : '+' }}</button>
                  </span>
                </div>
                <NoteBoxes v-model="seg.note" />
                <span v-if="lensActive" class="syl-boxes">
                  <span v-for="(cell, bx) in sylCells(li, bi, si, seg.note)" :key="bx" class="syl-slot">
                    <template v-if="cell.slot !== null">
                      <span v-if="focusedSlot === cell.slot" class="slot-tools">
                        <button class="secondary slot-btn" aria-label="ดึงคำมาซ้าย (ลบช่องนี้)" title="ดึงคำมาซ้าย (ลบช่องนี้)" @mousedown.prevent @click="pullSlot(cell.slot)">◀</button>
                        <button class="secondary slot-btn" aria-label="ดันคำไปขวา (แทรกช่องว่าง)" title="ดันคำไปขวา (แทรกช่องว่าง)" @mousedown.prevent @click="pushSlot(cell.slot)">▶</button>
                      </span>
                      <input
                        class="syl-box"
                        :class="{ 'syl-empty': !cell.held && !sylAt(lensRow, cell.slot), 'syl-held': cell.held }"
                        :value="sylAt(lensRow, cell.slot)"
                        :data-slot="cell.slot"
                        :placeholder="cell.held ? '-' : ''"
                        :aria-label="cell.held ? `โน้ตลากเสียง ช่องที่ ${cell.slot + 1} (เว้นว่างได้)` : `พยางค์ที่ ${cell.slot + 1}`"
                        @focus="focusedSlot = cell.slot"
                        @blur="focusedSlot = -1"
                        @keydown="onSylKey($event, cell.slot)"
                        @input="setSyl(lensRow, cell.slot, $event.target.value)"
                      />
                    </template>
                    <span v-else class="syl-spacer" aria-hidden="true"></span>
                  </span>
                </span>
                <button class="secondary tiny seg-del" aria-label="ลบช่องคอร์ดนี้" @click="removeSegment(bar, si)">✕</button>
              </div>
            </div>
            <!-- ดูผล: the same bar drawn clean (jianpu render) — REPLACES the edit grid, not
                 stacked. Words come from the lens verse so it matches the singer's sheet. -->
            <div v-else class="ed-bar-render" @click="toggleBarShown(li, bi)" title="แตะเพื่อกลับไปแก้">
              <SongSheet :content="barContent(li, bi)" mode="full" chord-system="letter" :display-key="opts.key" />
            </div>
            <!-- bar foot: beat status + repeat/volta marks + ▶ฟัง + ดูผล + ⋯ tools popover -->
            <div class="ed-bar-foot no-print">
              <span class="ed-bar-status" :class="{ bad: !barStatus(li, bi).ok }">
                <template v-if="barStatus(li, bi).text">{{ barStatus(li, bi).text }} {{ barStatus(li, bi).ok ? '✓' : '❌' }}</template>
                <template v-else>ห้อง {{ bi + 1 }}</template>
              </span>
              <!-- B055: a short bar can be a ห้องยก (pickup) whose beats finish in another
                   partial bar — offer the one-tap toggle right where the ❌ shows -->
              <button
                v-if="barStatus(li, bi).short"
                class="ed-bar-pickup"
                title="ห้องต่อกัน — จังหวะไม่เต็ม แต่นับรวมกับห้องที่ต่อกัน เช่น เริ่มกลางห้อง"
                aria-label="ทำเครื่องหมายห้องต่อกัน (จังหวะข้ามห้อง)"
                @click="bar.pickup = true"
              >↻ ห้องต่อกัน</button>
              <button
                v-else-if="bar.pickup"
                class="ed-bar-pickup on"
                title="ห้องต่อกัน (นับรวมจังหวะกับห้องที่ต่อกัน) — แตะเพื่อยกเลิก"
                aria-label="ยกเลิกห้องต่อกัน"
                @click="bar.pickup = false"
              >↻ ห้องต่อกัน</button>
              <span v-if="bar.repeatStart" class="ed-bar-mark" title="เริ่มเล่นซ้ำ">‖:</span>
              <span v-if="bar.repeatEnd" class="ed-bar-mark" title="วนกลับ">:‖</span>
              <span v-if="bar.volta" class="ed-bar-mark" :title="bar.volta === 1 ? 'ห้องจบรอบแรก' : 'ห้องจบรอบสอง'">{{ bar.volta }}.</span>
              <span class="ed-bar-acts">
                <button class="ed-mini" title="ฟังห้องนี้" aria-label="ฟังห้องนี้" @click="playBar(li, bi)"><Icon name="play" :size="14" /></button>
                <button class="ed-mini" :class="{ on: barShown(li, bi) }" :aria-pressed="barShown(li, bi)" title="ดูผล — สลับ แก้ ⇄ แผ่นเพลง (ห้องนี้)" aria-label="ดูผลห้องนี้" @click="toggleBarShown(li, bi)"><Icon name="music" :size="14" /></button>
              </span>
              <span class="ed-bar-more-wrap">
                <button
                  class="ed-mini"
                  :class="{ on: barMenuOpen === `${li}-${bi}` }"
                  :aria-expanded="barMenuOpen === `${li}-${bi}`"
                  aria-label="เครื่องมือห้องนี้ (ย้าย · สำเนา · ลบ · เล่นซ้ำ · ห้องจบ)"
                  title="เครื่องมือห้อง"
                  @click.stop="toggleBarMenu(li, bi)"
                >⋯</button>
                <div v-if="barMenuOpen === `${li}-${bi}`" class="ed-bar-menu" role="menu">
                  <div class="ed-bar-menu-row">
                    <button class="secondary tiny" aria-label="ย้ายห้องไปทางซ้าย (สุดขอบ = ไปบรรทัดก่อน)" :disabled="bi === 0 && li === 0" @click="moveBar(li, bi, -1)">◀ ซ้าย</button>
                    <button class="secondary tiny" aria-label="ย้ายห้องไปทางขวา (สุดขอบ = ไปบรรทัดถัดไป)" :disabled="bi === line.bars.length - 1 && li === lines.length - 1" @click="moveBar(li, bi, 1)">ขวา ▶</button>
                  </div>
                  <div class="ed-bar-menu-row">
                    <button class="secondary tiny" title="ทำสำเนาห้องนี้เป็นห้องถัดไป" @click="duplicateBar(line, bi)">⧉ สำเนา</button>
                    <button class="danger tiny" aria-label="ลบห้องนี้" @click="removeBar(line, bi)">✕ ลบห้อง</button>
                  </div>
                  <label class="ed-bar-menu-check" title="จังหวะไม่เต็ม แต่นับรวมกับห้องที่ต่อกัน เช่น เริ่มกลางห้อง"><input v-model="bar.pickup" type="checkbox" /> ↻ ห้องต่อกัน (จังหวะไม่เต็ม — นับรวมกับห้องที่ต่อกัน)</label>
                  <label class="ed-bar-menu-check"><input v-model="bar.repeatStart" type="checkbox" /> ‖: เริ่มเล่นซ้ำ</label>
                  <label class="ed-bar-menu-check"><input v-model="bar.repeatEnd" type="checkbox" /> :‖ วนกลับ</label>
                  <label class="ed-bar-menu-check">ห้องจบ:
                    <select v-model.number="bar.volta">
                      <option :value="0">— ไม่ใช่ —</option>
                      <option :value="1">รอบแรก (จบ 1)</option>
                      <option :value="2">รอบสอง (จบ 2)</option>
                    </select>
                  </label>
                </div>
              </span>
            </div>
          </div>
        </template>
        <button class="ed-addbar" title="เพิ่มห้อง" aria-label="เพิ่มห้อง" @click="addBar(line)"><Icon name="plus" :size="14" /> ห้อง</button>
      </div>
    </div>
    <!-- live word-count for the ข้อ being shown under the notes (like the wireframe) -->
    <div v-if="lensActive" class="ed-count no-print" :class="{ bad: !rowStatus(lensRow).ok }">
      {{ rowStatus(lensRow).ok ? '✓' : '⚠' }} {{ rowStatus(lensRow).got }}/{{ rowStatus(lensRow).need }} คำ
      {{ rowStatus(lensRow).ok ? '· ลงพอดี' : '· ยังไม่ครบ' }}
    </div>
    <button class="ed-addline" @click="addLine"><Icon name="plus" :size="14" /> เพิ่มบรรทัด</button>

    <!-- overflow: syllables typed past the last note — shown as note-less boxes so an
         over-count is visible and fixable, never silently dropped -->
    <div v-if="overflowSlots.length" class="card overflow-strip no-print">
      <strong style="color: var(--red)">⚠ เกินโน้ต {{ overflowSlots.length }} พยางค์ — ไม่มีโน้ตรองรับ (ดึงกลับ ◀ หรือลบทิ้ง)</strong>
      <div class="syl-boxes" style="margin-top: 8px; flex-wrap: wrap">
        <span v-for="i in overflowSlots" :key="i" class="syl-slot">
          <span v-if="focusedSlot === i" class="slot-tools">
            <button class="secondary slot-btn" aria-label="ดึงคำมาซ้าย (ลบช่องนี้)" @mousedown.prevent @click="pullSlot(i)">◀</button>
            <button class="secondary slot-btn" aria-label="ดันคำไปขวา (แทรกช่องว่าง)" @mousedown.prevent @click="pushSlot(i)">▶</button>
          </span>
          <input
            class="syl-box syl-overflow"
            :data-slot="i"
            :value="sylAt(lensRow, i)"
            :aria-label="`พยางค์เกินที่ ${i + 1}`"
            @focus="focusedSlot = i"
            @blur="focusedSlot = -1"
            @keydown="onSylKey($event, i)"
            @input="setSyl(lensRow, i, $event.target.value)"
          />
        </span>
      </div>
    </div>

    <!-- paragraph editor for the chosen ข้อ (collapsible) — edit lyrics as free text -->
    <div v-if="lensActive" class="card no-print" style="margin-top: 10px">
      <button class="secondary" @click="paraOpen = !paraOpen">
        📝 แก้เนื้อแบบย่อหน้า (ข้อที่เลือก) {{ paraOpen ? '▲' : '▼' }}
      </button>
      <div v-if="paraOpen" style="margin-top: 8px">
        <p class="muted" style="margin: 0 0 6px">เว้นวรรค = พยางค์ใหม่ · "-" = ต่อคำเดิม · แก้ตรงนี้แล้วกล่องใต้โน้ตขยับตาม</p>
        <textarea
          :value="rowLyricText(lensRow)"
          rows="4"
          class="arr-lyric"
          aria-label="เนื้อร้องแบบย่อหน้า"
          @input="setRowLyricText(lensRow, $event.target.value)"
        ></textarea>
      </div>
    </div>

    <!-- ===== arrangement: play order + words per verse ===== -->
    <h3 id="pk-arrange" class="section-title" style="margin-top: 22px">📜 ลำดับเพลง — เลือกท่อนทำนองมาเรียงเป็นข้อ</h3>
    <p class="muted no-print" style="margin: 0 0 10px">
      แต่ละข้อ = เลือก<b>ท่อนทำนอง</b>ที่ใช้ · ตั้งชื่อ/คีย์ · จัดลำดับด้วย ▲▼ ·
      <b>เนื้อร้องพิมพ์ในกล่องใต้โน้ต</b> หรือแผง <b>“📝 แก้เนื้อแบบย่อหน้า”</b> ด้านบน (กด ✎ เพื่อเลือกข้อ)
    </p>
    <div class="card">
      <div v-for="(row, ri) in arrangement" :key="ri" :id="'arr-row-' + ri" class="arr-row">
        <div class="arr-head">
          <span class="muted" style="min-width: 22px">{{ ri + 1 }}.</span>
          <ComboSelect v-model="row.stanza" :options="stanzaIdOptions" aria-label="เลือกท่อนทำนอง" width="100px" />
          <input v-model="row.label" placeholder="ชื่อข้อ เช่น ร้อง 1, รับ" aria-label="ชื่อข้อ" class="arr-label" />
          <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem">คีย์:
            <ComboSelect v-model="row.key" :options="rowKeyOptions" aria-label="เปลี่ยนคีย์ข้อนี้" width="100px" />
          </label>
          <span
            class="arr-count"
            :style="{ color: rowStatus(row).ok ? 'var(--muted)' : 'var(--red)', fontWeight: rowStatus(row).ok ? 400 : 700 }"
          >
            {{ rowStatus(row).got }}/{{ rowStatus(row).need }} พยางค์ {{ rowStatus(row).ok ? '✓' : '❌' }}
          </span>
          <span class="arr-tools">
            <button class="secondary tiny" aria-label="ย้ายขึ้น" :disabled="ri === 0" @click="moveRow(ri, -1)">▲</button>
            <button class="secondary tiny" aria-label="ย้ายลง" :disabled="ri === arrangement.length - 1" @click="moveRow(ri, 1)">▼</button>
            <button class="secondary tiny" aria-label="เลือกข้อนี้เพื่อพิมพ์เนื้อ" @click="lensChoice = ri">✎</button>
            <button class="secondary tiny" aria-label="ลบข้อนี้" @click="removeRow(ri)">✕</button>
          </span>
        </div>
        <!-- E4/B049: the per-row lyric textarea is CUT — words are typed under the notes
             (per-syllable) or in the "📝 แก้เนื้อแบบย่อหน้า" panel above (both edit the
             selected ข้อ). This row now only arranges the verse: ท่อน · ชื่อ · คีย์ · ลำดับ. -->
      </div>
      <button class="secondary" @click="addRow">+ เพิ่มข้อ</button>
    </div>

    <!-- (play ทั้งเพลง = dock · ดาวน์โหลด/ลบ/ประวัติ = "จัดการ" menu · แผ่นเต็ม = 🎼 mode) -->
      </div>
      <!-- /content -->
    </div>
    <!-- ===== end edit workspace ===== -->

    <!-- bottom dock lives on Studio now (dock-core / N1): a single shared <StudioDock>
         mounted once. This mode emits its dock config up via @dock instead of mounting. -->

    <!-- full sheet overlay -->
    <div v-if="showSheet" class="sheet-overlay no-print" role="dialog" aria-label="แผ่นเพลง" @click.self="showSheet = false" @keydown.esc="showSheet = false">
      <div class="sheet-panel">
        <button class="secondary" style="float: right" aria-label="ปิดแผ่นเพลง" @click="showSheet = false">✕ ปิด</button>
        <h2 style="margin-top: 0; color: var(--brand)">{{ meta.number != null ? meta.number + '. ' : '' }}{{ meta.title_th || '(ยังไม่มีชื่อเพลง)' }}</h2>
        <p class="muted">Key {{ opts.key }} · {{ opts.timeSignature }}<template v-if="opts.bpm"> · ♩= {{ opts.bpm }}</template></p>
        <SongSheet :content="resolvedPreview" mode="full" chord-system="letter" :display-key="opts.key" />
      </div>
    </div>

    <!-- ===== menu panels: Open / Properties / History / Drafts ===== -->
    <div v-if="activePanel" class="panel-overlay no-print" role="dialog" aria-modal="true" @click.self="closePanel">
      <div class="panel-box">
        <div class="panel-head">
          <strong>{{ panelTitle }}</strong>
          <button class="secondary panel-x" aria-label="ปิด" @click="closePanel"><Icon name="x" :size="16" /></button>
        </div>

        <!-- Open: pick a song to edit (applied on "เปิดเพลง", not on select) -->
        <div v-if="activePanel === 'open'">
          <label style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">เลือกเพลง:
            <ComboSelect v-model="pendingPick" :options="pickerOptions" placeholder="พิมพ์ค้นหา: ชื่อ เลข เนื้อร้อง โน้ต…" width="320px" />
          </label>
          <p class="muted" style="margin: 10px 0 0">เลือกเพลงจากรายการ แล้วกด “เปิดเพลง” · หรือเลือก “— เพลงใหม่ —” เพื่อเริ่มเพลงเปล่า</p>
          <div class="panel-foot">
            <button class="secondary" @click="closePanel">ยกเลิก</button>
            <button @click="confirmOpen">เปิดเพลง</button>
          </div>
        </div>

        <!-- Properties: song metadata (changes apply live; undo covers them) -->
        <div v-else-if="activePanel === 'properties'">
          <div class="panel-grid">
            <label>เลขเพลง<input v-model.number="meta.number" type="number" placeholder="เลขเพลง" /></label>
            <label>ชื่อเพลง (ไทย)<input v-model="meta.title_th" placeholder="ชื่อเพลง (ไทย)" /></label>
            <label>ชื่อเพลง (อังกฤษ)<input v-model="meta.title_en" placeholder="ถ้ามี" /></label>
            <label>คีย์<ComboSelect v-model="opts.key" :options="KEYS" width="100%" /></label>
            <label>จังหวะ<ComboSelect v-model="opts.timeSignature" :options="TIME_SIGNATURES" allow-custom width="100%" /></label>
            <label>ความเร็ว (BPM)<input v-model.number="opts.bpm" type="number" min="30" max="240" placeholder="BPM" /></label>
          </div>
          <div class="panel-foot"><button @click="closePanel">เสร็จ</button></div>
        </div>

        <!-- History -->
        <div v-else-if="activePanel === 'history'">
          <p v-if="!revisions.length" class="muted">ยังไม่มีประวัติ (บันทึกเพลงก่อน)</p>
          <div v-for="rev in revisions" :key="rev.id" class="rev-row">
            <div>
              <strong>{{ revName(rev) }}</strong>
              <span class="muted"> · {{ new Date(rev.created_at).toLocaleString('th-TH') }}</span>
              <button v-if="isApprover && rev.new_row" class="secondary tiny" style="margin-left: 8px" @click="restore(rev)">⏪ ย้อนมาเวอร์ชันนี้</button>
            </div>
            <ul class="muted" style="margin: 4px 0 0 18px">
              <li v-for="(d, i) in revDiff(rev)" :key="i">{{ d }}</li>
            </ul>
          </div>
          <div class="panel-foot"><button class="secondary" @click="closePanel">ปิด</button></div>
        </div>

        <!-- Drafts / review queue -->
        <div v-else-if="activePanel === 'drafts'">
          <p v-if="!pendingDrafts.length && !myDrafts.length" class="muted">ยังไม่มีงานร่างหรือรายการรอตรวจ</p>
          <template v-if="isApprover && pendingDrafts.length">
            <strong>📨 รออนุมัติ ({{ pendingDrafts.length }})</strong>
            <div v-for="d in pendingDrafts" :key="d.id" class="draft-row">
              <a href="#" @click.prevent="loadDraft(d); closePanel()">{{ d.number != null ? d.number + '. ' : '' }}{{ d.title_th }}</a>
              <span class="muted"> — โดย {{ profilesMap[d.author_id] || '?' }}</span>
            </div>
            <hr v-if="myDrafts.length" style="border: none; border-top: 1px solid var(--line); margin: 10px 0" />
          </template>
          <template v-if="myDrafts.length">
            <strong>📝 งานร่างของฉัน</strong>
            <div v-for="d in myDrafts" :key="d.id" class="draft-row">
              <a href="#" @click.prevent="loadDraft(d); closePanel()">{{ d.number != null ? d.number + '. ' : '' }}{{ d.title_th }}</a>
              <span :class="['status-chip', 's-' + d.status]">{{ STATUS_TH[d.status] }}</span>
            </div>
          </template>
          <div class="panel-foot"><button class="secondary" @click="closePanel">ปิด</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  margin: 6px 0 8px;
  color: var(--brand);
}
.stanza-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 10px;
}
.stanza-tab {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px 10px 0 0;
  padding: 6px 12px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.stanza-tab.active {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--cream);
}
.stanza-x {
  font-size: 11px;
  color: var(--muted);
  border-radius: 50%;
  padding: 0 4px;
}
.stanza-x:hover { color: var(--red); }
.bar-box {
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 8px;
  /* one bar per row, full width, so a bar reads as a single horizontal line and the
     next bar sits below it (easier to read words + notes than side-by-side bars) */
  width: 100%;
}
.bar-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 6px;
  gap: 6px;
}
.bar-head > span:first-child { flex: 1; min-width: 0; }
.bar-tools { display: flex; gap: 3px; flex-shrink: 0; }
.bar-tools .tiny { padding: 4px 6px; }
.repeat-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
}
.repeat-row label { display: inline-flex; align-items: center; gap: 4px; }
/* one bar = a strip of note-columns (chord / notes / syllable) that reads left to
   right; segments wrap only if the bar is very long */
.seg-strip { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
.seg-col { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.seg-col :deep(.combo input) { color: var(--chord-red); font-weight: 700; }
.seg-col :deep(.note-boxes) { flex-wrap: nowrap; }
/* chord row: one cell above each note box (same 46px + 3px gap so it lines up) */
.chord-row { display: flex; gap: 3px; flex-wrap: nowrap; min-height: 28px; }
.chord-cell { position: relative; width: 46px; }
.chord-btn {
  position: absolute;
  left: 0;
  top: 0;
  white-space: nowrap;
  min-height: 26px;
  padding: 2px 6px;
  border-radius: 5px;
  font-weight: 700;
}
.chord-btn.chord-set { color: var(--chord-red); background: var(--cream); border: 1px solid var(--line); z-index: 2; }
.chord-btn.chord-add {
  color: var(--muted);
  background: transparent;
  border: 1px dashed var(--line);
  font-weight: 400;
  opacity: 0.5;
}
.chord-btn.chord-add:hover { opacity: 1; }
.chord-pick { position: absolute; left: 0; top: 0; z-index: 20; }
.seg-del { align-self: flex-start; color: var(--muted); padding: 2px 8px; }
/* plain-language "how to" overview card */
.how-to { background: var(--cream); border-color: var(--brand); }
.how-to ol { line-height: 1.5; }
.lens-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0 0 10px; }
/* syllable boxes sit in the row under the note boxes — same 46px width + 3px gap as
   NoteBoxes so each word lines up under its note. nowrap keeps the columns aligned. */
.syl-boxes { display: inline-flex; gap: 3px; flex-wrap: nowrap; align-items: center; }
.syl-slot { position: relative; display: inline-flex; }
.syl-spacer { display: inline-block; width: 46px; }
.syl-box {
  width: 46px;
  padding: 6px 2px;
  text-align: center;
  font-size: 0.95rem;
  border: 1px solid var(--line);
  border-radius: 5px;
  min-height: 30px;
}
.syl-box.syl-empty { border-color: var(--red); background: #fff5f5; }
/* held '-' / rest box: optional, so a blank one is calm (dashed, faint) — never red */
.syl-box.syl-held { border-style: dashed; background: #fafafa; color: var(--muted); }
.syl-box.syl-held::placeholder { color: var(--line); }
.syl-box.syl-overflow { border-color: var(--red); background: #fff0f0; color: var(--red); }
.overflow-strip { border-color: var(--red); background: #fff7f7; }
/* ◀ ▶ align tools float above the focused syllable box, no layout shift */
.slot-tools {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
  margin-bottom: 3px;
  padding: 2px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 5;
  white-space: nowrap;
}
.slot-btn { min-width: 30px; min-height: 26px; padding: 2px 6px; font-size: 12px; }
/* arrangement rows */
.arr-row {
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
}
.arr-head {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 6px;
}
.arr-label { flex: 1 1 150px; min-width: 120px; min-height: 32px; padding: 4px 8px; }
.arr-count { font-size: 13px; white-space: nowrap; }
.arr-tools { display: flex; gap: 3px; flex-shrink: 0; margin-left: auto; }
.arr-lyric {
  width: 100%;
  min-height: 46px;
  padding: 6px 8px;
  font-size: 1rem;
  resize: vertical;
}
/* small buttons still meet the 24x24 target size (WCAG 2.2 2.5.8) */
.tiny { padding: 4px 10px; font-size: 13px; min-height: 28px; min-width: 28px; }
.role-badge {
  background: var(--cream);
  color: var(--brand);
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 13px;
  margin-left: 6px;
}
.draft-row { margin-top: 6px; }
.status-chip { border-radius: 10px; padding: 1px 10px; font-size: 12px; margin-left: 8px; }
.s-draft { background: #edf2f7; }
.s-pending { background: #fefcbf; }
.s-rejected { background: #fed7d7; }
.review-banner { background: #fffbeb; border-color: #f6e05e; }
.migrate-note { background: #fffbeb; border-color: #f6e05e; }
.rev-row { border-top: 1px solid var(--line); padding: 8px 0; margin-top: 8px; }
.line-active { border-color: var(--brand); }
.bar-playing {
  border: 1.5px solid var(--brand);
  background: var(--cream);
  box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.15);
}
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 42, 38, 0.55);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px 8px;
  overflow: auto;
}
.sheet-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  max-width: 920px;
  width: 100%;
  max-height: calc(100vh - 40px);
  overflow: auto;
}

/* ===== studio shell header (phase 1) ===== */
.studio-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border-bottom: 1px solid var(--line);
  /* bleed to the container edges so the bar spans full width and reads as a top chrome */
  margin: -16px -16px 12px;
  padding: 8px 12px;
}
.sb-menu { position: relative; display: inline-flex; align-items: center; }
.sb-brand,
.sb-text {
  background: transparent;
  border: none;
  color: var(--ink);
  font: inherit;
  font-size: 1rem;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sb-brand { color: var(--brand); font-weight: 700; white-space: nowrap; text-decoration: none; }
.sb-caret {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
}
@media (hover: hover) {
  .sb-brand:hover,
  .sb-caret:hover,
  .sb-text:hover { background: rgba(0, 0, 0, 0.06); }
}
.sb-sep { width: 1px; align-self: stretch; background: var(--line); min-height: 22px; }
.sb-title {
  flex: 1;
  min-width: 60px;
  font-weight: 700;
  font-size: 1.05rem;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  padding: 4px 8px;
  min-height: 36px;
}
.sb-title:hover { border-color: var(--line); }
.sb-title:focus { border-color: var(--brand); background: #fff; outline: none; }
.sb-title-static { flex: 1; min-width: 0; font-weight: 700; font-size: 1.05rem; color: var(--ink); padding: 4px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-mode-label { font-weight: 600; }
.chev { opacity: 0.55; }
.sb-brand-icon { display: none; }
.sb-login { display: inline-flex; align-items: center; }
/* mobile: keep the top bar on one row — brand collapses to a menu icon, mode shows
   icon-only, the title ellipsizes, so nothing overflows the narrow screen */
@media (max-width: 760px) {
  .studio-bar { gap: 4px; padding: 8px; }
  .sb-brand { font-size: 0.98rem; }
  .sb-sep { display: none; }
  .sb-mode-label { display: none; }
  .sb-title,
  .sb-title-static { font-size: 1rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sb-text { padding: 6px; }
}
.sb-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 234px;
  max-width: calc(100vw - 20px);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  padding: 6px;
  z-index: 60;
  display: flex;
  flex-direction: column;
}
.sb-dropdown.sb-mode-menu { left: auto; right: 0; } /* mode sits at the right — align to its edge */
.sb-dropdown a,
.sb-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--ink);
  text-decoration: none;
  background: transparent;
  border: none;
  font: inherit;
  font-size: 0.98rem;
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-height: 40px;
}
/* clearly visible highlight (cream-hover was too faint) — a warm brand tint that
   works on hover AND keyboard focus */
.sb-dropdown a:hover,
.sb-item:hover,
.sb-dropdown a:focus-visible,
.sb-item:focus-visible { background: rgba(139, 69, 19, 0.1); outline: none; }
.sb-dropdown .icn { color: var(--brand); }
.sb-k { margin-left: auto; color: var(--muted); font-size: 0.8rem; }
.sb-mode-item { align-items: flex-start; }
.sb-mode-item .mt { display: flex; flex-direction: column; line-height: 1.25; }
.sb-mode-item .mt small { color: var(--muted); font-size: 0.8rem; }
.sb-chk { margin-left: auto; color: var(--brand); font-weight: 700; }
.sb-backdrop { position: fixed; inset: 0; z-index: 40; }
.sb-cat {
  background: transparent;
  border: none;
  color: var(--brand);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
}
@media (hover: hover) {
  .sb-cat:hover { background: rgba(0, 0, 0, 0.06); }
}

/* ===== parts rail (phase 2) ===== */
.studio-app { display: flex; gap: 16px; align-items: flex-start; }
.content { flex: 1; min-width: 0; }
.rail {
  flex: 0 0 214px;
  width: 214px;
  position: sticky;
  top: 58px;
  align-self: flex-start;
  max-height: calc(100dvh - 74px);
  overflow: auto;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px;
}
.studio-app.rail-hidden .rail { display: none; }
.rail-mhead { display: none; }
.rail-group { font-size: 12px; color: var(--muted); font-weight: 700; padding: 8px 8px 4px; }
.rail-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--ink);
  font: inherit;
  font-size: 0.98rem;
  padding: 8px 9px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 38px;
}
.rail-row .icn { color: var(--muted); }
.rail-row.mel .icn { color: var(--note-blue); }
.rail-row.lyr .icn { color: #6b4fb0; }
.rail-row.arr .icn { color: #b5771a; }
.rail-row.add { color: var(--muted); }
.rail-row.sel { background: var(--cream); border: 1px solid var(--line); font-weight: 700; }
/* a row + its delete button (B032). The whole wrapper carries mel/lyr colour + sel state */
.rail-rowwrap { display: flex; align-items: center; border-radius: 8px; }
.rail-rowwrap .rail-row { flex: 1; min-width: 0; }
.rail-rowwrap.mel .icn { color: var(--note-blue); }
.rail-rowwrap.lyr .icn { color: #6b4fb0; }
.rail-rowwrap.sel { background: var(--cream); border: 1px solid var(--line); }
.rail-rowwrap.sel .rail-row { font-weight: 700; }
.rail-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--muted);
  border-radius: 7px;
  padding: 4px;
  min-width: 30px;
  min-height: 30px;
  margin-right: 3px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;
}
.rail-rowwrap:hover .rail-del,
.rail-rowwrap:focus-within .rail-del { opacity: 1; }
.rail-del:hover { color: var(--red); background: #fff0ef; }
@media (hover: none) {
  .rail-del { opacity: 1; }
}
@media (hover: hover) {
  .rail-row:hover { background: rgba(139, 69, 19, 0.08); }
}
.rail-sep { border-top: 1px solid var(--line); margin: 6px 4px; }
.rail-backdrop { display: none; }

@media (max-width: 760px) {
  .studio-app { display: block; }
  .rail {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: 82%;
    max-width: 300px;
    z-index: 80;
    border-radius: 0;
    max-height: none;
    transform: translateX(-102%);
    transition: transform 0.22s ease;
  }
  .rail.open { transform: none; }
  .studio-app.rail-hidden .rail { display: block; } /* drawer visibility is via .open, not collapse */
  .rail-mhead {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 4px 8px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 6px;
    font-weight: 700;
  }
  .rail-mhead > span { display: inline-flex; align-items: center; gap: 6px; }
  .rail-x {
    margin-left: auto;
    background: var(--cream);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 4px 8px;
    min-height: 32px;
    color: var(--ink);
    cursor: pointer;
  }
  .rail-backdrop.open {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(30, 20, 5, 0.4);
    z-index: 75;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rail { transition: none; }
}
/* ===== edit header (edhead — ps2 §③) ===== */
.edhead {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  background: #fffdf8;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 7px 9px;
  margin: 0 0 10px;
}
/* breadcrumb button — opens the rail, shows "ท่อน A · ข้อ 1" (position only, not a menu) */
.ed-crumb {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--cream);
  border: 1px solid var(--line);
  color: var(--brand);
  font: inherit;
  font-weight: 700;
  border-radius: 8px;
  padding: 6px 11px;
  min-height: 34px;
  cursor: pointer;
  max-width: 100%;
}
.ed-crumb-t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ed-grow { flex: 1 1 8px; }
/* generic header icon button (24×24 target · WCAG 2.5.8) */
.ed-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 8px;
  padding: 5px;
  min-width: 32px;
  min-height: 32px;
  cursor: pointer;
}
.ed-ico.on { background: var(--cream); border-color: var(--brand); color: var(--brand); }
.ed-ico.danger-ic { color: var(--red); }
/* layout segmented control: 1 ห้อง/แถว ⇄ ต่อกัน */
.ed-lay { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.ed-lay button {
  background: #fff;
  border: none;
  color: var(--muted);
  font: inherit;
  font-size: 0.85rem;
  padding: 6px 10px;
  min-height: 32px;
  cursor: pointer;
}
.ed-lay button + button { border-left: 1px solid var(--line); }
.ed-lay button.on { background: var(--cream); color: var(--brand); font-weight: 700; }
/* whole-song preview chip */
.ed-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  font: inherit;
  font-size: 0.88rem;
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 32px;
  cursor: pointer;
}
.ed-chip.act { background: var(--cream); border-color: var(--brand); color: var(--brand); font-weight: 700; }
.ed-quick { display: inline-flex; gap: 4px; }
/* ⋯ line-more popover (advanced settings for the active line) */
.ed-more-wrap { position: relative; display: inline-flex; }
.ed-more-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  min-width: 240px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(60, 40, 10, 0.18);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ed-more-title { font-weight: 700; color: var(--brand); font-size: 0.85rem; }
/* in-context help: (?) legend + (i) tip */
.ed-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--ink);
}
.ed-legend b { color: var(--brand); font-family: 'Courier New', monospace; }
.ed-tip { margin: 0 0 10px; }
.ed-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 7px;
  padding: 4px;
  min-width: 30px;
  min-height: 30px;
  cursor: pointer;
}
@media (hover: hover) {
  .ed-ico:hover,
  .ed-crumb:hover,
  .ed-chip:hover,
  .ed-mini:hover { background: var(--cream-hover); }
}
/* mobile: quick-struct (ฮุก·ซ้ำ·สำเนา·ลบบรรทัด) stays reachable on tablet/phone — the
   header just wraps to more rows; tighten spacing so it doesn't overflow */
@media (max-width: 760px) {
  .edhead { gap: 5px; padding: 6px; }
  .ed-quick { flex-wrap: wrap; }
  .ed-lay button { padding: 6px 8px; font-size: 0.8rem; }
  .ed-chip { padding: 6px 8px; font-size: 0.82rem; }
}
/* read row (phase 4): the pair in sheet style, above the edit boxes */
/* จัดการ menu danger item + divider */
.sb-danger { color: var(--red); }
.sb-danger .icn { color: var(--red); }
.sb-dropdown .sep { border-top: 1px solid var(--line); margin: 4px 6px; }
/* menu panels (Open / Properties / History / Drafts) */
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 42, 38, 0.5);
  z-index: 95;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 12px 20px;
  overflow: auto;
}
.panel-box {
  background: #fff;
  border-radius: 14px;
  padding: 18px 20px;
  max-width: 560px;
  width: 100%;
  box-shadow: 0 16px 44px rgba(60, 40, 10, 0.28);
}
.panel-head { display: flex; align-items: center; margin-bottom: 12px; }
.panel-head strong { font-size: 1.1rem; color: var(--brand); }
.panel-x { margin-left: auto; padding: 6px 8px; display: inline-flex; }
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.panel-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; color: var(--muted); }
.panel-grid label input { color: var(--ink); }
.panel-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
@media (max-width: 560px) {
  .panel-grid { grid-template-columns: 1fr; }
}
/* ===== clean editing strip (matches the wireframe) ===== */
.ed-line {
  background: #fffdf8;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
}
.ed-line.line-active { border-color: var(--brand); }
/* B061: live jianpu preview strip above the edit boxes — a tinted read-only render that
   updates as you type. Scrolls horizontally on its own so a long line never widens the page. */
.ed-line-live {
  background: #fffdf5;
  border: 1px dashed var(--brand);
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 8px;
  overflow-x: auto;
}
/* B060: inline song-settings card */
.ed-settings { padding: 10px 12px; margin-bottom: 12px; }
.ed-settings-head { display: flex; align-items: center; gap: 8px; }
.ed-settings-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--brand);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 2px;
  min-height: 34px;
}
.ed-chev-open { transform: rotate(180deg); }
.ed-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px 12px;
  margin-top: 10px;
}
.ed-settings-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--muted); }
.ed-settings-grid label input {
  color: var(--ink);
  min-height: 34px;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
/* "✓ ตรวจแล้ว" toggle — ghost until ticked, then green (checked/verified) */
.ed-verify {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  font: inherit;
  font-size: 0.88rem;
  border-radius: 999px;
  padding: 5px 12px;
  min-height: 32px;
  cursor: pointer;
  white-space: nowrap;
}
.ed-verify:hover { border-color: var(--brand); color: var(--brand); }
.ed-verify.on { background: #2f7d4f; border-color: #2f7d4f; color: #fff; }
.ed-line-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.ed-line-no { font-size: 0.82rem; color: var(--muted); font-weight: 700; }
.ed-line-tag {
  font-size: 0.72rem;
  color: var(--brand);
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 1px 7px;
}
.ed-line-actions { margin-left: auto; display: inline-flex; gap: 4px; align-items: center; }
/* B056: จบเพลง per-line toggle — ghost when off, filled when the line ends the song */
.ed-line-end {
  font-size: 0.72rem;
  line-height: 1;
  padding: 4px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
}
.ed-line-end:hover { border-color: var(--brand); color: var(--brand); }
.ed-line-end.on { background: var(--brand); border-color: var(--brand); color: #fff; }
.ed-mini.on { background: var(--cream); border-color: var(--brand); color: var(--brand); }
.ed-line-opts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 4px 10px;
  margin-bottom: 8px;
  border-bottom: 1px dashed var(--line);
}
.ed-opt-input {
  min-height: 32px;
  padding: 4px 8px;
  font-size: 0.85rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  flex: 1 1 150px;
  min-width: 130px;
}
.ed-opt-check { display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem; color: var(--muted); }
/* the strip: bars laid out per the layout toggle (B035).
   lay-stack = 1 ห้อง/แถว (each bar its own full-width row) · lay-flow = ห้องต่อกัน (side by
   side, wrapping only when very long). stack is the default (matches the prototype). */
.ed-strip { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
.ed-strip.lay-flow { flex-direction: row; }
.ed-strip.lay-stack { flex-direction: column; align-items: stretch; gap: 8px; }
.ed-strip.lay-stack .ed-barline { display: none; } /* 1 bar/row — no vertical barline needed */
.ed-strip.lay-stack .ed-bar { width: 100%; }
.ed-strip.lay-stack .ed-addbar { align-self: flex-start; }
.ed-barline { align-self: stretch; width: 0; border-left: 2px solid var(--muted); margin: 4px 0; min-height: 44px; }
.ed-bar { display: flex; flex-direction: column; gap: 6px; border-radius: 8px; padding: 4px 2px 2px; }
.ed-bar .seg-strip { gap: 10px; flex-wrap: nowrap; }
.ed-bar.bar-playing { background: var(--cream); box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.15); }
.ed-bar-foot { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.ed-bar-status { color: var(--muted); }
.ed-bar-status.bad { color: var(--red); font-weight: 700; }
.ed-bar-mark { font-family: 'Courier New', monospace; font-weight: 700; color: var(--brand); font-size: 12px; }
/* B055: ห้องยก (pickup) quick toggle — a small chip beside the beat status */
.ed-bar-pickup {
  font-size: 11px;
  line-height: 1;
  padding: 3px 7px;
  border: 1px solid var(--brand);
  border-radius: 999px;
  background: transparent;
  color: var(--brand);
  cursor: pointer;
  white-space: nowrap;
}
.ed-bar-pickup:hover { background: var(--cream-hover); }
.ed-bar-pickup.on { background: var(--brand); color: #fff; }
.ed-bar-acts { display: inline-flex; gap: 4px; margin-left: auto; }
.ed-bar-more-wrap { position: relative; }
/* ดูผล render: the clean bar drawn in place of the edit grid (tap to go back to editing) */
.ed-bar-render {
  border: 1px dashed var(--brand);
  border-radius: 8px;
  background: #fffdf5;
  padding: 8px 10px;
  cursor: pointer;
  min-height: 44px;
}
@media (hover: hover) {
  .ed-bar-render:hover { background: var(--cream); }
}
.ed-bar-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  min-width: 210px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(60, 40, 10, 0.18);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ed-bar-menu-row { display: flex; gap: 6px; }
.ed-bar-menu-row .tiny { flex: 1; }
.ed-bar-menu-check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
.ed-addbar,
.ed-addline {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px dashed var(--line);
  color: var(--muted);
  border-radius: 8px;
  padding: 6px 12px;
  min-height: 34px;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}
.ed-addbar { align-self: center; }
.ed-addline { margin: 2px 0 6px; }
@media (hover: hover) {
  .ed-addbar:hover,
  .ed-addline:hover { background: var(--cream); color: var(--brand); border-color: var(--brand); }
}
.ed-count { font-size: 0.9rem; color: #2f7d4f; margin: 2px 0 8px; font-weight: 600; }
.ed-count.bad { color: var(--red); }
/* the ✕ seg-del is quiet until you hover / focus its column */
.seg-col .seg-del { opacity: 0; transition: opacity 0.12s; }
.seg-col:hover .seg-del,
.seg-col:focus-within .seg-del { opacity: 1; }
@media (hover: none) {
  .seg-col .seg-del { opacity: 1; }
}
.sheet-head { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-2); }
.only-print { display: none; }
@media print {
  .only-print { display: block; }
}

/* ===== S3 responsive polish — mobile (≤760px) =====
   Desktop keeps its compact, mouse-precise density; on phones every editing
   control grows to the app's 44px touch standard (design tokens) and dense
   rows WRAP instead of pushing the page wider. Pure layout — no behaviour
   change, no logic touched, no colour hard-coded. */
@media (max-width: 760px) {
  /* ⭐ kill the horizontal page scroll: a wide bar wraps its note-columns
     instead of overflowing. Each column keeps chord·note·syllable stacked and
     aligned within itself, so wrapping COLUMNS never breaks the 1:1 note↔word
     alignment (a horizontal scroll box was rejected — it would clip the ◀▶
     align tools and the chord dropdown that pop above/below a cell). */
  .ed-bar .seg-strip { flex-wrap: wrap; column-gap: var(--sp-3); row-gap: var(--sp-4); }
  .ed-bar-render { overflow-x: auto; }
  .ed-bar-foot { flex-wrap: wrap; row-gap: var(--sp-1); }

  /* header + inline action buttons → full 44px hit targets */
  .ed-ico,
  .ed-mini { min-width: var(--touch-min); min-height: var(--touch-min); }
  .ed-crumb,
  .ed-verify,
  .ed-settings-toggle,
  .ed-lay button,
  .ed-chip,
  .ed-addbar,
  .ed-addline,
  .ed-line-end,
  .ed-bar-pickup { min-height: var(--touch-min); }

  /* dense secondary tools (bar ⋯ menu · arrangement ▲▼✎✕ · ◀▶ align) */
  .tiny,
  .slot-btn { min-width: var(--touch-min); min-height: var(--touch-min); }

  /* primary editing inputs under each note */
  .syl-box { min-height: var(--touch-min); }
  .chord-btn { min-height: 34px; }

  /* parts drawer (rail) — the mobile navigation */
  .rail-row { min-height: var(--touch-min); }
  .rail-del,
  .rail-x { min-width: var(--touch-min); min-height: var(--touch-min); }
}
</style>
