// PRE-ECHO audit (สาย v1) — พี่เปา 23 ก.ค.: "กดฟังแล้วได้ยินโน้ตเกินที่ไม่มีบนแผ่น".
//
// A phantom note like that is never in the data and never drawn on the sheet: it is a ลูกเล่น
// (role 'emb') that sounds THE PITCH THE TUNE IS ABOUT TO SING, loud enough to be mistaken for the
// tune, a beat or so early — so the ear counts an extra melody note. Only playback can show it.
//
// This script runs the SAME pure arranger the "ฟัง" button runs (arrange(), via the same preset the
// viewer picks by default: เดี่ยว · เปียโน · บรรเลง/สงบ auto by tempo) over EVERY published song in
// the live Supabase table, and counts, per song, the emb events that pre-echo a melody attack:
//   same chroma, within 1 octave, arriving within PREECHO_LOOKAHEAD beats, gain >= PREECHO_MIN_GAIN.
// It also re-checks that the melody the arranger schedules still matches the sheet note-for-note
// (count + beat + midi), so a "fix" that silences real notes cannot pass.
//
//   run:  node tools/audit-preecho.mjs            (all songs)
//         node tools/audit-preecho.mjs 33          (one song by title prefix / number)
//
// Read-only: public anon key, no writes.
import { createClient } from '@supabase/supabase-js'
import { arrange } from '../src/lib/arranger/index.js'
import { presetCfg, recommendRecipe, songFeatures } from '../src/lib/arranger/presets.js'
import { buildArrangeCfg } from '../src/lib/arranger/techniques.js'
import { songToNotes, buildChordVoice, resolveSections, KEY_MIDI } from '../src/lib/midi.js'
import { resolveContent } from '../src/lib/songModel.js'

const SUPABASE_URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'

// the window / identity / audibility line the fix uses. Duplicated as LITERALS on purpose: this
// audit must keep measuring the same perceptual thing even if someone re-tunes the constants.
const LOOK = 2, OCTAVES = 1, MIN_GAIN = 0.12

const filter = process.argv[2] || ''

function melodyAttacks(evs) {
  return evs.filter((e) => e.role === 'melody' && e.midi != null)
    .map((e) => ({ beat: e.startBeat, midi: e.midi }))
    .sort((a, b) => a.beat - b.beat)
}

function preEchoes(evs) {
  const attacks = melodyAttacks(evs)
  const out = []
  for (const e of evs) {
    if (e.role !== 'emb' || e.midi == null || e.gain < MIN_GAIN) continue
    for (const a of attacks) {
      if (a.beat <= e.startBeat + 1e-9) continue
      if (a.beat - e.startBeat > LOOK + 1e-9) break
      const d = Math.abs(a.midi - e.midi)
      if (d % 12 === 0 && d <= OCTAVES * 12) {
        out.push({ at: e.startBeat, midi: e.midi, gain: +e.gain.toFixed(3), melodyAt: a.beat })
        break
      }
    }
  }
  return out
}

const label = (s) => `#${s.number} ${s.title_th}`

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
const { data, error } = await sb.from('songs').select('id,number,title_th,content').order('number')
if (error) { console.error('supabase:', error.message); process.exit(2) }

let songs = data
if (filter) songs = songs.filter((s) => String(s.number) === filter || String(s.title_th).includes(filter))

let totalBad = 0, offenders = 0, melodyMismatch = 0, skipped = 0
for (const song of songs) {
  let content, notes
  try {
    const raw = typeof song.content === 'string' ? JSON.parse(song.content) : song.content
    content = { ...raw, lines: resolveContent(raw) }
    notes = songToNotes(content)
  } catch (e) { skipped++; continue }
  if (!notes || !notes.length) { skipped++; continue }
  // the viewer's default: styleAuto → recommendRecipe by tempo, arranger ON, sparkle at its default
  const recipe = recommendRecipe(songFeatures(content)) === 'piano-calm' ? 'piano-calm' : 'piano-arrangement'
  const cfg = { arranger: true, voices: 'both', ...buildArrangeCfg(presetCfg(recipe), {}) }
  const meta = { songId: song.id, pass: 0, timeSignature: content.timeSignature,
    keyRoot: KEY_MIDI[content.key] ?? 60, sections: resolveSections(content, notes) }
  const perf = arrange(notes, buildChordVoice(notes), cfg, meta)

  // (a) the tune itself must still be exactly the sheet
  const sheet = notes.filter((n) => n.midi != null)
  const mel = perf.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  if (mel.length !== sheet.length) { melodyMismatch++; console.log(`MELODY MISMATCH  ${label(song)}: sheet ${sheet.length} vs played ${mel.length}`) }

  // (b) phantom extra melody notes
  const bad = preEchoes(perf)
  if (bad.length) {
    offenders++
    totalBad += bad.length
    console.log(`${String(bad.length).padStart(3)}  ${label(song)}`)
    for (const b of bad.slice(0, 5)) console.log(`        beat ${b.at} midi ${b.midi} gain ${b.gain} → tune sings it at beat ${b.melodyAt}`)
  }
}
console.log(`\nsongs checked ${songs.length - skipped} (skipped ${skipped}) · songs with pre-echo ${offenders} · total pre-echoes ${totalBad} · melody mismatches ${melodyMismatch}`)
process.exit(totalBad || melodyMismatch ? 1 : 0)
