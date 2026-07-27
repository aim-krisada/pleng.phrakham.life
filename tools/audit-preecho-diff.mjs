// PRE-ECHO port · blast-radius check. The fix must silence ONLY the phantom notes; no other song
// may change, and inside a changed song the TUNE must be untouched.
//
// It arranges every published song twice with the default "ฟัง" recipe — once with the pitch rule
// off (`refereePreEcho: 0` = the old v1 conductor, time only) and once with it on — and compares:
//   · which songs change at all
//   · the melody line, note for note (count + beat + midi + duration) — must be identical
//   · which ornaments (role 'emb') were dropped, and whether any were dropped that did NOT pre-echo
//   · whether anything was ADDED that isn't explained by the humanize re-draw (see below)
//
// About the re-draw: humanize/rubato pull from one seeded RNG in event order, so removing an event
// shifts every LATER draw. Inside the two affected songs many gains/timeShifts therefore move by a
// few percent even though no note appears or disappears. That is the same "different but repeatable"
// nudge two loop passes already produce, so it is compared as a MULTISET OF PITCHES+BEATS, and any
// pitch/beat that is genuinely new or missing is reported separately.
//
//   run:  node tools/audit-preecho-diff.mjs
import { createClient } from '@supabase/supabase-js'
import { arrange } from '../src/lib/arranger/index.js'
import { presetCfg, recommendRecipe, songFeatures } from '../src/lib/arranger/presets.js'
import { buildArrangeCfg } from '../src/lib/arranger/techniques.js'
import { songToNotes, buildChordVoice, resolveSections, KEY_MIDI } from '../src/lib/midi.js'
import { resolveContent } from '../src/lib/songModel.js'
import { PREECHO_LOOKAHEAD, PREECHO_MIN_GAIN, preEchoesMelody, melodyAttacks } from '../src/lib/arranger/referee.js'

const sb = createClient('https://vlpuvaofbzdawgjjpgfu.supabase.co', 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX')
const { data, error } = await sb.from('songs').select('id,number,title_th,content').order('number')
if (error) { console.error('supabase:', error.message); process.exit(2) }

const OFF = { refereePreEcho: 0 } // the v1 conductor: time only
const slot = (e) => `${e.role}|${e.startBeat}|${e.midi}` // identity ignoring the humanize nudge
const mline = (e) => `${e.startBeat}|${e.midi}|${e.beats}`
const bag = (arr, f) => { const m = new Map(); for (const e of arr) m.set(f(e), (m.get(f(e)) || 0) + 1); return m }
const missing = (a, b) => { const o = []; for (const [k, n] of a) { const d = n - (b.get(k) || 0); for (let i = 0; i < d; i++) o.push(k) } return o }

let changed = 0, droppedPreEcho = 0, droppedInnocent = 0, addedSlots = 0, melodyBroken = 0
for (const song of data) {
  const raw = typeof song.content === 'string' ? JSON.parse(song.content) : song.content
  const content = { ...raw, lines: resolveContent(raw) }
  const notes = songToNotes(content)
  if (!notes.length) continue
  const recipe = recommendRecipe(songFeatures(content)) === 'piano-calm' ? 'piano-calm' : 'piano-arrangement'
  const base = { arranger: true, voices: 'both', ...buildArrangeCfg(presetCfg(recipe), {}) }
  const meta = { songId: song.id, pass: 0, timeSignature: content.timeSignature,
    keyRoot: KEY_MIDI[content.key] ?? 60, sections: resolveSections(content, notes) }
  const chords = buildChordVoice(notes)
  const before = arrange(notes, chords, { ...base, ...OFF }, meta)
  const after = arrange(notes, chords, base, meta)

  const gone = missing(bag(before, slot), bag(after, slot))
  const added = missing(bag(after, slot), bag(before, slot))
  if (!gone.length && !added.length) continue
  changed++
  console.log(`#${song.number} ${song.title_th}`)

  // (1) the TUNE must be note-for-note identical
  const mb = bag(before.filter((e) => e.role === 'melody'), mline)
  const ma = bag(after.filter((e) => e.role === 'melody'), mline)
  const mGone = missing(mb, ma), mAdded = missing(ma, mb)
  if (mGone.length || mAdded.length) {
    melodyBroken++
    console.log(`   MELODY CHANGED — missing ${JSON.stringify(mGone)} added ${JSON.stringify(mAdded)}`)
  } else {
    console.log(`   melody: identical (${mb.size} distinct attacks)`)
  }

  // (2) each dropped event must be an ornament that really did pre-echo the tune
  const attacks = melodyAttacks(before)
  for (const k of gone) {
    const [role, beat, midi] = k.split('|')
    const ev = before.find((e) => slot(e) === k)
    const real = role === 'emb' && preEchoesMelody({ midi: +midi, startBeat: +beat, gain: ev.gain }, attacks, {})
    if (real) { droppedPreEcho++; console.log(`   - dropped pre-echo: ${role} beat ${beat} midi ${midi} gain ${ev.gain.toFixed(3)}`) }
    else { droppedInnocent++; console.log(`   - DROPPED SOMETHING INNOCENT: ${k} gain ${ev.gain.toFixed(3)}`) }
  }
  for (const k of added) { addedSlots++; console.log(`   + NEW EVENT: ${k}`) }
}
console.log(`\nlook-ahead ${PREECHO_LOOKAHEAD} beats · min gain ${PREECHO_MIN_GAIN}`)
console.log(`songs changed ${changed} · pre-echoes dropped ${droppedPreEcho} · innocent drops ${droppedInnocent} · new events ${addedSlots} · melodies broken ${melodyBroken}`)
process.exit(droppedInnocent || addedSlots || melodyBroken ? 1 : 0)
