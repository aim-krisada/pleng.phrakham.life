import { syllableSlots } from './notation.js'

export function isV2(content) {
  return !!(content && Array.isArray(content.stanzas))
}

// Split a v1 lyric string into syllable tokens the v2 way: spaces = word breaks,
// hyphens = same-word syllable breaks. One syllable per token; a token keeps a
// leading '-' when it continues the previous syllable's word (so "ส-ถิตย์" round-
// trips as one word, not two).
export function splitSyllables(lyric) {
  const out = []
  for (const word of (lyric || '').split(/\s+/).filter(Boolean)) {
    word
      .split('-')
      .filter(Boolean)
      .forEach((p, i) => out.push(i === 0 ? p : '-' + p))
  }
  return out
}

// Rebuild a lyric string from syllable tokens: a token continues the same word
// (hyphen, no space) when it starts with '-', otherwise it's a new word (space).
export function joinSyllables(syls) {
  let s = ''
  for (const t of syls) {
    if (!s) s = t
    else if (t.startsWith('-')) s += '-' + t.slice(1)
    else s += ' ' + t
  }
  return s
}

// Convert a v1 song (content.lines) into the v2 shape: all lines become one stanza
// 'A', and one arrangement entry carries the lyrics as syllables. Returns
// { content, warnings } — warnings flag segments whose syllable count != the number
// of syllable-bearing notes, so the author reviews them (never guess silently).
export function migrateToV2(content) {
  if (isV2(content)) return { content, warnings: [] }
  const warnings = []
  const syllables = []
  const stanzaLines = (content.lines || []).map((line) =>
    line.map((item) => {
      if (item.type !== 'segment') return { ...item }
      const slots = syllableSlots(item.note || '')
      const syls = splitSyllables(item.lyric)
      if (syls.length !== slots) {
        warnings.push({ note: item.note, lyric: item.lyric, slots, got: syls.length })
      }
      for (let i = 0; i < slots; i++) syllables.push(syls[i] ?? '')
      const { lyric, ...melodyOnly } = item
      return melodyOnly
    }),
  )
  return {
    content: {
      version: 2,
      key: content.key,
      timeSignature: content.timeSignature,
      bpm: content.bpm,
      stanzas: [{ id: 'A', lines: stanzaLines }],
      arrangement: [{ stanza: 'A', label: '', syllables }],
    },
    warnings,
  }
}

// Turn a song's stored content into a flat list of renderable lines.
// v1 songs already store `content.lines` — passed through unchanged.
// v2 songs store `content.stanzas` (melodies) + `content.arrangement` (verses/
// refrains that link a stanza and carry only syllables). We expand the arrangement:
// each entry becomes the linked stanza's lines with its syllables written under the
// notes, prefixed by a {type:'section'} label — so the existing SongSheet render,
// section chips, follow-along and play-by-section all work with no changes.
// Syllables map 1:1 to the syllable-bearing notes of the stanza, consumed in order.
export function resolveContent(content) {
  if (!content || !Array.isArray(content.stanzas)) return content?.lines || []
  const byId = {}
  for (const s of content.stanzas) byId[s.id] = s
  const out = []
  for (const entry of content.arrangement || []) {
    const stanza = byId[entry.stanza]
    if (!stanza) continue
    const syls = entry.syllables || []
    let si = 0
    ;(stanza.lines || []).forEach((line, li) => {
      const outLine = []
      if (li === 0 && entry.label) outLine.push({ type: 'section', name: entry.label })
      for (const item of line) {
        if (item.type === 'segment') {
          const n = syllableSlots(item.note || '')
          outLine.push({ ...item, lyric: joinSyllables(syls.slice(si, si + n)) })
          si += n
        } else {
          outLine.push({ ...item })
        }
      }
      out.push(outLine)
    })
  }
  return out
}
