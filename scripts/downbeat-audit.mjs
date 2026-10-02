// ใบ v3/pleng#98 — does the accompaniment stress the song's REAL beat 1? Measured on every published
// song, with THIS checkout's code, so anyone can re-run it (thread 28354 asked for that):
//
//   node scripts/downbeat-audit.mjs            # reads the published songs (public, read-only)
//   node scripts/downbeat-audit.mjs songs.json # or a saved copy: [{ id, number, content }, ...]
//
// Ground truth = the song's own bar lines. Each line printed is one shape of bar:
//   full bars           — a bar whose notes fill its meter: its first note must get the DOWNBEAT
//                         stress level (also printed: "loudest in its bar", a weaker test — a song
//                         whose real beat 1 only ever gets the secondary stress, like เพลง 34 on
//                         main, passes it; thread 28354)
//   mid-song pickups    — a short bar that opens a line and leads into a full bar: must NOT be beat 1
//   after a stretched   — the bar right after a bar stretched by a 𝄐 hold (longer than its meter and
//                         carrying a 𝄐): must be beat 1
//   line-closing bars   — a short bar at a line end (a phrase's last bar, half of a split bar): beat 1.
//                         Known non-misses (2 ต.ค. 2569: 23, all เพลง 118): a note tied over the bar
//                         line is ONE played note counted in the bar before, so the next bar seems to
//                         start half a beat late — its real beat 1 sits inside that held note
// Melody only, every other gain shaper off — so a note's gain is its bar-position stress alone.
import fs from 'node:fs'
import { songToNotes } from '../src/lib/midi.js'
import { resolveContent } from '../src/lib/songModel.js'
import { arrange } from '../src/lib/arranger/index.js'
import { expectedBeats } from '../src/lib/notation.js'

const URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co/rest/v1/songs?select=id,number,content&deleted_at=is.null&order=number'
const KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX' // the site's public read key (src/supabase.js)
const file = process.argv[2]
const all = file
  ? JSON.parse(fs.readFileSync(file, 'utf8'))
  : await (await fetch(URL, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json()
const songs = all.filter((s) => Array.isArray(s.content?.stanzas))

const CFG = { arranger: true, voices: 'melody', humanize: false, easeUnderHold: false, lockDownbeats: false,
  dynamics: { section: false, contour: false, rubato: false, cresc: false } }
const near = (a, b) => Math.abs(a - b) < 1e-6
// the gain a downbeat gets: beat 0 of a plain 4/4 bar (every shaper but the bar accent is off above)
const probe = songToNotes({ key: 'C', timeSignature: '4/4', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }, { type: 'bar' }, { type: 'segment', chord: 'C', note: '5 4 3 2' }]] })
const DOWN = arrange(probe, [], CFG, { songId: 'probe', timeSignature: '4/4' }).find((e) => e.role === 'melody' && e.startBeat === 0).gain
const t = { full: [0, 0, 0], pick: [0, 0, new Set()], after: [0, 0, new Set()], close: [0, 0] }

for (const s of songs) {
  const c = s.content
  const notes = songToNotes({ ...c, lines: resolveContent(c) })
  const bars = []
  let beat = 0
  for (const n of notes) {
    const key = `${n.li}:${n.bi}`
    const last = bars[bars.length - 1]
    if (!last || last.key !== key || last.ts !== n.ts) bars.push({ key, li: n.li, ts: n.ts, start: beat, beats: 0, L: expectedBeats(n.ts || c.timeSignature) || 4 })
    bars[bars.length - 1].beats += n.beats
    if (n.fermata) bars[bars.length - 1].held = true
    beat += n.beats
  }
  const ev = arrange(notes, [], CFG, { songId: s.id, timeSignature: c.timeSignature }).filter((e) => e.role === 'melody')
  const gain = new Map(ev.map((e) => [e.startBeat, e.gain]))
  if (!gain.size) continue
  const loudest = (b) => gain.has(b) && near(gain.get(b), DOWN)
  bars.forEach((b, i) => {
    if (!gain.has(b.start)) return // the bar opens on a rest or a held note
    const pv = bars[i - 1]
    const nx = bars[i + 1]
    const short = b.beats < b.L - 1e-6
    const pickup = short && i > 0 && pv.li !== b.li && nx && near(nx.beats, nx.L) && nx.li === b.li
    if (near(b.beats, b.L)) {
      t.full[0]++
      if (loudest(b.start)) t.full[1]++
      const rest = ev.filter((e) => e.startBeat > b.start + 1e-6 && e.startBeat < b.start + b.beats - 1e-6)
      if (rest.every((e) => e.gain < gain.get(b.start) - 1e-9)) t.full[2]++ // loudest in its bar
    }
    if (pickup) { t.pick[0]++; if (loudest(b.start)) { t.pick[1]++; t.pick[2].add(s.number) } }
    if (pv && pv.held && pv.beats > pv.L + 1e-6 && !pickup) { t.after[0]++; if (!loudest(b.start)) { t.after[1]++; t.after[2].add(s.number) } }
    if (short && pv && pv.li === b.li && nx && nx.li !== b.li) { t.close[0]++; if (loudest(b.start)) t.close[1]++ }
  })
}
const pct = (a, b) => (b ? `${Math.round((1000 * a) / b) / 10}%` : '-')
const list = (set) => (set.size ? ` (เพลง ${[...set].slice(0, 20).join(' ')}${set.size > 20 ? ' …' : ''})` : '')
console.log(`songs ${songs.length}`)
console.log(`full bars             beat 1 gets the downbeat stress ${t.full[1]}/${t.full[0]} ${pct(t.full[1], t.full[0])} · beat 1 loudest in its bar ${t.full[2]}/${t.full[0]} ${pct(t.full[2], t.full[0])}`)
console.log(`mid-song pickups      stressed as beat 1 (wrong) ${t.pick[1]}/${t.pick[0]} in ${t.pick[2].size} songs${list(t.pick[2])}`)
console.log(`after a stretched bar NOT stressed (wrong) ${t.after[1]}/${t.after[0]} in ${t.after[2].size} songs${list(t.after[2])}`)
console.log(`line-closing bars     beat 1 ${t.close[1]}/${t.close[0]} ${pct(t.close[1], t.close[0])}`)
