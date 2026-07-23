import { syllableSlots, attackSlots, noteBoxKinds, parseNotes, beatCount, expectedBeats } from './notation.js'

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
      // v1 words split by syllable go onto ATTACK boxes; held/rest boxes get a blank
      // slot so every note box has its own lyric cell (words stay aligned to notes).
      const kinds = noteBoxKinds(item.note || '')
      const syls = splitSyllables(item.lyric)
      const need = attackSlots(item.note || '')
      if (syls.length !== need) {
        warnings.push({ note: item.note, lyric: item.lyric, slots: need, got: syls.length })
      }
      let w = 0
      for (const k of kinds) {
        if (k === 'struct') continue
        syllables.push(k === 'attack' ? (syls[w++] ?? '') : '')
      }
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
// Melody signature of a source stanza line, for the songbook's "print each melody once"
// (B059-refine). It is the note tokens split into bars (chords + segmentation ignored, so a
// phrase notated with a different chord-split still matches), with a LEADING PICKUP BAR
// dropped — an anacrusis (a first bar shorter than a full measure) is how the same refrain
// phrase enters differently on its first vs later rounds, so we normalise it away before
// comparing. `expBeats` = expectedBeats(timeSignature); null skips pickup normalisation.
export function melodyLineSignature(line, expBeats) {
  const bars = []
  let cur = []
  for (const item of line || []) {
    if (item.type === 'segment') cur.push(...String(item.note || '').split(/\s+/).filter(Boolean))
    else if (item.type === 'bar') { bars.push(cur); cur = [] }
  }
  bars.push(cur)
  let groups = bars.filter((b) => b.length)
  // drop a single leading pickup bar (shorter than a full measure) so "0 1 | 1 1 1 1 1 2 …"
  // matches the same phrase entered on the downbeat as "1 1 1 1 1 2 | …"
  if (groups.length > 1 && expBeats) {
    const firstBeats = beatCount(parseNotes(groups[0].join(' ')))
    if (firstBeats > 0 && firstBeats < expBeats - 1e-6) groups = groups.slice(1)
  }
  return groups.map((b) => b.join(' ')).join(' | ')
}

export function resolveContent(content) {
  if (!content || !Array.isArray(content.stanzas)) return content?.lines || []
  const byId = {}
  for (const s of content.stanzas) byId[s.id] = s
  const out = []
  const expBeats = expectedBeats(content.timeSignature)
  // The songbook prints each melody line's notes ONCE; a later line renders as lyrics only
  // (stacked in place) when it repeats a melody. Two rules, both tagged here where the melody
  // is expanded (the sing view ignores the flag → notes on every line):
  //   (a) stanza reuse — a whole stanza sung again (verse 2, 3, a repeated refrain).
  //   (b) adjacent repeat — the SAME melody line twice in a row within one rendition (a
  //       refrain phrase sung with several lyric couplets). ADJACENT only, so an AABA verse
  //       whose 1st and 3rd lines share a tune (not adjacent) is never collapsed → its words
  //       stay in reading order.
  const seenStanza = new Set()
  ;(content.arrangement || []).forEach((entry, ei) => {
    const stanza = byId[entry.stanza]
    if (!stanza) return
    const stanzaFirst = !seenStanza.has(entry.stanza)
    seenStanza.add(entry.stanza)
    const syls = entry.syllables || []
    let si = 0
    let prevSig = null // previous line's melody signature, within this entry only
    ;(stanza.lines || []).forEach((line, li) => {
      const outLine = []
      // B102 — a section carrying the strophic "รับทุกข้อ" directive shows a one-time rubric
      // "(ร้องรับทุกข้อ)" next to its label; the refrain still prints ONCE (resolvePlayOrder,
      // not this display pass, repeats it for playback). The sheet is untouched otherwise.
      // B102-fix — an UNLABELLED verse (a common authoring shortcut for verse 1) must still
      // appear as a ท่อน everywhere sections are listed (selector · timeline · sheet), so it
      // gets a default "ข้อ N" (same convention as the editor's rowLabel). Only in a
      // MULTI-section song, so a single lyric block (incl. every v1-migrated song, whose lone
      // arrangement entry is unlabelled) stays heading-free as before.
      if (li === 0) {
        const label = (entry.label || '').trim()
        const name = label || ((content.arrangement || []).length > 1 ? `ข้อ ${ei + 1}` : '')
        if (name) {
          const marker = { type: 'section', name }
          if (entry.afterEachVerse) marker.rubric = 'ร้องรับทุกข้อ'
          outLine.push(marker)
        }
      }
      const sig = melodyLineSignature(line, expBeats)
      for (const item of line) {
        if (item.type === 'segment') {
          const n = syllableSlots(item.note || '')
          const slots = syls.slice(si, si + n)
          // `lyric` (joined) drives v1-style render / print / lyrics-only; `syllables`
          // (the raw per-slot tokens, blanks kept) lets SongSheet render one span per
          // syllable-bearing note for the B006 per-syllable highlight. si stays aligned
          // 1:1 with midi.js's per-segment slot count (both count every non-bracket box).
          outLine.push({ ...item, lyric: joinSyllables(slots), syllables: slots })
          si += n
        } else {
          outLine.push({ ...item })
        }
      }
      // Show this line's melody unless the stanza is a reuse (a) or it repeats the line just
      // above it (b). Line-level metadata carried as non-index array props so every existing
      // consumer (v1 render, midi, print) still iterates the items untouched.
      const melodyFirst = stanzaFirst && sig !== prevSig
      prevSig = sig
      outLine._stanza = entry.stanza
      outLine._melodyFirst = melodyFirst
      outLine._entryIndex = ei // B102 — which arrangement entry this display line belongs to
      outLine._stanzaLine = li // click-to-edit: source line index within its stanza, so a click
                               // on the preview traces back to the exact editable line/bar
      out.push(outLine)
    })
  })
  return out
}

// ---------- B102: play-order resolver (display order ↔ play order) ----------
// The sheet (resolveContent) writes each section ONCE; some songs SING a section more
// than the sheet shows it. resolvePlayOrder returns the PLAY order as display-line RANGES
// [{fromLi,toLi}] over resolveContent's output, so buildPlayNotes concatenates the ranges
// and a repeated section's notes replay carrying their ORIGINAL li — highlight, timeline
// dots and karaoke work exactly like the bar-level ‖: :‖ mechanism (midi.js expandRepeats).
// Returns null when the song has no directive → the caller plays the whole song in display
// order (byte-identical to today). This is the dispatch seam for Phase 2 jump symbols
// (D.C./D.S./Coda): they add more cases here; the display pass never changes.
export function resolvePlayOrder(content) {
  if (!isV2(content)) return null
  return resolveStrophicOrder(content)
}

// Strophic "ร้องรับทุกข้อ" (afterEachVerse): the refrain is sung after EVERY verse, but the
// sheet writes it once. Expand the play order to insert the refrain after each verse (unless
// the arrangement already places it there next). Returns null when no section carries the
// directive. Each arrangement entry expands to a contiguous run of display lines, so an entry
// maps to one {fromLi,toLi} range.
function resolveStrophicOrder(content) {
  const arr = content.arrangement || []
  const chorusIdx = arr.findIndex((e) => e && e.afterEachVerse)
  if (chorusIdx < 0) return null
  const lines = resolveContent(content)
  const ranges = [] // ranges[entryIndex] = {fromLi,toLi}
  lines.forEach((line, li) => {
    const e = line._entryIndex
    if (e == null) return
    if (!ranges[e]) ranges[e] = { fromLi: li, toLi: li }
    else ranges[e].toLi = li
  })
  const chorus = ranges[chorusIdx]
  if (!chorus) return null
  const chorusStanza = arr[chorusIdx].stanza
  const order = []
  arr.forEach((entry, i) => {
    const r = ranges[i]
    if (!r) return
    order.push(r)
    if (i === chorusIdx) return // the refrain itself — never append the refrain after itself
    if (i + 1 === chorusIdx) return // the arrangement already writes the refrain next
    // §4.1 "กางก่อน แล้วค่อยตัด": afterEachVerse expands the full sequence first; then a verse's
    // flow.skipSections trims. A verse that skips the refrain's stanza gets no trailing refrain.
    if (entry.flow && Array.isArray(entry.flow.skipSections) && entry.flow.skipSections.includes(chorusStanza)) return
    order.push(chorus) // after a verse → sing the refrain
  })
  return order
}
