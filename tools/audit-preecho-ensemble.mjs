// PRE-ECHO audit — โหมดรวมวง (playEnsemble), สาย v1. Sibling of tools/audit-preecho.mjs, which
// covers the SOLO path (arrange()). Same complaint, different playback engine: พี่เปา 23 ก.ค.,
// "กดฟังแล้วได้ยินโน้ตเกินที่ไม่มีบนแผ่น".
//
// playEnsemble never runs arrange(), so the referee that cleaned up the solo path never saw its
// ornaments. The one it can produce is the LEAD's grace note (กีตาร์นำ hammer-on · ไวโอลินนำ
// slide-in) — n.midi - 2, fired just before the tune's own note. When the tune is about to sing that
// same pitch, the ear counts an extra melody note.
//
// This does NOT re-implement the scheduler: it calls ensembleGuideEvents() — the exact pure function
// playEnsemble itself now walks to decide what to fire — over EVERY published song in the live
// Supabase table, and counts the graces that pre-echo a melody attack:
//   same chroma, within 1 octave, arriving within PREECHO_LOOKAHEAD beats, gain >= the audibility
//   line expressed as a RATIO of the melody note the grace leans on (both go through one bus).
// It also re-checks that the tune the ensemble schedules still matches the sheet note-for-note, so a
// "fix" that silences real notes cannot pass.
//
//   run:  node tools/audit-preecho-ensemble.mjs                 (all songs · lead=guitar)
//         node tools/audit-preecho-ensemble.mjs 33              (one song by number / title)
//         node tools/audit-preecho-ensemble.mjs "" violin       (ไวโอลินนำ)
//         PREECHO=off node tools/audit-preecho-ensemble.mjs     (referee disabled = the BEFORE run)
//
// Read-only: public anon key, no writes.
import { createClient } from '@supabase/supabase-js'
import { buildPlayNotes, ensembleGuideEvents, resolveSections, sectionBeatRanges } from '../src/lib/midi.js'
import { resolveContent } from '../src/lib/songModel.js'
import { seedFor } from '../src/lib/arranger/rng.js'

const SUPABASE_URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'

// the window / identity line the fix uses. Duplicated as LITERALS on purpose: this audit must keep
// measuring the same perceptual thing even if someone re-tunes the constants.
const LOOK = 2, OCTAVES = 1
// audibility, as the RATIO the ensemble compares on: PREECHO_MIN_GAIN / FIRED_GAINS.melody.
// A กีตาร์นำ grace sits at 0.42/0.56 = 0.75 of its melody note, a ไวโอลินนำ one at 0.28/0.42 = 0.667
// — both well over this line, so audibility never lets one through; the pitch test is what decides.
const MIN_RATIO = 0.12 / 0.31

const filter = process.argv[2] || ''
const LEAD = process.argv[3] || 'guitar'
const PREECHO = process.env.PREECHO || 'default'

// the ensemble's own dynamics, copied as literals for the same reason as above (they only scale the
// grace; the pitch/window test is what this audit is measuring).
const GRACE_RATIO = { guitar: 0.42 / 0.56, violin: 0.28 / 0.42 }[LEAD] ?? 0

const label = (s) => `#${s.number} ${s.title_th}`

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
const { data, error } = await sb.from('songs').select('id,number,title_th,content').order('number')
if (error) { console.error('supabase:', error.message); process.exit(2) }

let songs = data
if (filter) songs = songs.filter((s) => String(s.number) === filter || String(s.title_th).includes(filter))

let totalBad = 0, offenders = 0, melodyMismatch = 0, skipped = 0
const rows = []
for (const song of songs) {
  let content, notes
  try {
    const raw = typeof song.content === 'string' ? JSON.parse(song.content) : song.content
    content = { ...raw, lines: resolveContent(raw) }
    notes = buildPlayNotes(content, {})
  } catch { skipped++; continue }
  if (!notes || !notes.length) { skipped++; continue }

  // playEnsemble's own section lookup (v1 uses sectionBeatRanges here, not resolveSections) and its
  // metric accent / contour — reproduced so the gains this audit sees are the gains it fires.
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

  const guide = ensembleGuideEvents(notes, {
    lead: LEAD, seedBase: seedFor(song.id, 0), pass: 0, secGain, accent, contour, preEcho: PREECHO,
  })

  // (a) the tune itself must still be exactly the sheet
  const sheet = notes.filter((n) => n.midi != null)
  if (guide.length !== sheet.length) { melodyMismatch++; console.log(`MELODY MISMATCH  ${label(song)}: sheet ${sheet.length} vs played ${guide.length}`) }
  for (let i = 0; i < Math.min(guide.length, sheet.length); i++) {
    if (guide[i].midi !== sheet[i].midi) { melodyMismatch++; console.log(`MELODY PITCH     ${label(song)}: note ${i} sheet ${sheet[i].midi} vs played ${guide[i].midi}`); break }
  }

  // (b) phantom extra melody notes — a surviving grace that sings a coming attack's pitch
  const attacks = guide.map((g) => ({ beat: g.beat, midi: g.midi }))
  const bad = []
  for (const g of guide) {
    if (!g.grace) continue
    if (GRACE_RATIO < MIN_RATIO) continue // below the audibility line = texture, not a note
    for (const a of attacks) {
      if (a.beat <= g.beat + 1e-9) continue
      if (a.beat - g.beat > LOOK + 1e-9) break
      const d = Math.abs(a.midi - g.grace.midi)
      if (d % 12 === 0 && d <= OCTAVES * 12) { bad.push({ at: g.beat, midi: g.grace.midi, melodyAt: a.beat }); break }
    }
  }
  if (bad.length) {
    offenders++
    totalBad += bad.length
    rows.push(`${String(bad.length).padStart(3)}  ${label(song)}`)
    console.log(`${String(bad.length).padStart(3)}  ${label(song)}`)
    for (const b of bad.slice(0, 5)) console.log(`        beat ${b.at} grace midi ${b.midi} → tune sings it at beat ${b.melodyAt}`)
  }
}
console.log(`\nlead=${LEAD} preEcho=${PREECHO} · songs checked ${songs.length - skipped} (skipped ${skipped}) · songs with pre-echo ${offenders} · total pre-echoes ${totalBad} · melody mismatches ${melodyMismatch}`)
process.exit(totalBad || melodyMismatch ? 1 : 0)
