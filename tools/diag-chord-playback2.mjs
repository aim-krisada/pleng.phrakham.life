// DIAGNOSTIC ONLY — zoom in on the changed beat: what does the ear hear there?
import fs from 'node:fs'
import { perfOf, diff } from './diag-chord-playback.mjs'

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const pn = (m) => (m == null ? '—' : `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`)

const song = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0]
const now = song.content
const before = JSON.parse(JSON.stringify(now))
const segs = before.stanzas[0].lines[0].filter((it) => it.type === 'segment')
segs[segs.length - 1].chord = 'E'

for (const [label, content] of [['ก่อน (E)', before], ['หลัง (E7)', now]]) {
  const r = perfOf(content, song.id)
  console.log(`\n=== ${label} — beats 18..27 (บรรทัด 1 ท้าย → บรรทัด 2 ต้น) ===`)
  for (const e of r.perf.filter((e) => e.startBeat >= 18 && e.startBeat <= 27).sort((a, b) => a.startBeat - b.startBeat)) {
    console.log(`  beat ${e.startBeat.toFixed(2).padStart(6)}  ${e.role.padEnd(7)} ${pn(e.midi).padEnd(4)} len ${e.beats.toFixed(2)} gain ${e.gain.toFixed(3)}`)
  }
  const ch = r.chordEvents.filter((c) => c.startBeat >= 15 && c.startBeat <= 27)
  console.log('  chords:', ch.map((c) => `${c.chord}@${c.startBeat}(${c.beats}b) up=[${c.up.map(pn)}]`).join('  '))
}

// CONTROL — the swapped chord event spans which beats? Everything outside must be byte-identical.
const A = perfOf(before, song.id); const B = perfOf(now, song.id)
const ev = A.chordEvents.find((c) => c.chord === 'E' && c.startBeat >= 20 && c.startBeat < 24)
const d = diff(A, B)
const changed = [...d.removed, ...d.added]
const lo = ev.startBeat, hi = ev.startBeat + ev.beats
console.log(`\nCONTROL — swapped chord event: ${ev.chord} @${lo}..${hi}`)
console.log(`  changed events OUTSIDE that span: ${changed.filter((e) => e.startBeat < lo - 1e-9 || e.startBeat >= hi - 1e-9).length}  (must be 0)`)
for (const role of ['melody', 'bass', 'inner']) {
  console.log(`  changed ${role} events: ${changed.filter((e) => e.role === role).length}  (must be 0)`)
}
console.log(`  melody event count identical: ${A.perf.filter((e) => e.role === 'melody').length === B.perf.filter((e) => e.role === 'melody').length}`)
