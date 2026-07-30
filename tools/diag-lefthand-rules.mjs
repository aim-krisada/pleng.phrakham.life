// พี่เปา 30 ก.ค. — "กันมือซ้ายไม่ให้ไปทับมือขวา", 3 rules + 1 extra. This measures each of them
// over the WHOLE library, READ-ONLY (no DB write), so we can say with numbers how often each rule
// is broken BEFORE a fix and AFTER it. Same snapshot in / same numbers out.
//
//   run: node tools/diag-lefthand-rules.mjs <songs.json> <srcDir> [--json out.json]
//
// R1  downbeat sync   — at beat 1 of a bar, do melody + chord + bass land at the SAME instant?
//                       (timeShift spread across the roles struck on that downbeat)
// R2a LH ceiling 60   — a left-hand note (chord/bass/ornament) sounding ABOVE middle C (MIDI 60)
// R2b LH above tune   — a left-hand note sounding HIGHER than the melody note ringing over it
// R3  LH doubles tune — a left-hand note sounding the SAME pitch as the melody ringing over it
//                       (split: the melody note was already being HELD  vs  struck together)
// R5  line joins      — |timeShift| of the first melody attack of each new sheet line (the
//                       "ขึ้นบรรทัดใหม่แล้วเหลื่อม" พี่เปา asked us to check)
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const [songsPath, dir] = args
const jsonAt = args.indexOf('--json')
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : null

const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const midi = await import(pathToFileURL(`${dir}/src/lib/midi.js`).href)
const model = await import(pathToFileURL(`${dir}/src/lib/songModel.js`).href)
const arr = await import(pathToFileURL(`${dir}/src/lib/arranger/index.js`).href)
const mods = await import(pathToFileURL(`${dir}/src/lib/arranger/instruments/index.js`).href)
const meterMod = await import(pathToFileURL(`${dir}/src/lib/arranger/meter.js`).href)
const presets = await import(pathToFileURL(`${dir}/src/lib/arranger/presets.js`).href)

// what a listener actually hears: the shipped default preset
let CFG = presets.presetCfg(presets.DEFAULT_PRESET)
// --before = turn the three new rules OFF, which must reproduce the pre-fix arranger exactly. Used to
// PROVE the before/after audio really is old-vs-new and not new-vs-new.
if (args.includes('--before')) CFG = { ...CFG, lockDownbeats: false, leftHandCeiling: false, leftHandNoUnison: false, breathBothHands: false }
const LH = new Set(['inner', 'bass', 'emb']) // everything the LEFT hand plays
const EPS = 1e-6

function perform(content, songId) {
  const lines = Array.isArray(content?.lines) && content.lines.length ? content.lines : model.resolveContent(content)
  const res = { ...content, lines }
  const order = model.resolvePlayOrder(content) ?? undefined
  const notes = midi.buildPlayNotes(res, { order })
  if (!notes.length) return null
  const chords = midi.buildChordVoice(notes)
  const sections = midi.resolveSections(res, notes)
  const meta = { songId, pass: 0, timeSignature: content.timeSignature, keyRoot: midi.KEY_MIDI?.[content.key] ?? 60, sections }
  const events = arr.arrange(notes, chords, { ...CFG, arranger: true, voices: 'both', module: mods.moduleForInstrument('grand') }, meta)
  const meter = typeof content.timeSignature === 'number' ? null : meterMod.meterOf(content.timeSignature)
  const barBeats = meter ? meter.barBeats : (Number(content.timeSignature) || 4)
  const barOffset = meter ? meterMod.barOffsetFor(notes, meter) : 0
  return { events, notes, barBeats, barOffset }
}

const T = { // library totals
  songs: 0, lhEvents: 0,
  r1Downbeats: 0, r1Bad: 0, r1MaxMs: 0, r1SumMs: 0, r1Songs: new Set(),
  r2aBad: 0, r2aComp: 0, r2aMaxMidi: 0, r2aSongs: new Set(),
  r2bBad: 0, r2bComp: 0, r2bSongs: new Set(),
  r3Held: 0, r3Together: 0, r3HeldComp: 0, r3TogetherComp: 0, r3Emb: 0, r3Songs: new Set(),
  lhSpreadSum: 0, lhSpreadN: 0, lhDistinctSum: 0,
  r5Joins: 0, r5Bad: 0, r5MaxMs: 0, r5SumMs: 0, r5Songs: new Set(),
  r5Breath: 0, r5WithLh: 0, r5Apart: 0, r5ApartMaxMs: 0,
  r5TiedJoins: 0, r5TiedBad: 0, // the subset where the previous line ended on a LONG (held) note
  skipped: 0,
}
const perSong = []

for (const s of songs) {
  let p
  try { p = perform(s.content, `song-${s.number}`) } catch { T.skipped++; continue }
  if (!p) { T.skipped++; continue }
  const { events, notes, barBeats, barOffset } = p
  const mel = events.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  if (!mel.length) { T.skipped++; continue }
  T.songs++
  const row = { number: s.number, title: s.title_th, ts: s.content?.timeSignature || null,
    r1Downbeats: 0, r1Bad: 0, r1MaxMs: 0, r2a: 0, r2aComp: 0, r2b: 0, r2bComp: 0,
    r3Held: 0, r3Together: 0, r3HeldComp: 0, r3TogetherComp: 0, r3Emb: 0,
    r5Joins: 0, r5Bad: 0, r5MaxMs: 0, r5TiedJoins: 0, r5TiedBad: 0, lh: 0,
    r5Breath: 0, r5WithLh: 0, r5Apart: 0, r5ApartMaxMs: 0,
    lhLo: null, lhHi: null, lhSpread: null, lhDistinct: null }

  // ---- the melody note(s) RINGING at an instant (may be more than one at a seam) ----
  const ringingAt = (t) => mel.filter((m) => m.startBeat <= t + EPS && t < m.startBeat + m.beats - EPS)

  // ---- R1: downbeat sync ----
  const onDownbeat = (b) => {
    const x = (b - barOffset) / barBeats
    return Math.abs(x - Math.round(x)) < 1e-4
  }
  const byBeat = new Map()
  for (const e of events) {
    if (!onDownbeat(e.startBeat)) continue
    const k = Math.round(e.startBeat * 1000)
    if (!byBeat.has(k)) byBeat.set(k, [])
    byBeat.get(k).push(e)
  }
  for (const group of byBeat.values()) {
    const roles = new Set(group.map((e) => (e.role === 'melody' ? 'R' : 'L')))
    if (roles.size < 2) continue // need both hands present to be "together" at all
    row.r1Downbeats++
    const shifts = group.map((e) => (e.timeShift || 0) * 1000)
    const spread = Math.max(...shifts) - Math.min(...shifts)
    if (spread > 1) { row.r1Bad++; if (spread > row.r1MaxMs) row.r1MaxMs = spread; T.r1SumMs += spread }
  }

  // ---- R2 + R3: every left-hand attack against the tune ringing over it ----
  // Broken down by ROLE, because rule ② as พี่เปา stated it covers the CHORD and BASS (the hand
  // that plays the harmony); 'emb' (ประกาย/ลูกเล่น) is a deliberate shimmer and is counted apart.
  const compPitches = []
  for (const e of events) {
    if (!LH.has(e.role) || e.midi == null) continue
    row.lh++
    const comp = e.role === 'inner' || e.role === 'bass'
    if (comp) compPitches.push(e.midi)
    if (e.midi > 60) { row.r2a++; if (comp) row.r2aComp++; if (e.midi > T.r2aMaxMidi) T.r2aMaxMidi = e.midi }
    const ring = ringingAt(e.startBeat)
    if (!ring.length) continue
    const hi = Math.max(...ring.map((m) => m.midi))
    if (e.midi > hi) { row.r2b++; if (comp) row.r2bComp++ }
    const same = ring.find((m) => m.midi === e.midi)
    if (same) {
      const held = same.startBeat < e.startBeat - EPS // tune was already holding = พี่เปา's case
      if (held) row.r3Held++; else row.r3Together++
      if (comp) { if (held) row.r3HeldComp++; else row.r3TogetherComp++ }
      else { row.r3Emb++ }
    }
  }
  // "แบนระดับเดียว" watch — how wide a band the chord+bass actually use in this song.
  if (compPitches.length) {
    row.lhLo = Math.min(...compPitches); row.lhHi = Math.max(...compPitches)
    row.lhSpread = row.lhHi - row.lhLo
    row.lhDistinct = new Set(compPitches).size
  }

  // ---- R5: the first melody attack of each new sheet line ----
  const sounding = notes.filter((n) => n.midi != null)
  if (sounding.length === mel.length) {
    for (let i = 1; i < sounding.length; i++) {
      if (sounding[i].li === sounding[i - 1].li) continue
      row.r5Joins++
      const tied = (sounding[i - 1].beats || 0) >= 2 // previous line ended on a long / held note
      if (tied) row.r5TiedJoins++
      const ev = mel[i]
      const ms = Math.abs((ev.timeShift || 0) * 1000)
      if (ms > 5) { row.r5Bad++; if (tied) row.r5TiedBad++; T.r5SumMs += ms }
      if (ms > row.r5MaxMs) row.r5MaxMs = ms
      // WHAT KIND of off-grid is it? Two very different things get lumped together by |shift| alone:
      //  · a deliberate phrase BREATH (rubato at a ท่อน boundary) — musical, and now moves both hands
      //  · the two hands actually landing APART — the "เหลื่อม" พี่เปา is complaining about
      if (ev.breath) row.r5Breath++
      const lhHere = events.filter((x) => LH.has(x.role) && Math.abs(x.startBeat - ev.startBeat) < 1e-3)
      if (lhHere.length) {
        row.r5WithLh++
        const apart = Math.max(...lhHere.map((x) => Math.abs((x.timeShift || 0) - (ev.timeShift || 0)) * 1000))
        if (apart > 1) { row.r5Apart++; if (apart > row.r5ApartMaxMs) row.r5ApartMaxMs = apart }
      }
    }
  }

  T.lhEvents += row.lh
  T.r1Downbeats += row.r1Downbeats; T.r1Bad += row.r1Bad
  if (row.r1MaxMs > T.r1MaxMs) T.r1MaxMs = row.r1MaxMs
  if (row.r1Bad) T.r1Songs.add(s.number)
  T.r2aBad += row.r2a; T.r2aComp += row.r2aComp; if (row.r2aComp) T.r2aSongs.add(s.number)
  T.r2bBad += row.r2b; T.r2bComp += row.r2bComp; if (row.r2bComp) T.r2bSongs.add(s.number)
  T.r3Held += row.r3Held; T.r3Together += row.r3Together
  T.r3HeldComp += row.r3HeldComp; T.r3TogetherComp += row.r3TogetherComp; T.r3Emb += row.r3Emb
  if (row.r3HeldComp || row.r3TogetherComp) T.r3Songs.add(s.number)
  if (row.lhSpread != null) { T.lhSpreadSum += row.lhSpread; T.lhSpreadN++; T.lhDistinctSum += row.lhDistinct }
  T.r5Joins += row.r5Joins; T.r5Bad += row.r5Bad
  T.r5TiedJoins += row.r5TiedJoins; T.r5TiedBad += row.r5TiedBad
  T.r5Breath += row.r5Breath; T.r5WithLh += row.r5WithLh; T.r5Apart += row.r5Apart
  if (row.r5ApartMaxMs > T.r5ApartMaxMs) T.r5ApartMaxMs = row.r5ApartMaxMs
  if (row.r5MaxMs > T.r5MaxMs) T.r5MaxMs = row.r5MaxMs
  if (row.r5Bad) T.r5Songs.add(s.number)
  perSong.push(row)
}

const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : '0.0') + '%'
console.log(`songs measured: ${T.songs}   (skipped ${T.skipped})   left-hand attacks: ${T.lhEvents}`)
console.log('')
console.log(`R1  downbeats with both hands : ${T.r1Downbeats}`)
console.log(`R1  NOT together (>1ms spread): ${T.r1Bad}  (${pct(T.r1Bad, T.r1Downbeats)})  songs ${T.r1Songs.size}`)
console.log(`R1  worst spread              : ${T.r1MaxMs.toFixed(1)} ms   mean(bad) ${(T.r1Bad ? T.r1SumMs / T.r1Bad : 0).toFixed(1)} ms`)
console.log('')
console.log(`R2a above middle C (>60) chord+bass: ${T.r2aComp}   [+ ornaments ${T.r2aBad - T.r2aComp}]  songs ${T.r2aSongs.size}  highest MIDI ${T.r2aMaxMidi}`)
console.log(`R2b above the ringing tune chord+bass: ${T.r2bComp}   [+ ornaments ${T.r2bBad - T.r2bComp}]  songs ${T.r2bSongs.size}`)
console.log('')
console.log(`R3  = tune while HELD  chord+bass : ${T.r3HeldComp}   [ornaments ${T.r3Emb}]`)
console.log(`R3  = tune struck together c+b    : ${T.r3TogetherComp}`)
console.log(`R3  songs affected (chord+bass)   : ${T.r3Songs.size}`)
console.log('')
console.log(`LH band (chord+bass) mean spread  : ${(T.lhSpreadN ? T.lhSpreadSum / T.lhSpreadN : 0).toFixed(1)} semitones   mean distinct pitches ${(T.lhSpreadN ? T.lhDistinctSum / T.lhSpreadN : 0).toFixed(1)}`)
console.log('')
console.log(`R5  line joins                : ${T.r5Joins}   (of which previous line ended long: ${T.r5TiedJoins})`)
console.log(`R5  first note off-grid >5ms  : ${T.r5Bad}  (${pct(T.r5Bad, T.r5Joins)})  songs ${T.r5Songs.size}`)
console.log(`R5     of those, after a long : ${T.r5TiedBad}  (${pct(T.r5TiedBad, T.r5TiedJoins)})`)
console.log(`R5  worst |shift|             : ${T.r5MaxMs.toFixed(1)} ms   mean(bad) ${(T.r5Bad ? T.r5SumMs / T.r5Bad : 0).toFixed(1)} ms`)
console.log(`R5  of the off-grid: deliberate phrase breath: ${T.r5Breath}`)
console.log(`R5  line joins where the LEFT HAND also strikes: ${T.r5WithLh}`)
console.log(`R5     ... and the two hands land APART (>1ms) : ${T.r5Apart}  (${pct(T.r5Apart, T.r5WithLh)})  worst ${T.r5ApartMaxMs.toFixed(1)} ms`)

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({
    totals: { ...T, r1Songs: [...T.r1Songs], r2aSongs: [...T.r2aSongs], r2bSongs: [...T.r2bSongs], r3Songs: [...T.r3Songs], r5Songs: [...T.r5Songs] },
    perSong,
  }, null, 1))
  console.log(`\nwrote ${jsonOut}`)
}
