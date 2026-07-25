// DIAGNOSTIC ONLY (no fix) — does the CHORD symbol change WHICH NOTES SOUND?
// Runs the REAL playback pipeline (songToNotes → buildChordVoice → arrange) headlessly on the
// real song-33 content, with one chord swapped, and diffs the resulting PerfEvent lists.
import fs from 'node:fs'
import { buildPlayNotes, buildChordVoice } from '../src/lib/midi.js'
import { arrange } from '../src/lib/arranger/index.js'
import { keyboard } from '../src/lib/arranger/instruments/keyboard.js'
import { resolveContent } from '../src/lib/songModel.js'
import { presetCfg } from '../src/lib/arranger/presets.js'
import { resolveSections } from '../src/lib/midi.js'
import { KEY_MIDI } from '../src/lib/midi.js'

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const pn = (m) => (m == null ? '—' : `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`)

// The app's own path: SongViewer resolves v2 → lines, then playSong(resolved, {arranger, arrangeCfg}).
export function perfOf(content, songId, cfg = presetCfg('piano-arrangement')) {
  const resolved = { ...content, lines: resolveContent(content) }
  const notes = buildPlayNotes(resolved, {})
  const chordEvents = buildChordVoice(notes)
  const sections = resolveSections(resolved, notes)
  const full = { arranger: true, voices: 'both', module: keyboard, ...cfg }
  const perf = arrange(notes, chordEvents, full, {
    songId, pass: 0, timeSignature: resolved.timeSignature,
    keyRoot: KEY_MIDI[resolved.key] ?? 60, sections,
  })
  return { notes, chordEvents, perf: perf.slice().sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi) }
}

const key = (e) => `${e.role}@${e.startBeat.toFixed(3)}:${e.midi}`

export function diff(a, b) {
  const A = new Map(a.perf.map((e) => [key(e), e]))
  const B = new Map(b.perf.map((e) => [key(e), e]))
  const only = (X, Y) => [...X.values()].filter((e) => !Y.has(key(e)))
  return { removed: only(A, B), added: only(B, A) }
}

if (process.argv[1].endsWith('diag-chord-playback.mjs')) {
  const song = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0]
  const id = song.id
  const now = song.content
  // "before" candidate: stanza A line 0, LAST bar chord E7 → E (the one พี่เปา says he changed)
  const before = JSON.parse(JSON.stringify(now))
  const segs = before.stanzas[0].lines[0].filter((it) => it.type === 'segment')
  const last = segs[segs.length - 1]
  console.log(`swap: stanza A line 0 last segment note="${last.note}" chord "${last.chord}" -> "E"`)
  last.chord = 'E'

  const A = perfOf(before, id) // E   (reconstructed "ก่อนแก้")
  const B = perfOf(now, id)    // E7  (production today)
  const d = diff(A, B)
  console.log(`\nmelody notes: E=${A.perf.filter((e) => e.role === 'melody').length}  E7=${B.perf.filter((e) => e.role === 'melody').length}`)
  console.log(`total events: E=${A.perf.length}  E7=${B.perf.length}   (delta ${B.perf.length - A.perf.length})`)
  const show = (label, list) => {
    console.log(`\n${label} (${list.length}):`)
    for (const e of list) console.log(`  beat ${e.startBeat.toFixed(2).padStart(7)}  ${e.role.padEnd(7)} ${pn(e.midi)} (${e.midi})  len ${e.beats.toFixed(2)}  gain ${e.gain.toFixed(3)}`)
  }
  show('ONLY when the chord is E  (disappeared after E7)', d.removed)
  show('ONLY when the chord is E7 (appeared after E7)', d.added)

  // control set: everything OUTSIDE the swapped chord's beat span must be identical
  const ev = A.chordEvents.find((e, i) => i === A.chordEvents.length - 1) // last chord event
  const spanStart = Math.min(...[...d.removed, ...d.added].map((e) => e.startBeat), Infinity)
  const spanEnd = Math.max(...[...d.removed, ...d.added].map((e) => e.startBeat), -Infinity)
  console.log(`\nCONTROL — changed events span beats ${spanStart} .. ${spanEnd}; last chord event starts at ${ev?.startBeat}`)
  const outside = [...d.removed, ...d.added].filter((e) => e.startBeat < ev.startBeat)
  console.log(`events changed BEFORE the swapped chord starts: ${outside.length} (must be 0)`)
}
