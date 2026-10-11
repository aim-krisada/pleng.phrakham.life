// ใบ v3/pleng#105 — Step 2 of the book-phrase tool: turn the book text (step 1) into the data file
// the sheet reads, `src/data/bookPhrases.<book>.json`.
//
// READ-ONLY on the song database. It only ever reads songs; nothing is written back. The book is
// not always right and our lyrics were edited on purpose, so we take from the book exactly ONE
// thing: WHERE IT BREAKS. The words always stay the database's.
//
// How a verse is matched: the book verse and the database verse are aligned letter by letter
// (longest common subsequence, the same idea as difflib). Spelling differs often enough that an
// exact compare would throw away two thirds of the book (ใบ#105 note 5), so we align loosely and
// keep a verse only when it is at least MIN_RATIO alike. Each break the book drew is then carried
// across the alignment onto the database's own syllables, and dropped if it cannot land cleanly on
// a syllable edge. A verse the book words too differently is never guessed at — it is listed in
// the report for a person to fill in.
//
// Melody carry-over: the book prints the phrasing only for the verses it sets as plain text (verse
// 2, 3, …). Verse 1 and the refrain sit under the staff, where the spacing lines words up with the
// notes and says nothing about phrasing. But every verse sung to the SAME melody breathes in the
// same places, so a melody's phrasing is carried to its other verses, by note position, and marked
// `melody` in the report. Pass --no-melody to leave those verses out.
//
//   node tools/bookPhrases/build.mjs --book-text tools/bookPhrases/book-anuchon.json \
//        --songs tmp/anuchon.json --out src/data/bookPhrases.anuchon.json --report tmp/report.json
import fs from 'node:fs'
import path from 'node:path'
import { syllableSlots } from '../../src/lib/notation.js'

const MIN_RATIO = 0.8 // below this the book words the verse too differently — skip, never guess
// the same word breaker the sheet uses (lib/lyricPhrase.js) — Node ships it too. A carried-over
// break must land on a word edge; the printed book's own breaks never need checking.
const WORDS = new Intl.Segmenter('th', { granularity: 'word' })
function wordEdges(text) {
  const out = new Set([0, text.length])
  for (const part of WORDS.segment(text)) out.add(part.index)
  return out
}
const SNAP = 3 // a break may slide this many letters to reach a syllable edge; further = drop it

function arg(name, def) {
  const i = process.argv.indexOf('--' + name)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def
}
const has = (name) => process.argv.includes('--' + name)

// ---- the database side: a verse -> its sheet lines -> each line's sung syllables -------------
// Mirrors resolveContent()/SongSheet's own walk: one slot per note box, blank slots are เอื้อน.
function verseLines(content, entry) {
  const stanza = (content.stanzas || []).find((s) => s.id === entry.stanza)
  if (!stanza) return null
  const syls = entry.syllables || []
  let si = 0
  const lines = []
  for (const line of stanza.lines || []) {
    const units = [] // one per sung syllable: { slot (index within the line), text }
    let slot = 0
    for (const item of line) {
      if (item.type !== 'segment') continue
      const n = syllableSlots(item.note || '')
      for (let k = 0; k < n; k++) {
        const w = (syls[si + k] || '').trim()
        if (w) units.push({ slot: slot + k, text: w })
      }
      si += n
      slot += n
    }
    lines.push({ slots: slot, units })
  }
  return lines
}

// ---- loose letter-by-letter alignment (LCS) --------------------------------------------------
// → { ratio, map } where map[i] = the index in `b` that book letter a[i] lines up with, or -1.
function align(a, b) {
  const n = a.length
  const m = b.length
  if (!n || !m) return { ratio: 0, map: [] }
  let prev = new Uint16Array(m + 1)
  const rows = [] // keep every row so we can walk the match back out
  for (let i = 0; i < n; i++) {
    const cur = new Uint16Array(m + 1)
    const ai = a[i]
    for (let j = 0; j < m; j++) cur[j + 1] = ai === b[j] ? prev[j] + 1 : Math.max(cur[j], prev[j + 1])
    rows.push(cur)
    prev = cur
  }
  const map = new Array(n).fill(-1)
  let i = n - 1
  let j = m - 1
  while (i >= 0 && j >= 0) {
    const cur = rows[i]
    const up = i > 0 ? rows[i - 1] : new Uint16Array(m + 1)
    if (a[i] === b[j] && cur[j + 1] === up[j] + 1) { map[i] = j; i--; j-- }
    else if (cur[j] >= up[j + 1]) j--
    else i--
  }
  return { ratio: (2 * prev[m]) / (n + m), map }
}

// ---- carry one book verse's breaks onto one database verse ------------------------------------
// book = [[phrase, phrase], …] (one entry per printed line); dbLines = verseLines() output.
// → { lines: [[unitIndex, …], …], ratio, moved, dropped } or null when the words differ too much.
function carry(book, dbLines) {
  const bookText = book.flat().join('')
  // where the book breaks, as a letter offset into bookText (a break sits BEFORE that letter)
  const cuts = []
  let off = 0
  for (const ln of book) for (const p of ln) { off += p.length; if (off < bookText.length) cuts.push(off) }

  const dbText = dbLines.map((l) => l.units.map((u) => u.text).join('')).join('')
  const { ratio, map } = align(bookText, dbText)
  if (ratio < MIN_RATIO) return { ratio, skipped: true }

  // every syllable edge in dbText, as a letter offset -> which (line, unit) it follows
  const edges = []
  let acc = 0
  dbLines.forEach((l, li) => {
    l.units.forEach((u, ui) => {
      acc += u.text.length
      const lineEnd = ui === l.units.length - 1
      edges.push({ off: acc, li, ui, lineEnd })
    })
  })

  const out = dbLines.map(() => new Set())
  let dropped = 0
  let moved = 0
  for (const c of cuts) {
    let est = 0
    for (let i = c - 1; i >= 0; i--) if (map[i] >= 0) { est = map[i] + 1; break }
    let best = null
    for (const e of edges) { const d = Math.abs(e.off - est); if (best === null || d < best.d) best = { d, e } }
    if (!best || best.d > SNAP) { dropped++; continue }
    if (best.d) moved++
    if (!best.e.lineEnd) out[best.e.li].add(best.e.ui) // a new line is already a break
  }
  return { ratio, lines: out.map((s) => [...s].sort((x, y) => x - y)), dropped, moved }
}

// ---- main -------------------------------------------------------------------------------------
const bookFile = arg('book-text', 'tools/bookPhrases/book-anuchon.json')
const songsFile = arg('songs', '')
const outFile = arg('out', 'src/data/bookPhrases.anuchon.json')
const reportFile = arg('report', '')
const melody = !has('no-melody')

const bookDoc = JSON.parse(fs.readFileSync(bookFile, 'utf8'))
const book = bookDoc.book || 'anuchon'
const songs = JSON.parse(fs.readFileSync(songsFile, 'utf8'))
const bookByNum = new Map(bookDoc.songs.map((s) => [String(Number(s.number)), s]))

const data = {} // song number -> { line text: [unit index, …] }
const report = { book, generated: new Date().toISOString().slice(0, 10), songs: [], totals: {} }
let nVerseBook = 0
let nVerseExact = 0
let nMelodyMidWord = 0
let nVerseMelody = 0
let nVerseSkipped = 0
let nVerseNoText = 0
let nCuts = 0
let nMoved = 0
let nDropped = 0
const clashes = []

for (const song of songs) {
  const num = String(Number(song.number))
  const content = song.content || {}
  const entries = content.arrangement || []
  if (!entries.length || !Array.isArray(content.stanzas)) continue
  const bk = bookByNum.get(num)
  // the PDF text layer sometimes repeats a block — the same verse twice is still one verse
  const seenVerse = new Set()
  const bookVerses = (bk ? bk.verses : []).filter((v) => {
    const sig = v.lines.flat().join('|')
    if (seenVerse.has(sig)) return false
    seenVerse.add(sig)
    return true
  })
  const rec = { number: num, title: song.title_th, verses: entries.length, fromBook: 0, fromMelody: 0, notes: [] }

  const db = entries.map((e) => verseLines(content, e))
  const got = new Array(entries.length).fill(null)

  // 1. match book verses to database verses: best pair first, each used once
  const pairs = []
  bookVerses.forEach((bv, bi) => {
    entries.forEach((e, ei) => {
      if (!db[ei]) return
      const r = carry(bv.lines, db[ei])
      pairs.push({ bi, ei, r, ratio: r.ratio })
    })
  })
  pairs.sort((x, y) => y.ratio - x.ratio)
  const usedB = new Set()
  const usedE = new Set()
  for (const p of pairs) {
    if (usedB.has(p.bi) || usedE.has(p.ei)) continue
    if (p.r.skipped) continue
    usedB.add(p.bi); usedE.add(p.ei)
    got[p.ei] = { lines: p.r.lines, src: 'book' }
    nVerseBook++; rec.fromBook++
    if (!p.r.moved && !p.r.dropped) nVerseExact++ // every break the book drew landed exactly
    nMoved += p.r.moved; nDropped += p.r.dropped
    nCuts += p.r.lines.reduce((n, l) => n + l.length, 0)
  }
  for (let bi = 0; bi < bookVerses.length; bi++) {
    if (usedB.has(bi)) continue
    const best = pairs.filter((p) => p.bi === bi).sort((x, y) => y.ratio - x.ratio)[0]
    const pct = Math.round((best?.ratio || 0) * 100)
    const where = `หน้า ${bookVerses[bi].page} ${bookVerses[bi].label}`
    if (best && best.ratio >= MIN_RATIO) rec.notes.push(`${where}: หนังสือมีข้อนี้ แต่ข้อที่ตรงกันในคลังถูกจับคู่ไปแล้ว (คลังมีข้อน้อยกว่าหนังสือ)`)
    else rec.notes.push(`${where}: เนื้อในหนังสือกับในคลังต่างกันมาก (เหมือนกัน ${pct}%) — ต้องให้คนมาเติม`)
    nVerseSkipped++
  }

  // 2. carry a melody's phrasing to its other verses, by note position
  if (melody) {
    const byStanza = new Map()
    entries.forEach((e, ei) => {
      if (!got[ei] || got[ei].src !== 'book') return
      const key = e.stanza
      // breaks as NOTE positions, so another verse's blanks cannot shift them
      const asSlots = got[ei].lines.map((idxs, li) => new Set(idxs.map((u) => db[ei][li].units[u].slot)))
      const prev = byStanza.get(key)
      if (!prev) byStanza.set(key, asSlots)
      // two verses on one melody must agree: keep only the breaks both drew
      else prev.forEach((s, li) => { for (const v of [...s]) if (!asSlots[li] || !asSlots[li].has(v)) s.delete(v) })
    })
    entries.forEach((e, ei) => {
      if (got[ei] || !db[ei]) return
      const slots = byStanza.get(e.stanza)
      if (!slots) return
      const lines = db[ei].map((l, li) => {
        const want = slots[li] || new Set()
        const out = new Set()
        const edges = wordEdges(l.units.map((u) => u.text).join(''))
        const upto = []
        l.units.reduce((n, u) => { upto.push(n + u.text.length); return n + u.text.length }, 0)
        for (const s of want) {
          // only where THIS verse also sings a syllable on that very note: a verse whose blanks
          // fall elsewhere would otherwise get the break a syllable off. Conservative on purpose.
          const ui = l.units.findIndex((u) => u.slot === s)
          if (ui < 0 || ui >= l.units.length - 1) continue
          if (!edges.has(upto[ui])) { nMelodyMidWord++; continue } // would cut a word in half
          out.add(ui)
        }
        return [...out].sort((x, y) => x - y)
      })
      got[ei] = { lines, src: 'melody' }
      nVerseMelody++; rec.fromMelody++
    })
  }

  // 3. write out, keyed by the line's own words so the sheet needs no index bookkeeping
  const map = {}
  entries.forEach((e, ei) => {
    if (!got[ei]) { if (db[ei]) nVerseNoText++; return }
    db[ei].forEach((l, li) => {
      const text = l.units.map((u) => u.text).join('')
      if (!text) return
      const brk = got[ei].lines[li] || []
      const old = map[text]
      if (old && old.join(',') !== brk.join(',')) { clashes.push(`${num}: "${text.slice(0, 24)}…"`); return }
      map[text] = brk
    })
  })
  if (Object.keys(map).length) data[num] = map
  if (!bk) rec.notes.push('ไม่พบเพลงนี้ในไฟล์หนังสือ')
  else if (!bookVerses.length) rec.notes.push('หนังสือพิมพ์เพลงนี้ไว้ใต้โน้ตอย่างเดียว ไม่มีข้อที่เป็นตัวหนังสือล้วน — ไม่มีวรรคให้ดึง')
  report.songs.push(rec)
}

const covered = report.songs.filter((s) => s.fromBook + s.fromMelody > 0)
report.totals = {
  songsInLibrary: report.songs.length,
  songsCovered: covered.length,
  versesInLibrary: report.songs.reduce((n, s) => n + s.verses, 0),
  versesFromBook: nVerseBook,
  versesFromBookExactlyAsPrinted: nVerseExact,
  versesFromMelody: nVerseMelody,
  melodyBreaksRefusedMidWord: nMelodyMidWord,
  versesTooDifferent: nVerseSkipped,
  versesNoBookText: nVerseNoText,
  breaksTaken: nCuts,
  breaksNudgedToASyllableEdge: nMoved,
  breaksDropped: nDropped,
  sameLineDifferentBreaks: clashes.length,
}
report.sameLineDifferentBreaks = clashes
report.needsPerson = report.songs.filter((s) => s.notes.length).map((s) => ({ number: s.number, title: s.title, notes: s.notes }))

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify({ book, songs: data }, null, 0) + '\n', 'utf8')
if (reportFile) {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true })
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 1) + '\n', 'utf8')
}
console.log(JSON.stringify(report.totals, null, 1))
