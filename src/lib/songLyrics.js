// Bulk-lyric engine — paste/type a whole verse's words and land them on the melody, one word per
// ATTACK note. The old boxed editor (EditorMode) had this as a per-verse textarea; these pure
// functions lift the same mapping onto the v2 `content` shape so the inline editor (SongViewer) can
// offer it too. The reader-facing rule (docs song-model): a verse's `syllables[]` aligns 1:1 with
// the stanza's syllable-bearing note boxes in reading order — attack notes take a word, held/rest
// boxes stay blank, and reading back shows only the attack words. So the textarea is a WORDS view
// and the storage is a per-slot array; these convert between the two, melody-aware.
import { noteBoxKinds } from './notation.js'
import { splitSyllables, joinSyllables } from './songModel.js'

// The note kinds of a stanza's melody in reading order, dropping the structural brackets that bear
// no slot ('attack' = takes a word, 'held' = extension/tie/rest = blank). This is the slot spine a
// verse's words map onto. (parity with EditorMode.stanzaKindList, over v2 content.)
export function stanzaNoteKinds(content, stanzaId) {
  const s = (content?.stanzas || []).find((x) => x.id === stanzaId)
  const out = []
  if (!s) return out
  for (const line of s.lines || [])
    if (Array.isArray(line))
      for (const it of line)
        if (it?.type === 'segment')
          for (const k of noteBoxKinds(it.note || '')) if (k !== 'struct') out.push(k)
  return out
}

// Map a flat WORD list onto the stanza's slots: each ATTACK note takes the next word, held/rest
// boxes stay blank, extra words overflow past the end, and trailing blanks are trimmed. (parity
// with EditorMode.wordsToSyllables.)
export function wordsToSyllables(content, stanzaId, words) {
  const kinds = stanzaNoteKinds(content, stanzaId)
  const out = []
  let w = 0
  for (const k of kinds) out.push(k === 'attack' ? (words[w++] ?? '') : '')
  while (w < words.length) out.push(words[w++]) // extra words → overflow slots
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

// Reverse: read back only the words that sit on attack slots (what the textarea shows). Slots past
// the melody's kinds (overflow) are read back too. (parity with EditorMode.syllablesToWords.)
export function syllablesToWords(content, stanzaId, syllables) {
  const kinds = stanzaNoteKinds(content, stanzaId)
  const out = []
  ;(syllables || []).forEach((t, i) => { if (kinds[i] === undefined || kinds[i] === 'attack') out.push(t) })
  return out
}

// The bulk-textarea text for a verse ⇄ its stored syllable array (join on space, hyphen continues a
// word — songModel.joinSyllables / splitSyllables own that grammar, one place for the whole app).
export function verseLyricText(content, stanzaId, syllables) {
  return joinSyllables(syllablesToWords(content, stanzaId, syllables))
}
export function syllablesFromText(content, stanzaId, text) {
  return wordsToSyllables(content, stanzaId, splitSyllables(text))
}

// Thai word segmentation for a pasted blob written WITHOUT spaces between words (Intl.Segmenter,
// ICU dictionary — ships with the browser, no library). Splits on commas first (วรรค / phrase
// breaks), then into word tokens; the space-joined result feeds back through syllablesFromText so
// it maps onto the attack slots, ready to fine-tune. Word-level ≈ syllable, not exact — the author
// adjusts with the per-note edit. Fallback (no Intl.Segmenter) keeps each phrase whole. (parity
// with EditorMode.segmentThai.)
export function segmentThai(text) {
  const phrases = String(text || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean)
  const out = []
  const canSeg = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  const seg = canSeg ? new Intl.Segmenter('th', { granularity: 'word' }) : null
  for (const ph of phrases) {
    if (seg) {
      for (const part of seg.segment(ph)) { const t = (part.segment || '').trim(); if (t) out.push(t) }
    } else {
      out.push(...ph.split(/\s+/).filter(Boolean))
    }
  }
  return out
}

// Immutable write: set arrangement entry #entryIndex's words from the textarea `text`, mapped onto
// its stanza's slots. Returns a NEW content (untouched entries kept ===), or `content` unchanged on
// a bad index / non-arrangement content. This is the one the paste UI calls.
export function withVerseText(content, entryIndex, text) {
  if (!content || !Array.isArray(content.arrangement)) return content
  const entry = content.arrangement[entryIndex]
  if (!entry) return content
  const syllables = syllablesFromText(content, entry.stanza, text)
  const arrangement = content.arrangement.slice()
  arrangement[entryIndex] = { ...entry, syllables }
  return { ...content, arrangement }
}

// Immutable write: re-run the Thai auto-segmenter over a verse's CURRENT words and re-apply — the
// ✂ button for a verse pasted as a spaceless blob. Returns a NEW content, or unchanged on no-op.
export function withVerseAutoSegmented(content, entryIndex) {
  if (!content || !Array.isArray(content.arrangement)) return content
  const entry = content.arrangement[entryIndex]
  if (!entry) return content
  const current = verseLyricText(content, entry.stanza, entry.syllables || [])
  return withVerseText(content, entryIndex, segmentThai(current).join(' '))
}
