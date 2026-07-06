import { syllableSlots } from './notation.js'

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
          outLine.push({ ...item, lyric: syls.slice(si, si + n).join(' ') })
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
