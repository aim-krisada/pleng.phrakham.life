// Rhythm diagnosis (พี่เปา: "จังหวะเล่นแปลก") — READ-ONLY.
//
// Method (deliberately in this order):
//   1. `refBeats()` below is an INDEPENDENT re-reading of the notation spec (the header of
//      src/lib/notation.js + docs/song-model-v2.md). It is written from the spec, not from
//      the app's code, so "what the sheet says" is computed BEFORE we look at what the app
//      produces. It never imports notation.js.
//   2. Only then do we run the app's own songToNotes() and compare.
//   3. The same comparison runs against THREE code snapshots (HEAD / d3f35c2 = base before
//      today / origin/main = what พี่เปา uses daily) so we can say whether an oddity is new.
//
//   run: node tools/diag-rhythm.mjs <songs.json> <srcDirHEAD> <srcDirOld> <srcDirMain>
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE MODEL — written from the notation spec, independent of the app's parser.
//    A note box:  [~] [#|b|n] [.]*  digit  [']*  [_]{0,2}  [.]{0,2}  [~] [^]
//    plain digit = 1 quarter-note beat · each `_` halves it · one aug dot ×1.5 ·
//    two aug dots ×1.75 · `-` = one more beat on the note before it · `0` = a rest
//    of its own written length · `{ }` = triplet (the group's total ×2/3) ·
//    `|` = bar line, no duration · `^` = fermata (a PLAYBACK stretch only, ignored
//    when checking that a bar adds up).
// ─────────────────────────────────────────────────────────────────────────────
const DOT = [1, 1.5, 1.75]

// Read ONE whitespace-separated box → a LIST of tokens. Spaces between notes are optional
// (the spec: "123" = "1 2 3", "1-" = a note plus a one-beat extension), so a box may hold
// several tokens. Modifiers are accepted in any order around their digit (the order-free
// rule), except that a `.` BEFORE the digit is a low-octave dot and AFTER it an augmentation
// dot, and a `~` before is a tie-end / after a tie-start — those two keep their side.
// token kinds: 'note' | 'ext' | 'struct' | 'unreadable'
function refBox(box) {
  const out = []
  let s = box
  const opens = []
  const closes = []
  while (s.length && (s[0] === '(' || s[0] === '{')) { opens.push(s[0] === '(' ? 'slur' : 'triplet'); s = s.slice(1) }
  while (s.length && (s[s.length - 1] === ')' || s[s.length - 1] === '}')) { closes.unshift(s[s.length - 1] === ')' ? 'slur' : 'triplet'); s = s.slice(0, -1) }
  // split the bare core into runs of "one pitch digit + the modifiers around it"
  const chars = [...s]
  const digitAt = chars.map((c) => c >= '0' && c <= '7')
  const nDigits = digitAt.filter(Boolean).length
  if (!chars.length) out.push({ kind: 'struct' })
  else if (nDigits === 0) {
    // no digit at all: only '-' extensions are legal here
    for (const c of chars) {
      if (c === '-' || c === '–') out.push({ kind: 'ext', beats: 1 })
      else { out.push({ kind: 'unreadable', raw: box }); break }
    }
  } else {
    // a run starts at a digit and owns the modifiers before it (until the previous digit's
    // trailing modifiers) and after it. Cut points: just before the LEADING modifiers of a digit.
    // Leading modifiers are #/b/n, '.', '~' — anything else after a digit belongs to that digit.
    const cuts = []
    for (let k = 0; k < chars.length; k++) {
      if (!digitAt[k]) continue
      let start = k
      while (start > 0 && !digitAt[start - 1] && '#bn.~'.includes(chars[start - 1])) start--
      cuts.push(start)
    }
    // anything before the first cut that is not part of a run must be '-' extensions
    for (let k = 0; k < cuts[0]; k++) {
      const c = chars[k]
      if (c === '-' || c === '–') out.push({ kind: 'ext', beats: 1 })
      else { out.push({ kind: 'unreadable', raw: box }); return { opens, closes, tokens: out } }
    }
    for (let r = 0; r < cuts.length; r++) {
      const from = cuts[r]
      const to = r + 1 < cuts.length ? cuts[r + 1] : chars.length
      const seg = chars.slice(from, to)
      const di = seg.findIndex((c) => c >= '0' && c <= '7')
      let low = 0, high = 0, beams = 0, augDots = 0, fermata = false, bad = false
      const exts = []
      for (let k = 0; k < seg.length; k++) {
        if (k === di) continue
        const c = seg[k]
        const before = k < di
        if (c === '#' || c === 'b' || c === 'n') continue
        else if (c === '.') { if (before) low++; else augDots++ }
        else if (c === '_') beams++
        else if (c === '^') fermata = true
        else if (c === '~') continue
        else if ("'‘’′".includes(c)) high++
        else if (c === '-' || c === '–') exts.push(1)
        else bad = true
      }
      if (bad || beams > 2 || augDots > 2) { out.push({ kind: 'unreadable', raw: box }); continue }
      out.push({ kind: 'note', digit: seg[di], low, high, fermata, beats: (1 / 2 ** beams) * DOT[augDots] })
      for (const e of exts) out.push({ kind: 'ext', beats: e })
    }
  }
  return { opens, closes, tokens: out }
}

// A whole note string → flat token list with WRITTEN beats (fermata NOT applied), split
// into bars at every `|`. Returns [{ bars:[[tok,…],…] }] — one entry, bars in order.
function refParse(str) {
  const bars = [[]]
  let depth = 0 // triplet nesting, carried across boxes so `{ 1 2 3 }` scales all three
  const feed = (box) => {
    const { opens, closes, tokens } = refBox(box)
    depth += opens.filter((g) => g === 'triplet').length
    for (const t of tokens) {
      if (depth > 0 && t.beats != null) t.beats = (t.beats * 2) / 3
      bars[bars.length - 1].push(t)
    }
    depth -= closes.filter((g) => g === 'triplet').length
    if (depth < 0) depth = 0
  }
  for (const box of String(str || '').trim().split(/\s+/)) {
    if (!box) continue
    if (box.includes('|')) { // `|` = bar line, with or without spaces around it
      box.split('|').forEach((p, i) => { if (i) bars.push([]); if (p) feed(p) })
      continue
    }
    feed(box)
  }
  return bars
}

function refBeatsOfBar(bar) {
  return bar.reduce((s, t) => s + (t.beats || 0), 0)
}

function expectedBeats(ts) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(ts || '')
  return m ? (Number(m[1]) * 4) / Number(m[2]) : null
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Load the three code snapshots.
// ─────────────────────────────────────────────────────────────────────────────
const [songsPath, dHead, dOld, dMain] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))

async function loadSnap(dir) {
  const midi = await import(pathToFileURL(`${dir}/src/lib/midi.js`).href)
  const model = await import(pathToFileURL(`${dir}/src/lib/songModel.js`).href)
  return { midi, model }
}
const HEAD = await loadSnap(dHead)
const OLD = await loadSnap(dOld)
const MAIN = await loadSnap(dMain)

function resolvedOf(snap, content) {
  const lines = Array.isArray(content?.lines) && content.lines.length ? content.lines : snap.model.resolveContent(content)
  return { ...content, lines }
}

// the app's play timeline as a comparable fingerprint: [onsetBeat, beats, midi]
function timeline(snap, content) {
  try {
    const notes = snap.midi.songToNotes(resolvedOf(snap, content))
    let b = 0
    return notes.map((n) => { const o = b; b += n.beats; return [round(o), round(n.beats), n.midi] })
  } catch (e) { return { error: String(e && e.message) } }
}
const round = (x) => Math.round(x * 10000) / 10000

// ─────────────────────────────────────────────────────────────────────────────
// 3. Per-song report.
// ─────────────────────────────────────────────────────────────────────────────
const changedToday = []   // HEAD timeline differs from d3f35c2 (today's work)
const changedVsMain = []  // HEAD timeline differs from origin/main (what พี่เปา uses)
const barTrouble = []     // bars whose written beats ≠ the time signature
const parseTrouble = []   // boxes the spec can't read at all (silent skips)
const perSong = []

for (const s of songs) {
  const c = s.content || {}
  const res = resolvedOf(HEAD, c)
  const ts = c.timeSignature || res.timeSignature
  const exp = expectedBeats(ts)

  // --- model side: walk the resolved lines the same way the player does (segments + bars)
  const bars = []           // [{ li, bi, beats, boxes }]
  const unreadable = []
  ;(res.lines || []).forEach((line, li) => {
    let bi = 0
    let cur = { li, bi, beats: 0, boxes: 0, pickup: false }
    const push = () => { bars.push(cur); bi++; cur = { li, bi, beats: 0, boxes: 0, pickup: false } }
    for (const item of line || []) {
      if (item.type === 'bar') { push(); continue }
      // a bar carrying a ⟨pickup⟩ marker is DECLARED short (ห้องยก) — not an anomaly
      if (item.type === 'pickup') { cur.pickup = true; continue }
      if (item.type !== 'segment' || !item.note) continue
      const segBars = refParse(item.note)
      segBars.forEach((bar, k) => {
        if (k) push() // a `|` inside the note string is a bar line too
        cur.beats += refBeatsOfBar(bar)
        cur.boxes += bar.length
        for (const t of bar) if (t.kind === 'unreadable') unreadable.push({ li, raw: t.raw })
      })
    }
    push()
    bars.push({ lineEnd: true })
  })
  // A bar is closed by a BAR LINE, not by the end of a printed line: the sheet wraps mid-bar all
  // the time (the "3 beats then 1 beat" pattern). So join a line's trailing part-bar with the next
  // line's leading part-bar whenever the two together make one legal bar — otherwise every wrap
  // would read as two broken bars. Only the leftovers that still don't add up are real anomalies.
  const joined = []
  let pending = null
  let crossedLine = false
  for (const b of bars) {
    if (b.lineEnd) { crossedLine = true; continue }
    if (!b.boxes) continue
    if (pending) {
      if (crossedLine && exp && pending.beats < exp - 1e-9 && Math.abs(pending.beats + b.beats - exp) < 1e-6) {
        joined.push({ ...pending, beats: exp, wrapped: true })
        pending = null
        crossedLine = false
        continue
      }
      joined.push(pending)
    }
    pending = b
    crossedLine = false
  }
  if (pending) joined.push(pending)
  const real = joined
  // a bar is "off" when its written beats differ from the time signature. The FIRST and
  // LAST bar of a line are excluded from the count only when they are SHORT — that is the
  // normal pickup (ห้องยก) / final-bar pattern; a long bar is never legitimate.
  // Now that wrapped bars are joined, an "off" bar is one whose written beats still don't equal
  // the time signature. The FIRST bar of the song may legitimately be a pickup (ห้องยก) and the
  // LAST may be short — those two are excluded only when they are SHORT (a long bar is never legal).
  const off = exp ? real.filter((b, i) => {
    if (Math.abs(b.beats - exp) < 1e-6) return false
    if (b.pickup && b.beats < exp) return false // ห้องยก — declared short on purpose
    const edge = i === 0 || i === real.length - 1
    return !(edge && b.beats < exp)
  }) : []
  const pickup = exp && real.length && real[0].beats < exp - 1e-9 ? real[0].beats : 0

  const tHead = timeline(HEAD, c)
  const tOld = timeline(OLD, c)
  const tMain = timeline(MAIN, c)
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  if (!same(tHead, tOld)) changedToday.push(s)
  if (!same(tHead, tMain)) changedVsMain.push(s)
  if (off.length) barTrouble.push({ s, exp, ts, off, total: real.length })
  if (unreadable.length) parseTrouble.push({ s, unreadable })

  perSong.push({ number: s.number, title: s.title_th, ts, bars: real.length, off: off.length,
    pickup, offBars: off.map((o) => ({ li: o.li, bi: o.bi, beats: o.beats })),
    unreadable: unreadable.length, notes: Array.isArray(tHead) ? tHead.length : 'ERR' })
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Output
// ─────────────────────────────────────────────────────────────────────────────
const L = []
const say = (x = '') => { L.push(x); console.log(x) }
say(`songs: ${songs.length}`)
say(`playback timeline CHANGED by today's work (HEAD vs d3f35c2): ${changedToday.length}`)
for (const s of changedToday) say(`   #${s.number} ${s.title_th}`)
say(`playback timeline differs from origin/main: ${changedVsMain.length}`)
for (const s of changedVsMain) say(`   #${s.number} ${s.title_th}`)
say()
say(`songs with a bar whose written beats ≠ time signature: ${barTrouble.length}`)
for (const b of barTrouble.slice(0, 40)) {
  say(`   #${b.s.number} ${b.s.title_th} [${b.ts} → ${b.exp} beats] ${b.off.length}/${b.total} bars off`)
  for (const o of b.off.slice(0, 6)) say(`        line ${o.li} bar ${o.bi}: ${o.beats} beats (${o.beats > b.exp ? '+' : ''}${round(o.beats - b.exp)})`)
}
say()
say(`songs with a note box the spec cannot read: ${parseTrouble.length}`)
for (const p of parseTrouble.slice(0, 40)) say(`   #${p.s.number} ${p.s.title_th}: ${p.unreadable.slice(0, 8).map((u) => JSON.stringify(u.raw)).join(' ')}${p.unreadable.length > 8 ? ` …(${p.unreadable.length})` : ''}`)
writeFileSync(process.env.DIAG_OUT || 'diag-rhythm.txt', L.join('\n'))
writeFileSync(process.env.DIAG_JSON || 'diag-rhythm.json', JSON.stringify({ perSong, changedToday: changedToday.map((s) => s.number), changedVsMain: changedVsMain.map((s) => s.number) }, null, 1))
