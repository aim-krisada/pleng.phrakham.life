// G20 blast-radius sweep — READ ONLY (never writes a single row).
//
// Runs every song in the library through the REAL engine twice: the shipped songToNotes from
// before this change and the one with bar-scoped accidentals, then reports every note whose
// pitch moved. Comparing against the actual previous code (not a re-implementation of it) is
// the point — a hand-written "old algorithm" only tests the guess.
//
// SA's scan predicted exactly ONE affected bar (song #760 ท่อน B). More than that means the
// rule is reaching further than the standard allows — stop and report.
//
// Setup:  git show <base>:src/lib/midi.js > src/lib/_g20_old_midi.tmp.js
// Usage:  node tools/audit-accidental-scope.mjs
// (delete the temp file afterwards — it is not part of the app)
import { createClient } from '@supabase/supabase-js'
import { resolveContent } from '../src/lib/songModel.js'
import { songToNotes as newNotes } from '../src/lib/midi.js'
import { songToNotes as oldNotes } from '../src/lib/_g20_old_midi.tmp.js'
import { parseNotes, groupNotes, degreeKey } from '../src/lib/notation.js'

const SUPABASE_URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'

const pitches = (fn, content) => fn(content).map((n) => n.midi)

// the bars where a mark can now reach a later note — for a human-readable report
function inheritingBars(content) {
  const hits = []
  ;(content.lines || []).forEach((line, li) => {
    let bi = 0
    let alt = new Map()
    for (const item of line) {
      if (item?.type === 'bar') { bi++; alt = new Map(); continue }
      if (item?.type !== 'segment' || !item.note) continue
      for (const g of groupNotes(parseNotes(item.note))) {
        for (const t of g.tokens) {
          if (t.type !== 'note' || t.pitch === '0') continue
          const k = degreeKey(t)
          if (t.accidental === '#' || t.accidental === 'b') alt.set(k, t.accidental)
          else if (t.accidental === 'n') alt.delete(k)
          else if (alt.has(k)) hits.push({ li, bi, note: item.note, degree: k, acc: alt.get(k) })
        }
      }
    }
  })
  return hits
}

async function main() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data, error } = await sb.from('songs').select('number, title_th, content').order('number', { ascending: true })
  if (error) { console.error('Supabase read failed:', error.message); process.exitCode = 1; return }

  const songs = (data || []).filter((s) => s.content)
  let changedSongs = 0
  let changedNotes = 0
  let changedBars = 0
  const details = []

  for (const s of songs) {
    let content
    try { content = { ...s.content, lines: resolveContent(s.content) } } catch { content = s.content }
    let before, after
    try { before = pitches(oldNotes, content); after = pitches(newNotes, content) } catch (e) {
      details.push({ number: s.number, title: s.title_th, note: `engine threw: ${e.message}` })
      continue
    }
    if (before.length !== after.length) {
      details.push({ number: s.number, title: s.title_th, note: `note COUNT changed ${before.length} → ${after.length} — investigate` })
      changedSongs++
      continue
    }
    const diffs = []
    for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) diffs.push({ i, from: before[i], to: after[i] })
    if (!diffs.length) continue
    const bars = inheritingBars(content)
    changedSongs++
    changedNotes += diffs.length
    changedBars += new Set(bars.map((b) => `${b.li}/${b.bi}`)).size
    details.push({ number: s.number, title: s.title_th, diffs, bars })
  }

  console.log(`songs scanned : ${songs.length}`)
  console.log(`songs changed : ${changedSongs}`)
  console.log(`notes changed : ${changedNotes}`)
  console.log(`bars involved : ${changedBars}`)
  for (const d of details) {
    console.log(`\n#${d.number} ${d.title}`)
    if (d.note) { console.log('  ' + d.note); continue }
    for (const x of d.diffs) console.log(`  note[${x.i}] ${x.from} → ${x.to} (${x.to - x.from > 0 ? '+' : ''}${x.to - x.from} semitone)`)
    for (const b of d.bars) console.log(`  bar li=${b.li} bi=${b.bi} · degree ${b.degree} inherits ${b.acc} · note="${b.note}"`)
  }
}

main()
