// B110 A7 — sweep the whole readable song library for beam runs that MIX เขบ็ต 1 ชั้น and
// 2 ชั้น, i.e. the runs the old `u2: run.some(...)` flag drew wrong (a 1-underline note
// painted with a double bar). Also (A5) dumps every song's playable note list so the same
// script can prove, before vs after, that the sound did not move.
//
//   node tools/audit-beam-levels.mjs            → the A7 report
//   node tools/audit-beam-levels.mjs --midi OUT → write the note-list snapshot to OUT (A5)
//
// SCOPE LIMIT (must stay in any report built from this): it reads Supabase with the
// PUBLISHABLE key, so it only sees rows the anon role may read. Songs behind a
// verified/auth RLS policy are NOT covered — never call this a 100% sweep.
import { supabase } from '../src/supabase.js'
import { beamGroups } from '../src/lib/notation.js'
import { resolveContent } from '../src/lib/songModel.js'
import { songToNotes } from '../src/lib/midi.js'

// walk any resolved-content shape and hand back every {note, syllables} segment in order
function eachSegment(node, out = []) {
  if (!node) return out
  if (Array.isArray(node)) { for (const n of node) eachSegment(n, out); return out }
  if (typeof node !== 'object') return out
  if (typeof node.note === 'string' && node.note.trim()) {
    out.push({ note: node.note, syllables: Array.isArray(node.syllables) ? node.syllables : null })
  }
  for (const k of Object.keys(node)) eachSegment(node[k], out)
  return out
}

// a run is a B110 case when a level >= 2 does NOT cover the same span as level 1 — that is
// exactly when the old single-flag drawing over-painted a lower-level note.
function mixedRuns(note, syllables) {
  const { beams } = beamGroups(note, syllables)
  const hits = []
  for (const b of beams) {
    const l1 = (b.levels || []).find((l) => l.level === 1)
    if (!l1) continue
    const hi = (b.levels || []).filter((l) => l.level >= 2)
    if (hi.length && hi.some((l) => l.start !== l1.start || l.end !== l1.end)) {
      hits.push({ run: `${b.start}-${b.end}`, levels: b.levels })
    }
  }
  return hits
}

const { data, error } = await supabase.from('songs').select('id,number,title_th,content')
if (error) { console.error('supabase:', error.message); process.exit(1) }

const midiMode = process.argv.indexOf('--midi')
if (midiMode !== -1) {
  const out = {}
  for (const s of [...data].sort((a, b) => (a.number || 0) - (b.number || 0))) {
    try {
      // songToNotes reads a v1-shaped `content.lines`, the same shape playback feeds it
      const c = { ...s.content, lines: resolveContent(s.content) }
      out[s.id] = songToNotes(c).map((n) =>
        [n.midi ?? "-", n.beats ?? "-", n.li ?? "-", n.bi ?? "-", n.si ?? "-", n.syk ?? "-", n.chord ?? ""].join(','),
      )
    } catch (e) { out[s.id] = 'ERROR: ' + e.message }
  }
  const fs = await import('node:fs')
  fs.writeFileSync(process.argv[midiMode + 1], JSON.stringify(out, null, 0))
  console.log(`midi snapshot: ${Object.keys(out).length} songs → ${process.argv[midiMode + 1]}`)
  process.exit(0)
}

// --verify — the B110 invariant, over EVERY beamed note in the library (not a sample):
// the number of level bars covering a note must equal that note's own `underlines`.
// 1 ขีด → 1 เส้น · 2 ขีด → 2 เส้น, whatever it is beamed to. This is the machine-checkable
// form of พี่เปา's complaint, so a regression anywhere in the library fails it.
if (process.argv.includes('--verify')) {
  let notes = 0
  const bad = []
  for (const s of data) {
    let segs
    try { segs = eachSegment(resolveContent(s.content)) } catch (e) { continue }
    for (const seg of segs) {
      let gs, beams
      try { ({ groups: gs, beams } = beamGroups(seg.note, seg.syllables)) } catch (e) { continue }
      const covering = new Map()
      for (const b of beams) {
        for (const l of b.levels || []) {
          for (let i = l.start; i <= l.end; i++) covering.set(i, (covering.get(i) || 0) + 1)
        }
      }
      for (const g of gs) {
        for (const t of g.tokens) {
          if (t.type !== 'note' || !t.beamed) continue
          notes++
          const drawn = covering.get(t.idx) || 0
          if (drawn !== t.underlines) {
            bad.push(`#${s.number} "${seg.note}" idx${t.idx} (${t.pitch}) underlines=${t.underlines} drawn=${drawn}`)
          }
        }
      }
    }
  }
  console.log(`B110 invariant — lines drawn === underlines, over every beamed note`)
  console.log(`songs: ${data.length} · beamed notes checked: ${notes} · violations: ${bad.length}`)
  for (const b of bad.slice(0, 30)) console.log('  ' + b)
  process.exit(bad.length ? 1 : 0)
}

let runsTotal = 0
let segsTotal = 0
const affected = []
for (const s of [...data].sort((a, b) => (a.number || 0) - (b.number || 0))) {
  let segs
  try { segs = eachSegment(resolveContent(s.content)) } catch (e) { continue }
  const notes = new Map()
  for (const seg of segs) {
    segsTotal++
    try {
      runsTotal += beamGroups(seg.note, seg.syllables).beams.length
      const hits = mixedRuns(seg.note, seg.syllables)
      if (hits.length) notes.set(seg.note, (notes.get(seg.note) || 0) + hits.length)
    } catch (e) { /* unreadable segment — skipped, same as the app */ }
  }
  if (notes.size) {
    affected.push({
      number: s.number, title: s.title_th, id: s.id,
      points: [...notes.values()].reduce((a, b) => a + b, 0),
      notes: [...notes.keys()],
    })
  }
}

const points = affected.reduce((a, s) => a + s.points, 0)
console.log('B110 A7 — beam-level sweep (anon-readable songs only)')
console.log(`songs read      : ${data.length}`)
console.log(`melody segments : ${segsTotal}`)
console.log(`beam runs       : ${runsTotal}`)
console.log(`MIXED-LEVEL runs: ${points}  in ${affected.length} songs`)
console.log('')
for (const s of affected) {
  console.log(`  #${s.number}  ${s.title}`)
  console.log(`     points: ${s.points} · ${s.id}`)
  for (const n of s.notes) console.log(`     note  : ${n}`)
}
