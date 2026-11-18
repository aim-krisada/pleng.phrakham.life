// ใบ v3/pleng#178 — หมายเหตุท้ายเพลงหลายข้อ (P'Aim, 18 พ.ย. 2569):
// the writer types `*` after any word they want to explain, as many as they like, and one line of
// content.footnote per `*`. On the sheet every `*` becomes a small number ¹ ² ³ in song order, and the
// footnote lines print under the song with the same numbers. The writer never types a number, so
// adding or removing a `*` later can't leave the numbers out of step.
//
// A ท่อน sung again with the very same words (same melody + same syllables) keeps the numbers it had
// the first time — a repeated refrain must not count on to ⁴ ⁵ ⁶.
//
// A song with a footnote but no `*` anywhere keeps the old behaviour: the footnote is free text,
// printed as typed with no numbers.

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }

export function supNum(n) {
  return String(n).split('').map((d) => SUP[d]).join('')
}

// the footnote's items: one per non-empty line, trimmed
export function footnoteItems(footnote) {
  if (typeof footnote !== 'string') return []
  return footnote.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
}

const countStars = (s) => (typeof s === 'string' ? (s.match(/\*/g) || []).length : 0)

// how many distinct numbers the song's `*` marks get (a repeated ท่อน's marks are not counted again)
export function footnoteStarCount(content) {
  if (!content) return 0
  if (Array.isArray(content.stanzas)) {
    const seen = new Set()
    let n = 0
    for (const e of content.arrangement || []) {
      const syls = e.syllables || []
      const sig = `${e.stanza}\u0000${syls.join('\u0001')}`
      if (seen.has(sig)) continue
      seen.add(sig)
      for (const w of syls) n += countStars(w)
    }
    return n
  }
  let n = 0
  for (const it of content.lines || []) if (it && it.type === 'segment') n += countStars(it.lyric)
  return n
}

// ใบ#178 รอบ 3 — the marks in number order, each with the word it sits on and its ท่อน, so the editor can
// show "¹ เชื่อ (ข้อ 1) ⇒ <line 1>" and the writer sees which explanation belongs to which word.
// Same counting as numberFootnoteStars (a ท่อน sung again with the same words adds no marks).
export function footnoteMarks(content) {
  const out = []
  if (!content) return out
  const clean = (s) => (typeof s === 'string' ? s.replace(/\*/g, '').trim() : '')
  // before/after = the syllable either side, so a lone syllable like "เสริญ" reads as "สรร เสริญ พระ"
  const push = (w, where, before = '', after = '') => {
    const k = countStars(w)
    for (let i = 0; i < k; i++) out.push({ n: out.length + 1, word: clean(w), where, before: clean(before), after: clean(after) })
  }
  if (Array.isArray(content.stanzas)) {
    const seen = new Set()
    const arr = content.arrangement || []
    arr.forEach((e, ei) => {
      const syls = e.syllables || []
      const sig = `${e.stanza}\u0000${syls.join('\u0001')}`
      if (seen.has(sig)) return
      seen.add(sig)
      const where = (e.label || '').trim() || (arr.length > 1 ? `ข้อ ${ei + 1}` : '')
      const words = syls.filter((w) => clean(w))
      words.forEach((w, i) => push(w, where, words[i - 1], words[i + 1]))
    })
    return out
  }
  for (const it of content.lines || []) if (it && it.type === 'segment') push(it.lyric, '')
  return out
}

// The content with every `*` in the lyrics turned into its number. Untouched (same object) when the
// song has no footnote lines — then a `*` is just a character the writer typed.
export function numberFootnoteStars(content) {
  if (!content || !footnoteItems(content.footnote).length) return content
  let next = 0
  const swap = (s) => (typeof s === 'string' && s.includes('*') ? s.replace(/\*/g, () => supNum(++next)) : s)
  if (Array.isArray(content.stanzas)) {
    const firstNumbers = new Map() // sig → numbered syllables of the first time these words were sung
    const arrangement = (content.arrangement || []).map((e) => {
      const syls = e.syllables || []
      if (!syls.some((w) => countStars(w))) return e
      const sig = `${e.stanza}\u0000${syls.join('\u0001')}`
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
