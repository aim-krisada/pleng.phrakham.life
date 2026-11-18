// ใบ v3/pleng#178 — หมายเหตุของคำ (P'Aim, 18 พ.ย. 2569):
// the writer types `*` after any word they want to explain, as many as they like. On the sheet every
// `*` becomes a small number ¹ ² ³ in song order, and the notes print under the song with the same
// numbers. The writer never types a number.
//
// Where a note lives (รอบ 4, P'Aim: "พอใส่ดาวปุ๊บก็มีช่องขึ้นมาให้ใส่เลย"): ON THE WORD. Each arrangement
// entry carries `notes: [...]`, one per `*` in that entry's Thai syllables, in order. Adding a `*` earlier
// in the song shifts the numbers but every note stays with its word (reconcileNotes, used by the editor).
//
// Older songs (รอบ 2–3) kept the notes as the lines of content.footnote, line N = mark N. Such a song is
// still read that way until the editor opens it and moves the lines onto the words. content.footnote
// itself is free text under the song, not tied to any word.
//
// A ท่อน sung again with the very same words (same melody + same syllables) keeps the numbers — and the
// notes — of the first time it was sung: a repeated refrain must not count on to ⁴ ⁵ ⁶.

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }

export function supNum(n) {
  return String(n).split('').map((d) => SUP[d]).join('')
}

// a text's items: one per non-empty line, trimmed
export function footnoteItems(footnote) {
  if (typeof footnote !== 'string') return []
  return footnote.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
}

export const countStars = (s) => (typeof s === 'string' ? (s.match(/\*/g) || []).length : 0)
const clean = (s) => (typeof s === 'string' ? s.replace(/\*/g, '').trim() : '')

// two arrangement entries with the same melody and the same words are the same ท่อน sung again
export function entrySig(e) {
  return `${e && e.stanza}\u0000${((e && e.syllables) || []).join('\u0001')}`
}

// does this song keep its notes on the words (รอบ 4) rather than as footnote lines (รอบ 2–3)?
export function hasWordNotes(content) {
  return !!(content && Array.isArray(content.arrangement) && content.arrangement.some((e) => Array.isArray(e && e.notes)))
}

// Every mark in number order: { n, word, before, after, where, ei, k, text }.
//   ei = the entry that owns it (the first time those words are sung) · k = which `*` of that entry
//   word/before/after = the starred syllable and the ones either side, so "เสริญ" reads "สรร เสริญ พระ"
//   text = its note ('' when none yet)
export function footnoteMarks(content) {
  const out = []
  if (!content) return out
  if (Array.isArray(content.stanzas)) {
    const onWords = hasWordNotes(content)
    const lines = onWords ? [] : footnoteItems(content.footnote)
    const seen = new Set()
    const arr = content.arrangement || []
    arr.forEach((e, ei) => {
      const sig = entrySig(e)
      if (seen.has(sig)) return
      seen.add(sig)
      const where = ((e && e.label) || '').trim() || (arr.length > 1 ? `ข้อ ${ei + 1}` : '')
      const syls = (e && e.syllables) || []
      const words = syls.filter((w) => clean(w))
      let k = 0
      words.forEach((w, wi) => {
        for (let j = 0; j < countStars(w); j++) {
          const n = out.length + 1
          const text = onWords ? ((e.notes && e.notes[k]) || '').trim() : lines[n - 1] || ''
          out.push({ n, word: clean(w), before: clean(words[wi - 1]), after: clean(words[wi + 1]), where, ei, k, text })
          k++
        }
      })
    })
    return out
  }
  const lines = footnoteItems(content.footnote)
  for (const it of content.lines || []) {
    if (!it || it.type !== 'segment') continue
    for (let j = 0; j < countStars(it.lyric); j++) {
      const n = out.length + 1
      out.push({ n, word: clean(it.lyric), before: '', after: '', where: '', ei: -1, k: j, text: lines[n - 1] || '' })
    }
  }
  return out
}

// how many distinct numbers the song's `*` marks get
export function footnoteStarCount(content) {
  return footnoteMarks(content).length
}

// the free text under the song: content.footnote — minus the lines an older song used as mark notes
export function footnoteFree(content) {
  const raw = typeof content?.footnote === 'string' ? content.footnote.trim() : ''
  if (!raw || hasWordNotes(content)) return raw
  const used = footnoteMarks(content).length
  if (!used) return raw
  return footnoteItems(raw).slice(used).join('\n')
}

// An older song (notes = footnote lines) moved onto its words: { arrangement, footnote }. Returns null
// when there is nothing to move. Lines beyond the marks stay as free text.
export function moveLineNotesToWords(content) {
  if (!content || !Array.isArray(content.stanzas) || hasWordNotes(content)) return null
  const marks = footnoteMarks(content)
  const lines = footnoteItems(content.footnote)
  if (!marks.length || !lines.length) return null
  const arrangement = (content.arrangement || []).map((e) => ({ ...e }))
  for (const m of marks) {
    if (!m.text) continue
    const e = arrangement[m.ei]
    const notes = Array.isArray(e.notes) ? [...e.notes] : []
    while (notes.length <= m.k) notes.push('')
    notes[m.k] = m.text
    e.notes = notes
  }
  return { arrangement, footnote: lines.slice(marks.length).join('\n') }
}

// The words of one entry changed from `oldSyls` to `newSyls`: keep each note on its word. Same number of
// marks = a word was retyped, the notes stay in place. A mark added or removed: the marks that are the
// same before it (from the start) and after it (from the end) keep their notes, a new mark gets ''.
export function reconcileNotes(oldSyls, newSyls, notes) {
  const marks = (syls) => {
    const out = []
    for (const w of syls || []) for (let j = 0; j < countStars(w); j++) out.push(clean(w))
    return out
  }
  const a = marks(oldSyls)
  const b = marks(newSyls)
  const old = Array.isArray(notes) ? notes : []
  if (a.length === b.length) return old.slice(0, b.length)
  let p = 0
  while (p < a.length && p < b.length && a[p] === b[p]) p++
  let s = 0
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++
  const tail = a.map((_, i) => old[i] || '').slice(a.length - s)
  const out = [...a.map((_, i) => old[i] || '').slice(0, p), ...Array.from({ length: b.length - p - s }, () => ''), ...tail]
  return out.slice(0, b.length)
}

// The content with every `*` in the lyrics turned into its number — only once at least one mark has a
// note; before that a `*` is just a character the writer typed. Same object back when nothing changes.
export function numberFootnoteStars(content) {
  if (!content) return content
  const marks = footnoteMarks(content)
  if (!marks.some((m) => m.text)) return content
  let next = 0
  const swap = (s) => (typeof s === 'string' && s.includes('*') ? s.replace(/\*/g, () => supNum(++next)) : s)
  if (Array.isArray(content.stanzas)) {
    const firstNumbers = new Map() // sig → numbered syllables of the first time these words were sung
    const arrangement = (content.arrangement || []).map((e) => {
      const syls = e.syllables || []
      if (!syls.some((w) => countStars(w))) return e
      const sig = entrySig(e)
      if (!firstNumbers.has(sig)) firstNumbers.set(sig, syls.map(swap))
      return { ...e, syllables: firstNumbers.get(sig) }
    })
    return { ...content, arrangement }
  }
  if (Array.isArray(content.lines)) {
    return { ...content, lines: content.lines.map((it) => (it && it.type === 'segment' && countStars(it.lyric) ? { ...it, lyric: swap(it.lyric) } : it)) }
  }
  return content
}
