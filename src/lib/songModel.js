import { syllableSlots, attackSlots, noteBoxKinds, parseNotes, beatCount, expectedBeats } from './notation.js'

export function isV2(content) {
  return !!(content && Array.isArray(content.stanzas))
}

// 717 multi-lyric — Thai ordinals for the positional fallback name of a lyric set.
export const THAI_DIGITS = ['๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙', '๑๐']

// The human name of ONE lyric set — the single source of truth for reader, editor,
// search and print, so a set is never named two different things in two places.
//
// Two sets of words under one melody are DIFFERENT SONGS to the people who sing them
// ("different words must have different names" — P'Aim), so a set carries its own
// `name`. Older 717 data wrote the positional caption into `label`; data older still
// (and any set an author never named) carries neither and falls back to the positional
// "ทำนอง ๑/๒" the app has always shown. Never drop the `label` fallback: it is what
// every already-saved 717 song has.
export function lyricSetName(set, i) {
  const name = (set?.name || '').trim()
  if (name) return name
  const label = (set?.label || '').trim()
  if (label) return label
  return 'ทำนอง ' + (THAI_DIGITS[i] || i + 1)
}

// How many lyric SETS a song declares — 0 for every ordinary song (incl. all ~120 in the
// library today), so every set-aware branch below is dead code unless a song opts in.
export function lyricSetCount(content) {
  const ls = content?.lyricSets
  return Array.isArray(ls) && ls.length > 1 ? ls.length : 0
}

// 717 multi-lyric — several sets of WORDS under ONE melody, which you SWITCH between (not
// stack). `content.lyricSets = [{name}]`; each arrangement entry tags its set with `set`
// (index), and an entry with NO `set` is SHARED by every set (a common refrain).
//
// Returns the predicate that keeps one set's entries, or null when the song has no sets
// (→ nothing is filtered, byte-identical to before). An out-of-range/absent `set` option
// falls back to the FIRST set — never to the concatenation, which would render the two
// sets as "ข้อ 1 / ข้อ 2" and mean a different song than either.
// Read a `set` value as an index. Anything that isn't a whole number — absent, blank, junk —
// reads as null = SHARED. Numeric strings count ("1" is what a tool that stringifies its JSON
// writes): under `===` a string set would match no set at all and the sheet would come out
// EMPTY, which is a worse failure than any wrong-words case this feature is meant to prevent.
// Only a number or a numeric string is a set. Coercing anything else would invent one:
// Number([]) is 0 and Number(true) is 1, so an empty array or a stray boolean would quietly
// claim membership of a real set instead of reading as shared.
export function lyricSetIndex(v) {
  if (typeof v !== 'number' && typeof v !== 'string') return null
  if (v === '') return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}
const setIndex = lyricSetIndex

export function lyricSetFilter(content, opts) {
  const n = lyricSetCount(content)
  if (!n) return null
  const want = setIndex(opts?.set)
  const use = want != null && want >= 0 && want < n ? want : 0
  const f = (entry) => {
    const s = setIndex(entry?.set)
    return s == null || s === use
  }
  f.set = use
  return f
}

// The song narrowed to ONE lyric set, as a standalone song.
//
// For the sheet, the set rides along as an option (resolveContent(content, {set})) so every
// surviving line can keep its ORIGINAL `_entryIndex` and the inline editor still writes back
// to the right entry. The export path deliberately takes no options — audioExport derives the
// sheet AND the play order from `content` alone, so no caller can forget one of them — so it
// needs the choice baked into the content instead. Hence this: filter the arrangement, and
// leave a single-element `lyricSets` behind so lyricSetCount() reads 0 and nothing filters a
// second time (which would silently snap the export back to set 0).
//
// `_entryIndex` on the result indexes the NARROWED arrangement, so this is for read-only
// consumers (export, estimate). Never feed it to anything that writes back.
// Returns the content untouched when the song declares no sets.
export function scopeToLyricSet(content, set) {
  if (!lyricSetCount(content)) return content
  const inSet = lyricSetFilter(content, { set })
  return {
    ...content,
    lyricSets: [content.lyricSets[inSet.set]],
    arrangement: (content.arrangement || []).filter(inSet),
  }
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

// `opts.set` (717 multi-lyric) picks WHICH lyric set is written out — see lyricSetFilter.
// Filtered-out entries are skipped, but a surviving entry keeps its ORIGINAL arrangement
// index in `_entryIndex`, so click-to-edit / withSetSyllable still write to the right
// entry of the unfiltered content.
export function resolveContent(content, opts) {
  if (!content || !Array.isArray(content.stanzas)) return content?.lines || []
  const inSet = lyricSetFilter(content, opts)
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
  // The entries THIS sheet writes out (all of them when the song has no lyric sets). The
  // "ข้อ N" default below counts within this list, not the raw arrangement: on a song with
  // two lyric sets, each set is its own reading of the song — its first unlabelled verse is
  // ข้อ 1, and a set holding a single lyric block stays heading-free like any other song.
  // Original arrangement index → its position on THIS sheet. With no lyric sets nothing is
  // filtered, so seq === ei and seqOf.size === arrangement.length — the numbering every
  // existing song already gets, unchanged down to an entry naming a stanza that isn't there.
  const seqOf = new Map()
  ;(content.arrangement || []).forEach((e, i) => {
    if (!inSet || inSet(e)) seqOf.set(i, seqOf.size)
  })
  ;(content.arrangement || []).forEach((entry, ei) => {
    if (inSet && !inSet(entry)) return // 717 — a different set's words: not on THIS sheet
    const stanza = byId[entry.stanza]
    if (!stanza) return
    const seq = seqOf.get(ei) ?? ei // position within THIS sheet (= ei when there are no sets)
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
        const name = label || (seqOf.size > 1 ? `ข้อ ${seq + 1}` : '')
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
// `opts.set` rides through to resolveContent so the returned display-line ranges line up
// 1:1 with the sheet the reader is actually looking at (717 multi-lyric).
export function resolvePlayOrder(content, opts) {
  if (!isV2(content)) return null
  const strophic = resolveStrophicOrder(content, opts)
  const jumped = resolveJumpOrder(content, strophic, opts)
  return jumped ?? strophic
}

// Strophic "ร้องรับทุกข้อ" (afterEachVerse): the refrain is sung after EVERY verse, but the
// sheet writes it once. Expand the play order to insert the refrain after each verse (unless
// the arrangement already places it there next). Returns null when no section carries the
// directive. Each arrangement entry expands to a contiguous run of display lines, so an entry
// maps to one {fromLi,toLi} range.
function resolveStrophicOrder(content, opts) {
  const arr = content.arrangement || []
  const inSet = lyricSetFilter(content, opts)
  // the refrain of THIS lyric set — another set's refrain is not on this sheet, so it can
  // never be the one inserted after these verses
  const chorusIdx = arr.findIndex((e) => e && e.afterEachVerse && (!inSet || inSet(e)))
  if (chorusIdx < 0) return null
  const lines = resolveContent(content, opts)
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
  // The entry that comes next ON THIS SHEET. With no lyric sets that is simply i+1; with sets,
  // the entries between can belong to another set and are not written out here, so a raw i+1
  // would miss the "the arrangement already writes the refrain next" case and sing the refrain
  // twice in a row.
  const nextShown = (i) => {
    for (let k = i + 1; k < arr.length; k++) if (ranges[k]) return k
    return -1
  }
  const order = []
  arr.forEach((entry, i) => {
    const r = ranges[i]
    if (!r) return
    order.push(r)
    if (i === chorusIdx) return // the refrain itself — never append the refrain after itself
    if (nextShown(i) === chorusIdx) return // the arrangement already writes the refrain next
    // §4.1 "กางก่อน แล้วค่อยตัด": afterEachVerse expands the full sequence first; then a verse's
    // flow.skipSections trims. A verse that skips the refrain's stanza gets no trailing refrain.
    if (entry.flow && Array.isArray(entry.flow.skipSections) && entry.flow.skipSections.includes(chorusStanza)) return
    order.push(chorus) // after a verse → sing the refrain
  })
  return order
}

// ---------- Phase 2 (mid-bar): D.C./D.S./Segno/Coda/Fine jump resolver ----------
// See docs/ds/repeat-jumps-midbar.md. CANONICAL MARKER SHAPE (§7): every navigation symbol is
// a LINE ITEM {type:'jump', kind, al?, id} — kind: segno|coda|to-coda|dc|ds|fine — the same
// shape the glyph-render lane (SongSheet.vue) draws. Legacy per-type items ({type:'segno'},
// {type:'marker',kind:'fine'}) normalise in. A dc/ds item IS the jump command and fires at ITS
// OWN (li,si), so the jump can land MID-BAR (not just at a line boundary). Segno/Coda/Fine/
// To-Coda are position markers. al ('fine'|'coda') rides on the dc/ds item = the explicit exit
// target (repeat-jumps §2.2: al-Fine vs al-Coda is chosen, not inferred).
//
// Play order is expressed as display-line ranges with (li,si) ENDPOINTS
// [{fromLi,fromSi?,toLi,toSi?}] so buildPlayNotes concatenates them exactly like the strophic +
// bar-level (‖: :‖) mechanisms; a range with fromSi/toSi absent spans the WHOLE line (the
// line-level / strophic order — byte-identical, regression 0). Returns null when there is no
// (resolvable) jump → the caller uses the strophic/natural order.

// Normalise a line item to its jump kind, or null. Mirrors SongSheet.vue's render contract so
// engine + render read one shape. A plain {type:'marker', label} (no kind) is NOT a jump.
function jumpKindOf(it) {
  if (!it || !it.type) return null
  const norm = (k) => {
    const s = String(k || '').toLowerCase().replace(/[\s._-]/g, '')
    if (s === 'segno' || s === 'dalsegnomark') return 'segno'
    if (s === 'coda' || s === 'codamark') return 'coda'
    if (s === 'tocoda') return 'to-coda'
    if (s === 'dc' || s === 'dacapo') return 'dc'
    if (s === 'ds' || s === 'dalsegno') return 'ds'
    if (s === 'fine') return 'fine'
    return null
  }
  let kind = norm(it.type)
  if (!kind && (it.type === 'jump' || it.type === 'marker')) kind = norm(it.kind)
  return kind
}
function normAl(al) {
  const s = String(al || '').toLowerCase()
  return s === 'fine' || s === 'coda' ? s : null
}
// Cheap pre-check: is there a dc/ds jump command anywhere? Avoids a resolveContent pass for the
// ~100% of songs that have no jump.
function hasJumpCommand(content) {
  for (const s of content?.stanzas || [])
    for (const line of s.lines || [])
      for (const it of line || []) {
        const k = jumpKindOf(it)
        if (k === 'dc' || k === 'ds') return true
      }
  return false
}
function cmpPos(a, b) {
  if (!a || !b) return 0
  if (a.li !== b.li) return a.li - b.li
  return (a.si == null ? -Infinity : a.si) - (b.si == null ? -Infinity : b.si)
}

// Scan the resolved display lines for every jump marker, recording each as (li,si). si is the
// SEGMENT index songToNotes assigns (segments advance si; bars/markers/repeat do not) — so the
// anchor lands on a real note. Return-target markers (segno, coda) anchor to the FIRST segment
// AT/AFTER the item (si = segments before it). Exit markers + jump commands (fine, to-coda, dc,
// ds) anchor to the LAST segment BEFORE the item (si = segments before it − 1). Records the
// FIRST occurrence of each in play order (nested jumps are a v1 known-limit).
function scanFlowMarkers(lines) {
  let segno = null, fine = null, dc = null, ds = null
  const codas = [], toCodas = []
  lines.forEach((line, li) => {
    let seg = -1 // si of the last segment seen so far (matches songToNotes)
    for (const it of line || []) {
      if (it && it.type === 'segment') { seg++; continue }
      const kind = jumpKindOf(it)
      if (!kind) continue
      const before = seg // last note before the marker
      const atAfter = seg + 1 // first note at/after the marker
      if (kind === 'segno') { if (!segno) segno = { li, si: atAfter } }
      else if (kind === 'coda') codas.push({ li, si: atAfter })
      else if (kind === 'to-coda') toCodas.push({ li, si: before })
      else if (kind === 'fine') { if (!fine) fine = { li, si: before } }
      else if (kind === 'dc') { if (!dc) dc = { li, si: before, al: normAl(it.al) } }
      else if (kind === 'ds') { if (!ds) ds = { li, si: before, al: normAl(it.al) } }
    }
  })
  return { segno, fine, dc, ds, coda: codas[0] || null, toCoda: toCodas[0] || null }
}

// The return-pass ranges for a resolved jump. `from` = {li,si} of the return target (segno, or
// {li:0,si:null} for capo). al ('fine'|'coda'|null) is the explicit exit; when null it is
// inferred from the markers present (Coda wins over Fine — the play flow reaches To-Coda first).
function returnRanges(from, marks, al, lastLi) {
  const codaPair = !!(marks.toCoda && marks.coda)
  const codaRanges = () => [
    // al Coda: play to the To-Coda, jump to the Coda, play to the end
    { fromLi: from.li, fromSi: from.si, toLi: marks.toCoda.li, toSi: marks.toCoda.si },
    { fromLi: marks.coda.li, fromSi: marks.coda.si, toLi: lastLi, toSi: null },
  ]
  const fineRange = () => [{ fromLi: from.li, fromSi: from.si, toLi: marks.fine.li, toSi: marks.fine.si }]
  // Explicit al chooses the exit (repeat-jumps §2.2); al=null infers, Coda winning over Fine
  // (the play flow reaches To-Coda before Fine). When the requested exit's marker is MISSING the
  // jump degrades gracefully — try the other exit, else plain replay — never a broken route.
  if (al === 'coda' && codaPair) return codaRanges()
  if (al === 'fine' && marks.fine) return fineRange()
  if (al == null && codaPair) return codaRanges() // inferred al Coda
  if (marks.fine) return fineRange() // al Fine, or graceful fallback when the Coda is missing
  if (codaPair) return codaRanges() // last resort (al='fine' asked but no Fine; a Coda exists)
  return [{ fromLi: from.li, fromSi: from.si, toLi: lastLi, toSi: null }] // plain D.C./D.S.
}

// Build the full play order when a jump is present; null when there is none (or it is orphan).
// `base` = the strophic order if any, else the natural whole-song order. First pass plays up to
// the jump command's own note; then the return pass. Post-jump material is unreachable (the
// movement ends at Fine/Coda/end) and dropped.
function resolveJumpOrder(content, base, opts) {
  if (!isV2(content) || !hasJumpCommand(content)) return null
  const lines = resolveContent(content, opts)
  if (!lines.length) return null
  const lastLi = lines.length - 1
  const marks = scanFlowMarkers(lines)
  // which command fires (nested unsupported): the earliest in play order
  let cmd = null
  if (marks.dc && marks.ds) cmd = cmpPos(marks.dc, marks.ds) <= 0
    ? { ...marks.dc, jump: 'capo' } : { ...marks.ds, jump: 'segno' }
  else if (marks.dc) cmd = { ...marks.dc, jump: 'capo' }
  else if (marks.ds) cmd = { ...marks.ds, jump: 'segno' }
  if (!cmd) return null
  let from
  if (cmd.jump === 'capo') from = { li: 0, si: null } // D.C. → song start
  else {
    if (!marks.segno) return null // orphan D.S. — no segno marker; play as written (never guess)
    from = marks.segno // D.S. → the segno (may be mid-bar)
  }
  const baseOrder = base && base.length ? base : [{ fromLi: 0, toLi: lastLi }]
  // keep base ranges up to the jump command's position, cutting the range that spans it
  const kept = []
  for (const r of baseOrder) {
    if (r.fromLi > cmd.li) break // range entirely after the jump line → unreachable first pass
    if (r.toLi < cmd.li) { kept.push(r); continue } // range entirely before → keep whole
    kept.push({ fromLi: r.fromLi, fromSi: r.fromSi ?? null, toLi: cmd.li, toSi: cmd.si })
    break
  }
  return kept.concat(returnRanges(from, marks, cmd.al, lastLi))
}
