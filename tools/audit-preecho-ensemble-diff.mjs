// PRE-ECHO port (โหมดรวมวง) · blast-radius check. Sibling of tools/audit-preecho-diff.mjs, which
// does the same job for the solo path.
//
// The fix must silence ONLY the phantom grace notes. It runs ensembleGuideEvents() — the pure
// function playEnsemble itself walks — over every published song twice, once with the pitch rule off
// and once on, and compares:
//   · the TUNE, note for note (beat + midi) — must be identical
//   · which graces were dropped, and whether any was dropped that did NOT pre-echo the tune
//   · whether any grace was ADDED
//   · the HUMANIZE STREAM (gd + tJit per note) — must be bit-identical. This is the sharp one: the
//     rng() draw for a grace happens whether or not the referee then vetoes it, precisely so that
//     silencing one ornament cannot re-roll every later note's loudness and timing. If this column
//     ever moves, every song's feel changed, not just the offenders'.
//
//   run:  node tools/audit-preecho-ensemble-diff.mjs           (lead=guitar · the policed default)
//         node tools/audit-preecho-ensemble-diff.mjs violin    (ไวโอลินนำ · needs PREECHO=all)
import { createClient } from '@supabase/supabase-js'
import { buildPlayNotes, ensembleGuideEvents, sectionBeatRanges } from '../src/lib/midi.js'
import { resolveContent } from '../src/lib/songModel.js'
import { seedFor } from '../src/lib/arranger/rng.js'
import { PREECHO_LOOKAHEAD, PREECHO_OCTAVES } from '../src/lib/arranger/referee.js'

const sb = createClient('https://vlpuvaofbzdawgjjpgfu.supabase.co', 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX')
const { data, error } = await sb.from('songs').select('id,number,title_th,content').order('number')
if (error) { console.error('supabase:', error.message); process.exit(2) }

const LEAD = process.argv[2] || 'guitar'
const ON = process.env.PREECHO || 'default'

const preEchoes = (graceMidi, atBeat, attacks) => {
  for (const a of attacks) {
    if (a.beat <= atBeat + 1e-9) continue
    if (a.beat - atBeat > PREECHO_LOOKAHEAD + 1e-9) break
    const d = Math.abs(a.midi - graceMidi)
    if (d % 12 === 0 && d <= PREECHO_OCTAVES * 12) return true
  }
  return false
}

let changed = 0, droppedPreEcho = 0, droppedInnocent = 0, added = 0, melodyBroken = 0, streamMoved = 0
for (const song of data) {
  let content, notes
  try {
    const raw = typeof song.content === 'string' ? JSON.parse(song.content) : song.content
    content = { ...raw, lines: resolveContent(raw) }
    notes = buildPlayNotes(content, {})
  } catch { continue }
  if (!notes?.length) continue

  const sections = sectionBeatRanges(content, notes)
  const levelAt = (b) => { const s = sections.find((x) => b >= x.fromBeat && b < x.toBeat); return s ? s.level : 'chorus' }
  const secGain = (b) => ({ verse: 0.7, chorus: 1.0 })[levelAt(b)]
  const accent = (pb) => { const p = ((pb % 4) + 4) % 4; if (p < 0.01) return 1; if (Math.abs(p - 2) < 0.01) return 0.9; if (Math.abs(p - 1) < 0.01 || Math.abs(p - 3) < 0.01) return 0.8; return 0.72 }
  const contour = (i) => { const n = notes[i], pr = notes[i - 1], nx = notes[i + 1]; let c = 1
    if (pr && pr.midi != null && n.midi > pr.midi) c += 0.06
    if (pr && nx && pr.midi != null && nx.midi != null && n.midi > pr.midi && n.midi >= nx.midi) c += 0.06
    if (pr && pr.midi != null && n.midi < pr.midi) c -= 0.04
    if (n.beats >= 3) c -= 0.06
    return c }
  const opts = { lead: LEAD, seedBase: seedFor(song.id, 0), pass: 0, secGain, accent, contour }

  const before = ensembleGuideEvents(notes, { ...opts, preEcho: 'off' })
  const after = ensembleGuideEvents(notes, { ...opts, preEcho: ON })

  // (1) the TUNE, note for note
  const mb = before.map((g) => `${g.beat}|${g.midi}|${g.beats}`).join(',')
  const ma = after.map((g) => `${g.beat}|${g.midi}|${g.beats}`).join(',')
  if (mb !== ma) { melodyBroken++; console.log(`#${song.number} ${song.title_th}\n   MELODY CHANGED`); continue }

  // (2) the humanize stream must not have shifted by so much as one draw
  const sb2 = before.map((g) => `${g.gd}|${g.tJit}`).join(',')
  const sa2 = after.map((g) => `${g.gd}|${g.tJit}`).join(',')
  if (sb2 !== sa2) { streamMoved++; console.log(`#${song.number} ${song.title_th}\n   HUMANIZE STREAM MOVED — the whole song's feel changed`) }

  // (3) graces gone / added
  const attacks = before.map((g) => ({ beat: g.beat, midi: g.midi }))
  const gone = [], plus = []
  for (let i = 0; i < before.length; i++) {
    const b = before[i].grace, a = after[i].grace
    if (b && !a) gone.push({ i, midi: b.midi, beat: before[i].beat })
    else if (!b && a) plus.push({ i, midi: a.midi, beat: after[i].beat })
    else if (b && a && b.midi !== a.midi) plus.push({ i, midi: a.midi, beat: after[i].beat })
  }
  if (!gone.length && !plus.length) continue
  changed++
  console.log(`#${song.number} ${song.title_th}`)
  console.log(`   melody: identical (${before.length} attacks) · humanize stream: ${sb2 === sa2 ? 'identical' : 'MOVED'}`)
  for (const g of gone) {
    if (preEchoes(g.midi, g.beat, attacks)) { droppedPreEcho++; console.log(`   - dropped pre-echo grace: beat ${g.beat} midi ${g.midi}`) }
    else { droppedInnocent++; console.log(`   - DROPPED SOMETHING INNOCENT: beat ${g.beat} midi ${g.midi}`) }
  }
  for (const g of plus) { added++; console.log(`   + NEW GRACE: beat ${g.beat} midi ${g.midi}`) }
}
console.log(`\nlead=${LEAD} · look-ahead ${PREECHO_LOOKAHEAD} beats · ${PREECHO_OCTAVES} octave(s)`)
console.log(`songs changed ${changed} · pre-echoes dropped ${droppedPreEcho} · innocent drops ${droppedInnocent} · new graces ${added} · melodies broken ${melodyBroken} · humanize streams moved ${streamMoved}`)
process.exit(droppedInnocent || added || melodyBroken || streamMoved ? 1 : 0)
